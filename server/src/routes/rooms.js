const express = require('express');
const auth = require('../middleware/auth');
const Room = require('../models/Room');
const User = require('../models/User');

const router = express.Router();

router.use(auth);

// Helper to clean up membership when leaving or switching rooms
async function leaveCurrentRoom(user, io) {
  if (!user.roomId) return;
  const oldRoomId = user.roomId;
  try {
    const oldRoom = await Room.findById(oldRoomId);
    if (oldRoom) {
      oldRoom.members = oldRoom.members.filter(id => id.toString() !== user._id.toString());
      if (oldRoom.members.length === 0) {
        await Room.findByIdAndDelete(oldRoomId);
      } else {
        await oldRoom.save();
        if (io) {
          io.to(`room:${oldRoomId}`).emit('room:member-left', {
            userId: user._id.toString(),
            displayName: user.displayName,
          });
        }
      }
    }
  } catch (err) {
    console.error('Error leaving old room:', err);
  }
  user.roomId = null;
  await user.save();
}

// POST /api/rooms/create
router.post('/create', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const io = req.app.get('io');

    // If user is already in a room, smoothly leave the old one first
    if (user.roomId) {
      await leaveCurrentRoom(user, io);
    }

    const room = new Room({
      members: [user._id],
      host: user._id,
    });
    await room.save();

    user.roomId = room._id;
    await user.save();

    await room.populate('members', 'displayName email avatar friendId lastSeen');
    await room.populate('host', 'displayName email avatar friendId lastSeen');

    res.status(201).json({ room });
  } catch (error) {
    next(error);
  }
});

// POST /api/rooms/join
router.post('/join', async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    const targetRoom = await Room.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
    if (!targetRoom) {
      return res.status(404).json({ message: 'Room not found with code: ' + inviteCode.trim().toUpperCase() });
    }

    if (targetRoom.isLocked && !targetRoom.members.some(m => m.toString() === req.user.userId.toString())) {
      return res.status(403).json({ message: 'This room is currently locked by the host' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const io = req.app.get('io');

    // If already in another room, leave that room smoothly
    if (user.roomId && user.roomId.toString() !== targetRoom._id.toString()) {
      await leaveCurrentRoom(user, io);
    }

    // Add user to target room if not already a member
    const alreadyMember = targetRoom.members.some(m => m.toString() === user._id.toString());
    if (!alreadyMember) {
      targetRoom.members.push(user._id);
    }
    // Set host if not set
    if (!targetRoom.host) {
      targetRoom.host = targetRoom.members[0] || user._id;
    }
    await targetRoom.save();

    user.roomId = targetRoom._id;
    await user.save();

    await targetRoom.populate('members', 'displayName email avatar friendId lastSeen');
    await targetRoom.populate('host', 'displayName email avatar friendId lastSeen');

    // Notify room members in real-time
    if (io) {
      io.to(`room:${targetRoom._id}`).emit('room:member-joined', {
        user: {
          _id: user._id.toString(),
          displayName: user.displayName,
          avatar: user.avatar,
          friendId: user.friendId,
          lastSeen: user.lastSeen,
        },
        room: targetRoom,
      });
    }

    res.json({ room: targetRoom });
  } catch (error) {
    next(error);
  }
});

// GET /api/rooms/mine
router.get('/mine', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.roomId) {
      return res.status(404).json({ message: 'User is not in a room' });
    }

    const room = await Room.findById(user.roomId)
      .populate('members', 'displayName email avatar friendId lastSeen')
      .populate('host', 'displayName email avatar friendId lastSeen');

    if (!room) {
      // Clean up orphaned roomId
      user.roomId = null;
      await user.save();
      return res.status(404).json({ message: 'Room no longer exists' });
    }

    // Ensure room has a host assigned
    let roomDirty = false;
    if (!room.host && room.members.length > 0) {
      room.host = room.members[0]._id;
      roomDirty = true;
    }

    // Ensure current user is in members array
    const isInMembers = room.members.some(m => m._id.toString() === user._id.toString());
    if (!isInMembers) {
      room.members.push(user._id);
      roomDirty = true;
    }

    if (roomDirty) {
      await room.save();
      await room.populate('members', 'displayName email avatar friendId lastSeen');
      await room.populate('host', 'displayName email avatar friendId lastSeen');
    }

    res.json({ room });
  } catch (error) {
    next(error);
  }
});

