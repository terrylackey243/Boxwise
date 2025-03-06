const express = require('express');
const router = express.Router();

// Import middleware
const { protect, authorize } = require('../middleware/auth');

// Import controllers
const {
  getSystemStatus,
  performServerAction,
  createBackup,
  getBackups,
  installUpdates,
  getSystemConfig,
  updateSystemConfig
} = require('../controllers/system');

// System status routes
router.get('/status', protect, authorize('admin', 'owner'), getSystemStatus);

// Server action routes
router.post('/server/:action', protect, authorize('admin', 'owner'), performServerAction);

// Backup routes
router.post('/backup', protect, authorize('admin', 'owner'), createBackup);
router.get('/backups', protect, authorize('admin', 'owner'), getBackups);

// Update routes
router.post('/update', protect, authorize('admin', 'owner'), installUpdates);

// Configuration routes
router.get('/config', protect, authorize('admin', 'owner'), getSystemConfig);
router.put('/config', protect, authorize('admin', 'owner'), updateSystemConfig);

module.exports = router;
