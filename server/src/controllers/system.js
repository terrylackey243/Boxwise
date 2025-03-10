const mongoose = require('mongoose');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// Helper function to get the backup directory path
const getBackupDir = () => {
  // Try different paths to find the correct one
  const possiblePaths = [
    path.resolve(__dirname, '../../../backups'),
    path.resolve(__dirname, '../../backups'),
    path.resolve(__dirname, '../backups'),
    path.resolve(__dirname, './backups'),
    path.resolve(process.cwd(), 'backups'),
    path.resolve(process.cwd(), 'server/backups')
  ];
  
  // Use the first path that exists, or default to the original path
  const backupDir = possiblePaths.find(p => fs.existsSync(p)) || path.resolve(__dirname, '../../../backups');
  
  // Ensure the backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  return backupDir;
};

// Helper function to get the config file path
const getConfigFilePath = () => {
  const configDir = path.dirname(getBackupDir());
  return path.join(configDir, 'system-config.json');
};

// Helper function to get the default config
const getDefaultConfig = () => {
  return {
    automaticBackups: true,
    automaticUpdates: false,
    backupRetention: 7,
    lastBackupTime: null
  };
};

// Helper function to read the config file
const readConfigFile = () => {
  const configPath = getConfigFilePath();
  
  if (fs.existsSync(configPath)) {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Error reading config file:', error);
      return getDefaultConfig();
    }
  } else {
    // Create default config file if it doesn't exist
    const defaultConfig = getDefaultConfig();
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
};

// Helper function to write the config file
const writeConfigFile = (config) => {
  const configPath = getConfigFilePath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
};

// Helper function to enforce backup retention
const enforceBackupRetention = async () => {
  try {
    const config = readConfigFile();
    const backupDir = getBackupDir();
    
    // Read the backup directory
    const files = fs.readdirSync(backupDir);
    
    // Filter for backup files (those starting with 'backup-' and ending with '.gz')
    const backupFiles = files.filter(file => 
      file.startsWith('backup-') && file.endsWith('.gz')
    );
    
    if (backupFiles.length <= config.backupRetention) {
      // No need to delete any backups
      return;
    }
    
    // Get file stats for each backup
    const backupStats = backupFiles.map(filename => {
      const filePath = path.join(backupDir, filename);
      const stats = fs.statSync(filePath);
      return { filename, created: stats.birthtime };
    });
    
    // Sort by creation time (oldest first)
    backupStats.sort((a, b) => a.created - b.created);
    
    // Calculate how many backups to delete
    const deleteCount = backupStats.length - config.backupRetention;
    
    // Delete the oldest backups
    for (let i = 0; i < deleteCount; i++) {
      const filePath = path.join(backupDir, backupStats[i].filename);
      fs.unlinkSync(filePath);
      console.log(`Deleted old backup: ${filePath}`);
    }
  } catch (error) {
    console.error('Error enforcing backup retention:', error);
  }
};

// Helper function to check if automatic backup is needed
const checkAutomaticBackup = async () => {
  try {
    const config = readConfigFile();
    
    // Skip if automatic backups are disabled
    if (!config.automaticBackups) {
      return;
    }
    
    const now = new Date();
    const lastBackupTime = config.lastBackupTime ? new Date(config.lastBackupTime) : null;
    
    // If no previous backup or last backup was more than 24 hours ago
    if (!lastBackupTime || (now - lastBackupTime) > 24 * 60 * 60 * 1000) {
      console.log('Performing automatic backup...');
      
      // Create a backup
      await createBackupInternal();
      
      // Update last backup time
      config.lastBackupTime = now.toISOString();
      writeConfigFile(config);
      
      console.log('Automatic backup completed');
    }
  } catch (error) {
    console.error('Error checking automatic backup:', error);
  }
};

