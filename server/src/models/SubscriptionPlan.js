const mongoose = require('mongoose');

const SubscriptionPlanSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    trim: true
  },
  interval: {
    type: String,
    enum: ['month', 'year'],
    default: 'month'
  },
  features: [{
    type: String,
    trim: true
  }],
  limits: {
    items: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    users: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    locations: {
      type: Number,
      default: -1 // -1 means unlimited
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
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
SubscriptionPlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
