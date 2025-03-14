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
  deleteItemAttachment,
  quickAddItem,
  getNextAssetId,
  getItemCount
} = require('../controllers/items');
const Item = require('../models/Item');

const router = express.Router();

// Import middleware
const { protect, checkSubscriptionLimits } = require('../middleware/auth');
const { restrictViewers } = require('../middleware/viewerRestriction');

// Define routes
router.route('/')
  .get(protect, getItems)
  .post(protect, restrictViewers, checkSubscriptionLimits, createItem);


router.route('/quick-add')
  .post(protect, restrictViewers, checkSubscriptionLimits, quickAddItem);

router.route('/next-asset-id')
  .get(protect, getNextAssetId);

router.route('/count')
  .get(protect, getItemCount);

router.route('/upc/:upc')
  .get(protect, searchByUPC);

router.route('/:id/attachments')
  .post(protect, restrictViewers, uploadItemAttachment);

router.route('/:id/attachments/:attachmentId')
  .delete(protect, restrictViewers, deleteItemAttachment);

router.route('/:id/qrcode')
  .get(protect, generateQRCode);

// Uncomment these routes to enable loan and return functionality
router.route('/:id/loan')
  .post(protect, restrictViewers, loanItem);

router.route('/:id/return')
  .post(protect, restrictViewers, returnItem);

router.route('/:id')
  .get(protect, getItem)
  .put(protect, restrictViewers, updateItem)
  .delete(protect, restrictViewers, deleteItem);

module.exports = router;
