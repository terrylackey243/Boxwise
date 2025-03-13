#!/bin/bash
# Script to test if our Git hooks are working correctly
# This script makes a small change, commits it, and then checks the commit message

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST_FILE="$PROJECT_ROOT/test-version-hook-file.txt"
LOG_FILE="$PROJECT_ROOT/hook-test-results.log"

# Initialize log file
echo "Starting hook test at $(date)" > "$LOG_FILE"

# Get current version
CURRENT_VERSION=$(grep -o '"version":[[:space:]]*"[^"]*"' "$PROJECT_ROOT/client/src/version.json" | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
echo "Current version: $CURRENT_VERSION" >> "$LOG_FILE"

# Create or update test file with timestamp
echo "Test file updated at $(date)" > "$TEST_FILE"

# Stage the file
git add "$TEST_FILE"
echo "Staged test file: $TEST_FILE" >> "$LOG_FILE"

# Commit with a simple message
COMMIT_MSG="Test commit for hook verification"
git commit -m "$COMMIT_MSG"

# Check the commit message in the latest commit
RESULT=$(git log -1 --pretty=%B)
echo -e "\nCommit result:" >> "$LOG_FILE"
echo "$RESULT" >> "$LOG_FILE"

# Check if version appears in the commit message
if [[ "$RESULT" == v* ]]; then
  echo -e "\n✅ SUCCESS: Version appears in commit message" >> "$LOG_FILE"
  echo "Version prefix found: ${RESULT%%:*}" >> "$LOG_FILE"
else
  echo -e "\n❌ FAILURE: Version does not appear in commit message" >> "$LOG_FILE"
fi

echo -e "\nTest completed at $(date)" >> "$LOG_FILE"
echo "See $LOG_FILE for complete test results"

# Display results
cat "$LOG_FILE"
