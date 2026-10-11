const express = require('express');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const Message = require('../models/Message');
const User = require('../models/User');
const Room = require('../models/Room');

const router = express.Router();

router.use(auth);

// ==========================================
// 1. GET ALL CONVERSATIONS (WhatsApp Style list)
// ==========================================
// Returns direct conversations (friends) & room spaces with last messages
router.get('/conversations', async (req, res, next) => {
  try {
    const myId = req.user.userId;
    const user = await User.findById(myId)
      .populate('friends', 'displayName email avatar friendId lastSeen roomId')
      .populate('savedRooms.roomId', 'inviteCode members name moodTheme')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 1. Build Direct Messages Conversations List
    const friends = user.friends || [];
    const directConversations = await Promise.all(
      friends.map(async (friend) => {
        const friendId = friend._id;

        // Find latest message between myId and friendId
        const lastMsg = await Message.findOne({
          $or: [
            { senderId: myId, recipientId: friendId },
            { senderId: friendId, recipientId: myId },
          ],
        })
          .sort({ createdAt: -1 })
          .lean();

        // Count unread messages sent by friend to me
        const unreadCount = await Message.countDocuments({
          senderId: friendId,
          recipientId: myId,
          seen: false,
        });

        return {
          id: friendId.toString(),
          type: 'direct',
          user: {
            _id: friend._id,
            displayName: friend.displayName,
            avatar: friend.avatar || '',
            friendId: friend.friendId,
            lastSeen: friend.lastSeen,
          },
          lastMessage: lastMsg
            ? {
                _id: lastMsg._id,
                content: lastMsg.content,
                type: lastMsg.type,
                senderId: lastMsg.senderId,
                createdAt: lastMsg.createdAt,
                seen: lastMsg.seen,
              }
            : null,
          unreadCount,
          updatedAt: lastMsg ? lastMsg.createdAt : new Date(0),
        };
      })
    );

    // Sort DMs by most recent message
    directConversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    // 2. Build Room Conversations List
    const roomList = [];
    const processedRoomIds = new Set();

    // Check active room first
    if (user.roomId) {
      const activeRoom = await Room.findById(user.roomId).populate('members', 'displayName avatar').lean();
      if (activeRoom) {
        processedRoomIds.add(activeRoom._id.toString());
        const lastMsg = await Message.findOne({ roomId: activeRoom._id })
          .sort({ createdAt: -1 })
          .populate('senderId', 'displayName')
          .lean();

        roomList.push({
          id: activeRoom._id.toString(),
          type: 'room',
          name: activeRoom.name || `Room ${activeRoom.inviteCode}`,
          inviteCode: activeRoom.inviteCode,
          members: activeRoom.members || [],
          isActive: true,
          lastMessage: lastMsg
            ? {
                _id: lastMsg._id,
                content: lastMsg.content,
                type: lastMsg.type,
                senderName: lastMsg.senderId?.displayName || 'Member',
                senderId: lastMsg.senderId?._id || lastMsg.senderId,
                createdAt: lastMsg.createdAt,
              }
            : null,
          updatedAt: lastMsg ? lastMsg.createdAt : activeRoom.createdAt,
        });
      }
    }

    // Include saved rooms
    if (user.savedRooms && user.savedRooms.length > 0) {
      for (const sr of user.savedRooms) {
        const rObj = sr.roomId;
        if (!rObj || !rObj._id) continue;
        const rIdStr = rObj._id.toString();
        if (processedRoomIds.has(rIdStr)) continue;
        processedRoomIds.add(rIdStr);

        const lastMsg = await Message.findOne({ roomId: rObj._id })
          .sort({ createdAt: -1 })
          .populate('senderId', 'displayName')
          .lean();

        roomList.push({
          id: rIdStr,
          type: 'room',
          name: sr.customName || rObj.name || `Space ${rObj.inviteCode}`,
          inviteCode: rObj.inviteCode,
          members: rObj.members || [],
          isActive: false,
          lastMessage: lastMsg
            ? {
                _id: lastMsg._id,
                content: lastMsg.content,
                type: lastMsg.type,
                senderName: lastMsg.senderId?.displayName || 'Member',
                senderId: lastMsg.senderId?._id || lastMsg.senderId,
                createdAt: lastMsg.createdAt,
              }
            : null,
          updatedAt: lastMsg ? lastMsg.createdAt : new Date(0),
        });
      }
    }

    res.json({
      directConversations,
      roomConversations: roomList,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 2. DIRECT 1-ON-1 MESSAGES ENDPOINTS
// ==========================================

// GET /api/messages/direct/:friendId - Load direct chat history
router.get('/direct/:friendId', async (req, res, next) => {
  try {
    const myId = req.user.userId;
    const friendId = req.params.friendId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 60;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { senderId: myId, recipientId: friendId },
        { senderId: friendId, recipientId: myId },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'displayName avatar')
      .populate('recipientId', 'displayName avatar');

    // Auto mark friend's messages as seen
    await Message.updateMany(
      { senderId: friendId, recipientId: myId, seen: false },
      { $set: { seen: true } }
    );

    res.json({
      messages,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/messages/direct - Send 1-on-1 text or emoji message
router.post('/direct', async (req, res, next) => {
  try {
    const { recipientId, type = 'text', content, audioUrl, audioDuration } = req.body;
    const myId = req.user.userId;

    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient is required' });
    }

    if ((!content || !content.trim()) && !audioUrl) {
      return res.status(400).json({ message: 'Content or audio is required' });
    }

    const message = new Message({
      senderId: myId,
      recipientId,
      type: audioUrl ? 'audio' : type,
      content: content || (audioUrl ? 'Voice note' : ''),
      audioUrl: audioUrl || undefined,
      audioDuration: Number(audioDuration) || 0,
      seen: false,
    });

    await message.save();
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'displayName avatar')
      .populate('recipientId', 'displayName avatar');

    // Emit live via socket to recipient and sender
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${recipientId}`).emit('chat:direct-message', populatedMessage);
      io.to(`user:${myId}`).emit('chat:direct-message', populatedMessage);

      // Notification to recipient
      io.to(`user:${recipientId}`).emit('chat:notification', {
        senderId: myId,
        senderName: populatedMessage.senderId?.displayName || 'Friend',
        senderAvatar: populatedMessage.senderId?.avatar || '',
        content: message.type === 'audio' ? 'Voice note' : (message.content || 'New message'),
        type: message.type,
        timestamp: message.createdAt,
        isDirect: true,
      });
    }

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/messages/direct/:friendId/seen - Mark conversation as seen
router.patch('/direct/:friendId/seen', async (req, res, next) => {
  try {
    const myId = req.user.userId;
    const friendId = req.params.friendId;

    await Message.updateMany(
      { senderId: friendId, recipientId: myId, seen: false },
      { $set: { seen: true } }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${friendId}`).emit('chat:direct-seen', { seenBy: myId });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/messages/direct/:friendId - Clear direct chat history
router.delete('/direct/:friendId', async (req, res, next) => {
  try {
    const myId = req.user.userId;
    const friendId = req.params.friendId;

    await Message.deleteMany({
      $or: [
        { senderId: myId, recipientId: friendId },
        { senderId: friendId, recipientId: myId },
      ],
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${friendId}`).emit('chat:direct-vanish', { senderId: myId });
    }

    res.json({ message: 'Conversation cleared successfully' });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 3. ROOM GROUP MESSAGES ENDPOINTS
// ==========================================

// Helper to resolve active roomId
const resolveRoomId = (req) => {
  return req.params.roomId || req.query.roomId || req.user.roomId || null;
};

// GET /api/messages or /api/messages/room/:roomId - Fetch room messages
router.get('/', async (req, res, next) => {
  try {
    const roomId = resolveRoomId(req);
    if (!roomId) {
      return res.status(403).json({ message: 'You must specify or be in a room' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 60;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ roomId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'displayName avatar');

    res.json({
      messages,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/room/:roomId', async (req, res, next) => {
  try {
    const roomId = req.params.roomId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 60;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ roomId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'displayName avatar');

    res.json({
      messages,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/messages - Send room message (text/emoji)
router.post('/', async (req, res, next) => {
  try {
    const { type = 'text', content, roomId: bodyRoomId } = req.body;
    const roomId = bodyRoomId || req.user.roomId;

    if (!roomId) {
      return res.status(403).json({ message: 'Room ID is required' });
    }

    if (!['text', 'emoji'].includes(type)) {
      return res.status(400).json({ message: 'Invalid message type for this endpoint' });
    }

    const message = new Message({
      roomId,
      senderId: req.user.userId,
      type,
      content,
    });

    await message.save();
    const populatedMessage = await Message.findById(message._id).populate('senderId', 'displayName avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`room:${roomId}`).emit('chat:message', populatedMessage);
    }

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    next(error);
  }
});

// POST /api/messages/image (file upload for direct or room)
router.post('/image', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    const recipientId = req.body.recipientId || null;
    const roomId = req.body.roomId || (!recipientId ? req.user.roomId : null);

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let mimeType = req.file.mimetype;
    const imageUrl = `data:${mimeType};base64,${b64}`;

    const message = new Message({
      roomId,
      recipientId,
      senderId: req.user.userId,
      type: 'image',
      imageUrl,
      content: 'Photo',
    });

    await message.save();
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'displayName avatar')
      .populate('recipientId', 'displayName avatar');

    const io = req.app.get('io');
    if (io) {
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('chat:direct-message', populatedMessage);
        io.to(`user:${req.user.userId}`).emit('chat:direct-message', populatedMessage);
      } else if (roomId) {
        io.to(`room:${roomId}`).emit('chat:message', populatedMessage);
      }
    }

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    next(error);
  }
});

// POST /api/messages/audio (voice note upload for direct or room)
router.post('/audio', async (req, res, next) => {
  try {
    const { audioUrl, duration, recipientId, roomId: bodyRoomId } = req.body;
    if (!audioUrl) {
      return res.status(400).json({ message: 'Audio data is required' });
    }

    const targetRecipientId = recipientId || null;
    const targetRoomId = bodyRoomId || (!targetRecipientId ? req.user.roomId : null);

    const message = new Message({
      roomId: targetRoomId,
      recipientId: targetRecipientId,
      senderId: req.user.userId,
      type: 'audio',
      audioUrl,
      audioDuration: Number(duration) || 0,
      content: 'Voice note',
    });

    await message.save();
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'displayName avatar')
      .populate('recipientId', 'displayName avatar');

    const io = req.app.get('io');
    if (io) {
      if (targetRecipientId) {
        io.to(`user:${targetRecipientId}`).emit('chat:direct-message', populatedMessage);
        io.to(`user:${req.user.userId}`).emit('chat:direct-message', populatedMessage);
      } else if (targetRoomId) {
        io.to(`room:${targetRoomId}`).emit('chat:message', populatedMessage);
      }
    }

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/messages/:id/seen - Mark single message as seen
router.patch('/:id/seen', async (req, res, next) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { seen: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json({ message });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/messages/vanish - Vanish room chat history
router.delete('/vanish', async (req, res, next) => {
  try {
    const roomId = resolveRoomId(req);
    if (!roomId) {
      return res.status(400).json({ message: 'Room ID is required' });
    }

    await Message.deleteMany({ roomId });
    res.json({ message: 'All room messages vanished successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
