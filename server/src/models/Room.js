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
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      default: 'Couples Sanctuary',
      trim: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    wallpaper: {
      type: String,
      default: 'midnight',
    },
    moodTheme: {
      current: {
        type: String,
        enum: ['love', 'horny', 'angry', 'just_friends', 'sad'],
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
            enum: ['love', 'horny', 'angry', 'just_friends', 'sad'],
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
    plannedEvent: {
      title: {
        type: String,
        default: 'Midnight Movie & Cocktails',
      },
      targetDate: {
        type: Date,
        default: () => new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000 + 25 * 60 * 1000),
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      updatedByName: {
        type: String,
        default: 'Partner',
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
    weeklyMemories: [
      {
        weekNumber: {
          type: Number,
          required: true,
        },
        year: {
          type: Number,
          required: true,
        },
        caption: {
          type: String,
          required: true,
          trim: true,
        },
        imageUrl: {
          type: String,
          default: '',
        },
        prompt: {
          type: String,
          default: 'Best moment this week',
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        addedByName: {
          type: String,
          default: 'Partner',
        },
        likes: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
