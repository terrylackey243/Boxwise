#!/bin/bash

# Boxwise Update Script
# This script updates the Boxwise application to the latest version

# Exit on error
set -e

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

# Set working directory
cd "$(dirname "$0")"

echo "Starting Boxwise application update..."

# Function to check if a service is running
is_service_running() {
  systemctl is-active --quiet $1
  return $?
}

# Step 1: Backup the current application state
echo "Creating backup before update..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/boxwise_update_${TIMESTAMP}"
mkdir -p $BACKUP_DIR

# Backup environment variables
if [ -f ".env" ]; then
  cp .env $BACKUP_DIR/
fi
if [ -f "server/.env" ]; then
  cp server/.env $BACKUP_DIR/server.env
fi
if [ -f "server/.env.production" ]; then
  cp server/.env.production $BACKUP_DIR/server.env.production
fi

# Backup MongoDB data
if is_service_running mongod; then
  echo "Backing up MongoDB data..."
  mongodump --out=$BACKUP_DIR/mongodb
  echo "MongoDB data backed up to $BACKUP_DIR/mongodb"
else
  echo "Warning: MongoDB is not running. Skipping database backup."
fi

echo "Backup completed at $BACKUP_DIR"

# Step 2: Pull the latest changes from the repository
echo "Pulling latest changes from the repository..."
git fetch
CURRENT_COMMIT=$(git rev-parse HEAD)
LATEST_COMMIT=$(git rev-parse @{u})

if [ "$CURRENT_COMMIT" = "$LATEST_COMMIT" ]; then
  echo "Application is already up to date (commit: $CURRENT_COMMIT)"
  read -p "Do you want to force update anyway? (y/n): " force_update
  if [[ ! "$force_update" =~ ^[Yy]$ ]]; then
    echo "Update canceled."
    exit 0
  fi
fi

# Pull the latest changes
git pull

# Step 3: Update server dependencies
echo "Updating server dependencies..."
cd server
npm install --production
cd ..

# Step 4: Update client dependencies and rebuild
echo "Updating client dependencies..."
cd client
npm install

echo "Rebuilding client application..."
npm run build
if [ $? -ne 0 ]; then
  echo "Error: Client build failed. Reverting to previous version..."
  cd ..
  git reset --hard $CURRENT_COMMIT
  echo "Reverted to previous version. Update failed."
  exit 1
fi
cd ..

# Step 5: Update scripts dependencies
echo "Updating scripts dependencies..."
cd scripts
npm install --production
cd ..

# Step 6: Check if any environment variables need to be updated
echo "Checking for environment variable updates..."
if [ -f "server/.env.example" ]; then
  # Get current environment variables
  CURRENT_VARS=$(grep -v "^#" server/.env | cut -d= -f1)
  
  # Get example environment variables
  EXAMPLE_VARS=$(grep -v "^#" server/.env.example | cut -d= -f1)
  
  # Check for new variables
  for var in $EXAMPLE_VARS; do
    if ! echo "$CURRENT_VARS" | grep -q "$var"; then
      echo "New environment variable found: $var"
      echo "Adding $var with default value from .env.example"
      
      # Get default value from .env.example
      DEFAULT_VALUE=$(grep "^$var=" server/.env.example | cut -d= -f2-)
      
      # Add to .env
      echo "$var=$DEFAULT_VALUE" >> server/.env
    fi
  done
fi

# Step 7: Restart services
echo "Restarting services..."

# Check if we have the restart script
if [ -f "restart-service.sh" ]; then
  echo "Using restart-service.sh to restart services..."
  ./restart-service.sh
else
  # Restart services manually
  echo "Restarting MongoDB..."
  systemctl restart mongod
  
  echo "Restarting Boxwise application..."
  systemctl restart boxwise
  
  echo "Restarting Nginx..."
  systemctl restart nginx
fi

# Step 8: Verify the update
echo "Verifying the update..."

# Check if services are running
echo "Checking service status..."
if ! is_service_running mongod; then
  echo "Warning: MongoDB is not running after update."
fi

if ! is_service_running boxwise; then
  echo "Warning: Boxwise application is not running after update."
fi

if ! is_service_running nginx; then
  echo "Warning: Nginx is not running after update."
fi

# Try to access the site
SERVER_IP=$(curl -s ifconfig.me)
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP)
if [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "200" ]; then
  echo "Success! HTTP status code: $HTTP_STATUS"
  echo "The site is accessible at http://$SERVER_IP or https://$SERVER_IP"
else
  echo "Warning: Site returns HTTP status code: $HTTP_STATUS"
  echo "The site may not be functioning correctly."
fi

# Step 9: Display update information
echo ""
echo "Update completed!"
echo "Previous version: $CURRENT_COMMIT"
echo "Current version: $(git rev-parse HEAD)"
echo "Backup created at: $BACKUP_DIR"
echo ""
echo "If you encounter any issues, you can restore the backup or revert to the previous version:"
echo "  git reset --hard $CURRENT_COMMIT"
echo ""
echo "To check application logs:"
echo "  sudo journalctl -u boxwise"
