'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, UserPlus, Users, Copy, Check, Send, 
  Trash2, ShieldCheck, Gamepad2, Sparkles, Loader2,
  KeyRound, Search, Phone, Video, MessageCircle, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../lib/store/authStore';
import { useSocketStore } from '../lib/store/socketStore';
import { useCallStore } from '../lib/store/callStore';
import { Friend } from '../lib/types';
import { formatRelativeTime } from '../lib/store/moodStore';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomCode?: string;
  onJoinRoom?: (code: string) => void;
}

interface PresenceDetail {
  online: boolean;
  lastSeen?: string | null;
}

export default function FriendsModal({ isOpen, onClose, currentRoomCode }: FriendsModalProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const socket = useSocketStore((state) => state.socket);
  const startCall = useCallStore((state) => state.startCall);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceDetail>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [friendIdInput, setFriendIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingFriend, setAddingFriend] = useState(false);
  const [copiedMyId, setCopiedMyId] = useState(false);
  const [copiedFriendId, setCopiedFriendId] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [callingId, setCallingId] = useState<string | null>(null);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const res = await api.get('/friends');
      const friendList: Friend[] = res.data.friends || [];
      setFriends(friendList);

      // Query online presence & last seen from socket
      if (socket && friendList.length > 0) {
        const ids = friendList.map((f) => f._id);
        socket.emit('presence:query', ids, (statusMap: Record<string, any>) => {
          if (statusMap) {
            const normalized: Record<string, PresenceDetail> = {};
            Object.keys(statusMap).forEach((id) => {
              const val = statusMap[id];
              if (typeof val === 'boolean') {
                normalized[id] = { online: val };
              } else if (val && typeof val === 'object') {
                normalized[id] = { online: Boolean(val.online), lastSeen: val.lastSeen };
              } else {
                normalized[id] = { online: false };
              }
            });
            setPresenceMap(normalized);
          }
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen]);

  // Listen to presence events & incoming added friends
  useEffect(() => {
    if (!socket) return;

    const handleOnline = (data: { userId: string }) => {
      setPresenceMap((prev) => ({
        ...prev,
        [data.userId]: { ...prev[data.userId], online: true },
      }));
    };

    const handleOffline = (data: { userId: string; lastSeen?: string }) => {
      setPresenceMap((prev) => ({
        ...prev,
        [data.userId]: { online: false, lastSeen: data.lastSeen || new Date().toISOString() },
      }));
    };

    const handleFriendAdded = (data: { friend: Friend }) => {
      setFriends((prev) => {
        if (prev.some((f) => f._id === data.friend._id)) return prev;
        return [...prev, data.friend];
      });
      toast.success(`${data.friend.displayName} added you as a friend! 🎮`);
    };

    socket.on('presence:online', handleOnline);
    socket.on('presence:offline', handleOffline);
    socket.on('friend:added', handleFriendAdded);

    return () => {
      socket.off('presence:online', handleOnline);
      socket.off('presence:offline', handleOffline);
      socket.off('friend:added', handleFriendAdded);
    };
  }, [socket]);

  // Search filter
  const filteredFriends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => {
      const matchName = f.displayName?.toLowerCase().includes(q);
      const matchId = f.friendId?.toLowerCase().includes(q);
      const matchEmail = f.email?.toLowerCase().includes(q);
      return matchName || matchId || matchEmail;
    });
  }, [friends, searchQuery]);

  const handleCopyMyId = () => {
    if (!user?.friendId) return;
    navigator.clipboard.writeText(user.friendId);
    setCopiedMyId(true);
    toast.success('Your Player ID copied! Share with friends 🎮');
    setTimeout(() => setCopiedMyId(false), 2000);
  };

  const handleCopyFriendId = (id: string, friendIdVal: string) => {
    navigator.clipboard.writeText(friendIdVal);
    setCopiedFriendId(id);
    toast.success(`Copied ID: ${friendIdVal}`);
    setTimeout(() => setCopiedFriendId(null), 2000);
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = friendIdInput.trim();
    if (!query) return;

    setAddingFriend(true);
    try {
      const res = await api.post('/friends/add', { friendId: query });
      toast.success(res.data.message || 'Friend added successfully! 🎉');
      setFriendIdInput('');
      if (res.data.friend) {
        setFriends((prev) => [...prev, res.data.friend]);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add friend. Check ID.');
    } finally {
      setAddingFriend(false);
    }
  };

  const handleInviteToRoom = async (friend: Friend) => {
    if (!currentRoomCode) {
      toast.error('You need to be in a room to invite friends!');
      return;
    }

    setInvitingId(friend._id);
    try {
      await api.post('/friends/invite', { friendUserId: friend._id });
      toast.success(`Room invite sent to ${friend.displayName}! 🚀`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send invite');
    } finally {
      setInvitingId(null);
    }
  };

  // Direct Audio Call
  const handleDirectAudioCall = async (friend: Friend) => {
    if (!socket) {
      toast.error('Socket not connected. Please refresh.');
      return;
    }
    setCallingId(friend._id);
    try {
      await startCall(
        socket,
        'audio',
        {
          _id: friend._id,
          displayName: friend.displayName,
          avatar: friend.avatar,
        },
        user ? { displayName: user.displayName, avatar: user.avatar } : null
      );
      onClose();
    } catch {
      toast.error('Could not start voice call');
    } finally {
      setCallingId(null);
    }
  };

  // Direct Video Call
  const handleDirectVideoCall = async (friend: Friend) => {
    if (!socket) {
      toast.error('Socket not connected. Please refresh.');
      return;
    }
    setCallingId(friend._id);
    try {
      await startCall(
        socket,
        'video',
        {
          _id: friend._id,
          displayName: friend.displayName,
          avatar: friend.avatar,
        },
        user ? { displayName: user.displayName, avatar: user.avatar } : null
      );
      onClose();
    } catch {
      toast.error('Could not start video call');
    } finally {
      setCallingId(null);
    }
  };

  // Direct Message Trigger
  const handleDirectMessage = async (friend: Friend) => {
    if (currentRoomCode) {
      // Send quick invite so both join the chat room
      api.post('/friends/invite', { friendUserId: friend._id }).catch(() => {});
    }
    onClose();
    router.push('/chat');
    toast.success(`Opening chat with ${friend.displayName}! 💬`);
  };

  const handleRemoveFriend = async (friendId: string, name: string) => {
    if (!confirm(`Remove ${name} from your connections list?`)) return;
    try {
      await api.delete(`/friends/${friendId}`);
      setFriends((prev) => prev.filter((f) => f._id !== friendId));
      toast.success('Connection removed');
    } catch {
      toast.error('Failed to remove connection');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl rounded-3xl glass-panel border border-cyan-500/30 p-4 sm:p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col bg-[#0b0c16]/95"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-25 pointer-events-none bg-cyan-500" />
          <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none bg-pink-500" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/25 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-md">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white leading-tight flex items-center gap-2">
                  <span>Connections & Friends</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold uppercase tracking-wider border border-cyan-500/30">
                    {friends.length} Total
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">Search connections, start instant calls, or chat directly</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto space-y-4 py-3.5 pr-1 flex-1 custom-scrollbar">
            {/* My Unique User ID Card */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-pink-950/40 border border-cyan-500/30 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black/40 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">
                      My Unique Player ID
                    </span>
                    <div className="font-mono text-lg sm:text-xl font-black text-white tracking-widest mt-0.5">
                      {user?.friendId || 'Generating...'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyMyId}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-bold text-cyan-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 shrink-0"
                >
                  {copiedMyId ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedMyId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Real-time Friends Search Bar (handles 200+ friends easily) */}
            <div className="space-y-1.5">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name, ID, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm font-medium focus:outline-none focus:border-cyan-400 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Showing <strong>{filteredFriends.length}</strong> of {friends.length} connections</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-cyan-400 hover:underline"
                  >
                    Clear filter
                  </button>
                </div>
              )}
            </div>

            {/* Add Friend Form */}
            <form onSubmit={handleAddFriend} className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <UserPlus size={13} className="text-pink-400" />
                <span>Add New Connection by 8-Digit ID</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 8-digit Player ID (e.g. 77994450)"
                  value={friendIdInput}
                  onChange={(e) => setFriendIdInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm font-mono focus:outline-none focus:border-cyan-400 transition-colors"
                />
                <button
                  type="submit"
                  disabled={addingFriend || !friendIdInput.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 shrink-0"
                >
                  {addingFriend ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                  <span>Add</span>
                </button>
              </div>
            </form>

            {/* Friends / Connections Detailed List */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Gamepad2 size={14} className="text-cyan-400" />
                  <span>All Connections ({filteredFriends.length})</span>
                </span>
                {currentRoomCode && (
                  <span className="text-[10px] text-pink-400 font-mono font-bold">
                    Room: {currentRoomCode}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-cyan-400" />
                  <span>Loading connections...</span>
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400 space-y-1">
                  {searchQuery ? (
                    <>
                      <p>No connections found matching <span className="text-white font-bold">"{searchQuery}"</span></p>
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-cyan-400 hover:underline text-xs mt-1 inline-block"
                      >
                        Reset search
                      </button>
                    </>
                  ) : (
                    <p>No connections added yet. Share your Player ID above or add a friend's ID to connect!</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredFriends.map((friend) => {
                    const presence = presenceMap[friend._id] || { online: false };
                    const isOnline = presence.online;
                    const lastSeenText = presence.lastSeen ? formatRelativeTime(presence.lastSeen) : null;

                    return (
                      <div
                        key={friend._id}
                        className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-cyan-500/30 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                      >
                        {/* Friend Identity & Details */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar with Status Ring */}
                          <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                            {friend.avatar ? (
                              <img src={friend.avatar} alt={friend.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase bg-gradient-to-tr from-cyan-900/50 to-purple-900/50">
                                {friend.displayName?.slice(0, 2) || 'AP'}
                              </div>
                            )}
                            <span
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0b0c16] ${
                                isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-600'
                              }`}
                            />
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            {/* Display Name + Online Pill */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-white truncate max-w-[140px] sm:max-w-[180px]">
                                {friend.displayName}
                              </span>
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                                  isOnline
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>

                            {/* ID badge with 1-tap copy & Last seen */}
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                              {friend.friendId && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyFriendId(friend._id, friend.friendId!)}
                                  title="Click to copy Player ID"
                                  className="font-mono text-cyan-300 font-semibold flex items-center gap-1 hover:text-white transition-colors"
                                >
                                  <span>ID: {friend.friendId}</span>
                                  {copiedFriendId === friend._id ? (
                                    <Check size={11} className="text-emerald-400" />
                                  ) : (
                                    <Copy size={11} className="opacity-70" />
                                  )}
                                </button>
                              )}
                              {!isOnline && lastSeenText && (
                                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                  <Clock size={10} />
                                  <span>{lastSeenText}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Action Controls (Call, Message, Invite, Remove) */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {/* 1. Direct Voice Call */}
                          <button
                            type="button"
                            onClick={() => handleDirectAudioCall(friend)}
                            disabled={callingId === friend._id}
                            className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 text-emerald-400 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                            title={`Voice call ${friend.displayName}`}
                          >
                            <Phone size={14} />
                          </button>

                          {/* 2. Direct Video Call */}
                          <button
                            type="button"
                            onClick={() => handleDirectVideoCall(friend)}
                            disabled={callingId === friend._id}
                            className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/40 text-purple-400 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                            title={`Video call ${friend.displayName}`}
                          >
                            <Video size={14} />
                          </button>

                          {/* 3. Direct Message / Chat */}
                          <button
                            type="button"
                            onClick={() => handleDirectMessage(friend)}
                            className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/40 text-cyan-300 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                            title={`Send message to ${friend.displayName}`}
                          >
                            <MessageCircle size={14} />
                          </button>

                          {/* 4. Room Invite (if currently in room) */}
                          {currentRoomCode && (
                            <button
                              type="button"
                              disabled={invitingId === friend._id}
                              onClick={() => handleInviteToRoom(friend)}
                              className="px-2.5 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-[11px] font-bold text-pink-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                              title="Invite to your current room"
                            >
                              {invitingId === friend._id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Send size={12} />
                              )}
                              <span className="hidden sm:inline">Invite</span>
                            </button>
                          )}

                          {/* 5. Remove Friend */}
                          <button
                            type="button"
                            onClick={() => handleRemoveFriend(friend._id, friend.displayName)}
                            className="w-8 h-8 rounded-xl bg-white/[0.03] hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 border border-white/5 hover:border-rose-500/30 flex items-center justify-center transition-all cursor-pointer"
                            title="Remove connection"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <span>Direct calls & messages notify instantly ⚡</span>
            <button
              onClick={onClose}
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
