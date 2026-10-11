'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Mail, ShieldCheck, Copy, Check, Edit2, 
  Sparkles, CheckCircle2, ChevronRight, Palette
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../lib/store/authStore';
import { useMoodStore, MOOD_CONFIG } from '../lib/store/moodStore';

const CUTE_AVATARS = [
  { id: 'cat', emoji: '🐱', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Angel&backgroundColor=ffb6c1', name: 'Pink Bot' },
  { id: 'bunny', emoji: '🐰', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Chloe&backgroundColor=ffd5dc', name: 'Sweet Chloe' },
  { id: 'fox', emoji: '🦊', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=d8b4fe', name: 'Cool Felix' },
  { id: 'bear', emoji: '🧸', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo&backgroundColor=fed7aa', name: 'Cute Milo' },
  { id: 'panda', emoji: '🐼', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Bella&backgroundColor=fbcfe8', name: 'Star Bella' },
  { id: 'sparkle', emoji: '✨', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Lover&backgroundColor=f472b6', name: 'Blushing Love' },
  { id: 'puppy', emoji: '🐶', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver&backgroundColor=c4b5fd', name: 'Gentle Oliver' },
  { id: 'koala', emoji: '🐨', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cuddle&backgroundColor=fbcfe8', name: 'Cute Koala' },
];

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMoodModal?: () => void;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  onOpenMoodModal,
}: EditProfileModalProps) {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const moodTheme = useMoodStore((state) => state.moodTheme);
  const currentMoodConfig = MOOD_CONFIG[moodTheme.current] || MOOD_CONFIG.love;

  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setSelectedAvatar(user.avatar || '');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    if (!user?.friendId) return;
    navigator.clipboard.writeText(user.friendId);
    setCopiedId(true);
    toast.success('User ID copied!');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      await updateProfile(displayName.trim(), selectedAvatar);
      toast.success('Profile updated successfully! ✨');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-sm sm:max-w-md rounded-[32px] p-5 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.95)] border border-white/20 bg-[#121324] text-slate-100 max-h-[88vh] flex flex-col my-auto"
          style={{ backgroundColor: '#121324' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-inner">
                <User size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white tracking-tight">Edit Profile</h3>
                <p className="text-[11px] text-slate-400">Change name & avatar</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-3.5 mt-3.5 overflow-y-auto pr-1 flex-1">
            {/* User ID & Verified Badge Box */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <ShieldCheck size={13} className="text-cyan-400" />
                  <span>Unique User ID</span>
                </div>
                <div className="text-base font-mono font-extrabold text-white mt-0.5 tracking-wider truncate">
                  {user?.friendId || 'N/A'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
              >
                {copiedId ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            </div>

            {/* Email (Read-only Account ID) */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Mail size={13} className="text-purple-400" />
                <span>Account Email</span>
              </label>
              <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs sm:text-sm text-slate-300 font-mono flex items-center justify-between">
                <span className="truncate">{user?.email || 'user@afterparty.app'}</span>
                <span className="text-[10px] text-slate-500 font-sans font-semibold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-md">
                  Verified
                </span>
              </div>
            </div>

            {/* Display Name Input */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Edit2 size={13} className="text-pink-400" />
                <span>Display Name</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-pink-500/60 transition-all font-semibold"
                maxLength={30}
                required
              />
            </div>

            {/* Choose Avatar */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Choose Profile Companion</span>
                </span>
                <span className="text-[10px] text-pink-400 font-semibold lowercase">
                  live preview
                </span>
              </label>
              <div className="grid grid-cols-4 gap-2.5 max-h-36 overflow-y-auto pr-1">
                {CUTE_AVATARS.map((av) => {
                  const isSelected = selectedAvatar === av.url;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setSelectedAvatar(av.url)}
                      className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-pink-500/25 border-2 border-pink-400 shadow-[0_0_15px_rgba(244,63,142,0.4)] scale-105'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-pink-500/30'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40 p-0.5 relative">
                        <img src={av.url} alt={av.name} className="w-full h-full object-cover rounded-lg" />
                      </div>
                      <span className="text-[9px] text-slate-400 group-hover:text-pink-300 font-medium truncate max-w-full">
                        {av.emoji}
                      </span>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-md">
                          <CheckCircle2 size={11} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions Buttons */}
            <div className="flex gap-2.5 pt-3 border-t border-white/[0.08] shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition-colors cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-2xl btn-sexy text-xs font-bold text-white shadow-lg disabled:opacity-50 transition-all cursor-pointer active:scale-95"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
