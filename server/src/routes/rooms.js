const express = require('express');
const auth = require('../middleware/auth');
const Room = require('../models/Room');
const User = require('../models/User');

const router = express.Router();

router.use(auth);

// POST /api/rooms/create
router.post('/create', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.roomId) {
      return res.status(400).json({ message: 'User is already in a room' });
    }

    const room = new Room({
      members: [user._id],
    });
    
    await room.save();
    
    user.roomId = room._id;
    await user.save();

    // Re-issue a token might be better here, but we'll return the room
    res.status(201).json({ room });
  } catch (error) {
    next(error);
  }
});

// POST /api/rooms/join
router.post('/join', async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    const user = await User.findById(req.user.userId);
    if (user.roomId) {
      return res.status(400).json({ message: 'User is already in a room' });
    }

    const room = await Room.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.isFull) {
      return res.status(400).json({ message: 'Room is already full' });
    }

    if (!room.members.includes(user._id)) {
      room.members.push(user._id);
      await room.save();
    }

    user.roomId = room._id;
    await user.save();

    res.json({ room });
  } catch (error) {
    next(error);
  }
});

// GET /api/rooms/mine
router.get('/mine', async (req, res, next) => {
  try {
    if (!req.user.roomId) {
      return res.status(404).json({ message: 'User is not in a room' });
    }

    const room = await Room.findById(req.user.roomId).populate('members', 'displayName email avatar');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json({ room });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/rooms/leave
router.delete('/leave', async (req, res, next) => {
  try {
    if (!req.user.roomId) {
      return res.status(400).json({ message: 'User is not in a room' });
    }

    const user = await User.findById(req.user.userId);
    const roomId = user.roomId;
    
    user.roomId = null;
    await user.save();

    const room = await Room.findById(roomId);
    if (room) {
      room.members = room.members.filter(id => id.toString() !== user._id.toString());
      if (room.members.length === 0) {
        await Room.findByIdAndDelete(roomId);
      } else {
        await room.save();
      }
    }

    res.json({ message: 'Left room successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
