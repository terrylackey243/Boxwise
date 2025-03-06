const mongoose = require('mongoose');

const LabelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a label name'],
    trim: true,
    maxlength: [30, 'Label name cannot be more than 30 characters']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot be more than 200 characters']
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
  // QR code for this label
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
LabelSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create index for faster searching
LabelSchema.index({ name: 'text', description: 'text' });
LabelSchema.index({ group: 1 });

module.exports = mongoose.model('Label', LabelSchema);
