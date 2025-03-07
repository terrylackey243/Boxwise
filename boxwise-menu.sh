#!/bin/bash

# Boxwise Menu Script
# This script provides a menu-driven interface for running Boxwise production scripts

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Function to display the header
function display_header {
    clear
    echo -e "${BLUE}${BOLD}=== Boxwise Production Management Menu ===${NC}"
    echo -e "${BLUE}Current directory: ${CYAN}$SCRIPT_DIR${NC}"
    echo ""
}

# Function to display the menu
function display_menu {
    display_header
    
    echo -e "${BLUE}${BOLD}Available Scripts:${NC}"
    echo ""
    
    # Define script descriptions
    declare -A DESCRIPTIONS
    DESCRIPTIONS["start-production.sh"]="Start all Boxwise services in production mode"
    DESCRIPTIONS["stop-production.sh"]="Stop all Boxwise services"
    DESCRIPTIONS["restart-production.sh"]="Restart all Boxwise services"
    DESCRIPTIONS["status-production.sh"]="Check detailed status of all Boxwise services"
    DESCRIPTIONS["check-servers.sh"]="Display color-coded status summary of all services"
    DESCRIPTIONS["check-ssl.sh"]="Check SSL certificate configuration"
    DESCRIPTIONS["check-api.sh"]="Check API configuration and connectivity"
    DESCRIPTIONS["check-user.sh"]="Check if a user exists in the database"
    DESCRIPTIONS["get-db-url.sh"]="Get database connection URL and test connection"
    DESCRIPTIONS["fix-mongodb-connection.sh"]="Fix MongoDB connection issues"
    DESCRIPTIONS["create-owner-production.sh"]="Create an owner user in production"
    DESCRIPTIONS["update-from-github.sh"]="Update application from GitHub"
    DESCRIPTIONS["copy-to-production.sh"]="Copy scripts to production server"
    DESCRIPTIONS["backup.sh"]="Backup the MongoDB database"
    DESCRIPTIONS["deploy.sh"]="Deploy the application to production"
    DESCRIPTIONS["boxwise-menu.sh"]="This menu script"
    
    # Find all executable scripts
    SCRIPTS=()
    for script in "$SCRIPT_DIR"/*.sh; do
        if [ -x "$script" ]; then
            SCRIPT_NAME=$(basename "$script")
            SCRIPTS+=("$SCRIPT_NAME")
        fi
    done
    
    # Sort scripts by category
    SERVICE_SCRIPTS=("start-production.sh" "stop-production.sh" "restart-production.sh")
    STATUS_SCRIPTS=("status-production.sh" "check-servers.sh" "check-ssl.sh" "check-api.sh" "check-user.sh" "get-db-url.sh")
    MAINTENANCE_SCRIPTS=("fix-mongodb-connection.sh" "create-owner-production.sh" "update-from-github.sh")
    DEPLOYMENT_SCRIPTS=("copy-to-production.sh" "backup.sh" "deploy.sh")
    
    # Display service management scripts
    echo -e "${YELLOW}${BOLD}Service Management:${NC}"
    for i in "${!SERVICE_SCRIPTS[@]}"; do
        SCRIPT="${SERVICE_SCRIPTS[$i]}"
        if [ -x "$SCRIPT_DIR/$SCRIPT" ]; then
            echo -e "${GREEN}$((i+1)).${NC} ${BOLD}$SCRIPT${NC} - ${DESCRIPTIONS[$SCRIPT]:-No description available}"
        fi
    done
    echo ""
    
    # Display status scripts
    echo -e "${YELLOW}${BOLD}Status & Diagnostics:${NC}"
    for i in "${!STATUS_SCRIPTS[@]}"; do
        SCRIPT="${STATUS_SCRIPTS[$i]}"
        if [ -x "$SCRIPT_DIR/$SCRIPT" ]; then
            INDEX=$((i+1+${#SERVICE_SCRIPTS[@]}))
            echo -e "${GREEN}$INDEX.${NC} ${BOLD}$SCRIPT${NC} - ${DESCRIPTIONS[$SCRIPT]:-No description available}"
        fi
    done
    echo ""
    
    # Display maintenance scripts
    echo -e "${YELLOW}${BOLD}Maintenance & Fixes:${NC}"
    for i in "${!MAINTENANCE_SCRIPTS[@]}"; do
        SCRIPT="${MAINTENANCE_SCRIPTS[$i]}"
        if [ -x "$SCRIPT_DIR/$SCRIPT" ]; then
            INDEX=$((i+1+${#SERVICE_SCRIPTS[@]}+${#STATUS_SCRIPTS[@]}))
            echo -e "${GREEN}$INDEX.${NC} ${BOLD}$SCRIPT${NC} - ${DESCRIPTIONS[$SCRIPT]:-No description available}"
        fi
    done
    echo ""
    
    # Display deployment scripts
    echo -e "${YELLOW}${BOLD}Deployment:${NC}"
    for i in "${!DEPLOYMENT_SCRIPTS[@]}"; do
        SCRIPT="${DEPLOYMENT_SCRIPTS[$i]}"
        if [ -x "$SCRIPT_DIR/$SCRIPT" ]; then
            INDEX=$((i+1+${#SERVICE_SCRIPTS[@]}+${#STATUS_SCRIPTS[@]}+${#MAINTENANCE_SCRIPTS[@]}))
            echo -e "${GREEN}$INDEX.${NC} ${BOLD}$SCRIPT${NC} - ${DESCRIPTIONS[$SCRIPT]:-No description available}"
        fi
    done
    echo ""
    
    # Display other scripts
    OTHER_SCRIPTS=()
    for script in "${SCRIPTS[@]}"; do
        if [[ ! " ${SERVICE_SCRIPTS[@]} ${STATUS_SCRIPTS[@]} ${MAINTENANCE_SCRIPTS[@]} ${DEPLOYMENT_SCRIPTS[@]} " =~ " $script " ]]; then
            if [ "$script" != "boxwise-menu.sh" ]; then
                OTHER_SCRIPTS+=("$script")
            fi
        fi
    done
    
    if [ ${#OTHER_SCRIPTS[@]} -gt 0 ]; then
        echo -e "${YELLOW}${BOLD}Other Scripts:${NC}"
        for i in "${!OTHER_SCRIPTS[@]}"; do
            SCRIPT="${OTHER_SCRIPTS[$i]}"
            INDEX=$((i+1+${#SERVICE_SCRIPTS[@]}+${#STATUS_SCRIPTS[@]}+${#MAINTENANCE_SCRIPTS[@]}+${#DEPLOYMENT_SCRIPTS[@]}))
            echo -e "${GREEN}$INDEX.${NC} ${BOLD}$SCRIPT${NC} - ${DESCRIPTIONS[$SCRIPT]:-No description available}"
        done
        echo ""
    fi
    
    # Calculate total number of scripts (excluding this menu script)
    TOTAL_SCRIPTS=$((${#SERVICE_SCRIPTS[@]}+${#STATUS_SCRIPTS[@]}+${#MAINTENANCE_SCRIPTS[@]}+${#DEPLOYMENT_SCRIPTS[@]}+${#OTHER_SCRIPTS[@]}))
    
    echo -e "${BLUE}${BOLD}Options:${NC}"
    echo -e "${GREEN}1-$TOTAL_SCRIPTS.${NC} Run the corresponding script"
    echo -e "${GREEN}r.${NC} Refresh the menu"
    echo -e "${GREEN}q.${NC} Quit"
    echo ""
    echo -e "${BLUE}${BOLD}Enter your choice:${NC}"
}

# Function to run a script
function run_script {
    local script=$1
    
    if [ -x "$SCRIPT_DIR/$script" ]; then
        echo -e "${BLUE}Running $script...${NC}"
        echo ""
        bash "$SCRIPT_DIR/$script"
        echo ""
        echo -e "${GREEN}Script execution completed.${NC}"
        read -p "Press Enter to return to the menu..."
    else
        echo -e "${RED}Error: Script $script is not executable or does not exist.${NC}"
        read -p "Press Enter to return to the menu..."
    fi
}

# Main loop
while true; do
    # Display the menu
    display_menu
    
    # Get all scripts (excluding this menu script)
    ALL_SCRIPTS=()
    for script in "${SERVICE_SCRIPTS[@]}" "${STATUS_SCRIPTS[@]}" "${MAINTENANCE_SCRIPTS[@]}" "${DEPLOYMENT_SCRIPTS[@]}"; do
        if [ -x "$SCRIPT_DIR/$script" ]; then
            ALL_SCRIPTS+=("$script")
        fi
    done
    
    for script in "${OTHER_SCRIPTS[@]}"; do
        if [ -x "$SCRIPT_DIR/$script" ]; then
            ALL_SCRIPTS+=("$script")
        fi
    done
    
    # Read user input
    read -r choice
    
    # Process user input
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#ALL_SCRIPTS[@]} ]; then
        # Run the selected script
        run_script "${ALL_SCRIPTS[$((choice-1))]}"
    elif [ "$choice" == "r" ] || [ "$choice" == "R" ]; then
        # Refresh the menu
        continue
    elif [ "$choice" == "q" ] || [ "$choice" == "Q" ]; then
        # Quit
        echo -e "${BLUE}Goodbye!${NC}"
        exit 0
    else
        # Invalid choice
        echo -e "${RED}Invalid choice. Please try again.${NC}"
        read -p "Press Enter to continue..."
    fi
done
