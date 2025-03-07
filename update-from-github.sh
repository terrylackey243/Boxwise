#!/bin/bash

# Boxwise Update from GitHub Script
# This script pulls the latest changes from GitHub and updates the application

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Default values
BRANCH="main"
BACKUP=true
RESTART=true

# Display help
function show_help {
    echo "Boxwise Update from GitHub Script"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -b, --branch BRANCH       Branch to pull from (default: $BRANCH)"
    echo "  --no-backup               Skip database backup before updating"
    echo "  --no-restart              Skip restarting the application after updating"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -b develop"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -b|--branch)
            BRANCH="$2"
            shift 2
            ;;
        --no-backup)
            BACKUP=false
            shift
            ;;
        --no-restart)
            RESTART=false
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

echo -e "${BLUE}=== Boxwise Update from GitHub ===${NC}"
echo -e "Branch: ${GREEN}$BRANCH${NC}"
echo -e "Backup database: ${GREEN}$BACKUP${NC}"
echo -e "Restart application: ${GREEN}$RESTART${NC}"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: Git is not installed${NC}"
    exit 1
fi

# Check if this is a git repository
if [ ! -d "$SCRIPT_DIR/.git" ]; then
    echo -e "${RED}Error: Not a git repository${NC}"
    echo "This script must be run from the root of a git repository"
    exit 1
fi

# Backup the database if requested
if [ "$BACKUP" = true ]; then
    echo -e "${BLUE}Backing up the database...${NC}"
    if [ -f "$SCRIPT_DIR/backup.sh" ]; then
        bash "$SCRIPT_DIR/backup.sh"
        if [ $? -ne 0 ]; then
            echo -e "${RED}Database backup failed${NC}"
            read -p "Continue anyway? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "Update cancelled"
                exit 1
            fi
        else
            echo -e "${GREEN}Database backup completed${NC}"
        fi
    else
        echo -e "${YELLOW}Warning: backup.sh script not found, skipping database backup${NC}"
    fi
    echo ""
fi

# Save the current branch
CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "detached HEAD")
echo -e "${BLUE}Current branch: ${GREEN}$CURRENT_BRANCH${NC}"

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}Warning: You have uncommitted changes${NC}"
    git status --short
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Update cancelled"
        exit 1
    fi
    
    # Stash changes if continuing
    echo -e "${BLUE}Stashing changes...${NC}"
    git stash save "Auto-stashed before update-from-github.sh"
    STASHED=true
else
    STASHED=false
fi

# Fetch the latest changes
echo -e "${BLUE}Fetching latest changes from remote...${NC}"
git fetch
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to fetch from remote${NC}"
    exit 1
fi

# Check if the branch exists
if ! git show-ref --verify --quiet refs/remotes/origin/$BRANCH; then
    echo -e "${RED}Error: Branch '$BRANCH' does not exist on remote${NC}"
    echo "Available remote branches:"
    git branch -r | grep -v '\->' | sed "s/  origin\//  /"
    exit 1
fi

# If we're not on the target branch, check it out
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo -e "${BLUE}Checking out branch ${GREEN}$BRANCH${NC}..."
    git checkout $BRANCH
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to checkout branch $BRANCH${NC}"
        exit 1
    fi
fi

# Pull the latest changes
echo -e "${BLUE}Pulling latest changes from ${GREEN}$BRANCH${NC}..."
git pull origin $BRANCH
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to pull from origin/$BRANCH${NC}"
    exit 1
fi

echo -e "${GREEN}Successfully pulled latest changes${NC}"
echo ""

# Install server dependencies
echo -e "${BLUE}Installing server dependencies...${NC}"
cd "$SCRIPT_DIR/server"
npm ci
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install server dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}Server dependencies installed${NC}"
echo ""

# Install client dependencies
echo -e "${BLUE}Installing client dependencies...${NC}"
cd "$SCRIPT_DIR/client"
npm ci
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install client dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}Client dependencies installed${NC}"
echo ""

# Build the client application
echo -e "${BLUE}Building client application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build client application${NC}"
    exit 1
fi
echo -e "${GREEN}Client build completed${NC}"
echo ""

# Copy built client files to Nginx directory if it exists
if [ -d "/var/www/boxwise" ]; then
    echo -e "${BLUE}Copying built client files to Nginx directory...${NC}"
    sudo cp -r "$SCRIPT_DIR/client/build/"* /var/www/boxwise/
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to copy client files to Nginx directory${NC}"
        exit 1
    fi
    
    # Set proper permissions
    sudo chown -R www-data:www-data /var/www/boxwise
    echo -e "${GREEN}Client files copied to Nginx directory${NC}"
    echo ""
else
    echo -e "${YELLOW}Warning: /var/www/boxwise directory not found, skipping copy to Nginx${NC}"
    echo "If you're using Nginx, you may need to manually copy the client build files"
    echo ""
fi

# Restart the application if requested
if [ "$RESTART" = true ]; then
    echo -e "${BLUE}Restarting the application...${NC}"
    if [ -f "$SCRIPT_DIR/restart-production.sh" ]; then
        bash "$SCRIPT_DIR/restart-production.sh"
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to restart the application${NC}"
            exit 1
        fi
        echo -e "${GREEN}Application restarted${NC}"
    else
        echo -e "${YELLOW}Warning: restart-production.sh script not found${NC}"
        
        # Try to restart using PM2 directly
        if command -v pm2 &> /dev/null && pm2 list | grep -q "boxwise"; then
            echo -e "${BLUE}Restarting with PM2...${NC}"
            pm2 restart boxwise
            if [ $? -ne 0 ]; then
                echo -e "${RED}Failed to restart with PM2${NC}"
                exit 1
            fi
            echo -e "${GREEN}Application restarted with PM2${NC}"
        else
            echo -e "${RED}Could not find a way to restart the application${NC}"
            echo "Please restart the application manually"
        fi
    fi
    echo ""
fi

# Pop stashed changes if we stashed them
if [ "$STASHED" = true ]; then
    echo -e "${BLUE}Restoring stashed changes...${NC}"
    git stash pop
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}Warning: Failed to restore stashed changes${NC}"
        echo "Your changes are still in the stash. Use 'git stash list' to see them"
        echo "and 'git stash apply' to restore them manually."
    else
        echo -e "${GREEN}Stashed changes restored${NC}"
    fi
    echo ""
fi

echo -e "${GREEN}=== Update from GitHub completed successfully ===${NC}"
echo ""
echo -e "To check the application status, run:"
echo -e "  ./check-servers.sh"
echo ""
echo -e "To view application logs, run:"
echo -e "  pm2 logs boxwise"
