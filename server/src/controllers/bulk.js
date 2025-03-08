const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Item = require('../models/Item');
const Location = require('../models/Location');
const Label = require('../models/Label');
const Category = require('../models/Category');

// Map entity types to their models
const entityModels = {
  items: Item,
  locations: Location,
  labels: Label,
  categories: Category
};

/**
 * @desc    Bulk add entities
 * @route   POST /api/:entityType/bulk
 * @access  Private
 */
exports.bulkAdd = asyncHandler(async (req, res, next) => {
  const { entityType } = req.params;
  const { entities } = req.body;

  // Check if entity type is valid
  if (!entityModels[entityType]) {
    return next(new ErrorResponse(`Invalid entity type: ${entityType}`, 400));
  }

  // Check if entities array is provided
  if (!entities || !Array.isArray(entities) || entities.length === 0) {
    return next(new ErrorResponse('No entities provided for bulk add', 400));
  }

  // Add user ID to each entity if applicable
  const entitiesWithUser = entities.map(entity => ({
    ...entity,
    user: req.user.id
  }));

  // Validate entities before adding
  const validationResults = await validateEntities(entityType, entitiesWithUser);
  
  if (validationResults.errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: validationResults.errors
    });
  }

  // Create entities in bulk
  const Model = entityModels[entityType];
  const createdEntities = await Model.insertMany(entitiesWithUser);

  res.status(201).json({
    success: true,
    count: createdEntities.length,
    data: createdEntities
  });
});

/**
 * @desc    Validate entities before bulk add
 * @route   POST /api/:entityType/validate
 * @access  Private
 */
exports.validateBulkAdd = asyncHandler(async (req, res, next) => {
  const { entityType } = req.params;
  const { entities } = req.body;

  // Check if entity type is valid
  if (!entityModels[entityType]) {
    return next(new ErrorResponse(`Invalid entity type: ${entityType}`, 400));
  }

  // Check if entities array is provided
  if (!entities || !Array.isArray(entities) || entities.length === 0) {
    return next(new ErrorResponse('No entities provided for validation', 400));
  }

  // Add user ID to each entity if applicable
  const entitiesWithUser = entities.map(entity => ({
    ...entity,
    user: req.user.id
  }));

  // Validate entities
  const validationResults = await validateEntities(entityType, entitiesWithUser);

  res.status(200).json({
    success: true,
    valid: validationResults.errors.length === 0,
    errors: validationResults.errors
  });
});

/**
 * Helper function to validate entities
 * @param {string} entityType - The type of entity to validate
 * @param {Array} entities - Array of entity objects to validate
 * @returns {Object} - Object with validation results
 */
const validateEntities = async (entityType, entities) => {
  const Model = entityModels[entityType];
  const errors = [];

  // Validate each entity
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    
    try {
      // Create a new model instance for validation
      const model = new Model(entity);
      
      // Validate the model
      await model.validate();
    } catch (error) {
      // Add validation error to errors array
      errors.push({
        index: i,
        entity,
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
