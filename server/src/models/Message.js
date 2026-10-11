const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'emoji', 'audio'],
      default: 'text',
    },
    content: {
      type: String,
    },
    imageUrl: {
      type: String,
    },
    audioUrl: {
      type: String,
    },
    audioDuration: {
      type: Number,
      default: 0,
    },
    seen: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, seen: 1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
