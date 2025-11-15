#!/bin/bash

# Check status of the course scraper

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/scraper.pid"
LOG_DIR="$SCRIPT_DIR/logs"

echo "=== Course Scraper Status ==="
echo ""

# Check if PID file exists
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Status: RUNNING (PID: $PID)"
        echo ""
        echo "Process info:"
        ps -p "$PID" -o pid,ppid,etime,command
    else
        echo "Status: STOPPED (PID file exists but process not found)"
        rm "$PID_FILE"
    fi
else
    # Check for any running scraper processes
    SCRAPER_PID=$(ps aux | grep "[c]ourse_scraper.py" | awk '{print $2}')
    if [ -n "$SCRAPER_PID" ]; then
        echo "Status: RUNNING (PID: $SCRAPER_PID - no PID file)"
        echo ""
        echo "Process info:"
        ps -p "$SCRAPER_PID" -o pid,ppid,etime,command
    else
        echo "Status: NOT RUNNING"
    fi
fi

echo ""
echo "=== Recent Logs ==="
if [ -d "$LOG_DIR" ]; then
    LATEST_LOG=$(ls -t "$LOG_DIR"/scraper_*.log 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
        echo "Latest log: $LATEST_LOG"
        echo ""
        tail -10 "$LATEST_LOG"
    else
        echo "No log files found"
    fi
else
    # Check for direct log file
    if [ -f "$SCRIPT_DIR/scraper_output.log" ]; then
        echo "Log file: scraper_output.log"
        echo ""
        tail -10 "$SCRIPT_DIR/scraper_output.log"
    else
        echo "No log files found"
    fi
fi

echo ""
echo "=== Course Data Stats ==="
COURSES_DIR="$SCRIPT_DIR/../data/courses"
BOOKS_DIR="$SCRIPT_DIR/../data/books"
if [ -d "$COURSES_DIR" ]; then
    COURSE_COUNT=$(find "$COURSES_DIR" -name "*.txt" | wc -l | tr -d ' ')
    echo "Total course files: $COURSE_COUNT"
fi
if [ -d "$BOOKS_DIR" ]; then
    BOOK_COUNT=$(find "$BOOKS_DIR" -name "*.pdf" | wc -l | tr -d ' ')
    echo "Total PDF files: $BOOK_COUNT"
fi

