#!/bin/bash

# Boxwise DigitalOcean Troubleshooting Guide
# This script provides commands to run in the DigitalOcean terminal to diagnose and fix issues

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}=== Boxwise DigitalOcean Troubleshooting Guide ===${NC}"
echo -e "${YELLOW}This script provides commands to run in your DigitalOcean terminal.${NC}"
echo -e "${YELLOW}Open your terminal at: https://cloud.digitalocean.com/droplets/481285223/terminal/ui/${NC}"
echo ""

# Display help
function show_help {
    echo "Boxwise DigitalOcean Troubleshooting Guide"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Example:"
    echo "  $0"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            show_help
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            ;;
    esac
done

# Function to display a section header
section() {
    local title=$1
    echo ""
    echo -e "${BLUE}${BOLD}=== $title ===${NC}"
}

# Introduction
section "Introduction"
echo -e "This guide will help you troubleshoot issues with your Boxwise application on DigitalOcean."
echo -e "For each step, copy and paste the commands into your DigitalOcean terminal."
echo -e "Let's start by gathering some information about your system."
echo ""

# Step 1: Check system status
section "Step 1: Check System Status"
echo -e "${YELLOW}Run these commands in your DigitalOcean terminal:${NC}"
echo -e "${GREEN}# Check system resources${NC}"
echo -e "free -h"
echo -e "df -h"
echo -e "top -b -n 1 | head -n 20"
echo ""
echo -e "${GREEN}# Check running processes${NC}"
echo -e "ps aux | grep node"
echo -e "ps aux | grep nginx"
echo -e "ps aux | grep mongo"
echo ""
echo -e "${GREEN}# Check listening ports${NC}"
echo -e "netstat -tuln | grep LISTEN"
echo -e "# or if netstat is not available:"
echo -e "ss -tuln"
echo ""

# Step 2: Check MongoDB status
section "Step 2: Check MongoDB Status"
echo -e "${YELLOW}Run these commands in your DigitalOcean terminal:${NC}"
echo -e "${GREEN}# Check if MongoDB is running${NC}"
echo -e "systemctl status mongodb"
echo -e "# or"
echo -e "service mongodb status"
echo ""
echo -e "${GREEN}# If MongoDB is not running, start it${NC}"
echo -e "sudo systemctl start mongodb"
echo -e "# or"
echo -e "sudo service mongodb start"
echo ""
echo -e "${GREEN}# Check MongoDB logs${NC}"
echo -e "sudo tail -n 100 /var/log/mongodb/mongodb.log"
echo ""
echo -e "${GREEN}# Test MongoDB connection${NC}"
echo -e "mongo --eval \"db.adminCommand('ping')\""
echo ""

# Step 3: Check PM2 status
section "Step 3: Check PM2 Status"
echo -e "${YELLOW}Run these commands in your DigitalOcean terminal:${NC}"
echo -e "${GREEN}# Check if PM2 is installed${NC}"
echo -e "which pm2"
echo -e "pm2 --version"
echo ""
echo -e "${GREEN}# Check PM2 processes${NC}"
echo -e "pm2 list"
echo ""
echo -e "${GREEN}# Check PM2 logs${NC}"
echo -e "pm2 logs boxwise --lines 50"
echo ""
echo -e "${GREEN}# Check PM2 environment variables${NC}"
echo -e "pm2 env boxwise"
echo ""
echo -e "${GREEN}# If PM2 environment variables are missing, set them${NC}"
echo -e "# First, check your .env file"
echo -e "cat /path/to/boxwise/server/.env"
echo ""
echo -e "# Then set the environment variables in PM2"
echo -e "pm2 set boxwise:MONGO_URI \"mongodb://127.0.0.1:27017/boxwise\""
echo -e "pm2 set boxwise:JWT_SECRET \"your_jwt_secret\""
echo -e "pm2 set boxwise:PORT \"5001\""
echo -e "pm2 set boxwise:NODE_ENV \"production\""
echo -e "pm2 restart boxwise --update-env"
echo ""

# Step 4: Check Nginx status
section "Step 4: Check Nginx Status"
echo -e "${YELLOW}Run these commands in your DigitalOcean terminal:${NC}"
echo -e "${GREEN}# Check if Nginx is running${NC}"
echo -e "systemctl status nginx"
echo -e "# or"
echo -e "service nginx status"
echo ""
echo -e "${GREEN}# If Nginx is not running, start it${NC}"
echo -e "sudo systemctl start nginx"
echo -e "# or"
echo -e "sudo service nginx start"
echo ""
echo -e "${GREEN}# Check Nginx configuration${NC}"
echo -e "sudo nginx -t"
echo ""
echo -e "${GREEN}# Check Nginx logs${NC}"
echo -e "sudo tail -n 100 /var/log/nginx/error.log"
echo -e "sudo tail -n 100 /var/log/nginx/access.log"
echo ""
echo -e "${GREEN}# Find Nginx configuration files${NC}"
echo -e "find /etc/nginx -type f -name \"*.conf\" | xargs grep -l \"server {\" 2>/dev/null"
echo ""
echo -e "${GREEN}# Check a specific Nginx configuration file${NC}"
echo -e "cat /etc/nginx/sites-available/default"
echo -e "# or"
echo -e "cat /etc/nginx/conf.d/default.conf"
echo ""

# Step 5: Test API connectivity
section "Step 5: Test API Connectivity"
echo -e "${YELLOW}Run these commands in your DigitalOcean terminal:${NC}"
echo -e "${GREEN}# Test backend API directly${NC}"
echo -e "curl -v http://localhost:5001/api/health"
echo ""
echo -e "${GREEN}# Test Nginx API endpoint${NC}"
echo -e "curl -v http://localhost/api/health"
echo ""
echo -e "${GREEN}# Test Nginx auth endpoint${NC}"
echo -e "curl -v http://localhost/api/auth/status"
echo ""

# Step 6: Fix common issues
section "Step 6: Fix Common Issues"
echo -e "${YELLOW}Based on the results of the previous steps, try these fixes:${NC}"

echo -e "${BLUE}${BOLD}Issue 1: MongoDB not running${NC}"
echo -e "${GREEN}# Start MongoDB${NC}"
echo -e "sudo systemctl start mongodb"
echo -e "# or"
echo -e "sudo service mongodb start"
echo -e "# Enable MongoDB to start on boot${NC}"
echo -e "sudo systemctl enable mongodb"
echo ""

echo -e "${BLUE}${BOLD}Issue 2: PM2 environment variables not set${NC}"
echo -e "${GREEN}# Create ecosystem.config.js${NC}"
echo -e "cat > /path/to/boxwise/ecosystem.config.js << EOF"
echo -e "module.exports = {"
echo -e "  apps: [{"
echo -e "    name: 'boxwise',"
echo -e "    script: './server/src/index.js',"
echo -e "    instances: 1,"
echo -e "    exec_mode: 'fork',"
echo -e "    env: {"
echo -e "      NODE_ENV: 'production',"
echo -e "      PORT: 5001,"
echo -e "      MONGO_URI: 'mongodb://127.0.0.1:27017/boxwise',"
echo -e "      JWT_SECRET: 'your_jwt_secret'"
echo -e "    },"
echo -e "    watch: false,"
echo -e "    max_memory_restart: '500M'"
echo -e "  }]"
echo -e "};"
echo -e "EOF"
echo ""
echo -e "${GREEN}# Restart with the new configuration${NC}"
echo -e "pm2 delete boxwise"
echo -e "pm2 start ecosystem.config.js"
echo -e "pm2 save"
echo ""

echo -e "${BLUE}${BOLD}Issue 3: Nginx API configuration incorrect${NC}"
echo -e "${GREEN}# Find the main Nginx configuration file${NC}"
echo -e "NGINX_CONF=\$(find /etc/nginx -type f -name \"*.conf\" | xargs grep -l \"server {\" 2>/dev/null | head -n 1)"
echo -e "echo \"Found Nginx configuration file: \$NGINX_CONF\""
echo ""
echo -e "${GREEN}# Create a backup${NC}"
echo -e "sudo cp \"\$NGINX_CONF\" \"\$NGINX_CONF.bak\""
echo ""
echo -e "${GREEN}# Fix the API location block${NC}"
echo -e "sudo sed -i '/location \/api {/,/}/d' \"\$NGINX_CONF\""
echo -e "sudo sed -i '/server {/a \\\    location /api {\\\n        proxy_pass http://localhost:5001;\\\n        proxy_http_version 1.1;\\\n        proxy_set_header Upgrade \\\$http_upgrade;\\\n        proxy_set_header Connection \"upgrade\";\\\n        proxy_set_header Host \\\$host;\\\n        proxy_set_header X-Real-IP \\\$remote_addr;\\\n        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;\\\n        proxy_set_header X-Forwarded-Proto \\\$scheme;\\\n    }' \"\$NGINX_CONF\""
echo ""
echo -e "${GREEN}# Test and reload Nginx${NC}"
echo -e "sudo nginx -t"
echo -e "sudo systemctl reload nginx"
echo ""

echo -e "${BLUE}${BOLD}Issue 4: Invalid options object error in webpack${NC}"
echo -e "${GREEN}# Check the webpack configuration${NC}"
echo -e "find /path/to/boxwise -name \"webpack.config.js\" | xargs cat"
echo ""
echo -e "${GREEN}# Fix the allowedHosts configuration${NC}"
echo -e "# Edit the webpack.config.js file and change:"
echo -e "# allowedHosts: [''] to allowedHosts: 'all' or allowedHosts: ['localhost']"
echo -e "# You can use nano or vim to edit the file:"
echo -e "nano /path/to/boxwise/client/node_modules/react-scripts/config/webpackDevServer.config.js"
echo ""

# Step 7: Restart all services
section "Step 7: Restart All Services"
echo -e "${YELLOW}Run these commands in your DigitalOcean terminal:${NC}"
echo -e "${GREEN}# Restart MongoDB${NC}"
echo -e "sudo systemctl restart mongodb"
echo ""
echo -e "${GREEN}# Restart PM2 application${NC}"
echo -e "pm2 restart boxwise"
echo ""
echo -e "${GREEN}# Restart Nginx${NC}"
echo -e "sudo systemctl restart nginx"
echo ""
echo -e "${GREEN}# Check all services are running${NC}"
echo -e "systemctl status mongodb"
echo -e "pm2 list"
echo -e "systemctl status nginx"
echo ""

# Step 8: Verify the fix
section "Step 8: Verify the Fix"
echo -e "${YELLOW}Run these commands in your DigitalOcean terminal:${NC}"
echo -e "${GREEN}# Test backend API${NC}"
echo -e "curl -v http://localhost:5001/api/health"
echo ""
echo -e "${GREEN}# Test Nginx API endpoint${NC}"
echo -e "curl -v http://localhost/api/health"
echo ""
echo -e "${GREEN}# Test Nginx auth endpoint${NC}"
echo -e "curl -v http://localhost/api/auth/status"
echo ""
echo -e "${GREEN}# Check for the webpack error in the logs${NC}"
echo -e "pm2 logs boxwise --lines 50 | grep \"Invalid options object\""
echo ""

# Final notes
section "Final Notes"
echo -e "If you're still experiencing issues after following these steps, please:"
echo -e "1. Check the application logs for specific error messages"
echo -e "2. Verify that all environment variables are correctly set"
echo -e "3. Ensure that MongoDB is properly configured and accessible"
echo -e "4. Check for any firewall rules that might be blocking connections"
echo ""
echo -e "For the webpack 'Invalid options object' error specifically:"
echo -e "1. This is likely related to the allowedHosts configuration in webpack"
echo -e "2. Look for the webpackDevServer.config.js file in your project"
echo -e "3. Change allowedHosts: [''] to allowedHosts: 'all' or allowedHosts: ['localhost']"
echo ""
echo -e "${GREEN}${BOLD}DigitalOcean Troubleshooting Guide completed!${NC}"
echo -e "Good luck with your troubleshooting!"
