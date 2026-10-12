'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Crown, Copy, Check, UserMinus, UserPlus, 
  LogOut, ShieldAlert, Sparkles, Circle, Clock, RefreshCw, Send,
  Lock, Unlock, Edit3, Volume2, Mic, Layers, Gamepad2, Swords
} from 'lucide-react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../lib/store/authStore';
import { useSocketStore } from '../../../lib/store/socketStore';
import { useCallStore } from '../../../lib/store/callStore';
import { Room, User } from '../../../lib/types';
import SavedSpacesModal from '../../../components/SavedSpacesModal';

function formatLastSeen(lastSeen: string | Date | undefined, isOnline: boolean): string {
  if (isOnline) return 'Active now';
  if (!lastSeen) return 'Offline';
  
  const date = new Date(lastSeen);
  if (isNaN(date.getTime())) return 'Offline';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function RoomPage() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const setRoomInStore = useAuthStore((state) => state.setRoom);
  const { socket } = useSocketStore();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [showSpacesModal, setShowSpacesModal] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [onlineStatusMap, setOnlineStatusMap] = useState<Record<string, { online: boolean; lastSeen?: string | Date }>>({});
  const [isEditingName, setIsEditingName] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [inVoiceLounge, setInVoiceLounge] = useState(false);
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [selectedChallengeMember, setSelectedChallengeMember] = useState<User | null>(null);

  // Fetch current user's room
  const loadRoom = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/rooms/mine');
      setRoom(res.data.room);
      setRoomInStore(res.data.room);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setRoom(null);
        setRoomInStore(null as any);
      } else {
        toast.error(err.response?.data?.message || 'Failed to load room');
      }
    } finally {
      setLoading(false);
    }
  }, [setRoomInStore]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // Query live presence for room members
  const queryPresence = useCallback(() => {
    if (!socket || !room?.members) return;
    const memberIds = room.members.map((m) => m._id);
    if (memberIds.length === 0) return;

    socket.emit('presence:query', memberIds, (statusMap: Record<string, any>) => {
      if (statusMap) {
        setOnlineStatusMap((prev) => ({
          ...prev,
          ...statusMap,
        }));
      }
    });
  }, [socket, room]);

  useEffect(() => {
    queryPresence();
    const interval = setInterval(queryPresence, 10000);
    return () => clearInterval(interval);
  }, [queryPresence]);

  // Socket event listeners for real-time room updates
  useEffect(() => {
    if (!socket) return;

    const handleMemberJoined = () => {
      loadRoom();
      toast.success('A member joined the room');
    };

    const handleMemberLeft = (data: any) => {
      loadRoom();
      if (data?.displayName) {
        toast(data.kicked ? `${data.displayName} was removed` : `${data.displayName} left the room`);
      }
    };

    const handleRoomUpdated = (data: any) => {
      if (data?.room) {
        setRoom(data.room);
        setRoomInStore(data.room);
      }
    };

    const handlePresenceOnline = (data: { userId: string }) => {
      if (data?.userId) {
        setOnlineStatusMap((prev) => ({
          ...prev,
          [data.userId]: { online: true, lastSeen: new Date() },
        }));
      }
    };

    const handlePresenceOffline = (data: { userId: string; lastSeen?: string | Date }) => {
      if (data?.userId) {
        setOnlineStatusMap((prev) => ({
          ...prev,
          [data.userId]: { online: false, lastSeen: data.lastSeen || new Date() },
        }));
      }
    };

    socket.on('room:member-joined', handleMemberJoined);
    socket.on('room:member-left', handleMemberLeft);
    socket.on('room:updated', handleRoomUpdated);
    socket.on('presence:online', handlePresenceOnline);
    socket.on('presence:offline', handlePresenceOffline);

    return () => {
      socket.off('room:member-joined', handleMemberJoined);
      socket.off('room:member-left', handleMemberLeft);
      socket.off('room:updated', handleRoomUpdated);
      socket.off('presence:online', handlePresenceOnline);
      socket.off('presence:offline', handlePresenceOffline);
    };
  }, [socket, loadRoom, setRoomInStore]);

  // Copy room code
  const handleCopyCode = () => {
    if (!room?.inviteCode) return;
    navigator.clipboard.writeText(room.inviteCode);
    setCopied(true);
    toast.success('Room code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Kick member (Host only)
  const handleKickMember = async (targetUserId: string, targetName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${targetName} from the room?`)) {
      return;
    }
    setKickingId(targetUserId);
    try {
      const res = await api.post('/rooms/kick', { targetUserId });
      setRoom(res.data.room);
      setRoomInStore(res.data.room);
      toast.success(`${targetName} removed from room`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setKickingId(null);
    }
  };

  // Fetch connections for room invite
  const openInviteModal = async () => {
    setInviteModalOpen(true);
    setLoadingConnections(true);
    try {
      const res = await api.get('/friends');
      const friendList = res.data.friends || [];
      setConnections(friendList);
    } catch {
      toast.error('Could not load connections');
    } finally {
      setLoadingConnections(false);
    }
  };

  // Send invitation to friend
  const handleSendInvite = async (friendUserId: string, friendName: string) => {
    setInvitingId(friendUserId);
    try {
      await api.post('/friends/invite', { friendUserId });
      toast.success(`Invite sent to ${friendName}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send invite');
    } finally {
      setInvitingId(null);
    }
  };

  // Open Game Challenge Modal
  const openGameChallengeModal = (member: User) => {
    setSelectedChallengeMember(member);
    setChallengeModalOpen(true);
  };

  // Send Game Challenge to Room Chat (with 60-second timer)
  const sendGameChallenge = (gameKey: string) => {
    if (!socket || !room || !selectedChallengeMember) return;
    const sessionCode = Math.random().toString(36).substring(2, 9);
    socket.emit('game:invite', {
      roomId: room._id,
      targetUserId: selectedChallengeMember._id,
      game: gameKey,
      sessionCode,
    });
    toast.success(`Challenge sent to ${selectedChallengeMember.displayName}! Delivered to room chat.`);
    setChallengeModalOpen(false);
    setSelectedChallengeMember(null);
  };

  // Toggle Room Lock
  const handleToggleLock = async () => {
    if (!room) return;
    try {
      const res = await api.patch('/rooms/settings', { isLocked: !room.isLocked });
      setRoom(res.data.room);
      setRoomInStore(res.data.room);
      toast.success(res.data.room.isLocked ? 'Room locked. New joins disabled.' : 'Room unlocked.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change lock state');
    }
  };

  // Save Room Name
  const handleSaveRoomName = async () => {
    if (!newRoomName.trim() || !room) return;
    try {
      const res = await api.patch('/rooms/settings', { name: newRoomName.trim() });
      setRoom(res.data.room);
      setRoomInStore(res.data.room);
      setIsEditingName(false);
      toast.success('Room name updated!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update name');
    }
  };

  // Toggle Casual Voice Lounge Walkie-Talkie
  const handleToggleVoiceLounge = async () => {
    if (!socket) return;
    if (inVoiceLounge) {
      socket.emit('voice-lounge:leave');
      setInVoiceLounge(false);
      useCallStore.getState().endCall(socket);
      toast('Left Voice Lounge');
    } else {
      socket.emit('voice-lounge:join');
      setInVoiceLounge(true);
      const otherMember = membersList.find((m) => m._id?.toString() !== currentUser?._id?.toString());
      if (otherMember) {
        useCallStore.getState().startCall(socket, 'audio', otherMember, currentUser).catch(() => {});
      }
      toast.success('Connected to Voice Lounge! Audio mic live');
    }
  };

  // Leave room
  const handleLeaveRoom = async () => {
    if (!window.confirm('Are you sure you want to leave this room?')) {
      return;
    }
    try {
      await api.delete('/rooms/leave');
      setRoom(null);
      setRoomInStore(null as any);
      toast.success('You left the room');
      router.push('/room/setup');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to leave room');
    }
  };

  const isHost = Boolean(
    currentUser &&
    room &&
    ((typeof room.host === 'object' && room.host?._id === currentUser._id) ||
      (typeof room.host === 'string' && room.host === currentUser._id) ||
      (!room.host && room.members?.[0]?._id === currentUser._id))
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07070e] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-pink-500" />
          <p className="text-sm font-medium">Loading room...</p>
        </div>
      </div>
    );
  }

  // Not in a room view
  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#07070e]">
        <div className="w-full max-w-md p-8 rounded-3xl glass-panel text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Users size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">No Active Room</h2>
            <p className="text-sm text-slate-400">
              You are currently not part of any room. Create a new room or join with a code to connect.
            </p>
          </div>
          <button
            onClick={() => router.push('/room/setup')}
            className="w-full py-3.5 rounded-2xl btn-sexy text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2"
          >
            <span>Create or Join Room</span>
            <Sparkles size={16} />
          </button>
        </div>
      </div>
    );
  }

  const membersList = room.members || [];
  const hostId = typeof room.host === 'object' ? room.host?._id : (room.host || membersList[0]?._id);

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header & Room Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-panel border border-white/[0.08] relative overflow-hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <Users size={20} />
            </div>
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Enter Room Name"
                    className="bg-white/10 px-3 py-1 rounded-xl text-white text-base font-bold outline-none border border-pink-500/40"
                  />
                  <button
                    onClick={handleSaveRoomName}
                    className="px-2.5 py-1 rounded-lg btn-sexy text-white text-xs font-bold"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">
                    {room.name || 'Room Hub'}
                  </h1>
                  {isHost && (
                    <button
                      onClick={() => {
                        setNewRoomName(room.name || '');
                        setIsEditingName(true);
                      }}
                      className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Edit Room Name"
                    >
                      <Edit3 size={15} />
                    </button>
                  )}
                  {room.isLocked && (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold">
                      <Lock size={10} /> Locked
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-400">Manage members, view presence, and invite connections</p>
            </div>
          </div>
        </div>

        {/* Room Code Card & Host Lock */}
        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={handleToggleLock}
              className={`p-2.5 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
                room.isLocked
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,142,0.3)]'
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08]'
              }`}
              title={room.isLocked ? 'Unlock Room (Allow joins)' : 'Lock Room (Block new joins)'}
            >
              {room.isLocked ? <Lock size={15} /> : <Unlock size={15} />}
              <span className="hidden sm:inline">{room.isLocked ? 'Locked' : 'Unlocked'}</span>
            </button>
          )}

          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-2 sm:px-4">
            <div className="text-left">
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Room Code</div>
              <div className="font-mono text-lg font-bold text-pink-400 tracking-widest">{room.inviteCode}</div>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 transition-colors ml-2"
              title="Copy room code"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Room Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Members List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Room Members</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                {membersList.length}
              </span>
            </div>

            <button
              onClick={openInviteModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 text-xs font-semibold transition-all shadow-sm"
            >
              <UserPlus size={14} />
              <span>Invite Connection</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {membersList.map((member: User) => {
              const isMemberHost = member._id.toString() === hostId?.toString();
              const isMe = member._id.toString() === currentUser?._id?.toString();
              const statusInfo = onlineStatusMap[member._id.toString()];
              const isOnline = isMe ? true : (statusInfo?.online ?? false);
              const lastSeenTime = isMe ? new Date() : (statusInfo?.lastSeen || member.lastSeen);

              return (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-4 rounded-2xl glass-panel border border-white/[0.06] hover:border-white/[0.12] transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Avatar with live status ring */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center font-bold text-white text-base">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.displayName} className="w-full h-full object-cover" />
                        ) : (
                          member.displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                      {/* Real-time Online Indicator */}
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#0d0d1a] ${
                          isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-500'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{member.displayName}</span>
                        {isMe && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-slate-300 font-medium">
                            You
                          </span>
                        )}
                        {isMemberHost && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                            <Crown size={11} className="text-amber-400" />
                            Host
                          </span>
                        )}
                      </div>

                      {/* Presence / Last seen tracker */}
                      <div className="flex items-center gap-1.5 text-xs mt-1">
                        {isOnline ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-medium">
                            <Circle size={6} fill="currentColor" />
                            Active now
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock size={11} />
                            {formatLastSeen(lastSeenTime, false)}
                          </span>
                        )}
                        {member.friendId && (
                          <span className="text-slate-500 text-[11px] font-mono ml-1">
                            • #{member.friendId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Member Actions */}
                  <div className="flex items-center gap-2">
                    {!isMe && (
                      <button
                        onClick={() => openGameChallengeModal(member)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25 text-xs font-semibold transition-all shadow-sm"
                        title={`Challenge ${member.displayName} to a game`}
                      >
                        <Gamepad2 size={13} />
                        <span className="hidden sm:inline">Challenge</span>
                      </button>
                    )}
                    {isHost && !isMemberHost && (
                      <button
                        onClick={() => handleKickMember(member._id, member.displayName)}
                        disabled={kickingId === member._id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-all disabled:opacity-50"
                        title="Remove member from room"
                      >
                        <UserMinus size={14} />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Room Controls & Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Controls</h2>

          <div className="p-5 rounded-3xl glass-panel border border-white/[0.08] space-y-4">
            <div className="space-y-2">
              <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Your Role</div>
              <div className="flex items-center gap-2">
                {isHost ? (
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <Crown size={16} />
                    <span>Room Administrator (Host)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
                    <Users size={16} />
                    <span>Room Member</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isHost
                  ? 'As host, you can remove members, manage room invites, and lead group activities.'
                  : 'You have full access to chat, watch parties, games, and location sharing.'}
              </p>
            </div>

            <hr className="border-white/[0.08]" />

            <div className="space-y-2.5">
              {/* Casual Voice Lounge Walkie-Talkie Toggle */}
              <button
                onClick={handleToggleVoiceLounge}
                className={`w-full py-3 px-4 rounded-2xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  inVoiceLounge
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-white/[0.06] hover:bg-white/[0.1] border-white/10 text-white'
                }`}
              >
                <Volume2 size={16} className={inVoiceLounge ? 'text-emerald-400 animate-pulse' : 'text-slate-400'} />
                <span>{inVoiceLounge ? 'Connected to Voice Lounge' : 'Join Casual Voice Lounge'}</span>
              </button>

              <button
                onClick={() => setShowSpacesModal(true)}
                className="w-full py-3 px-4 rounded-2xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Layers size={16} className="text-purple-400" />
                <span>Switch / View Saved Spaces</span>
              </button>

              <button
                onClick={openInviteModal}
                className="w-full py-3 px-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={16} className="text-pink-400" />
                <span>Invite Connections</span>
              </button>

              <button
                onClick={() => router.push('/chat')}
                className="w-full py-3 px-4 rounded-2xl btn-sexy text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Send size={15} />
                <span>Open Room Chat</span>
              </button>

              <button
                onClick={handleLeaveRoom}
                className="w-full py-3 px-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={15} />
                <span>Leave Room</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Connections Modal */}
      <AnimatePresence>
        {inviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-3xl glass-panel border border-white/[0.12] space-y-5 bg-[#0d0d1a]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Invite Connections</h3>
                    <p className="text-xs text-slate-400">Send an instant room invitation to your friends</p>
                  </div>
                </div>
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              {loadingConnections ? (
                <div className="py-8 flex flex-col items-center gap-2 text-slate-400">
                  <RefreshCw size={20} className="animate-spin text-pink-500" />
                  <span className="text-xs">Loading connections...</span>
                </div>
              ) : connections.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <p className="text-xs">No saved connections found in your friend list.</p>
                  <p className="text-[11px] text-slate-500">
                    You can share your room code <span className="font-mono text-pink-400 font-bold">{room.inviteCode}</span> directly.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {connections.map((friend: any) => {
                    const friendId = friend._id || friend;
                    const friendName = friend.displayName || 'Connection';
                    const alreadyInRoom = membersList.some((m) => m._id.toString() === friendId.toString());

                    return (
                      <div
                        key={friendId}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-white text-sm">
                            {friend.avatar ? (
                              <img src={friend.avatar} alt={friendName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              friendName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-white">{friendName}</div>
                            {friend.friendId && (
                              <div className="text-[11px] text-slate-500 font-mono">#{friend.friendId}</div>
                            )}
                          </div>
                        </div>

                        <div>
                          {alreadyInRoom ? (
                            <span className="text-[11px] px-2.5 py-1 rounded-xl bg-white/[0.06] text-slate-400 font-medium">
                              Joined
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendInvite(friendId, friendName)}
                              disabled={invitingId === friendId}
                              className="px-3.5 py-1.5 rounded-xl btn-sexy text-white text-xs font-semibold shadow-md flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Send size={12} />
                              <span>{invitingId === friendId ? 'Sending...' : 'Invite'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => setInviteModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 font-medium text-xs transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Game Challenge Modal */}
      <AnimatePresence>
        {challengeModalOpen && selectedChallengeMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121324] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Swords size={18} className="text-pink-400" />
                    <span>Challenge to Game</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select a game to challenge {selectedChallengeMember.displayName}. The invite card will appear in room chat for 1 minute!
                  </p>
                </div>
                <button
                  onClick={() => {
                    setChallengeModalOpen(false);
                    setSelectedChallengeMember(null);
                  }}
                  className="px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'pool', name: '8-Ball Pool', desc: 'Real physics cue pool' },
                  { id: 'bowling', name: 'Cosmic Bowling', desc: '10-pin alley action' },
                  { id: 'ludo', name: 'Ludo Party', desc: 'Classic board race' },
                  { id: 'chess', name: 'Speed Chess', desc: 'Head-to-head strategy' },
                  { id: 'uno', name: 'UNO Showdown', desc: 'Cards and color party' },
                  { id: 'carrom', name: 'Carrom Match', desc: 'Smooth striker disc game' },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => sendGameChallenge(g.id)}
                    className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-purple-500/40 text-left transition-all group flex flex-col justify-between cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
                        <Gamepad2 size={16} />
                      </div>
                      <span className="text-[10px] text-pink-400 font-semibold uppercase tracking-wider group-hover:underline">
                        Send
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                        {g.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {g.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setChallengeModalOpen(false);
                  setSelectedChallengeMember(null);
                }}
                className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 font-medium text-xs transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SavedSpacesModal
        isOpen={showSpacesModal}
        onClose={() => setShowSpacesModal(false)}
        onSpaceSwitched={(switchedRoom) => {
          setRoom(switchedRoom);
          setRoomInStore(switchedRoom);
        }}
      />
    </div>
  );
}
