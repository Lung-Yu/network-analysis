import os
import shutil
import subprocess
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict

app = FastAPI(title="Network Analysis API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Constants ---
BASE_DIR = "/app/uploads"
UPLOAD_DIR = os.path.join(BASE_DIR, "pcap_files")
LOG_DIR = os.path.join(BASE_DIR, "suricata_logs")

@app.on_event("startup")
def startup_event():
    """Create necessary directories on startup."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(LOG_DIR, exist_ok=True)

def parse_eve_json(log_path):
    """Parses the Suricata eve.json log to extract alerts and network data."""
    alerts = []
    nodes = {}
    edges = defaultdict(int)

    if not os.path.exists(log_path):
        return {"alerts": [], "nodes": [], "edges": []}

    with open(log_path, 'r') as f:
        for line in f:
            try:
                record = json.loads(line)
                
                # Extract alerts
                if record.get("event_type") == "alert":
                    alert_info = {
                        "timestamp": record.get("timestamp"),
                        "signature": record.get("alert", {}).get("signature"),
                        "severity": record.get("alert", {}).get("severity"),
                        "category": record.get("alert", {}).get("category"),
                        "src_ip": record.get("src_ip"),
                        "dest_ip": record.get("dest_ip"),
                        "proto": record.get("proto"),
                        "src_port": record.get("src_port"),
                        "dest_port": record.get("dest_port"),
                    }
                    alerts.append(alert_info)

                # Extract nodes and edges for visualization from any relevant event type
                if "src_ip" in record and "dest_ip" in record:
                    src_ip = record["src_ip"]
                    dest_ip = record["dest_ip"]
                    
                    if src_ip not in nodes:
                        nodes[src_ip] = {"id": src_ip, "label": src_ip, "group": "internal" if src_ip.startswith("192.168.") else "external"}
                    if dest_ip not in nodes:
                        nodes[dest_ip] = {"id": dest_ip, "label": dest_ip, "group": "internal" if dest_ip.startswith("192.168.") else "external"}
                    
                    # Create a sorted tuple to represent the edge uniquely
                    edge = tuple(sorted((src_ip, dest_ip)))
                    edges[edge] += 1

            except json.JSONDecodeError:
                continue # Ignore malformed lines

    # Format edges for vis.js
    formatted_edges = [{"from": u, "to": v, "value": count, "title": f"{count} connections"} for (u, v), count in edges.items()]
    
    return {
        "alerts": sorted(alerts, key=lambda x: x.get('severity', 0), reverse=True),
        "nodes": list(nodes.values()),
        "edges": formatted_edges
    }

@app.post("/api/upload")
async def upload_and_analyze_pcap(file: UploadFile = File(...)):
    """
    Uploads a pcap file, runs Suricata analysis, and returns the results.
    """
    if not file.filename.endswith(('.pcap', '.pcapng')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .pcap or .pcapng file.")

    # Sanitize filename to prevent directory traversal
    safe_filename = os.path.basename(file.filename)
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    # Create a unique log directory for this analysis
    analysis_log_dir = os.path.join(LOG_DIR, safe_filename.replace('.', '_'))
    os.makedirs(analysis_log_dir, exist_ok=True)
    
    try:
        # Save the uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run Suricata analysis
        # Note: Running as root is required for Suricata to initialize correctly in some setups.
        # The Docker container user should be handled with care. For this demo, we assume it works.
        command = [
            "suricata",
            "-c", "/etc/suricata/suricata.yaml",
            "-r", file_path,
            "-l", analysis_log_dir
        ]
        
        # The user running the app inside the container needs permissions for /etc/suricata and the log dir.
        # We will run this command as root from within the app for simplicity here.
        # A better production approach involves a worker queue and careful permission management.
        process = subprocess.run(
            ['sudo'] + command if os.geteuid() != 0 else command,
            capture_output=True, text=True
        )

        if process.returncode != 0:
            error_message = f"Suricata analysis failed. Return code: {process.returncode}. Stderr: {process.stderr}"
            # Also check for common errors
            if "failed to initialize logging" in process.stderr:
                error_message += " | Common issue: Check permissions for the log directory."
            if "No rule files found" in process.stderr:
                error_message += " | Common issue: Suricata rules might not be loaded correctly. Run 'suricata-update'."
            raise HTTPException(status_code=500, detail=error_message)

        # Parse the results
        eve_log_path = os.path.join(analysis_log_dir, "eve.json")
        analysis_results = parse_eve_json(eve_log_path)

        return {
            "filename": safe_filename,
            "info": "Analysis complete.",
            "data": analysis_results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    finally:
        file.file.close()
        # Optional: Clean up the uploaded file after analysis
        # if os.path.exists(file_path):
        #     os.remove(file_path)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Network Analysis API"}