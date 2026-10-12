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
  Search,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  Play,
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

interface LudoGameProps {
  onBack: () => void;
}

interface RoomPlayer {
  userId: string;
  playerName: string;
  role: string;
  isHost?: boolean;
}

export default function LudoGame({ onBack }: LudoGameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const user = useAuthStore((state) => state.user);
  const socket = useSocketStore((state) => state.socket);
  const { sessionData, setSessionData } = useGameStore();

  const [mode, setMode] = useState<'ai' | 'online'>('ai');
  const [aiPlayerCount, setAiPlayerCount] = useState<2 | 3 | 4>(2);

  // Online Match State
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<'red' | 'green' | 'yellow' | 'blue'>('red');
  const [joinedPlayers, setJoinedPlayers] = useState<RoomPlayer[]>([]);
  const [isWaitingForFriend, setIsWaitingForFriend] = useState(false);
  const [targetPlayerCount, setTargetPlayerCount] = useState<number>(2);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isMatchActive, setIsMatchActive] = useState(false);

  // Friends Modal State
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [modalTargetCount, setModalTargetCount] = useState<2 | 3 | 4>(2);
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
      const role = (sessionData.role as 'red' | 'green' | 'yellow' | 'blue') || 'yellow';
      const opp = sessionData.opponentName || 'Opponent';
      const myName = user?.displayName || 'Player';
      const count = sessionData.playerCount || 2;
      return `/games/ludo/index.html?mode=online&code=${encodeURIComponent(code)}&role=${role}&opponent=${encodeURIComponent(opp)}&name=${encodeURIComponent(myName)}&players=${count}&started=1`;
    }
    return '/games/ludo/index.html?mode=ai&players=2';
  });

  // Handle incoming sessionData if user clicked Accept on global invite notification
  useEffect(() => {
    if (sessionData?.sessionCode) {
      const code = sessionData.sessionCode;
      const role = (sessionData.role as 'red' | 'green' | 'yellow' | 'blue') || 'yellow';
      const opp = sessionData.opponentName || 'Friend';
      const oppId = sessionData.opponentId || '';
      const count = sessionData.playerCount || 2;

      setMode('online');
      setSessionCode(code);
      setPlayerRole(role);
      setTargetPlayerCount(count);
      setIsWaitingForFriend(false);
      setIsMatchActive(true);

      const myName = user?.displayName || 'Player';
      setJoinedPlayers([
        { userId: oppId, playerName: opp, role: 'red', isHost: true },
        { userId: user?._id || '', playerName: myName, role },
      ]);

      setIframeSrc(
        `/games/ludo/index.html?mode=online&code=${encodeURIComponent(code)}&role=${role}&opponent=${encodeURIComponent(opp)}&name=${encodeURIComponent(myName)}&players=${count}&started=1`
      );

      if (socket) {
        socket.emit('ludo:join', {
          sessionCode: code,
          role,
          playerName: myName,
          targetCount: count,
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
        toast.success('A friend accepted your challenge!');
      }
    };

    // Friend declined in-game invite
    const handleInviteDeclined = (data: { game: string }) => {
      if (data.game === 'ludo') {
        toast.error('A friend declined the challenge.');
      }
    };

    // Joined room acknowledgment from server with full player roster
    const handleJoinedAck = (data: { sessionCode: string; role: string; players: RoomPlayer[] }) => {
      if (data.sessionCode === sessionCode) {
        setPlayerRole(data.role as any);
        if (data.players) {
          setJoinedPlayers(data.players);
        }
      }
    };

    // Another player joined the ludo match room
    const handleOpponentJoined = (data: { playerName: string; role: string; players?: RoomPlayer[] }) => {
      if (data.players) {
        setJoinedPlayers(data.players);
      } else {
        setJoinedPlayers((prev) => {
          if (prev.some((p) => p.role === data.role)) return prev;
          return [...prev, { userId: '', playerName: data.playerName, role: data.role }];
        });
      }

      toast.success(`${data.playerName || 'Player'} joined the room!`);
    };

    // Game started event received by all players
    const handleGameStarted = (data: { sessionCode: string; activePlayerIds: string[]; playerNames?: Record<string, string> }) => {
      if (data.sessionCode === sessionCode) {
        setIsWaitingForFriend(false);
        setIsMatchActive(true);

        iframeRef.current?.contentWindow?.postMessage(
          {
            type: 'LUDO_START_MATCH',
            activePlayerIds: data.activePlayerIds,
            playerNames: data.playerNames,
          },
          '*'
        );

        toast.success(`Game Started with ${data.activePlayerIds.length} Players!`);
      }
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
      toast.success('Rematch started! Board refreshed...');
    };

    // Remote in-game chat
    const handleRemoteChat = (data: { text?: string; message?: string; senderName?: string; role?: string }) => {
      const chatText = data.text || data.message || '';
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'REMOTE_CHAT',
          text: chatText,
          message: chatText,
          senderName: data.senderName,
          role: data.role,
        },
        '*'
      );
    };

    // Opponent left
    const handleOpponentLeft = (data: { players?: RoomPlayer[] }) => {
      if (data?.players) {
        setJoinedPlayers(data.players);
      }
      toast.error('A player left the match.');
    };

    socket.on('game:invite:accepted', handleInviteAccepted);
    socket.on('game:invite:declined', handleInviteDeclined);
    socket.on('ludo:joined_ack', handleJoinedAck);
    socket.on('ludo:opponent_joined', handleOpponentJoined);
    socket.on('ludo:game_started', handleGameStarted);
    socket.on('ludo:roll', handleRemoteRoll);
    socket.on('ludo:move', handleRemoteMove);
    socket.on('ludo:restart', handleRematch);
    socket.on('ludo:chat', handleRemoteChat);
    socket.on('ludo:opponent_left', handleOpponentLeft);

    return () => {
      socket.off('game:invite:accepted', handleInviteAccepted);
      socket.off('game:invite:declined', handleInviteDeclined);
      socket.off('ludo:joined_ack', handleJoinedAck);
      socket.off('ludo:opponent_joined', handleOpponentJoined);
      socket.off('ludo:game_started', handleGameStarted);
      socket.off('ludo:roll', handleRemoteRoll);
      socket.off('ludo:move', handleRemoteMove);
      socket.off('ludo:restart', handleRematch);
      socket.off('ludo:chat', handleRemoteChat);
      socket.off('ludo:opponent_left', handleOpponentLeft);
    };
  }, [socket, sessionCode]);

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

        case 'LUDO_LOCAL_CHAT':
        case 'GAME_CHAT':
          if (sessionCode && socket) {
            const content = data.text || data.message || '';
            socket.emit('ludo:chat', {
              sessionCode,
              message: content,
              text: content,
              senderName: user?.displayName || 'Player',
              role: playerRole,
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
    setIsMatchActive(false);
    setSessionCode(null);
    setJoinedPlayers([]);

    const url = `/games/ludo/index.html?mode=ai&players=${aiPlayerCount}`;
    setIframeSrc(url);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  // Change AI player count (2P, 3P, 4P)
  const handleChangeAiPlayerCount = (count: 2 | 3 | 4) => {
    setAiPlayerCount(count);
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: 'SET_AI_PLAYERS',
        count,
      },
      '*'
    );
  };

  // Send Invitations to selected friends
  const handleSendInvites = () => {
    if (selectedFriendIds.length === 0) {
      toast.error('Please select at least one friend to invite');
      return;
    }

    const generatedCode = `LUDO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const myName = user?.displayName || 'Player';
    const totalCount = selectedFriendIds.length + 1;

    setMode('online');
    setSessionCode(generatedCode);
    setPlayerRole('red');
    setTargetPlayerCount(totalCount);
    setIsWaitingForFriend(true);
    setIsMatchActive(false);

    // Initial joined roster with host
    const initialRoster: RoomPlayer[] = [
      { userId: user?._id || '', playerName: `${myName} (Host)`, role: 'red', isHost: true },
    ];
    setJoinedPlayers(initialRoster);

    // Send socket invite to each selected friend
    if (socket) {
      selectedFriendIds.forEach((friendId) => {
        socket.emit('game:invite', {
          targetUserId: friendId,
          senderName: myName,
          senderAvatar: user?.avatar,
          game: 'ludo',
          sessionCode: generatedCode,
          playerCount: totalCount,
        });
      });

      // Join the ludo match room as Red (Host)
      socket.emit('ludo:join', {
        sessionCode: generatedCode,
        role: 'red',
        playerName: myName,
        targetCount: totalCount,
      });
    }

    const url = `/games/ludo/index.html?mode=online&code=${encodeURIComponent(generatedCode)}&role=red&name=${encodeURIComponent(myName)}&players=${totalCount}&started=0`;
    setIframeSrc(url);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }

    setShowFriendsModal(false);
    toast.success(`Invites sent to ${selectedFriendIds.length} friend(s)! Waiting for them to accept...`, {
      duration: 6000,
    });
  };

  // Quick 1-on-1 Duel Challenge
  const handleQuickChallenge = (friend: Friend) => {
    setSelectedFriendIds([friend._id]);
    const generatedCode = `LUDO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const myName = user?.displayName || 'Player';

    setMode('online');
    setSessionCode(generatedCode);
    setPlayerRole('red');
    setTargetPlayerCount(2);
    setIsWaitingForFriend(true);
    setIsMatchActive(false);

    setJoinedPlayers([
      { userId: user?._id || '', playerName: `${myName} (Host)`, role: 'red', isHost: true },
    ]);

    if (socket) {
      socket.emit('game:invite', {
        targetUserId: friend._id,
        senderName: myName,
        senderAvatar: user?.avatar,
        game: 'ludo',
        sessionCode: generatedCode,
        playerCount: 2,
      });

      socket.emit('ludo:join', {
        sessionCode: generatedCode,
        role: 'red',
        playerName: myName,
        targetCount: 2,
      });
    }

    const url = `/games/ludo/index.html?mode=online&code=${encodeURIComponent(generatedCode)}&role=red&opponent=${encodeURIComponent(friend.displayName)}&name=${encodeURIComponent(myName)}&players=2&started=0`;
    setIframeSrc(url);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }

    setShowFriendsModal(false);
    toast.success(`Challenge sent to ${friend.displayName}! Waiting for them to accept...`, {
      duration: 6000,
    });
  };

  // Start match now with however many players have joined!
  const handleStartMatchWithJoined = () => {
    if (!sessionCode || joinedPlayers.length < 2) {
      toast.error('Need at least 2 players to start');
      return;
    }

    const count = joinedPlayers.length;
    let activePlayerIds: string[] = [];
    if (count === 2) {
      activePlayerIds = ['red', 'yellow'];
    } else if (count === 3) {
      activePlayerIds = ['red', 'green', 'yellow'];
    } else {
      activePlayerIds = ['red', 'green', 'yellow', 'blue'];
    }

    const playerNames: Record<string, string> = {};
    activePlayerIds.forEach((role, idx) => {
      const p = joinedPlayers[idx];
      playerNames[role] = p ? p.playerName : `Player ${idx + 1}`;
    });

    if (socket) {
      socket.emit('ludo:start_game', {
        sessionCode,
        activePlayerIds,
        playerNames,
      });
    }

    setIsWaitingForFriend(false);
    setIsMatchActive(true);

    iframeRef.current?.contentWindow?.postMessage(
      {
        type: 'LUDO_START_MATCH',
        activePlayerIds,
        playerNames,
      },
      '*'
    );

    toast.success(`Match started with ${count} players!`);
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
      socket.emit('ludo:leave', { sessionCode });
    }
    onBack();
  };

  // Filter mutual friends safely using displayName & email (prevents TS error)
  const filteredFriends = friendsList.filter(
    (f) =>
      f.displayName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      f.email?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const toggleSelectFriend = (id: string) => {
    const maxSelect = modalTargetCount - 1;
    if (selectedFriendIds.includes(id)) {
      setSelectedFriendIds(selectedFriendIds.filter((item) => item !== id));
    } else {
      if (selectedFriendIds.length >= maxSelect) {
        setSelectedFriendIds([...selectedFriendIds.slice(1), id]);
      } else {
        setSelectedFriendIds([...selectedFriendIds, id]);
      }
    }
  };

  // Role color pill indicators
  const roleColors: Record<string, string> = {
    red: '#ef4444',
    green: '#22c55e',
    yellow: '#eab308',
    blue: '#3b82f6',
  };

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
              Classic Ludo
            </span>
          </div>
        </div>

        {/* Center: Mode Toggles & Block Size */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sound & Mode Switcher */}
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
              <span className="text-[11px] sm:text-xs">Play Friends</span>
            </button>
          </div>

          {/* AI Mode: Player Count Selector (2P, 3P, 4P) */}
          {mode === 'ai' && (
            <div className="hidden sm:flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px]">
              {([2, 3, 4] as const).map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => handleChangeAiPlayerCount(cnt)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                    aiPlayerCount === cnt
                      ? 'bg-pink-500/30 text-pink-300 border border-pink-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={`Play with ${cnt} players`}
                >
                  {cnt}P
                </button>
              ))}
            </div>
          )}

          {/* Online Match Room Status Tag */}
          {mode === 'online' && sessionCode && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold">
              <span
                className={`w-2 h-2 rounded-full ${
                  isMatchActive ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="font-mono">{sessionCode}</span>
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

      {/* Online Lobby / Waiting Banner Overlay */}
      {mode === 'online' && isWaitingForFriend && (
        <div className="bg-[#0e111a]/95 border-b border-pink-500/20 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-10 shadow-lg">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>
                Room: <strong className="font-mono text-pink-300">{sessionCode}</strong>
              </span>
              <button
                onClick={handleCopyCode}
                title="Copy Room Code"
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {/* Live Joined Player Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {joinedPlayers.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.06] border border-white/10 text-[11px]"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: roleColors[p.role] || '#fff' }}
                  />
                  <span className="text-white font-medium truncate max-w-[90px]">{p.playerName}</span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-0.5" />
                </div>
              ))}

              {Array.from({ length: Math.max(0, targetPlayerCount - joinedPlayers.length) }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.02] border border-dashed border-white/20 text-[11px] text-slate-400"
                >
                  <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                  <span>Waiting...</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {joinedPlayers.length >= 2 && (
              <button
                onClick={handleStartMatchWithJoined}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-xs font-black text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer animate-pulse"
              >
                <Play className="w-3.5 h-3.5" fill="currentColor" />
                <span>Start Match ({joinedPlayers.length} Players)</span>
              </button>
            )}

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
        </div>
      )}

      {/* Main Game WebGL Iframe Container */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-[#0a0c10]">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full border-0 bg-[#0a0c10]"
          allow="autoplay; fullscreen"
          title="Classic Ludo"
        />
      </div>

      {/* Friends Challenge & Pairing Modal */}
      <AnimatePresence>
        {showFriendsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md rounded-3xl bg-[#12141c]/95 border border-white/10 shadow-2xl p-5 text-white flex flex-col max-h-[88vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
                    <Dices className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Play with Friends</h3>
                    <p className="text-[11px] text-slate-400">Invite friends for 2P, 3P, or 4P live match</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFriendsModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Number of Players Selector */}
              <div className="mt-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Match Size:</span>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {([2, 3, 4] as const).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => {
                        setModalTargetCount(cnt);
                        // trim selected friends if exceeds
                        const maxAllowed = cnt - 1;
                        if (selectedFriendIds.length > maxAllowed) {
                          setSelectedFriendIds(selectedFriendIds.slice(0, maxAllowed));
                        }
                      }}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                        modalTargetCount === cnt
                          ? 'bg-gradient-to-r from-pink-500/30 to-rose-500/30 border-pink-500 text-pink-300 shadow-md'
                          : 'bg-white/[0.04] border-white/5 text-slate-400 hover:bg-white/[0.08]'
                      }`}
                    >
                      <div>{cnt} Players</div>
                      <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                        {cnt === 2 ? '1 Friend' : cnt === 3 ? '2 Friends' : '3 Friends'}
                      </div>
                    </button>
                  ))}
                </div>
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
              <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1 min-h-[160px] max-h-[280px]">
                {loadingFriends ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <div className="w-6 h-6 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">Loading friends...</span>
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                    <Users className="w-8 h-8 text-slate-500 mb-2" />
                    <p className="text-xs font-semibold text-slate-300">No mutual friends found</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Add friends from your profile to challenge them to Ludo!
                    </p>
                  </div>
                ) : (
                  filteredFriends.map((friend) => {
                    const isOnline = onlineUsersMap[friend._id] ?? false;
                    const isSelected = selectedFriendIds.includes(friend._id);

                    return (
                      <div
                        key={friend._id}
                        onClick={() => toggleSelectFriend(friend._id)}
                        className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-pink-500/15 border-pink-500/50'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Selection Checkbox */}
                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? 'bg-pink-500 border-pink-500 text-white'
                                : 'border-white/20 bg-white/5'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
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
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#12141c] ${
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
                              {isOnline ? 'Online' : 'Offline'}
                            </p>
                          </div>
                        </div>

                        {/* Quick 1-on-1 Challenge Button if 2P */}
                        {modalTargetCount === 2 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickChallenge(friend);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-pink-500/20 hover:bg-pink-500 text-[11px] font-bold text-pink-300 hover:text-white transition-all shrink-0 cursor-pointer"
                          >
                            Duel
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Multi-Invite Action Button */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  Selected: <strong className="text-white">{selectedFriendIds.length}</strong> /{' '}
                  {modalTargetCount - 1} friend(s)
                </span>

                <button
                  type="button"
                  disabled={selectedFriendIds.length === 0}
                  onClick={handleSendInvites}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-xs font-black text-white shadow-lg shadow-pink-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Dices className="w-4 h-4" />
                  <span>Send Invites</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
