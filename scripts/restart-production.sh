#!/bin/bash

# Boxwise Production Restart Script
# This script restarts all necessary services for the Boxwise application in production mode

# Exit on error
set -e

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "=== Restarting Boxwise in Production Mode ==="

# First, stop all services
echo "Stopping all services..."
"$SCRIPT_DIR/stop-production.sh"

# Wait a moment to ensure all processes have terminated
echo "Waiting for processes to terminate..."
sleep 3

# Then, start all services again
echo "Starting all services..."
"$SCRIPT_DIR/start-production.sh"

echo "=== Boxwise has been restarted in Production Mode ==="
