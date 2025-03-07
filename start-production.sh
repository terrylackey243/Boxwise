#!/bin/bash

# Boxwise Production Start Script
# This script starts all necessary services for the Boxwise application in production mode

# Exit on error
set -e

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "=== Starting Boxwise in Production Mode ==="

# Ensure we're using the production environment
echo "Setting up production environment..."
cp "$SCRIPT_DIR/server/.env.production" "$SCRIPT_DIR/server/.env"

# Check if MongoDB is running
echo "Checking MongoDB status..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "MongoDB is not running. Starting MongoDB..."
    # Try to start MongoDB - this might need sudo depending on your setup
    if command -v systemctl &> /dev/null; then
        sudo systemctl start mongod || echo "Failed to start MongoDB with systemctl. You may need to start it manually."
    else
        echo "Could not start MongoDB automatically. Please start it manually."
        echo "Typically: sudo service mongod start"
        echo "Or: mongod --dbpath=/path/to/data/db"
        exit 1
    fi
fi

# Build the client application if it hasn't been built yet
if [ ! -d "$SCRIPT_DIR/client/build" ] || [ -z "$(ls -A "$SCRIPT_DIR/client/build")" ]; then
    echo "Client build not found or empty. Building client application..."
    cd "$SCRIPT_DIR/client"
    npm ci
    npm run build
    cd "$SCRIPT_DIR"
    echo "Client build completed"
else
    echo "Using existing client build"
fi

# Check if Nginx is installed and configured
if command -v nginx &> /dev/null; then
    echo "Checking Nginx configuration..."
    
    # Check if a site configuration exists for Boxwise
    NGINX_CONF_EXISTS=false
    for conf in /etc/nginx/sites-enabled/*; do
        if grep -q "boxwise" "$conf" 2>/dev/null; then
            NGINX_CONF_EXISTS=true
            break
        fi
    done
    
    if [ "$NGINX_CONF_EXISTS" = true ]; then
        echo "Nginx configuration for Boxwise found"
        
        # Check if Nginx is running
        if ! systemctl is-active --quiet nginx; then
            echo "Nginx is not running. Starting Nginx..."
            sudo systemctl start nginx
        else
            echo "Nginx is already running"
        fi
    else
        echo "Warning: No Nginx configuration found for Boxwise"
        echo "You may need to run the deployment script with the -n option to set up Nginx"
        echo "For now, we'll serve the client using a simple HTTP server"
        
        # Install serve if not already installed
        if ! command -v serve &> /dev/null; then
            echo "Installing 'serve' package globally..."
            npm install -g serve
        fi
        
        # Start serve in the background
        echo "Starting client on http://localhost:3000..."
        nohup serve -s "$SCRIPT_DIR/client/build" -l 3000 > "$SCRIPT_DIR/client-serve.log" 2>&1 &
        echo $! > "$SCRIPT_DIR/client-serve.pid"
        echo "Client server started with PID $(cat "$SCRIPT_DIR/client-serve.pid")"
    fi
else
    echo "Nginx not found. Using a simple HTTP server to serve the client"
    
    # Install serve if not already installed
    if ! command -v serve &> /dev/null; then
        echo "Installing 'serve' package globally..."
        npm install -g serve
    fi
    
    # Start serve in the background
    echo "Starting client on http://localhost:3000..."
    nohup serve -s "$SCRIPT_DIR/client/build" -l 3000 > "$SCRIPT_DIR/client-serve.log" 2>&1 &
    echo $! > "$SCRIPT_DIR/client-serve.pid"
    echo "Client server started with PID $(cat "$SCRIPT_DIR/client-serve.pid")"
fi

# Start the backend server
echo "Starting backend server..."

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "Using PM2 to start the backend server..."
    
    # Check if ecosystem.config.js exists
    if [ -f "$SCRIPT_DIR/ecosystem.config.js" ]; then
        # Start or restart the application with PM2
        pm2 restart ecosystem.config.js 2>/dev/null || pm2 start ecosystem.config.js
        pm2 save
        echo "Backend server started with PM2"
    else
        # Create a simple ecosystem.config.js file
        echo "Creating PM2 ecosystem configuration..."
        cat > "$SCRIPT_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'boxwise',
    script: './server/src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    watch: false,
    max_memory_restart: '500M'
  }]
};
EOF
        # Start the application with PM2
        pm2 start ecosystem.config.js
        pm2 save
        echo "Backend server started with PM2"
    fi
else
    echo "PM2 not found. Starting backend server directly..."
    
    # Install dependencies if needed
    if [ ! -d "$SCRIPT_DIR/server/node_modules" ] || [ -z "$(ls -A "$SCRIPT_DIR/server/node_modules")" ]; then
        echo "Installing server dependencies..."
        cd "$SCRIPT_DIR/server"
        npm ci
        cd "$SCRIPT_DIR"
    fi
    
    # Start the server in the background
    echo "Starting backend server on http://localhost:5001..."
    cd "$SCRIPT_DIR/server"
    NODE_ENV=production nohup node src/index.js > "$SCRIPT_DIR/server.log" 2>&1 &
    echo $! > "$SCRIPT_DIR/server.pid"
    echo "Backend server started with PID $(cat "$SCRIPT_DIR/server.pid")"
    cd "$SCRIPT_DIR"
fi

echo "=== Boxwise is now running in production mode! ==="
echo "Backend API: http://localhost:5001/api"

if [ -f "$SCRIPT_DIR/client-serve.pid" ]; then
    echo "Frontend: http://localhost:3000"
else
    echo "Frontend: Check your Nginx configuration for the URL"
fi

echo ""
echo "To stop the application:"
if command -v pm2 &> /dev/null; then
    echo "- Backend: pm2 stop boxwise"
else
    echo "- Backend: kill $(cat "$SCRIPT_DIR/server.pid" 2>/dev/null || echo "<PID>")"
fi

if [ -f "$SCRIPT_DIR/client-serve.pid" ]; then
    echo "- Frontend: kill $(cat "$SCRIPT_DIR/client-serve.pid")"
fi

echo ""
echo "For logs:"
if command -v pm2 &> /dev/null; then
    echo "- Backend: pm2 logs boxwise"
else
    echo "- Backend: tail -f $SCRIPT_DIR/server.log"
fi

if [ -f "$SCRIPT_DIR/client-serve.pid" ]; then
    echo "- Frontend: tail -f $SCRIPT_DIR/client-serve.log"
fi
