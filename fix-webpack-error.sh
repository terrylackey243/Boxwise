#!/bin/bash

# Boxwise Fix Webpack Error Script
# This script fixes the "Invalid options object" error related to allowedHosts in webpack

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

echo -e "${BLUE}${BOLD}=== Boxwise Fix Webpack Error ===${NC}"
echo -e "${BLUE}Current directory: ${SCRIPT_DIR}${NC}"
echo ""

# Display help
function show_help {
    echo "Boxwise Fix Webpack Error Script"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -f, --force               Force fix without prompting"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -f"
    exit 1
}

# Default values
FORCE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -f|--force)
            FORCE=true
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
    if [ "$FORCE" = true ]; then
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

# Function to display a section header
section() {
    local title=$1
    echo ""
    echo -e "${BLUE}${BOLD}=== $title ===${NC}"
}

# Introduction
section "Introduction"
echo -e "This script will fix the 'Invalid options object' error related to allowedHosts in webpack."
echo -e "The error message is: 'options.allowedHosts[0] should be a non-empty string.'"
echo -e "This is typically caused by an empty string in the allowedHosts array in the webpack configuration."
echo ""

# Step 1: Find webpack configuration files
section "Step 1: Finding Webpack Configuration Files"

# Look for webpack configuration files in client directory
echo -e "${BLUE}Looking for webpack configuration files in client directory...${NC}"
WEBPACK_CONFIG_FILES=()
while IFS= read -r -d '' file; do
    WEBPACK_CONFIG_FILES+=("$file")
done < <(find "$SCRIPT_DIR/client" -type f -name "webpack*.js" -o -name "webpackDevServer.config.js" -print0 2>/dev/null)

# Look for webpack configuration files in node_modules
echo -e "${BLUE}Looking for webpack configuration files in node_modules...${NC}"
while IFS= read -r -d '' file; do
    WEBPACK_CONFIG_FILES+=("$file")
done < <(find "$SCRIPT_DIR/client/node_modules" -type f -name "webpackDevServer.config.js" -print0 2>/dev/null)

