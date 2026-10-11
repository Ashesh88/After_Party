'use client';
import { useState, useEffect, useRef } from 'react';
import { useSocketStore } from '../../../lib/store/socketStore';
import { useAuthStore } from '../../../lib/store/authStore';
import api from '../../../lib/api';
import { Message } from '../../../lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useCallStore } from '../../../lib/store/callStore';
import { soundService } from '../../../lib/soundService';
import { 
  Send, CheckCheck, MessageCircleHeart, 
  Flame, Lock, Phone, Video, Mic, Square, Play, Pause, Heart 
} from 'lucide-react';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partner, setPartner] = useState<{ _id?: string; displayName: string; avatar?: string } | null>(null);
  const [vanishMode, setVanishMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const socket = useSocketStore(state => state.socket);
  const user = useAuthStore(state => state.user);
  const startCall = useCallStore(state => state.startCall);
  const feedRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch partner info
  useEffect(() => {
    api.get('/rooms/mine').then(res => {
      const members = res.data.room?.members || [];
      const otherMember = members.find((m: any) => m._id !== user?._id);
      if (otherMember) {
        setPartner({ _id: otherMember._id, displayName: otherMember.displayName, avatar: otherMember.avatar });
      }
    }).catch(() => {});
  }, [user]);

  // Load message history
  useEffect(() => {
    api.get('/messages').then(res => {
      if (res.data.messages) {
        setMessages(res.data.messages.reverse());
        scrollToBottom(false);
      }
    }).catch(console.error);
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('chat:message', (msg: Message) => {
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom(true);

      const sender = typeof msg.senderId === 'object' ? (msg.senderId as any)._id : msg.senderId;
      if (sender !== user?._id) {
        socket.emit('chat:seen', { messageId: msg._id });
        soundService.playMessageTone();
      }
    });

    socket.on('chat:typing', (data: { isTyping: boolean; userId?: string; senderId?: string }) => {
      const typingUser = data.userId || data.senderId;
      if (typingUser !== user?._id) {
        setPartnerTyping(data.isTyping);
      }
    });

    socket.on('chat:seen', (data: { messageId: string }) => {
      setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, seen: true } : m));
    });

    socket.on('chat:vanish', () => {
      setMessages([]);
      toast('Chat vanished into thin air 💨', { icon: '👻' });
    });

    return () => {
      socket.off('chat:message');
      socket.off('chat:typing');
      socket.off('chat:seen');
      socket.off('chat:vanish');
    };
  }, [socket, user]);

  // Scroll ONLY the inner feed container, preventing window scrolling jumps
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

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = input.trim();
    if (!content || !socket) return;

    socket.emit('chat:message', {
      content,
      type: 'text',
    });

    socket.emit('chat:typing', { isTyping: false });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (socket) {
      socket.emit('chat:typing', { isTyping: e.target.value.length > 0 });
    }
  };

  // Start recording voice note
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (socket) {
            socket.emit('chat:message', {
              content: 'Voice note',
              type: 'audio',
              audioUrl: base64Audio,
              audioDuration: recordingDuration,
            });
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch {
      toast.error('Microphone permission required for voice notes');
    }
  };

  // Stop recording and send
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  // Cancel recording without sending
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      audioChunksRef.current = [];
      toast('Voice note discarded');
    }
  };

  // Play audio voice note
  const togglePlayAudio = (msgId: string, url: string) => {
    if (playingAudioId === msgId) {
      currentAudioRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }

    const audio = new Audio(url);
    currentAudioRef.current = audio;
    setPlayingAudioId(msgId);

    audio.onended = () => {
      setPlayingAudioId(null);
    };
    audio.play().catch(() => setPlayingAudioId(null));
  };

  // Send Heartbeat pulse to partner
  const sendHeartbeat = () => {
    if (!socket) return;
    socket.emit('touch:heartbeat', { senderName: user?.displayName || 'Your partner' });
    soundService.playHeartbeatTone();
    toast.success('Heartbeat sent to partner! 💕');
  };

  const handleVanishChat = async () => {
    if (messages.length === 0) {
      toast('Chat is already empty');
      return;
    }
    if (!confirm('Vanish all messages between you and your partner? This will permanently delete the chat history.')) return;

    try {
      await api.delete('/messages/vanish');
      socket?.emit('chat:vanish');
      setMessages([]);
      toast.success('Chat vanished into thin air! 💨✨');
    } catch (err: any) {
      toast.error('Failed to vanish chat');
    }
  };

  return (
    <div className="px-2 sm:px-4 pt-1 sm:pt-2">
      {/* Ambient background glows */}
      <div className="ambient-glow-pink -top-24 -left-20 pointer-events-none" />
      <div className="ambient-glow-purple -bottom-24 -right-20 pointer-events-none" />

      {/* Main Centered Couple Chat Window */}
      <div className="relative max-w-2xl mx-auto w-full h-[calc(100dvh-7.5rem)] flex flex-col rounded-3xl glass-panel border border-white/[0.08] shadow-2xl overflow-hidden z-20">
        
        {/* Chat Window Header */}
        <header className="shrink-0 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/[0.08] bg-[#0c0c18]/90 backdrop-blur-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-[2px] shadow-lg shadow-pink-500/20 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#0d0d18] flex items-center justify-center overflow-hidden">
                {partner?.avatar ? (
                  <img src={partner.avatar} alt="Partner" className="w-full h-full object-cover" />
                ) : (
                  <MessageCircleHeart size={18} className="text-pink-400" />
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#07070f]" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-black text-white leading-tight truncate">
                {partner?.displayName || 'Your Partner'}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-pink-400 font-semibold truncate">
                  {partnerTyping ? 'Typing a whisper...' : (vanishMode ? 'Ghost mode active 👻' : 'Private Couple Space 💕')}
                </span>
              </div>
            </div>
          </div>

          {/* WhatsApp Call Buttons & Vanish Mode Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Audio Call */}
            <button
              onClick={() => startCall(socket, 'audio', partner, user)}
              title="Start WhatsApp Voice Call"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.04] hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Phone size={15} />
            </button>

            {/* Video Call */}
            <button
              onClick={() => startCall(socket, 'video', partner, user)}
              title="Start WhatsApp Video Call"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.04] hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 text-purple-400 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Video size={15} />
            </button>

            {/* Vanish Mode Toggle */}
            <button
              onClick={() => {
                const next = !vanishMode;
                setVanishMode(next);
              }}
              title="Toggle Vanish Mode"
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border active:scale-95 ${
                vanishMode
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.4)] animate-pulse'
                  : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              <span>{vanishMode ? '👻 Vanish' : '💬 Keep'}</span>
            </button>

            {/* Burn/Vanish Chat Button */}
            <button
              onClick={handleVanishChat}
              title="Vanish all chat messages"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-all cursor-pointer group active:scale-95"
            >
              <Flame size={15} className="group-hover:scale-110 text-amber-400 group-hover:text-rose-300 transition-transform" />
            </button>
          </div>
        </header>

        {/* Messages Feed (Scrolls internally) */}
        <div 
          ref={feedRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 relative z-10 w-full"
        >
          {/* Vanish Banner */}
          <AnimatePresence>
            {vanishMode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-300 flex items-center justify-between gap-2 shadow-lg mb-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">👻</span>
                  <span className="font-semibold text-[11px]">
                    Vanish Mode: Messages are ephemeral. Tap 🔥 to wipe everything.
                  </span>
                </div>
                <button
                  onClick={handleVanishChat}
                  className="px-2.5 py-1 rounded-xl bg-purple-500/30 hover:bg-purple-500/50 border border-purple-500/40 text-[10px] font-bold text-white shrink-0 cursor-pointer active:scale-95"
                >
                  Vanish Now
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {messages.length === 0 ? (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-3xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-3 shadow-[0_0_20px_rgba(244,63,142,0.2)] animate-float">
                {vanishMode ? <Flame size={32} className="text-purple-400" /> : <MessageCircleHeart size={32} />}
              </div>
              <h3 className="font-extrabold text-white text-base">
                {vanishMode ? 'Ghost Room Empty' : 'Your Private Couple Chat'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                {vanishMode 
                  ? 'Send secret whispers here. You can burn and clear all messages anytime with the flame button.' 
                  : 'Leave sweet notes and whispers. Everything stays safe and encrypted between both of you.'}
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const senderId = typeof msg.senderId === 'object' ? (msg.senderId as any)._id : msg.senderId;
              const isMe = senderId === user?._id;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg._id || i}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[78%] px-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-medium shadow-md leading-relaxed break-words ${
                      isMe
                        ? (vanishMode 
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-tr-sm shadow-purple-500/20 border border-purple-400/30' 
                            : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-tr-sm shadow-pink-500/20')
                        : 'glass-panel text-slate-100 rounded-tl-sm border-white/10'
                    }`}
                  >
                    {msg.type === 'audio' && msg.audioUrl ? (
                      <div className="flex items-center gap-3 py-1">
                        <button
                          type="button"
                          onClick={() => togglePlayAudio(msg._id, msg.audioUrl!)}
                          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-transform active:scale-90"
                        >
                          {playingAudioId === msg._id ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                        </button>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold">Voice note</span>
                          <span className="text-[9px] opacity-75 font-mono">
                            {msg.audioDuration ? `${msg.audioDuration}s` : 'Audio snippet'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 px-1 font-mono">
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMe && (
                      <CheckCheck size={13} className={msg.seen ? 'text-pink-400' : 'text-slate-500'} />
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Input Bar Pinned Inside Chat Container */}
        <div className="shrink-0 p-3 bg-[#0a0a14]/90 backdrop-blur-xl border-t border-white/[0.08] z-30">
          {isRecording ? (
            <div className="p-2 sm:p-2.5 rounded-full glass-panel border-pink-500/30 bg-pink-500/10 shadow-2xl flex items-center justify-between gap-3 w-full animate-pulse">
              <div className="flex items-center gap-2.5 pl-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-bold text-white">Recording voice note...</span>
                <span className="text-xs text-pink-300 font-mono font-bold">{recordingDuration}s</span>
              </div>
              <div className="flex items-center gap-2 pr-1">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-8 h-8 rounded-full btn-sexy text-white flex items-center justify-center transition-all shadow-md active:scale-95"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSend} className="p-1 sm:p-1.5 rounded-full glass-panel border-white/[0.12] shadow-2xl flex items-center gap-1.5 sm:gap-2 w-full">
              {/* Instant Heartbeat Touch Button */}
              <button
                type="button"
                onClick={sendHeartbeat}
                title="Send Instant Heartbeat to Partner"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 flex items-center justify-center transition-transform active:scale-90 shrink-0 ml-1"
              >
                <Heart size={15} fill="currentColor" />
              </button>

              <input
                type="text"
                value={input}
                onChange={handleTyping}
                onKeyDown={handleKeyDown}
                placeholder={vanishMode ? "Ghost whisper... 👻 (Enter to send)" : "Write a whisper to your love... (Enter to send)"}
                className="flex-1 bg-transparent px-2 sm:px-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none font-medium min-w-0"
              />

              {/* Voice Note Record Button */}
              {!input.trim() ? (
                <button
                  type="button"
                  onClick={startRecording}
                  title="Record Voice Note"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-pink-400 flex items-center justify-center transition-all cursor-pointer border border-white/10 shrink-0 active:scale-95"
                >
                  <Mic size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full btn-sexy text-white flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-pink-500/30 shrink-0 active:scale-95"
                >
                  <Send size={15} />
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
