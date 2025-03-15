const mongoose = require('mongoose');
const Item = require('../models/Item');
const Location = require('../models/Location');
const Category = require('../models/Category');
const Label = require('../models/Label');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const achievementService = require('../services/achievementService');

/**
 * @desc    Bulk add items
 * @route   POST /api/items/bulk
 * @access  Private
 */
exports.bulkAddItems = asyncHandler(async (req, res, next) => {
  try {
    const { entities } = req.body;
    
    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      return next(new ErrorResponse('No items provided for bulk creation', 400));
    }
    
    const createdItems = [];
    
    // Process each item
    for (const entity of entities) {
      // Add user and group to entity
      entity.createdBy = req.user.id;
      entity.group = req.user.group;
      
      // Create the item
      const item = await Item.create(entity);
      createdItems.push(item);
    }
    
    res.status(201).json({
      success: true,
      count: createdItems.length,
      message: `Successfully created ${createdItems.length} items`,
      data: createdItems
    });
  } catch (error) {
    console.error('Error bulk adding items:', error);
    return next(new ErrorResponse(`Error bulk adding items: ${error.message}`, 500));
  }
});

/**
 * @desc    Bulk add locations
 * @route   POST /api/locations/bulk
 * @access  Private
 */
exports.bulkAddLocations = asyncHandler(async (req, res, next) => {
  try {
    const { entities } = req.body;
    
    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      return next(new ErrorResponse('No locations provided for bulk creation', 400));
    }
    
    const createdLocations = [];
    
    // Process each location
    for (const entity of entities) {
      // Validate name
      if (!entity.name || !entity.name.trim()) {
        continue; // Skip this entity if name is missing
      }
      
      // Add user and group to entity
      entity.createdBy = req.user.id;
      entity.group = req.user.group;
      
      // Create the location
      const location = await Location.create(entity);
      createdLocations.push(location);
    }
    
    // Check for location count achievements
    const locationCount = await Location.countDocuments({ 
      group: req.user.group,
      createdBy: req.user.id
    });
    
    // Update achievements
    await achievementService.checkAndAwardAchievements(req.user.id, 'location_count', locationCount);
    
    res.status(201).json({
      success: true,
      count: createdLocations.length,
      message: `Successfully created ${createdLocations.length} locations`,
      data: createdLocations
    });
  } catch (error) {
    console.error('Error bulk adding locations:', error);
    return next(new ErrorResponse(`Error bulk adding locations: ${error.message}`, 500));
  }
});

/**
 * @desc    Bulk add categories
 * @route   POST /api/categories/bulk
 * @access  Private
 */
exports.bulkAddCategories = asyncHandler(async (req, res, next) => {
  try {
    const { entities } = req.body;
    
    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      return next(new ErrorResponse('No categories provided for bulk creation', 400));
    }
    
    const createdCategories = [];
    
    // Process each category
    for (const entity of entities) {
      // Validate name
      if (!entity.name || !entity.name.trim()) {
        continue; // Skip this entity if name is missing
      }
      
      // Add user and group to entity
      entity.createdBy = req.user.id;
      entity.group = req.user.group;
      
      // Set default values if not provided
      entity.icon = entity.icon || 'category';
      entity.color = entity.color || '#6B46C1';
      
      // Create the category
      const category = await Category.create(entity);
      createdCategories.push(category);
    }
    
    // Check for category count achievements
    const categoryCount = await Category.countDocuments({ 
      group: req.user.group,
      createdBy: req.user.id
    });
    
    // Update achievements
    await achievementService.checkAndAwardAchievements(req.user.id, 'category_count', categoryCount);
    
    res.status(201).json({
      success: true,
      count: createdCategories.length,
      message: `Successfully created ${createdCategories.length} categories`,
      data: createdCategories
    });
  } catch (error) {
    console.error('Error bulk adding categories:', error);
    return next(new ErrorResponse(`Error bulk adding categories: ${error.message}`, 500));
  }
});

/**
 * @desc    Bulk add labels
 * @route   POST /api/labels/bulk
 * @access  Private
 */
exports.bulkAddLabels = asyncHandler(async (req, res, next) => {
  try {
    const { entities } = req.body;
    
    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      return next(new ErrorResponse('No labels provided for bulk creation', 400));
    }
    
    const createdLabels = [];
    
    // Process each label
    for (const entity of entities) {
      // Validate name
      if (!entity.name || !entity.name.trim()) {
        continue; // Skip this entity if name is missing
      }
      
      // Add user and group to entity
      entity.createdBy = req.user.id;
      entity.group = req.user.group;
      
      // Set default color if not provided
      entity.color = entity.color || '#6B46C1';
      
      // Create the label
      const label = await Label.create(entity);
      createdLabels.push(label);
    }
    
    // Check for label count achievements
    const labelCount = await Label.countDocuments({ 
      group: req.user.group,
      createdBy: req.user.id
    });
    
    // Update achievements
    await achievementService.checkAndAwardAchievements(req.user.id, 'label_count', labelCount);
    
    res.status(201).json({
      success: true,
      count: createdLabels.length,
      message: `Successfully created ${createdLabels.length} labels`,
      data: createdLabels
    });
  } catch (error) {
    console.error('Error bulk adding labels:', error);
    return next(new ErrorResponse(`Error bulk adding labels: ${error.message}`, 500));
  }
});
