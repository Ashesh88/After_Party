'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Maximize2,
  RotateCcw,
  Bot,
  Users,
  Target,
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

interface CarromGameProps {
  onBack: () => void;
}

export default function CarromGame({ onBack }: CarromGameProps) {
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
        type: 'CARROM_TOGGLE_MUTE',
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
      return `/games/carrom/index.html?mode=online&code=${encodeURIComponent(code)}&role=${role}&opponent=${encodeURIComponent(opp)}&name=${encodeURIComponent(myName)}&started=1`;
    }
    return '/games/carrom/index.html?mode=ai';
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
        `/games/carrom/index.html?mode=online&code=${encodeURIComponent(code)}&role=${role}&opponent=${encodeURIComponent(opp)}&name=${encodeURIComponent(myName)}&started=1`
      );

      if (socket) {
        socket.emit('carrom:join', {
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
      if (data.sessionCode === sessionCode && data.game === 'carrom') {
        setIsWaitingForFriend(false);
        setIsOpponentConnected(true);
        toast.success(`${opponentName || 'Friend'} accepted your challenge!`);
      }
    };

    // Friend declined in-game invite
    const handleInviteDeclined = (data: { game: string }) => {
      if (data.game === 'carrom') {
        setIsWaitingForFriend(false);
        toast.error(`${opponentName || 'Friend'} declined the challenge.`);
      }
    };

    // Opponent joined the carrom match room
    const handleOpponentJoined = (data: { playerName: string; role: string }) => {
      setIsWaitingForFriend(false);
      setIsOpponentConnected(true);
      if (data.playerName) setOpponentName(data.playerName);
      toast.success(`${data.playerName || 'Opponent'} joined the board! Match is live!`);
    };

    // Opponent shot
    const handleRemoteShot = (data: { power: number; aimAngle: number; strikerX: number }) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'CARROM_SHOT',
          power: data.power,
          aimAngle: data.aimAngle,
          strikerX: data.strikerX,
        },
        '*'
      );
    };

    // Sync pieces after shot stops
    const handleSyncPieces = (data: { piecesData: any[]; scores: any; currentTurn: string }) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'CARROM_SYNC_PIECES',
          piecesData: data.piecesData,
          scores: data.scores,
          currentTurn: data.currentTurn,
        },
        '*'
      );
    };

    // Rematch requested
    const handleRematch = () => {
      toast('Opponent requested a rematch. Board reset.');
      iframeRef.current?.contentWindow?.postMessage({ type: 'CARROM_RESTART' }, '*');
    };

    // Opponent left
    const handleOpponentLeft = () => {
      setIsOpponentConnected(false);
      toast.error('Opponent left the match.');
    };

    socket.on('game:invite_accepted', handleInviteAccepted);
    socket.on('game:invite_declined', handleInviteDeclined);
    socket.on('carrom:opponent_joined', handleOpponentJoined);
    socket.on('carrom:shot', handleRemoteShot);
    socket.on('carrom:sync_pieces', handleSyncPieces);
    socket.on('carrom:rematch', handleRematch);
    socket.on('carrom:opponent_left', handleOpponentLeft);

    return () => {
      socket.off('game:invite_accepted', handleInviteAccepted);
      socket.off('game:invite_declined', handleInviteDeclined);
      socket.off('carrom:opponent_joined', handleOpponentJoined);
      socket.off('carrom:shot', handleRemoteShot);
      socket.off('carrom:sync_pieces', handleSyncPieces);
      socket.off('carrom:rematch', handleRematch);
      socket.off('carrom:opponent_left', handleOpponentLeft);
    };
  }, [socket, sessionCode, opponentName]);

  // Window Message Event Listener (Communication from Iframe -> Parent)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      const { type } = event.data;

      // Broadcast shot to opponent
      if (type === 'CARROM_SHOT_TAKEN') {
        if (socket && sessionCode) {
          socket.emit('carrom:shot', {
            sessionCode,
            power: event.data.power,
            aimAngle: event.data.aimAngle,
            strikerX: event.data.strikerX,
          });
        }
      }

      // Synchronize settled pieces state
      if (type === 'CARROM_SYNC_PIECES') {
        if (socket && sessionCode) {
          socket.emit('carrom:sync_pieces', {
            sessionCode,
            piecesData: event.data.piecesData,
            scores: event.data.scores,
            currentTurn: event.data.currentTurn,
          });
        }
      }

      // Game over
      if (type === 'CARROM_GAME_OVER') {
        toast.success(`Game Finished! Winner: ${event.data.winner || 'Player'}`, { duration: 5000 });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [socket, sessionCode]);

  // Start Online Match as Host
  const handleStartOnlineMatch = () => {
    const generatedCode = 'CARROM-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    setSessionCode(generatedCode);
    setPlayerRole('p1');
    setMode('online');
    setIsWaitingForFriend(true);
    setIsOpponentConnected(false);

    const myName = user?.displayName || 'Player 1';
    setIframeSrc(
      `/games/carrom/index.html?mode=online&code=${encodeURIComponent(generatedCode)}&role=p1&opponent=Waiting...&name=${encodeURIComponent(myName)}`
    );

    if (socket) {
      socket.emit('carrom:join', {
        sessionCode: generatedCode,
        role: 'p1',
        playerName: myName,
      });
    }

    fetchFriends();
    setShowFriendsModal(true);
  };

  // Switch back to Solo AI Bot mode
  const handleSwitchToAI = () => {
    if (socket && sessionCode) {
      socket.emit('carrom:leave', { sessionCode });
    }
    setMode('ai');
    setSessionCode(null);
    setIsWaitingForFriend(false);
    setIsOpponentConnected(false);
    setIframeSrc('/games/carrom/index.html?mode=ai');
    toast.success('Switched to Solo Bot Mode');
  };

  // Send Direct Game Invite to a Friend
  const handleInviteFriend = (friend: Friend) => {
    if (!socket || !sessionCode) return;

    setOpponentName(friend.displayName);
    setOpponentId(friend._id);
    setIsWaitingForFriend(true);

    socket.emit('game:invite', {
      targetUserId: friend._id,
      sessionCode,
      game: 'carrom',
      gameTitle: 'Royal 3D Carrom',
    });

    toast.success(`Invite sent to ${friend.displayName}!`);
    setShowFriendsModal(false);
  };

  // Fullscreen Toggle
  const handleFullscreen = () => {
    if (!iframeRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      iframeRef.current.requestFullscreen?.();
    }
  };

  // Reset Game
  const handleResetGame = () => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'CARROM_RESTART' }, '*');
    if (socket && sessionCode) {
      socket.emit('carrom:rematch', { sessionCode });
    }
    toast.success('Board reset for a new round!');
  };

  // Copy Session Code
  const handleCopyCode = () => {
    if (!sessionCode) return;
    navigator.clipboard.writeText(sessionCode);
    setCopiedCode(true);
    toast.success('Match Code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const filteredFriends = friendsList.filter((f) =>
    f.displayName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#07070e] flex flex-col select-none text-white overflow-hidden">
      {/* Top Header Controls Bar */}
      <header className="h-12 sm:h-14 px-2 sm:px-4 flex items-center justify-between border-b border-white/10 bg-black/85 backdrop-blur-xl z-20 shrink-0 gap-1.5">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={() => {
              if (socket && sessionCode) {
                socket.emit('carrom:leave', { sessionCode });
              }
              onBack();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Arcade</span>
          </button>

          <span className="text-xs sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-amber-500 whitespace-nowrap">
            3D Carrom
          </span>
        </div>

        {/* Center Mode Switcher Tabs */}
        <div className="flex items-center bg-white/[0.06] p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-white/10 shrink-0">
          <button
            onClick={handleSwitchToAI}
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              mode === 'ai'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Bot</span>
          </button>

          <button
            onClick={handleStartOnlineMatch}
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              mode === 'online'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friend</span>
          </button>
        </div>

        {/* Right Tools Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {mode === 'online' && sessionCode && (
            <button
              onClick={() => setShowFriendsModal(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Invite</span>
            </button>
          )}

          <button
            onClick={handleToggleMute}
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={handleResetGame}
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 transition-colors cursor-pointer"
            title="Reset Board"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={handleFullscreen}
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 transition-colors cursor-pointer"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Online Room Banner if active */}
      {mode === 'online' && sessionCode && (
        <div className="px-4 py-2 bg-gradient-to-r from-amber-950/60 via-purple-950/40 to-black/80 border-b border-amber-500/20 flex items-center justify-between text-xs z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Match Code:</span>
            <span className="font-mono font-black text-amber-300 tracking-wider bg-black/40 px-2 py-0.5 rounded border border-amber-500/30">
              {sessionCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
              title="Copy Code"
            >
              {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isOpponentConnected ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Connected with {opponentName || 'Friend'}</span>
              </span>
            ) : isWaitingForFriend ? (
              <span className="flex items-center gap-1.5 text-amber-400 font-bold animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                <span>Waiting for friend to accept...</span>
              </span>
            ) : (
              <span className="text-slate-400">Share match code to play live</span>
            )}
          </div>
        </div>
      )}

      {/* 3D WebGL Game Canvas Viewport Frame */}
      <main className="flex-1 relative w-full h-full overflow-hidden bg-black">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full border-none select-none"
          allow="autoplay; fullscreen"
        />
      </main>

      {/* Friends Invite Modal */}
      <AnimatePresence>
        {showFriendsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#120d1d] border border-amber-500/30 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-400" />
                  <h3 className="font-extrabold text-white text-base">Invite Friend to 3D Carrom</h3>
                </div>
                <button
                  onClick={() => setShowFriendsModal(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Match Code Share Box */}
              {sessionCode && (
                <div className="mt-4 p-3 rounded-2xl bg-white/[0.04] border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block">Match Room Code</span>
                    <span className="text-sm font-mono font-black text-amber-300 tracking-wider">
                      {sessionCode}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}

              {/* Search Friends Filter */}
              <div className="mt-4 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {/* Friends List */}
              <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1 max-h-60">
                {loadingFriends ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading friends list...</div>
                ) : filteredFriends.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    {searchFilter ? 'No friends match your search.' : 'No friends found. Add friends first!'}
                  </div>
                ) : (
                  filteredFriends.map((friend) => {
                    const isOnline = !!onlineUsersMap[friend._id];
                    return (
                      <div
                        key={friend._id}
                        className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center font-bold text-white text-xs">
                              {friend.displayName.charAt(0).toUpperCase()}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#120d1d] ${
                                isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{friend.displayName}</h4>
                            <p className="text-[10px] text-slate-400">
                              {isOnline ? 'Online now' : 'Offline'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleInviteFriend(friend)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
                        >
                          Invite
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
