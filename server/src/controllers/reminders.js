const Reminder = require('../models/Reminder');
const Item = require('../models/Item');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all reminders for the user's group
// @route   GET /api/reminders
// @access  Private
exports.getReminders = asyncHandler(async (req, res, next) => {
  console.log('GET /api/reminders - Request received');
  console.log('User:', req.user.id, 'Group:', req.user.group);
  console.log('Query params:', req.query);
  
  // Create a copy of the query to modify
  const queryObj = {};
  
  console.log('Original query params:', req.query);
  console.log('User group:', req.user.group);
  
  // Add filter for upcoming reminders
  if (req.query.upcoming === 'true') {
    queryObj.reminderDate = { $gte: new Date() };
  }
  
  // Add filter for completed reminders
  if (req.query.completed === 'true') {
    queryObj.isCompleted = true;
  } else if (req.query.completed === 'false') {
    queryObj.isCompleted = false;
  }
  
  // Add filter for reminder type
  if (req.query.type) {
    queryObj.reminderType = req.query.type;
  }
  
  // Add filter for specific item
  if (req.query.item) {
    queryObj.item = req.query.item;
  }
  
  // Always filter by the user's group
  queryObj.group = req.user.group;
  
  console.log('Final query object:', queryObj);
  
  // Debug: Check if any reminders exist for this group at all
  try {
    const allReminders = await Reminder.find({ group: req.user.group });
    console.log('All reminders for this group:', allReminders.length);
    if (allReminders.length > 0) {
      console.log('Sample reminder:', allReminders[0]);
    }
  } catch (err) {
    console.error('Error checking all reminders:', err);
  }
  
  // Build query
  let query = Reminder.find(queryObj)
    .populate({
      path: 'item',
      select: 'name assetId'
    })
    .populate({
      path: 'createdBy',
      select: 'name'
    });
  
  // Sort by date (default: ascending for upcoming reminders)
  const sortBy = req.query.sort || 'reminderDate';
  const sortOrder = req.query.order || 'asc';
  query = query.sort({ [sortBy]: sortOrder });
  
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  try {
    const total = await Reminder.countDocuments(queryObj);
    console.log('Total reminders found:', total);
    
    query = query.skip(startIndex).limit(limit);
    
    // Execute query
    const reminders = await query;
    console.log('Reminders fetched:', reminders.length);
    
    // Pagination result
    const pagination = {};
    
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }
    
    res.status(200).json({
      success: true,
      count: reminders.length,
      pagination,
      data: reminders
    });
  } catch (err) {
    console.error('Error in getReminders:', err);
    return next(new ErrorResponse('Error fetching reminders', 500));
  }
});

// @desc    Get single reminder
// @route   GET /api/reminders/:id
// @access  Private
exports.getReminder = asyncHandler(async (req, res, next) => {
  const reminder = await Reminder.findById(req.params.id)
    .populate({
      path: 'item',
      select: 'name assetId location category'
    })
    .populate({
      path: 'createdBy',
      select: 'name'
    });
  
  if (!reminder) {
    return next(new ErrorResponse(`Reminder not found with id of ${req.params.id}`, 404));
  }
  
  // Make sure user is in the same group as the reminder
  if (reminder.group.toString() !== req.user.group.toString()) {
    return next(new ErrorResponse(`Not authorized to access this reminder`, 403));
  }
  
  res.status(200).json({
    success: true,
    data: reminder
  });
});

// @desc    Create new reminder
// @route   POST /api/reminders
// @access  Private
exports.createReminder = asyncHandler(async (req, res, next) => {
  // Add user and group to request body
  req.body.createdBy = req.user.id;
  req.body.group = req.user.group;
  
  // Check if item exists and belongs to the user's group
  const item = await Item.findById(req.body.item);
  
  if (!item) {
    return next(new ErrorResponse(`Item not found with id of ${req.body.item}`, 404));
  }
  
  if (item.group.toString() !== req.user.group.toString()) {
    return next(new ErrorResponse(`Not authorized to create a reminder for this item`, 403));
  }
  
  const reminder = await Reminder.create(req.body);
  
  res.status(201).json({
    success: true,
    data: reminder
  });
});

