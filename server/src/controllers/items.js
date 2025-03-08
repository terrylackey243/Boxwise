const Item = require('../models/Item');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all items with pagination and filtering
// @route   GET /api/items
// @access  Private
exports.getItems = asyncHandler(async (req, res, next) => {
  // Extract query parameters
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Build query
  const query = { group: req.user.group };
  
  // Add filters if provided
  if (req.query.archived === 'true') {
    query.isArchived = true;
  } else {
    query.isArchived = { $ne: true };
  }
  
  if (req.query.location) {
    query.location = req.query.location;
  }
  
  if (req.query.category) {
    query.category = req.query.category;
  }
  
  if (req.query.label) {
    query.labels = req.query.label;
  }
  
  // Add search if provided
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } },
      { assetId: { $regex: req.query.search, $options: 'i' } },
      { serialNumber: { $regex: req.query.search, $options: 'i' } },
      { modelNumber: { $regex: req.query.search, $options: 'i' } },
      { manufacturer: { $regex: req.query.search, $options: 'i' } },
      { upcCode: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  // Execute query with pagination
  const total = await Item.countDocuments(query);
  
  const items = await Item.find(query)
    .populate('location', 'name')
    .populate('category', 'name')
    .populate('labels', 'name color')
    .sort({ updatedAt: -1 })
    .skip(startIndex)
    .limit(limit);
  
  res.status(200).json({
    success: true,
    count: items.length,
    total,
    data: items
  });
});

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Private
exports.getItem = asyncHandler(async (req, res, next) => {
  const item = await Item.findById(req.params.id)
    .populate('location', 'name')
    .populate('category', 'name')
    .populate('labels', 'name color')
    .populate('createdBy', 'name email');
  
  if (!item) {
    return next(new ErrorResponse(`Item not found with id of ${req.params.id}`, 404));
  }
  
  // Check if item belongs to user's group
  if (item.group.toString() !== req.user.group.toString()) {
    return next(new ErrorResponse(`Not authorized to access this item`, 403));
  }
  
  res.status(200).json({
    success: true,
    data: item
  });
});

// @desc    Create new item
// @route   POST /api/items
// @access  Private
exports.createItem = asyncHandler(async (req, res, next) => {
  // Add user and group to request body
  req.body.createdBy = req.user.id;
  req.body.group = req.user.group;
  
  // Create item
  const item = await Item.create(req.body);
  
  res.status(201).json({
    success: true,
    data: item
  });
});

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private
exports.updateItem = asyncHandler(async (req, res, next) => {
  let item = await Item.findById(req.params.id);
  
  if (!item) {
    return next(new ErrorResponse(`Item not found with id of ${req.params.id}`, 404));
  }
  
  // Check if item belongs to user's group
  if (item.group.toString() !== req.user.group.toString()) {
    return next(new ErrorResponse(`Not authorized to update this item`, 403));
  }
  
  // Add updatedBy field
  req.body.updatedBy = req.user.id;
  req.body.updatedAt = Date.now();
  
  // Update item
  item = await Item.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: item
  });
});

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private
exports.deleteItem = asyncHandler(async (req, res, next) => {
  const item = await Item.findById(req.params.id);
  
  if (!item) {
    return next(new ErrorResponse(`Item not found with id of ${req.params.id}`, 404));
  }
  
  // Check if item belongs to user's group
  if (item.group.toString() !== req.user.group.toString()) {
    return next(new ErrorResponse(`Not authorized to delete this item`, 403));
  }
  
  await item.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Upload attachment for item
// @route   POST /api/items/:id/attachments
// @access  Private
exports.uploadItemAttachment = asyncHandler(async (req, res, next) => {
  const item = await Item.findById(req.params.id);
  
  if (!item) {
    return next(new ErrorResponse(`Item not found with id of ${req.params.id}`, 404));
  }
  
  // Check if item belongs to user's group
  if (item.group.toString() !== req.user.group.toString()) {
    return next(new ErrorResponse(`Not authorized to upload attachments for this item`, 403));
  }
  
  // Check if file is uploaded
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorResponse('Please upload a file', 400));
  }
  
  const file = req.files.file;
  
  // Check file type
  const fileTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
  const mimeType = fileTypes.test(file.mimetype);
  
  if (!mimeType) {
    return next(new ErrorResponse('Please upload a valid file type', 400));
  }
  
  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return next(new ErrorResponse('File size cannot exceed 5MB', 400));
  }
  
  // Create custom filename
  const fileName = `${req.params.id}_${Date.now()}${path.parse(file.name).ext}`;
  
  // Move file to upload directory
  file.mv(`${process.env.FILE_UPLOAD_PATH}/${fileName}`, async (err) => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse('Problem with file upload', 500));
    }
    
    // Get file type
    const fileType = file.mimetype.split('/')[0] === 'image' ? 'image' : 'document';
    
    // Check if this should be the primary photo
    const isPrimary = req.body.isPrimary === 'true';
    
    // If this is set as primary, unset any existing primary photos
    if (isPrimary && fileType === 'image') {
      item.attachments.forEach(attachment => {
        if (attachment.isPrimaryPhoto) {
          attachment.isPrimaryPhoto = false;
        }
      });
    }
    
    // Add attachment to item
    item.attachments.push({
      name: file.name,
      fileType: fileType,
      filePath: fileName,
      uploadDate: Date.now(),
      isPrimaryPhoto: isPrimary && fileType === 'image'
    });
    
    await item.save();
    
    res.status(200).json({
      success: true,
      data: item.attachments[item.attachments.length - 1]
    });
  });
});

// @desc    Quick add item (simplified item creation for mobile)
// @route   POST /api/items/quick-add
// @access  Private
exports.quickAddItem = asyncHandler(async (req, res, next) => {
  // Add user and group to request body
  req.body.createdBy = req.user.id;
  req.body.group = req.user.group;
  
  // Ensure required fields are present
  if (!req.body.name) {
    return next(new ErrorResponse('Please add a name', 400));
  }
  
  if (!req.body.location) {
    return next(new ErrorResponse('Please specify a location', 400));
  }
  
  // Set default values for quick add
  req.body.quantity = req.body.quantity || 1;
  
  // Create item
  const item = await Item.create(req.body);
  
  res.status(201).json({
    success: true,
    data: item
  });
});
