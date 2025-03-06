#!/bin/bash

# Boxwise Startup Script
# This script starts MongoDB, the backend server, and the frontend development server
# Usage: ./start.sh [frontend_port]
# Example: ./start.sh 3001 (to use port 3001 for the frontend instead of the default 3000)

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set default ports
FRONTEND_PORT=${1:-3000}
BACKEND_PORT=5001
MONGODB_PORT=27017

echo -e "${GREEN}Starting Boxwise Application...${NC}"
echo -e "Frontend will run on port: ${YELLOW}${FRONTEND_PORT}${NC}"
echo -e "Backend will run on port: ${YELLOW}${BACKEND_PORT}${NC}"
echo -e "MongoDB will run on port: ${YELLOW}${MONGODB_PORT}${NC}"

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo -e "${RED}MongoDB is not installed. Please install MongoDB first.${NC}"
    echo -e "Visit https://docs.mongodb.com/manual/installation/ for installation instructions."
    exit 1
fi

# Get the absolute path to the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Create data directory for MongoDB if it doesn't exist
mkdir -p "${PROJECT_ROOT}/data/db"
mkdir -p "${PROJECT_ROOT}/data/log"

# Stop MongoDB if it's running
if pgrep -f "mongod" > /dev/null; then
    echo -e "${YELLOW}MongoDB is running. Stopping MongoDB...${NC}"
    # Kill the MongoDB process
    pkill -f mongod || true
    sleep 3
    
    # Make sure it's really stopped
    if pgrep -f "mongod" > /dev/null; then
        echo -e "${YELLOW}MongoDB still running. Trying again with force...${NC}"
        pkill -9 -f mongod || true
        sleep 2
    fi
fi

# Clean up any lock files
if [ -f "${PROJECT_ROOT}/data/db/mongod.lock" ]; then
    echo -e "${YELLOW}Removing MongoDB lock file...${NC}"
    rm -f "${PROJECT_ROOT}/data/db/mongod.lock"
fi

# Start MongoDB
echo -e "${YELLOW}Starting MongoDB...${NC}"
mkdir -p "${PROJECT_ROOT}/data/db"
mkdir -p "${PROJECT_ROOT}/data/log"
mongod --dbpath "${PROJECT_ROOT}/data/db" --logpath "${PROJECT_ROOT}/data/log/mongod.log" --fork

# Check if MongoDB started successfully
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to start MongoDB. Check if the port is in use.${NC}"
    exit 1
else
    echo -e "${GREEN}MongoDB started successfully.${NC}"
fi

# Wait for MongoDB to be ready
echo -e "${YELLOW}Waiting for MongoDB to be ready...${NC}"
sleep 10

# Verify MongoDB is running and accepting connections
echo -e "${YELLOW}Verifying MongoDB connection...${NC}"
mongosh --quiet --eval "db.stats()" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}MongoDB is not accepting connections. Trying again...${NC}"
    sleep 5
    mongosh --quiet --eval "db.stats()" > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        # Try one more time with the older mongo command
        mongo --eval "db.stats()" > /dev/null 2>&1
        if [ $? -ne 0 ]; then
            echo -e "${RED}MongoDB is still not accepting connections. Please check MongoDB logs.${NC}"
            echo -e "${YELLOW}Continuing anyway...${NC}"
        fi
    fi
fi
echo -e "${GREEN}MongoDB is ready.${NC}"

# Install dependencies if needed
echo -e "${YELLOW}Checking for dependencies...${NC}"
if [ ! -d "${PROJECT_ROOT}/scripts/node_modules/mongoose" ]; then
    echo -e "${YELLOW}Installing script dependencies...${NC}"
    cd "${PROJECT_ROOT}/scripts"
    npm install
fi

if [ ! -d "${PROJECT_ROOT}/server/node_modules/mongoose" ]; then
    echo -e "${YELLOW}Installing server dependencies...${NC}"
    cd "${PROJECT_ROOT}/server"
    npm install
    cd "${PROJECT_ROOT}/scripts"
fi

if [ ! -d "${PROJECT_ROOT}/client/node_modules/react" ]; then
    echo -e "${YELLOW}Installing client dependencies...${NC}"
    cd "${PROJECT_ROOT}/client"
    npm install
    cd "${PROJECT_ROOT}/scripts"
fi

# Database initialization has been removed to prevent resetting data on startup
echo -e "${GREEN}Skipping database initialization.${NC}"

# Navigate to the server directory and start the backend
echo -e "${YELLOW}Starting backend server...${NC}"
# Get the absolute path to the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_ROOT}/server" && npx nodemon src/index.js &
SERVER_PID=$!

# Check if server started successfully
sleep 3
if ! ps -p $SERVER_PID > /dev/null; then
    echo -e "${RED}Failed to start backend server.${NC}"
    # Stop MongoDB if we started it
    echo -e "Stopping MongoDB..."
    # Kill the MongoDB process
    pkill -f mongod || true
    sleep 2
    
    # Make sure it's really stopped
    if pgrep -f "mongod" > /dev/null; then
        echo -e "${YELLOW}MongoDB still running. Trying again with force...${NC}"
        pkill -9 -f mongod || true
    fi
    exit 1
fi

echo -e "${GREEN}Backend server started successfully.${NC}"

# Navigate to the client directory and start the frontend
echo -e "${YELLOW}Starting frontend development server on port ${FRONTEND_PORT}...${NC}"
cd "${PROJECT_ROOT}/client" && PORT=${FRONTEND_PORT} npm start &
CLIENT_PID=$!

# Check if client started successfully
sleep 5
if ! ps -p $CLIENT_PID > /dev/null; then
    echo -e "${RED}Failed to start frontend development server.${NC}"
    # Stop backend and MongoDB before exiting
    kill $SERVER_PID
    # Stop MongoDB if we started it
    echo -e "Stopping MongoDB..."
    # Kill the MongoDB process
    pkill -f mongod || true
    sleep 2
    
    # Make sure it's really stopped
    if pgrep -f "mongod" > /dev/null; then
        echo -e "${YELLOW}MongoDB still running. Trying again with force...${NC}"
        pkill -9 -f mongod || true
    fi
    exit 1
fi

echo -e "${GREEN}Frontend development server started successfully.${NC}"

# Print success message with URLs
echo -e "\n${GREEN}Boxwise is now running!${NC}"
echo -e "Backend API: ${YELLOW}http://localhost:${BACKEND_PORT}/api${NC}"
echo -e "Frontend: ${YELLOW}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "\nPress Ctrl+C to stop all services.\n"

# Function to handle script termination
cleanup() {
    echo -e "\n${YELLOW}Shutting down Boxwise...${NC}"
    
    # Kill the frontend process
    if ps -p $CLIENT_PID > /dev/null; then
        echo -e "Stopping frontend server..."
        kill $CLIENT_PID
    fi
    
    # Kill the backend process
    if ps -p $SERVER_PID > /dev/null; then
        echo -e "Stopping backend server..."
        kill $SERVER_PID
    fi
    
    # Shutdown MongoDB if we started it
    echo -e "Stopping MongoDB..."
    # Kill the MongoDB process
    pkill -f mongod || true
    sleep 2
    
    # Make sure it's really stopped
    if pgrep -f "mongod" > /dev/null; then
        echo -e "${YELLOW}MongoDB still running. Trying again with force...${NC}"
        pkill -9 -f mongod || true
    fi
    
    echo -e "${GREEN}All services stopped successfully.${NC}"
    exit 0
}

# Set up trap to catch termination signal
trap cleanup SIGINT SIGTERM

# Wait for user to press Ctrl+C
wait
