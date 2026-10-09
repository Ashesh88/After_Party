const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
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
    category: {
      type: String,
      enum: ['travel', 'health', 'relationship', 'finance', 'other'],
      default: 'other',
    },
    dueDate: {
      type: Date,
    },
    owner: {
      type: String,
      enum: ['me', 'partner', 'both'],
      default: 'both',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    streak: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const Goal = mongoose.model('Goal', goalSchema);
module.exports = Goal;
