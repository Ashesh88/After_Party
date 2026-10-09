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
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

roomSchema.statics.generateInviteCode = function () {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

roomSchema.virtual('isFull').get(function () {
  return this.members.length >= 2;
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
