#!/bin/bash

# Boxwise Restart Script
# This script restarts Boxwise services

# Exit on error
set -e

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

echo "Restarting Boxwise services..."

# Function to check if a service is enabled
is_service_enabled() {
  systemctl is-enabled --quiet $1
  return $?
}

# Function to restart a service with verification
restart_service() {
  local service_name=$1
  echo "Restarting $service_name..."
  
  if ! systemctl is-active --quiet $service_name; then
    echo "$service_name is not running. Starting it..."
    systemctl start $service_name
  else
    systemctl restart $service_name
  fi
  
  # Verify the service is running
  sleep 2
  if systemctl is-active --quiet $service_name; then
    echo "$service_name restarted successfully."
  else
    echo "Warning: Failed to restart $service_name. Attempting to start..."
    systemctl start $service_name
    sleep 2
    
    if systemctl is-active --quiet $service_name; then
      echo "$service_name is now running."
    else
      echo "Error: Failed to start $service_name. Check logs with: journalctl -u $service_name"
    fi
  fi
}

# Restart MongoDB if it's enabled
if is_service_enabled mongod; then
  restart_service mongod
else
  echo "MongoDB service is not enabled. Skipping."
fi

# Restart the Boxwise application
if is_service_enabled boxwise; then
  restart_service boxwise
else
  echo "Boxwise application service is not enabled. Skipping."
fi

# Restart Nginx if it's enabled
if is_service_enabled nginx; then
  restart_service nginx
else
  echo "Nginx service is not enabled. Skipping."
fi

echo "Service restart completed."
echo ""
echo "To check service status:"
echo "  MongoDB: systemctl status mongod"
echo "  Boxwise: systemctl status boxwise"
echo "  Nginx:   systemctl status nginx"
echo ""
echo "To view service logs:"
echo "  MongoDB: journalctl -u mongod"
echo "  Boxwise: journalctl -u boxwise"
echo "  Nginx:   journalctl -u nginx"
