'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Maximize2,
  RotateCcw,
  Bot,
  Users,
  Swords,
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

interface Chess3DProps {
  onBack: () => void;
}

export default function Chess3D({ onBack }: Chess3DProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const user = useAuthStore((state) => state.user);
  const socket = useSocketStore((state) => state.socket);
  const { sessionData, setSessionData } = useGameStore();

  const [mode, setMode] = useState<'ai' | 'online'>('ai');
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Online Match State
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<'w' | 'b'>('w');
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
        type: 'CHESS_TOGGLE_MUTE',
        muted: nextMuted,
      },
      '*'
    );
  };

  // Iframe Source URL
  const [iframeSrc, setIframeSrc] = useState<string>(() => {
    if (sessionData?.sessionCode) {
      const code = sessionData.sessionCode;
      const role = sessionData.role || 'b';
      const opp = sessionData.opponentName || 'Opponent';
      const myName = user?.displayName || 'Player';
      return `/games/chess/index.html?mode=online&code=${encodeURIComponent(code)}&role=${role}&opponent=${encodeURIComponent(opp)}&name=${encodeURIComponent(myName)}`;
    }
    return '/games/chess/index.html?mode=ai&diff=medium';
  });

  // Handle incoming sessionData if user clicked Accept on global invite
  useEffect(() => {
    if (sessionData?.sessionCode) {
      const code = sessionData.sessionCode;
      const role = sessionData.role || 'b';
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
        `/games/chess/index.html?mode=online&code=${encodeURIComponent(code)}&role=${role}&opponent=${encodeURIComponent(opp)}&name=${encodeURIComponent(myName)}`
      );

      if (socket) {
        socket.emit('chess:join', {
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
    const handleInviteAccepted = (data: { acceptedBy: string; sessionCode: string }) => {
      if (data.sessionCode === sessionCode) {
        setIsWaitingForFriend(false);
        setIsOpponentConnected(true);
        iframeRef.current?.contentWindow?.postMessage({ type: 'CHESS_START_MATCH' }, '*');
        toast.success(`${opponentName || 'Friend'} accepted your challenge! ⚔️`, {
          icon: '♟️',
        });
      }
    };

    // Friend declined in-game invite
    const handleInviteDeclined = (data: { game: string }) => {
      if (data.game === 'chess') {
        setIsWaitingForFriend(false);
        toast.error(`${opponentName || 'Friend'} declined the challenge.`);
      }
    };

    // Opponent joined the chess match
    const handleOpponentJoined = (data: { playerName: string; role: string }) => {
      setIsWaitingForFriend(false);
      setIsOpponentConnected(true);
      iframeRef.current?.contentWindow?.postMessage({ type: 'CHESS_START_MATCH' }, '*');
      toast.success(`${data.playerName || 'Opponent'} joined the match! Match is live! ♟️`);
    };

    // Opponent made a move
    const handleRemoteMove = (data: { move: any; fen: string }) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'CHESS_REMOTE_MOVE',
          move: data.move,
          fen: data.fen,
        },
        '*'
      );
    };

    // In-game match chat from opponent
    const handleRemoteChat = (data: { text: string; senderName: string }) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'CHESS_CHAT',
          text: data.text,
          senderName: data.senderName,
        },
        '*'
      );
    };

    // Emoji reaction from opponent
    const handleRemoteEmoji = (data: { emoji: string }) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'CHESS_EMOJI',
          emoji: data.emoji,
        },
        '*'
      );
    };

    // Rematch requested
    const handleRematch = () => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'CHESS_REMATCH',
        },
        '*'
      );
      toast.success('Opponent requested a rematch! Restarting board...', { icon: '🔄' });
    };

    // Opponent resigned
    const handleOpponentResign = (data: { role: string }) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'CHESS_OPPONENT_RESIGNED',
          role: data.role,
        },
        '*'
      );
      toast.success('Opponent resigned! You won! 🏆');
    };

    // Opponent left
    const handleOpponentLeft = () => {
      setIsOpponentConnected(false);
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'CHESS_OPPONENT_LEFT',
        },
        '*'
      );
      toast('Opponent disconnected or left match.', { icon: '👋' });
    };

    socket.on('game:invite:accepted', handleInviteAccepted);
    socket.on('game:invite:declined', handleInviteDeclined);
    socket.on('chess:opponent_joined', handleOpponentJoined);
    socket.on('chess:move', handleRemoteMove);
    socket.on('chess:chat', handleRemoteChat);
    socket.on('chess:emoji', handleRemoteEmoji);
    socket.on('chess:rematch', handleRematch);
    socket.on('chess:resign', handleOpponentResign);
    socket.on('chess:opponent_left', handleOpponentLeft);

    return () => {
      socket.off('game:invite:accepted', handleInviteAccepted);
      socket.off('game:invite:declined', handleInviteDeclined);
      socket.off('chess:opponent_joined', handleOpponentJoined);
      socket.off('chess:move', handleRemoteMove);
      socket.off('chess:chat', handleRemoteChat);
      socket.off('chess:emoji', handleRemoteEmoji);
      socket.off('chess:rematch', handleRematch);
      socket.off('chess:resign', handleOpponentResign);
      socket.off('chess:opponent_left', handleOpponentLeft);
    };
  }, [socket, sessionCode, opponentName]);

  // Listen to postMessage from the iframe
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      switch (data.type) {
        case 'CHESS_LOCAL_MOVE':
          if (sessionCode && socket) {
            socket.emit('chess:move', {
              sessionCode,
              move: data.move,
              fen: data.fen,
            });
          }
          break;

        case 'CHESS_LOCAL_CHAT':
          if (sessionCode && socket) {
            socket.emit('chess:chat', {
              sessionCode,
              text: data.text,
              senderName: user?.displayName || 'Player',
            });
          }
          break;

        case 'CHESS_LOCAL_EMOJI':
          if (sessionCode && socket) {
            socket.emit('chess:emoji', {
              sessionCode,
              emoji: data.emoji,
            });
          }
          break;

        case 'CHESS_LOCAL_REMATCH':
          if (sessionCode && socket) {
            socket.emit('chess:rematch', {
              sessionCode,
            });
          }
          break;

        case 'CHESS_LOCAL_RESIGN':
          if (sessionCode && socket) {
            socket.emit('chess:resign', {
              sessionCode,
              role: playerRole,
            });
          }
          break;

        case 'CHESS_REQUEST_INVITE':
          fetchFriends();
          setShowFriendsModal(true);
          break;

        case 'CHESS_MODE_CHANGED':
          if (data.mode === 'ai') {
            setMode('ai');
          }
          break;
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [sessionCode, socket, playerRole, user, fetchFriends]);

  // Switch to AI Mode
  const handleSelectAiMode = (diff = aiDifficulty) => {
    setMode('ai');
    setAiDifficulty(diff);
    setIsWaitingForFriend(false);
    setIsOpponentConnected(false);
    setSessionCode(null);
    setOpponentName(null);

    const url = `/games/chess/index.html?mode=ai&diff=${diff}`;
    setIframeSrc(url);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  // Challenge a Friend from the Friends List
  const handleChallengeFriend = (friend: Friend) => {
    const generatedCode = `ZEN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const myName = user?.displayName || 'Player';

    setMode('online');
    setSessionCode(generatedCode);
    setPlayerRole('w');
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
        game: 'chess',
        sessionCode: generatedCode,
      });

      // Join the chess match room as White (Host)
      socket.emit('chess:join', {
        sessionCode: generatedCode,
        role: 'w',
        playerName: myName,
      });
    }

    const url = `/games/chess/index.html?mode=online&code=${encodeURIComponent(generatedCode)}&role=w&opponent=${encodeURIComponent(friend.displayName)}&name=${encodeURIComponent(myName)}&started=0`;
    setIframeSrc(url);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }

    setShowFriendsModal(false);
    toast.success(`Challenge sent to ${friend.displayName}! ⏳ Waiting for them to accept...`, {
      icon: '♟️',
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
      socket.emit('chess:leave', { sessionCode });
    }
    onBack();
  };

  const filteredFriends = friendsList.filter((f) =>
    (f.displayName || '').toLowerCase().includes(searchFilter.toLowerCase())
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
              Zen 3D Chess ♟️
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
              onClick={() => handleSelectAiMode()}
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

          {/* AI Difficulty dropdown if in AI mode */}
          {mode === 'ai' && (
            <select
              value={aiDifficulty}
              onChange={(e) => {
                const diff = e.target.value as 'easy' | 'medium' | 'hard';
                handleSelectAiMode(diff);
              }}
              className="hidden md:inline-block bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-200 outline-none cursor-pointer"
            >
              <option value="easy" className="bg-[#12141c] text-white">Casual (Easy)</option>
              <option value="medium" className="bg-[#12141c] text-white">Tactician (Medium)</option>
              <option value="hard" className="bg-[#12141c] text-white">Grandmaster (Hard)</option>
            </select>
          )}

          {/* Online Match Status Pill */}
          {mode === 'online' && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-200">
              {isWaitingForFriend ? (
                <>
                  <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                  <span>Waiting for {opponentName || 'Friend'}...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-white truncate max-w-[120px]">
                    vs {opponentName || 'Friend'}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                    {playerRole === 'w' ? '⚪ White' : '⚫ Black'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => {
              fetchFriends();
              setShowFriendsModal(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500/20 hover:from-pink-500/30 to-purple-500/20 hover:to-purple-500/30 text-pink-300 border border-pink-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Swords className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Challenge</span>
          </button>

          <button
            onClick={handleReload}
            title="Reload Board"
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleFullscreen}
            title="Full Screen View"
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main 3D Canvas Iframe */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-[#0a0c10]">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full border-none bg-[#0a0c10]"
          allow="fullscreen; autoplay; camera; microphone"
          title="Zen 3D Chess Studio"
        />
      </div>

      {/* "My Friends List" In-Game Challenge Modal */}
      <AnimatePresence>
        {showFriendsModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-3xl bg-[#0e101a] border border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col max-h-[85vh] text-white"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-950/40 to-slate-900/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                    <Swords className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Challenge a Friend</h3>
                    <p className="text-xs text-slate-400">Play real-time 3D Chess with legal moves</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFriendsModal(false)}
                  className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3 sm:p-4 border-b border-white/[0.06] bg-black/30">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search from My Friends List..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400/60 transition-colors"
                  />
                </div>
              </div>

              {/* Friends List Container */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 min-h-[220px]">
                {loadingFriends ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                    <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Loading friends...</span>
                  </div>
                ) : friendsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-400 mb-3">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-200">No friends added yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Add friends using their unique Friend ID in the Friends tab to challenge them here anytime!
                    </p>
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No friends match "{searchFilter}"
                  </div>
                ) : (
                  filteredFriends.map((friend) => {
                    const isOnline = onlineUsersMap[friend._id];
                    return (
                      <div
                        key={friend._id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar with status indicator */}
                          <div className="relative w-10 h-10 rounded-2xl overflow-hidden bg-black/40 border border-white/15 shrink-0">
                            {friend.avatar ? (
                              <img
                                src={friend.avatar}
                                alt={friend.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-xs uppercase text-cyan-300">
                                {friend.displayName.slice(0, 2)}
                              </div>
                            )}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0e101a] ${
                                isOnline ? 'bg-emerald-400 ring-2 ring-emerald-500/20' : 'bg-slate-500'
                              }`}
                            />
                          </div>

                          {/* Friend Info */}
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                              {friend.displayName}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`text-[10px] font-semibold ${
                                  isOnline ? 'text-emerald-400' : 'text-slate-400'
                                }`}
                              >
                                {isOnline ? 'Online' : 'Offline'}
                              </span>
                              {friend.friendId && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  #{friend.friendId}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Challenge Action Button */}
                        <button
                          onClick={() => handleChallengeFriend(friend)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-pink-500/20 hover:shadow-pink-500/40 transition-all cursor-pointer shrink-0 active:scale-95"
                        >
                          <Swords className="w-3.5 h-3.5" />
                          <span>Challenge ⚔️</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 sm:p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Invited friend gets an instant match pop-up!</span>
                </div>
                <button
                  onClick={() => setShowFriendsModal(false)}
                  className="px-3 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