// POST /api/rooms/kick (Host kicks member)
router.post('/kick', async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID is required' });
    }

    const hostUser = await User.findById(req.user.userId);
    if (!hostUser || !hostUser.roomId) {
      return res.status(404).json({ message: 'You are not in a room' });
    }

    const room = await Room.findById(hostUser.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Verify host authority
    const currentHostId = (room.host || room.members[0])?.toString();
    if (currentHostId !== hostUser._id.toString()) {
      return res.status(403).json({ message: 'Only the room host can remove members' });
    }

    if (targetUserId.toString() === hostUser._id.toString()) {
      return res.status(400).json({ message: 'Host cannot kick themselves from room' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Remove from room members
    room.members = room.members.filter(id => id.toString() !== targetUserId.toString());
    await room.save();

    // Detach target user's roomId
    targetUser.roomId = null;
    await targetUser.save();

    await room.populate('members', 'displayName email avatar friendId lastSeen');
    await room.populate('host', 'displayName email avatar friendId lastSeen');

    const io = req.app.get('io');
    if (io) {
      // Notify the kicked user directly
      io.to(`user:${targetUserId}`).emit('room:kicked', {
        roomId: room._id.toString(),
        message: 'You have been removed from the room by the host',
      });

      // Broadcast to room members
      io.to(`room:${room._id}`).emit('room:member-left', {
        userId: targetUserId.toString(),
        displayName: targetUser.displayName,
        kicked: true,
      });
      io.to(`room:${room._id}`).emit('room:updated', { room });
    }

    res.json({ room, message: `${targetUser.displayName} was removed from the room` });
  } catch (error) {
    next(error);
  }
});

// POST /api/rooms/invite (Invite friend/connection to room)
router.post('/invite', async (req, res, next) => {
  try {
    const { friendUserId } = req.body;
    if (!friendUserId) {
      return res.status(400).json({ message: 'Friend user ID is required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user || !user.roomId) {
      return res.status(400).json({ message: 'You must be in a room to invite members' });
    }

    const room = await Room.findById(user.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const targetUser = await User.findById(friendUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Friend not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${friendUserId}`).emit('room:invite', {
        from: {
          _id: user._id,
          displayName: user.displayName,
          avatar: user.avatar,
          friendId: user.friendId,
        },
        room: {
          _id: room._id.toString(),
          inviteCode: room.inviteCode,
        },
        roomId: room._id.toString(),
        inviteCode: room.inviteCode,
        inviterName: user.displayName,
        inviterAvatar: user.avatar,
      });
    }

    res.json({ message: `Invitation sent to ${targetUser.displayName}` });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/rooms/leave
router.delete('/leave', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.roomId) {
      return res.json({ message: 'Not currently in any room' });
    }

    const io = req.app.get('io');
    await leaveCurrentRoom(user, io);

    res.json({ message: 'Left room successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/rooms/mood
router.get('/mood', async (req, res, next) => {
  try {
    if (!req.user.roomId) {
      return res.status(404).json({ message: 'User is not in a room' });
    }

    const room = await Room.findById(req.user.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const defaultMood = {
      current: 'love',
      updatedByName: 'Couple',
      updatedAt: new Date(),
      history: [],
    };

    res.json({ moodTheme: room.moodTheme || defaultMood });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/rooms/mood
router.patch('/mood', async (req, res, next) => {
  try {
    if (!req.user.roomId) {
      return res.status(404).json({ message: 'User is not in a room' });
    }

    const { mood } = req.body;
    const validMoods = ['love', 'angry', 'just_friends', 'sad', 'horny'];
    if (!mood || !validMoods.includes(mood)) {
      return res.status(400).json({ 
        message: 'Invalid mood theme. Choose from: love, angry, just_friends, sad' 
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const room = await Room.findById(req.user.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.moodTheme) {
      room.moodTheme = {
        current: 'love',
        updatedBy: user._id,
        updatedByName: user.displayName || 'Partner',
        updatedAt: new Date(),
        history: [],
      };
    }

    const setByName = user.displayName || 'Partner';
    const setTime = new Date();

    room.moodTheme.current = mood;
    room.moodTheme.updatedBy = user._id;
    room.moodTheme.updatedByName = setByName;
    room.moodTheme.updatedAt = setTime;

    // Add entry to history (most recent first)
    room.moodTheme.history.unshift({
      mood,
      setBy: user._id,
      setName: setByName,
      createdAt: setTime,
    });

    // Keep last 40 entries
    if (room.moodTheme.history.length > 40) {
      room.moodTheme.history = room.moodTheme.history.slice(0, 40);
    }

    await room.save();

    // Broadcast to partner in real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`room:${room._id}`).emit('mood:update', {
        moodTheme: room.moodTheme,
        changedBy: {
          _id: user._id,
          displayName: setByName,
        },
      });
    }

    res.json({
      moodTheme: room.moodTheme,
      message: `Mood changed to ${mood} by ${setByName}`,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/rooms/event
router.patch('/event', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.roomId) {
      return res.status(404).json({ message: 'User is not in a room' });
    }

    const { title, targetDate } = req.body;
    if (!title || !targetDate) {
      return res.status(400).json({ message: 'Title and target date/time are required' });
    }

    const room = await Room.findById(user.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const parsedDate = new Date(targetDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid target date/time format' });
    }

    room.plannedEvent = {
      title: title.trim(),
      targetDate: parsedDate,
      updatedBy: user._id,
      updatedByName: user.displayName || 'Partner',
      updatedAt: new Date(),
    };

    await room.save();

    // Broadcast live event update to entire room
    const io = req.app.get('io');
    if (io) {
      io.to(`room:${room._id}`).emit('room:event-update', room.plannedEvent);
    }

    res.json({ plannedEvent: room.plannedEvent, message: 'Event updated successfully' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/rooms/settings (Update room name, locked status, wallpaper)
router.patch('/settings', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.roomId) {
      return res.status(404).json({ message: 'User is not in a room' });
    }

    const room = await Room.findById(user.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isHost = (room.host || room.members[0])?.toString() === user._id.toString();
    const { name, isLocked, wallpaper } = req.body;

    if (typeof isLocked === 'boolean') {
      if (!isHost) {
        return res.status(403).json({ message: 'Only the host can lock or unlock the room' });
      }
      room.isLocked = isLocked;
    }

    if (name !== undefined && name.trim()) {
      room.name = name.trim();
    }

    if (wallpaper !== undefined) {
      room.wallpaper = wallpaper;
    }

    await room.save();
    await room.populate('members', 'displayName email avatar friendId lastSeen');
    await room.populate('host', 'displayName email avatar friendId lastSeen');

    const io = req.app.get('io');
    if (io) {
      io.to(`room:${room._id}`).emit('room:updated', { room });
    }

    res.json({ room, message: 'Room settings updated' });
  } catch (error) {
    next(error);
  }
});

// GET /api/rooms/memories (Get weekly memory wall)
router.get('/memories', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.roomId) {
      return res.status(404).json({ message: 'User is not in a room' });
    }

    const room = await Room.findById(user.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json({ memories: room.weeklyMemories || [] });
  } catch (error) {
    next(error);
  }
});

// POST /api/rooms/memories (Add a new weekly memory)
router.post('/memories', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.roomId) {
      return res.status(404).json({ message: 'User is not in a room' });
    }

    const room = await Room.findById(user.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const { caption, imageUrl, prompt } = req.body;
    if (!caption || !caption.trim()) {
      return res.status(400).json({ message: 'Memory caption is required' });
    }

    // Calculate current week number
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((now.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);

    const newMemory = {
      weekNumber,
      year: now.getFullYear(),
      caption: caption.trim(),
      imageUrl: imageUrl || '',
      prompt: prompt || 'Weekly Highlight',
      addedBy: user._id,
      addedByName: user.displayName || 'Partner',
      likes: [user._id],
      createdAt: now,
    };

    room.weeklyMemories.unshift(newMemory);
    await room.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`room:${room._id}`).emit('room:memory-added', { memory: newMemory });
    }

    res.status(201).json({ memory: newMemory, memories: room.weeklyMemories });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/rooms/memories/:id (Delete a weekly memory)
router.delete('/memories/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.roomId) {
      return res.status(404).json({ message: 'User is not in a room' });
    }

    const room = await Room.findById(user.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    room.weeklyMemories = room.weeklyMemories.filter(m => m._id.toString() !== req.params.id);
    await room.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`room:${room._id}`).emit('room:memory-deleted', { memoryId: req.params.id });
    }

    res.json({ message: 'Memory removed successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
