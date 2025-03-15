const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { restrictViewers } = require('../middleware/viewerRestriction');
const Location = require('../models/Location');
const Item = require('../models/Item');
const achievementService = require('../services/achievementService');
const { bulkAddLocations } = require('../controllers/bulk');

// @route   POST api/locations/bulk
// @desc    Bulk add locations
// @access  Private
router.post('/bulk', protect, restrictViewers, bulkAddLocations);

// @route   GET api/locations/count
// @desc    Get count of locations
// @access  Private
router.get('/count', protect, async (req, res) => {
  try {
    // Count locations for the user's group
    const count = await Location.countDocuments({ group: req.user.group });
    
    res.status(200).json({
      success: true,
      count
    });
  } catch (err) {
    console.error('Error counting locations:', err);
    res.status(500).json({
      success: false,
      message: 'Error counting locations'
    });
  }
});

// @route   GET api/locations
// @desc    Get all locations
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get all locations for the user's group
    const locations = await Location.find({ group: req.user.group })
      .sort({ name: 1 });
    
    // Get item counts for each location
    const locationsWithCounts = await Promise.all(
      locations.map(async (location) => {
        const itemCount = await Item.countDocuments({
          group: req.user.group,
          location: location._id
        });
        
        return {
          ...location.toObject(),
          itemCount
        };
      })
    );
    
    // Check if flat=true query parameter is provided
    const { flat } = req.query;
    
    if (flat === 'true') {
      // Return a flat list of all locations
      res.json({
        success: true,
        count: locationsWithCounts.length,
        data: locationsWithCounts
      });
    } else {
      // Organize locations into a hierarchical structure
      const locationMap = {};
      const rootLocations = [];
      
      // First, create a map of all locations by ID
      locationsWithCounts.forEach(location => {
        location.children = [];
        locationMap[location._id] = location;
      });
      
      // Then, build the tree structure
      locationsWithCounts.forEach(location => {
        if (location.parent && locationMap[location.parent]) {
          // Add this location as a child of its parent
          locationMap[location.parent].children.push(location);
        } else {
          // This is a root location (no parent or parent not found)
          rootLocations.push(location);
        }
      });
      
      res.json({
        success: true,
        count: locationsWithCounts.length,
        data: rootLocations
      });
    }
  } catch (err) {
    console.error('Error fetching locations:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   GET api/locations/:id
// @desc    Get location by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    // Find the location
    const location = await Location.findOne({
      _id: req.params.id,
      group: req.user.group
    });
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    // Get item count for this location
    const itemCount = await Item.countDocuments({
      group: req.user.group,
      location: location._id
    });
    
    // Get child locations if any
    const children = await Location.find({
      group: req.user.group,
      parent: location._id
    });
    
    const locationWithDetails = {
      ...location.toObject(),
      itemCount,
      children: children.map(child => child.toObject())
    };
    
    res.json({
      success: true,
      data: locationWithDetails
    });
  } catch (err) {
    console.error('Error fetching location:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   POST api/locations
// @desc    Create a location
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, parent } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }
    
    // Check if parent exists if provided
    if (parent) {
      const parentLocation = await Location.findOne({
        _id: parent,
        group: req.user.group
      });
      
      if (!parentLocation) {
        return res.status(404).json({
          success: false,
          message: 'Parent location not found'
        });
      }
    }
    
    // Create a new location
    const newLocation = new Location({
      name,
      description: description || '',
      parent: parent || null,
      group: req.user.group,
      createdBy: req.user.id
    });
    
    await newLocation.save();
    
    // Check for location count achievements
    const locationCount = await Location.countDocuments({ 
      group: req.user.group,
      createdBy: req.user.id
    });
    
    // Update achievements
    await achievementService.checkAndAwardAchievements(req.user.id, 'location_count', locationCount);
    
    res.status(201).json({
      success: true,
      message: 'Location created successfully',
      data: {
        ...newLocation.toObject(),
        itemCount: 0
      }
    });
  } catch (err) {
    console.error('Error creating location:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   PUT api/locations/:id
// @desc    Update a location
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, description, parent } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }
    
    // Find the location
    let location = await Location.findOne({
      _id: req.params.id,
      group: req.user.group
    });
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    // Check if parent exists if provided and is not the location itself
    if (parent) {
      if (parent === req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Location cannot be its own parent'
        });
      }
      
      const parentLocation = await Location.findOne({
        _id: parent,
        group: req.user.group
      });
      
      if (!parentLocation) {
        return res.status(404).json({
          success: false,
          message: 'Parent location not found'
        });
      }
      
      // Check if the new parent is not a child of this location
      const children = await location.getChildren();
      if (children.some(child => child._id.toString() === parent)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot set a child location as parent'
        });
      }
    }
    
    // Update location fields
    location.name = name;
    location.description = description || '';
    location.parent = parent || null;
    location.updatedBy = req.user.id;
    
    await location.save();
    
    // Get item count for this location
    const itemCount = await Item.countDocuments({
      group: req.user.group,
      location: location._id
    });
    
    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        ...location.toObject(),
        itemCount
      }
    });
  } catch (err) {
    console.error('Error updating location:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   DELETE api/locations/:id
// @desc    Delete a location
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    // Find the location
    const location = await Location.findOne({
      _id: req.params.id,
      group: req.user.group
    });
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    // Check if there are items using this location
    const itemCount = await Item.countDocuments({
      group: req.user.group,
      location: location._id
    });
    
    if (itemCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete location. It contains ${itemCount} items.`
      });
    }
    
    // Check if there are child locations
    const childLocations = await Location.find({
      group: req.user.group,
      parent: location._id
    });
    
    if (childLocations.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete location. It has ${childLocations.length} child locations.`
      });
    }
    
    // Delete the location
    await Location.deleteOne({ _id: req.params.id, group: req.user.group });
    
    res.json({
      success: true,
      message: `Location ${location.name} deleted successfully`
    });
  } catch (err) {
    console.error('Error deleting location:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

module.exports = router;
