#!/bin/bash

# Boxwise Pull from GitHub Script
# This script pulls the latest changes from GitHub

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

echo -e "${BLUE}${BOLD}=== Boxwise Pull from GitHub ===${NC}"
echo -e "${BLUE}Current directory: ${SCRIPT_DIR}${NC}"
echo ""

# Display help
function show_help {
    echo "Boxwise Pull from GitHub Script"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -b, --branch BRANCH       Branch to pull from (default: main)"
    echo "  -r, --remote REMOTE       Remote to pull from (default: origin)"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -b develop -r upstream"
    exit 1
}

# Default values
BRANCH="main"
REMOTE="origin"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -b|--branch)
            BRANCH="$2"
            shift 2
            ;;
        -r|--remote)
            REMOTE="$2"
            shift 2
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

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Git is not installed${NC}"
    echo -e "Please install Git and run this script again."
    exit 1
fi

# Check if the directory is a git repository
if [ ! -d "$SCRIPT_DIR/.git" ]; then
    echo -e "${RED}The current directory is not a git repository${NC}"
    echo -e "Please run this script from a git repository."
    exit 1
fi

# Check if the remote exists
if ! git remote | grep -q "^$REMOTE$"; then
    echo -e "${RED}Remote '$REMOTE' does not exist${NC}"
    echo -e "Available remotes:"
    git remote -v
    echo ""
    echo -e "Please specify a valid remote with -r or --remote."
    exit 1
fi

# Check if the branch exists
if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    echo -e "${YELLOW}Local branch '$BRANCH' does not exist${NC}"
    echo -e "Would you like to create it? (y/n)"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Creating branch '$BRANCH'...${NC}"
        git checkout -b "$BRANCH" "$REMOTE/$BRANCH"
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to create branch '$BRANCH'${NC}"
            echo -e "Please check if the branch exists on the remote."
            exit 1
        fi
        echo -e "${GREEN}Branch '$BRANCH' created successfully${NC}"
    else
        echo -e "${YELLOW}Skipping branch creation${NC}"
        echo -e "Available branches:"
        git branch
        echo ""
        echo -e "Please specify a valid branch with -b or --branch."
        exit 1
    fi
else
    # Switch to the specified branch
    echo -e "${BLUE}Switching to branch '$BRANCH'...${NC}"
    git checkout "$BRANCH"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to switch to branch '$BRANCH'${NC}"
        exit 1
    fi
    echo -e "${GREEN}Switched to branch '$BRANCH'${NC}"
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}There are uncommitted changes in the repository${NC}"
    echo -e "Would you like to stash them? (y/n)"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Stashing changes...${NC}"
        git stash
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to stash changes${NC}"
            exit 1
        fi
        echo -e "${GREEN}Changes stashed successfully${NC}"
        STASHED=true
    else
        echo -e "${YELLOW}Skipping stash${NC}"
        echo -e "Uncommitted changes may cause conflicts during pull."
        STASHED=false
    fi
else
    STASHED=false
fi

# Pull the latest changes
echo -e "${BLUE}Pulling latest changes from $REMOTE/$BRANCH...${NC}"
git pull "$REMOTE" "$BRANCH"
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to pull changes from $REMOTE/$BRANCH${NC}"
    echo -e "Please resolve any conflicts and try again."
    
    # If changes were stashed, ask if the user wants to pop them
    if [ "$STASHED" = true ]; then
        echo -e "${YELLOW}Would you like to pop the stashed changes? (y/n)${NC}"
        read -r answer
        if [[ "$answer" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Popping stashed changes...${NC}"
            git stash pop
            if [ $? -ne 0 ]; then
                echo -e "${RED}Failed to pop stashed changes${NC}"
                echo -e "You can manually pop them with 'git stash pop' when ready."
            else
                echo -e "${GREEN}Stashed changes popped successfully${NC}"
            fi
        else
            echo -e "${YELLOW}Skipping stash pop${NC}"
            echo -e "You can manually pop the stashed changes with 'git stash pop' when ready."
        fi
    fi
    
    exit 1
fi

echo -e "${GREEN}Successfully pulled latest changes from $REMOTE/$BRANCH${NC}"

# If changes were stashed, ask if the user wants to pop them
if [ "$STASHED" = true ]; then
    echo -e "${YELLOW}Would you like to pop the stashed changes? (y/n)${NC}"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Popping stashed changes...${NC}"
        git stash pop
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to pop stashed changes${NC}"
            echo -e "There might be conflicts between your changes and the pulled changes."
            echo -e "You can manually pop them with 'git stash pop' when ready."
        else
            echo -e "${GREEN}Stashed changes popped successfully${NC}"
        fi
    else
        echo -e "${YELLOW}Skipping stash pop${NC}"
        echo -e "You can manually pop the stashed changes with 'git stash pop' when ready."
    fi
fi

# Show the latest commits
echo -e "${BLUE}${BOLD}Latest commits:${NC}"
git log --oneline -n 5

echo -e "${GREEN}${BOLD}Pull from GitHub completed!${NC}"
