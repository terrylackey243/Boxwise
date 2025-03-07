#!/bin/bash

# Boxwise Start Script
# This script starts all Boxwise services

# Exit on error
set -e

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

echo "Starting Boxwise services..."

# Function to start a service with verification
start_service() {
  local service_name=$1
  echo "Starting $service_name..."
  
  if systemctl is-active --quiet $service_name; then
    echo "$service_name is already running."
  else
    systemctl start $service_name
    
    # Verify the service is running
    sleep 2
    if systemctl is-active --quiet $service_name; then
      echo "$service_name started successfully."
    else
      echo "Error: Failed to start $service_name. Check logs with: journalctl -u $service_name"
      return 1
    fi
  fi
  
  return 0
}

# Start MongoDB first (required for the application)
echo "Starting MongoDB..."
if ! start_service mongod; then
  echo "Error: MongoDB failed to start. The application may not function correctly."
  
  # Check MongoDB logs for common issues
  echo "Checking MongoDB logs for common issues..."
  if journalctl -u mongod -n 20 | grep -q "Permission denied"; then
    echo "Possible permission issue detected. Fixing MongoDB data directory permissions..."
    mkdir -p /var/lib/mongodb
    chown -R mongodb:mongodb /var/lib/mongodb
    chmod 755 /var/lib/mongodb
    
    echo "Retrying MongoDB start..."
    systemctl start mongod
    sleep 2
    
    if systemctl is-active --quiet mongod; then
      echo "MongoDB started successfully after fixing permissions."
    else
      echo "MongoDB still failed to start. Please check the logs manually."
    fi
  fi
fi

# Start the Boxwise application
echo "Starting Boxwise application..."
if ! start_service boxwise; then
  echo "Error: Boxwise application failed to start."
  
  # Check if MongoDB is running, as it's required for the application
  if ! systemctl is-active --quiet mongod; then
    echo "MongoDB is not running. This may be why the application failed to start."
  fi
  
  # Check environment variables
  echo "Checking environment variables..."
  if ! systemctl show boxwise -p Environment | grep -q "JWT_SECRET"; then
    echo "JWT_SECRET environment variable may be missing. Check the service configuration."
  fi
fi

# Start Nginx last (for serving the application)
echo "Starting Nginx..."
if ! start_service nginx; then
  echo "Error: Nginx failed to start."
  
  # Check Nginx configuration
  echo "Checking Nginx configuration..."
  nginx -t
fi

# Final status check
echo ""
echo "Service status summary:"

# Check MongoDB
if systemctl is-active --quiet mongod; then
  echo "✅ MongoDB is running"
else
  echo "❌ MongoDB is NOT running"
fi

# Check Boxwise application
if systemctl is-active --quiet boxwise; then
  echo "✅ Boxwise application is running"
else
  echo "❌ Boxwise application is NOT running"
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
  echo "✅ Nginx is running"
else
  echo "❌ Nginx is NOT running"
fi

echo ""
echo "If all services are running, you can access your Boxwise application at:"
SERVER_IP=$(curl -s ifconfig.me)
echo "http://$SERVER_IP"
echo "https://$SERVER_IP"
