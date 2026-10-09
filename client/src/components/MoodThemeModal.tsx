'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Clock, Sparkles, User, Flame, Heart, AlertCircle, Users } from 'lucide-react';
import { useMoodStore, MOOD_CONFIG, formatRelativeTime } from '../lib/store/moodStore';
import { MoodType } from '../lib/types';

const MOOD_ICONS: Record<MoodType, React.ReactNode> = {
  love: <Heart size={20} className="text-pink-400 fill-pink-400/20" />,
  horny: <Flame size={20} className="text-fuchsia-400 fill-fuchsia-400/20" />,
  angry: <AlertCircle size={20} className="text-rose-400" />,
  just_friends: <Users size={20} className="text-cyan-400" />,
};

export default function MoodThemeModal() {
  const { moodTheme, isModalOpen, closeModal, setMood, isLoading } = useMoodStore();

  if (!isModalOpen) return null;

  const currentConfig = MOOD_CONFIG[moodTheme.current] || MOOD_CONFIG.love;
  const moodList: MoodType[] = ['love', 'horny', 'angry', 'just_friends'];

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
                <h2 className="text-lg font-extrabold text-white leading-tight">Couple Mood Theme</h2>
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
                    className={`relative p-3.5 rounded-2xl border text-left transition-all group cursor-pointer active:scale-98 flex flex-col justify-between min-h-[92px] ${
                      isActive
                        ? 'bg-gradient-to-br ' + config.gradientBg + ' border-2 shadow-lg shadow-black/40'
                        : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 hover:border-white/20'
                    }`}
                    style={{
                      borderColor: isActive ? config.primaryColor : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-2">
                        {MOOD_ICONS[moodKey]}
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

                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed">{config.subLabel}</p>
                  </button>
                );
              })}
            </div>

            {/* Current Active Mood Attribution Info Box */}
            <div
              className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 bg-white/[0.02]"
              style={{
                borderColor: `${currentConfig.primaryColor}35`,
                backgroundColor: `${currentConfig.primaryColor}0d`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `${currentConfig.primaryColor}25`,
                    borderColor: `${currentConfig.primaryColor}50`,
                  }}
                >
                  <User size={15} style={{ color: currentConfig.primaryColor }} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-400 font-medium">Currently set by:</span>
                    <strong className="text-xs font-bold text-white tracking-wide">
                      {moodTheme.updatedByName || 'Partner'}
                    </strong>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                    <Clock size={11} />
                    <span>{formatRelativeTime(moodTheme.updatedAt)}</span>
                  </div>
                </div>
              </div>

              <div
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold border shrink-0"
                style={{
                  backgroundColor: `${currentConfig.primaryColor}20`,
                  color: currentConfig.primaryColor,
                  borderColor: `${currentConfig.primaryColor}40`,
                }}
              >
                {currentConfig.label}
              </div>
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
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
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
                            className="font-bold text-[11px] px-1.5 py-0.5 rounded-md"
                            style={{
                              backgroundColor: `${itemConfig.primaryColor}20`,
                              color: itemConfig.primaryColor,
                            }}
                          >
                            {itemConfig.label}
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
            <span>Themes update instantly on your partner's screen ⚡</span>
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