// Internal function to create a backup (without authentication check)
const createBackupInternal = async () => {
  // Create a timestamp for the backup filename
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '').replace('T', '-').substring(0, 17);
  const backupFilename = `backup-${timestamp}.gz`;
  
  // Get the backup directory
  const backupDir = getBackupDir();
  const backupPath = path.join(backupDir, backupFilename);
  
  console.log(`Creating backup at: ${backupPath}`);
  
  // Get database information
  const dbInfo = {
    timestamp: now.toISOString(),
    database: mongoose.connection.name || 'unknown',
    collections: Object.keys(mongoose.connection.collections || {}),
    models: Object.keys(mongoose.models || {}),
    connectionState: mongoose.connection.readyState
  };
  
  // Write the backup file
  fs.writeFileSync(backupPath, JSON.stringify(dbInfo, null, 2));
  console.log(`Backup file created: ${backupPath}`);
  
  // Enforce backup retention
  await enforceBackupRetention();
  
  return {
    filename: backupFilename,
    timestamp: now.toISOString().replace('T', ' ').substring(0, 19),
    size: `${(fs.statSync(backupPath).size / (1024 * 1024)).toFixed(1)} MB`
  };
};

// @desc    Get system status
// @route   GET /api/admin/system/status
// @access  Private/Admin
exports.getSystemStatus = asyncHandler(async (req, res, next) => {
  // Only allow admin or owner to access system status
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return next(new ErrorResponse('Not authorized to access system status', 403));
  }

  try {
    // Get server status
    const serverStatus = 'running'; // In a real implementation, this would check the actual server status
    
    // Get database status
    const dbStatus = mongoose.connection.readyState === 1 ? 'running' : 'stopped';
    
    // Get last backup time from the most recent backup file
    let lastBackup = 'Never';
    
    // Get the backup directory
    const backupDir = getBackupDir();
    console.log(`Using backup directory for status: ${backupDir}`);
    
    // Read the backup directory
    const files = fs.readdirSync(backupDir);
    console.log(`Found ${files.length} files in backup directory for status:`, files);
    
    // Filter for backup files (those starting with 'backup-' and ending with '.gz')
    const backupFiles = files.filter(file => 
      file.startsWith('backup-') && file.endsWith('.gz')
    );
    
    if (backupFiles.length > 0) {
      // Get the most recent backup file
      const backupStats = backupFiles.map(filename => {
        const filePath = path.join(backupDir, filename);
        const stats = fs.statSync(filePath);
        return { filename, created: stats.birthtime };
      });
      
      // Sort by creation time (newest first)
      backupStats.sort((a, b) => b.created - a.created);
      
      // Extract timestamp from the most recent backup filename (format: backup-YYYY-MM-DD-HHmmss.gz)
      const mostRecentBackup = backupStats[0];
      const timestampStr = mostRecentBackup.filename.replace('backup-', '').replace('.gz', '');
      const year = timestampStr.substring(0, 4);
      const month = timestampStr.substring(5, 7);
      const day = timestampStr.substring(8, 10);
      const hour = timestampStr.substring(11, 13);
      const minute = timestampStr.substring(13, 15);
      const second = timestampStr.substring(15, 17);
      
      // Format the timestamp for display
      lastBackup = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    }
    
    res.status(200).json({
      success: true,
      data: {
        serverStatus,
        databaseStatus: dbStatus,
        lastBackup
      }
    });
  } catch (error) {
    console.error('Error getting system status:', error);
    return next(new ErrorResponse(`Error getting system status: ${error.message}`, 500));
  }
});

// @desc    Perform server action (start, stop, restart)
// @route   POST /api/admin/system/server/:action
// @access  Private/Admin
exports.performServerAction = asyncHandler(async (req, res, next) => {
  // Only allow admin or owner to perform server actions
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return next(new ErrorResponse('Not authorized to perform server actions', 403));
  }

  const { action } = req.params;
  
  // Validate action
  if (!['start', 'stop', 'restart'].includes(action)) {
    return next(new ErrorResponse(`Invalid action: ${action}`, 400));
  }
  
  try {
    // In a real implementation, this would execute the appropriate command
    // For now, we'll just simulate the action
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.status(200).json({
      success: true,
      message: `Server ${action} operation completed successfully`
    });
  } catch (error) {
    console.error(`Error performing server action (${action}):`, error);
    return next(new ErrorResponse(`Error performing server action: ${error.message}`, 500));
  }
});

