#!/bin/bash

# Boxwise Start Script
# This script starts all Boxwise services with robust error handling

# Don't exit on error, we want to try all services
set +e

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

echo "Starting Boxwise services..."

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

# Function to start a service with verification and fallbacks
start_service() {
  local service_name=$1
  local display_name=$2
  local fallback_cmd=$3
  
  echo "Starting $display_name..."
  
  # Check if already running
  if is_service_running $service_name; then
    echo "$display_name is already running."
    return 0
  fi
  
  # Try to start with service manager
  case $SERVICE_MANAGER in
    systemd)
      if systemctl list-unit-files | grep -q "$service_name.service"; then
        systemctl start $service_name
        sleep 2
        if is_service_running $service_name; then
          echo "$display_name started successfully with systemd."
          return 0
        fi
      else
        echo "Warning: systemd unit $service_name.service not found."
      fi
      ;;
    service)
      if [ -f "/etc/init.d/$service_name" ]; then
        service $service_name start
        sleep 2
        if is_service_running $service_name; then
          echo "$display_name started successfully with service."
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
    echo "Trying to start $display_name directly..."
    eval $fallback_cmd
    sleep 2
    if is_service_running $service_name; then
      echo "$display_name started successfully with direct command."
      return 0
    fi
  fi
  
  echo "Error: Failed to start $display_name."
  return 1
}

# Detect MongoDB service name
MONGODB_SERVICE="mongod"
if ! systemctl list-unit-files | grep -q "mongod.service" && systemctl list-unit-files | grep -q "mongodb.service"; then
  MONGODB_SERVICE="mongodb"
fi

# Start MongoDB first (required for the application)
echo "Starting MongoDB..."
if ! start_service $MONGODB_SERVICE "MongoDB" "mongod --fork --logpath /var/log/mongodb.log"; then
  echo "Error: MongoDB failed to start. The application may not function correctly."
  
  # Check if MongoDB is installed
  if ! command -v mongod &> /dev/null; then
    echo "MongoDB does not appear to be installed. Please install MongoDB first:"
    echo "  sudo apt update"
    echo "  sudo apt install -y mongodb-org"
    echo "  # or"
    echo "  sudo apt install -y mongodb"
  fi
  
  # Check data directory
  echo "Checking MongoDB data directory..."
  if [ -d "/var/lib/mongodb" ]; then
    echo "Fixing MongoDB data directory permissions..."
    mkdir -p /var/lib/mongodb
    if getent passwd mongodb &> /dev/null; then
      chown -R mongodb:mongodb /var/lib/mongodb
    fi
    chmod 755 /var/lib/mongodb
    
    echo "Retrying MongoDB start..."
    mongod --fork --logpath /var/log/mongodb.log || true
  else
    echo "Creating MongoDB data directory..."
    mkdir -p /var/lib/mongodb
    if getent passwd mongodb &> /dev/null; then
      chown -R mongodb:mongodb /var/lib/mongodb
    fi
    chmod 755 /var/lib/mongodb
    
    echo "Retrying MongoDB start..."
    mongod --fork --logpath /var/log/mongodb.log || true
  fi
  
  # Final check
  sleep 2
  if pgrep -x mongod &> /dev/null; then
    echo "MongoDB is now running."
  else
    echo "MongoDB still failed to start."
    echo "You may need to install MongoDB manually:"
    echo "  sudo apt update"
    echo "  sudo apt install -y mongodb-org"
    echo "  # or"
    echo "  sudo apt install -y mongodb"
  fi
fi

# Start the Boxwise application
echo "Starting Boxwise application..."
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

