#!/bin/bash

# Boxwise Fix Persistent Issues Script
# This script fixes the persistent issues identified by boxwise-doctor.sh

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}${BOLD}=== Boxwise Fix Persistent Issues ===${NC}"
echo -e "${BLUE}Current directory: ${SCRIPT_DIR}${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Warning: This script may need root privileges for some operations.${NC}"
    echo -e "Consider running with sudo if you encounter permission issues."
    echo ""
fi

# Display help
function show_help {
    echo "Boxwise Fix Persistent Issues Script"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -a, --auto-fix            Automatically fix issues without prompting"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -a"
    exit 1
}

# Default values
AUTO_FIX=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -a|--auto-fix)
            AUTO_FIX=true
            shift
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            ;;
    esac
done

# Function to ask for confirmation
confirm() {
    local message=$1
    if [ "$AUTO_FIX" = true ]; then
        return 0
    fi
    echo -e "${YELLOW}$message (y/n)${NC}"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to run a fix script
run_fix_script() {
    local script=$1
    local description=$2
    
    if [ -x "$SCRIPT_DIR/$script" ]; then
        echo -e "${BLUE}Running $script to $description...${NC}"
        bash "$SCRIPT_DIR/$script"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Successfully ran $script${NC}"
        else
            echo -e "${RED}Failed to run $script${NC}"
        fi
    else
        echo -e "${RED}Error: Script $script is not executable or does not exist.${NC}"
    fi
}

# Check PM2 environment variables
echo -e "${BLUE}${BOLD}Checking PM2 environment variables...${NC}"
PM2_ENV_VARS=false
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "boxwise"; then
        echo -e "${GREEN}Boxwise application is running in PM2${NC}"
        
        # Check PM2 environment variables
        PM2_ENV=$(pm2 env boxwise 2>/dev/null)
        if echo "$PM2_ENV" | grep -q "MONGO_URI"; then
            echo -e "${GREEN}MONGO_URI is set in PM2 environment${NC}"
            PM2_ENV_VARS=true
        else
            echo -e "${RED}MONGO_URI is not set in PM2 environment${NC}"
            PM2_ENV_VARS=false
            
            # Fix PM2 environment variables
            echo -e "${BLUE}${BOLD}Fixing PM2 environment variables...${NC}"
            if confirm "Would you like to fix PM2 environment variables?"; then
                run_fix_script "fix-pm2-env.sh" "fix PM2 environment variables"
            fi
        fi
    else
        echo -e "${RED}Boxwise application is not running in PM2${NC}"
    fi
else
    echo -e "${RED}PM2 is not installed${NC}"
fi
echo ""

# Check Nginx configuration
echo -e "${BLUE}${BOLD}Checking Nginx configuration...${NC}"
NGINX_WORKING=false
if command -v nginx &> /dev/null; then
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}Nginx is running${NC}"
        
        # Test Nginx API endpoint
        if command -v curl &> /dev/null; then
            echo -e "${YELLOW}Testing Nginx API endpoint...${NC}"
            NGINX_API_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "Failed")
            
            if [ "$NGINX_API_RESULT" = "200" ]; then
                echo -e "${GREEN}Nginx API endpoint is responding on http://localhost/api/health${NC}"
                NGINX_WORKING=true
            elif [ "$NGINX_API_RESULT" = "Failed" ]; then
                echo -e "${RED}Could not connect to Nginx API endpoint on http://localhost/api/health${NC}"
                NGINX_WORKING=false
                
                # Fix Nginx configuration
                echo -e "${BLUE}${BOLD}Fixing Nginx configuration...${NC}"
                if confirm "Would you like to fix Nginx configuration?"; then
                    # First, check if the backend server is running
                    echo -e "${YELLOW}Checking if backend server is running...${NC}"
                    BACKEND_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/health 2>/dev/null || echo "Failed")
                    
                    if [ "$BACKEND_RESULT" = "200" ]; then
                        echo -e "${GREEN}Backend server is running on http://localhost:5001/api/health${NC}"
                        
                        # Create a more comprehensive fix for Nginx
                        echo -e "${BLUE}Creating a more comprehensive fix for Nginx...${NC}"
                        
                        # Find Nginx configuration files
                        NGINX_CONF_DIR="/etc/nginx"
                        SITES_AVAILABLE_DIR="$NGINX_CONF_DIR/sites-available"
                        SITES_ENABLED_DIR="$NGINX_CONF_DIR/sites-enabled"
                        
                        # Check if sites-available and sites-enabled directories exist
                        if [ ! -d "$SITES_AVAILABLE_DIR" ] || [ ! -d "$SITES_ENABLED_DIR" ]; then
                            echo -e "${YELLOW}Standard Nginx sites directories not found${NC}"
                            echo -e "Looking for configuration files in $NGINX_CONF_DIR..."
                            
                            # Find all configuration files in the Nginx directory
                            CONF_FILES=()
                            while IFS= read -r -d '' file; do
                                CONF_FILES+=("$file")
                            done < <(find "$NGINX_CONF_DIR" -type f -name "*.conf" -print0)
                        else
                            # Find all configuration files in sites-available and sites-enabled
                            CONF_FILES=()
                            while IFS= read -r -d '' file; do
                                CONF_FILES+=("$file")
                            done < <(find "$SITES_AVAILABLE_DIR" "$SITES_ENABLED_DIR" -type f -print0)
                        fi
                        
                        # Look for API configuration in Nginx files
                        API_CONF_FILES=()
                        for file in "${CONF_FILES[@]}"; do
                            if grep -q "location /api" "$file"; then
                                API_CONF_FILES+=("$file")
                                echo -e "${GREEN}Found API configuration in $file${NC}"
                            fi
                        done
                        
                        if [ ${#API_CONF_FILES[@]} -eq 0 ]; then
                            echo -e "${RED}No API configuration found in Nginx files${NC}"
                            
                            # Ask for the configuration file to modify
                            echo -e "${YELLOW}Please enter the path to the Nginx configuration file to modify:${NC}"
                            read -r conf_file
                            
                            if [ ! -f "$conf_file" ]; then
                                echo -e "${RED}File not found: $conf_file${NC}"
                                echo -e "Please check the file path and run this script again."
                                exit 1
                            fi
                            
                            # Create a backup of the original file
                            cp "$conf_file" "$conf_file.bak"
                            echo -e "${GREEN}Created backup of Nginx configuration at: $conf_file.bak${NC}"
                            
                            # Add API location block to the server block
                            sed -i '/server {/a \
    location /api {\
        proxy_pass http://localhost:5001;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
    }' "$conf_file"
                            
                            echo -e "${GREEN}Added API configuration to $conf_file${NC}"
                        else
                            # Fix each API configuration file
                            for file in "${API_CONF_FILES[@]}"; do
                                echo -e "${BLUE}Fixing API configuration in $file...${NC}"
                                
                                # Create a backup of the original file
                                cp "$file" "$file.bak"
                                echo -e "${GREEN}Created backup of Nginx configuration at: $file.bak${NC}"
                                
                                # Display the current API configuration
                                echo -e "${YELLOW}Current API configuration:${NC}"
                                grep -A 10 "location /api" "$file" | grep -v "#" | sed 's/^/  /'
                                
                                # Fix the proxy_pass directive
                                sed -i 's|proxy_pass http://localhost:[0-9]\+/api;|proxy_pass http://localhost:5001;|g' "$file"
                                sed -i 's|proxy_pass http://localhost:[0-9]\+/api/;|proxy_pass http://localhost:5001;|g' "$file"
                                sed -i 's|proxy_pass http://localhost:[0-9]\+;|proxy_pass http://localhost:5001;|g' "$file"
                                
                                # If no proxy_pass directive was found, add it
                                if ! grep -q "proxy_pass" "$file"; then
                                    sed -i '/location \/api {/a \        proxy_pass http://localhost:5001;' "$file"
                                fi
                                
                                # Display the updated API configuration
                                echo -e "${YELLOW}Updated API configuration:${NC}"
                                grep -A 10 "location /api" "$file" | grep -v "#" | sed 's/^/  /'
                            done
                        fi
                        
                        # Test the new configuration
                        echo -e "${BLUE}Testing Nginx configuration...${NC}"
                        nginx -t
                        if [ $? -ne 0 ]; then
                            echo -e "${RED}Nginx configuration test failed${NC}"
                            echo -e "${YELLOW}Restoring backup...${NC}"
                            for file in "${API_CONF_FILES[@]}"; do
                                cp "$file.bak" "$file"
                            done
                            echo -e "${GREEN}Backup restored${NC}"
                            exit 1
                        fi
                        
                        echo -e "${GREEN}Nginx configuration test passed${NC}"
                        echo -e "${BLUE}Reloading Nginx...${NC}"
                        systemctl reload nginx
                        if [ $? -ne 0 ]; then
                            echo -e "${RED}Failed to reload Nginx${NC}"
                            echo -e "Please reload Nginx manually with: systemctl reload nginx"
                        else
                            echo -e "${GREEN}Nginx reloaded successfully${NC}"
                        fi
                    else
                        echo -e "${RED}Backend server is not running on http://localhost:5001/api/health${NC}"
                        echo -e "Please start the backend server first."
                        
                        # Fix backend server
                        if confirm "Would you like to start the backend server?"; then
                            run_fix_script "start-backend.sh" "start the backend server"
                        fi
                    fi
                fi
            else
                echo -e "${YELLOW}Nginx API endpoint responded with status code: $NGINX_API_RESULT${NC}"
                NGINX_WORKING=false
                
                # Fix Nginx configuration
                echo -e "${BLUE}${BOLD}Fixing Nginx configuration...${NC}"
                if confirm "Would you like to fix Nginx configuration?"; then
                    run_fix_script "fix-nginx-api.sh" "fix Nginx API path issues"
                fi
            fi
        else
            echo -e "${YELLOW}curl command not available, skipping API test${NC}"
        fi
    else
        echo -e "${RED}Nginx is not running${NC}"
        
        # Start Nginx
        if confirm "Would you like to start Nginx?"; then
            echo -e "${BLUE}Starting Nginx...${NC}"
            systemctl start nginx
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}Nginx started successfully${NC}"
            else
                echo -e "${RED}Failed to start Nginx${NC}"
            fi
        fi
    fi
