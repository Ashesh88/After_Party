const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    scheduledAt: {
      type: Date,
    },
    recurring: {
      type: Boolean,
      default: false,
    },
    cronExpression: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastFiredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Reminder = mongoose.model('Reminder', reminderSchema);
module.exports = Reminder;
