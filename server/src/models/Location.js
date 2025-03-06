const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a location name'],
    trim: true,
    maxlength: [50, 'Location name cannot be more than 50 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    default: null
  },
  path: {
    type: String,
    default: ''
  },
  level: {
    type: Number,
    default: 0
  },
  // QR code for this location
  qrCode: {
    type: String
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
LocationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update path when parent changes
LocationSchema.pre('save', async function(next) {
  if (this.isModified('parent')) {
    if (!this.parent) {
      this.path = this._id.toString();
      this.level = 0;
    } else {
      const parentLocation = await this.constructor.findById(this.parent);
      if (!parentLocation) {
        return next(new Error('Parent location not found'));
      }
      this.path = `${parentLocation.path},${this._id}`;
      this.level = parentLocation.level + 1;
    }
  }
  next();
});

// Get all child locations
LocationSchema.methods.getChildren = async function() {
  return await this.constructor.find({
    path: { $regex: new RegExp(`^${this.path},`) }
  });
};

// Get full path as array of location objects
LocationSchema.methods.getFullPath = async function() {
  if (!this.path) return [this];
  
  const locationIds = this.path.split(',');
  const locations = await this.constructor.find({
    _id: { $in: locationIds }
  });
  
  // Sort by level to get correct order
  return locations.sort((a, b) => a.level - b.level);
};

// Create index for faster searching
LocationSchema.index({ name: 'text', description: 'text' });
LocationSchema.index({ path: 1 });
LocationSchema.index({ group: 1 });

module.exports = mongoose.model('Location', LocationSchema);
