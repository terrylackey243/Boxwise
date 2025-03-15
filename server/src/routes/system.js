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
  restoreBackup,
  getSystemConfig,
  updateSystemConfig,
  updateVersion
} = require('../controllers/system');

// System status routes
router.get('/status', protect, authorize('admin', 'owner'), getSystemStatus);

// Server action routes
router.post('/server/:action', protect, authorize('admin', 'owner'), performServerAction);

// Backup routes
router.post('/backup', protect, authorize('admin', 'owner'), createBackup);
router.get('/backups', protect, authorize('admin', 'owner'), getBackups);
router.post('/restore', protect, authorize('admin', 'owner'), restoreBackup);

// Update routes are removed as render.com applies changes automatically

// Configuration routes
router.get('/config', protect, authorize('admin', 'owner'), getSystemConfig);
router.put('/config', protect, authorize('admin', 'owner'), updateSystemConfig);

// Version control routes
router.put('/version', protect, authorize('admin', 'owner'), updateVersion);

module.exports = router;
