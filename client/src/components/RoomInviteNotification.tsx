'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, X, Check, ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocketStore } from '../lib/store/socketStore';
import { useAuthStore } from '../lib/store/authStore';
import { soundService } from '../lib/soundService';
import api from '../lib/api';

interface InvitePayload {
  from: {
    _id: string;
    displayName: string;
    avatar?: string;
    friendId?: string;
  };
  room: {
    _id: string;
    inviteCode: string;
  };
}

export default function RoomInviteNotification() {
  const socket = useSocketStore((state) => state.socket);
  const setAuthRoom = useAuthStore((state) => state.setRoom);
  const [currentInvite, setCurrentInvite] = useState<InvitePayload | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleRoomInvite = (data: InvitePayload) => {
      soundService.playMessageTone();
      setCurrentInvite(data);
    };

    socket.on('room:invite', handleRoomInvite);

    return () => {
      socket.off('room:invite', handleRoomInvite);
    };
  }, [socket]);

  const handleAccept = async () => {
    if (!currentInvite) return;
    setJoining(true);
    try {
      const res = await api.post('/rooms/join', {
        inviteCode: currentInvite.room.inviteCode,
      });

      setAuthRoom(res.data.room);
      if (socket) {
        socket.emit('room:switch', { roomId: res.data.room._id });
      }

      toast.success(`Joined ${currentInvite.from.displayName}'s party! 🎮`);
      setCurrentInvite(null);

      // Trigger a page refresh or reload room state if on dashboard
      window.dispatchEvent(new CustomEvent('room:changed', { detail: res.data.room }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to join room');
    } finally {
      setJoining(false);
    }
  };

  const handleDecline = () => {
    setCurrentInvite(null);
  };

  if (!currentInvite) return null;

  return (
    <AnimatePresence>
      <div className="fixed top-5 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50">
        <motion.div
          initial={{ opacity: 0, y: -25, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.92 }}
          transition={{ duration: 0.25 }}
          className="p-4 rounded-3xl bg-[#0d0e1c]/95 backdrop-blur-2xl border-2 border-cyan-500/50 shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.3)] relative overflow-hidden text-white"
        >
          {/* Glowing Aura Accent */}
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-cyan-500/30 blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-black/50 border border-cyan-500/50 shrink-0">
                {currentInvite.from.avatar ? (
                  <img
                    src={currentInvite.from.avatar}
                    alt={currentInvite.from.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-xs uppercase text-cyan-300">
                    {currentInvite.from.displayName.slice(0, 2)}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0d0e1c]" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                    Party Invitation
                  </span>
                  <Sparkles size={11} className="text-cyan-400" />
                </div>
                <h4 className="font-extrabold text-sm text-white leading-tight">
                  {currentInvite.from.displayName}
                </h4>
                <p className="text-[11px] text-slate-300">
                  Invited you to Room <strong className="font-mono text-pink-300">{currentInvite.room.inviteCode}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={handleDecline}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-end gap-2 relative z-10">
            <button
              type="button"
              onClick={handleDecline}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-all cursor-pointer"
            >
              Decline
            </button>
            <button
              type="button"
              disabled={joining}
              onClick={handleAccept}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-black text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
            >
              <Check size={14} strokeWidth={3} />
              <span>{joining ? 'Joining...' : 'Accept & Join'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
