'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Sparkles, Send, Edit3, Check, X, Gift, HeartHandshake } from 'lucide-react';
import { useSocketStore } from '../../lib/store/socketStore';
import { useAuthStore } from '../../lib/store/authStore';
import toast from 'react-hot-toast';

const stripEmoji = (str: string) =>
  str
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g, '')
    .trim();

const PRESET_STAKES = [
  { id: 'dinner', label: 'Loser buys dinner & sweet dessert', category: 'Food' },
  { id: 'massage', label: 'Loser gives 15-min shoulder or back massage', category: 'Romantic' },
  { id: 'breakfast', label: 'Loser serves breakfast in bed tomorrow', category: 'Romantic' },
  { id: 'sing', label: 'Loser sends a cute voice note singing a song', category: 'Fun' },
  { id: 'love_letter', label: 'Loser writes a 50-word heartfelt love note', category: 'Romantic' },
  { id: 'chores', label: 'Loser does tonight’s dishes and chores', category: 'Daily' },
  { id: 'boba', label: 'Loser gets partner their favorite boba or drinks', category: 'Food' },
  { id: 'photo', label: 'Loser poses for a goofy photo for the couple feed', category: 'Fun' },
  { id: 'movie', label: 'Loser lets partner pick the movie or show tonight', category: 'Fun' },
  { id: 'servant', label: 'Loser is partner’s royal servant for 1 hour', category: 'Spicy' },
];

export default function ArcadeStakesBar() {
  const socket = useSocketStore((state) => state.socket);
  const user = useAuthStore((state) => state.user);
  const room = useAuthStore((state) => state.room);

  const [stake, setStake] = useState('Loser buys dinner & sweet dessert');
  const [modalOpen, setModalOpen] = useState(false);
  const [customStake, setCustomStake] = useState('');
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [isSettled, setIsSettled] = useState(false);

  // Load saved stake from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('afterparty_arcade_stake');
      if (saved) {
        const clean = stripEmoji(saved);
        setStake(clean || 'Loser buys dinner & sweet dessert');
        localStorage.setItem('afterparty_arcade_stake', clean || 'Loser buys dinner & sweet dessert');
      }
    } catch {}
  }, []);

  // Listen for socket stake updates from partner
  useEffect(() => {
    if (!socket) return;

    const handleStakeUpdate = (data: { stake: string; setBy: string; setterName?: string }) => {
      if (data?.stake) {
        const clean = stripEmoji(data.stake);
        setStake(clean);
        setIsSettled(false);
        try {
          localStorage.setItem('afterparty_arcade_stake', clean);
        } catch {}
        if (data.setBy !== user?._id) {
          toast.success(`${data.setterName || 'Partner'} set match stake: ${clean}`, {
            duration: 4000,
          });
        }
      }
    };

    socket.on('arcade:stake-updated', handleStakeUpdate);
    return () => {
      socket.off('arcade:stake-updated', handleStakeUpdate);
    };
  }, [socket, user]);

  const updateStake = (newStake: string) => {
    const clean = stripEmoji(newStake);
    if (!clean) return;
    setStake(clean);
    setIsSettled(false);
    try {
      localStorage.setItem('afterparty_arcade_stake', clean);
    } catch {}

    if (socket) {
      socket.emit('arcade:set-stake', {
        stake: clean,
        setterName: user?.displayName || 'Partner',
      });
    }

    setModalOpen(false);
    toast.success('Match stake updated');
  };

  const handleAnnounce = () => {
    if (!socket) {
      toast.error('Socket not connected');
      return;
    }

    setIsAnnouncing(true);
    const content = `Arcade Bet Placed: ${stake}! May the best partner win!`;

    // Emit to active room
    if (user?.roomId) {
      socket.emit('chat:message', {
        roomId: user.roomId,
        content,
        type: 'text',
      });
    } else {
      // Find partner in room participants
      const partner = room?.participants?.find((p: any) => p._id !== user?._id);
      if (partner) {
        socket.emit('chat:direct-message', {
          recipientId: partner._id,
          content,
          type: 'text',
        });
      }
    }

    setTimeout(() => {
      setIsAnnouncing(false);
      toast.success('Bet announced in chat');
    }, 400);
  };

  const handleClaimSettled = () => {
    setIsSettled(true);
    toast.success('Debt marked as fulfilled');
  };

  return (
    <>
      {/* Banner Card */}
      <div className="relative mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-900/40 via-pink-900/30 to-rose-900/40 border border-pink-500/30 backdrop-blur-xl shadow-[0_8px_30px_rgba(244,63,142,0.15)] overflow-hidden">
        {/* Glow corner */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 relative z-10">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(244,63,142,0.5)] shrink-0">
              <Flame size={20} className="animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider uppercase text-pink-300">
                  Couples Arcade Stakes & Bets
                </span>
                {isSettled ? (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    Settled
                  </span>
                ) : (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold animate-pulse">
                    Active Bet
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate mt-0.5 max-w-lg">
                {stake}
              </h3>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setModalOpen(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold transition-all border border-white/10 hover:border-pink-500/40 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Edit3 size={13} className="text-pink-400" />
              <span>Change Stake</span>
            </button>

            <button
              onClick={handleAnnounce}
              disabled={isAnnouncing}
              title="Announce bet in chat"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:brightness-110 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(244,63,142,0.35)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <Send size={13} />
              <span className="hidden sm:inline">Announce in Chat</span>
              <span className="sm:hidden">Announce</span>
            </button>

            {!isSettled && (
              <button
                onClick={handleClaimSettled}
                title="Mark stake as fulfilled / claimed"
                className="w-8 h-8 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <Check size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selector Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg p-5 sm:p-6 rounded-3xl bg-[#131428] border border-white/10 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
                    <Trophy size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Choose Match Stake</h3>
                    <p className="text-xs text-slate-400">What does the loser owe tonight?</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Presets List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-2 pr-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Popular Couples Dares & Bets
                </p>
                {PRESET_STAKES.map((item) => {
                  const isSelected = stake === item.label;
                  return (
                    <button
                      key={item.id}
                      onClick={() => updateStake(item.label)}
                      className={`w-full p-3 rounded-2xl text-left transition-all border flex items-center justify-between gap-3 cursor-pointer group ${
                        isSelected
                          ? 'bg-pink-500/20 border-pink-500/60 shadow-[0_0_15px_rgba(244,63,142,0.25)]'
                          : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.06] hover:border-pink-500/30'
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-pink-200 transition-colors">
                        {item.label}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 border border-white/5 shrink-0">
                        {item.category}
                      </span>
                    </button>
                  );
                })}

                {/* Custom Stake Input */}
                <div className="pt-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Or create a custom dare
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customStake}
                      onChange={(e) => setCustomStake(e.target.value)}
                      placeholder="e.g. Loser gives a 10-min foot rub..."
                      className="flex-1 py-2.5 px-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-pink-500/60 transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customStake.trim()) {
                          updateStake(customStake.trim());
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (customStake.trim()) updateStake(customStake.trim());
                      }}
                      disabled={!customStake.trim()}
                      className="px-4 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      Set Bet
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
