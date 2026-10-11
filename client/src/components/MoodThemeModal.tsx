'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Clock, Sparkles, User, Heart, Flame, Users, CloudRain, Send } from 'lucide-react';
import { useMoodStore, MOOD_CONFIG, formatRelativeTime } from '../lib/store/moodStore';
import { useSocketStore } from '../lib/store/socketStore';
import { useAuthStore } from '../lib/store/authStore';
import { soundService } from '../lib/soundService';
import { MoodType } from '../lib/types';
import toast from 'react-hot-toast';

const MOOD_ICONS: Record<string, React.ReactNode> = {
  love: <Heart size={18} className="text-pink-400 fill-pink-400/20" />,
  angry: <Flame size={18} className="text-rose-400 fill-rose-400/20" />,
  just_friends: <Users size={18} className="text-cyan-400" />,
  sad: <CloudRain size={18} className="text-blue-400 fill-blue-400/20" />,
};

export default function MoodThemeModal() {
  const { moodTheme, isModalOpen, closeModal, setMood, isLoading } = useMoodStore();
  const socket = useSocketStore((state) => state.socket);
  const user = useAuthStore((state) => state.user);

  if (!isModalOpen) return null;

  const currentConfig = MOOD_CONFIG[moodTheme.current] || MOOD_CONFIG.love;
  const moodList: MoodType[] = ['love', 'angry', 'just_friends', 'sad'];

  const handleSendNudge = () => {
    soundService.playMoodNudge();
    if (socket) {
      socket.emit('mood:nudge', {
        mood: currentConfig.id,
        emoji: currentConfig.emoji,
        text: currentConfig.actionToast,
        senderName: user?.displayName || 'Partner',
      });
    }
    toast.success(`Sent to partner: ${currentConfig.promptAction}!`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-3xl glass-panel border border-white/10 p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* Ambient Glow matching active mood */}
          <div
            className="absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-30 pointer-events-none transition-colors duration-700"
            style={{ backgroundColor: currentConfig.primaryColor }}
          />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-md"
                style={{
                  backgroundColor: `${currentConfig.primaryColor}20`,
                  borderColor: `${currentConfig.primaryColor}50`,
                }}
              >
                <Sparkles size={18} style={{ color: currentConfig.primaryColor }} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white leading-tight">Mood Theme</h2>
                <p className="text-[11px] text-slate-400">Sync atmosphere across the entire app for both of you</p>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto space-y-4 py-4 pr-1 flex-1 custom-scrollbar">
            {/* 4 Mood Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {moodList.map((moodKey) => {
                const config = MOOD_CONFIG[moodKey];
                const isActive = moodTheme.current === moodKey;

                return (
                  <button
                    key={moodKey}
                    type="button"
                    disabled={isLoading}
                    onClick={() => setMood(moodKey)}
                    className={`relative p-3.5 rounded-2xl border text-left transition-all group cursor-pointer active:scale-98 flex flex-col justify-between min-h-[102px] ${
                      isActive
                        ? 'bg-gradient-to-br ' + config.gradientBg + ' border-2 shadow-lg shadow-black/40'
                        : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 hover:border-white/20'
                    }`}
                    style={{
                      borderColor: isActive ? config.primaryColor : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center border shadow-sm shrink-0"
                          style={{
                            backgroundColor: `${config.primaryColor}18`,
                            borderColor: `${config.primaryColor}40`,
                          }}
                        >
                          {MOOD_ICONS[moodKey]}
                        </div>
                        <span className="text-sm font-bold text-white tracking-wide">{config.label}</span>
                      </div>

                      {isActive ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white flex items-center gap-1 shadow-sm"
                          style={{ backgroundColor: config.primaryColor }}
                        >
                          <Check size={11} strokeWidth={3} />
                          Active
                        </span>
                      ) : (
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20 group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: `${config.primaryColor}30` }}
                        />
                      )}
                    </div>

                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed mb-1">{config.subLabel}</p>

                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.primaryColor }} />
                      <span className="truncate">{config.vibe}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Interactive Partner Action & Mood Aura Card */}
            <div
              className="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/[0.02]"
              style={{
                borderColor: `${currentConfig.primaryColor}40`,
                backgroundColor: `${currentConfig.primaryColor}0d`,
              }}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center border shadow-sm shrink-0"
                    style={{
                      backgroundColor: `${currentConfig.primaryColor}25`,
                      borderColor: `${currentConfig.primaryColor}50`,
                    }}
                  >
                    {MOOD_ICONS[currentConfig.id]}
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {currentConfig.label} Aura Active
                  </span>
                </div>
                <p className="text-xs text-slate-300 italic font-medium">"{currentConfig.quote}"</p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                  <User size={12} />
                  <span>Set by: <strong className="text-white">{moodTheme.updatedByName || 'Partner'}</strong></span>
                  <span>•</span>
                  <span>{formatRelativeTime(moodTheme.updatedAt)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendNudge}
                className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer text-white shrink-0"
                style={{
                  backgroundColor: currentConfig.primaryColor,
                  boxShadow: `0 4px 15px ${currentConfig.glowColor}`,
                }}
              >
                <Send size={13} />
                <span>{currentConfig.promptAction}</span>
              </button>
            </div>

            {/* Mood History Timeline */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-400" />
                  Mood Change History
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {moodTheme.history?.length || 0} recorded
                </span>
              </div>

              {moodTheme.history && moodTheme.history.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {moodTheme.history.map((item, idx) => {
                    const itemConfig = MOOD_CONFIG[item.mood] || MOOD_CONFIG.love;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: itemConfig.primaryColor }}
                          />
                          <span className="font-semibold text-white">
                            {item.setName || 'Partner'}
                          </span>
                          <span className="text-slate-400 text-[11px]">set mood to</span>
                          <span
                            className="font-bold text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1.5"
                            style={{
                              backgroundColor: `${itemConfig.primaryColor}20`,
                              color: itemConfig.primaryColor,
                            }}
                          >
                            <span className="scale-75 origin-center shrink-0">{MOOD_ICONS[item.mood]}</span>
                            <span>{itemConfig.label}</span>
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-400 shrink-0 font-medium ml-2">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400">
                  No mood changes yet. Tap any theme above to set tonight's mood!
                </div>
              )}
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <span>Atmosphere and audio update live on partner's screen</span>
            <button
              onClick={closeModal}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-all cursor-pointer active:scale-95"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
