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
const prepareCommitMsgSource = path.join(projectRoot, 'scripts', 'hooks', 'prepare-commit-msg');
const commitMsgSource = path.join(projectRoot, 'scripts', 'hooks', 'commit-msg');
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
const prepareCommitMsgTarget = path.join(gitHooksDir, 'prepare-commit-msg');
const commitMsgTarget = path.join(gitHooksDir, 'commit-msg');

// Make sure the scripts are executable
try {
  console.log('Making scripts executable...');
  execSync(`chmod +x "${preCommitSource}"`);
  execSync(`chmod +x "${prepareCommitMsgSource}"`);
  execSync(`chmod +x "${commitMsgSource}"`);
  execSync(`chmod +x "${incrementVersionScript}"`);
  console.log('✅ Scripts are now executable');
} catch (error) {
  console.error(`Error making scripts executable: ${error.message}`);
  process.exit(1);
}

// Install hooks
const installHook = (sourcePath, targetPath, hookName) => {
  // Check if hook already exists
  if (fs.existsSync(targetPath)) {
    console.log(`⚠️ ${hookName} hook already exists in .git/hooks/`);
    console.log('Backing up existing hook...');
    
    const backupPath = `${targetPath}.backup.${Date.now()}`;
    fs.renameSync(targetPath, backupPath);
    console.log(`✅ Existing ${hookName} hook backed up to ${backupPath}`);
  }

  // Create symlink or copy file
  try {
    console.log(`Installing ${hookName} hook...`);
    
    // On Windows, we need to copy the file instead of creating a symlink
    if (process.platform === 'win32') {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✅ ${hookName} hook copied to .git/hooks/`);
    } else {
      // Create a relative symlink
      const relativeSource = path.relative(
        path.dirname(targetPath),
        sourcePath
      );
      fs.symlinkSync(relativeSource, targetPath);
      console.log(`✅ ${hookName} hook symlink created in .git/hooks/`);
    }
  } catch (error) {
    console.error(`Error installing ${hookName} hook: ${error.message}`);
    console.error(`You may need to manually copy the hook to .git/hooks/${hookName}`);
    return false;
  }
  return true;
};

// Install all hooks
const preCommitSuccess = installHook(preCommitSource, preCommitTarget, 'pre-commit');
const prepareCommitMsgSuccess = installHook(prepareCommitMsgSource, prepareCommitMsgTarget, 'prepare-commit-msg');
const commitMsgSuccess = installHook(commitMsgSource, commitMsgTarget, 'commit-msg');

if (!preCommitSuccess || !prepareCommitMsgSuccess || !commitMsgSuccess) {
  process.exit(1);
}

console.log('\n🎉 Version control system setup complete! 🎉');
console.log('--------------------------------------------');
console.log('The system will now:');
console.log('- Automatically increment the patch version for each commit');
console.log('- Add the version number to commit messages: [v0.0.x]');
console.log('- Display the current version on the Admin Dashboard');
console.log('\nTo manually increment major or minor versions, edit version.json directly.');
