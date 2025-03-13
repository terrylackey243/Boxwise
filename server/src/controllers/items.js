const mongoose = require('mongoose');
const Item = require('../models/Item');
const Location = require('../models/Location');
const Category = require('../models/Category');
const Label = require('../models/Label');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const path = require('path');
const axios = require('axios');

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
  
  // Add search if provided - Google-like search (matches any combination of words)
  if (req.query.search) {
    const searchTerms = req.query.search.trim().split(/\s+/);
    
    // Create an array of conditions where each term must match at least one field
    const searchConditions = searchTerms.map(term => ({
      $or: [
        { name: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { assetId: { $regex: term, $options: 'i' } },
        { serialNumber: { $regex: term, $options: 'i' } },
        { modelNumber: { $regex: term, $options: 'i' } },
        { manufacturer: { $regex: term, $options: 'i' } },
        { upcCode: { $regex: term, $options: 'i' } },
        { 'loanDetails.loanedTo': { $regex: term, $options: 'i' } }
      ]
    }));
    
    // Item must match all terms (each term can match any field)
    if (searchConditions.length > 0) {
      query.$and = searchConditions;
    }
  }
  
  // Execute query with pagination
  const total = await Item.countDocuments(query);
  
  // Determine sort field and order
  let sortOptions = {};
  const sortField = req.query.sort || 'updatedAt';
  const sortOrder = req.query.order === 'desc' ? -1 : 1;
  
  // Handle special sort cases
  if (sortField === 'location') {
    // For location sorting, we'll need to do a lookup and sort by location name
    sortOptions = { 'location.name': sortOrder };
  } else if (sortField === 'category') {
    // For category sorting, we'll need to do a lookup and sort by category name
    sortOptions = { 'category.name': sortOrder };
  } else {
    // For regular fields, sort directly
    sortOptions[sortField] = sortOrder;
  }
  
  // Use projection to limit returned fields for better performance
  // Only select fields that are needed for the items list view
  const items = await Item.find(query)
    .select('name description quantity assetId location category labels isArchived updatedAt createdAt loanDetails')
    .populate('location', 'name')
    .populate('category', 'name')
    .populate('labels', 'name color')
    .sort(sortOptions)
    .skip(startIndex)
    .limit(limit);
  
  // Disable caching for items to ensure fresh data is always returned
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  
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
  
  // Disable caching for individual items to ensure fresh data
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  
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

// @desc    Get count of all items (for optimization)
// @route   GET /api/items/count
// @access  Private
exports.getItemCount = asyncHandler(async (req, res, next) => {
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
  
  // Get count without retrieving documents
  const count = await Item.countDocuments(query);
  
  res.status(200).json({
    success: true,
    count
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


// @desc    Generate QR code for item
// @route   GET /api/items/:id/qrcode
// @access  Private
exports.generateQRCode = asyncHandler(async (req, res, next) => {
  const item = await Item.findById(req.params.id);
  
  if (!item) {
    return next(new ErrorResponse(`Item not found with id of ${req.params.id}`, 404));
  }
  
  // Check if item belongs to user's group
  if (item.group.toString() !== req.user.group.toString()) {
    return next(new ErrorResponse(`Not authorized to access this item`, 403));
  }
  
  // Simplified implementation
  res.status(200).json({
    success: true,
    message: 'QR code generation is not fully implemented in this demo',
    data: {
      itemId: item._id,
      assetId: item.assetId
    }
  });
});

// @desc    Get next available asset ID
// @route   GET /api/items/next-asset-id
// @access  Private
exports.getNextAssetId = asyncHandler(async (req, res, next) => {
  try {
    // Find the item with the highest asset ID for this group
    const highestItem = await Item.findOne({ 
      group: req.user.group,
      assetId: { $exists: true, $ne: null, $ne: '' }
    }).sort({ assetId: -1 });
    
    let nextAssetId = 'A0001'; // Default starting asset ID
    
    if (highestItem && highestItem.assetId) {
      // Extract the numeric part of the asset ID
      const assetIdMatch = highestItem.assetId.match(/^([A-Z]*)(\d+)$/);
      
      if (assetIdMatch) {
        const prefix = assetIdMatch[1] || 'A';
        const currentNumber = parseInt(assetIdMatch[2], 10);
        
        // Increment the number and pad with zeros
        const nextNumber = currentNumber + 1;
        const paddedNumber = nextNumber.toString().padStart(4, '0');
        
        nextAssetId = `${prefix}${paddedNumber}`;
      }
    }
    
    res.status(200).json({
      success: true,
      data: nextAssetId
    });
  } catch (err) {
    console.error('Error getting next asset ID:', err);
    return next(new ErrorResponse('Error generating next asset ID', 500));
  }
});

// @desc    Search for item by UPC code
// @route   GET /api/items/upc/:upc
// @access  Private
exports.searchByUPC = asyncHandler(async (req, res, next) => {
  const upcCode = req.params.upc;
  
  if (!upcCode) {
    return next(new ErrorResponse('Please provide a UPC code', 400));
  }
  
  try {
    // First check if we have this item in our database
    const existingItem = await Item.findOne({ 
      upcCode, 
      group: req.user.group 
    });
    
    if (existingItem) {
      return res.status(200).json({
        success: true,
        source: 'database',
        data: existingItem
      });
    }
    
    // If not found in database, try to look it up from external API
    const upcUrl = `${process.env.UPC_API_URL}?upc=${upcCode}`;
    const response = await axios.get(upcUrl);
    
    if (response.data && response.data.items && response.data.items.length > 0) {
      const item = response.data.items[0];
      
      return res.status(200).json({
        success: true,
        source: 'api',
        data: {
          name: item.title,
          description: item.description,
          manufacturer: item.brand,
          upcCode: item.upc,
          category: item.category,
          images: item.images
        }
      });
    }
    
    // If not found in API either
    return res.status(404).json({
      success: false,
      message: 'No product found with this UPC code'
    });
  } catch (error) {
    console.error('UPC lookup error:', error);
    return next(new ErrorResponse('Error looking up UPC code', 500));
  }
});

// @desc    Loan an item to someone
// @route   POST /api/items/:id/loan
// @access  Private
exports.loanItem = async (req, res) => {
  try {
    // Enhanced debugging
    console.log('Loan endpoint called');
    console.log('User:', req.user?.id, req.user?.email);
    console.log('Item ID:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body));
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error('Invalid item ID format');
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID format'
      });
    }
    
    // Validate required fields
    if (!req.body.loanedTo || typeof req.body.loanedTo !== 'string' || !req.body.loanedTo.trim()) {
      console.error('Missing or invalid loanedTo field');
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid name for who the item is loaned to'
      });
    }
    
    // Find the item first to check if it exists
    const existingItem = await Item.findById(req.params.id);
    
    if (!existingItem) {
      console.error('Item not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: `Item not found with id of ${req.params.id}`
      });
    }
    
    // Check authorization
    if (existingItem.group.toString() !== req.user.group.toString()) {
      console.error('Auth mismatch - User group:', req.user.group, 'Item group:', existingItem.group);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to loan this item'
      });
    }
    
    // Create a new loanDetails object to ensure proper structure
    const newLoanDetails = {
      loanedTo: req.body.loanedTo ? req.body.loanedTo.trim() : '',
      loanDate: new Date(),
      isLoaned: true,
      notes: req.body.notes || ''
    };
    
    console.log('Setting loanDetails to:', newLoanDetails);
    
    // Update the item using direct MongoDB operator to ensure the value is correctly set
    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          loanDetails: newLoanDetails,
          updatedAt: new Date(),
          updatedBy: req.user.id
        }
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedItem) {
      console.error('Failed to update item after validation passed');
      return res.status(500).json({
        success: false,
        message: 'Failed to update the item'
      });
    }
    
    // Verify loan info was saved
    console.log('Loan successful for item:', req.params.id);
    console.log('Updated item loanDetails:', updatedItem.loanDetails);
    
    // Double-check the update persisted in the database
    const verifiedItem = await Item.findById(req.params.id);
    console.log('Verified loanDetails from DB:', verifiedItem.loanDetails);
    
    return res.status(200).json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    console.error('CRITICAL ERROR in loanItem:', error);
    console.error('Stack trace:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Server error processing loan request',
      error: error.message
    });
  }
};