else
    echo -e "${RED}Nginx is not installed${NC}"
fi
echo ""

# Final check
echo -e "${BLUE}${BOLD}=== Final Check ===${NC}"
echo -e "Running a final check to see if all issues have been resolved..."

# Check PM2 environment variables again
PM2_ENV_VARS_FIXED=false
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "boxwise"; then
        # Check PM2 environment variables
        PM2_ENV=$(pm2 env boxwise 2>/dev/null)
        if echo "$PM2_ENV" | grep -q "MONGO_URI"; then
            echo -e "${GREEN}MONGO_URI is now set in PM2 environment${NC}"
            PM2_ENV_VARS_FIXED=true
        else
            echo -e "${RED}MONGO_URI is still not set in PM2 environment${NC}"
            PM2_ENV_VARS_FIXED=false
        fi
    fi
fi

# Check Nginx API endpoint again
NGINX_WORKING_FIXED=false
if command -v curl &> /dev/null; then
    echo -e "${YELLOW}Testing Nginx API endpoint...${NC}"
    NGINX_API_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "Failed")
    
    if [ "$NGINX_API_RESULT" = "200" ]; then
        echo -e "${GREEN}Nginx API endpoint is now responding on http://localhost/api/health${NC}"
        NGINX_WORKING_FIXED=true
    elif [ "$NGINX_API_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to Nginx API endpoint on http://localhost/api/health${NC}"
        NGINX_WORKING_FIXED=false
    else
        echo -e "${YELLOW}Nginx API endpoint responded with status code: $NGINX_API_RESULT${NC}"
        NGINX_WORKING_FIXED=false
    fi
    
    # Test Nginx auth endpoint
    echo -e "\n${YELLOW}Testing Nginx auth endpoint...${NC}"
    NGINX_AUTH_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/auth/status 2>/dev/null || echo "Failed")
    
    if [ "$NGINX_AUTH_RESULT" = "200" ] || [ "$NGINX_AUTH_RESULT" = "401" ]; then
        echo -e "${GREEN}Nginx auth endpoint is now responding on http://localhost/api/auth/status${NC}"
        echo -e "Status code: $NGINX_AUTH_RESULT (401 is expected if not authenticated)"
        NGINX_AUTH_WORKING_FIXED=true
    elif [ "$NGINX_AUTH_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to Nginx auth endpoint on http://localhost/api/auth/status${NC}"
        NGINX_AUTH_WORKING_FIXED=false
    else
        echo -e "${YELLOW}Nginx auth endpoint responded with status code: $NGINX_AUTH_RESULT${NC}"
        NGINX_AUTH_WORKING_FIXED=false
    fi
fi
echo ""

# Final summary
echo -e "${BLUE}${BOLD}=== Final Summary ===${NC}"
if [ "$PM2_ENV_VARS_FIXED" = true ] && [ "$NGINX_WORKING_FIXED" = true ] && [ "$NGINX_AUTH_WORKING_FIXED" = true ]; then
    echo -e "${GREEN}${BOLD}All persistent issues have been resolved!${NC}"
    echo -e "The application should now be working properly."
    echo -e "You should be able to access the application and log in."
else
    echo -e "${RED}${BOLD}Some issues still remain.${NC}"
    
    if [ "$PM2_ENV_VARS_FIXED" = false ]; then
        echo -e "${RED}PM2 environment variables are still not set.${NC}"
        echo -e "Try running the fix-pm2-env.sh script again."
    fi
    
    if [ "$NGINX_WORKING_FIXED" = false ] || [ "$NGINX_AUTH_WORKING_FIXED" = false ]; then
        echo -e "${RED}Nginx API endpoints are still not working.${NC}"
        echo -e "Here are some additional things to try:"
        echo -e "1. Check if the backend server is running with: pm2 list"
        echo -e "2. Check the backend server logs with: pm2 logs boxwise"
        echo -e "3. Check if there are any other issues in the Nginx error logs:"
        echo -e "   tail -n 100 /var/log/nginx/error.log"
        echo -e "4. Try manually editing the Nginx configuration to ensure the proxy_pass directive is correct:"
        echo -e "   location /api {"
        echo -e "       proxy_pass http://localhost:5001;"
        echo -e "       ..."
        echo -e "   }"
        echo -e "5. Make sure there are no firewall rules blocking connections between Nginx and the backend server."
    fi
fi

echo -e "${GREEN}${BOLD}Fix Persistent Issues Script completed!${NC}"
