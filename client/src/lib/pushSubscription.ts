import api from './api';

const DEFAULT_VAPID_PUBLIC_KEY = 'BKKj0P_uorVXq06m3E5IBq9JnQLyHzUorhuEC126ECISna6HUJqcZOFFsxYAj31IRdfn5SpihNpcLfvXM9Ns6Dk';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function registerPushSubscription(userInitiated = false): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Service workers or PushManager not supported in this browser.');
    return false;
  }

  const rawKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPublicKey = (rawKey && !rawKey.includes('your_vapid')) ? rawKey : DEFAULT_VAPID_PUBLIC_KEY;

  try {
    let permission = Notification.permission;
    if (permission === 'default' && userInitiated) {
      permission = await Notification.requestPermission();
    }
    
    if (permission !== 'granted') {
      console.log('[Push] Notification permission status:', permission);
      return false;
    }

    // Ensure service worker is registered
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    if (subscription) {
      await api.post('/push/subscribe', {
        subscription: subscription.toJSON(),
      });
      console.log('[Push] Push subscription synced with backend successfully.');
      return true;
    }
  } catch (error) {
    console.error('[Push] Push registration error:', error);
  }
  return false;
}

export async function testPushNotification(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await api.post('/push/test');
    return { success: true, message: res.data?.message || 'Test push sent!' };
  } catch (error: any) {
    return {
      success: false,
      message: error?.response?.data?.message || 'Failed to dispatch test notification.',
    };
  }
}