// @desc    Return a loaned item
// @route   POST /api/items/:id/return
// @access  Private
exports.returnItem = async (req, res) => {
  try {
    // Enhanced debugging
    console.log('Return endpoint called');
    console.log('User:', req.user?.id, req.user?.email);
    console.log('Item ID:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body));
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error('Invalid item ID format');
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID format'
      });
    }
    
    // Find the item first to check if it exists
    const existingItem = await Item.findById(req.params.id);
    
    if (!existingItem) {
      console.error('Item not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: `Item not found with id of ${req.params.id}`
      });
    }
    
    // Check authorization
    if (existingItem.group.toString() !== req.user.group.toString()) {
      console.error('Auth mismatch - User group:', req.user.group, 'Item group:', existingItem.group);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to return this item'
      });
    }
    
    // Check if item is actually loaned
    if (!existingItem.loanDetails || !existingItem.loanDetails.isLoaned) {
      console.error('Item not on loan:', req.params.id);
      return res.status(400).json({
        success: false,
        message: 'This item is not currently loaned out'
      });
    }

    // Prepare notes - combine existing notes with return notes
    const existingNotes = existingItem.loanDetails?.notes || '';
    const returnNotes = req.body.returnNotes ? 
      `\nReturn notes: ${req.body.returnNotes}` : '';
    const combinedNotes = existingNotes + returnNotes;
    
    // Prepare the updated loanDetails object
    const updatedLoanDetails = {
      loanedTo: existingItem.loanDetails.loanedTo,
      loanDate: existingItem.loanDetails.loanDate,
      isLoaned: false,
      returnDate: new Date(),
      notes: combinedNotes
    };
    
    console.log('Setting updated loanDetails to:', updatedLoanDetails);
    
    // Update using $set for the entire loanDetails object to ensure consistency
    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          loanDetails: updatedLoanDetails,
          updatedAt: new Date(),
          updatedBy: req.user.id
        }
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedItem) {
      console.error('Failed to update item after validation passed');
      return res.status(500).json({
        success: false,
        message: 'Failed to update the item'
      });
    }
    
    console.log('Return successful for item:', req.params.id);
    return res.status(200).json({
      success: true,
      data: updatedItem
    });
    
  } catch (error) {
    console.error('CRITICAL ERROR in returnItem:', error);
    console.error('Stack trace:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Server error processing return request',
      error: error.message
    });
  }
};
