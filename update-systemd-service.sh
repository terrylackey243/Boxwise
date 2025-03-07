#!/bin/bash

# Boxwise Systemd Service Update Script
# This script updates the Boxwise systemd service configuration with the correct MongoDB connection string

# Exit on error
set -e

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

echo "Updating Boxwise systemd service configuration..."

# Determine the path to the application
APP_PATH=$(pwd)
if [ ! -f "$APP_PATH/server/src/index.js" ]; then
  # Try to find the correct path
  if [ -f "$(dirname "$APP_PATH")/server/src/index.js" ]; then
    APP_PATH=$(dirname "$APP_PATH")
  elif [ -d "/root/boxwise" ] && [ -f "/root/boxwise/server/src/index.js" ]; then
    APP_PATH="/root/boxwise"
  elif [ -d "/home/$(logname)/boxwise" ] && [ -f "/home/$(logname)/boxwise/server/src/index.js" ]; then
    APP_PATH="/home/$(logname)/boxwise"
  fi
fi

# Get JWT_SECRET from existing service file or generate a new one
JWT_SECRET=$(systemctl show boxwise -p Environment | grep JWT_SECRET | cut -d= -f3 || openssl rand -base64 32)

# Create updated systemd service file
echo "Creating updated systemd service file..."
cat > /etc/systemd/system/boxwise.service << EOL
[Unit]
Description=Boxwise Application
After=network.target mongodb.service

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${APP_PATH}/server
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=5001
Environment=MONGO_URI=mongodb://localhost:27017/boxwise
Environment=JWT_SECRET=${JWT_SECRET}
Environment=JWT_EXPIRE=30d
Environment=ASSET_ID_AUTO_INCREMENT=true
Environment=ASSET_ID_PREFIX=000-

[Install]
WantedBy=multi-user.target
EOL

echo "Reloading systemd daemon..."
systemctl daemon-reload

echo "Restarting Boxwise service..."
systemctl restart boxwise

# Check if the service is running
if systemctl is-active --quiet boxwise; then
  echo "✅ Boxwise service is now running with the updated configuration."
else
  echo "❌ Boxwise service failed to start. Checking logs..."
  journalctl -u boxwise -n 50 --no-pager
fi

echo ""
echo "You can check the status of the Boxwise service with:"
echo "  systemctl status boxwise"
echo ""
echo "You can view the logs with:"
echo "  journalctl -u boxwise -f"
