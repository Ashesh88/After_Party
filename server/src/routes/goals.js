const express = require('express');
const auth = require('../middleware/auth');
const Goal = require('../models/Goal');

const router = express.Router();

router.use(auth);

const requireRoom = (req, res, next) => {
  if (!req.user.roomId) {
    return res.status(403).json({ message: 'You must be in a room' });
  }
  next();
};

// GET /api/goals/stats
router.get('/stats', requireRoom, async (req, res, next) => {
  try {
    const goals = await Goal.find({ roomId: req.user.roomId });
    
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.progress === 100).length;
    const activeStreaks = goals.reduce((acc, curr) => acc + (curr.streak || 0), 0);

    res.json({ totalGoals, completedGoals, activeStreaks });
  } catch (error) {
    next(error);
  }
});

// GET /api/goals
router.get('/', requireRoom, async (req, res, next) => {
  try {
    const goals = await Goal.find({ roomId: req.user.roomId }).sort({ createdAt: -1 });
    res.json({ goals });
  } catch (error) {
    next(error);
  }
});

// POST /api/goals
router.post('/', requireRoom, async (req, res, next) => {
  try {
    const goal = new Goal({
      ...req.body,
      roomId: req.user.roomId,
      createdBy: req.user.userId,
    });
    
    await goal.save();
    res.status(201).json({ goal });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/goals/:id
router.patch('/:id', requireRoom, async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, roomId: req.user.roomId },
      req.body,
      { new: true }
    );
    
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ goal });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/goals/:id/progress
router.patch('/:id/progress', requireRoom, async (req, res, next) => {
  try {
    const { progress } = req.body;
    const updateData = { progress };
    
    if (progress >= 100) {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, roomId: req.user.roomId },
      updateData,
      { new: true }
    );
    
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ goal });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/goals/:id
router.delete('/:id', requireRoom, async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, roomId: req.user.roomId });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
