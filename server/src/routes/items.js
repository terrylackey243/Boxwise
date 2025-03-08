const express = require('express');
const {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  importItems,
  exportItems,
  generateQRCode,
  searchByUPC,
  loanItem,
  returnItem,
  uploadItemAttachment,
  quickAddItem
} = require('../controllers/items');

const router = express.Router();

// Import middleware
const { protect, checkSubscriptionLimits } = require('../middleware/auth');

// Define routes
router.route('/')
  .get(protect, getItems)
  .post(protect, checkSubscriptionLimits, createItem);

router.route('/import')
  .post(protect, checkSubscriptionLimits, importItems);

router.route('/export')
  .get(protect, exportItems);

router.route('/quick-add')
  .post(protect, checkSubscriptionLimits, quickAddItem);

router.route('/upc/:upc')
  .get(protect, searchByUPC);

router.route('/:id/attachments')
  .post(protect, uploadItemAttachment);

router.route('/:id/qrcode')
  .get(protect, generateQRCode);

// These routes are now handled by the mobile API
// router.route('/:id/loan')
//   .post(protect, loanItem);

// router.route('/:id/return')
//   .post(protect, returnItem);

router.route('/:id')
  .get(protect, getItem)
  .put(protect, updateItem)
  .delete(protect, deleteItem);

module.exports = router;
