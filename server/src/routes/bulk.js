const express = require('express');
const { bulkAdd, validateBulkAdd } = require('../controllers/bulk');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Bulk add routes for different entity types
router.post('/items/bulk', bulkAdd);
router.post('/locations/bulk', bulkAdd);
router.post('/labels/bulk', bulkAdd);
router.post('/categories/bulk', bulkAdd);

// Validation routes for different entity types
router.post('/items/validate', validateBulkAdd);
router.post('/locations/validate', validateBulkAdd);
router.post('/labels/validate', validateBulkAdd);
router.post('/categories/validate', validateBulkAdd);

module.exports = router;
