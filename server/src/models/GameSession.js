const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    gameType: {
      type: String,
      enum: ['tic-tac-toe', 'truth-or-dare', 'quiz', 'would-you-rather'],
      required: true,
    },
    state: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    scores: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    status: {
      type: String,
      enum: ['active', 'finished'],
      default: 'active',
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

const GameSession = mongoose.model('GameSession', gameSessionSchema);
module.exports = GameSession;
