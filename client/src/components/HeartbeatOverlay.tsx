'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useSocketStore } from '../lib/store/socketStore';
import { soundService } from '../lib/soundService';

export default function HeartbeatOverlay() {
  const [pulsing, setPulsing] = useState(false);
  const [partnerName, setPartnerName] = useState('Your partner');
  const { socket } = useSocketStore();

  useEffect(() => {
    if (!socket) return;

    const handleHeartbeat = (data: any) => {
      setPartnerName(data?.senderName || 'Your partner');
      setPulsing(true);
      
      // Haptic vibration on mobile devices
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([120, 80, 200]);
        } catch {}
      }

      // Procedural audio heartbeat
      try {
        soundService.playHeartbeatTone();
      } catch {}

      setTimeout(() => {
        setPulsing(false);
      }, 2600);
    };

    socket.on('touch:heartbeat', handleHeartbeat);

    return () => {
      socket.off('touch:heartbeat', handleHeartbeat);
    };
  }, [socket]);

  return (
    <AnimatePresence>
      {pulsing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-pink-950/20 backdrop-blur-[2px]"
        >
          {/* Pulsing Ripple Rings */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0.9 }}
            animate={{ scale: [1, 1.45, 1.9], opacity: [0.9, 0.4, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            className="absolute w-64 h-64 rounded-full border-2 border-pink-500/40 shadow-[0_0_40px_rgba(244,63,142,0.4)]"
          />

          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: [1, 1.25, 1, 1.28, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 text-white shadow-[0_0_60px_#f43f8e]"
          >
            <Heart size={54} fill="currentColor" className="drop-shadow-lg" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-sm font-bold text-pink-200 tracking-wide bg-black/60 px-4 py-1.5 rounded-full border border-pink-500/30 backdrop-blur-md shadow-xl"
          >
            {partnerName} is sending you a heartbeat
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
