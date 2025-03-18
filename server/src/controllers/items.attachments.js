const mongoose = require('mongoose');
const Item = require('../models/Item');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const s3Service = require('../utils/s3Service');

// Constants for attachment limitations
const MAX_ATTACHMENTS_PER_ITEM = 5;
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || 5000000; // Default to 5MB if not specified in env

// Allowed file types
const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  
  // Documents
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain', // .txt
  'text/csv', // .csv
];

// @desc    Generate a presigned URL for direct S3 upload
// @route   GET /api/items/:id/presigned-upload
// @access  Private
exports.getPresignedUploadUrl = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { fileName, fileType, isPrimaryPhoto, fileSize } = req.query;
  
  if (!fileName || !fileType) {
    return next(new ErrorResponse('Please provide fileName and fileType', 400));
  }
  
  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(fileType)) {
    return next(
      new ErrorResponse(
        `File type '${fileType}' is not allowed. Only common document and image formats are supported.`,
        400
      )
    );
  }
  
  // Validate file size if provided
  if (fileSize && parseInt(fileSize) > MAX_FILE_SIZE) {
    return next(
      new ErrorResponse(
        `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE / 1000000}MB`,
        400
      )
    );
  }
  
  try {
    // Check if item exists and belongs to user's group
    const item = await Item.findById(id);
    
    if (!item) {
      return next(new ErrorResponse(`Item not found with id of ${id}`, 404));
    }
    
    if (item.group.toString() !== req.user.group.toString()) {
      return next(new ErrorResponse(`Not authorized to access this item`, 403));
    }
    
    // Check if maximum number of attachments has been reached
    if (item.attachments && item.attachments.length >= MAX_ATTACHMENTS_PER_ITEM) {
      return next(
        new ErrorResponse(
          `Maximum number of attachments (${MAX_ATTACHMENTS_PER_ITEM}) reached for this item`,
          400
        )
      );
    }
    
    // Generate a presigned URL for S3 upload
    const { uploadUrl, fileKey } = await s3Service.generatePresignedUploadUrl(
      fileName,
      fileType,
      'item-attachments',
      req.user.group.toString()
    );
    
    // Return the URL and metadata to the client
    res.status(200).json({
      success: true,
      data: {
        uploadUrl,
        fileKey,
        fileName,
        fileType,
        isPrimaryPhoto: isPrimaryPhoto === 'true'
      }
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return next(new ErrorResponse('Error generating upload URL', 500));
  }
});

// @desc    Confirm and save file upload to item
// @route   POST /api/items/:id/attachments
// @access  Private
exports.confirmItemAttachment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { fileKey, fileName, fileType, isPrimaryPhoto } = req.body;
  
  if (!fileKey || !fileName || !fileType) {
    return next(new ErrorResponse('Please provide file details', 400));
  }
  
  try {
    // Verify item exists and belongs to user's group
    let item = await Item.findById(id);
    
    if (!item) {
      return next(new ErrorResponse(`Item not found with id of ${id}`, 404));
    }
    
    if (item.group.toString() !== req.user.group.toString()) {
      return next(new ErrorResponse(`Not authorized to update this item`, 403));
    }
    
    // Check if file was actually uploaded to S3
    const exists = await s3Service.fileExists(fileKey);
    if (!exists) {
      return next(new ErrorResponse('File was not uploaded successfully', 400));
    }
    
    // Prepare attachment object
    const newAttachment = {
      name: fileName,
      fileType,
      filePath: fileKey, // Store S3 key as the file path
      uploadDate: Date.now(),
      isPrimaryPhoto: isPrimaryPhoto === true
    };
    
    // If this is a primary photo, update existing attachments
    if (newAttachment.isPrimaryPhoto) {
      if (item.attachments && item.attachments.length > 0) {
        item.attachments.forEach(attachment => {
          if (attachment.isPrimaryPhoto) {
            attachment.isPrimaryPhoto = false;
          }
        });
      }
    }
    
    // Add new attachment to the item
    if (!item.attachments) {
      item.attachments = [];
    }
    
    item.attachments.push(newAttachment);
    item.updatedBy = req.user.id;
    item.updatedAt = Date.now();
    
    await item.save();
    
    // Generate a temporary download URL for immediate use
    const downloadUrl = await s3Service.generatePresignedDownloadUrl(fileKey);
    
    // Return success with item data and download URL
    res.status(200).json({
      success: true,
      data: {
        item,
        downloadUrl,
        attachment: newAttachment
      }
    });
  } catch (error) {
    console.error('Error confirming attachment:', error);
    return next(new ErrorResponse(`Error saving attachment: ${error.message}`, 500));
  }
});

