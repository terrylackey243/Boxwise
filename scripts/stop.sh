#!/bin/bash

# Boxwise Shutdown Script - Super Simplified
# This script stops all Boxwise services (MongoDB, backend, frontend)

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping Boxwise services...${NC}"

# Get the absolute path to the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Stop frontend processes
echo -e "${YELLOW}Stopping frontend processes...${NC}"
# Kill React processes
pkill -f "react-scripts" || echo "No React processes found to kill"
# Clean up PID file
rm -f "${PROJECT_ROOT}/client/.client.pid" 2>/dev/null

# Stop backend processes
echo -e "${YELLOW}Stopping backend processes...${NC}"
# Kill nodemon processes
pkill -f "nodemon" || echo "No nodemon processes found to kill"
# Clean up PID file
rm -f "${PROJECT_ROOT}/server/.server.pid" 2>/dev/null

# Stop MongoDB
echo -e "${YELLOW}Stopping MongoDB...${NC}"
pkill -f "mongod" || echo "No MongoDB processes found to kill"
sleep 2

# Make sure MongoDB is really stopped
if pgrep -f "mongod" > /dev/null; then
    echo -e "${YELLOW}MongoDB still running. Forcing shutdown...${NC}"
    pkill -9 -f "mongod" || echo "Failed to force stop MongoDB"
fi

echo -e "${GREEN}All Boxwise services have been stopped.${NC}"
