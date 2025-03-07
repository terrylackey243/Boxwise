#!/bin/bash

# Boxwise Stop Script
# This script stops all Boxwise services

# Exit on error
set -e

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

echo "Stopping Boxwise services..."

# Stop the Node.js application service
echo "Stopping Boxwise application service..."
if systemctl is-active --quiet boxwise; then
  systemctl stop boxwise
  echo "Boxwise application service stopped."
else
  echo "Boxwise application service is not running."
fi

# Optionally stop Nginx
read -p "Do you want to stop Nginx as well? (y/n): " stop_nginx
if [[ "$stop_nginx" =~ ^[Yy]$ ]]; then
  echo "Stopping Nginx..."
  if systemctl is-active --quiet nginx; then
    systemctl stop nginx
    echo "Nginx stopped."
  else
    echo "Nginx is not running."
  fi
fi

# Optionally stop MongoDB
read -p "Do you want to stop MongoDB as well? (y/n): " stop_mongodb
if [[ "$stop_mongodb" =~ ^[Yy]$ ]]; then
  echo "Stopping MongoDB..."
  if systemctl is-active --quiet mongod; then
    systemctl stop mongod
    echo "MongoDB stopped."
  else
    echo "MongoDB is not running."
  fi
fi

echo "All requested services have been stopped."
