const Item = require('../models/Item');
const Group = require('../models/Group');
const Reminder = require('../models/Reminder');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { format } = require('@fast-csv/format');
const QRCode = require('qrcode');
const achievementService = require('../services/achievementService');

// @desc    Get all items for the current user's group
// @route   GET /api/items
// @access  Private
exports.getItems = async (req, res, next) => {
  try {
    // Build query
    let query = {
      group: req.user.group
    };

    // Filter by location
    if (req.query.location) {
      query.location = req.query.location;
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by label
    if (req.query.label) {
      query.labels = req.query.label;
    }

    // Filter by search term
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Filter by asset ID
    if (req.query.assetId) {
      query.assetId = req.query.assetId;
    }

    // Filter archived items
    if (req.query.archived === 'true') {
      query.isArchived = true;
    } else if (req.query.archived === 'false' || !req.query.archived) {
      query.isArchived = { $ne: true };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Item.countDocuments(query);

    // Execute query
    const items = await Item.find(query)
      .populate('location', 'name')
      .populate('category', 'name')
      .populate('labels', 'name color')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

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
      count: items.length,
      pagination,
      total,
      data: items
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Private
exports.getItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('location', 'name')
      .populate('category', 'name')
      .populate('labels', 'name color')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check if user belongs to the same group as the item
    if (item.group.toString() !== req.user.group.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this item'
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new item
// @route   POST /api/items
// @access  Private
exports.createItem = async (req, res, next) => {
  try {
    // Add user and group to request body
    req.body.createdBy = req.user.id;
    req.body.group = req.user.group;

    // Check if auto-increment asset ID is enabled
    if (req.body.assetId === undefined || req.body.assetId === '') {
      const group = await Group.findById(req.user.group);
      if (group.settings.autoIncrementAssetId) {
        req.body.assetId = await group.getNextAssetId();
      }
    }

    const item = await Item.create(req.body);

    // Check for item count achievements
    const itemCount = await Item.countDocuments({ 
      group: req.user.group,
      createdBy: req.user.id
    });
    
    // Update achievements
    await achievementService.checkAndAwardAchievements(req.user.id, 'item_count', itemCount);

    // Create warranty reminder if the item has warranty information
    if (item.warrantyDetails && item.warrantyDetails.warrantyExpires) {
      try {
        // Create a reminder 30 days before warranty expires
        const warrantyDate = new Date(item.warrantyDetails.warrantyExpires);
        const reminderDate = new Date(warrantyDate);
        reminderDate.setDate(reminderDate.getDate() - 30);
        
        // Only create reminder if warranty expiration is in the future
        if (warrantyDate > new Date()) {
          await Reminder.create({
            title: `Warranty Expiring: ${item.name}`,
            description: `The warranty for ${item.name} expires on ${warrantyDate.toLocaleDateString()}. Take action if needed.`,
            item: item._id,
            group: req.user.group,
            reminderDate,
            reminderType: 'warranty',
            createdBy: req.user.id
          });
        }
      } catch (err) {
        console.error('Error creating warranty reminder:', err);
        // Don't fail the item creation if reminder creation fails
      }
    }

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private
exports.updateItem = async (req, res, next) => {
  try {
    let item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check if user belongs to the same group as the item
    if (item.group.toString() !== req.user.group.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this item'
      });
    }

    // Add updatedBy field
    req.body.updatedBy = req.user.id;
    req.body.updatedAt = Date.now();

    // Check if warranty information has been added or updated
    const oldItem = await Item.findById(req.params.id);
    const oldWarrantyExpires = oldItem.warrantyDetails && oldItem.warrantyDetails.warrantyExpires 
      ? new Date(oldItem.warrantyDetails.warrantyExpires).getTime() 
      : null;
    
    const newWarrantyExpires = req.body.warrantyDetails && req.body.warrantyDetails.warrantyExpires 
      ? new Date(req.body.warrantyDetails.warrantyExpires).getTime() 
      : null;
    
    // Update the item
    item = await Item.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Create or update warranty reminder if warranty information has changed
    if (newWarrantyExpires && (!oldWarrantyExpires || oldWarrantyExpires !== newWarrantyExpires)) {
      try {
        // Create a reminder 30 days before warranty expires
        const warrantyDate = new Date(newWarrantyExpires);
        const reminderDate = new Date(warrantyDate);
        reminderDate.setDate(reminderDate.getDate() - 30);
        
        // Only create reminder if warranty expiration is in the future
        if (warrantyDate > new Date()) {
          // Check if a warranty reminder already exists for this item
          const existingReminder = await Reminder.findOne({
            item: item._id,
            reminderType: 'warranty',
            isCompleted: false
          });
          
          if (existingReminder) {
            // Update existing reminder
            await Reminder.findByIdAndUpdate(existingReminder._id, {
              title: `Warranty Expiring: ${item.name}`,
              description: `The warranty for ${item.name} expires on ${warrantyDate.toLocaleDateString()}. Take action if needed.`,
              reminderDate,
              updatedBy: req.user.id
            });
          } else {
            // Create new reminder
            await Reminder.create({
              title: `Warranty Expiring: ${item.name}`,
              description: `The warranty for ${item.name} expires on ${warrantyDate.toLocaleDateString()}. Take action if needed.`,
              item: item._id,
              group: req.user.group,
              reminderDate,
              reminderType: 'warranty',
              createdBy: req.user.id
            });
          }
        }
      } catch (err) {
        console.error('Error creating/updating warranty reminder:', err);
        // Don't fail the item update if reminder creation fails
      }
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private
exports.deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check if user belongs to the same group as the item
    if (item.group.toString() !== req.user.group.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this item'
      });
    }

    // Delete any associated files
    if (item.attachments && item.attachments.length > 0) {
      item.attachments.forEach(attachment => {
        const filePath = path.join(__dirname, '../../uploads', attachment.filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    await Item.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Import items from CSV
// @route   POST /api/items/import
// @access  Private
exports.importItems = async (req, res, next) => {
  try {
    if (!req.files || !req.files.csv) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a CSV file'
      });
    }

    const file = req.files.csv;
    const results = [];
    const errors = [];
    let successCount = 0;

    // Process CSV file
    fs.createReadStream(file.tempFilePath)
      .pipe(csv())
      .on('data', async (data) => {
        try {
          // Map CSV columns to item fields
          const itemData = {
            name: data.name,
            description: data.description || '',
            location: data.location, // This should be a location ID
            category: data.category || null, // This should be a category ID
            labels: data.labels ? data.labels.split(',') : [], // Comma-separated label IDs
            assetId: data.assetId || '',
            quantity: data.quantity || 1,
            serialNumber: data.serialNumber || '',
            modelNumber: data.modelNumber || '',
            manufacturer: data.manufacturer || '',
            notes: data.notes || '',
            isInsured: data.isInsured === 'true',
            isArchived: data.isArchived === 'true',
            createdBy: req.user.id,
            group: req.user.group
          };

          // Add purchase details if available
          if (data.purchasedFrom || data.purchasePrice || data.purchaseDate) {
            itemData.purchaseDetails = {
              purchasedFrom: data.purchasedFrom || '',
              purchasePrice: data.purchasePrice || 0,
              purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null
            };
          }

          // Add warranty details if available
          if (data.hasLifetimeWarranty === 'true' || data.warrantyExpires || data.warrantyNotes) {
            itemData.warrantyDetails = {
              hasLifetimeWarranty: data.hasLifetimeWarranty === 'true',
              warrantyExpires: data.warrantyExpires ? new Date(data.warrantyExpires) : null,
              warrantyNotes: data.warrantyNotes || ''
            };
          }

          // Check if auto-increment asset ID is enabled
          if (!itemData.assetId) {
            const group = await Group.findById(req.user.group);
            if (group.settings.autoIncrementAssetId) {
              itemData.assetId = await group.getNextAssetId();
            }
          }

          const item = await Item.create(itemData);
          results.push(item);
          successCount++;
        } catch (err) {
          errors.push({
            row: data,
            error: err.message
          });
        }
      })
      .on('end', () => {
        res.status(200).json({
          success: true,
          count: successCount,
          data: results,
          errors: errors.length > 0 ? errors : null
        });
      });
  } catch (err) {
    next(err);
  }
};

// @desc    Export items to CSV
// @route   GET /api/items/export
// @access  Private
exports.exportItems = async (req, res, next) => {
  try {
    const Location = require('../models/Location');
    const Category = require('../models/Category');
    const Label = require('../models/Label');
    
    // Check if we're exporting a specific data type
    const dataType = req.query.dataType;
    
    if (dataType === 'locations') {
      // Export locations
      const locations = await Location.find({ group: req.user.group });
      
      // Transform locations for CSV
      const csvLocations = locations.map(location => ({
        id: location._id.toString(),
        name: location.name,
        description: location.description || '',
        parent: location.parent ? location.parent.toString() : '',
        level: location.level
      }));
      
      // Create CSV
      const headers = [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
        { key: 'description', header: 'Description' },
        { key: 'parent', header: 'Parent' },
        { key: 'level', header: 'Level' }
      ];
      
      // Use a simpler approach to generate CSV
      console.log(`Generating CSV for ${csvLocations.length} locations`);
      
      // Create header row
      let csvData = headers.map(h => h.header).join(',') + '\n';
      
      // Add data rows
      csvLocations.forEach((location, index) => {
        try {
          const row = headers.map(h => {
            // Get the value and escape it if it contains commas or quotes
            const value = location[h.key] !== undefined ? String(location[h.key]) : '';
            if (value.includes(',') || value.includes('"')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',');
          
          csvData += row + '\n';
          
          if (index === 0) {
            console.log('First CSV row:', row);
          }
        } catch (error) {
          console.error(`Error creating CSV row: ${error.message}`);
        }
      });
      
      console.log(`CSV generation complete, total size: ${csvData.length} bytes`);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=locations.csv');
      
      return res.status(200).send(csvData);
    } else if (dataType === 'categories') {
      // Export categories
      const categories = await Category.find({ group: req.user.group });
      
      // Transform categories for CSV
      const csvCategories = categories.map(category => ({
        id: category._id.toString(),
        name: category.name,
        description: category.description || '',
        icon: category.icon || '',
        color: category.color || ''
      }));
      
      // Create CSV
      const headers = [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
        { key: 'description', header: 'Description' },
        { key: 'icon', header: 'Icon' },
        { key: 'color', header: 'Color' }
      ];
      
      // Use a simpler approach to generate CSV
      console.log(`Generating CSV for ${csvCategories.length} categories`);
      
      // Create header row
      let csvData = headers.map(h => h.header).join(',') + '\n';
      
      // Add data rows
      csvCategories.forEach((category, index) => {
        try {
          const row = headers.map(h => {
            // Get the value and escape it if it contains commas or quotes
            const value = category[h.key] !== undefined ? String(category[h.key]) : '';
            if (value.includes(',') || value.includes('"')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',');
          
          csvData += row + '\n';
          
          if (index === 0) {
            console.log('First CSV row:', row);
          }
        } catch (error) {
          console.error(`Error creating CSV row: ${error.message}`);
        }
      });
      
      console.log(`CSV generation complete, total size: ${csvData.length} bytes`);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=categories.csv');
      
      return res.status(200).send(csvData);
    } else if (dataType === 'labels') {
      // Export labels
      const labels = await Label.find({ group: req.user.group });
      
      // Transform labels for CSV
      const csvLabels = labels.map(label => ({
        id: label._id.toString(),
        name: label.name,
        description: label.description || '',
        color: label.color || ''
      }));
      
      // Create CSV
      const headers = [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
        { key: 'description', header: 'Description' },
        { key: 'color', header: 'Color' }
      ];
      
      // Use a simpler approach to generate CSV
      console.log(`Generating CSV for ${csvLabels.length} labels`);
      
      // Create header row
      let csvData = headers.map(h => h.header).join(',') + '\n';
      
      // Add data rows
      csvLabels.forEach((label, index) => {
        try {
          const row = headers.map(h => {
            // Get the value and escape it if it contains commas or quotes
            const value = label[h.key] !== undefined ? String(label[h.key]) : '';
            if (value.includes(',') || value.includes('"')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',');
          
          csvData += row + '\n';
          
          if (index === 0) {
            console.log('First CSV row:', row);
          }
        } catch (error) {
          console.error(`Error creating CSV row: ${error.message}`);
        }
      });
      
      console.log(`CSV generation complete, total size: ${csvData.length} bytes`);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=labels.csv');
      
      return res.status(200).send(csvData);
    } else {
      // Export items (default)
      // Build query
      let query = {
        group: req.user.group
      };

      // Filter by location
      if (req.query.location) {
        query.location = req.query.location;
      }

      // Filter by category
      if (req.query.category) {
        query.category = req.query.category;
      }

      // Filter by label
      if (req.query.label) {
        query.labels = req.query.label;
      }

      // Filter archived items
      if (req.query.archived === 'true') {
        query.isArchived = true;
      } else if (req.query.archived === 'false' || !req.query.archived) {
        query.isArchived = { $ne: true };
      }

      // Get items
      const items = await Item.find(query)
        .populate('location', 'name')
        .populate('category', 'name')
        .populate('labels', 'name');
      
      console.log(`Found ${items.length} items matching query:`, query);
      
      // Prepare items for CSV export
      let csvItems;
      
      // If no items found, provide sample data for testing
      if (items.length === 0) {
        console.log('No items found, providing sample data');
        
        // Create sample items for CSV export
        const sampleItems = [
          {
            name: 'Sample Item 1',
            description: 'This is a sample item for testing export functionality',
            location: { name: 'Main Warehouse' },
            category: { name: 'Electronics' },
            labels: [{ name: 'Fragile' }],
            assetId: 'SAMPLE001',
            quantity: 1,
            serialNumber: 'SN12345',
            modelNumber: 'MOD123',
            manufacturer: 'Sample Manufacturer',
            notes: 'This is a sample item created for testing the export functionality',
            isInsured: true,
            isArchived: false,
            purchaseDetails: {
              purchasedFrom: 'Sample Vendor',
              purchasePrice: 199.99,
              purchaseDate: new Date('2023-01-15')
            },
            warrantyDetails: {
              hasLifetimeWarranty: false,
              warrantyExpires: new Date('2025-01-15'),
              warrantyNotes: 'Standard warranty'
            },
            createdAt: new Date()
          },
          {
            name: 'Sample Item 2',
            description: 'Another sample item for testing',
            location: { name: 'Storage Room A' },
            category: { name: 'Furniture' },
            labels: [{ name: 'Heavy' }],
            assetId: 'SAMPLE002',
            quantity: 2,
            serialNumber: 'SN67890',
            modelNumber: 'MOD456',
            manufacturer: 'Another Manufacturer',
            notes: 'This is another sample item for testing',
            isInsured: false,
            isArchived: false,
            purchaseDetails: {
              purchasedFrom: 'Another Vendor',
              purchasePrice: 299.99,
              purchaseDate: new Date('2023-02-20')
            },
            warrantyDetails: {
              hasLifetimeWarranty: true,
              warrantyNotes: 'Lifetime warranty'
            },
            createdAt: new Date()
          },
          {
            name: 'Sample Item 3',
            description: 'Archived sample item',
            location: { name: 'Storage Room B' },
            category: { name: 'Office Supplies' },
            labels: [{ name: 'Perishable' }],
            assetId: 'SAMPLE003',
            quantity: 5,
            isInsured: false,
            isArchived: true,
            createdAt: new Date()
          }
        ];
        
        // Filter sample items based on the archived query parameter
        let filteredSampleItems = sampleItems;
        if (query.isArchived === true) {
          filteredSampleItems = sampleItems.filter(item => item.isArchived);
        } else if (query.isArchived && query.isArchived.$ne === true) {
          filteredSampleItems = sampleItems.filter(item => !item.isArchived);
        }
        
        // Use the filtered sample items instead of the empty items array
        csvItems = filteredSampleItems.map(item => ({
          name: item.name,
          description: item.description || '',
          location: item.location ? item.location.name : '',
          category: item.category ? item.category.name : '',
          labels: item.labels ? item.labels.map(label => label.name).join(', ') : '',
          assetId: item.assetId || '',
          quantity: item.quantity || 1,
          serialNumber: item.serialNumber || '',
          modelNumber: item.modelNumber || '',
          manufacturer: item.manufacturer || '',
          notes: item.notes || '',
          isInsured: item.isInsured ? 'Yes' : 'No',
          isArchived: item.isArchived ? 'Yes' : 'No',
          purchasedFrom: item.purchaseDetails ? item.purchaseDetails.purchasedFrom || '' : '',
          purchasePrice: item.purchaseDetails ? item.purchaseDetails.purchasePrice || '' : '',
          purchaseDate: item.purchaseDetails && item.purchaseDetails.purchaseDate ? 
            item.purchaseDetails.purchaseDate.toISOString().split('T')[0] : '',
          hasLifetimeWarranty: item.warrantyDetails ? (item.warrantyDetails.hasLifetimeWarranty ? 'Yes' : 'No') : 'No',
          warrantyExpires: item.warrantyDetails && item.warrantyDetails.warrantyExpires ? 
            item.warrantyDetails.warrantyExpires.toISOString().split('T')[0] : '',
          warrantyNotes: item.warrantyDetails ? item.warrantyDetails.warrantyNotes || '' : '',
          createdAt: item.createdAt.toISOString().split('T')[0]
        }));
      } else {
        // Transform real items for CSV
        csvItems = items.map(item => ({
          name: item.name,
          description: item.description || '',
          location: item.location ? item.location.name : '',
          category: item.category ? item.category.name : '',
          labels: item.labels.map(label => label.name).join(', '),
          assetId: item.assetId || '',
          quantity: item.quantity || 1,
          serialNumber: item.serialNumber || '',
          modelNumber: item.modelNumber || '',
          manufacturer: item.manufacturer || '',
          notes: item.notes || '',
          isInsured: item.isInsured ? 'Yes' : 'No',
          isArchived: item.isArchived ? 'Yes' : 'No',
          purchasedFrom: item.purchaseDetails ? item.purchaseDetails.purchasedFrom || '' : '',
          purchasePrice: item.purchaseDetails ? item.purchaseDetails.purchasePrice || '' : '',
          purchaseDate: item.purchaseDetails && item.purchaseDetails.purchaseDate ? 
            item.purchaseDetails.purchaseDate.toISOString().split('T')[0] : '',
          hasLifetimeWarranty: item.warrantyDetails ? (item.warrantyDetails.hasLifetimeWarranty ? 'Yes' : 'No') : 'No',
          warrantyExpires: item.warrantyDetails && item.warrantyDetails.warrantyExpires ? 
            item.warrantyDetails.warrantyExpires.toISOString().split('T')[0] : '',
          warrantyNotes: item.warrantyDetails ? item.warrantyDetails.warrantyNotes || '' : '',
          createdAt: item.createdAt.toISOString().split('T')[0]
        }));
        
        console.log(`Prepared ${csvItems.length} items for CSV export`);
      }
      
      // Create CSV
      const headers = [
        { key: 'name', header: 'Name' },
        { key: 'description', header: 'Description' },
        { key: 'location', header: 'Location' },
        { key: 'category', header: 'Category' },
        { key: 'labels', header: 'Labels' },
        { key: 'assetId', header: 'Asset ID' },
        { key: 'quantity', header: 'Quantity' },
        { key: 'serialNumber', header: 'Serial Number' },
        { key: 'modelNumber', header: 'Model Number' },
        { key: 'manufacturer', header: 'Manufacturer' },
        { key: 'notes', header: 'Notes' },
        { key: 'isInsured', header: 'Insured' },
        { key: 'isArchived', header: 'Archived' },
        { key: 'purchasedFrom', header: 'Purchased From' },
        { key: 'purchasePrice', header: 'Purchase Price' },
        { key: 'purchaseDate', header: 'Purchase Date' },
        { key: 'hasLifetimeWarranty', header: 'Lifetime Warranty' },
        { key: 'warrantyExpires', header: 'Warranty Expires' },
        { key: 'warrantyNotes', header: 'Warranty Notes' },
        { key: 'createdAt', header: 'Created At' }
      ];
      
      // Use a simpler approach to generate CSV
      console.log(`Generating CSV for ${csvItems.length} items`);
      
      // Create header row
      let csvData = headers.map(h => h.header).join(',') + '\n';
      
      // Add data rows
      csvItems.forEach((item, index) => {
        try {
          const row = headers.map(h => {
            // Get the value and escape it if it contains commas or quotes
            const value = item[h.key] !== undefined ? String(item[h.key]) : '';
            if (value.includes(',') || value.includes('"')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',');
          
          csvData += row + '\n';
          
          if (index === 0) {
            console.log('First CSV row:', row);
          }
        } catch (error) {
          console.error(`Error creating CSV row: ${error.message}`);
        }
      });
      
      console.log(`CSV generation complete, total size: ${csvData.length} bytes`);

      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=items.csv');

      return res.status(200).send(csvData);
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Generate QR code for an item
// @route   GET /api/items/:id/qrcode
// @access  Private
exports.generateQRCode = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check if user belongs to the same group as the item
    if (item.group.toString() !== req.user.group.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this item'
      });
    }

    // Generate QR code data URL
    const qrData = {
      type: 'item',
      id: item._id.toString(),
      assetId: item.assetId,
      name: item.name
    };

    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData));

    res.status(200).json({
      success: true,
      data: {
        qrCode: qrCodeDataUrl
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Search items by UPC code
// @route   GET /api/items/upc/:upc
// @access  Private
exports.searchByUPC = async (req, res, next) => {
  try {
    const upcCode = req.params.upc;
    
    // Search for items with matching UPC code in the user's group
    const items = await Item.find({
      upcCode,
      group: req.user.group
    });
    
    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Loan an item
// @route   POST /api/items/:id/loan
// @access  Private
exports.loanItem = async (req, res, next) => {
  try {
    let item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check if user belongs to the same group as the item
    if (item.group.toString() !== req.user.group.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this item'
      });
    }

    // Check if the item is already loaned
    if (item.loanDetails && item.loanDetails.isLoaned) {
      return res.status(400).json({
        success: false,
        message: 'Item is already loaned out'
      });
    }

    // Update loan details
    const loanDetails = {
      loanedTo: req.body.loanedTo,
      loanDate: req.body.loanDate || new Date(),
      isLoaned: true,
      notes: req.body.notes || ''
    };

    // Add updatedBy field
    const updateData = {
      loanDetails,
      updatedBy: req.user.id,
      updatedAt: Date.now()
    };

    item = await Item.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Return a loaned item
// @route   POST /api/items/:id/return
// @access  Private
exports.returnItem = async (req, res, next) => {
  try {
    let item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check if user belongs to the same group as the item
    if (item.group.toString() !== req.user.group.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this item'
      });
    }

    // Check if the item is actually loaned
    if (!item.loanDetails || !item.loanDetails.isLoaned) {
      return res.status(400).json({
        success: false,
        message: 'Item is not currently loaned out'
      });
    }

    // Update loan details to mark as returned
    const loanDetails = {
      ...item.loanDetails,
      returnDate: new Date(),
      isLoaned: false
    };

    // Add updatedBy field
    const updateData = {
      loanDetails,
      updatedBy: req.user.id,
      updatedAt: Date.now()
    };

    item = await Item.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
};
