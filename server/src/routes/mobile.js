const express = require('express');
const router = express.Router();

// Import middleware
const { protect, checkSubscriptionLimits } = require('../middleware/auth');

// Import controllers
const { 
  quickAddItem, 
  uploadItemAttachment,
  searchByUPC
} = require('../controllers/items');

// Define routes
router.route('/items/quick-add')
  .post(protect, checkSubscriptionLimits, quickAddItem);

router.route('/items/:id/attachments')
  .post(protect, uploadItemAttachment);

router.route('/upc/:upc')
  .get(protect, searchByUPC);

module.exports = router;
