#!/usr/bin/env node
/**
 * This script sets up the version control system by:
 * 1. Making the pre-commit hook executable
 * 2. Installing the pre-commit hook to .git/hooks
 * 
 * Note: The version.json file is located in client/src/version.json
 * to be compatible with React's import restrictions.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const preCommitSource = path.join(projectRoot, 'scripts', 'hooks', 'pre-commit');
const incrementVersionScript = path.join(projectRoot, 'scripts', 'increment-version.js');

// Get the .git hooks directory
let gitHooksDir;
try {
  const gitDir = execSync('git rev-parse --git-dir', { 
    encoding: 'utf8',
    cwd: projectRoot
  }).trim();
  gitHooksDir = path.join(projectRoot, gitDir, 'hooks');
} catch (error) {
  console.error('Error finding git directory. Make sure this is a git repository.');
  process.exit(1);
}

const preCommitTarget = path.join(gitHooksDir, 'pre-commit');

// Make sure the scripts are executable
try {
  console.log('Making scripts executable...');
  execSync(`chmod +x "${preCommitSource}"`);
  execSync(`chmod +x "${incrementVersionScript}"`);
  console.log('✅ Scripts are now executable');
} catch (error) {
  console.error(`Error making scripts executable: ${error.message}`);
  process.exit(1);
}

// Check if pre-commit hook already exists
if (fs.existsSync(preCommitTarget)) {
  console.log('⚠️ Pre-commit hook already exists in .git/hooks/');
  console.log('Backing up existing hook...');
  
  const backupPath = `${preCommitTarget}.backup.${Date.now()}`;
  fs.renameSync(preCommitTarget, backupPath);
  console.log(`✅ Existing hook backed up to ${backupPath}`);
}

// Create symlink for pre-commit hook
try {
  console.log('Installing pre-commit hook...');
  
  // On Windows, we need to copy the file instead of creating a symlink
  if (process.platform === 'win32') {
    fs.copyFileSync(preCommitSource, preCommitTarget);
    console.log('✅ Pre-commit hook copied to .git/hooks/');
  } else {
    // Create a relative symlink
    const relativePreCommitSource = path.relative(
      path.dirname(preCommitTarget),
      preCommitSource
    );
    fs.symlinkSync(relativePreCommitSource, preCommitTarget);
    console.log('✅ Pre-commit hook symlink created in .git/hooks/');
  }
} catch (error) {
  console.error(`Error installing pre-commit hook: ${error.message}`);
  console.error('You may need to manually copy the hook to .git/hooks/pre-commit');
  process.exit(1);
}

console.log('\n🎉 Version control system setup complete! 🎉');
console.log('--------------------------------------------');
console.log('The system will now:');
console.log('- Automatically increment the patch version for each commit');
console.log('- Add the version number to commit messages: [v0.0.x]');
console.log('- Display the current version on the Admin Dashboard');
console.log('\nTo manually increment major or minor versions, edit version.json directly.');
