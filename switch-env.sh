#!/bin/bash

# Script to switch between development and production environments

# Function to display usage
usage() {
  echo "Usage: $0 [dev|prod]"
  echo "  dev   Switch to development environment"
  echo "  prod  Switch to production environment"
  exit 1
}

# Check if argument is provided
if [ $# -ne 1 ]; then
  usage
fi

# Set working directory
cd "$(dirname "$0")"

case "$1" in
  dev)
    echo "Switching to development environment..."
    
    # Copy development environment file
    if [ -f "server/.env.development" ]; then
      cp server/.env.development server/.env
      echo "Copied .env.development to .env"
    else
      echo "Error: server/.env.development not found"
      exit 1
    fi
    
    # Update client proxy setting
    if grep -q "\"proxy\": \"http://localhost:5001\"" client/package.json; then
      echo "Client proxy already set for development"
    else
      sed -i 's/"proxy": ".*"/"proxy": "http:\/\/localhost:5001"/' client/package.json
      echo "Updated client proxy setting for development"
    fi
    
    echo "Development environment activated. You can now run:"
    echo "  cd server && npm run dev"
    echo "  cd client && npm start"
    ;;
    
  prod)
    echo "Switching to production environment..."
    
    # Copy production environment file
    if [ -f "server/.env.production" ]; then
      cp server/.env.production server/.env
      echo "Copied .env.production to .env"
    else
      # If .env.production doesn't exist, create it from current .env
      if [ -f "server/.env" ]; then
        cp server/.env server/.env.production
        echo "Created .env.production from current .env"
      else
        echo "Error: server/.env not found"
        exit 1
      fi
    fi
    
    # Update client proxy setting for production
    sed -i 's/"proxy": ".*"/"proxy": "http:\/\/app:5001"/' client/package.json
    echo "Updated client proxy setting for production"
    
    echo "Production environment activated. You can now run:"
    echo "  docker-compose up -d --build"
    ;;
    
  *)
    usage
    ;;
esac

echo "Environment switch completed successfully."
