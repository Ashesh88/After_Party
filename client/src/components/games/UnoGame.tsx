'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Maximize2,
  RotateCcw,
  Bot,
  Users,
  Layers,
  X,
  Search,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  Copy,
  Check,
  MessageSquare,
  Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../lib/store/authStore';
import { useSocketStore } from '../../lib/store/socketStore';
import { useGameStore } from '../../lib/store/gameStore';
import api from '../../lib/api';
import { Friend } from '../../lib/types';

interface UnoGameProps {
  onBack: () => void;
}

export default function UnoGame({ onBack }: UnoGameProps) {
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

  // Match Chat State
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; text: string; isMe: boolean }>>([
    { id: '1', sender: 'System', text: 'UNO Match chat is live. Say hi!', isMe: false }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // 2-Second Floating In-Game Chat Bubble State
  const [floatingMessage, setFloatingMessage] = useState<{ sender: string; text: string } | null>(null);
  const floatingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerFloatingMessage = useCallback((sender: string, text: string) => {
    if (floatingTimeoutRef.current) clearTimeout(floatingTimeoutRef.current);
    setFloatingMessage({ sender, text });
    floatingTimeoutRef.current = setTimeout(() => {
      setFloatingMessage(null);
    }, 2000);
  }, []);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: 'UNO_TOGGLE_MUTE',
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
      return `/games/uno/index.html?mode=online&code=${encodeURIComponent(code)}&role=${role}&opponent=${encodeURIComponent(opp)}&name=${encodeURIComponent(myName)}&started=1`;
    }
    return '/games/uno/index.html?mode=ai';
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
        `/games/uno/index.html?mode=online&code=${encodeURIComponent(code)}&role=${role}&opponent=${encodeURIComponent(opp)}&name=${encodeURIComponent(myName)}&started=1`
      );

      if (socket) {
        socket.emit('uno:join', {
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

    const handleInviteAccepted = (data: { acceptedBy: string; sessionCode: string; game: string }) => {
      if (data.sessionCode === sessionCode && data.game === 'uno') {
        setIsWaitingForFriend(false);
        setIsOpponentConnected(true);
        toast.success(`${opponentName || 'Friend'} accepted your challenge!`);
      }
    };

    const handleInviteDeclined = (data: { game: string }) => {
      if (data.game === 'uno') {
        setIsWaitingForFriend(false);
        toast.error(`${opponentName || 'Friend'} declined the challenge.`);
      }
    };

    const handleOpponentJoined = (data: { playerName: string; role: string }) => {
      setIsWaitingForFriend(false);
      setIsOpponentConnected(true);
      if (data.playerName) setOpponentName(data.playerName);
      toast.success(`${data.playerName || 'Opponent'} joined the Uno table! Match is live!`);
    };

    const handleUnoAction = (data: { actionType: string; payload: any }) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'UNO_REMOTE_ACTION',
          actionType: data.actionType,
          payload: data.payload,
        },
        '*'
      );
    };

    const handleUnoChat = (data: { message: string; senderName: string; timestamp: number }) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: data.senderName,
          text: data.message,
          isMe: false,
        },
      ]);
      triggerFloatingMessage(data.senderName, data.message);
      if (!showChatModal) {
        setUnreadChatCount((prev) => prev + 1);
      }
    };

    const handleOpponentLeft = () => {
      setIsOpponentConnected(false);
      toast.error('Opponent disconnected from the match.');
    };

    socket.on('game:invite_accepted', handleInviteAccepted);
    socket.on('game:invite_declined', handleInviteDeclined);
    socket.on('uno:opponent_joined', handleOpponentJoined);
    socket.on('uno:action', handleUnoAction);
    socket.on('uno:chat', handleUnoChat);
    socket.on('uno:opponent_left', handleOpponentLeft);

    return () => {
      socket.off('game:invite_accepted', handleInviteAccepted);
      socket.off('game:invite_declined', handleInviteDeclined);
      socket.off('uno:opponent_joined', handleOpponentJoined);
      socket.off('uno:action', handleUnoAction);
      socket.off('uno:chat', handleUnoChat);
      socket.off('uno:opponent_left', handleOpponentLeft);
    };
  }, [socket, sessionCode, opponentName, showChatModal, triggerFloatingMessage]);

  // Handle postMessage from iframe
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'UNO_ACTION_TRIGGERED' && socket && sessionCode) {
        socket.emit('uno:action', {
          sessionCode,
          actionType: data.actionType,
          payload: data.payload,
        });
      }

      if (data.type === 'OPEN_CHAT_MODAL') {
        setShowChatModal(true);
        setUnreadChatCount(0);
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [socket, sessionCode]);

  // Send in-game chat message: closes modal and shows 2-second floating bubble
  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput.trim();
    const myName = user?.displayName || 'You';

    setChatMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: myName,
        text,
        isMe: true,
      },
    ]);
    setChatInput('');

    // Close chat modal and show floating bubble on screen for 2 seconds
    setShowChatModal(false);
    triggerFloatingMessage(myName, text);

    if (socket && sessionCode) {
      socket.emit('uno:chat', {
        sessionCode,
        message: text,
        senderName: myName,
      });
    }
  };

  // Start AI Single Player Match
  const startAIMode = () => {
    setMode('ai');
    setSessionCode(null);
    setOpponentName('Uno Bot');
    setIsWaitingForFriend(false);
    setIsOpponentConnected(false);
    setIframeSrc('/games/uno/index.html?mode=ai');
  };

  // Create Online Multiplayer Challenge
  const handleCreateOnlineChallenge = () => {
    const code = 'UNO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setSessionCode(code);
    setPlayerRole('p1');
    setMode('online');
    setIsWaitingForFriend(true);
    setIsOpponentConnected(false);

    const myName = user?.displayName || 'Player';
    setIframeSrc(
      `/games/uno/index.html?mode=online&code=${encodeURIComponent(code)}&role=p1&name=${encodeURIComponent(myName)}`
    );

    if (socket) {
      socket.emit('uno:join', {
        sessionCode: code,
        role: 'p1',
        playerName: myName,
      });
    }

    fetchFriends();
    setShowFriendsModal(true);
  };

  // Invite specific friend
  const handleInviteFriend = (friend: Friend) => {
    if (!socket || !sessionCode) return;

    setOpponentName(friend.displayName);
    setOpponentId(friend._id);

    socket.emit('game:invite', {
      targetUserId: friend._id,
      sessionCode,
      game: 'uno',
      inviterName: user?.displayName || 'Friend',
    });

    toast.success(`Invite sent to ${friend.displayName}!`);
    setShowFriendsModal(false);
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (!sessionCode) return;
    navigator.clipboard.writeText(sessionCode);
    setCopiedCode(true);
    toast.success('Room code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Reset round
  const handleRestart = () => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'UNO_RESET_ROUND' }, '*');
    toast.success('UNO round restarted!');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#080914] flex flex-col select-none text-white overflow-hidden">
      {/* Sleek Header Bar */}
      <header className="h-14 px-3 sm:px-4 flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Arcade</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-400 to-yellow-300">
              UNO Party
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
              LIVE
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-white/[0.06] p-1 rounded-xl border border-white/10">
            <button
              onClick={startAIMode}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'ai'
                  ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden md:inline">vs AI</span>
            </button>
            <button
              onClick={handleCreateOnlineChallenge}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'online'
                  ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Online Duel</span>
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleMute}
            className="w-8 h-8 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Game' : 'Mute Game'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => {
              setShowChatModal(true);
              setUnreadChatCount(0);
            }}
            className="relative w-8 h-8 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Match Chat"
          >
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-black flex items-center justify-center text-white">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Restart Round */}
          <button
            onClick={handleRestart}
            className="w-8 h-8 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Restart UNO Round"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Waiting for Friend Banner (Online Mode) */}
      {mode === 'online' && isWaitingForFriend && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200 z-10">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 animate-spin text-amber-400" />
            <span>
              Waiting for {opponentName || 'opponent'} to join... Room Code:{' '}
              <strong className="tracking-wider text-white font-mono bg-black/40 px-2 py-0.5 rounded">
                {sessionCode}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-bold flex items-center gap-1 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={() => {
                fetchFriends();
                setShowFriendsModal(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-bold cursor-pointer"
            >
              Invite Friend
            </button>
          </div>
        </div>
      )}

      {/* 3D WebGL Iframe Container */}
      <main className="flex-1 relative w-full h-full bg-[#080914] overflow-hidden">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full border-none block"
          allow="autoplay; fullscreen"
          title="UNO Party Game"
        />

        {/* 2-Second Floating In-Game Chat Bubble */}
        <AnimatePresence>
          {floatingMessage && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.92 }}
              transition={{ duration: 0.22 }}
              className="absolute bottom-24 right-5 z-40 max-w-xs bg-black/80 backdrop-blur-2xl border border-white/20 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-2.5 pointer-events-none"
            >
              <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
              <div className="text-left">
                <p className="text-[10px] font-bold text-cyan-300">{floatingMessage.sender}</p>
                <p className="text-xs font-semibold text-white truncate max-w-[210px]">{floatingMessage.text}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* In-Game Match Chat Modal */}
      <AnimatePresence>
        {showChatModal && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-4 right-4 w-80 sm:w-96 h-96 bg-[#0f1124]/95 border border-white/15 backdrop-blur-2xl rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            <div className="p-3 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">UNO Match Chat</span>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-slate-400 mb-0.5">{msg.sender}</span>
                  <div
                    className={`px-3 py-1.5 rounded-xl text-xs max-w-[85%] ${
                      msg.isMe
                        ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white font-medium'
                        : 'bg-white/10 text-slate-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="p-2 border-t border-white/10 flex gap-2 bg-black/40">
              <input
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friends Challenge Modal */}
      <AnimatePresence>
        {showFriendsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-[#0f1124] border border-white/15 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-400" />
                  <h3 className="text-base font-bold text-white">Challenge a Friend</h3>
                </div>
                <button
                  onClick={() => setShowFriendsModal(false)}
                  className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Room Code Card */}
              <div className="mt-4 p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">UNO Room Code</p>
                  <p className="text-base font-black tracking-widest text-amber-300 font-mono">
                    {sessionCode || '------'}
                  </p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Search Friends */}
              <div className="mt-4 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search online friends..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                />
              </div>

              {/* Friends List */}
              <div className="mt-3 flex-1 overflow-y-auto space-y-2 min-h-[160px]">
                {loadingFriends ? (
                  <div className="flex items-center justify-center h-32 text-xs text-slate-400">
                    Loading friends...
                  </div>
                ) : friendsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center text-xs text-slate-400">
                    <p>No mutual friends found.</p>
                    <p className="text-[10px] text-slate-500 mt-1">Share room code above to play directly!</p>
                  </div>
                ) : (
                  friendsList
                    .filter((f) => f.displayName.toLowerCase().includes(searchFilter.toLowerCase()))
                    .map((friend) => {
                      const isOnline = !!onlineUsersMap[friend._id];
                      return (
                        <div
                          key={friend._id}
                          className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between hover:bg-white/[0.06] transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-500 to-amber-500 flex items-center justify-center font-bold text-xs text-white">
                                {friend.displayName.charAt(0).toUpperCase()}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0f1124] ${
                                  isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                                }`}
                              />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{friend.displayName}</p>
                              <p className="text-[10px] text-slate-400">
                                {isOnline ? 'Online' : 'Offline'}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleInviteFriend(friend)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-400 hover:to-amber-400 text-white font-extrabold text-xs shadow-md shadow-red-500/20 cursor-pointer"
                          >
                            Challenge
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
