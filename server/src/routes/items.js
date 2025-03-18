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
  quickAddItem,
  getNextAssetId,
  getItemCount
} = require('../controllers/items');

// Import S3 attachment handlers from the new controller
const {
  getPresignedUploadUrl,
  confirmItemAttachment,
  getAttachmentUrl,
  deleteItemAttachment,
  uploadItemAttachment
} = require('../controllers/items.attachments');
const { bulkAddItems } = require('../controllers/bulk');
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

router.route('/bulk')
  .post(protect, restrictViewers, checkSubscriptionLimits, bulkAddItems);

router.route('/next-asset-id')
  .get(protect, getNextAssetId);

router.route('/count')
  .get(protect, getItemCount);

router.route('/upc/:upc')
  .get(protect, searchByUPC);

// S3 Pre-signed URL route for direct upload to S3
router.route('/:id/presigned-upload')
  .get(protect, restrictViewers, getPresignedUploadUrl);

// Attachment routes
router.route('/:id/attachments')
  .post(protect, restrictViewers, confirmItemAttachment);

router.route('/:id/attachments/:attachmentId')
  .delete(protect, restrictViewers, deleteItemAttachment);

router.route('/:id/attachments/:attachmentId/url')
  .get(protect, getAttachmentUrl);

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
