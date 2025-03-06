const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a reminder title'],
    trim: true,
    maxlength: [100, 'Reminder title cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Please specify an item']
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  reminderDate: {
    type: Date,
    required: [true, 'Please specify a reminder date']
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringInterval: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedDate: {
    type: Date
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  reminderType: {
    type: String,
    enum: ['maintenance', 'warranty', 'service', 'replacement', 'other'],
    default: 'maintenance'
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
ReminderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create index for faster searching
ReminderSchema.index({ reminderDate: 1 });
ReminderSchema.index({ item: 1 });
ReminderSchema.index({ group: 1 });

module.exports = mongoose.model('Reminder', ReminderSchema);