// @desc    Update reminder
// @route   PUT /api/reminders/:id
// @access  Private
exports.updateReminder = asyncHandler(async (req, res, next) => {
  let reminder = await Reminder.findById(req.params.id);
  
  if (!reminder) {
    return next(new ErrorResponse(`Reminder not found with id of ${req.params.id}`, 404));
  }
  
  // Make sure user is in the same group as the reminder
  if (reminder.group.toString() !== req.user.group.toString()) {
    return next(new ErrorResponse(`Not authorized to update this reminder`, 403));
  }
  
  // Add updatedBy to request body
  req.body.updatedBy = req.user.id;
  
  // If marking as completed, add completedDate
  if (req.body.isCompleted === true && !reminder.isCompleted) {
    req.body.completedDate = new Date();
  }
  
  reminder = await Reminder.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: reminder
  });
});

// @desc    Delete reminder
// @route   DELETE /api/reminders/:id
// @access  Private
exports.deleteReminder = asyncHandler(async (req, res, next) => {
  const reminder = await Reminder.findById(req.params.id);
  
  if (!reminder) {
    return next(new ErrorResponse(`Reminder not found with id of ${req.params.id}`, 404));
  }
  
  // Make sure user is in the same group as the reminder
  if (reminder.group.toString() !== req.user.group.toString()) {
    return next(new ErrorResponse(`Not authorized to delete this reminder`, 403));
  }
  
  await reminder.remove();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get upcoming reminders for dashboard
// @route   GET /api/reminders/upcoming
// @access  Private
exports.getUpcomingReminders = asyncHandler(async (req, res, next) => {
  try {
    // Get reminders due in the next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const reminders = await Reminder.find({
      group: req.user.group,
      isCompleted: false,
      reminderDate: {
        $gte: new Date(),
        $lte: thirtyDaysFromNow
      }
    })
      .select('title reminderDate reminderType isRecurring item')
      .populate({
        path: 'item',
        select: 'name assetId'
      })
      .sort('reminderDate')
      .limit(5)
      .lean(); // Use lean() for better performance
    
    res.status(200).json({
      success: true,
      count: reminders.length,
      data: reminders
    });
  } catch (err) {
    console.error('Error fetching upcoming reminders:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming reminders'
    });
  }
});

// @desc    Create warranty reminder from item
// @route   POST /api/reminders/warranty/:itemId
// @access  Private
exports.createWarrantyReminder = asyncHandler(async (req, res, next) => {
  const item = await Item.findById(req.params.itemId);
  
  if (!item) {
    return next(new ErrorResponse(`Item not found with id of ${req.params.itemId}`, 404));
  }
  
  // Make sure user is in the same group as the item
  if (item.group.toString() !== req.user.group.toString()) {
    return next(new ErrorResponse(`Not authorized to create a reminder for this item`, 403));
  }
  
  // Check if item has warranty information
  if (!item.warrantyDetails || !item.warrantyDetails.warrantyExpires) {
    return next(new ErrorResponse(`Item does not have warranty expiration information`, 400));
  }
  
  // Create a reminder 30 days before warranty expires
  const warrantyDate = new Date(item.warrantyDetails.warrantyExpires);
  const reminderDate = new Date(warrantyDate);
  reminderDate.setDate(reminderDate.getDate() - 30);
  
  const reminder = await Reminder.create({
    title: `Warranty Expiring: ${item.name}`,
    description: `The warranty for ${item.name} expires on ${warrantyDate.toLocaleDateString()}. Take action if needed.`,
    item: item._id,
    group: req.user.group,
    reminderDate,
    reminderType: 'warranty',
    createdBy: req.user.id
  });
  
  res.status(201).json({
    success: true,
    data: reminder
  });
});

// @desc    Create maintenance reminder from item
// @route   POST /api/reminders/maintenance/:itemId
// @access  Private
exports.createMaintenanceReminder = asyncHandler(async (req, res, next) => {
  const { title, description, reminderDate, isRecurring, recurringInterval } = req.body;
  
  const item = await Item.findById(req.params.itemId);
  
  if (!item) {
    return next(new ErrorResponse(`Item not found with id of ${req.params.itemId}`, 404));
  }
  
  // Make sure user is in the same group as the item
  if (item.group.toString() !== req.user.group.toString()) {
    return next(new ErrorResponse(`Not authorized to create a reminder for this item`, 403));
  }
  
  // Validate required fields
  if (!title || !reminderDate) {
    return next(new ErrorResponse('Please provide a title and reminder date', 400));
  }
  
  const reminder = await Reminder.create({
    title,
    description: description || `Maintenance reminder for ${item.name}`,
    item: item._id,
    group: req.user.group,
    reminderDate,
    isRecurring: isRecurring || false,
    recurringInterval: recurringInterval || 'monthly',
    reminderType: 'maintenance',
    createdBy: req.user.id
  });
  
  res.status(201).json({
    success: true,
    data: reminder
  });
});
