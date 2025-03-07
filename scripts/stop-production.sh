#!/bin/bash

# Boxwise Production Stop Script
# This script stops all services started by the start-production.sh script

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "=== Stopping Boxwise Production Services ==="

# Stop the backend server
if command -v pm2 &> /dev/null && pm2 list | grep -q "boxwise"; then
    echo "Stopping backend server with PM2..."
    pm2 stop boxwise
    echo "Backend server stopped"
else
    if [ -f "$SCRIPT_DIR/server.pid" ]; then
        echo "Stopping backend server..."
        PID=$(cat "$SCRIPT_DIR/server.pid")
        if ps -p $PID > /dev/null; then
            kill $PID
            echo "Backend server stopped (PID: $PID)"
        else
            echo "Backend server is not running (PID: $PID not found)"
        fi
        rm "$SCRIPT_DIR/server.pid"
    else
        echo "No backend server PID file found"
    fi
fi

# Stop the frontend server if it was started with 'serve'
if [ -f "$SCRIPT_DIR/client-serve.pid" ]; then
    echo "Stopping frontend server..."
    PID=$(cat "$SCRIPT_DIR/client-serve.pid")
    if ps -p $PID > /dev/null; then
        kill $PID
        echo "Frontend server stopped (PID: $PID)"
    else
        echo "Frontend server is not running (PID: $PID not found)"
    fi
    rm "$SCRIPT_DIR/client-serve.pid"
else
    echo "No frontend server PID file found (it may be running through Nginx)"
fi

# Note about Nginx and MongoDB
echo ""
echo "Note: This script does not stop Nginx or MongoDB as they may be used by other applications."
echo "If you want to stop them manually:"
echo "- Nginx: sudo systemctl stop nginx"
echo "- MongoDB: sudo systemctl stop mongod"

echo ""
echo "=== Boxwise Production Services Stopped ==="