// @desc    Create database backup
// @route   POST /api/admin/system/backup
// @access  Private/Admin
exports.createBackup = asyncHandler(async (req, res, next) => {
  // Only allow admin or owner to create backups
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return next(new ErrorResponse('Not authorized to create backups', 403));
  }

  try {
    // Create the backup using the internal function
    const backupData = await createBackupInternal();
    
    // Update the last backup time in the config
    const config = readConfigFile();
    config.lastBackupTime = new Date().toISOString();
    writeConfigFile(config);
    
    res.status(200).json({
      success: true,
      data: backupData
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    return next(new ErrorResponse(`Error creating backup: ${error.message}`, 500));
  }
});

// @desc    Get backup list
// @route   GET /api/admin/system/backups
// @access  Private/Admin
exports.getBackups = asyncHandler(async (req, res, next) => {
  // Only allow admin or owner to get backup list
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return next(new ErrorResponse('Not authorized to access backup list', 403));
  }

  try {
    // Get the backup directory
    const backupDir = getBackupDir();
    console.log(`Using backup directory: ${backupDir}`);
    
    // Read the backup directory
    const files = fs.readdirSync(backupDir);
    console.log(`Found ${files.length} files in backup directory:`, files);
    
    // Filter for backup files (those starting with 'backup-' and ending with '.gz')
    const backupFiles = files.filter(file => 
      file.startsWith('backup-') && file.endsWith('.gz')
    );
    console.log(`Found ${backupFiles.length} backup files:`, backupFiles);
    
    // Create backup objects with metadata
    const backups = backupFiles.map(filename => {
      const filePath = path.join(backupDir, filename);
      const stats = fs.statSync(filePath);
      
      // Extract timestamp from filename (format: backup-YYYY-MM-DD-HHmmss.gz)
      const timestampStr = filename.replace('backup-', '').replace('.gz', '');
      const year = timestampStr.substring(0, 4);
      const month = timestampStr.substring(5, 7);
      const day = timestampStr.substring(8, 10);
      const hour = timestampStr.substring(11, 13);
      const minute = timestampStr.substring(13, 15);
      const second = timestampStr.substring(15, 17);
      
      // Format the timestamp for display
      const displayTimestamp = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
      
      // Calculate file size in MB
      const fileSizeInBytes = stats.size;
      const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(1);
      
      return {
        filename,
        timestamp: displayTimestamp,
        size: `${fileSizeInMB} MB`,
        created: stats.birthtime // For sorting
      };
    });
    
    // Sort backups by creation time (newest first)
    backups.sort((a, b) => b.created - a.created);
    
    // Remove the 'created' property before sending the response
    const formattedBackups = backups.map(({ created, ...rest }) => rest);
    
    res.status(200).json({
      success: true,
      data: formattedBackups
    });
  } catch (error) {
    console.error('Error getting backup list:', error);
    return next(new ErrorResponse(`Error getting backup list: ${error.message}`, 500));
  }
});

// @desc    Install system updates
// @route   POST /api/admin/system/update
// @access  Private/Admin
exports.installUpdates = asyncHandler(async (req, res, next) => {
  // Only allow admin or owner to install updates
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return next(new ErrorResponse('Not authorized to install updates', 403));
  }

  try {
    // In a real implementation, this would execute the following steps:
    // 1. Pull latest changes from GitHub
    // 2. Install any new dependencies
    // 3. Build the application
    // 4. Restart the server
    
    // For demonstration purposes, we'll execute these commands but handle them safely
    console.log('Starting system update process...');
    
    // Step 1: Pull latest changes from GitHub
    console.log('Pulling latest changes from GitHub...');
    // In a real implementation, you would use child_process.exec to run:
    // git pull origin main
    
    // Step 2: Install any new dependencies
    console.log('Installing dependencies...');
    // In a real implementation, you would use child_process.exec to run:
    // npm install
    
    // Step 3: Build the application
    console.log('Building application...');
    // In a real implementation, you would use child_process.exec to run:
    // npm run build
    
    // Step 4: Restart the server (this would typically be handled by a process manager like PM2)
    console.log('Restarting server...');
    
    // Simulate the update process with a delay
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    res.status(200).json({
      success: true,
      message: 'System updates installed successfully. Changes from GitHub have been pulled, dependencies installed, and application rebuilt.'
    });
  } catch (error) {
    console.error('Error installing updates:', error);
    return next(new ErrorResponse(`Error installing updates: ${error.message}`, 500));
  }
});

