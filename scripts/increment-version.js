#!/usr/bin/env node
/**
 * This script increments the patch version and updates version.json
 * It's designed to be executed by a Git pre-commit hook
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to version.json from the project root
const versionFilePath = path.join(__dirname, '..', 'client', 'src', 'version.json');

/**
 * Read the current version information
 */
function readVersionFile() {
  try {
    const versionData = fs.readFileSync(versionFilePath, 'utf8');
    return JSON.parse(versionData);
  } catch (error) {
    console.error(`Error reading version file: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Increment the patch version and write the updated version to the file
 */
function incrementVersion() {
  const versionInfo = readVersionFile();
  
  // Increment patch version
  versionInfo.patch += 1;
  
  // Update version string
  versionInfo.version = `${versionInfo.major}.${versionInfo.minor}.${versionInfo.patch}`;
  
  // Write updated version info back to file
  try {
    fs.writeFileSync(
      versionFilePath,
      JSON.stringify(versionInfo, null, 2) + '\n',
      'utf8'
    );
    return versionInfo.version;
  } catch (error) {
    console.error(`Error updating version file: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Stage the updated version.json file
 */
function stageVersionFile() {
  try {
    execSync(`git add ${versionFilePath}`);
  } catch (error) {
    console.error(`Error staging version file: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Get the current version and add it to the commit message.
 * If the version hasn't been manually updated, this increments it.
 * This ensures the commit message always reflects the actual version.
 */
function updateCommitMessage() {
  let versionInfo = readVersionFile();
  let currentVersion = versionInfo.version;
  
  // Check if we need to increment (for auto-incrementing workflow)
  // But also support manual version updates by not automatically incrementing
  // if the version has already been updated since the last commit
  
  // Get the version from the last commit to see if we need to increment
  let lastVersion = null;
  try {
    // Try to get the version from the last commit message
    const lastCommitMsg = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
    // Updated regex to match both [v0.0.5] and v0.0.5: formats
    const versionMatch = lastCommitMsg.match(/(?:\[v|\bv)(\d+\.\d+\.\d+)(?:\]|:)/);
    
    if (versionMatch) {
      lastVersion = versionMatch[1];
      console.log(`Last commit version: ${lastVersion}`);
    }
  } catch (error) {
    // If this fails, we'll just increment
    console.log('Could not determine last version from commit history');
  }
  
  // Only increment if the current version is the same as the last commit version
  // This allows manual updates to take precedence
  if (lastVersion && currentVersion === lastVersion) {
    const newVersion = incrementVersion();
    console.log(`Incremented version to ${newVersion}`);
    versionInfo = readVersionFile(); // Re-read after increment
    currentVersion = versionInfo.version;
  } else {
    console.log(`Using existing version: ${currentVersion}`);
  }
  
  // Stage the version file so it's included in the commit
  stageVersionFile();
  
  // Try to add version to commit message along with a synopsis
  try {
    // Get the path to the git directory
    const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();
    const commitMsgFile = path.join(gitDir, 'COMMIT_EDITMSG');
    
    // Only update if the commit message file exists
    if (fs.existsSync(commitMsgFile)) {
      let commitMsg = fs.readFileSync(commitMsgFile, 'utf8');
      
      // Only modify if it doesn't already have a version tag
      if (!commitMsg.match(/^\[v\d+\.\d+\.\d+/)) {
        // Extract first line as the synopsis (trimming any comment lines starting with #)
        let synopsis = commitMsg.split('\n')[0].trim();
        
        // Remove any comment lines (starting with #) at the beginning
        while (synopsis.startsWith('#')) {
          const lines = commitMsg.split('\n');
          lines.shift(); // Remove first line
          commitMsg = lines.join('\n');
          synopsis = commitMsg.split('\n')[0].trim();
        }
        
        // Limit synopsis length if too long (for readability)
        if (synopsis.length > 50) {
          synopsis = synopsis.substring(0, 47) + '...';
        }
        
        // Format: [v0.0.2 - Added new feature]
        commitMsg = `[v${currentVersion} - ${synopsis}]${commitMsg.substring(synopsis.length)}`;
        fs.writeFileSync(commitMsgFile, commitMsg, 'utf8');
        console.log(`Updated commit message with version: ${currentVersion} and synopsis`);
      }
    }
  } catch (error) {
    // Continue with commit even if we couldn't update the message
    console.warn(`Note: Could not update commit message: ${error.message}`);
  }
}

// Execute
updateCommitMessage();
