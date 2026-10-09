const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const User = require('../models/User');
const { sendPushToRoom } = require('./pushService');

const scheduledJobs = new Map();

const scheduleReminder = (reminder) => {
  if (scheduledJobs.has(reminder._id.toString())) {
    cancelReminder(reminder._id.toString());
  }

  if (reminder.recurring && reminder.cronExpression) {
    const job = cron.schedule(reminder.cronExpression, async () => {
      await fireReminder(reminder._id);
    });
    scheduledJobs.set(reminder._id.toString(), job);
  } else if (reminder.scheduledAt && new Date(reminder.scheduledAt) > new Date()) {
    // Schedule one-off (could use setTimeout, but node-cron is easier if we just parse to cron)
    const date = new Date(reminder.scheduledAt);
    const cronStr = `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
    
    const job = cron.schedule(cronStr, async () => {
      await fireReminder(reminder._id);
      // Auto-deactivate one-off reminders
      await Reminder.findByIdAndUpdate(reminder._id, { isActive: false });
      cancelReminder(reminder._id.toString());
    });
    scheduledJobs.set(reminder._id.toString(), job);
  }
};

const cancelReminder = (reminderId) => {
  if (scheduledJobs.has(reminderId)) {
    scheduledJobs.get(reminderId).stop();
    scheduledJobs.delete(reminderId);
  }
};

const fireReminder = async (reminderId) => {
  try {
    const reminder = await Reminder.findById(reminderId);
    if (!reminder || !reminder.isActive) return;

    reminder.lastFiredAt = new Date();
    await reminder.save();

    await sendPushToRoom(reminder.roomId, {
      title: reminder.title,
      body: reminder.description || 'Reminder from After Party',
      data: { type: 'reminder', reminderId: reminder._id },
    });
    
  } catch (error) {
    console.error('Error firing reminder:', error);
  }
};

const initReminders = async () => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      // Defer until connection opens
      mongoose.connection.once('open', async () => {
        try {
          const activeReminders = await Reminder.find({ isActive: true });
          activeReminders.forEach(reminder => scheduleReminder(reminder));
          console.log(`[Reminders] Initialized ${activeReminders.length} active reminders`);
        } catch (e) {
          console.error('Error loading reminders on open:', e);
        }
      });
      return;
    }
    const activeReminders = await Reminder.find({ isActive: true });
    activeReminders.forEach(reminder => scheduleReminder(reminder));
    console.log(`[Reminders] Initialized ${activeReminders.length} active reminders`);
  } catch (error) {
    console.error('Error initializing reminders:', error);
  }
};

module.exports = {
  scheduleReminder,
  cancelReminder,
  initReminders,
};