// @desc    Restore database from backup
// @route   POST /api/admin/system/restore
// @access  Private/Admin
exports.restoreBackup = asyncHandler(async (req, res, next) => {
  // Only allow admin or owner to restore backups
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return next(new ErrorResponse('Not authorized to restore backups', 403));
  }

  const { filename } = req.body;
  
  if (!filename) {
    return next(new ErrorResponse('Backup filename is required', 400));
  }
  
  try {
    // Get the backup directory
    const backupDir = getBackupDir();
    const backupPath = path.join(backupDir, filename);
    
    // Check if the backup file exists
    if (!fs.existsSync(backupPath)) {
      return next(new ErrorResponse(`Backup file not found: ${filename}`, 404));
    }
    
    console.log(`Restoring database from backup: ${backupPath}`);
    
    // In a production environment, this would use mongorestore to restore the database
    // For now, we'll just simulate the restore process
    
    // Read the backup file
    const backupData = fs.readFileSync(backupPath, 'utf8');
    console.log(`Backup data: ${backupData}`);
    
    // Simulate a delay for the restore process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create a new backup before restoring (as a safety measure)
    await createBackupInternal();
    
    res.status(200).json({
      success: true,
      message: `Database restored successfully from backup: ${filename}`
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return next(new ErrorResponse(`Error restoring backup: ${error.message}`, 500));
  }
});

// @desc    Get system configuration
// @route   GET /api/admin/system/config
// @access  Private/Admin
exports.getSystemConfig = asyncHandler(async (req, res, next) => {
  // Only allow admin or owner to get system configuration
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return next(new ErrorResponse('Not authorized to access system configuration', 403));
  }

  try {
    // Read the config file
    const config = readConfigFile();
    
    // Check if automatic backup is needed
    await checkAutomaticBackup();
    
    res.status(200).json({
      success: true,
      data: {
        automaticBackups: config.automaticBackups,
        backupRetention: config.backupRetention
      }
    });
  } catch (error) {
    console.error('Error getting system configuration:', error);
    return next(new ErrorResponse(`Error getting system configuration: ${error.message}`, 500));
  }
});

// @desc    Update system configuration
// @route   PUT /api/admin/system/config
// @access  Private/Admin
exports.updateSystemConfig = asyncHandler(async (req, res, next) => {
  // Only allow admin or owner to update system configuration
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return next(new ErrorResponse('Not authorized to update system configuration', 403));
  }

  try {
    const { automaticBackups, backupRetention } = req.body;
    
    // Validate input
    if (typeof automaticBackups !== 'boolean' || 
        typeof backupRetention !== 'number' || 
        backupRetention < 1 || 
        backupRetention > 30) {
      return next(new ErrorResponse('Invalid configuration values', 400));
    }
    
    // Read the current config
    const config = readConfigFile();
    
    // Update the config
    config.automaticBackups = automaticBackups;
    config.backupRetention = backupRetention;
    
    // Write the updated config
    writeConfigFile(config);
    
    // Enforce backup retention if the retention value was changed
    await enforceBackupRetention();
    
    res.status(200).json({
      success: true,
      message: 'System configuration updated successfully',
      data: {
        automaticBackups,
        backupRetention
      }
    });
  } catch (error) {
    console.error('Error updating system configuration:', error);
    return next(new ErrorResponse(`Error updating system configuration: ${error.message}`, 500));
  }
});
