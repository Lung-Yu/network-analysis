import os
import shutil
import subprocess
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSON # Using JSON from postgresql for type hinting, will store as TEXT in SQLite
from datetime import datetime

app = FastAPI(title="Network Analysis API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Setup ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./data/db/analysis_history.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class AnalysisRecord(Base):
    __tablename__ = "analysis_records"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String) # "success" or "failed"
    error_message = Column(Text, nullable=True)
    analysis_data = Column(JSON, nullable=True) # Stores the JSON output from parse_eve_json

# Dependency to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



# --- Constants ---
BASE_DIR = "/app/uploads"
UPLOAD_DIR = os.path.join(BASE_DIR, "pcap_files")
LOG_DIR = os.path.join(BASE_DIR, "suricata_logs")

@app.on_event("startup")
def startup_event():
    """Create necessary directories and database tables on startup."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(LOG_DIR, exist_ok=True)
    Base.metadata.create_all(bind=engine)

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

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session

@app.post("/api/upload")
async def upload_and_analyze_pcap(file: UploadFile = File(...), db: Session = Depends(get_db)):
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
    
    # Create a new analysis record
    analysis_record = AnalysisRecord(filename=safe_filename, status="pending")
    db.add(analysis_record)
    db.commit()
    db.refresh(analysis_record) # Refresh to get the generated ID

    try:
        # Save the uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run Suricata analysis
        command = [
            "suricata",
            "-c", "/etc/suricata/suricata.yaml",
            "-r", file_path,
            "-l", analysis_log_dir
        ]
        
        process = subprocess.run(
            ['sudo'] + command if os.geteuid() != 0 else command,
            capture_output=True, text=True
        )

        if process.returncode != 0:
            error_message = f"Suricata analysis failed. Return code: {process.returncode}. Stderr: {process.stderr}"
            if "failed to initialize logging" in process.stderr:
                error_message += " | Common issue: Check permissions for the log directory."
            if "No rule files found" in process.stderr:
                error_message += " | Common issue: Suricata rules might not be loaded correctly. Run 'suricata-update'."
            
            analysis_record.status = "failed"
            analysis_record.error_message = error_message
            db.add(analysis_record)
            db.commit()
            raise HTTPException(status_code=500, detail=error_message)

        # Parse the results
        eve_log_path = os.path.join(analysis_log_dir, "eve.json")
        analysis_results = parse_eve_json(eve_log_path)

        analysis_record.status = "success"
        analysis_record.analysis_data = analysis_results
        db.add(analysis_record)
        db.commit()
        db.refresh(analysis_record)

        return {
            "id": analysis_record.id,
            "filename": safe_filename,
            "info": "Analysis complete.",
            "data": analysis_results
        }

    except Exception as e:
        analysis_record.status = "failed"
        analysis_record.error_message = f"An error occurred: {str(e)}"
        db.add(analysis_record)
        db.commit()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    finally:
        file.file.close()

from typing import List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel

# Pydantic models for API response
class AnalysisRecordBase(BaseModel):
    id: int
    filename: str
    timestamp: datetime
    status: str
    error_message: Optional[str] = None

    class Config:
        orm_mode = True

class PaginatedAnalysisRecords(BaseModel):
    total_count: int
    records: List[AnalysisRecordBase]

class AnalysisRecordDetail(AnalysisRecordBase):
    analysis_data: Optional[dict] = None

@app.get("/api/history", response_model=PaginatedAnalysisRecords)
def get_analysis_history(db: Session = Depends(get_db), skip: int = 0, limit: int = 10):
    """Retrieve a paginated list of all analysis records."""
    total_count = db.query(AnalysisRecord).count()
    records = db.query(AnalysisRecord).order_by(AnalysisRecord.timestamp.desc()).offset(skip).limit(limit).all()
    return {"total_count": total_count, "records": records}

@app.get("/api/history/{record_id}", response_model=AnalysisRecordDetail)
def get_analysis_record(record_id: int, db: Session = Depends(get_db)):
    """Retrieve details of a specific analysis record."""
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Analysis record not found")
    return record

@app.get("/")
def read_root():
    return {"message": "Welcome to the Network Analysis API"}