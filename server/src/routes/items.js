const express = require('express');
const {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  generateQRCode,
  searchByUPC,
  loanItem,
  returnItem,
  uploadItemAttachment,
  quickAddItem,
  getNextAssetId
} = require('../controllers/items');
const Item = require('../models/Item');

const router = express.Router();

// Import middleware
const { protect, checkSubscriptionLimits } = require('../middleware/auth');

// Define routes
router.route('/')
  .get(protect, getItems)
  .post(protect, checkSubscriptionLimits, createItem);


router.route('/quick-add')
  .post(protect, checkSubscriptionLimits, quickAddItem);

router.route('/next-asset-id')
  .get(protect, getNextAssetId);

router.route('/count')
  .get(protect, async (req, res) => {
    try {
      // Get the user's group
      const groupId = req.user.group;
      
      // Count items for the user's group
      const count = await Item.countDocuments({ group: groupId });
      
      res.status(200).json({
        success: true,
        count
      });
    } catch (err) {
      console.error('Error counting items:', err);
      res.status(500).json({
        success: false,
        message: 'Error counting items'
      });
    }
  });

router.route('/upc/:upc')
  .get(protect, searchByUPC);

router.route('/:id/attachments')
  .post(protect, uploadItemAttachment);

router.route('/:id/qrcode')
  .get(protect, generateQRCode);

// Uncomment these routes to enable loan and return functionality
router.route('/:id/loan')
  .post(protect, loanItem);

router.route('/:id/return')
  .post(protect, returnItem);

router.route('/:id')
  .get(protect, getItem)
  .put(protect, updateItem)
  .delete(protect, deleteItem);

module.exports = router;
