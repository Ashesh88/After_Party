const express = require('express');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const Message = require('../models/Message');

const router = express.Router();

router.use(auth);

// Helper to ensure user is in a room
const requireRoom = (req, res, next) => {
  if (!req.user.roomId) {
    return res.status(403).json({ message: 'You must be in a room' });
  }
  next();
};

// GET /api/messages
router.get('/', requireRoom, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ roomId: req.user.roomId })
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

// POST /api/messages (text/emoji)
router.post('/', requireRoom, async (req, res, next) => {
  try {
    const { type, content } = req.body;
    
    if (!['text', 'emoji'].includes(type)) {
      return res.status(400).json({ message: 'Invalid message type for this endpoint' });
    }

    const message = new Message({
      roomId: req.user.roomId,
      senderId: req.user.userId,
      type,
      content,
    });

    await message.save();
    
    const populatedMessage = await Message.findById(message._id).populate('senderId', 'displayName avatar');

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    next(error);
  }
});

// POST /api/messages/image (file upload)
router.post('/image', requireRoom, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    // In a real app, upload to S3/Cloudinary and get URL.
    // For this, we'll store as base64 data URI to be self-contained
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let mimeType = req.file.mimetype;
    const imageUrl = `data:${mimeType};base64,${b64}`;

    const message = new Message({
      roomId: req.user.roomId,
      senderId: req.user.userId,
      type: 'image',
      imageUrl,
    });

    await message.save();
    
    const populatedMessage = await Message.findById(message._id).populate('senderId', 'displayName avatar');

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/messages/:id/seen
router.patch('/:id/seen', requireRoom, async (req, res, next) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, roomId: req.user.roomId },
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

// DELETE /api/messages/vanish (Vanish all chat history)
router.delete('/vanish', requireRoom, async (req, res, next) => {
  try {
    await Message.deleteMany({ roomId: req.user.roomId });
    res.json({ message: 'All chat messages vanished successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
