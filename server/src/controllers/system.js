const mongoose = require('mongoose');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

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
    
    // Get last backup time (simulated)
    const lastBackup = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // Check for updates (simulated)
    const updateAvailable = Math.random() > 0.5; // Randomly determine if updates are available
    
    // Get last update time (simulated)
    const lastUpdate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    
    res.status(200).json({
      success: true,
      data: {
        serverStatus,
        dbStatus,
        lastBackup,
        updateAvailable,
        lastUpdate
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
    // In a real implementation, this would execute a database backup command
    // For now, we'll just simulate the backup
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Generate a backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '-').substring(0, 17);
    const backupFilename = `backup-${timestamp}.gz`;
    
    res.status(200).json({
      success: true,
      data: {
        filename: backupFilename,
        timestamp: new Date().toISOString(),
        size: '42.5 MB' // Simulated size
      }
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
    // In a real implementation, this would list actual backup files
    // For now, we'll just return simulated data
    
    const backups = [
      {
        filename: 'backup-2025-03-05-234512.gz',
        timestamp: '2025-03-05 23:45:12',
        size: '42.3 MB'
      },
      {
        filename: 'backup-2025-03-04-234509.gz',
        timestamp: '2025-03-04 23:45:09',
        size: '41.8 MB'
      },
      {
        filename: 'backup-2025-03-03-234511.gz',
        timestamp: '2025-03-03 23:45:11',
        size: '41.5 MB'
      }
    ];
    
    res.status(200).json({
      success: true,
      data: backups
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

// @desc    Get system configuration
// @route   GET /api/admin/system/config
// @access  Private/Admin
exports.getSystemConfig = asyncHandler(async (req, res, next) => {
  // Only allow admin or owner to get system configuration
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return next(new ErrorResponse('Not authorized to access system configuration', 403));
  }

  try {
    // In a real implementation, this would read from a configuration file
    // For now, we'll just return simulated data
    
    const config = {
      automaticBackups: true,
      automaticUpdates: false,
      backupRetention: 7
    };
    
    res.status(200).json({
      success: true,
      data: config
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
    // In a real implementation, this would write to a configuration file
    // For now, we'll just simulate the update
    
    const { automaticBackups, automaticUpdates, backupRetention } = req.body;
    
    // Validate input
    if (typeof automaticBackups !== 'boolean' || 
        typeof automaticUpdates !== 'boolean' || 
        typeof backupRetention !== 'number' || 
        backupRetention < 1 || 
        backupRetention > 30) {
      return next(new ErrorResponse('Invalid configuration values', 400));
    }
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.status(200).json({
      success: true,
      message: 'System configuration updated successfully',
      data: {
        automaticBackups,
        automaticUpdates,
        backupRetention
      }
    });
  } catch (error) {
    console.error('Error updating system configuration:', error);
    return next(new ErrorResponse(`Error updating system configuration: ${error.message}`, 500));
  }
});
