'use client';
import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSocketStore } from '../../../lib/store/socketStore';
import { useAuthStore } from '../../../lib/store/authStore';
import { useCallStore } from '../../../lib/store/callStore';
import { soundService } from '../../../lib/soundService';
import api from '../../../lib/api';
import { Message, Friend, Room, ConversationItem } from '../../../lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Send, Check, CheckCheck, Phone, Video, Mic, Square, Play, Pause, 
  Heart, ArrowLeft, Search, Image as ImageIcon, Smile, MoreVertical,
  Users, Trash2, Sparkles, MessageSquare, Radio, Circle, Layers
} from 'lucide-react';

interface ActiveChat {
  type: 'direct' | 'room';
  id: string; // friendId or roomId
  title: string;
  avatar?: string;
  subtitle?: string;
  isOnline?: boolean;
  lastSeen?: string | Date;
  friend?: any;
  room?: any;
}

const COMMON_EMOJIS = ['❤️', '😘', '😂', '🔥', '😍', '🥺', '✨', '💕', '👏', '🎮', '🍕', '🎉'];

function formatTime(dateStr?: string | Date): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatConversationDate(dateStr?: string | Date): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ChatContent() {
  const searchParams = useSearchParams();
  const initialFriendId = searchParams.get('friendId');
  const initialRoomId = searchParams.get('roomId');

  const user = useAuthStore((state) => state.user);
  const { socket } = useSocketStore();
  const startCall = useCallStore((state) => state.startCall);

  // Conversations State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'direct' | 'room'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Active Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [onlineStatusMap, setOnlineStatusMap] = useState<Record<string, { online: boolean; lastSeen?: string | Date }>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);

  // Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Mobile View Toggle: When true, shows active chat window on mobile; when false, shows conversations list
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // Refs
  const feedRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // 1. Fetch Conversations and Connections
  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const [convRes, friendsRes] = await Promise.all([
        api.get('/messages/conversations').catch(() => ({ data: { directConversations: [], roomConversations: [] } })),
        api.get('/friends').catch(() => ({ data: { friends: [] } })),
      ]);

      const directConvs: ConversationItem[] = convRes.data.directConversations || [];
      const roomConvs: ConversationItem[] = convRes.data.roomConversations || [];
      const friends: Friend[] = friendsRes.data.friends || [];
      setFriendsList(friends);

      // Merge friends who don't yet have messages in directConversations
      const existingFriendIds = new Set(directConvs.map((c) => c.id));
      const additionalFriendConvs: ConversationItem[] = friends
        .filter((f) => !existingFriendIds.has(f._id))
        .map((f) => ({
          id: f._id,
          type: 'direct',
          user: {
            _id: f._id,
            displayName: f.displayName,
            avatar: f.avatar,
            friendId: f.friendId,
            lastSeen: f.lastSeen,
          },
          lastMessage: null,
          unreadCount: 0,
          updatedAt: new Date(0),
        }));

      const allConvs = [...roomConvs, ...directConvs, ...additionalFriendConvs];
      setConversations(allConvs);

      // Query real-time online status for all friend IDs
      if (socket && friends.length > 0) {
        socket.emit('presence:query', friends.map((f) => f._id), (statusMap: any) => {
          if (statusMap) setOnlineStatusMap(statusMap);
        });
      }

      // Check if URL query specified an initial friend or room
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      if (initialFriendId) {
        const targetFriend = friends.find((f) => f._id === initialFriendId);
        if (targetFriend) {
          selectDirectChat(targetFriend, true);
          return;
        }
      }

      if (initialRoomId) {
        const targetRoom = roomConvs.find((r) => r.id === initialRoomId);
        if (targetRoom) {
          selectRoomChat(targetRoom, true);
          return;
        }
      }

      // On desktop, auto-select the first conversation if none is active; on mobile, keep list visible
      if (!activeChat && !isMobile) {
        if (directConvs.length > 0 && directConvs[0].user) {
          selectDirectChat(directConvs[0].user as any, false);
        } else if (roomConvs.length > 0) {
          selectRoomChat(roomConvs[0], false);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [socket, initialFriendId, initialRoomId]);

  // Select a Direct 1-on-1 Chat
  const selectDirectChat = (
    friendUser: Friend | { _id: string; displayName: string; avatar?: string; lastSeen?: any },
    openOnMobile = true
  ) => {
    const friendId = friendUser._id;
    const isOnline = onlineStatusMap[friendId]?.online || false;
    const lastSeen = onlineStatusMap[friendId]?.lastSeen || (friendUser as any).lastSeen;

    setActiveChat({
      type: 'direct',
      id: friendId,
      title: friendUser.displayName,
      avatar: friendUser.avatar,
      isOnline,
      lastSeen,
      friend: friendUser,
    });
    if (openOnMobile) setMobileChatOpen(true);
    setPartnerTyping(false);

    // Reset unread count in local state
    setConversations((prev) =>
      prev.map((c) => (c.id === friendId ? { ...c, unreadCount: 0 } : c))
    );
  };

  // Select a Space Chat
  const selectRoomChat = (
    roomItem: ConversationItem | { id: string; name?: string; inviteCode?: string },
    openOnMobile = true
  ) => {
    const title = roomItem.name || (roomItem.inviteCode ? `Space • ${roomItem.inviteCode}` : 'Shared Space');
    setActiveChat({
      type: 'room',
      id: roomItem.id,
      title,
      subtitle: roomItem.inviteCode ? `Space Code: ${roomItem.inviteCode}` : 'Shared Space',
      room: roomItem,
    });
    if (openOnMobile) setMobileChatOpen(true);
    setPartnerTyping(false);

    // Ensure socket is joined to room channel
    if (socket) {
      socket.emit('room:switch', { roomId: roomItem.id });
    }
  };

  // 2. Fetch Messages when activeChat changes
  useEffect(() => {
    if (!activeChat) return;

    let isMounted = true;
    const fetchHistory = async () => {
      try {
        if (activeChat.type === 'direct') {
          const res = await api.get(`/messages/direct/${activeChat.id}`);
          if (isMounted && res.data.messages) {
            setMessages(res.data.messages.reverse());
            scrollToBottom(false);
          }
          // Mark seen on server & emit
          api.patch(`/messages/direct/${activeChat.id}/seen`).catch(() => {});
          socket?.emit('chat:direct-seen', { friendId: activeChat.id });
        } else {
          const res = await api.get(`/messages/room/${activeChat.id}`);
          if (isMounted && res.data.messages) {
            setMessages(res.data.messages.reverse());
            scrollToBottom(false);
          }
        }
      } catch (err) {
        console.error('Failed to load messages for active chat:', err);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [activeChat?.id, activeChat?.type]);

  // 3. Socket Event Listeners
  useEffect(() => {
    if (!socket) return;

    // Direct 1-on-1 Message received
    const handleDirectMessage = (msg: Message) => {
      const senderId = typeof msg.senderId === 'object' ? (msg.senderId as any)._id : msg.senderId;
      const recipientId = typeof msg.recipientId === 'object' ? (msg.recipientId as any)._id : msg.recipientId;

      // If activeChat is open with this friend
      if (
        activeChat?.type === 'direct' &&
        (activeChat.id === senderId || activeChat.id === recipientId)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom(true);

        if (senderId !== user?._id) {
          socket.emit('chat:direct-seen', { friendId: senderId });
          soundService.playMessageTone();
        }
      } else {
        // Increment unread count & play tone if received from someone else
        if (senderId !== user?._id) {
          soundService.playMessageTone();
          setConversations((prev) =>
            prev.map((c) =>
              c.id === senderId
                ? {
                    ...c,
                    unreadCount: (c.unreadCount || 0) + 1,
                    lastMessage: {
                      _id: msg._id,
                      content: msg.content,
                      type: msg.type,
                      createdAt: msg.createdAt,
                    },
                    updatedAt: msg.createdAt,
                  }
                : c
            )
          );
        }
      }
    };

    // Room message received
    const handleRoomMessage = (msg: Message) => {
      if (activeChat?.type === 'room' && activeChat.id === msg.roomId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom(true);

        const senderId = typeof msg.senderId === 'object' ? (msg.senderId as any)._id : msg.senderId;
        if (senderId !== user?._id) {
          socket.emit('chat:seen', { messageId: msg._id, roomId: msg.roomId });
          soundService.playMessageTone();
        }
      }
    };

    // Typing indicators
    const handleDirectTyping = (data: { senderId: string; isTyping: boolean }) => {
      if (activeChat?.type === 'direct' && activeChat.id === data.senderId) {
        setPartnerTyping(data.isTyping);
      }
    };

    const handleRoomTyping = (data: { userId: string; isTyping: boolean }) => {
      if (activeChat?.type === 'room' && data.userId !== user?._id) {
        setPartnerTyping(data.isTyping);
      }
    };

    // Seen ticks
    const handleDirectSeen = (data: { seenBy: string }) => {
      if (activeChat?.type === 'direct' && activeChat.id === data.seenBy) {
        setMessages((prev) => prev.map((m) => ({ ...m, seen: true })));
      }
    };

    const handleRoomSeen = (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === data.messageId ? { ...m, seen: true } : m))
      );
    };

    // Vanish / Clear
    const handleDirectVanish = (data: { senderId: string }) => {
      if (activeChat?.type === 'direct' && activeChat.id === data.senderId) {
        setMessages([]);
        toast('Conversation was cleared', { icon: '🧹' });
      }
    };

    const handleRoomVanish = () => {
      if (activeChat?.type === 'room') {
        setMessages([]);
        toast('Room chat was cleared', { icon: '🧹' });
      }
    };

    // Presence updates
    const handlePresenceOnline = (data: { userId: string }) => {
      setOnlineStatusMap((prev) => ({
        ...prev,
        [data.userId]: { online: true, lastSeen: new Date() },
      }));
    };

    const handlePresenceOffline = (data: { userId: string; lastSeen?: string }) => {
      setOnlineStatusMap((prev) => ({
        ...prev,
        [data.userId]: { online: false, lastSeen: data.lastSeen || new Date() },
      }));
    };

    socket.on('chat:direct-message', handleDirectMessage);
    socket.on('chat:message', handleRoomMessage);
    socket.on('chat:direct-typing', handleDirectTyping);
    socket.on('chat:typing', handleRoomTyping);
    socket.on('chat:direct-seen', handleDirectSeen);
    socket.on('chat:seen', handleRoomSeen);
    socket.on('chat:direct-vanish', handleDirectVanish);
    socket.on('chat:vanish', handleRoomVanish);
    socket.on('presence:online', handlePresenceOnline);
    socket.on('presence:offline', handlePresenceOffline);

    return () => {
      socket.off('chat:direct-message', handleDirectMessage);
      socket.off('chat:message', handleRoomMessage);
      socket.off('chat:direct-typing', handleDirectTyping);
      socket.off('chat:typing', handleRoomTyping);
      socket.off('chat:direct-seen', handleDirectSeen);
      socket.off('chat:seen', handleRoomSeen);
      socket.off('chat:direct-vanish', handleDirectVanish);
      socket.off('chat:vanish', handleRoomVanish);
      socket.off('presence:online', handlePresenceOnline);
      socket.off('presence:offline', handlePresenceOffline);
    };
  }, [socket, activeChat, user]);

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      if (feedRef.current) {
        if (smooth) {
          feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
        } else {
          feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
      }
    }, 50);
  };

  // 4. Sending Messages
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = input.trim();
    if (!content || !socket || !activeChat) return;

    if (activeChat.type === 'direct') {
      socket.emit('chat:direct-message', {
        recipientId: activeChat.id,
        content,
        type: 'text',
      });
      socket.emit('chat:direct-typing', {
        recipientId: activeChat.id,
        isTyping: false,
      });
    } else {
      socket.emit('chat:message', {
        roomId: activeChat.id,
        content,
        type: 'text',
      });
      socket.emit('chat:typing', {
        roomId: activeChat.id,
        isTyping: false,
      });
    }

    setInput('');
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!socket || !activeChat) return;

    const isTyping = e.target.value.length > 0;
    if (activeChat.type === 'direct') {
      socket.emit('chat:direct-typing', { recipientId: activeChat.id, isTyping });
    } else {
      socket.emit('chat:typing', { roomId: activeChat.id, isTyping });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (activeChat.type === 'direct') {
        socket.emit('chat:direct-typing', { recipientId: activeChat.id, isTyping: false });
      } else {
        socket.emit('chat:typing', { roomId: activeChat.id, isTyping: false });
      }
    }, 2500);
  };

  const handleSelectEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
  };

  // Image Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    const formData = new FormData();
    formData.append('image', file);
    if (activeChat.type === 'direct') {
      formData.append('recipientId', activeChat.id);
    } else {
      formData.append('roomId', activeChat.id);
    }

    try {
      toast.loading('Sending photo...', { id: 'img-upload' });
      await api.post('/messages/image', formData);
      toast.success('Photo sent!', { id: 'img-upload' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      toast.error('Failed to send photo', { id: 'img-upload' });
    }
  };

  // Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (activeChat) {
            if (activeChat.type === 'direct') {
              socket?.emit('chat:direct-message', {
                recipientId: activeChat.id,
                content: 'Voice note',
                type: 'audio',
                audioUrl: base64Audio,
                audioDuration: recordingDuration,
              });
            } else {
              socket?.emit('chat:message', {
                roomId: activeChat.id,
                content: 'Voice note',
                type: 'audio',
                audioUrl: base64Audio,
                audioDuration: recordingDuration,
              });
            }
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      toast.error('Microphone permission required for voice notes');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      audioChunksRef.current = [];
      toast('Voice note discarded');
    }
  };

  const togglePlayAudio = (msgId: string, url: string) => {
    if (playingAudioId === msgId) {
      currentAudioRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }
    if (currentAudioRef.current) currentAudioRef.current.pause();

    const audio = new Audio(url);
    currentAudioRef.current = audio;
    setPlayingAudioId(msgId);
    audio.onended = () => setPlayingAudioId(null);
    audio.play().catch(() => setPlayingAudioId(null));
  };

  // Send Heartbeat
  const sendHeartbeat = () => {
    if (!socket || !activeChat) return;
    if (activeChat.type === 'direct') {
      socket.emit('touch:heartbeat', {
        recipientId: activeChat.id,
        senderName: user?.displayName || 'Friend',
      });
    } else {
      socket.emit('touch:heartbeat', {
        senderName: user?.displayName || 'Partner',
      });
    }
    soundService.playHeartbeatTone();
    toast.success(`Heartbeat sent to ${activeChat.title}! 💕`);
  };

  // Clear / Vanish Chat
  const handleClearChat = async () => {
    if (!activeChat) return;
    if (!confirm(`Clear all messages with ${activeChat.title}? This cannot be undone.`)) return;

    try {
      if (activeChat.type === 'direct') {
        await api.delete(`/messages/direct/${activeChat.id}`);
        socket?.emit('chat:direct-vanish', { friendId: activeChat.id });
      } else {
        await api.delete(`/messages/vanish?roomId=${activeChat.id}`);
        socket?.emit('chat:vanish', { roomId: activeChat.id });
      }
      setMessages([]);
      setShowOptionsDropdown(false);
      toast.success('Chat cleared! 💨');
    } catch {
      toast.error('Failed to clear chat');
    }
  };

  // Direct Call Actions
  const handleStartCall = async (mediaType: 'audio' | 'video') => {
    if (!activeChat || activeChat.type !== 'direct' || !activeChat.friend) {
      toast('Direct calls can be started in 1-on-1 chats', { icon: '📞' });
      return;
    }
    if (!socket) {
      toast.error('Socket not connected. Please refresh.');
      return;
    }
    try {
      await startCall(
        socket,
        mediaType,
        {
          _id: activeChat.friend._id,
          displayName: activeChat.friend.displayName,
          avatar: activeChat.friend.avatar,
        },
        user ? { displayName: user.displayName, avatar: user.avatar } : null
      );
    } catch {
      toast.error(`Could not start ${mediaType} call`);
    }
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Tab filter
      if (filterTab === 'direct' && c.type !== 'direct') return false;
      if (filterTab === 'room' && c.type !== 'room') return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const title = c.type === 'direct' ? c.user?.displayName || '' : c.name || '';
        const preview = c.lastMessage?.content || '';
        return title.toLowerCase().includes(query) || preview.toLowerCase().includes(query);
      }
      return true;
    });
  }, [conversations, filterTab, searchQuery]);

  // Is active contact online?
  const isTargetOnline = useMemo(() => {
    if (!activeChat || activeChat.type !== 'direct') return false;
    return onlineStatusMap[activeChat.id]?.online || false;
  }, [activeChat, onlineStatusMap]);

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] md:h-[calc(100vh-6rem)] max-w-7xl mx-auto rounded-none sm:rounded-3xl overflow-hidden glass-panel border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.85)] bg-[#0b0e14]">
      
      {/* ======================================================== */}
      {/* LEFT PANE: CONVERSATIONS LIST                            */}
      {/* ======================================================== */}
      <div
        className={`w-full md:w-[360px] lg:w-[400px] shrink-0 border-r border-white/[0.08] flex flex-col bg-[#111722]/95 backdrop-blur-xl ${
          mobileChatOpen ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Messages</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/25 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Direct connections & shared spaces</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3.5 pt-3 pb-2">
          <div className="relative flex items-center">
            <Search size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts or chats..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-3.5 pb-2.5 flex items-center gap-1.5 border-b border-white/[0.06]">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white bg-white/[0.03]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterTab('direct')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'direct'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white bg-white/[0.03]'
            }`}
          >
            <span>Direct</span>
          </button>
          <button
            onClick={() => setFilterTab('room')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'room'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white bg-white/[0.03]'
            }`}
          >
            <Layers size={12} className={filterTab === 'room' ? 'text-purple-400' : 'text-slate-400'} />
            <span>Spaces</span>
          </button>
        </div>

        {/* Conversations Scroll Area */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {loadingConversations ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-2">
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading chats...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2">
              <p>No conversations found.</p>
              <p className="text-[11px] text-slate-600">Connect with friends to start a 1-on-1 direct chat!</p>
            </div>
          ) : (
            filteredConversations.map((item) => {
              const isDirect = item.type === 'direct';
              const isSelected = activeChat?.id === item.id;
              const online = isDirect && onlineStatusMap[item.id]?.online;

              const title = isDirect ? item.user?.displayName || 'Friend' : item.name || (item.inviteCode ? `Space • ${item.inviteCode}` : 'Shared Space');
              const avatar = isDirect ? item.user?.avatar : undefined;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isDirect && item.user) {
                      selectDirectChat(item.user as any, true);
                    } else {
                      selectRoomChat(item, true);
                    }
                  }}
                  className={`p-3.5 flex items-center gap-3 transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-emerald-500/10 border-l-4 border-l-emerald-400'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {isDirect ? (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500/30 to-pink-500/20 border border-pink-500/30 flex items-center justify-center font-bold text-base text-pink-200 overflow-hidden shadow-inner">
                        {avatar ? (
                          <img src={avatar} alt={title} className="w-full h-full object-cover" />
                        ) : (
                          title.charAt(0).toUpperCase()
                        )}
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/30 via-indigo-600/25 to-pink-500/20 border border-purple-500/35 flex items-center justify-center text-purple-300 shadow-inner">
                        <Layers size={20} className="text-purple-300" />
                      </div>
                    )}

                    {/* Online status indicator */}
                    {isDirect && (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#111722] ${
                          online ? 'bg-emerald-400' : 'bg-slate-500'
                        }`}
                      />
                    )}
                  </div>

                  {/* Info & Snippet */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{title}</span>
                        {!isDirect && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 font-bold shrink-0">
                            Space
                          </span>
                        )}
                      </h4>
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                        {formatConversationDate(item.updatedAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <p className="truncate text-xs flex items-center gap-1">
                        {item.lastMessage?.senderId === user?._id && (
                          <CheckCheck
                            size={14}
                            className={item.lastMessage?.seen ? 'text-cyan-400 shrink-0' : 'text-slate-500 shrink-0'}
                          />
                        )}
                        <span className="truncate">
                          {item.lastMessage
                            ? item.lastMessage.type === 'audio'
                              ? '🎤 Voice note'
                              : item.lastMessage.type === 'image'
                              ? '📷 Photo'
                              : item.lastMessage.content
                            : isDirect
                            ? 'Start direct chat...'
                            : `${item.members?.length || 2} members in space`}
                        </span>
                      </p>

                      {/* Unread badge */}
                      {Boolean(item.unreadCount && item.unreadCount > 0) && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-black shrink-0 ml-1.5 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                          {item.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT PANE: ACTIVE CHAT WINDOW                           */}
      {/* ======================================================== */}
      <div
        className={`flex-1 flex flex-col bg-[#0d111a] relative ${
          !mobileChatOpen ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-3 sm:px-5 border-b border-white/[0.08] flex items-center justify-between bg-[#111722]/90 backdrop-blur-md z-20">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {/* Back button on mobile */}
                <button
                  onClick={() => setMobileChatOpen(false)}
                  className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-slate-200 text-xs font-semibold shrink-0 cursor-pointer active:scale-95"
                >
                  <ArrowLeft size={16} />
                  <span>Chats</span>
                </button>

                {/* Avatar */}
                <div className="relative shrink-0">
                  {activeChat.type === 'direct' ? (
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500/30 to-pink-500/20 border border-pink-500/30 flex items-center justify-center font-bold text-pink-200 overflow-hidden shadow-inner">
                      {activeChat.avatar ? (
                        <img src={activeChat.avatar} alt={activeChat.title} className="w-full h-full object-cover" />
                      ) : (
                        activeChat.title.charAt(0).toUpperCase()
                      )}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600/30 via-indigo-600/25 to-pink-500/20 border border-purple-500/35 flex items-center justify-center text-purple-300 shadow-inner">
                      <Layers size={18} className="text-purple-300" />
                    </div>
                  )}

                  {activeChat.type === 'direct' && (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111722] ${
                        isTargetOnline ? 'bg-emerald-400' : 'bg-slate-500'
                      }`}
                    />
                  )}
                </div>

                {/* Title & Status */}
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold text-white truncate flex items-center gap-2">
                    <span className="truncate">{activeChat.title}</span>
                    {activeChat.type === 'direct' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 hidden sm:inline shrink-0">
                        Direct
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 hidden sm:inline shrink-0">
                        Space
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] truncate">
                    {partnerTyping ? (
                      <span className="text-emerald-400 font-semibold animate-pulse">typing...</span>
                    ) : activeChat.type === 'direct' ? (
                      isTargetOnline ? (
                        <span className="text-emerald-400 font-medium">online</span>
                      ) : (
                        <span className="text-slate-400 font-medium">offline</span>
                      )
                    ) : (
                      <span className="text-slate-400">{activeChat.subtitle || 'Shared Space'}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons: 1-Tap Voice Call, Video Call, Heartbeat, Options */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {activeChat.type === 'direct' && (
                  <>
                    <button
                      onClick={() => handleStartCall('audio')}
                      title="Voice Call"
                      className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 border border-white/10 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <Phone size={16} />
                    </button>
                    <button
                      onClick={() => handleStartCall('video')}
                      title="Video Call"
                      className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 border border-white/10 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <Video size={16} />
                    </button>
                  </>
                )}

                <button
                  onClick={sendHeartbeat}
                  title="Send Heartbeat Pulse"
                  className="w-9 h-9 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 text-pink-400 border border-pink-500/30 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Heart size={16} className="fill-pink-400/20" />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                    className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 border border-white/10 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <MoreVertical size={16} />
                  </button>

                  <AnimatePresence>
                    {showOptionsDropdown && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-2 w-48 p-2 rounded-2xl glass-panel border border-white/10 shadow-2xl bg-[#111722] space-y-1 z-50"
                      >
                        <button
                          onClick={handleClearChat}
                          className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                          <span>Clear Chat History</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Chat Messages Feed */}
            <div
              ref={feedRef}
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 relative z-10"
              style={{
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 select-none">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-xl">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">No messages yet</h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Say hello to {activeChat.title}! End-to-end real-time direct messaging is active.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const sender = typeof msg.senderId === 'object' ? (msg.senderId as any)._id : msg.senderId;
                  const senderName = typeof msg.senderId === 'object' ? (msg.senderId as any).displayName : 'Partner';
                  const isMe = sender === user?._id;

                  return (
                    <motion.div
                      key={msg._id}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      {/* Sender label in room group chat */}
                      {!isMe && activeChat.type === 'room' && (
                        <span className="text-[10px] font-bold text-emerald-400 mb-0.5 ml-2">
                          {senderName}
                        </span>
                      )}

                      {/* WhatsApp Bubble */}
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 relative shadow-md ${
                          isMe
                            ? 'bg-[#005c4b]/90 text-white rounded-tr-xs border border-emerald-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                            : 'bg-[#202c33]/95 text-slate-100 rounded-tl-xs border border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                        }`}
                      >
                        {/* Photo message */}
                        {msg.type === 'image' && msg.imageUrl && (
                          <div className="rounded-xl overflow-hidden mb-1.5 max-h-72">
                            <img src={msg.imageUrl} alt="Shared photo" className="w-full h-full object-cover" />
                          </div>
                        )}

                        {/* Voice note message */}
                        {msg.type === 'audio' && msg.audioUrl && (
                          <div className="flex items-center gap-3 py-1 min-w-[200px]">
                            <button
                              onClick={() => togglePlayAudio(msg._id, msg.audioUrl!)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-md ${
                                isMe ? 'bg-emerald-400 text-black' : 'bg-emerald-500 text-black'
                              }`}
                            >
                              {playingAudioId === msg._id ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                            </button>
                            <div className="flex-1">
                              <div className="h-1.5 rounded-full bg-white/20 overflow-hidden relative">
                                <div
                                  className={`h-full ${isMe ? 'bg-white' : 'bg-emerald-400'} ${
                                    playingAudioId === msg._id ? 'animate-pulse w-full' : 'w-1/3'
                                  }`}
                                />
                              </div>
                              <span className="text-[10px] text-white/70 font-mono mt-1 block">
                                Voice note {msg.audioDuration ? `(${msg.audioDuration}s)` : ''}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Text message */}
                        {msg.type !== 'audio' && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                        )}

                        {/* Footer: Time & WhatsApp Blue Ticks */}
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-white/60">
                          <span>{formatTime(msg.createdAt)}</span>
                          {isMe && (
                            <CheckCheck
                              size={14}
                              className={msg.seen ? 'text-[#53bdeb]' : 'text-white/60'}
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}

              {/* Typing bubble */}
              {partnerTyping && (
                <div className="flex items-center gap-2 p-2 px-3.5 rounded-2xl bg-[#202c33]/90 text-emerald-400 text-xs w-fit">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[11px] font-semibold">{activeChat.title} is typing...</span>
                </div>
              )}
            </div>

            {/* Quick Emoji Reaction Pill Strip */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="px-4 py-2 bg-[#111722]/95 border-t border-white/[0.08] flex items-center gap-2 overflow-x-auto z-20"
                >
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleSelectEmoji(emoji)}
                      className="text-xl hover:scale-125 transition-transform p-1 cursor-pointer shrink-0"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* WhatsApp Input Bar */}
            <div className="p-3 sm:p-4 bg-[#111722]/95 border-t border-white/[0.08] relative z-20">
              {isRecording ? (
                /* Recording Mode */
                <div className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-2.5 px-4 animate-pulse">
                  <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span>Recording voice note: {recordingDuration}s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={cancelRecording}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={stopRecording}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-black text-black transition-all cursor-pointer shadow-md"
                    >
                      Send Audio
                    </button>
                  </div>
                </div>
              ) : (
                /* Regular Message Input */
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  {/* Emoji Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-10 h-10 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    <Smile size={18} />
                  </button>

                  {/* Photo Upload Trigger */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    <ImageIcon size={18} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />

                  {/* Text Input Pill */}
                  <input
                    type="text"
                    value={input}
                    onChange={handleTyping}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeChat.title}...`}
                    className="flex-1 py-2.5 px-4 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />

                  {/* Mic / Send Button */}
                  {input.trim() ? (
                    <button
                      type="submit"
                      className="w-10 h-10 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95"
                    >
                      <Send size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-10 h-10 rounded-2xl bg-white/[0.06] hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95"
                    >
                      <Mic size={18} />
                    </button>
                  )}
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-purple-500/15 via-emerald-500/10 to-teal-500/15 border border-white/10 flex items-center justify-center text-emerald-400 shadow-2xl">
              <MessageSquare size={32} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white">Your Messages</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                Select a connection to start a direct 1-on-1 chat, or choose a shared space to talk together.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-5rem)] max-w-7xl mx-auto rounded-3xl glass-panel border border-white/[0.08] items-center justify-center text-slate-400 bg-[#0b0e14]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-400">Loading messages...</span>
          </div>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
