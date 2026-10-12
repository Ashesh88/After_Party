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
      enum: ['text', 'image', 'emoji', 'audio', 'whisper', 'game_invite'],
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
    gameInvite: {
      game: { type: String, default: 'chess' },
      sessionCode: { type: String },
      senderId: { type: String },
      senderName: { type: String },
      targetUserId: { type: String },
      targetUserName: { type: String },
      expiresAt: { type: Date },
      status: { type: String, enum: ['pending', 'accepted', 'expired', 'declined'], default: 'pending' },
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
