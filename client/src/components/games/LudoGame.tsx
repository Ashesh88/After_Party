'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Maximize2,
  RotateCcw,
  Bot,
  Users,
  Dices,
  X,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  UserPlus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../lib/store/authStore';
import { useSocketStore } from '../../lib/store/socketStore';
import { useGameStore } from '../../lib/store/gameStore';
import api from '../../lib/api';
import { Friend } from '../../lib/types';

interface LudoGameProps {
  onBack: () => void;
}

export default function LudoGame({ onBack }: LudoGameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const user = useAuthStore((state) => state.user);
  const socket = useSocketStore((state) => state.socket);
  const { sessionData, setSessionData } = useGameStore();

  const [mode, setMode] = useState<'ai' | 'online'>('ai');

  // Online Match State
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<'red' | 'yellow'>('red');
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

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: 'LUDO_TOGGLE_MUTE',
        muted: nextMuted,
      },
      '*'
    );
  };

  // Iframe Source URL
  const [iframeSrc, setIframeSrc] = useState<string>(() => {
    if (sessionData?.sessionCode) {
      const code = sessionData.sessionCode;
      const role = (sessionData.role as 'red' | 'yellow') || 'yellow';
      const opp = sessionData.opponentName || 'Opponent';
      const myName = user?.displayName || 'Player';
      return `/games/ludo/index.html?mode=online&code=${encodeURIComponent(code)}&role=${role}&opponent=${encodeURIComponent(opp)}&name=${encodeURIComponent(myName)}&started=1`;
    }
    return '/games/ludo/index.html?mode=ai';
  });

  // Handle incoming sessionData if user clicked Accept on global invite notification
  useEffect(() => {
    if (sessionData?.sessionCode) {
      const code = sessionData.sessionCode;
      const role = (sessionData.role as 'red' | 'yellow') || 'yellow';
      const opp = sessionData.opponentName || 'Friend';
      const oppId = sessionData.opponentId || null;

      setMode('online');
      setSessionCode(code);
      setPlayerRole(role);
      setOpponentName(opp);
      setOpponentId(oppId);
      setIsWaitingForFriend(false);
      setIsOpponentConnected(true);

      const myName = user?.displayName || 'Player';
      setIframeSrc(
        `/games/ludo/index.html?mode=online&code=${encodeURIComponent(code)}&role=${role}&opponent=${encodeURIComponent(opp)}&name=${encodeURIComponent(myName)}&started=1`
      );

      if (socket) {
        socket.emit('ludo:join', {
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
      if (data.sessionCode === sessionCode && data.game === 'ludo') {
        setIsWaitingForFriend(false);
        setIsOpponentConnected(true);
        iframeRef.current?.contentWindow?.postMessage({ type: 'LUDO_START_MATCH' }, '*');
        toast.success(`${opponentName || 'Friend'} accepted your challenge! 🎲`, {
          icon: '👑',
        });
      }
    };

    // Friend declined in-game invite
    const handleInviteDeclined = (data: { game: string }) => {
      if (data.game === 'ludo') {
        setIsWaitingForFriend(false);
        toast.error(`${opponentName || 'Friend'} declined the challenge.`);
      }
    };

    // Opponent joined the ludo match room
    const handleOpponentJoined = (data: { playerName: string; role: string }) => {
      setIsWaitingForFriend(false);
      setIsOpponentConnected(true);
      iframeRef.current?.contentWindow?.postMessage({ type: 'LUDO_START_MATCH' }, '*');
      toast.success(`${data.playerName || 'Opponent'} joined the match! Game is live! 🎲`);
    };

    // Opponent rolled dice
    const handleRemoteRoll = (data: { playerId: string; roll: number }) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'LUDO_REMOTE_ROLL',
          playerId: data.playerId,
          roll: data.roll,
        },
        '*'
      );
    };

    // Opponent moved pawn
    const handleRemoteMove = (data: { playerId: string; tokenIndex: number; roll: number }) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'LUDO_REMOTE_MOVE',
          playerId: data.playerId,
          tokenIndex: data.tokenIndex,
          roll: data.roll,
        },
        '*'
      );
    };

    // Rematch requested
    const handleRematch = () => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'LUDO_REMATCH',
        },
        '*'
      );
      toast.success('Opponent requested a rematch! Restarting board...', { icon: '🔄' });
    };

    // Opponent left
    const handleOpponentLeft = () => {
      setIsOpponentConnected(false);
      toast.error('Opponent left the match.');
    };

    socket.on('game:invite:accepted', handleInviteAccepted);
    socket.on('game:invite:declined', handleInviteDeclined);
    socket.on('ludo:opponent_joined', handleOpponentJoined);
    socket.on('ludo:roll', handleRemoteRoll);
    socket.on('ludo:move', handleRemoteMove);
    socket.on('ludo:restart', handleRematch);
    socket.on('ludo:opponent_left', handleOpponentLeft);

    return () => {
      socket.off('game:invite:accepted', handleInviteAccepted);
      socket.off('game:invite:declined', handleInviteDeclined);
      socket.off('ludo:opponent_joined', handleOpponentJoined);
      socket.off('ludo:roll', handleRemoteRoll);
      socket.off('ludo:move', handleRemoteMove);
      socket.off('ludo:restart', handleRematch);
      socket.off('ludo:opponent_left', handleOpponentLeft);
    };
  }, [socket, sessionCode, opponentName]);

  // Listen to postMessages from Ludo iframe
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      switch (data.type) {
        case 'LUDO_LOCAL_ROLL':
          if (sessionCode && socket) {
            socket.emit('ludo:roll', {
              sessionCode,
              playerId: data.playerId,
              roll: data.roll,
            });
          }
          break;

        case 'LUDO_LOCAL_MOVE':
          if (sessionCode && socket) {
            socket.emit('ludo:move', {
              sessionCode,
              playerId: data.playerId,
              tokenIndex: data.tokenIndex,
              roll: data.roll,
            });
          }
          break;

        case 'LUDO_LOCAL_RESTART':
          if (sessionCode && socket) {
            socket.emit('ludo:restart', {
              sessionCode,
            });
          }
          break;

        case 'LUDO_REQUEST_INVITE':
          fetchFriends();
          setShowFriendsModal(true);
          break;
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [sessionCode, socket, fetchFriends]);

  // Switch to AI Mode
  const handleSelectAiMode = () => {
    setMode('ai');
    setIsWaitingForFriend(false);
    setIsOpponentConnected(false);
    setSessionCode(null);
    setOpponentName(null);

    const url = '/games/ludo/index.html?mode=ai';
    setIframeSrc(url);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  // Challenge a Friend from the Friends List
  const handleChallengeFriend = (friend: Friend) => {
    const generatedCode = `LUDO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const myName = user?.displayName || 'Player';

    setMode('online');
    setSessionCode(generatedCode);
    setPlayerRole('red');
    setOpponentName(friend.displayName);
    setOpponentId(friend._id);
    setIsWaitingForFriend(true);
    setIsOpponentConnected(false);

    // Emit challenge invite through socket
    if (socket) {
      socket.emit('game:invite', {
        targetUserId: friend._id,
        senderName: myName,
        senderAvatar: user?.avatar,
        game: 'ludo',
        sessionCode: generatedCode,
      });

      // Join the ludo match room as Red (Host)
      socket.emit('ludo:join', {
        sessionCode: generatedCode,
        role: 'red',
        playerName: myName,
      });
    }

    const url = `/games/ludo/index.html?mode=online&code=${encodeURIComponent(generatedCode)}&role=red&opponent=${encodeURIComponent(friend.displayName)}&name=${encodeURIComponent(myName)}&started=0`;
    setIframeSrc(url);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }

    setShowFriendsModal(false);
    toast.success(`Challenge sent to ${friend.displayName}! ⏳ Waiting for them to accept...`, {
      icon: '🎲',
      duration: 6000,
    });
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
      socket.emit('ludo:leave', { sessionCode });
    }
    onBack();
  };

  const filteredFriends = friendsList.filter(
    (f) =>
      f.displayName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      f.username?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0c10] flex flex-col select-none">
      {/* Top Header Bar */}
      <header className="h-14 px-3 sm:px-4 flex items-center justify-between border-b border-white/10 bg-[#0c0e14]/90 backdrop-blur-xl z-20 gap-2">
        {/* Left: Back button & Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={handleLeaveGame}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-pink-400" />
            <span className="hidden sm:inline">Arcade</span>
          </button>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-amber-300 truncate whitespace-nowrap">
              Classic 3D Ludo 🎲
            </span>
          </div>
        </div>

        {/* Center: Mode Toggles & Match Status */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mode Switcher Tabs */}
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                mode === 'ai'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                mode === 'online'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">Play Friend</span>
            </button>
          </div>

          {/* Online Match Opponent Tag */}
          {mode === 'online' && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold">
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
            title="Reload Board"
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
      {isWaitingForFriend && (
        <div className="bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span>
              Challenge sent to <strong className="text-white">{opponentName}</strong>! Waiting for them to accept...
            </span>
          </div>
          <button
            onClick={() => {
              setIsWaitingForFriend(false);
              handleSelectAiMode();
            }}
            className="text-[11px] px-2.5 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-bold transition-all cursor-pointer"
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
          title="Classic 3D Ludo Deluxe"
        />
      </div>

      {/* Friends Challenge Modal */}
      <AnimatePresence>
        {showFriendsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md rounded-3xl bg-[#12141c]/95 border border-white/10 shadow-2xl p-5 text-white flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
                    <Dices className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Challenge a Friend</h3>
                    <p className="text-[11px] text-slate-400">Play real-time 3D Ludo online with your friends</p>
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
                  placeholder="Search friends by name..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.1] border border-white/10 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 outline-none transition-all"
                />
              </div>

              {/* Friends List Container */}
              <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1 min-h-[180px] max-h-[340px]">
                {loadingFriends ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <div className="w-6 h-6 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">Loading friends...</span>
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <Users className="w-8 h-8 text-slate-500 mb-2" />
                    <p className="text-xs font-semibold text-slate-300">No mutual friends found</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Add friends from your profile or room to challenge them to Ludo!
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
                              <div className="w-full h-full flex items-center justify-center font-bold text-xs uppercase text-pink-300">
                                {friend.displayName.slice(0, 2)}
                              </div>
                            )}
                            {/* Live Presence indicator dot */}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#12141c] ${
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
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-xs font-bold text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Dices className="w-3.5 h-3.5" />
                          <span>Challenge 🎲</span>
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
