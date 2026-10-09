const webpush = require('web-push');

let initialized = false;

const initWebPush = () => {
  if (initialized) return;
  
  const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
  const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL;

  // Skip if keys are missing or still placeholder values
  const isConfigured = publicVapidKey && privateVapidKey && vapidEmail
    && !publicVapidKey.includes('your_vapid')
    && !privateVapidKey.includes('your_vapid');

  if (isConfigured) {
    try {
      webpush.setVapidDetails(vapidEmail, publicVapidKey, privateVapidKey);
      initialized = true;
      console.log('[Push] Web Push notifications enabled');
    } catch (err) {
      console.warn('[Push] Invalid VAPID keys — push notifications disabled:', err.message);
    }
  } else {
    console.warn('[Push] VAPID keys not configured — push notifications disabled. Run: npx web-push generate-vapid-keys');
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
