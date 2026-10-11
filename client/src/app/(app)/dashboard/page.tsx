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
  KeyRound, Copy, Check, Users,
  Flame, Heart, AlertCircle, Palette, ShieldCheck, CloudRain,
  Calendar, Clock, Edit2, Plus, PartyPopper
} from 'lucide-react';
import { useMoodStore, MOOD_CONFIG, formatRelativeTime } from '../../../lib/store/moodStore';
import FriendsModal from '../../../components/FriendsModal';

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
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMyId, setCopiedMyId] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [roomLoading, setRoomLoading] = useState(false);

  // Planned Event state
  const [eventTitle, setEventTitle] = useState('Midnight Movie & Cocktails');
  const [eventDate, setEventDate] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: '00',
    hours: '00',
    mins: '00',
    secs: '00',
    isPast: false,
    displayTarget: '',
  });

  // Dynamic Real-time greeting based on current local hour
  const [greeting, setGreeting] = useState('Welcome');

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting('Good morning');
      } else if (hour >= 12 && hour < 17) {
        setGreeting('Good afternoon');
      } else if (hour >= 17 && hour < 22) {
        setGreeting('Good evening');
      } else {
        setGreeting('Good night');
      }
    };
    updateGreeting();
    const interval = setInterval(updateGreeting, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const user = useAuthStore((state: any) => state.user);
  const logout = useAuthStore((state: { logout: () => void }) => state.logout);
  const updateAvatar = useAuthStore((state: any) => state.updateAvatar);
  const setAuthRoom = useAuthStore((state: any) => state.setRoom);
  const socket = useSocketStore((state: any) => state.socket);
  const { moodTheme, openModal: openMoodModal } = useMoodStore();
  const currentMoodConfig = MOOD_CONFIG[moodTheme.current] || MOOD_CONFIG.love;

  const fetchRoom = async () => {
    try {
      const res = await api.get('/rooms/mine');
      const r = res.data.room;
      setRoom(r);
      setAuthRoom(r);
      if (r?.plannedEvent) {
        if (r.plannedEvent.title) setEventTitle(r.plannedEvent.title);
        if (r.plannedEvent.targetDate) {
          const d = new Date(r.plannedEvent.targetDate);
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setEventDate(localIso);
        }
      }
    } catch {
      setRoom(null);
      setAuthRoom(null);
    }
  };

  useEffect(() => {
    fetchRoom();
  }, []);

  // Listen for room changes
  useEffect(() => {
    const handleRoomChanged = (e: any) => {
      if (e.detail) {
        setRoom(e.detail);
        setAuthRoom(e.detail);
      } else {
        fetchRoom();
      }
    };
    window.addEventListener('room:changed', handleRoomChanged);
    return () => window.removeEventListener('room:changed', handleRoomChanged);
  }, []);

  // Socket room listeners
  useEffect(() => {
    if (!socket) return;
    const handleMemberJoined = (data: any) => {
      fetchRoom();
      toast(`${data.user?.displayName || 'Friend'} joined the room!`, { icon: '👋' });
    };
    const handleMemberLeft = (data: any) => {
      fetchRoom();
      toast(`${data.displayName || 'A member'} left the room.`, { icon: '👋' });
    };
    const handleEventUpdate = (data: any) => {
      if (data) {
        setRoom((prev: any) => prev ? { ...prev, plannedEvent: data } : prev);
        if (data.title) setEventTitle(data.title);
        if (data.targetDate) {
          const d = new Date(data.targetDate);
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setEventDate(localIso);
        }
        toast.success(`Date event updated to "${data.title}" by partner! 🥂`);
      }
    };

    socket.on('room:member-joined', handleMemberJoined);
    socket.on('room:member-left', handleMemberLeft);
    socket.on('room:event-update', handleEventUpdate);

    return () => {
      socket.off('room:member-joined', handleMemberJoined);
      socket.off('room:member-left', handleMemberLeft);
      socket.off('room:event-update', handleEventUpdate);
    };
  }, [socket]);

  // Real-time Countdown Timer Calculation
  useEffect(() => {
    const calculateCountdown = () => {
      let targetTime: number;
      if (room?.plannedEvent?.targetDate) {
        targetTime = new Date(room.plannedEvent.targetDate).getTime();
      } else if (eventDate) {
        targetTime = new Date(eventDate).getTime();
      } else {
        // Fallback default: 4 days, 18 hours, 25 mins from initial load
        targetTime = Date.now() + (4 * 24 + 18) * 3600000 + 25 * 60000;
      }

      const diff = targetTime - Date.now();
      const targetObj = new Date(targetTime);
      const displayTarget = targetObj.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      if (diff <= 0) {
        setTimeLeft({
          days: '00',
          hours: '00',
          mins: '00',
          secs: '00',
          isPast: true,
          displayTarget,
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / 1000 / 60) % 60);
      const secs = Math.floor((diff / 1000) % 60);

      setTimeLeft({
        days: days.toString().padStart(2, '0'),
        hours: hours.toString().padStart(2, '0'),
        mins: mins.toString().padStart(2, '0'),
        secs: secs.toString().padStart(2, '0'),
        isPast: false,
        displayTarget,
      });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [room, eventDate]);

  const handleCopyCode = () => {
    if (!room?.inviteCode) return;
    navigator.clipboard.writeText(room.inviteCode);
    setCopiedCode(true);
    toast.success('Room code copied! Share with friends');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyMyId = () => {
    if (!user?.friendId) return;
    navigator.clipboard.writeText(user.friendId);
    setCopiedMyId(true);
    toast.success('Your User ID copied!');
    setTimeout(() => setCopiedMyId(false), 2000);
  };

  const handleCreateNewRoom = async () => {
    setRoomLoading(true);
    try {
      const res = await api.post('/rooms/create');
      setRoom(res.data.room);
      setAuthRoom(res.data.room);
      if (socket) {
        socket.emit('room:switch', { roomId: res.data.room._id });
      }
      toast.success('New room created! Share the code to connect');
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
      if (socket) {
        socket.emit('room:switch', { roomId: res.data.room._id });
      }
      toast.success('Joined room successfully!');
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
      if (socket) {
        socket.emit('room:switch', { roomId: null });
      }
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
      toast.success('Profile avatar updated!');
      setShowAvatarModal(false);
    } catch {
      toast.error('Failed to update avatar');
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      toast.error('Please enter an event title');
      return;
    }
    if (!eventDate) {
      toast.error('Please pick a date and time');
      return;
    }

    setSavingEvent(true);
    try {
      const targetDateObj = new Date(eventDate);
      const res = await api.patch('/rooms/event', {
        title: eventTitle.trim(),
        targetDate: targetDateObj.toISOString(),
      });
      const updatedEvent = res.data.plannedEvent;
      setRoom((prev: any) => prev ? { ...prev, plannedEvent: updatedEvent } : prev);
      if (socket) {
        socket.emit('room:event-update', updatedEvent);
      }
      toast.success('Event date & time updated!');
      setShowEventModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save event');
    } finally {
      setSavingEvent(false);
    }
  };

  const handlePresetEvent = (title: string, hoursAhead: number) => {
    setEventTitle(title);
    const target = new Date(Date.now() + hoursAhead * 3600000);
    const localIso = new Date(target.getTime() - target.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEventDate(localIso);
  };

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    router.push('/login');
  };

  return (
    <div className="relative min-h-screen p-3.5 sm:p-6 md:p-8 lg:p-10 w-full max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto space-y-5 pb-32">
      {/* Subtle ambient lighting */}
      <div className="ambient-glow-pink -top-28 -left-20 pointer-events-none" />
      <div className="ambient-glow-purple top-64 -right-28 pointer-events-none" />

      {/* Header Profile - Luxury Modern Architecture with Rich Detailing */}
      <header className="relative p-5 sm:p-6 rounded-[32px] glass-panel z-10 border border-white/[0.14] shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.18)] space-y-4 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/[0.04] via-transparent to-purple-500/[0.04] pointer-events-none" />

        {/* Top Profile Row */}
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            {/* Avatar with luxury glowing rotating ring - strictly constrained dimensions */}
            <button 
              onClick={() => setShowAvatarModal(true)}
              title="Change Profile Avatar"
              className="relative w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] sm:w-14 sm:h-14 sm:min-w-[56px] sm:min-h-[56px] sm:max-w-[56px] sm:max-h-[56px] rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-400 to-purple-600 p-[2.5px] shadow-[0_0_25px_rgba(244,63,142,0.5)] group hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <div className="w-full h-full rounded-[13px] bg-[#0c0c17] flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                ) : (
                  <User size={22} className="text-pink-400" />
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-[10px] flex items-center justify-center border-2 border-[#080811] text-white shadow-md">
                <Edit3 size={10} />
              </span>
            </button>

            {/* Greeting & Name with High-End Detailing */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-extrabold tracking-wider uppercase text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">• Room Active</span>
              </div>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-white tracking-tight truncate">
                {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-300 drop-shadow-[0_2px_10px_rgba(244,63,142,0.3)]">{user?.displayName}</span>
              </h1>
            </div>
          </div>

          {/* Action Buttons Cluster - Sculpted 3D Jewel Glass Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Palette Button */}
            <button
              onClick={openMoodModal}
              title={`Mood Theme: ${currentMoodConfig.label}`}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-b from-purple-500/25 to-pink-500/15 hover:from-purple-500/40 hover:to-pink-500/30 border border-pink-400/40 hover:border-pink-300 shadow-[0_4px_16px_rgba(244,63,142,0.3),inset_0_1px_1px_rgba(255,255,255,0.35)] flex items-center justify-center transition-all cursor-pointer group active:scale-90 active:translate-y-0.5 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-60 pointer-events-none" />
              <Palette size={16} style={{ color: currentMoodConfig.primaryColor }} className="group-hover:scale-110 group-hover:rotate-12 transition-transform drop-shadow" />
            </button>

            {/* Room Settings Key Button */}
            <button
              onClick={() => setShowRoomModal(true)}
              title="Room Settings"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-b from-amber-500/20 to-pink-500/15 hover:from-amber-500/35 hover:to-pink-500/30 border border-amber-400/40 hover:border-amber-300 shadow-[0_4px_16px_rgba(245,158,11,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)] text-amber-300 flex items-center justify-center transition-all cursor-pointer group active:scale-90 active:translate-y-0.5 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-60 pointer-events-none" />
              <KeyRound size={16} className="group-hover:scale-110 group-hover:-rotate-12 transition-transform drop-shadow" />
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-b from-rose-500/20 to-red-500/10 hover:from-rose-500/35 hover:to-red-500/25 border border-rose-500/35 hover:border-rose-400 shadow-[0_4px_16px_rgba(244,63,94,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)] text-rose-300 flex items-center justify-center transition-all cursor-pointer group active:scale-90 active:translate-y-0.5 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-60 pointer-events-none" />
              <LogOut size={16} className="group-hover:scale-110 group-hover:translate-x-0.5 transition-transform drop-shadow" />
            </button>
          </div>
        </div>

        {/* Bottom Metadata & Interactive Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2.5 border-t border-white/[0.08] relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            {/* User ID Pill Badge */}
            <button
              type="button"
              onClick={handleCopyMyId}
              title="Click to copy your unique User ID"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-transparent hover:from-cyan-500/25 border border-cyan-400/40 hover:border-cyan-300 text-cyan-200 text-xs font-mono font-bold flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all shadow-[0_2px_12px_rgba(6,182,212,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95"
            >
              <ShieldCheck size={13} className="text-cyan-400 shrink-0" />
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-sans font-bold">ID:</span>
              <span>{user?.friendId || '...'}</span>
              {copiedMyId ? <Check size={12} className="text-emerald-400 shrink-0" /> : <Copy size={12} className="text-slate-400 shrink-0" />}
            </button>

            {/* Room Code Pill Badge */}
            {room?.inviteCode ? (
              <button
                onClick={handleCopyCode}
                title="Click to copy Room Code"
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500/20 via-purple-500/15 to-transparent hover:from-pink-500/30 border border-pink-400/40 hover:border-pink-300 text-xs font-medium text-white shadow-[0_2px_12px_rgba(244,63,142,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <KeyRound size={12} className="text-pink-400 shrink-0" />
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Room:</span>
                <span className="font-mono font-bold text-pink-300 tracking-wider">{room.inviteCode}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-500/30 text-pink-200 font-extrabold flex items-center gap-1 border border-pink-400/30 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{room.members?.length || 1}</span>
                </span>
                {copiedCode ? <Check size={12} className="text-emerald-400 shrink-0" /> : <Copy size={12} className="text-slate-400 shrink-0" />}
              </button>
            ) : (
              <button
                onClick={() => setShowRoomModal(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_4px_15px_rgba(244,63,142,0.3)] active:scale-95"
              >
                <KeyRound size={12} />
                <span>Create Room</span>
              </button>
            )}
          </div>

          {/* Connections Pill Button */}
          <button
            type="button"
            onClick={() => setShowFriendsModal(true)}
            className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 via-teal-500/15 to-emerald-500/15 hover:from-cyan-500/30 hover:to-emerald-500/25 border border-cyan-400/40 hover:border-cyan-300 text-white text-xs font-extrabold flex items-center gap-2 shadow-[0_2px_12px_rgba(6,182,212,0.3),inset_0_1px_1px_rgba(255,255,255,0.25)] active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Users size={13} className="text-cyan-300" />
            <span>Connections</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      </header>

      {/* Mood Theme Card - Tactile & Interactive */}
      <div 
        onClick={openMoodModal}
        className="relative p-4 sm:p-5 rounded-[28px] glass-panel border transition-all duration-300 cursor-pointer group hover:scale-[1.008] active:scale-[0.99] overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)]"
        style={{
          borderColor: `${currentMoodConfig.primaryColor}45`,
          background: `linear-gradient(135deg, ${currentMoodConfig.primaryColor}18 0%, rgba(255, 255, 255, 0.02) 100%)`
        }}
      >
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] group-hover:scale-105 transition-transform shrink-0 relative overflow-hidden"
              style={{
                backgroundColor: `${currentMoodConfig.primaryColor}25`,
                borderColor: `${currentMoodConfig.primaryColor}60`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-60 pointer-events-none" />
              {moodTheme.current === 'love' && <Heart size={22} className="text-pink-400 fill-pink-400/20" />}
              {moodTheme.current === 'angry' && <Flame size={22} className="text-rose-400 fill-rose-400/20" />}
              {moodTheme.current === 'just_friends' && <Users size={22} className="text-cyan-400" />}
              {moodTheme.current === 'sad' && <CloudRain size={22} className="text-blue-400 fill-blue-400/20" />}
              {moodTheme.current === 'horny' && <Flame size={22} className="text-fuchsia-400 fill-fuchsia-400/20" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Mood Theme
                </span>
                <span 
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider flex items-center gap-1 shadow-sm"
                  style={{
                    backgroundColor: `${currentMoodConfig.primaryColor}25`,
                    color: currentMoodConfig.primaryColor,
                    borderColor: `${currentMoodConfig.primaryColor}50`,
                  }}
                >
                  <span>{currentMoodConfig.label}</span>
                </span>
              </div>

              <div className="text-[11px] text-slate-300 font-medium mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="italic text-white/95 font-semibold">"{currentMoodConfig.quote}"</span>
                <span className="text-slate-500">•</span>
                <span>By <strong className="text-white">{moodTheme.updatedByName || 'Partner'}</strong> ({formatRelativeTime(moodTheme.updatedAt)})</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openMoodModal();
            }}
            className="px-4 py-2 rounded-xl text-xs font-black tracking-wide text-white transition-all shadow-[0_4px_18px_rgba(244,63,142,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:brightness-110 active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Palette size={14} className="text-white" />
            <span>Customize</span>
          </button>
        </div>
      </div>

      {/* Hero Countdown / Next Date Card - Sculpted Airport Flip-Clock Capsules */}
      <div className="relative p-5 sm:p-6 md:p-7 rounded-[32px] overflow-hidden glass-panel border border-pink-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.15)] group bg-gradient-to-b from-[#140b1e]/90 via-[#0e0717]/95 to-[#08030d]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex justify-between items-start gap-3 mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-500/25 text-pink-300 border border-pink-400/40 shadow-sm">
                <CalendarHeart size={13} className="text-pink-300" />
                <span>Next Planned Date</span>
              </span>
              {timeLeft.displayTarget && (
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/10">
                  <Clock size={12} className="text-amber-400" />
                  <span>{timeLeft.displayTarget}</span>
                </span>
              )}
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white break-words line-clamp-2 drop-shadow-md">
              {room?.plannedEvent?.title || eventTitle}
            </h3>
          </div>

          <button
            onClick={() => setShowEventModal(true)}
            title="Edit Date, Time & Title"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500/25 to-purple-500/25 hover:from-pink-500 hover:to-purple-600 border border-pink-400/40 text-pink-200 hover:text-white text-xs font-bold transition-all shadow-[0_4px_15px_rgba(244,63,142,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Edit2 size={13} />
            <span>Edit Event</span>
          </button>
        </div>

        {timeLeft.isPast ? (
          <div className="py-4 px-3 rounded-2xl bg-gradient-to-r from-pink-500/25 via-purple-500/25 to-pink-500/25 border border-pink-500/40 text-center animate-pulse shadow-lg">
            <div className="flex items-center justify-center gap-2 text-pink-200 font-black text-sm sm:text-base">
              <PartyPopper size={20} />
              <span>It's Date Time! Enjoy your special moment together 🥂✨</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4.5 pt-1 text-center">
            {[
              { val: timeLeft.days, label: 'Days' },
              { val: timeLeft.hours, label: 'Hours' },
              { val: timeLeft.mins, label: 'Mins' },
              { val: timeLeft.secs, label: 'Secs' },
            ].map((item, idx) => (
              <div 
                key={idx} 
                className="relative p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-white/[0.08] via-white/[0.03] to-black/50 border border-white/[0.14] shadow-[0_12px_30px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25)] overflow-hidden group"
              >
                <div className="text-2xl sm:text-4xl md:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)]">
                  {item.val}
                </div>
                <div className="text-[9px] sm:text-[11px] font-black tracking-widest uppercase text-pink-300 mt-1">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Widgets Grid - 4 Interactive Cards with Tactile Action Buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5">
        
        {/* Watch Together */}
        <Link 
          href="/watch" 
          className="relative p-4 sm:p-5 rounded-[28px] glass-panel hover:border-pink-500/50 transition-all duration-300 group overflow-hidden flex flex-col justify-between shadow-[0_12px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:scale-[1.015]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-pink-500/25 to-pink-500/10 border border-pink-400/40 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(244,63,142,0.35),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                <Clapperboard size={22} />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/30">
                4K SYNC
              </span>
            </div>
            <h3 className="font-extrabold text-white text-sm sm:text-base group-hover:text-pink-200 transition-colors">Watch Together</h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Synced YouTube & Movies</p>
          </div>
          
          {/* Tactile Button Pill */}
          <div className="mt-4 w-full py-2 px-3 rounded-xl bg-white/[0.05] group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-rose-600 border border-white/10 group-hover:border-pink-400/40 text-xs font-bold text-white transition-all duration-300 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
            <span>Stream Now</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>

        {/* Couples Arcade */}
        <Link 
          href="/games" 
          className="relative p-4 sm:p-5 rounded-[28px] glass-panel hover:border-purple-500/50 transition-all duration-300 group overflow-hidden flex flex-col justify-between shadow-[0_12px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:scale-[1.015]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-purple-500/25 to-purple-500/10 border border-purple-400/40 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(147,51,234,0.35),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                <Gamepad2 size={22} />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                8+ GAMES
              </span>
            </div>
            <h3 className="font-extrabold text-white text-sm sm:text-base group-hover:text-purple-200 transition-colors">Couples Arcade</h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Chess, Pool, Ludo & Uno</p>
          </div>
          
          {/* Tactile Button Pill */}
          <div className="mt-4 w-full py-2 px-3 rounded-xl bg-white/[0.05] group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-500 border border-white/10 group-hover:border-purple-400/40 text-xs font-bold text-white transition-all duration-300 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
            <span>Play Games</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>

        {/* Shared Goals */}
        <Link 
          href="/goals" 
          className="relative p-4 sm:p-5 rounded-[28px] glass-panel hover:border-emerald-500/50 transition-all duration-300 group overflow-hidden flex flex-col justify-between shadow-[0_12px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:scale-[1.015]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-emerald-500/25 to-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                <Target size={22} />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                70% DONE
              </span>
            </div>
            <h3 className="font-extrabold text-white text-sm sm:text-base group-hover:text-emerald-200 transition-colors">Shared Goals</h3>
            <div className="w-full h-2 bg-white/[0.08] rounded-full mt-2 overflow-hidden p-0.5 border border-white/5">
              <div className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-emerald-400 rounded-full w-[70%] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>
          </div>
          
          {/* Tactile Button Pill */}
          <div className="mt-4 w-full py-2 px-3 rounded-xl bg-white/[0.05] group-hover:bg-gradient-to-r group-hover:from-emerald-500 group-hover:to-teal-600 border border-white/10 group-hover:border-emerald-400/40 text-xs font-bold text-white transition-all duration-300 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
            <span>View Goals</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>

        {/* Real-time Map */}
        <Link 
          href="/map" 
          className="relative p-4 sm:p-5 rounded-[28px] glass-panel hover:border-blue-500/50 transition-all duration-300 group overflow-hidden flex flex-col justify-between shadow-[0_12px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:scale-[1.015]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-blue-500/25 to-blue-500/10 border border-blue-400/40 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(59,130,246,0.35),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                <MapPin size={22} />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                LIVE GPS
              </span>
            </div>
            <h3 className="font-extrabold text-white text-sm sm:text-base group-hover:text-blue-200 transition-colors">Real-time Map</h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Distance & Live Radar</p>
          </div>
          
          {/* Tactile Button Pill */}
          <div className="mt-4 w-full py-2 px-3 rounded-xl bg-white/[0.05] group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-cyan-500 border border-white/10 group-hover:border-blue-400/40 text-xs font-bold text-white transition-all duration-300 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
            <span>Explore Map</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>
      </div>

      {/* Edit Planned Event Modal (Date + Time Picker) */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              className="relative w-full max-w-sm rounded-3xl glass-panel p-5 sm:p-6 shadow-2xl border border-pink-500/30 overflow-hidden bg-[#0c0d1a]/95"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-300">
                    <CalendarHeart size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Plan Next Event 🥂</h3>
                    <p className="text-[11px] text-slate-400">Set event title and exact date & time</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="e.g. Midnight Movie & Cocktails"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-pink-500/60"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs sm:text-sm text-white outline-none focus:border-pink-500/60 font-mono"
                    required
                  />
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Quick Presets:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePresetEvent('Movie Night 🍿', 28)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-pink-500/20 border border-white/5 text-[10px] font-medium text-slate-300 hover:text-white transition-all text-left"
                    >
                      Tomorrow 8 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetEvent('Candlelight Dinner 🍷', 72)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-pink-500/20 border border-white/5 text-[10px] font-medium text-slate-300 hover:text-white transition-all text-left"
                    >
                      This Friday 9 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetEvent('Weekend Getaway ✈️', 120)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-pink-500/20 border border-white/5 text-[10px] font-medium text-slate-300 hover:text-white transition-all text-left"
                    >
                      This Saturday 7 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetEvent('Sunday Brunch ☕', 144)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-pink-500/20 border border-white/5 text-[10px] font-medium text-slate-300 hover:text-white transition-all text-left"
                    >
                      Sunday Brunch 11 AM
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEvent}
                    className="flex-1 py-2.5 rounded-xl btn-sexy text-xs font-bold text-white shadow-lg disabled:opacity-50"
                  >
                    {savingEvent ? 'Saving...' : 'Save & Sync'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cute Avatar Selector Modal */}
      <AnimatePresence>
        {showAvatarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm rounded-[32px] glass-panel p-6 shadow-2xl border border-pink-500/30 overflow-hidden bg-[#0c0d1a]/95"
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-lg text-white">Choose Your Avatar</h3>
                  <p className="text-xs text-slate-400">Select how your partner sees you</p>
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
                Click any companion to update instantly!
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
              className="relative w-full max-w-sm rounded-[32px] glass-panel p-6 sm:p-7 shadow-2xl border border-pink-500/30 overflow-hidden bg-[#0c0d1a]/95"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Party Room & Code</h3>
                    <p className="text-xs text-slate-400">Connect with friends using the room code</p>
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
                      Your Room Code
                    </span>
                    <div className="text-3xl sm:text-4xl font-mono font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400 my-2 select-all">
                      {room.inviteCode}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Share this code with friends — all of you can join the same room!
                    </p>
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="w-full py-3 rounded-2xl btn-sexy text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    {copiedCode ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copiedCode ? 'Copied Room Code!' : 'Copy Room Code to Clipboard'}</span>
                  </button>

                  {/* All Party Members in Room */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-pink-400" />
                        <span className="text-xs text-slate-300 font-bold">Room Members ({room?.members?.length || 1}):</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRoomModal(false);
                          setShowFriendsModal(true);
                        }}
                        className="text-[10px] text-cyan-300 font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 transition-all cursor-pointer"
                      >
                        + Connections
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                      {(room?.members || []).map((m: any) => {
                        const isMe = m._id === (user as any)?._id;
                        return (
                          <span
                            key={m._id}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 ${
                              isMe
                                ? 'bg-pink-500/20 border-pink-500/40 text-pink-200'
                                : 'bg-white/[0.05] border-white/10 text-slate-200'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{m.displayName}{isMe ? ' (You)' : ''}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Switch / Join different room */}
                  <div className="pt-2 border-t border-white/10 space-y-3">
                    <form onSubmit={handleJoinByCode} className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Switch / Join Another Room Code:
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
                    You're not in any room right now. Create a new room to host your partner or enter their code below!
                  </p>

                  <button
                    onClick={handleCreateNewRoom}
                    disabled={roomLoading}
                    className="w-full py-3.5 rounded-2xl btn-sexy text-xs font-bold text-white shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>✨ Create New Room</span>
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
                        Have Room Code?
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
                      {roomLoading ? 'Connecting...' : 'Join Room'}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Friends Modal */}
      <FriendsModal
        isOpen={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        currentRoomCode={room?.inviteCode}
      />
    </div>
  );
}
