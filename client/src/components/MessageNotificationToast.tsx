'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleHeart, ArrowRight, X } from 'lucide-react';
import { useSocketStore } from '../lib/store/socketStore';
import { useAuthStore } from '../lib/store/authStore';
import { soundService } from '../lib/soundService';

interface MessageNotification {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
}

export default function MessageNotificationToast() {
  const [notification, setNotification] = useState<MessageNotification | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { socket } = useSocketStore();

  useEffect(() => {
    if (!socket) return;

    const handleChatNotification = (data: any) => {
      // Do not trigger toast if user is already actively chatting on /chat
      if (pathname === '/chat' || pathname.startsWith('/chat/')) {
        return;
      }

      if (!data || !data.content) return;

      const newNotif: MessageNotification = {
        id: Math.random().toString(36).substring(7),
        senderId: data.senderId,
        senderName: data.senderName || 'Your partner',
        senderAvatar: data.senderAvatar,
        content: data.content,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      setNotification(newNotif);

      // Procedural audio chime
      try {
        soundService.playMessageTone();
      } catch {}

      // Browser native push notification if enabled
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`${newNotif.senderName} messaged you 💬`, {
            body: newNotif.content,
            icon: newNotif.senderAvatar || '/icon-192x192.png',
            tag: 'chat-message',
          });
        } catch {}
      }
    };

    const handleDirectChatMessage = (msg: any) => {
      const currentUserId = useAuthStore.getState().user?._id;
      const senderObj = msg?.senderId;
      const senderId = typeof senderObj === 'object' ? senderObj?._id : senderObj;
      if (senderId && currentUserId && senderId.toString() === currentUserId.toString()) {
        return;
      }
      const senderName = typeof senderObj === 'object' ? (senderObj?.displayName || 'Your partner') : 'Your partner';
      const senderAvatar = typeof senderObj === 'object' ? senderObj?.avatar : undefined;
      const textContent = msg?.type === 'audio' ? '🎤 Sent a voice note' : (msg?.content || 'Sent a message');

      handleChatNotification({
        senderId,
        senderName,
        senderAvatar,
        content: textContent,
      });
    };

    socket.on('chat:notification', handleChatNotification);
    socket.on('chat:message', handleDirectChatMessage);

    return () => {
      socket.off('chat:notification', handleChatNotification);
      socket.off('chat:message', handleDirectChatMessage);
    };
  }, [socket, pathname]);

  // Auto-dismiss after 6.5 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 6500);
    return () => clearTimeout(timer);
  }, [notification]);

  if (!notification) return null;

  const handleOpenChat = () => {
    setNotification(null);
    router.push('/chat');
  };

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="pointer-events-auto w-full max-w-sm rounded-2xl bg-[#0f0f1e]/95 backdrop-blur-2xl border border-pink-500/30 shadow-[0_15px_35px_rgba(244,63,142,0.25)] p-3.5 flex items-center gap-3.5"
        >
          {/* Avatar or Icon */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center font-bold text-white text-sm">
              {notification.senderAvatar ? (
                <img src={notification.senderAvatar} alt={notification.senderName} className="w-full h-full object-cover" />
              ) : (
                <MessageCircleHeart className="text-pink-400" size={20} />
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0f0f1e]" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={handleOpenChat}>
            <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
              <span>{notification.senderName}</span>
              <span className="text-[10px] text-pink-400 font-medium">just messaged you</span>
            </div>
            <p className="text-xs text-slate-300 truncate mt-0.5 font-medium">
              "{notification.content}"
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleOpenChat}
              className="p-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 transition-colors"
              title="Reply"
            >
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => setNotification(null)}
              className="p-1.5 rounded-xl hover:bg-white/[0.08] text-slate-400 transition-colors"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
