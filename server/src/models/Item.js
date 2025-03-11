const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add an item name'],
    trim: true,
    maxlength: [100, 'Item name cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: [true, 'Please specify a location']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Label'
  }],
  assetId: {
    type: String,
    unique: false // Not enforcing uniqueness at DB level to allow flexibility
  },
  // Details section
  quantity: {
    type: Number,
    default: 1,
    min: [0, 'Quantity cannot be negative']
  },
  serialNumber: {
    type: String,
    trim: true
  },
  modelNumber: {
    type: String,
    trim: true
  },
  manufacturer: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    maxlength: [2000, 'Notes cannot be more than 2000 characters']
  },
  isInsured: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  // Purchase details section
  purchaseDetails: {
    purchasedFrom: {
      type: String,
      trim: true
    },
    purchasePrice: {
      type: Number,
      min: [0, 'Purchase price cannot be negative']
    },
    purchaseDate: {
      type: Date
    }
  },
  // Warranty details section
  warrantyDetails: {
    hasLifetimeWarranty: {
      type: Boolean,
      default: false
    },
    warrantyExpires: {
      type: Date
    },
    warrantyNotes: {
      type: String,
      maxlength: [1000, 'Warranty notes cannot be more than 1000 characters']
    }
  },
  // Sold details section
  soldDetails: {
    soldTo: {
      type: String,
      trim: true
    },
    soldPrice: {
      type: Number,
      min: [0, 'Sold price cannot be negative']
    },
    soldDate: {
      type: Date
    }
  },
  // Custom fields
  customFields: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['text', 'integer', 'boolean', 'timestamp'],
      default: 'text'
    },
    value: {
      type: mongoose.Schema.Types.Mixed
    }
  }],
  // Attachments (photos, documents, etc.)
  attachments: [{
    name: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    isPrimaryPhoto: {
      type: Boolean,
      default: false
    }
  }],
  // UPC code if available
  upcCode: {
    type: String,
    trim: true
  },
  // Item URL
  itemUrl: {
    type: String,
    trim: true
  },
  // Manual URL
  manualUrl: {
    type: String,
    trim: true
  },
  // Loan details section
  loanDetails: {
    loanedTo: {
      type: String,
      trim: true
    },
    loanDate: {
      type: Date
    },
    returnDate: {
      type: Date
    },
    isLoaned: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      maxlength: [500, 'Loan notes cannot be more than 500 characters']
    }
  },
  // Audit trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

// Set updatedAt before saving
ItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for faster searching and filtering
// Text index for search functionality
ItemSchema.index({ 
  name: 'text', 
  description: 'text', 
  assetId: 'text',
  serialNumber: 'text',
  modelNumber: 'text',
  manufacturer: 'text',
  upcCode: 'text'
});

// Compound indexes for common query patterns
ItemSchema.index({ group: 1, isArchived: 1 });
ItemSchema.index({ group: 1, location: 1 });
ItemSchema.index({ group: 1, category: 1 });
ItemSchema.index({ group: 1, labels: 1 });
ItemSchema.index({ group: 1, updatedAt: -1 });

module.exports = mongoose.model('Item', ItemSchema);
