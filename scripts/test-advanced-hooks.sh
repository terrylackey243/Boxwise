#!/bin/bash
# Advanced test script for Git hooks with more complex commit messages
# Tests the version system with multi-line commits and detailed messages

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST_FILE="$PROJECT_ROOT/test-detailed-commit.txt"
LOG_FILE="$PROJECT_ROOT/advanced-hook-test.log"

# Initialize log file
echo "Starting advanced hook test at $(date)" > "$LOG_FILE"

# Get current version
CURRENT_VERSION=$(grep -o '"version":[[:space:]]*"[^"]*"' "$PROJECT_ROOT/client/src/version.json" | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
echo "Current version: $CURRENT_VERSION" >> "$LOG_FILE"

# Create test file with timestamp
echo "Advanced test file updated at $(date)" > "$TEST_FILE"

# Stage the file
git add "$TEST_FILE"
echo "Staged test file: $TEST_FILE" >> "$LOG_FILE"

# Create a multi-line commit message file
TEMP_MSG_FILE=$(mktemp)
cat > "$TEMP_MSG_FILE" << EOF
Added new feature to improve user experience

This is a detailed commit message with multiple lines
that describes what changes were made in more detail.

The hook should preserve all this context while adding
the version number to the first line.

Signed-off-by: Test User <test@example.com>
EOF

echo -e "\nOur test commit message:" >> "$LOG_FILE"
cat "$TEMP_MSG_FILE" >> "$LOG_FILE"

# Commit using the commit message file
git commit -F "$TEMP_MSG_FILE"
rm "$TEMP_MSG_FILE"

# Check the result in the latest commit
RESULT=$(git log -1 --pretty=%B)
echo -e "\nActual commit result:" >> "$LOG_FILE"
echo "$RESULT" >> "$LOG_FILE"

# Verify the version is at the start of the first line
FIRST_LINE=$(echo "$RESULT" | head -n 1)
if [[ "$FIRST_LINE" =~ ^v[0-9]+\.[0-9]+\.[0-9]+:.* ]]; then
  VERSION_IN_COMMIT=$(echo "$FIRST_LINE" | grep -o "^v[0-9]\+\.[0-9]\+\.[0-9]\+")
  echo -e "\n✅ SUCCESS: Version appears correctly in commit message" >> "$LOG_FILE"
  echo "Version: $VERSION_IN_COMMIT" >> "$LOG_FILE"
  
  # Check if synopsis matches the first line of original message
  ORIGINAL_FIRST_LINE=$(head -n 1 "$TEMP_MSG_FILE" 2>/dev/null || echo "Unknown")
  SYNOPSIS_IN_COMMIT=$(echo "$FIRST_LINE" | sed "s/^$VERSION_IN_COMMIT: //")
  echo "Synopsis: $SYNOPSIS_IN_COMMIT" >> "$LOG_FILE"
  
  if [[ "$SYNOPSIS_IN_COMMIT" == "$ORIGINAL_FIRST_LINE" ]]; then
    echo "✅ SUCCESS: Synopsis matches first line of original message" >> "$LOG_FILE"
  else
    echo "⚠️ WARNING: Synopsis might be truncated or modified" >> "$LOG_FILE"
  fi
else
  echo -e "\n❌ FAILURE: Version does not appear correctly in commit message" >> "$LOG_FILE"
fi

# Check if multi-line format was preserved
LINE_COUNT=$(echo "$RESULT" | wc -l)
if [ "$LINE_COUNT" -gt 1 ]; then
  echo "✅ SUCCESS: Multi-line format preserved ($LINE_COUNT lines)" >> "$LOG_FILE"
else
  echo "❌ FAILURE: Multi-line format was lost" >> "$LOG_FILE"
fi

echo -e "\nTest completed at $(date)" >> "$LOG_FILE"
echo "See $LOG_FILE for complete test results"

# Display results
cat "$LOG_FILE"
