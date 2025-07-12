#!/bin/bash

# --- Configuration ---
CAPTURE_DURATION=5
OUTPUT_FILE="capture.pcap"
API_URL="http://localhost:8000/api/upload"

# --- Check for tshark ---
if ! command -v tshark &> /dev/null
then
    echo "Error: tshark is not installed."
    echo "Please install it to continue. On macOS: 'brew install wireshark'. On Debian/Ubuntu: 'sudo apt-get install tshark'."
    exit 1
fi

# --- Manual Capture Instruction ---
INTERFACE=$(tshark -D | head -n 1 | cut -d' ' -f2)
TSHARK_COMMAND="sudo tshark -i $INTERFACE -a duration:$CAPTURE_DURATION -w $OUTPUT_FILE"

echo "--------------------------------------------------------------------"
echo "MANUAL ACTION REQUIRED"
echo "--------------------------------------------------------------------"
echo "Due to security restrictions, I cannot run 'sudo' directly."
echo "Please open a NEW terminal and run the following command to capture network packets."
echo "You will be prompted for your password."
echo ""
echo "    $TSHARK_COMMAND"
echo ""
echo "After the command completes (it will run for $CAPTURE_DURATION seconds), press [Enter] here to continue."
echo "--------------------------------------------------------------------"

# Wait for user to press Enter
read -p ""

# --- Check if file was created ---
if [ ! -f "$OUTPUT_FILE" ]; then
    echo "Error: Output file '$OUTPUT_FILE' not found."
    echo "Please make sure the capture command was successful before pressing Enter."
    exit 1
fi

echo "Capture file found. Proceeding with upload..."

# --- Upload for Analysis ---
echo "Uploading '$OUTPUT_FILE' to the analysis service..."
RESPONSE=$(curl --silent --write-out "HTTP_STATUS:%{http_code}" -X POST -F "file=@$OUTPUT_FILE" "$API_URL")

# --- Process Response ---
HTTP_BODY=$(echo "$RESPONSE" | sed -e 's/HTTP_STATUS\:.*//g')
HTTP_STATUS=$(echo "$RESPONSE" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')

echo ""
echo "--- Analysis API Response ---"
if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "Status: OK ($HTTP_STATUS)"
    echo "Response JSON:"
    # Check for json_pp, otherwise just print the body
    if command -v json_pp &> /dev/null; then
        echo "$HTTP_BODY" | json_pp
    else
        echo "$HTTP_BODY"
    fi
else
    echo "Status: Error ($HTTP_STATUS)"
    echo "Response Body:"
    echo "$HTTP_BODY"
fi
echo "---------------------------"

# --- Cleanup ---
echo "Cleaning up captured file..."
rm "$OUTPUT_FILE"

echo "Test complete."