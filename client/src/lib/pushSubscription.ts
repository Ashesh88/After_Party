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

export async function registerPushSubscription(userInitiated = false): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Window not defined' };
  }

  // Check Secure Context (required by browsers for Service Workers & Web Push)
  if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return { 
      success: false, 
      error: 'Web Push requires HTTPS or localhost. If testing over LAN/phone, please use HTTPS (e.g. ngrok).' 
    };
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { 
      success: false, 
      error: 'Push notifications are not supported by this browser.' 
    };
  }

  const rawKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPublicKey = (rawKey && !rawKey.includes('your_vapid')) ? rawKey : DEFAULT_VAPID_PUBLIC_KEY;

  try {
    let permission = Notification.permission;
    if (permission === 'default' && userInitiated) {
      permission = await Notification.requestPermission();
    }
    
    if (permission !== 'granted') {
      return { 
        success: false, 
        error: `Notification permission status: ${permission}. Please allow notifications in site settings.` 
      };
    }

    // 1. Ensure service worker is registered cleanly and safely recover from stale Vercel worker hashes
    let registration: ServiceWorkerRegistration;
    try {
      const existing = await navigator.serviceWorker.getRegistration();
      if (existing) {
        try {
          await existing.update();
          registration = existing;
        } catch (updateErr) {
          console.warn('[Push] Existing worker update failed, unregistering stale worker:', updateErr);
          await existing.unregister();
          registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        }
      } else {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }
    } catch (swErr: any) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          await r.unregister();
        }
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch (retryErr: any) {
        return { 
          success: false, 
          error: `Service Worker registration failed: ${retryErr?.message || retryErr}` 
        };
      }
    }

    // Wait until ready
    try {
      await navigator.serviceWorker.ready;
    } catch (e) {}

    // 2. Clear any stale subscription to avoid applicationServerKey mismatch errors
    try {
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }
    } catch (unsubErr) {
      console.warn('[Push] Error clearing existing subscription:', unsubErr);
    }

    // 3. Create fresh subscription with current VAPID key
    let subscription: PushSubscription;
    try {
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    } catch (subErr: any) {
      return { 
        success: false, 
        error: `PushManager subscribe failed: ${subErr?.message || subErr}` 
      };
    }

    // 4. Send subscription to server
    try {
      await api.post('/push/subscribe', {
        subscription: subscription.toJSON(),
      });
      console.log('[Push] Push subscription synced with backend successfully.');
      return { success: true };
    } catch (apiErr: any) {
      return { 
        success: false, 
        error: `Backend sync error: ${apiErr?.response?.data?.message || apiErr?.message || 'Server error'}` 
      };
    }
  } catch (error: any) {
    return { 
      success: false, 
      error: error?.message || 'Unexpected error during push setup' 
    };
  }
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