// @desc    Get presigned URL for viewing/downloading an attachment
// @route   GET /api/items/:id/attachments/:attachmentId/url
// @access  Private
exports.getAttachmentUrl = asyncHandler(async (req, res, next) => {
  const { id, attachmentId } = req.params;
  const { forceDownload } = req.query; // Check if download is explicitly requested
  
  try {
    // Find the item
    const item = await Item.findById(id);
    
    if (!item) {
      return next(new ErrorResponse(`Item not found with id of ${id}`, 404));
    }
    
    // Check if item belongs to user's group
    if (item.group.toString() !== req.user.group.toString()) {
      return next(new ErrorResponse(`Not authorized to access this item`, 403));
    }
    
    // Find the attachment
    const attachment = item.attachments.id(attachmentId);
    
    if (!attachment) {
      return next(new ErrorResponse(`Attachment not found with id of ${attachmentId}`, 404));
    }
    
    // Get the file name for Content-Disposition header
    const fileName = attachment.name || attachment.filename || 'attachment';
    
    let downloadUrl;
    
    if (forceDownload === 'true') {
      // For force download, generate URL with Content-Disposition header
      downloadUrl = await s3Service.generatePresignedDownloadUrl(
        attachment.filePath,
        3600,
        `attachment; filename="${encodeURIComponent(fileName)}"`
      );
    } else {
      // Regular download URL without forcing download
      downloadUrl = await s3Service.generatePresignedDownloadUrl(attachment.filePath);
    }
    
    // Check if this is a browser request by examining the Accept header
    // If it includes text/html, it's likely a browser request (view button click)
    const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
    
    if (acceptsHtml) {
      // Redirect the browser directly to the S3 URL
      return res.redirect(downloadUrl);
    }
    
    // For API requests, return JSON as before
    res.status(200).json({
      success: true,
      data: {
        downloadUrl,
        attachment
      }
    });
  } catch (error) {
    console.error('Error generating attachment URL:', error);
    return next(new ErrorResponse(`Error generating URL: ${error.message}`, 500));
  }
});

// @desc    Delete attachment from item
// @route   DELETE /api/items/:id/attachments/:attachmentId
// @access  Private
exports.deleteItemAttachment = asyncHandler(async (req, res, next) => {
  const { id, attachmentId } = req.params;
  
  try {
    // Find the item
    let item = await Item.findById(id);
    
    if (!item) {
      return next(new ErrorResponse(`Item not found with id of ${id}`, 404));
    }
    
    // Check if item belongs to user's group
    if (item.group.toString() !== req.user.group.toString()) {
      return next(new ErrorResponse(`Not authorized to update this item`, 403));
    }
    
    // Find the attachment
    const attachment = item.attachments.id(attachmentId);
    
    if (!attachment) {
      return next(new ErrorResponse(`Attachment not found with id of ${attachmentId}`, 404));
    }
    
    // Delete file from S3
    await s3Service.deleteFile(attachment.filePath);
    
    // Remove the attachment from the item
    item.attachments.pull(attachmentId);
    item.updatedBy = req.user.id;
    item.updatedAt = Date.now();
    
    await item.save();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return next(new ErrorResponse(`Error deleting attachment: ${error.message}`, 500));
  }
});

// This is a fallback function to support the old method
// It informs users to use the new method with presigned URLs
exports.uploadItemAttachment = asyncHandler(async (req, res, next) => {
  return next(
    new ErrorResponse(
      'Direct file uploads are no longer supported. Please use the new S3 upload method with presigned URLs.',
      400
    )
  );
});
