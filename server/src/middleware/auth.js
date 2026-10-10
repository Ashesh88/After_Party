const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Always fetch latest state from DB to prevent stale roomId desync
    const user = await User.findById(decoded.userId).select('roomId displayName email avatar friendId');
    if (!user) {
      return res.status(401).json({ message: 'User not found or deleted' });
    }

    // Auto-generate friendId for existing users if missing
    if (!user.friendId) {
      user.friendId = Math.floor(10000000 + Math.random() * 90000000).toString();
      await user.save();
    }

    req.user = {
      userId: user._id.toString(),
      roomId: user.roomId ? user.roomId.toString() : null,
      friendId: user.friendId,
      displayName: user.displayName,
    };
    req.currentUser = user;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = auth;
