'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, X, Check, ArrowRight, Sparkles, Swords } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocketStore } from '../lib/store/socketStore';
import { useAuthStore } from '../lib/store/authStore';
import { useGameStore } from '../lib/store/gameStore';
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

interface GameInvitePayload {
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  game: string;
  sessionCode: string;
}

export default function RoomInviteNotification() {
  const router = useRouter();
  const socket = useSocketStore((state) => state.socket);
  const setAuthRoom = useAuthStore((state) => state.setRoom);
  const setActiveGame = useGameStore((state) => state.setActiveGame);

  const [currentInvite, setCurrentInvite] = useState<InvitePayload | null>(null);
  const [currentGameInvite, setCurrentGameInvite] = useState<GameInvitePayload | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleRoomInvite = (data: InvitePayload) => {
      soundService.playMessageTone();
      setCurrentInvite(data);
    };

    const handleGameInvite = (data: GameInvitePayload) => {
      soundService.playMessageTone();
      setCurrentGameInvite(data);
    };

    socket.on('room:invite', handleRoomInvite);
    socket.on('game:invite:received', handleGameInvite);

    return () => {
      socket.off('room:invite', handleRoomInvite);
      socket.off('game:invite:received', handleGameInvite);
    };
  }, [socket]);

  const handleAcceptRoom = async () => {
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

      window.dispatchEvent(new CustomEvent('room:changed', { detail: res.data.room }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to join room');
    } finally {
      setJoining(false);
    }
  };

  const handleDeclineRoom = () => {
    setCurrentInvite(null);
  };

  // Game Challenge handlers
  const handleAcceptGame = () => {
    if (!currentGameInvite) return;

    if (socket) {
      socket.emit('game:invite:accept', {
        targetUserId: currentGameInvite.senderId,
        game: currentGameInvite.game,
        sessionCode: currentGameInvite.sessionCode,
      });
    }

    const isLudo = currentGameInvite.game === 'ludo';
    const gameLabel = isLudo ? 'Ludo Match 🎲' : 'Chess Match ♟️';
    toast.success(`Joining ${currentGameInvite.senderName}'s ${gameLabel}!`);

    // Launch game in multiplayer mode as Guest/Opponent (yellow for Ludo, b for Chess)
    setActiveGame(isLudo ? 'ludo' : 'chess', {
      sessionCode: currentGameInvite.sessionCode,
      role: isLudo ? 'yellow' : 'b',
      opponentName: currentGameInvite.senderName,
      opponentId: currentGameInvite.senderId,
    });

    router.push('/games');
    setCurrentGameInvite(null);
  };

  const handleDeclineGame = () => {
    if (!currentGameInvite) return;
    if (socket) {
      socket.emit('game:invite:decline', {
        targetUserId: currentGameInvite.senderId,
        game: currentGameInvite.game,
      });
    }
    toast('Challenge declined');
    setCurrentGameInvite(null);
  };

  return (
    <>
      {/* 1. Room Invitation Toast Modal */}
      <AnimatePresence>
        {currentInvite && (
          <div className="fixed top-5 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50">
            <motion.div
              initial={{ opacity: 0, y: -25, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.92 }}
              transition={{ duration: 0.25 }}
              className="p-4 rounded-3xl bg-[#0d0e1c]/95 backdrop-blur-2xl border-2 border-cyan-500/50 shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.3)] relative overflow-hidden text-white"
            >
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
                  onClick={handleDeclineRoom}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-end gap-2 relative z-10">
                <button
                  type="button"
                  onClick={handleDeclineRoom}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-all cursor-pointer"
                >
                  Decline
                </button>
                <button
                  type="button"
                  disabled={joining}
                  onClick={handleAcceptRoom}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-black text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                >
                  <Check size={14} strokeWidth={3} />
                  <span>{joining ? 'Joining...' : 'Accept & Join'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Direct Game Challenge Notification (e.g. Zen 3D Chess Challenge) */}
      <AnimatePresence>
        {currentGameInvite && (
          <div className="fixed top-5 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50">
            <motion.div
              initial={{ opacity: 0, y: -25, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.92 }}
              transition={{ duration: 0.25 }}
              className="p-4 rounded-3xl bg-[#140e26]/95 backdrop-blur-2xl border-2 border-pink-500/60 shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_35px_rgba(236,72,153,0.35)] relative overflow-hidden text-white"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-pink-500/30 blur-2xl pointer-events-none" />

              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-black/50 border border-pink-500/50 flex items-center justify-center shrink-0 text-2xl shadow-inner">
                    {currentGameInvite.senderAvatar ? (
                      <img
                        src={currentGameInvite.senderAvatar}
                        alt={currentGameInvite.senderName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{currentGameInvite.game === 'ludo' ? '🎲' : '♟️'}</span>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#140e26]" />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-pink-400">
                        {currentGameInvite.game === 'ludo' ? 'Live Ludo Duel 🎲' : 'Live Chess Duel ⚔️'}
                      </span>
                      <Swords size={12} className="text-pink-400" />
                    </div>
                    <h4 className="font-extrabold text-sm text-white leading-tight">
                      {currentGameInvite.senderName}
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Challenged you to a live match of{' '}
                      <strong className="text-pink-300">
                        {currentGameInvite.game === 'ludo' ? 'Classic 3D Ludo' : 'Zen 3D Chess'}
                      </strong>
                      !
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDeclineGame}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-end gap-2 relative z-10">
                <button
                  type="button"
                  onClick={handleDeclineGame}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-all cursor-pointer"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={handleAcceptGame}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-xs font-black text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
                >
                  {currentGameInvite.game === 'ludo' ? (
                    <>
                      <span>🎲</span>
                      <span>Accept & Roll Dice</span>
                    </>
                  ) : (
                    <>
                      <Swords size={14} strokeWidth={2.5} />
                      <span>Accept & Play ⚔️</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
