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
 * Get the current commit message from COMMIT_EDITMSG file
 * and update it to include the version
 */
function updateCommitMessage() {
  const newVersion = incrementVersion();
  console.log(`Incremented version to ${newVersion}`);
  
  // Stage the version file so it's included in the commit
  stageVersionFile();
  
  // Try to add version to commit message
  try {
    // Get the path to the git directory
    const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();
    const commitMsgFile = path.join(gitDir, 'COMMIT_EDITMSG');
    
    // Only update if the commit message file exists
    if (fs.existsSync(commitMsgFile)) {
      let commitMsg = fs.readFileSync(commitMsgFile, 'utf8');
      
      // Only prepend version if it doesn't already have a version tag
      if (!commitMsg.match(/^\[v\d+\.\d+\.\d+\]/)) {
        commitMsg = `[v${newVersion}] ${commitMsg}`;
        fs.writeFileSync(commitMsgFile, commitMsg, 'utf8');
        console.log(`Updated commit message with version: ${newVersion}`);
      }
    }
  } catch (error) {
    // Continue with commit even if we couldn't update the message
    console.warn(`Note: Could not update commit message: ${error.message}`);
  }
}

// Execute
updateCommitMessage();
