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

# --- Capture Network Traffic ---
echo "Capturing network traffic for $CAPTURE_DURATION seconds..."
# Run tshark with appropriate permissions. It might require sudo.
# We select the default interface automatically.
INTERFACE=$(tshark -D | head -n 1 | cut -d' ' -f2)
echo "Using interface: $INTERFACE"
sudo tshark -i "$INTERFACE" -a "duration:$CAPTURE_DURATION" -w "$OUTPUT_FILE"

if [ ! -f "$OUTPUT_FILE" ]; then
    echo "Error: Packet capture failed. No output file was created."
    exit 1
fi

echo "Capture complete. File saved as '$OUTPUT_FILE'."

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
    echo "$HTTP_BODY" | json_pp # Requires json_pp, a common perl utility
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
