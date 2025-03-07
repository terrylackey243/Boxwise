#!/bin/bash

# Boxwise Environment Switching Script
# This script helps switch between development and production environments

# Exit on error
set -e

# Display help
function show_help {
    echo "Boxwise Environment Switching Script"
    echo "Usage: $0 [dev|prod]"
    echo ""
    echo "Options:"
    echo "  dev    Switch to development environment"
    echo "  prod   Switch to production environment"
    echo "  -h, --help   Show this help message"
    exit 1
}

# Check arguments
if [ $# -ne 1 ]; then
    show_help
fi

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Process arguments
case "$1" in
    dev)
        ENV="development"
        ;;
    prod)
        ENV="production"
        ;;
    -h|--help)
        show_help
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        ;;
esac

echo "=== Switching to $ENV environment ==="

# Copy the appropriate .env file to the server directory
echo "Updating server environment..."
cp "$SCRIPT_DIR/server/.env.$ENV" "$SCRIPT_DIR/server/.env"

# If switching to development
if [ "$ENV" = "development" ]; then
    echo "Setting up development environment..."
    
    # Stop PM2 if it's running
    if command -v pm2 &> /dev/null && pm2 list | grep -q "boxwise"; then
        echo "Stopping PM2 process..."
        pm2 stop boxwise
    fi
    
    echo "Development environment is ready!"
    echo ""
    echo "To start the development servers:"
    echo "1. Start MongoDB if not already running:"
    echo "   mongod --dbpath=/path/to/data/db"
    echo ""
    echo "2. Start the backend server:"
    echo "   cd server && npm run dev"
    echo ""
    echo "3. Start the frontend development server:"
    echo "   cd client && npm start"
    echo ""
    echo "4. Access the application at http://localhost:3000"
fi

# If switching to production
if [ "$ENV" = "production" ]; then
    echo "Setting up production environment..."
    
    # Build the client application
    echo "Building client application..."
    cd "$SCRIPT_DIR/client"
    npm run build
    
    # Start or restart the PM2 process if PM2 is installed
    if command -v pm2 &> /dev/null; then
        echo "Starting application with PM2..."
        cd "$SCRIPT_DIR"
        if [ -f "$SCRIPT_DIR/ecosystem.config.js" ]; then
            pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
            pm2 save
        else
            echo "Warning: ecosystem.config.js not found. Please run the deployment script first."
        fi
    else
        echo "Warning: PM2 is not installed. Please run the deployment script with the -p option."
    fi
    
    echo "Production environment is ready!"
    echo ""
    echo "If you've completed the deployment process, your application should be accessible at your domain."
    echo "If not, please run the deployment script with the appropriate options."
fi

echo "=== Environment switch completed ==="
