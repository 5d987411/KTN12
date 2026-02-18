#!/bin/bash
# Stop Kaspa Testnet 12 Node

PID_FILE="/tmp/kaspad.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Stopping kaspad (PID: $PID)..."
        kill "$PID"
        rm -f "$PID_FILE"
        echo "✅ Kaspad stopped"
    else
        echo "Kaspad not running (stale PID file)"
        rm -f "$PID_FILE"
    fi
else
    echo "No PID file found, checking for running kaspad..."
    PIDS=$(pgrep -f "kaspad.*testnet.*netsuffix=12" 2>/dev/null)
    if [ -n "$PIDS" ]; then
        echo "Found kaspad processes: $PIDS"
        kill $PIDS
        echo "✅ Kaspad stopped"
    else
        echo "No running kaspad found"
    fi
fi