if [ ${#WEBPACK_CONFIG_FILES[@]} -eq 0 ]; then
    echo -e "${RED}No webpack configuration files found.${NC}"
    echo -e "${YELLOW}Trying to find all JavaScript files that might contain webpack configuration...${NC}"
    
    # Look for any JavaScript file that might contain webpack configuration
    while IFS= read -r -d '' file; do
        if grep -q "allowedHosts" "$file"; then
            WEBPACK_CONFIG_FILES+=("$file")
            echo -e "${GREEN}Found potential webpack configuration in: $file${NC}"
        fi
    done < <(find "$SCRIPT_DIR/client" -type f -name "*.js" -print0 2>/dev/null)
    
    if [ ${#WEBPACK_CONFIG_FILES[@]} -eq 0 ]; then
        echo -e "${RED}No webpack configuration files found. Cannot proceed.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Found ${#WEBPACK_CONFIG_FILES[@]} webpack configuration files:${NC}"
    for file in "${WEBPACK_CONFIG_FILES[@]}"; do
        echo -e "- $file"
    done
fi

# Step 2: Check for allowedHosts configuration
section "Step 2: Checking for allowedHosts Configuration"

FIXED_FILES=0
for file in "${WEBPACK_CONFIG_FILES[@]}"; do
    echo -e "${BLUE}Checking $file for allowedHosts configuration...${NC}"
    
    # Check if the file contains allowedHosts configuration
    if grep -q "allowedHosts" "$file"; then
        echo -e "${GREEN}Found allowedHosts configuration in $file${NC}"
        
        # Check if the file contains the problematic configuration
        if grep -q "allowedHosts: \[\s*''\s*\]" "$file" || grep -q "allowedHosts: \[\s*\"\"\s*\]" "$file"; then
            echo -e "${RED}Found problematic allowedHosts configuration in $file${NC}"
            
            # Create a backup of the original file
            cp "$file" "$file.bak"
            echo -e "${GREEN}Created backup of original file at: $file.bak${NC}"
            
            # Fix the allowedHosts configuration
            if confirm "Would you like to fix the allowedHosts configuration in $file?"; then
                echo -e "${BLUE}Fixing allowedHosts configuration in $file...${NC}"
                
                # Replace allowedHosts: [''] with allowedHosts: 'all'
                sed -i "s/allowedHosts: \[\s*''\s*\]/allowedHosts: 'all'/g" "$file"
                sed -i "s/allowedHosts: \[\s*\"\"\s*\]/allowedHosts: 'all'/g" "$file"
                
                # Check if the fix was successful
                if grep -q "allowedHosts: 'all'" "$file"; then
                    echo -e "${GREEN}Successfully fixed allowedHosts configuration in $file${NC}"
                    FIXED_FILES=$((FIXED_FILES + 1))
                else
                    echo -e "${RED}Failed to fix allowedHosts configuration in $file${NC}"
                    echo -e "${YELLOW}You may need to manually edit the file.${NC}"
                    echo -e "${YELLOW}Change: allowedHosts: [''] to allowedHosts: 'all'${NC}"
                fi
            fi
        else
            echo -e "${YELLOW}The allowedHosts configuration in $file does not appear to be problematic.${NC}"
            echo -e "${YELLOW}Current configuration:${NC}"
            grep -n "allowedHosts" "$file" -A 2 | sed 's/^/  /'
            
            if confirm "Would you like to modify the allowedHosts configuration in $file anyway?"; then
                echo -e "${BLUE}Modifying allowedHosts configuration in $file...${NC}"
                
                # Create a backup of the original file
                cp "$file" "$file.bak"
                echo -e "${GREEN}Created backup of original file at: $file.bak${NC}"
                
                # Try to replace the allowedHosts configuration with a more general pattern
                if grep -q "allowedHosts:" "$file"; then
                    # Use a more complex sed pattern to replace the entire allowedHosts line and possible array elements
                    sed -i '/allowedHosts:/,/\],/s/allowedHosts:.*\],/allowedHosts: '\''all'\'',/g' "$file"
                    
                    # Check if the fix was successful
                    if grep -q "allowedHosts: 'all'" "$file"; then
                        echo -e "${GREEN}Successfully modified allowedHosts configuration in $file${NC}"
                        FIXED_FILES=$((FIXED_FILES + 1))
                    else
                        echo -e "${RED}Failed to modify allowedHosts configuration in $file${NC}"
                        echo -e "${YELLOW}You may need to manually edit the file.${NC}"
                        echo -e "${YELLOW}Change the allowedHosts configuration to: allowedHosts: 'all'${NC}"
                    fi
                else
                    echo -e "${RED}Could not find the exact allowedHosts line to modify.${NC}"
                    echo -e "${YELLOW}You may need to manually edit the file.${NC}"
                fi
            fi
        fi
    else
        echo -e "${YELLOW}No allowedHosts configuration found in $file${NC}"
    fi
    echo ""
done

# Step 3: Check for react-scripts version
section "Step 3: Checking React Scripts Version"

echo -e "${BLUE}Checking react-scripts version...${NC}"
if [ -f "$SCRIPT_DIR/client/package.json" ]; then
    if grep -q "react-scripts" "$SCRIPT_DIR/client/package.json"; then
        REACT_SCRIPTS_VERSION=$(grep -o '"react-scripts": "[^"]*"' "$SCRIPT_DIR/client/package.json" | cut -d'"' -f4)
        echo -e "${GREEN}Found react-scripts version: $REACT_SCRIPTS_VERSION${NC}"
        
        # Check if the version is 5.0.0 or higher
        if [[ "$REACT_SCRIPTS_VERSION" =~ ^5\. ]]; then
            echo -e "${YELLOW}You are using react-scripts version 5.x, which uses webpack 5.${NC}"
            echo -e "${YELLOW}The allowedHosts configuration in webpack 5 is different from webpack 4.${NC}"
            echo -e "${YELLOW}In webpack 5, allowedHosts should be 'all' or an array of non-empty strings.${NC}"
            
            # Look for webpackDevServer.config.js in react-scripts
            WEBPACK_DEV_SERVER_CONFIG="$SCRIPT_DIR/client/node_modules/react-scripts/config/webpackDevServer.config.js"
            if [ -f "$WEBPACK_DEV_SERVER_CONFIG" ]; then
                echo -e "${GREEN}Found webpackDevServer.config.js in react-scripts${NC}"
                
                # Check if the file contains the problematic configuration
                if grep -q "allowedHosts: \[\s*''\s*\]" "$WEBPACK_DEV_SERVER_CONFIG" || grep -q "allowedHosts: \[\s*\"\"\s*\]" "$WEBPACK_DEV_SERVER_CONFIG"; then
                    echo -e "${RED}Found problematic allowedHosts configuration in $WEBPACK_DEV_SERVER_CONFIG${NC}"
                    
                    # Create a backup of the original file
                    cp "$WEBPACK_DEV_SERVER_CONFIG" "$WEBPACK_DEV_SERVER_CONFIG.bak"
                    echo -e "${GREEN}Created backup of original file at: $WEBPACK_DEV_SERVER_CONFIG.bak${NC}"
                    
                    # Fix the allowedHosts configuration
                    if confirm "Would you like to fix the allowedHosts configuration in $WEBPACK_DEV_SERVER_CONFIG?"; then
                        echo -e "${BLUE}Fixing allowedHosts configuration in $WEBPACK_DEV_SERVER_CONFIG...${NC}"
                        
                        # Replace allowedHosts: [''] with allowedHosts: 'all'
                        sed -i "s/allowedHosts: \[\s*''\s*\]/allowedHosts: 'all'/g" "$WEBPACK_DEV_SERVER_CONFIG"
                        sed -i "s/allowedHosts: \[\s*\"\"\s*\]/allowedHosts: 'all'/g" "$WEBPACK_DEV_SERVER_CONFIG"
                        
                        # Check if the fix was successful
                        if grep -q "allowedHosts: 'all'" "$WEBPACK_DEV_SERVER_CONFIG"; then
                            echo -e "${GREEN}Successfully fixed allowedHosts configuration in $WEBPACK_DEV_SERVER_CONFIG${NC}"
                            FIXED_FILES=$((FIXED_FILES + 1))
                        else
                            echo -e "${RED}Failed to fix allowedHosts configuration in $WEBPACK_DEV_SERVER_CONFIG${NC}"
                            echo -e "${YELLOW}You may need to manually edit the file.${NC}"
                            echo -e "${YELLOW}Change: allowedHosts: [''] to allowedHosts: 'all'${NC}"
                        fi
                    fi
                else
                    echo -e "${YELLOW}The allowedHosts configuration in $WEBPACK_DEV_SERVER_CONFIG does not appear to be problematic.${NC}"
                    echo -e "${YELLOW}Current configuration:${NC}"
                    grep -n "allowedHosts" "$WEBPACK_DEV_SERVER_CONFIG" -A 2 | sed 's/^/  /'
                    
                    if confirm "Would you like to modify the allowedHosts configuration in $WEBPACK_DEV_SERVER_CONFIG anyway?"; then
                        echo -e "${BLUE}Modifying allowedHosts configuration in $WEBPACK_DEV_SERVER_CONFIG...${NC}"
                        
                        # Create a backup of the original file
                        cp "$WEBPACK_DEV_SERVER_CONFIG" "$WEBPACK_DEV_SERVER_CONFIG.bak"
                        echo -e "${GREEN}Created backup of original file at: $WEBPACK_DEV_SERVER_CONFIG.bak${NC}"
                        
                        # Try to replace the allowedHosts configuration with a more general pattern
                        if grep -q "allowedHosts:" "$WEBPACK_DEV_SERVER_CONFIG"; then
                            # Use a more complex sed pattern to replace the entire allowedHosts line and possible array elements
                            sed -i '/allowedHosts:/,/\],/s/allowedHosts:.*\],/allowedHosts: '\''all'\'',/g' "$WEBPACK_DEV_SERVER_CONFIG"
                            
                            # Check if the fix was successful
                            if grep -q "allowedHosts: 'all'" "$WEBPACK_DEV_SERVER_CONFIG"; then
                                echo -e "${GREEN}Successfully modified allowedHosts configuration in $WEBPACK_DEV_SERVER_CONFIG${NC}"
                                FIXED_FILES=$((FIXED_FILES + 1))
                            else
                                echo -e "${RED}Failed to modify allowedHosts configuration in $WEBPACK_DEV_SERVER_CONFIG${NC}"
                                echo -e "${YELLOW}You may need to manually edit the file.${NC}"
                                echo -e "${YELLOW}Change the allowedHosts configuration to: allowedHosts: 'all'${NC}"
                            fi
                        else
                            echo -e "${RED}Could not find the exact allowedHosts line to modify.${NC}"
                            echo -e "${YELLOW}You may need to manually edit the file.${NC}"
                        fi
                    fi
                fi
            else
                echo -e "${RED}Could not find webpackDevServer.config.js in react-scripts${NC}"
                echo -e "${YELLOW}You may need to manually edit the webpack configuration files.${NC}"
            fi
        else
            echo -e "${GREEN}You are using react-scripts version $REACT_SCRIPTS_VERSION, which uses webpack 4.${NC}"
            echo -e "${YELLOW}The allowedHosts configuration in webpack 4 is different from webpack 5.${NC}"
            echo -e "${YELLOW}In webpack 4, allowedHosts should be an array of strings or 'auto'.${NC}"
        fi
    else
        echo -e "${YELLOW}Could not find react-scripts in package.json${NC}"
    fi
else
    echo -e "${RED}Could not find package.json in client directory${NC}"
fi

# Step 4: Final summary
section "Step 4: Final Summary"

if [ $FIXED_FILES -gt 0 ]; then
    echo -e "${GREEN}${BOLD}Successfully fixed $FIXED_FILES file(s)!${NC}"
    echo -e "The 'Invalid options object' error should now be resolved."
    echo -e "You may need to restart your application for the changes to take effect."
    echo -e ""
    echo -e "${YELLOW}To restart your application, run:${NC}"
    echo -e "pm2 restart boxwise"
    echo -e ""
    echo -e "${YELLOW}To verify the fix, check the logs for the error message:${NC}"
    echo -e "pm2 logs boxwise | grep \"Invalid options object\""
else
    echo -e "${RED}${BOLD}No files were fixed.${NC}"
    echo -e "You may need to manually edit the webpack configuration files."
    echo -e ""
    echo -e "${YELLOW}Here are some suggestions:${NC}"
    echo -e "1. Look for files containing 'allowedHosts' configuration"
    echo -e "2. Change allowedHosts: [''] to allowedHosts: 'all'"
    echo -e "3. For react-scripts 5.x (webpack 5), the file to edit is likely:"
    echo -e "   client/node_modules/react-scripts/config/webpackDevServer.config.js"
    echo -e ""
    echo -e "${YELLOW}You can manually edit the file with:${NC}"
    echo -e "nano client/node_modules/react-scripts/config/webpackDevServer.config.js"
    echo -e ""
    echo -e "${YELLOW}Look for a line like:${NC}"
    echo -e "allowedHosts: ['']"
    echo -e ""
    echo -e "${YELLOW}And change it to:${NC}"
    echo -e "allowedHosts: 'all'"
fi

echo -e "${GREEN}${BOLD}Fix Webpack Error Script completed!${NC}"
