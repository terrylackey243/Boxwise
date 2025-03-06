const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a category name'],
    trim: true,
    maxlength: [30, 'Category name cannot be more than 30 characters']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  icon: {
    type: String,
    default: 'category' // Default Material UI icon name
  },
  color: {
    type: String,
    default: '#6B46C1' // Default to a light purple color
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
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
CategorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create index for faster searching
CategorySchema.index({ name: 'text', description: 'text' });
CategorySchema.index({ group: 1 });

module.exports = mongoose.model('Category', CategorySchema);
