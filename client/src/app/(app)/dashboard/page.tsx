'use client';
import { useState } from 'react';
import { useAuthStore } from '../../../lib/store/authStore';
import { useSocketStore } from '../../../lib/store/socketStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, Edit3, Sparkles, Clapperboard, Gamepad2, 
  Target, MapPin, CalendarHeart, User, ArrowRight 
} from 'lucide-react';

const CUTE_AVATARS = [
  { id: 'cat', emoji: '🐱', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Angel&backgroundColor=ffb6c1', name: 'Pink Bot' },
  { id: 'bunny', emoji: '🐰', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Chloe&backgroundColor=ffd5dc', name: 'Sweet Chloe' },
  { id: 'fox', emoji: '🦊', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=d8b4fe', name: 'Cool Felix' },
  { id: 'bear', emoji: '🧸', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo&backgroundColor=fed7aa', name: 'Cute Milo' },
  { id: 'panda', emoji: '🐼', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Bella&backgroundColor=fbcfe8', name: 'Star Bella' },
  { id: 'sparkle', emoji: '✨', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Lover&backgroundColor=f472b6', name: 'Blushing Love' },
  { id: 'puppy', emoji: '🐶', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver&backgroundColor=c4b5fd', name: 'Gentle Oliver' },
  { id: 'koala', emoji: '🐨', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cuddle&backgroundColor=fbcfe8', name: 'Cuddle Face' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const user = useAuthStore((state: { user: { displayName?: string; avatar?: string } | null }) => state.user);
  const logout = useAuthStore((state: { logout: () => void }) => state.logout);
  const updateAvatar = useAuthStore((state: any) => state.updateAvatar);
  const partnerOnline = useSocketStore((state: { partnerOnline: boolean }) => state.partnerOnline);

  const handleSelectAvatar = async (url: string) => {
    try {
      setUpdatingAvatar(true);
      await updateAvatar(url);
      toast.success('Cute new avatar set! 💕');
      setShowAvatarModal(false);
    } catch (err) {
      toast.error('Failed to update avatar');
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out safely');
    router.push('/login');
  };

  const greeting = "Good evening";

  return (
    <div className="relative min-h-screen p-4 sm:p-6 max-w-xl mx-auto space-y-6 pb-28">
      {/* Subtle ambient lighting */}
      <div className="ambient-glow-pink -top-28 -left-20 pointer-events-none" />
      <div className="ambient-glow-purple top-64 -right-28 pointer-events-none" />

      {/* Header Profile */}
      <header className="relative flex justify-between items-center p-5 rounded-3xl glass-panel z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-pink-400">Tonight's Space</span>
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400">{user?.displayName}</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2.5 h-2.5 rounded-full ${partnerOnline ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-slate-600'}`} />
            <span className="text-xs font-medium text-slate-300">
              {partnerOnline ? 'Partner connected' : 'Partner offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            title="Log out"
            className="w-11 h-11 rounded-2xl bg-white/[0.04] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-300 flex items-center justify-center transition-all cursor-pointer shadow-sm group"
          >
            <LogOut size={17} className="group-hover:scale-110 transition-transform text-slate-400 group-hover:text-rose-300" />
          </button>

          <button 
            onClick={() => setShowAvatarModal(true)}
            title="Change Avatar"
            className="relative w-13 h-13 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-[2px] shadow-lg shadow-pink-500/20 group hover:scale-105 transition-transform cursor-pointer"
          >
            <div className="w-full h-full rounded-[14px] bg-[#0c0c17] flex items-center justify-center overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-pink-400" />
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-pink-500 text-[10px] flex items-center justify-center border-2 border-[#07070e] text-white">
              <Edit3 size={10} />
            </span>
          </button>
        </div>
      </header>

      {/* Hero Countdown / Next Date Card */}
      <div className="relative p-7 rounded-[32px] overflow-hidden glass-panel border-pink-500/20 group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/30">
              <CalendarHeart size={13} className="text-pink-300" />
              <span>Next Planned Date</span>
            </span>
            <h3 className="text-xl font-extrabold text-white mt-2">Midnight Movie & Cocktails</h3>
          </div>
          <Sparkles size={24} className="text-pink-400 filter drop-shadow-[0_0_8px_rgba(244,63,142,0.6)]" />
        </div>

        <div className="grid grid-cols-4 gap-2 pt-2 text-center">
          {[
            { val: '04', label: 'Days' },
            { val: '18', label: 'Hours' },
            { val: '25', label: 'Mins' },
            { val: '40', label: 'Secs' },
          ].map((item, idx) => (
            <div key={idx} className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-md">
              <div className="text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
                {item.val}
              </div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mt-1">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Link 
          href="/watch" 
          className="relative p-5 rounded-3xl glass-panel hover:border-pink-500/40 transition-all duration-300 group overflow-hidden"
        >
          <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(244,63,142,0.2)]">
            <Clapperboard size={24} />
          </div>
          <h3 className="font-bold text-white text-base">Watch Together</h3>
          <p className="text-xs text-slate-400 mt-1">Synced YouTube & Video</p>
          <div className="mt-4 flex items-center text-xs font-semibold text-pink-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>Stream now</span>
            <ArrowRight size={13} />
          </div>
        </Link>

        <Link 
          href="/games" 
          className="relative p-5 rounded-3xl glass-panel hover:border-purple-500/40 transition-all duration-300 group overflow-hidden"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(147,51,234,0.2)]">
            <Gamepad2 size={24} />
          </div>
          <h3 className="font-bold text-white text-base">Couples Arcade</h3>
          <p className="text-xs text-slate-400 mt-1">Chess, Ludo & Quizzes</p>
          <div className="mt-4 flex items-center text-xs font-semibold text-purple-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>Play now</span>
            <ArrowRight size={13} />
          </div>
        </Link>
      </div>

      {/* Secondary Row: Goals & Reminders */}
      <div className="grid grid-cols-2 gap-4">
        <Link 
          href="/goals" 
          className="p-5 rounded-3xl glass-panel hover:border-white/20 transition-all group"
        >
          <div className="flex justify-between items-center mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Target size={18} />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              70% Done
            </span>
          </div>
          <h4 className="font-bold text-white text-sm">Shared Goals</h4>
          <div className="w-full h-1.5 bg-white/[0.08] rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 w-[70%]" />
          </div>
        </Link>

        <Link 
          href="/map" 
          className="p-5 rounded-3xl glass-panel hover:border-white/20 transition-all group"
        >
          <div className="flex justify-between items-center mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <MapPin size={18} />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Live GPS
            </span>
          </div>
          <h4 className="font-bold text-white text-sm">Real-time Map</h4>
          <p className="text-xs text-slate-400 mt-1">Distance & Presence</p>
        </Link>
      </div>

      {/* Cute Avatar Selector Modal */}
      <AnimatePresence>
        {showAvatarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm rounded-[32px] glass-panel p-6 shadow-2xl border border-pink-500/30 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-lg text-white">Choose Your Cute Avatar 💕</h3>
                  <p className="text-xs text-slate-400">Pick how your partner sees you</p>
                </div>
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3 my-4">
                {CUTE_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => handleSelectAvatar(av.url)}
                    disabled={updatingAvatar}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.04] hover:bg-pink-500/20 border border-white/5 hover:border-pink-500/40 transition-all group hover:scale-105 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 p-1">
                      <img src={av.url} alt={av.name} className="w-full h-full object-cover rounded-lg" />
                    </div>
                    <span className="text-[10px] text-slate-400 group-hover:text-pink-300 font-medium truncate max-w-full">
                      {av.emoji}
                    </span>
                  </button>
                ))}
              </div>

              <p className="text-center text-[11px] text-slate-500 mt-2">
                Click any cute companion to update instantly!
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
