const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'business'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'trialing'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  trialEndsAt: {
    type: Date
  },
  canceledAt: {
    type: Date
  },
  // Payment provider details
  paymentProvider: {
    type: String,
    enum: ['stripe', 'paypal', null],
    default: null
  },
  paymentProviderId: {
    type: String
  },
  // Billing details
  billingDetails: {
    name: String,
    email: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
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
SubscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Helper method to check if subscription is active
SubscriptionSchema.methods.isActive = function() {
  return this.status === 'active' || this.status === 'trialing';
};

// Helper method to check if subscription is in trial
SubscriptionSchema.methods.isInTrial = function() {
  return this.status === 'trialing' && this.trialEndsAt > new Date();
};

// Helper method to get days left in trial
SubscriptionSchema.methods.getTrialDaysLeft = function() {
  if (!this.isInTrial()) return 0;
  
  const now = new Date();
  const trialEnd = new Date(this.trialEndsAt);
  const diffTime = Math.abs(trialEnd - now);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model('Subscription', SubscriptionSchema);