if ! start_service boxwise "Boxwise application" "cd $APP_PATH/server && node src/index.js > /var/log/boxwise.log 2>&1 &"; then
  echo "Error: Boxwise application failed to start."
  
  # Check if the application files exist
  if [ ! -f "$APP_PATH/server/src/index.js" ]; then
    echo "Application files not found at $APP_PATH/server/src/index.js"
    echo "Please make sure you're running this script from the Boxwise directory."
  fi
  
  # Check if MongoDB is running
  if ! pgrep -x mongod &> /dev/null; then
    echo "MongoDB is not running. This may be why the application failed to start."
  fi
  
  # Check environment variables
  if [ -f "$APP_PATH/server/.env" ]; then
    echo "Checking environment variables..."
    if ! grep -q "JWT_SECRET" "$APP_PATH/server/.env"; then
      echo "JWT_SECRET environment variable is missing in $APP_PATH/server/.env"
      echo "Generating a new JWT_SECRET..."
      JWT_SECRET=$(openssl rand -base64 32)
      echo "JWT_SECRET=$JWT_SECRET" >> "$APP_PATH/server/.env"
      echo "JWT_SECRET added to $APP_PATH/server/.env"
      
      echo "Retrying application start..."
      cd "$APP_PATH/server" && node src/index.js > /var/log/boxwise.log 2>&1 &
      sleep 2
    fi
  else
    echo "Environment file $APP_PATH/server/.env not found."
    echo "Creating a basic .env file..."
    JWT_SECRET=$(openssl rand -base64 32)
    cat > "$APP_PATH/server/.env" << EOL
PORT=5001
NODE_ENV=production
MONGO_URI=mongodb://localhost:27017/boxwise
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRE=30d
ASSET_ID_AUTO_INCREMENT=true
ASSET_ID_PREFIX=000-
MAX_FILE_SIZE=5000000
EOL
    echo "Created $APP_PATH/server/.env with basic configuration."
    
    echo "Retrying application start..."
    cd "$APP_PATH/server" && node src/index.js > /var/log/boxwise.log 2>&1 &
    sleep 2
  fi
fi

# Start Nginx
echo "Starting Nginx..."
if ! start_service nginx "Nginx" "nginx"; then
  echo "Error: Nginx failed to start."
  
  # Check if Nginx is installed
  if ! command -v nginx &> /dev/null; then
    echo "Nginx does not appear to be installed. Please install Nginx first:"
    echo "  sudo apt update"
    echo "  sudo apt install -y nginx"
  else
    # Check Nginx configuration
    echo "Checking Nginx configuration..."
    nginx -t || true
    
    # Check if Nginx configuration exists for Boxwise
    if [ ! -f "/etc/nginx/sites-available/boxwise" ]; then
      echo "Nginx configuration for Boxwise not found."
      echo "Creating basic Nginx configuration..."
      
      # Get server IP
      SERVER_IP=$(curl -s ifconfig.me || echo "localhost")
      
      # Create SSL directory if it doesn't exist
      mkdir -p /etc/nginx/ssl
      
      # Generate self-signed certificates if they don't exist
      if [ ! -f "/etc/nginx/ssl/cert.pem" ] || [ ! -f "/etc/nginx/ssl/key.pem" ]; then
        echo "Generating self-signed SSL certificates..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
          -keyout /etc/nginx/ssl/key.pem -out /etc/nginx/ssl/cert.pem \
          -subj "/C=US/ST=State/L=City/O=Organization/CN=boxwise.app" || true
      fi
      
      # Create Nginx configuration
      cat > /etc/nginx/sites-available/boxwise << EOL
server {
    listen 80;
    server_name boxwise.app www.boxwise.app ${SERVER_IP};
    
    # Redirect to HTTPS
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name boxwise.app www.boxwise.app ${SERVER_IP};
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # Serve static files
    location / {
        root ${APP_PATH}/client/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
    # Proxy API requests
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL
      
      # Enable the site
      ln -sf /etc/nginx/sites-available/boxwise /etc/nginx/sites-enabled/
      rm -f /etc/nginx/sites-enabled/default
      
      echo "Created basic Nginx configuration."
      echo "Retrying Nginx start..."
      nginx || true
    fi
  fi
fi

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
echo "If all services are running, you can access your Boxwise application at:"
SERVER_IP=$(curl -s ifconfig.me || echo "localhost")
echo "http://$SERVER_IP"
echo "https://$SERVER_IP"
echo ""
echo "If services are not running, you may need to install them first:"
echo "  sudo apt update"
echo "  sudo apt install -y mongodb-org nginx"
echo "  sudo apt install -y nodejs npm"
