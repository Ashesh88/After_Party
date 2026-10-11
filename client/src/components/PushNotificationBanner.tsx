'use strict';
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  getNotificationPermissionStatus, 
  registerPushSubscription, 
  testPushNotification 
} from '../lib/pushSubscription';

export default function PushNotificationBanner() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [loading, setLoading] = useState(false);
  const [tested, setTested] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermissionStatus());
  }, []);

  if (isDismissed || permission === 'unsupported') return null;

  const handleEnablePush = async () => {
    setLoading(true);
    try {
      const success = await registerPushSubscription(true);
      const newPerm = getNotificationPermissionStatus();
      setPermission(newPerm);

      if (success || newPerm === 'granted') {
        toast.success('Offline notifications enabled! Sending test notification...');
        // Send immediate test push to verify device push channel
        const testRes = await testPushNotification();
        if (testRes.success) {
          toast.success('Test notification sent! Check your device notifications.');
          setTested(true);
        } else {
          toast.error(testRes.message);
        }
      } else if (newPerm === 'denied') {
        toast.error('Notification permission was blocked in browser settings. Please allow notifications.');
      }
    } catch (err: any) {
      toast.error('Could not enable notifications. Please check browser settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    toast('Sending notification in 3 seconds... Minimize or switch tab to test!', { icon: '⏳' });
    setTimeout(async () => {
      try {
        const testRes = await testPushNotification();
        if (testRes.success) {
          toast.success('Notification dispatched! Check your screen/notification tray.');
          setTested(true);
        } else {
          toast.error(testRes.message);
        }
      } catch (err: any) {
        toast.error('Failed to trigger test notification');
      } finally {
        setLoading(false);
      }
    }, 3000);
  };

  // If already granted, show discreet status & test button
  if (permission === 'granted') {
    return (
      <div className="relative rounded-2xl bg-[#121124]/90 border border-emerald-500/30 p-3.5 flex items-center justify-between gap-3 shadow-[0_8px_25px_rgba(16,185,129,0.12)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
              <span>Offline Push Notifications Active</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              You will receive call & invite alerts even when the site is closed
            </p>
          </div>
        </div>

        <button
          onClick={handleTestNotification}
          disabled={loading}
          className="shrink-0 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 text-emerald-300 font-semibold text-xs border border-emerald-500/30 transition-all flex items-center gap-1.5"
          title="Send test push notification to verify delivery"
        >
          <BellRing size={13} />
          <span>{loading ? 'Sending...' : 'Test Alert'}</span>
        </button>
      </div>
    );
  }

  // If denied by browser settings
  if (permission === 'denied') {
    return (
      <div className="relative rounded-2xl bg-[#1a0f18]/90 border border-rose-500/30 p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertCircle size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">Notifications Blocked in Browser</p>
            <p className="text-[11px] text-slate-400 truncate">
              Click lock icon 🔒 in address bar & enable notifications to receive calls when offline
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If default (not yet granted)
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl bg-gradient-to-r from-pink-950/40 via-purple-950/40 to-[#0e0d1f] border border-pink-500/30 p-4 shadow-[0_10px_30px_rgba(244,63,142,0.18)] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
    >
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shrink-0 shadow-inner">
          <Bell size={20} className="animate-bounce" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>Enable Offline Notifications</span>
            <Sparkles size={14} className="text-pink-400" />
          </h4>
          <p className="text-xs text-slate-300 mt-0.5">
            Receive incoming calls and room invites directly on your device even when the app is completely closed.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <button
          onClick={handleEnablePush}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 active:scale-95 text-white font-bold text-xs shadow-[0_0_20px_rgba(244,63,142,0.4)] transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <BellRing size={14} />
          <span>{loading ? 'Activating...' : 'Enable Now'}</span>
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="px-2.5 py-2 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white text-xs font-medium transition-colors"
        >
          Later
        </button>
      </div>
    </motion.div>
  );
}
