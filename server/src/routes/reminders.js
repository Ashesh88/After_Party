const express = require('express');
const auth = require('../middleware/auth');
const Reminder = require('../models/Reminder');
const { scheduleReminder, cancelReminder } = require('../services/reminderService');

const router = express.Router();

router.use(auth);

const requireRoom = (req, res, next) => {
  if (!req.user.roomId) {
    return res.status(403).json({ message: 'You must be in a room' });
  }
  next();
};

// GET /api/reminders
router.get('/', requireRoom, async (req, res, next) => {
  try {
    const reminders = await Reminder.find({ roomId: req.user.roomId }).sort({ createdAt: -1 });
    res.json({ reminders });
  } catch (error) {
    next(error);
  }
});

// POST /api/reminders
router.post('/', requireRoom, async (req, res, next) => {
  try {
    const reminder = new Reminder({
      ...req.body,
      roomId: req.user.roomId,
      createdBy: req.user.userId,
    });
    
    await reminder.save();
    
    if (reminder.isActive) {
      scheduleReminder(reminder);
    }
    
    res.status(201).json({ reminder });
  } catch (error) {
    next(error);
  }
});

// PUT /api/reminders/:id/toggle
router.put('/:id/toggle', requireRoom, async (req, res, next) => {
  try {
    const reminder = await Reminder.findOne({ _id: req.params.id, roomId: req.user.roomId });
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });

    reminder.isActive = !reminder.isActive;
    await reminder.save();

    if (reminder.isActive) {
      scheduleReminder(reminder);
    } else {
      cancelReminder(reminder._id.toString());
    }

    res.json({ reminder });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/reminders/:id
router.delete('/:id', requireRoom, async (req, res, next) => {
  try {
    const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, roomId: req.user.roomId });
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    
    cancelReminder(reminder._id.toString());
    
    res.json({ message: 'Reminder deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
