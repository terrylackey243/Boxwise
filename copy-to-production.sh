#!/bin/bash

# Boxwise Copy to Production Script
# This script helps copy the production scripts to a production server

# Display help
function show_help {
    echo "Boxwise Copy to Production Script"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -s, --server SERVER       Server address (e.g., user@example.com)"
    echo "  -p, --path PATH           Path on the server (e.g., /var/www/boxwise)"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -s user@example.com -p /var/www/boxwise"
    exit 1
}

# Default values
SERVER=""
PATH_ON_SERVER=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -s|--server)
            SERVER="$2"
            shift 2
            ;;
        -p|--path)
            PATH_ON_SERVER="$2"
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

# Check required parameters
if [ -z "$SERVER" ]; then
    echo "Error: Server address is required"
    show_help
fi

if [ -z "$PATH_ON_SERVER" ]; then
    echo "Error: Path on server is required"
    show_help
fi

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "=== Copying Production Scripts to $SERVER:$PATH_ON_SERVER ==="

# Files to copy
FILES=(
    "start-production.sh"
    "stop-production.sh"
    "restart-production.sh"
    "status-production.sh"
    "PRODUCTION_SCRIPTS.md"
)

# Copy each file
for file in "${FILES[@]}"; do
    if [ -f "$SCRIPT_DIR/$file" ]; then
        echo "Copying $file..."
        scp "$SCRIPT_DIR/$file" "$SERVER:$PATH_ON_SERVER/"
    else
        echo "Warning: $file not found, skipping"
    fi
done

# Make scripts executable on the remote server
echo "Making scripts executable on the remote server..."
ssh "$SERVER" "chmod +x $PATH_ON_SERVER/start-production.sh $PATH_ON_SERVER/stop-production.sh $PATH_ON_SERVER/restart-production.sh $PATH_ON_SERVER/status-production.sh"

echo "=== Copy completed ==="
echo ""
echo "The following files have been copied to $SERVER:$PATH_ON_SERVER/:"
for file in "${FILES[@]}"; do
    if [ -f "$SCRIPT_DIR/$file" ]; then
        echo "- $file"
    fi
done
echo ""
echo "You can now run these scripts on your production server."
echo "For more information, see the PRODUCTION_SCRIPTS.md file."
