'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, UserPlus, Users, Copy, Check, Send, 
  Trash2, ShieldCheck, Gamepad2, Sparkles, Loader2,
  KeyRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../lib/store/authStore';
import { useSocketStore } from '../lib/store/socketStore';
import { Friend } from '../lib/types';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomCode?: string;
  onJoinRoom?: (code: string) => void;
}

export default function FriendsModal({ isOpen, onClose, currentRoomCode }: FriendsModalProps) {
  const user = useAuthStore((state) => state.user);
  const socket = useSocketStore((state) => state.socket);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});
  const [friendIdInput, setFriendIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingFriend, setAddingFriend] = useState(false);
  const [copiedMyId, setCopiedMyId] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const res = await api.get('/friends');
      const friendList: Friend[] = res.data.friends || [];
      setFriends(friendList);

      // Query online presence from socket
      if (socket && friendList.length > 0) {
        const ids = friendList.map((f) => f._id);
        socket.emit('presence:query', ids, (statusMap: Record<string, boolean>) => {
          if (statusMap) setOnlineMap(statusMap);
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
      setOnlineMap((prev) => ({ ...prev, [data.userId]: true }));
    };

    const handleOffline = (data: { userId: string }) => {
      setOnlineMap((prev) => ({ ...prev, [data.userId]: false }));
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

  const handleCopyMyId = () => {
    if (!user?.friendId) return;
    navigator.clipboard.writeText(user.friendId);
    setCopiedMyId(true);
    toast.success('Your Player ID copied! Share with friends 🎮');
    setTimeout(() => setCopiedMyId(false), 2000);
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

  const handleRemoveFriend = async (friendId: string, name: string) => {
    if (!confirm(`Remove ${name} from your friends list?`)) return;
    try {
      await api.delete(`/friends/${friendId}`);
      setFriends((prev) => prev.filter((f) => f._id !== friendId));
      toast.success('Friend removed');
    } catch {
      toast.error('Failed to remove friend');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-3xl glass-panel border border-cyan-500/30 p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col bg-[#0b0c16]/95"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-25 pointer-events-none bg-cyan-500" />
          <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none bg-pink-500" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
                <Users size={18} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white leading-tight flex items-center gap-2">
                  <span>Friends & Connections</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold uppercase tracking-wider border border-cyan-500/30">
                    User ID
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">Add connections with their unique User ID & invite them to your room</p>
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
          <div className="overflow-y-auto space-y-4 py-4 pr-1 flex-1 custom-scrollbar">
            {/* My Unique User ID Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-pink-950/40 border border-cyan-500/30 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-black/40 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">
                      My User ID
                    </span>
                    <div className="font-mono text-xl sm:text-2xl font-black text-white tracking-widest mt-0.5">
                      {user?.friendId || 'Generating...'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyMyId}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-bold text-cyan-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 shrink-0"
                >
                  {copiedMyId ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedMyId ? 'Copied!' : 'Copy ID'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                Share this 8-digit User ID with friends to connect and invite them to your room.
              </p>
            </div>

            {/* Add Friend Form */}
            <form onSubmit={handleAddFriend} className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <UserPlus size={14} className="text-pink-400" />
                <span>Add Connection by User ID</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 8-digit User ID (e.g. 58291043)"
                  value={friendIdInput}
                  onChange={(e) => setFriendIdInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm font-mono focus:outline-none focus:border-cyan-400 transition-colors"
                />
                <button
                  type="submit"
                  disabled={addingFriend || !friendIdInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 shrink-0"
                >
                  {addingFriend ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  <span>Add</span>
                </button>
              </div>
            </form>

            {/* Friends List */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Gamepad2 size={14} className="text-cyan-400" />
                  <span>My Friends List ({friends.length})</span>
                </span>
                {currentRoomCode && (
                  <span className="text-[10px] text-pink-400 font-mono font-bold">
                    Room: {currentRoomCode}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-cyan-400" />
                  <span>Loading friends...</span>
                </div>
              ) : friends.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400">
                  No friends added yet. Share your Player ID above or paste a friend's ID to connect!
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {friends.map((friend) => {
                    const isOnline = onlineMap[friend._id] ?? false;

                    return (
                      <div
                        key={friend._id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all group gap-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-white/10 shrink-0">
                            {friend.avatar ? (
                              <img src={friend.avatar} alt={friend.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase">
                                {friend.displayName.slice(0, 2)}
                              </div>
                            )}
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black ${
                                isOnline ? 'bg-emerald-400' : 'bg-slate-600'
                              }`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-white truncate max-w-[130px] sm:max-w-[160px]">
                                {friend.displayName}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700/50 text-slate-400'
                                }`}
                              >
                                {isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-cyan-400 font-semibold tracking-wider">
                              ID: {friend.friendId || 'N/A'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {currentRoomCode ? (
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
                              <span>Invite</span>
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleRemoveFriend(friend._id, friend.displayName)}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/5 flex items-center justify-center transition-all cursor-pointer"
                            title="Remove friend"
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
            <span>Invite sends live instant notification to their screen ⚡</span>
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
