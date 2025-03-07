#!/bin/bash

# Boxwise Stop Script
# This script stops all Boxwise services with robust error handling

# Don't exit on error, we want to try all services
set +e

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

echo "Stopping Boxwise services..."

# Detect service manager
if command -v systemctl &> /dev/null; then
  SERVICE_MANAGER="systemd"
elif command -v service &> /dev/null; then
  SERVICE_MANAGER="service"
else
  SERVICE_MANAGER="unknown"
  echo "Warning: Could not detect service manager. Will try direct commands."
fi

# Function to check if a service is running
is_service_running() {
  local service_name=$1
  
  case $SERVICE_MANAGER in
    systemd)
      systemctl is-active --quiet $service_name
      return $?
      ;;
    service)
      service $service_name status &> /dev/null
      return $?
      ;;
    *)
      # Try to use ps to check if process is running
      case $service_name in
        mongod)
          pgrep -x mongod &> /dev/null
          return $?
          ;;
        nginx)
          pgrep -x nginx &> /dev/null
          return $?
          ;;
        boxwise)
          pgrep -f "node.*server/src/index.js" &> /dev/null
          return $?
          ;;
        *)
          return 1
          ;;
      esac
      ;;
  esac
}

# Function to stop a service with verification and fallbacks
stop_service() {
  local service_name=$1
  local display_name=$2
  local fallback_cmd=$3
  
  echo "Stopping $display_name..."
  
  # Check if running
  if ! is_service_running $service_name; then
    echo "$display_name is not running."
    return 0
  fi
  
  # Try to stop with service manager
  case $SERVICE_MANAGER in
    systemd)
      if systemctl list-unit-files | grep -q "$service_name.service"; then
        systemctl stop $service_name
        sleep 2
        if ! is_service_running $service_name; then
          echo "$display_name stopped successfully with systemd."
          return 0
        fi
      else
        echo "Warning: systemd unit $service_name.service not found."
      fi
      ;;
    service)
      if [ -f "/etc/init.d/$service_name" ]; then
        service $service_name stop
        sleep 2
        if ! is_service_running $service_name; then
          echo "$display_name stopped successfully with service."
          return 0
        fi
      else
        echo "Warning: init.d script /etc/init.d/$service_name not found."
      fi
      ;;
  esac
  
  # If we get here, service manager failed or is not available
  # Try fallback command if provided
  if [ -n "$fallback_cmd" ]; then
    echo "Trying to stop $display_name directly..."
    eval $fallback_cmd
    sleep 2
    if ! is_service_running $service_name; then
      echo "$display_name stopped successfully with direct command."
      return 0
    fi
  fi
  
  echo "Warning: Failed to stop $display_name gracefully."
  
  # Last resort: kill the process
  case $service_name in
    mongod)
      echo "Attempting to kill MongoDB process..."
      pkill -x mongod || true
      ;;
    nginx)
      echo "Attempting to kill Nginx process..."
      pkill -x nginx || true
      ;;
    boxwise)
      echo "Attempting to kill Boxwise Node.js process..."
      pkill -f "node.*server/src/index.js" || true
      ;;
  esac
  
  sleep 2
  if ! is_service_running $service_name; then
    echo "$display_name process killed."
    return 0
  else
    echo "Error: Failed to stop $display_name. Process may still be running."
    return 1
  fi
}

# Detect MongoDB service name
MONGODB_SERVICE="mongod"
if ! systemctl list-unit-files | grep -q "mongod.service" && systemctl list-unit-files | grep -q "mongodb.service"; then
  MONGODB_SERVICE="mongodb"
fi

# Stop the Boxwise application first
echo "Stopping Boxwise application..."
stop_service boxwise "Boxwise application" "pkill -f 'node.*server/src/index.js'"

# Optionally stop Nginx
read -p "Do you want to stop Nginx as well? (y/n): " stop_nginx
if [[ "$stop_nginx" =~ ^[Yy]$ ]]; then
  stop_service nginx "Nginx" "nginx -s stop"
fi

# Optionally stop MongoDB
read -p "Do you want to stop MongoDB as well? (y/n): " stop_mongodb
if [[ "$stop_mongodb" =~ ^[Yy]$ ]]; then
  stop_service $MONGODB_SERVICE "MongoDB" "mongod --shutdown || pkill mongod"
fi

# Final status check
echo ""
echo "Service status summary:"

# Check Boxwise application
if pgrep -f "node.*server/src/index.js" &> /dev/null; then
  echo "⚠️ Boxwise application is still running"
else
  echo "✅ Boxwise application is stopped"
fi

# Check Nginx if requested
if [[ "$stop_nginx" =~ ^[Yy]$ ]]; then
  if pgrep -x nginx &> /dev/null; then
    echo "⚠️ Nginx is still running"
  else
    echo "✅ Nginx is stopped"
  fi
fi

# Check MongoDB if requested
if [[ "$stop_mongodb" =~ ^[Yy]$ ]]; then
  if pgrep -x mongod &> /dev/null; then
    echo "⚠️ MongoDB is still running"
  else
    echo "✅ MongoDB is stopped"
  fi
fi

echo ""
echo "All requested services have been processed."
