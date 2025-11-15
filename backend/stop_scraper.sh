#!/bin/bash

# Stop the background course scraper

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/scraper.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "Scraper is not running (no PID file found)"
    exit 1
fi

PID=$(cat "$PID_FILE")

if ps -p "$PID" > /dev/null 2>&1; then
    kill "$PID"
    rm "$PID_FILE"
    echo "Scraper stopped (PID: $PID)"
else
    echo "Scraper process not found (PID: $PID)"
    rm "$PID_FILE"
fi

