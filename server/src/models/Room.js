const mongoose = require('mongoose');
const crypto = require('crypto');

const roomSchema = new mongoose.Schema(
  {
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      length: 8,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    moodTheme: {
      current: {
        type: String,
        enum: ['love', 'horny', 'angry', 'just_friends'],
        default: 'love',
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      updatedByName: {
        type: String,
        default: 'Couple',
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
      history: [
        {
          mood: {
            type: String,
            enum: ['love', 'horny', 'angry', 'just_friends'],
            required: true,
          },
          setBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          setName: {
            type: String,
            required: true,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

roomSchema.statics.generateInviteCode = function () {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

roomSchema.virtual('isFull').get(function () {
  return this.members.length >= 50;
});

// Pre-validate to ensure invite code exists
roomSchema.pre('validate', function(next) {
  if (!this.inviteCode) {
    this.inviteCode = this.constructor.generateInviteCode();
  }
  next();
});

const Room = mongoose.model('Room', roomSchema);
module.exports = Room;
