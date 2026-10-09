'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../lib/store/authStore';
import { useSocketStore } from '../../../lib/store/socketStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../lib/api';
import { 
  LogOut, Edit3, Sparkles, Clapperboard, Gamepad2, 
  Target, MapPin, CalendarHeart, User, ArrowRight,
  KeyRound, Copy, Check, Users, RefreshCw
} from 'lucide-react';

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

export default function DashboardPage() {
  const router = useRouter();
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [roomLoading, setRoomLoading] = useState(false);

  const user = useAuthStore((state: { user: { displayName?: string; avatar?: string } | null }) => state.user);
  const logout = useAuthStore((state: { logout: () => void }) => state.logout);
  const updateAvatar = useAuthStore((state: any) => state.updateAvatar);
  const setAuthRoom = useAuthStore((state: any) => state.setRoom);
  const partnerOnline = useSocketStore((state: { partnerOnline: boolean }) => state.partnerOnline);

  const fetchRoom = async () => {
    try {
      const res = await api.get('/rooms/mine');
      setRoom(res.data.room);
      setAuthRoom(res.data.room);
    } catch {
      setRoom(null);
    }
  };

  useEffect(() => {
    fetchRoom();
  }, []);

  const handleCopyCode = () => {
    if (!room?.inviteCode) return;
    navigator.clipboard.writeText(room.inviteCode);
    setCopiedCode(true);
    toast.success('Room code copied! Send to partner 💕');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateNewRoom = async () => {
    setRoomLoading(true);
    try {
      const res = await api.post('/rooms/create');
      setRoom(res.data.room);
      setAuthRoom(res.data.room);
      toast.success('New room created! Share the code with your partner ✨');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create room');
    } finally {
      setRoomLoading(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInput.trim()) return;
    setRoomLoading(true);
    try {
      const res = await api.post('/rooms/join', { inviteCode: inviteInput.trim().toUpperCase() });
      setRoom(res.data.room);
      setAuthRoom(res.data.room);
      toast.success('Connected with partner! Welcome to your space 💕');
      setInviteInput('');
      setShowRoomModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to join room');
    } finally {
      setRoomLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!confirm('Are you sure you want to leave this room?')) return;
    setRoomLoading(true);
    try {
      await api.delete('/rooms/leave');
      setRoom(null);
      setAuthRoom(null);
      toast.success('Left room successfully');
      setShowRoomModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to leave room');
    } finally {
      setRoomLoading(false);
    }
  };

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
  const partnerMember = room?.members?.find((m: any) => m._id !== (user as any)?._id);

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
              {partnerMember ? (partnerOnline ? `${partnerMember.displayName} online` : `${partnerMember.displayName} offline`) : 'Waiting for partner'}
            </span>
          </div>

          {/* Quick Room Code Pill */}
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            {room?.inviteCode ? (
              <button
                onClick={handleCopyCode}
                title="Click to copy room code"
                className="px-3 py-1 rounded-full bg-white/[0.05] hover:bg-pink-500/15 border border-white/10 hover:border-pink-500/30 text-xs font-medium text-slate-200 transition-all flex items-center gap-2 cursor-pointer group active:scale-95"
              >
                <KeyRound size={12} className="text-pink-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Code:</span>
                <span className="font-mono font-bold text-pink-300 tracking-wider">{room.inviteCode}</span>
                {copiedCode ? (
                  <Check size={12} className="text-emerald-400" />
                ) : (
                  <Copy size={12} className="text-slate-400 group-hover:text-pink-300" />
                )}
              </button>
            ) : (
              <button
                onClick={() => setShowRoomModal(true)}
                className="px-3 py-1 rounded-full bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-xs font-bold text-pink-300 flex items-center gap-1.5 cursor-pointer shadow-lg animate-pulse"
              >
                <KeyRound size={12} />
                <span>Pair Partner (Room Code) 💕</span>
              </button>
            )}

            <button
              onClick={() => setShowRoomModal(true)}
              className="text-[11px] font-bold text-pink-400 hover:text-pink-300 underline underline-offset-2 transition-colors cursor-pointer"
            >
              {room?.inviteCode ? 'Pair Settings' : 'Setup'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowRoomModal(true)}
            title="Room & Pairing Code"
            className="w-11 h-11 rounded-2xl bg-white/[0.04] hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/30 text-slate-300 hover:text-pink-300 flex items-center justify-center transition-all cursor-pointer shadow-sm group"
          >
            <KeyRound size={17} className="group-hover:scale-110 transition-transform text-pink-400" />
          </button>

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

      {/* Room & Partner Pairing Modal */}
      <AnimatePresence>
        {showRoomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm rounded-[32px] glass-panel p-6 sm:p-7 shadow-2xl border border-pink-500/30 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Couple Pairing Code</h3>
                    <p className="text-xs text-slate-400">Invite or link your partner</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRoomModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {room?.inviteCode ? (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-gradient-to-tr from-pink-500/10 via-purple-500/10 to-transparent border border-pink-500/20 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Your Secret Room Code
                    </span>
                    <div className="text-3xl sm:text-4xl font-mono font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400 my-2 select-all">
                      {room.inviteCode}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Share this code with your partner to connect your private space!
                    </p>
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="w-full py-3 rounded-2xl btn-sexy text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    {copiedCode ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copiedCode ? 'Copied to Clipboard! 💕' : 'Copy Room Code to Clipboard'}</span>
                  </button>

                  {/* Partner Status */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-pink-400" />
                      <span className="text-xs text-slate-300 font-medium">Partner:</span>
                    </div>
                    <span className="text-xs font-bold text-pink-300">
                      {partnerMember ? `Connected (${partnerMember.displayName})` : 'Waiting to join...'}
                    </span>
                  </div>

                  {/* Join different room expandable */}
                  <div className="pt-2 border-t border-white/10 space-y-3">
                    <form onSubmit={handleJoinByCode} className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Switch / Join Partner's Room Code:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 7A8B9C1D"
                          value={inviteInput}
                          onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
                          maxLength={8}
                          className="flex-1 px-3 py-2 rounded-xl glass-input text-center text-xs font-mono font-bold tracking-widest text-white uppercase outline-none"
                        />
                        <button
                          type="submit"
                          disabled={roomLoading || inviteInput.length < 8}
                          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white transition-all disabled:opacity-40 cursor-pointer"
                        >
                          Join
                        </button>
                      </div>
                    </form>

                    <button
                      onClick={handleLeaveRoom}
                      disabled={roomLoading}
                      className="w-full py-2 rounded-xl text-xs font-medium text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      Leave Current Room
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 text-center leading-relaxed">
                    You haven't paired yet. You can create a new room to get a code for your partner, or enter their code below!
                  </p>

                  <button
                    onClick={handleCreateNewRoom}
                    disabled={roomLoading}
                    className="w-full py-3.5 rounded-2xl btn-sexy text-xs font-bold text-white shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>✨ Create New Room Code</span>
                  </button>

                  <div className="relative flex items-center justify-center my-3">
                    <div className="w-full border-t border-white/10" />
                    <span className="absolute bg-[#0f0f1c] px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      OR
                    </span>
                  </div>

                  <form onSubmit={handleJoinByCode} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 text-center">
                        Have Partner's Code?
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 7A8B9C1D"
                        value={inviteInput}
                        onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
                        maxLength={8}
                        className="w-full px-4 py-3 rounded-2xl glass-input text-center text-sm font-mono font-bold tracking-widest text-white uppercase outline-none"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={roomLoading || inviteInput.length < 8}
                      className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-all disabled:opacity-40 cursor-pointer shadow-lg"
                    >
                      {roomLoading ? 'Connecting...' : 'Connect to Partner 🗝️'}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
