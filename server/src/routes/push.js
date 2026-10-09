const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

router.use(auth);

// POST /api/push/subscribe
router.post('/subscribe', async (req, res, next) => {
  try {
    const { subscription } = req.body;
    
    if (!subscription) {
      return res.status(400).json({ message: 'Subscription object is required' });
    }

    await User.findByIdAndUpdate(req.user.userId, { pushSubscription: subscription });
    
    res.json({ message: 'Push subscription updated successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, { pushSubscription: null });
    res.json({ message: 'Push subscription removed' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
