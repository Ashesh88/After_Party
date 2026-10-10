const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Room = require('../models/Room');

const router = express.Router();
router.use(auth);

// GET /api/friends - List all friends
router.get('/', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).populate(
      'friends',
      'displayName email avatar friendId roomId'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ friends: user.friends || [] });
  } catch (error) {
    next(error);
  }
});

// POST /api/friends/add - Add friend by PUBG-style Unique ID
router.post('/add', async (req, res, next) => {
  try {
    const rawId = (req.body.friendId || '').toString().trim();
    if (!rawId) {
      return res.status(400).json({ message: 'Unique Friend ID is required' });
    }

    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (currentUser.friendId === rawId) {
      return res.status(400).json({ message: 'You cannot add yourself as a friend' });
    }

    // Find target friend by friendId (or email if entered)
    const targetFriend = await User.findOne({
      $or: [
        { friendId: rawId },
        { email: rawId.toLowerCase() }
      ]
    }).select('displayName email avatar friendId roomId friends');

    if (!targetFriend) {
      return res.status(404).json({ message: 'Player with this ID was not found. Check the ID and try again.' });
    }

    // Check if already friends
    const isAlreadyFriend = currentUser.friends && currentUser.friends.some(
      (fId) => fId.toString() === targetFriend._id.toString()
    );

    if (isAlreadyFriend) {
      return res.status(400).json({ message: `${targetFriend.displayName} is already in your friends list` });
    }

    // Add mutual friendship
    currentUser.friends = currentUser.friends || [];
    currentUser.friends.push(targetFriend._id);
    await currentUser.save();

    targetFriend.friends = targetFriend.friends || [];
    if (!targetFriend.friends.some((fId) => fId.toString() === currentUser._id.toString())) {
      targetFriend.friends.push(currentUser._id);
      await targetFriend.save();
    }

    // Notify target friend in real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${targetFriend._id}`).emit('friend:added', {
        friend: {
          _id: currentUser._id,
          displayName: currentUser.displayName,
          avatar: currentUser.avatar,
          friendId: currentUser.friendId,
        },
      });
    }

    res.json({
      message: `Added ${targetFriend.displayName} as a friend!`,
      friend: {
        _id: targetFriend._id,
        displayName: targetFriend.displayName,
        avatar: targetFriend.avatar,
        friendId: targetFriend.friendId,
        roomId: targetFriend.roomId,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/friends/:id - Remove a friend
router.delete('/:id', async (req, res, next) => {
  try {
    const friendIdToRemove = req.params.id;
    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    currentUser.friends = (currentUser.friends || []).filter(
      (fId) => fId.toString() !== friendIdToRemove
    );
    await currentUser.save();

    // Also remove from other user
    await User.findByIdAndUpdate(friendIdToRemove, {
      $pull: { friends: currentUser._id }
    });

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/friends/invite - Send PUBG-style Room Invite to friend
router.post('/invite', async (req, res, next) => {
  try {
    const { friendUserId } = req.body;
    if (!friendUserId) {
      return res.status(400).json({ message: 'Target friend ID is required' });
    }

    const currentUser = await User.findById(req.user.userId);
    if (!currentUser || !currentUser.roomId) {
      return res.status(400).json({ message: 'You must be in a room to invite friends' });
    }

    const room = await Room.findById(currentUser.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${friendUserId}`).emit('room:invite', {
        from: {
          _id: currentUser._id,
          displayName: currentUser.displayName,
          avatar: currentUser.avatar,
          friendId: currentUser.friendId,
        },
        room: {
          _id: room._id,
          inviteCode: room.inviteCode,
        },
      });
    }

    res.json({
      message: `Room invite sent to friend!`,
      inviteCode: room.inviteCode,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
