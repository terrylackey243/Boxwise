#!/bin/bash

# Boxwise Restart Script
# This script restarts all Boxwise services with robust error handling

# Don't exit on error, we want to try all services
set +e

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

echo "Restarting Boxwise services..."

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

# Function to restart a service with verification and fallbacks
restart_service() {
  local service_name=$1
  local display_name=$2
  local stop_cmd=$3
  local start_cmd=$4
  
  echo "Restarting $display_name..."
  
  # Try to restart with service manager
  case $SERVICE_MANAGER in
    systemd)
      if systemctl list-unit-files | grep -q "$service_name.service"; then
        if is_service_running $service_name; then
          echo "$display_name is running. Restarting with systemd..."
          systemctl restart $service_name
        else
          echo "$display_name is not running. Starting with systemd..."
          systemctl start $service_name
        fi
        
        sleep 2
        if is_service_running $service_name; then
          echo "$display_name restarted successfully with systemd."
          return 0
        fi
      else
        echo "Warning: systemd unit $service_name.service not found."
      fi
      ;;
    service)
      if [ -f "/etc/init.d/$service_name" ]; then
        if is_service_running $service_name; then
          echo "$display_name is running. Restarting with service..."
          service $service_name restart
        else
          echo "$display_name is not running. Starting with service..."
          service $service_name start
        fi
        
        sleep 2
        if is_service_running $service_name; then
          echo "$display_name restarted successfully with service."
          return 0
        fi
      else
        echo "Warning: init.d script /etc/init.d/$service_name not found."
      fi
      ;;
  esac
  
  # If we get here, service manager failed or is not available
  # Try fallback commands if provided
  if [ -n "$stop_cmd" ] && [ -n "$start_cmd" ]; then
    echo "Trying to restart $display_name directly..."
    
    # Stop if running
    if is_service_running $service_name; then
      echo "Stopping $display_name..."
      eval $stop_cmd
      sleep 2
    fi
    
    # Start
    echo "Starting $display_name..."
    eval $start_cmd
    sleep 2
    
    if is_service_running $service_name; then
      echo "$display_name restarted successfully with direct commands."
      return 0
    fi
  fi
  
  echo "Error: Failed to restart $display_name."
  return 1
}

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

# Detect MongoDB service name
MONGODB_SERVICE="mongod"
if ! systemctl list-unit-files | grep -q "mongod.service" && systemctl list-unit-files | grep -q "mongodb.service"; then
  MONGODB_SERVICE="mongodb"
fi

# Restart MongoDB first (required for the application)
restart_service $MONGODB_SERVICE "MongoDB" \
  "mongod --shutdown || pkill -x mongod || true" \
  "mongod --fork --logpath /var/log/mongodb.log"

# Restart the Boxwise application
restart_service boxwise "Boxwise application" \
  "pkill -f 'node.*server/src/index.js' || true" \
  "cd $APP_PATH/server && node src/index.js > /var/log/boxwise.log 2>&1 &"

# Restart Nginx
restart_service nginx "Nginx" \
  "nginx -s stop || pkill -x nginx || true" \
  "nginx"

# Final status check
echo ""
echo "Service status summary:"

# Check MongoDB
if pgrep -x mongod &> /dev/null; then
  echo "✅ MongoDB is running"
else
  echo "❌ MongoDB is NOT running"
fi

# Check Boxwise application
if pgrep -f "node.*server/src/index.js" &> /dev/null; then
  echo "✅ Boxwise application is running"
else
  echo "❌ Boxwise application is NOT running"
fi

# Check Nginx
if pgrep -x nginx &> /dev/null; then
  echo "✅ Nginx is running"
else
  echo "❌ Nginx is NOT running"
fi

echo ""
echo "Service restart completed."
echo ""
echo "If all services are running, you can access your Boxwise application at:"
SERVER_IP=$(curl -s ifconfig.me || echo "localhost")
echo "http://$SERVER_IP"
echo "https://$SERVER_IP"
echo ""
echo "If services are not running, you may need to install them first:"
echo "  sudo apt update"
echo "  sudo apt install -y mongodb-org nginx"
echo "  sudo apt install -y nodejs npm"
