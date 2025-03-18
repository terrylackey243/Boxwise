#!/bin/bash

# Boxwise Startup Script - Super Simplified
# This script starts MongoDB, the backend server, and the frontend development server in the background

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Boxwise Application...${NC}"

# Get the absolute path to the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Create required directories
mkdir -p "${PROJECT_ROOT}/data/db"
mkdir -p "${PROJECT_ROOT}/data/log"
mkdir -p "${PROJECT_ROOT}/logs"

# Force kill any existing processes (safe since we're in a dev environment)
echo -e "${YELLOW}Stopping any existing services...${NC}"
# Kill React processes
pkill -f "react-scripts" || true
# Kill nodemon processes
pkill -f "nodemon" || true
# Kill MongoDB
pkill -f "mongod" || true
sleep 3

# Clean up any lock files
if [ -f "${PROJECT_ROOT}/data/db/mongod.lock" ]; then
    echo -e "${YELLOW}Removing MongoDB lock file...${NC}"
    rm -f "${PROJECT_ROOT}/data/db/mongod.lock"
fi

# Start MongoDB
echo -e "${YELLOW}Starting MongoDB...${NC}"
mongod --dbpath "${PROJECT_ROOT}/data/db" --logpath "${PROJECT_ROOT}/data/log/mongod.log" --fork

# Check if MongoDB started successfully
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to start MongoDB. Check if the port is in use.${NC}"
    exit 1
else
    echo -e "${GREEN}MongoDB started successfully.${NC}"
fi

# Give MongoDB time to initialize
echo -e "${YELLOW}Waiting for MongoDB to be ready...${NC}"
sleep 5

# Start the backend server
echo -e "${YELLOW}Starting backend server on port 5001...${NC}"
cd "${PROJECT_ROOT}/server" && nohup npx nodemon src/index.js > "${PROJECT_ROOT}/logs/server.log" 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > "${PROJECT_ROOT}/server/.server.pid"
echo -e "${GREEN}Backend server started with PID: ${SERVER_PID}${NC}"

# Start the frontend server on a higher port
FRONTEND_PORT=3010
echo -e "${YELLOW}Starting frontend development server on port ${FRONTEND_PORT}...${NC}"
cd "${PROJECT_ROOT}/client" && PORT=${FRONTEND_PORT} nohup npm start > "${PROJECT_ROOT}/logs/client.log" 2>&1 &
CLIENT_PID=$!
echo $CLIENT_PID > "${PROJECT_ROOT}/client/.client.pid"
echo -e "${GREEN}Frontend server started with PID: ${CLIENT_PID}${NC}"

# Print success message
echo -e "\n${GREEN}All Boxwise services are now running in the background!${NC}"
echo -e "Backend API: ${YELLOW}http://localhost:5001/api${NC}"
echo -e "Frontend: ${YELLOW}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "\n${YELLOW}To stop all services, run:${NC}"
echo -e "  ${YELLOW}./scripts/stop.sh${NC}"
echo -e "\n${YELLOW}You can check the logs at:${NC}"
echo -e "  Backend: ${YELLOW}${PROJECT_ROOT}/logs/server.log${NC}"
echo -e "  Frontend: ${YELLOW}${PROJECT_ROOT}/logs/client.log${NC}"
echo -e "  MongoDB: ${YELLOW}${PROJECT_ROOT}/data/log/mongod.log${NC}"
