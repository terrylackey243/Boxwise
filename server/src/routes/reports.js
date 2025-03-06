const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Item = require('../models/Item');
const Category = require('../models/Category');
const Location = require('../models/Location');
const Label = require('../models/Label');

// @route   GET api/reports
// @desc    Get available reports
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get counts for each collection to determine available reports
    const itemCount = await Item.countDocuments({ group: req.user.group });
    const categoryCount = await Category.countDocuments({ group: req.user.group });
    const locationCount = await Location.countDocuments({ group: req.user.group });
    const labelCount = await Label.countDocuments({ group: req.user.group });
    
    // Define available reports based on data availability
    const reports = [
      {
        id: 'inventory',
        name: 'Inventory Report',
        description: 'Overview of all inventory items',
        available: itemCount > 0
      },
      {
        id: 'categories',
        name: 'Categories Report',
        description: 'Items grouped by categories',
        available: itemCount > 0 && categoryCount > 0
      },
      {
        id: 'locations',
        name: 'Locations Report',
        description: 'Items grouped by locations',
        available: itemCount > 0 && locationCount > 0
      },
      {
        id: 'labels',
        name: 'Labels Report',
        description: 'Items grouped by labels',
        available: itemCount > 0 && labelCount > 0
      },
      {
        id: 'activity',
        name: 'Activity Report',
        description: 'Recent activity and changes',
        available: itemCount > 0
      }
    ];
    
    res.json({
      success: true,
      reports
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   GET api/reports/:id
// @desc    Generate a specific report
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const reportId = req.params.id;
    const groupId = req.user.group;
    
    // Process filter parameters
    const { location, category, label, archived, dateFrom, dateTo } = req.query;
    
    // Build filter object
    const filter = { group: groupId };
    
    if (location) {
      filter.location = location;
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (label) {
      filter.labels = label;
    }
    
    if (archived === 'true') {
      // Include archived items
    } else {
      filter.isArchived = { $ne: true }; // Exclude archived items by default
    }
    
    if (dateFrom || dateTo) {
      filter.purchaseDate = {};
      
      if (dateFrom) {
        filter.purchaseDate.$gte = new Date(dateFrom);
      }
      
      if (dateTo) {
        filter.purchaseDate.$lte = new Date(dateTo);
      }
    }
    
    let reportData = {};
    
    switch (reportId) {
      case 'inventory':
        // Get inventory summary with filters
        const items = await Item.find(filter)
          .populate('category', 'name')
          .populate('location', 'name')
          .populate('labels', 'name color');
        
        reportData = {
          title: 'Inventory Report',
          generatedAt: new Date(),
          totalItems: items.length,
          items: items.map(item => ({
            _id: item._id,
            name: item.name,
            assetId: item.assetId || '',
            category: item.category || { name: 'Uncategorized' },
            location: item.location || { name: 'Unknown' },
            labels: item.labels || [],
            quantity: item.quantity || 0,
            value: item.value || 0,
            purchaseDate: item.purchaseDate || null,
            warrantyExpires: item.warrantyExpires || null,
            isArchived: item.isArchived || false
          }))
        };
        break;
        
      case 'categories':
        // Get items grouped by categories
        const categories = await Category.find({ group: groupId });
        
        const categoryReportData = await Promise.all(
          categories.map(async (category) => {
            const categoryFilter = { ...filter, category: category._id };
            const categoryItems = await Item.find(categoryFilter)
              .populate('location', 'name');
            
            return {
              id: category._id,
              name: category.name,
              itemCount: categoryItems.length,
              items: categoryItems.map(item => ({
                id: item._id,
                name: item.name,
                location: item.location?.name || 'Unknown',
                quantity: item.quantity,
                value: item.value || 0
              }))
            };
          })
        );
        
        // Also get uncategorized items
        const uncategorizedFilter = { ...filter, category: { $exists: false } };
        const uncategorizedItems = await Item.find(uncategorizedFilter)
          .populate('location', 'name');
        
        if (uncategorizedItems.length > 0) {
          categoryReportData.push({
            id: 'uncategorized',
            name: 'Uncategorized',
            itemCount: uncategorizedItems.length,
              items: uncategorizedItems.map(item => ({
                id: item._id,
                name: item.name,
                location: item.location?.name || 'Unknown',
                quantity: item.quantity,
                value: item.value || 0
              }))
          });
        }
        
        reportData = {
          title: 'Categories Report',
          generatedAt: new Date(),
          totalCategories: categories.length,
          totalItems: await Item.countDocuments({ group: groupId }),
          categories: categoryReportData.map(category => ({
            ...category,
            value: category.items.reduce((sum, item) => sum + (item.value || 0), 0)
          }))
        };
        break;
        
      case 'locations':
        // Get items grouped by locations
        const locations = await Location.find({ group: groupId });
        
        const locationReportData = await Promise.all(
          locations.map(async (location) => {
            const locationFilter = { ...filter, location: location._id };
            delete locationFilter.location; // Remove the original location filter
            locationFilter.location = location._id; // Set the specific location
            
            const locationItems = await Item.find(locationFilter)
              .populate('category', 'name');
            
            return {
              id: location._id,
              name: location.name,
              itemCount: locationItems.length,
              items: locationItems.map(item => ({
                id: item._id,
                name: item.name,
                category: item.category?.name || 'Uncategorized',
                quantity: item.quantity,
                value: item.value || 0
              }))
            };
          })
        );
        
        reportData = {
          title: 'Locations Report',
          generatedAt: new Date(),
          totalLocations: locations.length,
          totalItems: await Item.countDocuments({ group: groupId }),
          locations: locationReportData.map(location => ({
            ...location,
            value: location.items.reduce((sum, item) => sum + (item.value || 0), 0)
          }))
        };
        break;
        
      case 'labels':
        // Get items grouped by labels
        const labels = await Label.find({ group: groupId });
        
        const labelReportData = await Promise.all(
          labels.map(async (label) => {
            const labelFilter = { ...filter };
            delete labelFilter.labels; // Remove the original labels filter
            labelFilter.labels = label._id; // Set the specific label
            
            const labelItems = await Item.find(labelFilter)
              .populate('category', 'name')
              .populate('location', 'name');
            
            return {
              id: label._id,
              name: label.name,
              color: label.color,
              itemCount: labelItems.length,
              items: labelItems.map(item => ({
                id: item._id,
                name: item.name,
                category: item.category?.name || 'Uncategorized',
                location: item.location?.name || 'Unknown',
                quantity: item.quantity,
                value: item.value || 0
              }))
            };
          })
        );
        
        reportData = {
          title: 'Labels Report',
          generatedAt: new Date(),
          totalLabels: labels.length,
          totalItems: await Item.countDocuments({ group: groupId }),
          labels: labelReportData
        };
        break;
        
      case 'activity':
        // Get recent activity (using updatedAt field)
        const recentItems = await Item.find(filter)
          .sort({ updatedAt: -1 })
          .limit(50)
          .populate('category', 'name')
          .populate('location', 'name')
          .populate('createdBy', 'name')
          .populate('updatedBy', 'name');
        
        reportData = {
          title: 'Activity Report',
          generatedAt: new Date(),
          recentActivity: recentItems.map(item => ({
            id: item._id,
            name: item.name,
            category: item.category?.name || 'Uncategorized',
            location: item.location?.name || 'Unknown',
            createdBy: item.createdBy?.name || 'Unknown',
            createdAt: item.createdAt,
            updatedBy: item.updatedBy?.name || 'Unknown',
            updatedAt: item.updatedAt
          }))
        };
        break;
        
      default:
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
    }
    
    res.json({
      success: true,
      data: reportData
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   POST api/reports/export
// @desc    Export a report
// @access  Private
router.post('/export', protect, async (req, res) => {
  try {
    const { reportId, format } = req.body;
    
    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: 'Report ID is required'
      });
    }
    
    if (!['csv', 'json', 'pdf'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export format. Supported formats: csv, json, pdf'
      });
    }
    
    // In a real implementation, this would generate the report in the requested format
    // For now, we'll just return a success message
    
    res.json({
      success: true,
      message: `Report ${reportId} exported successfully in ${format.toUpperCase()} format`,
      downloadUrl: `/api/reports/download/${reportId}.${format}`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   GET api/reports/summary
// @desc    Get summary statistics
// @access  Private
router.get('/summary', protect, async (req, res) => {
  try {
    const groupId = req.user.group;
    
    // Get counts for each collection
    const totalItems = await Item.countDocuments({ group: groupId });
    const totalCategories = await Category.countDocuments({ group: groupId });
    const totalLocations = await Location.countDocuments({ group: groupId });
    const totalLabels = await Label.countDocuments({ group: groupId });
    
    // Get counts for archived items
    const archivedItems = await Item.countDocuments({ 
      group: groupId,
      isArchived: true
    });
    
    // Get recent activity count (items updated in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentActivity = await Item.countDocuments({
      group: groupId,
      updatedAt: { $gte: thirtyDaysAgo }
    });
    
    res.json({
      success: true,
      data: {
        totalItems,
        activeItems: totalItems - archivedItems,
        archivedItems,
        totalCategories,
        totalLocations,
        totalLabels,
        recentActivity
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

module.exports = router;
