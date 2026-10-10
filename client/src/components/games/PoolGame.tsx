'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Maximize2,
  RotateCcw,
  Bot,
  Users,
  CircleDot,
  X,
  Search,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  Copy,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../lib/store/authStore';
import { useSocketStore } from '../../lib/store/socketStore';
import { useGameStore } from '../../lib/store/gameStore';
import api from '../../lib/api';
import { Friend } from '../../lib/types';

interface PoolGameProps {
  onBack: () => void;
}

export default function PoolGame({ onBack }: PoolGameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const user = useAuthStore((state) => state.user);
  const socket = useSocketStore((state) => state.socket);
  const { sessionData, setSessionData } = useGameStore();

  const [mode, setMode] = useState<'ai' | 'online'>('ai');

  // Online Match State
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<'p1' | 'p2'>('p1');
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [isWaitingForFriend, setIsWaitingForFriend] = useState(false);
  const [isOpponentConnected, setIsOpponentConnected] = useState(false);

  // Friends Modal State
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [onlineUsersMap, setOnlineUsersMap] = useState<Record<string, boolean>>({});
  const [isMuted, setIsMuted] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: 'POOL_TOGGLE_MUTE',
        muted: nextMuted,
      },
      '*'
    );
  };

  // Iframe Source URL
  const [iframeSrc, setIframeSrc] = useState<string>(() => {
    if (sessionData?.sessionCode) {
      const code = sessionData.sessionCode;
      const role = (sessionData.role as 'p1' | 'p2') || 'p2';
      const opp = sessionData.opponentName || 'Opponent';
      const myName = user?.displayName || 'Player';
      return `/games/pool/index.html?mode=online&code=${encodeURIComponent(code)}&role=${role}&opponent=${encodeURIComponent(opp)}&name=${encodeURIComponent(myName)}&started=1`;
    }
    return '/games/pool/index.html?mode=ai';
  });

  // Handle incoming sessionData if user clicked Accept on global invite notification
  useEffect(() => {
    if (sessionData?.sessionCode) {
      const code = sessionData.sessionCode;
      const role = (sessionData.role as 'p1' | 'p2') || 'p2';
      const opp = sessionData.opponentName || 'Friend';
      const oppId = sessionData.opponentId || '';

      setMode('online');
      setSessionCode(code);
      setPlayerRole(role);
      setOpponentName(opp);
      setOpponentId(oppId);
      setIsWaitingForFriend(false);
      setIsOpponentConnected(true);

      const myName = user?.displayName || 'Player';
      setIframeSrc(
        `/games/pool/index.html?mode=online&code=${encodeURIComponent(code)}&role=${role}&opponent=${encodeURIComponent(opp)}&name=${encodeURIComponent(myName)}&started=1`
      );

      if (socket) {
        socket.emit('pool:join', {
          sessionCode: code,
          role,
          playerName: myName,
        });
      }

      setSessionData(null);
    }
  }, [sessionData, socket, user, setSessionData]);

  // Load mutual friends from API
  const fetchFriends = useCallback(async () => {
    setLoadingFriends(true);
    try {
      const res = await api.get('/friends');
      const friends: Friend[] = res.data.friends || [];
      setFriendsList(friends);

      // Query online presence
      if (socket && friends.length > 0) {
        const friendIds = friends.map((f) => f._id);
        socket.emit('presence:query', { targetUserIds: friendIds });
      }
    } catch (err) {
      console.error('Failed to load friends list:', err);
    } finally {
      setLoadingFriends(false);
    }
  }, [socket]);

  // Handle presence events
  useEffect(() => {
    if (!socket) return;

    const handlePresenceStatus = (statusMap: Record<string, boolean>) => {
      setOnlineUsersMap((prev) => ({ ...prev, ...statusMap }));
    };

    const handleUserOnline = ({ userId }: { userId: string }) => {
      setOnlineUsersMap((prev) => ({ ...prev, [userId]: true }));
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      setOnlineUsersMap((prev) => ({ ...prev, [userId]: false }));
    };

    socket.on('presence:status', handlePresenceStatus);
    socket.on('presence:online', handleUserOnline);
    socket.on('presence:offline', handleUserOffline);

    return () => {
      socket.off('presence:status', handlePresenceStatus);
      socket.off('presence:online', handleUserOnline);
      socket.off('presence:offline', handleUserOffline);
    };
  }, [socket]);

  // Socket Game Event Handlers
  useEffect(() => {
    if (!socket) return;

    // Friend accepted in-game invite
    const handleInviteAccepted = (data: { acceptedBy: string; sessionCode: string; game: string }) => {
      if (data.sessionCode === sessionCode && data.game === 'pool') {
        setIsWaitingForFriend(false);
        setIsOpponentConnected(true);
        iframeRef.current?.contentWindow?.postMessage({ type: 'POOL_START_MATCH' }, '*');
        toast.success(`${opponentName || 'Friend'} accepted your challenge! 🎱`, { icon: '👑' });
      }
    };

    // Friend declined in-game invite
    const handleInviteDeclined = (data: { game: string }) => {
      if (data.game === 'pool') {
        setIsWaitingForFriend(false);
        toast.error(`${opponentName || 'Friend'} declined the challenge.`);
      }
    };

    // Opponent joined the pool match room
    const handleOpponentJoined = (data: { playerName: string; role: string }) => {
      setIsWaitingForFriend(false);
      setIsOpponentConnected(true);
      if (data.playerName) setOpponentName(data.playerName);
      iframeRef.current?.contentWindow?.postMessage({ type: 'POOL_START_MATCH', opponentName: data.playerName }, '*');
      toast.success(`${data.playerName || 'Opponent'} joined the table! Game is live! 🎱`);
    };

    // Opponent shot
    const handleRemoteShot = (data: { power: number; aimAngle: number; cueBallX: number; cueBallZ: number }) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'POOL_REMOTE_SHOT',
          power: data.power,
          aimAngle: data.aimAngle,
          cueBallX: data.cueBallX,
          cueBallZ: data.cueBallZ,
        },
        '*'
      );
    };

    // Sync balls after shot stops
    const handleSyncBalls = (data: { ballsData: any[]; currentTurn: string; playerGroups: any }) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'POOL_REMOTE_SYNC',
          ballsData: data.ballsData,
          currentTurn: data.currentTurn,
          playerGroups: data.playerGroups,
        },
        '*'
      );
    };

    // Rematch requested
    const handleRematch = () => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'POOL_REMATCH' }, '*');
      toast.success('Opponent requested a new rack! Racking balls...', { icon: '🔄' });
    };

    // Opponent chat
    const handleRemoteChat = (data: { message: string; senderName: string }) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'REMOTE_CHAT',
          text: data.message,
          senderName: data.senderName,
        },
        '*'
      );
    };

    // Opponent left
    const handleOpponentLeft = () => {
      setIsOpponentConnected(false);
      toast.error('Opponent left the match.');
    };

    socket.on('game:invite:accepted', handleInviteAccepted);
    socket.on('game:invite:declined', handleInviteDeclined);
    socket.on('pool:opponent_joined', handleOpponentJoined);
    socket.on('pool:shot', handleRemoteShot);
    socket.on('pool:sync_balls', handleSyncBalls);
    socket.on('pool:rematch', handleRematch);
    socket.on('pool:chat', handleRemoteChat);
    socket.on('pool:opponent_left', handleOpponentLeft);

    return () => {
      socket.off('game:invite:accepted', handleInviteAccepted);
      socket.off('game:invite:declined', handleInviteDeclined);
      socket.off('pool:opponent_joined', handleOpponentJoined);
      socket.off('pool:shot', handleRemoteShot);
      socket.off('pool:sync_balls', handleSyncBalls);
      socket.off('pool:rematch', handleRematch);
      socket.off('pool:chat', handleRemoteChat);
      socket.off('pool:opponent_left', handleOpponentLeft);
    };
  }, [socket, sessionCode, opponentName]);

  // Listen to postMessages from Pool iframe
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      switch (data.type) {
        case 'POOL_LOCAL_SHOT':
          if (sessionCode && socket) {
            socket.emit('pool:shot', {
              sessionCode,
              power: data.power,
              aimAngle: data.aimAngle,
              cueBallX: data.cueBallX,
              cueBallZ: data.cueBallZ,
            });
          }
          break;

        case 'POOL_LOCAL_SYNC':
          if (sessionCode && socket) {
            socket.emit('pool:sync_balls', {
              sessionCode,
              ballsData: data.ballsData,
              currentTurn: data.currentTurn,
              playerGroups: data.playerGroups,
            });
          }
          break;

        case 'POOL_LOCAL_REMATCH':
          if (sessionCode && socket) {
            socket.emit('pool:rematch', {
              sessionCode,
            });
          }
          break;

        case 'GAME_CHAT':
          if (sessionCode && socket) {
            socket.emit('pool:chat', {
              sessionCode,
              message: data.text,
              senderName: user?.displayName || 'Player',
            });
          }
          break;

        case 'POOL_REQUEST_INVITE':
          fetchFriends();
          setShowFriendsModal(true);
          break;
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [sessionCode, socket, fetchFriends, user]);

  // Switch to AI Mode
  const handleSelectAiMode = () => {
    setMode('ai');
    setIsWaitingForFriend(false);
    setIsOpponentConnected(false);
    setSessionCode(null);
    setOpponentName(null);

    const url = '/games/pool/index.html?mode=ai';
    setIframeSrc(url);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  // Challenge a Friend from the Friends List
  const handleChallengeFriend = (friend: Friend) => {
    const generatedCode = `POOL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const myName = user?.displayName || 'Player';

    setMode('online');
    setSessionCode(generatedCode);
    setPlayerRole('p1');
    setOpponentName(friend.displayName);
    setOpponentId(friend._id);
    setIsWaitingForFriend(true);
    setIsOpponentConnected(false);

    if (socket) {
      socket.emit('game:invite', {
        targetUserId: friend._id,
        senderName: myName,
        senderAvatar: user?.avatar,
        game: 'pool',
        sessionCode: generatedCode,
      });

      socket.emit('pool:join', {
        sessionCode: generatedCode,
        role: 'p1',
        playerName: myName,
      });
    }

    const url = `/games/pool/index.html?mode=online&code=${encodeURIComponent(generatedCode)}&role=p1&opponent=${encodeURIComponent(friend.displayName)}&name=${encodeURIComponent(myName)}&started=0`;
    setIframeSrc(url);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }

    setShowFriendsModal(false);
    toast.success(`Challenge sent to ${friend.displayName}! ⏳ Waiting for them to accept...`, {
      icon: '🎱',
      duration: 6000,
    });
  };

  const handleCopyCode = () => {
    if (sessionCode) {
      navigator.clipboard.writeText(sessionCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success('Room code copied to clipboard!');
    }
  };

  const handleReload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleFullscreen = () => {
    if (iframeRef.current?.requestFullscreen) {
      iframeRef.current.requestFullscreen();
    }
  };

  const handleLeaveGame = () => {
    if (sessionCode && socket) {
      socket.emit('pool:leave', { sessionCode });
    }
    onBack();
  };

  const filteredFriends = friendsList.filter(
    (f) =>
      f.displayName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      f.email?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0c10] flex flex-col select-none">
      {/* Top Header Bar */}
      <header className="h-14 px-3 sm:px-4 flex items-center justify-between border-b border-white/10 bg-[#0c0e14]/90 backdrop-blur-xl z-20 gap-2">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={handleLeaveGame}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Arcade</span>
          </button>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 truncate whitespace-nowrap">
              <span className="sm:hidden">8-Ball Pool 🎱</span>
              <span className="hidden sm:inline">Luxury 8-Ball Pool 🎱</span>
            </span>
          </div>
        </div>

        {/* Center: Sound & Mode Toggles */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="flex items-center p-0.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs">
            {/* Audio Toggle button right next to Solo AI */}
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer mr-0.5"
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </button>

            <button
              onClick={handleSelectAiMode}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                mode === 'ai'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">Solo AI</span>
            </button>

            <button
              onClick={() => {
                fetchFriends();
                setShowFriendsModal(true);
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                mode === 'online'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs sm:inline hidden">Play Friend</span>
              <span className="text-[11px] sm:hidden inline">Friends</span>
            </button>
          </div>

          {/* Online Match Opponent Tag */}
          {mode === 'online' && sessionCode && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOpponentConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="truncate max-w-[110px]">{opponentName || 'Online Friend'}</span>
            </div>
          )}
        </div>

        {/* Right Actions: Reload & Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={handleReload}
            title="Reload Table"
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleFullscreen}
            title="Fullscreen"
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Waiting for Friend Banner Overlay */}
      {mode === 'online' && isWaitingForFriend && (
        <div className="bg-[#0a1614]/95 border-b border-emerald-500/30 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-10 shadow-lg">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <div className="text-xs text-slate-300">
              Challenge sent to <strong className="text-white">{opponentName}</strong>! Waiting for them to accept...
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-xs">
              <span className="text-slate-400">Code:</span>
              <strong className="font-mono text-emerald-300">{sessionCode}</strong>
              <button
                onClick={handleCopyCode}
                title="Copy Code"
                className="p-0.5 text-slate-300 hover:text-white"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setIsWaitingForFriend(false);
              handleSelectAiMode();
            }}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-semibold transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main Game WebGL Iframe Container */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-[#0a0c10]">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full border-0 bg-[#0a0c10]"
          allow="autoplay; fullscreen"
          title="Luxury 8-Ball Pool"
        />
      </div>

      {/* Friends Challenge Modal */}
      <AnimatePresence>
        {showFriendsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md rounded-3xl bg-[#10141c]/95 border border-white/10 shadow-2xl p-5 text-white flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <CircleDot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Challenge to 8-Ball Pool</h3>
                    <p className="text-[11px] text-slate-400">Play real-time 3D Pool online with your friends</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFriendsModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="mt-3.5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search friends by name or email..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.1] border border-white/10 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 outline-none transition-all"
                />
              </div>

              {/* Friends List Container */}
              <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1 min-h-[180px] max-h-[340px]">
                {loadingFriends ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">Loading friends...</span>
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <Users className="w-8 h-8 text-slate-500 mb-2" />
                    <p className="text-xs font-semibold text-slate-300">No mutual friends found</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Add friends from your profile to challenge them to Pool!
                    </p>
                  </div>
                ) : (
                  filteredFriends.map((friend) => {
                    const isOnline = onlineUsersMap[friend._id] ?? false;
                    return (
                      <div
                        key={friend._id}
                        className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 flex items-center justify-between gap-3 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                            {friend.avatar ? (
                              <img
                                src={friend.avatar}
                                alt={friend.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-xs uppercase text-emerald-300">
                                {friend.displayName.slice(0, 2)}
                              </div>
                            )}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#10141c] ${
                                isOnline ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-500'
                              }`}
                            />
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-white truncate">{friend.displayName}</h4>
                            <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`}
                              />
                              {isOnline ? 'Online now' : 'Offline'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleChallengeFriend(friend)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-xs font-bold text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <CircleDot className="w-3.5 h-3.5" />
                          <span>Challenge 🎱</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
