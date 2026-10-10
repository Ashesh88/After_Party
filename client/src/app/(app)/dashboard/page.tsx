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
  Flame, Heart, AlertCircle, Palette, ShieldCheck,
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

  const greeting = "Good evening";

  return (
    <div className="relative min-h-screen p-3.5 sm:p-6 md:p-8 lg:p-10 w-full max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto space-y-5 pb-32">
      {/* Subtle ambient lighting */}
      <div className="ambient-glow-pink -top-28 -left-20 pointer-events-none" />
      <div className="ambient-glow-purple top-64 -right-28 pointer-events-none" />

      {/* Header Profile - Modern Clean SaaS Architecture */}
      <header className="relative p-4 sm:p-5 rounded-3xl glass-panel z-10 border border-white/10 shadow-xl space-y-3.5">
        {/* Top Profile Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar with edit overlay */}
            <button 
              onClick={() => setShowAvatarModal(true)}
              title="Change Profile Avatar"
              className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-[2px] shadow-md group hover:scale-105 transition-transform cursor-pointer shrink-0"
            >
              <div className="w-full h-full rounded-[14px] bg-[#0c0c17] flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-pink-400" />
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-pink-500 text-[9px] flex items-center justify-center border-2 border-[#080811] text-white">
                <Edit3 size={9} />
              </span>
            </button>

            {/* Greeting & Name */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Online</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400">{user?.displayName}</span>
              </h1>
            </div>
          </div>

          {/* Action Icons Cluster */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={openMoodModal}
              title={`Mood Theme: ${currentMoodConfig.label}`}
              className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border flex items-center justify-center transition-all cursor-pointer shadow-sm group"
              style={{
                borderColor: `${currentMoodConfig.primaryColor}50`,
                backgroundColor: `${currentMoodConfig.primaryColor}15`,
              }}
            >
              <Palette size={15} style={{ color: currentMoodConfig.primaryColor }} className="group-hover:scale-110 transition-transform" />
            </button>

            <button
              onClick={() => setShowRoomModal(true)}
              title="Room Settings"
              className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/30 text-pink-400 flex items-center justify-center transition-all cursor-pointer shadow-sm group"
            >
              <KeyRound size={15} className="group-hover:scale-110 transition-transform" />
            </button>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-all cursor-pointer shadow-sm group"
            >
              <LogOut size={15} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* Bottom Metadata & Navigation Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/[0.06]">
          {/* User ID Badge */}
          <button
            type="button"
            onClick={handleCopyMyId}
            title="Click to copy your unique User ID"
            className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
          >
            <ShieldCheck size={12} className="text-cyan-400" />
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">User ID:</span>
            <span>{user?.friendId || '...'}</span>
            {copiedMyId ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} className="text-slate-400" />}
          </button>

          {/* Room Pill */}
          {room?.inviteCode ? (
            <button
              onClick={handleCopyCode}
              title="Click to copy Room Code"
              className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-pink-500/15 border border-white/10 hover:border-pink-500/30 text-[11px] font-medium text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <KeyRound size={11} className="text-pink-400" />
              <span className="text-[9px] text-slate-400 uppercase font-sans">Room:</span>
              <span className="font-mono font-bold text-pink-300">{room.inviteCode}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 font-bold">
                {room.members?.length || 1}
              </span>
              {copiedCode ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} className="text-slate-400" />}
            </button>
          ) : (
            <button
              onClick={() => setShowRoomModal(true)}
              className="px-2.5 py-1 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-[11px] font-bold text-pink-300 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <KeyRound size={11} />
              <span>Create Room</span>
            </button>
          )}

          {/* Connections Pill */}
          <button
            type="button"
            onClick={() => setShowFriendsModal(true)}
            className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/30 text-slate-200 hover:text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ml-auto"
          >
            <Users size={12} className="text-cyan-400" />
            <span>Connections</span>
          </button>
        </div>
      </header>

      {/* Couple Mood Atmosphere Card */}
      <div 
        onClick={openMoodModal}
        className="relative p-4 sm:p-5 rounded-3xl glass-panel border transition-all duration-300 cursor-pointer group hover:scale-[1.01] active:scale-[0.99] overflow-hidden shadow-xl"
        style={{
          borderColor: `${currentMoodConfig.primaryColor}35`,
          background: `linear-gradient(135deg, ${currentMoodConfig.primaryColor}12 0%, rgba(255, 255, 255, 0.02) 100%)`
        }}
      >
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center border shadow-md group-hover:scale-105 transition-transform shrink-0"
              style={{
                backgroundColor: `${currentMoodConfig.primaryColor}25`,
                borderColor: `${currentMoodConfig.primaryColor}55`,
              }}
            >
              {moodTheme.current === 'love' && <Heart size={20} className="text-pink-400 fill-pink-400/20" />}
              {moodTheme.current === 'horny' && <Flame size={20} className="text-fuchsia-400 fill-fuchsia-400/20" />}
              {moodTheme.current === 'angry' && <AlertCircle size={20} className="text-rose-400" />}
              {moodTheme.current === 'just_friends' && <Users size={20} className="text-cyan-400" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Couple Atmosphere
                </span>
                <span 
                  className="px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider"
                  style={{
                    backgroundColor: `${currentMoodConfig.primaryColor}20`,
                    color: currentMoodConfig.primaryColor,
                    borderColor: `${currentMoodConfig.primaryColor}40`,
                  }}
                >
                  {currentMoodConfig.label}
                </span>
              </div>

              <div className="text-[11px] text-slate-300 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Set by:</span>
                <strong className="text-white font-bold">{moodTheme.updatedByName || 'Partner'}</strong>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">{formatRelativeTime(moodTheme.updatedAt)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openMoodModal();
            }}
            className="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shrink-0 active:scale-95"
            style={{
              backgroundColor: `${currentMoodConfig.primaryColor}20`,
              borderColor: `${currentMoodConfig.primaryColor}50`,
              color: '#ffffff',
            }}
          >
            <Palette size={13} style={{ color: currentMoodConfig.primaryColor }} />
            <span>Customize</span>
          </button>
        </div>
      </div>

      {/* Hero Countdown / Next Date Card - Fully Editable with Date & Time */}
      <div className="relative p-5 sm:p-6 md:p-7 rounded-[32px] overflow-hidden glass-panel border border-pink-500/25 shadow-xl group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex justify-between items-start gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/30">
                <CalendarHeart size={12} className="text-pink-300" />
                <span>Next Planned Date</span>
              </span>
              {timeLeft.displayTarget && (
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <Clock size={11} className="text-slate-400" />
                  <span>{timeLeft.displayTarget}</span>
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white mt-1.5 truncate">
              {room?.plannedEvent?.title || eventTitle}
            </h3>
          </div>

          <button
            onClick={() => setShowEventModal(true)}
            title="Edit Date, Time & Title"
            className="px-3 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
          >
            <Edit2 size={12} />
            <span>Edit Event</span>
          </button>
        </div>

        {timeLeft.isPast ? (
          <div className="py-4 px-3 rounded-2xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-pink-500/20 border border-pink-500/30 text-center animate-pulse">
            <div className="flex items-center justify-center gap-2 text-pink-300 font-extrabold text-sm sm:text-base">
              <PartyPopper size={18} />
              <span>It's Date Time! Enjoy your special moment together 🥂✨</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 pt-1 text-center">
            {[
              { val: timeLeft.days, label: 'Days' },
              { val: timeLeft.hours, label: 'Hours' },
              { val: timeLeft.mins, label: 'Mins' },
              { val: timeLeft.secs, label: 'Secs' },
            ].map((item, idx) => (
              <div key={idx} className="p-2.5 sm:p-3 md:p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
                <div className="text-xl sm:text-3xl md:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
                  {item.val}
                </div>
                <div className="text-[9px] sm:text-[10px] md:text-xs font-bold tracking-widest uppercase text-slate-400 mt-0.5">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Widgets Grid - 2x2 on Mobile, 4-across on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5">
        <Link 
          href="/watch" 
          className="relative p-4 sm:p-5 rounded-3xl glass-panel hover:border-pink-500/40 transition-all duration-300 group overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="w-11 h-11 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-3 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(244,63,142,0.2)]">
              <Clapperboard size={22} />
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base">Watch Together</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Synced YouTube & Video</p>
          </div>
          <div className="mt-3 flex items-center text-xs font-semibold text-pink-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>Stream now</span>
            <ArrowRight size={12} />
          </div>
        </Link>

        <Link 
          href="/games" 
          className="relative p-4 sm:p-5 rounded-3xl glass-panel hover:border-purple-500/40 transition-all duration-300 group overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(147,51,234,0.2)]">
              <Gamepad2 size={22} />
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base">Couples Arcade</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Chess, Ludo & Quizzes</p>
          </div>
          <div className="mt-3 flex items-center text-xs font-semibold text-purple-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>Play now</span>
            <ArrowRight size={12} />
          </div>
        </Link>

        <Link 
          href="/goals" 
          className="p-4 sm:p-5 rounded-3xl glass-panel hover:border-emerald-500/40 transition-all duration-300 group overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Target size={20} />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                70% Done
              </span>
            </div>
            <h4 className="font-bold text-white text-sm sm:text-base">Shared Goals</h4>
            <div className="w-full h-1.5 bg-white/[0.08] rounded-full mt-2.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 w-[70%]" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs font-semibold text-emerald-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>View goals</span>
            <ArrowRight size={12} />
          </div>
        </Link>

        <Link 
          href="/map" 
          className="p-4 sm:p-5 rounded-3xl glass-panel hover:border-blue-500/40 transition-all duration-300 group overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <MapPin size={20} />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Live GPS
              </span>
            </div>
            <h4 className="font-bold text-white text-sm sm:text-base">Real-time Map</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Distance & Presence</p>
          </div>
          <div className="mt-3 flex items-center text-xs font-semibold text-blue-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>Explore map</span>
            <ArrowRight size={12} />
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
