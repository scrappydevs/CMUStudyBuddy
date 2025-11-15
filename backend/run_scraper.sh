#!/bin/bash

# Background process to run CMU course scraper
# This script runs the scraper in the background and logs output

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
PID_FILE="$SCRIPT_DIR/scraper.pid"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Check if scraper is already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Scraper is already running (PID: $PID)"
        exit 1
    else
        rm "$PID_FILE"
    fi
fi

# Activate conda environment if available
if command -v conda &> /dev/null; then
    source "$(conda info --base)/etc/profile.d/conda.sh"
    conda activate haven 2>/dev/null || echo "Warning: Could not activate conda environment 'haven'"
fi

# Run scraper in background
cd "$SCRIPT_DIR"
nohup python course_scraper.py > "$LOG_DIR/scraper_$(date +%Y%m%d_%H%M%S).log" 2>&1 &
PID=$!

# Save PID
echo $PID > "$PID_FILE"
echo "Scraper started in background (PID: $PID)"
echo "Logs: $LOG_DIR/scraper_$(date +%Y%m%d_%H%M%S).log"
echo "To stop: kill $PID or run ./stop_scraper.sh"

