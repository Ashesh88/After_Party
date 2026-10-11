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

// POST /api/push/test - Test push delivery to current user
router.post('/test', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.pushSubscription) {
      return res.status(400).json({ 
        message: 'No push subscription found on your account. Please enable notifications in your browser first.' 
      });
    }

    const pushService = require('../services/pushService');
    const sent = await pushService.sendPushToUser(user, {
      title: 'After Party Push Test',
      body: 'Push notifications are working perfectly even when your app is closed!',
      icon: '/icon-192x192.png',
      data: { url: '/dashboard' },
      tag: 'test-push',
    });

    if (sent) {
      res.json({ message: 'Test push notification sent successfully!' });
    } else {
      res.status(500).json({ message: 'Failed to dispatch push notification. Please check subscription status.' });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
