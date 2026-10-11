const webpush = require('web-push');

const DEFAULT_PUBLIC_VAPID_KEY = 'BKKj0P_uorVXq06m3E5IBq9JnQLyHzUorhuEC126ECISna6HUJqcZOFFsxYAj31IRdfn5SpihNpcLfvXM9Ns6Dk';
const DEFAULT_PRIVATE_VAPID_KEY = 'B33iJ-2EFMp1FXrOA5yf-J8aJfCIl400VwReNVRs6JU';
const DEFAULT_VAPID_EMAIL = 'mailto:support@afterparty.app';

let initialized = false;

const initWebPush = () => {
  if (initialized) return;
  
  const publicVapidKey = (process.env.VAPID_PUBLIC_KEY && !process.env.VAPID_PUBLIC_KEY.includes('your_vapid'))
    ? process.env.VAPID_PUBLIC_KEY
    : DEFAULT_PUBLIC_VAPID_KEY;
  const privateVapidKey = (process.env.VAPID_PRIVATE_KEY && !process.env.VAPID_PRIVATE_KEY.includes('your_vapid'))
    ? process.env.VAPID_PRIVATE_KEY
    : DEFAULT_PRIVATE_VAPID_KEY;
  const vapidEmail = (process.env.VAPID_EMAIL && !process.env.VAPID_EMAIL.includes('admin@afterparty.app'))
    ? process.env.VAPID_EMAIL
    : DEFAULT_VAPID_EMAIL;

  try {
    webpush.setVapidDetails(vapidEmail, publicVapidKey, privateVapidKey);
    initialized = true;
    console.log('[Push] Web Push notifications enabled with VAPID');
  } catch (err) {
    console.warn('[Push] VAPID initialization error:', err.message);
  }
};

const sendPushToUser = async (user, payload) => {
  if (!initialized) initWebPush();
  
  if (user && user.pushSubscription) {
    try {
      await webpush.sendNotification(user.pushSubscription, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }
  return false;
};

const sendPushToRoom = async (roomId, payload) => {
  const User = require('../models/User');
  try {
    const users = await User.find({ roomId });
    const promises = users.map(user => sendPushToUser(user, payload));
    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Error sending push to room:', error);
  }
};

module.exports = {
  initWebPush,
  sendPushToUser,
  sendPushToRoom,
};
