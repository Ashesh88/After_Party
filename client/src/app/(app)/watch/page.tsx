'use client';
import { useState, useRef, useEffect } from 'react';
import YouTube from 'react-youtube';
import { useSocketStore } from '../../../lib/store/socketStore';
import { useAuthStore } from '../../../lib/store/authStore';
import { useCallStore } from '../../../lib/store/callStore';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Heart, Sparkles, MessageSquareHeart, Phone, PhoneOff, MonitorUp, 
  Film, Popcorn, Flame, Laugh, Send, X, Link as LinkIcon 
} from 'lucide-react';

const CURATED_MOVIES = [
  { title: 'La La Land (Trailer)', id: '0pdqf4P9MB8', category: 'Romantic Musical', duration: 'Trailer' },
  { title: 'Ed Sheeran - Perfect', id: '2Vv-BfVoq4g', category: 'Romantic Ballad', duration: 'Official Video' },
  { title: 'Rainy Cafe & Jazz', id: 'c0_ejQQcrwI', category: 'Cozy Atmosphere', duration: 'Chill Session' },
  { title: 'About Time (Movie Trailer)', id: 'T7A810duHvw', category: 'Love Story', duration: 'Trailer' },
  { title: 'Bruno Mars - Just The Way You Are', id: 'LjhCEhWiKXk', category: 'Couples Hit', duration: 'Music Video' },
  { title: 'Cozy Lo-Fi Beats', id: 'jfKfPfyJRdk', category: 'Relax & Chat', duration: 'Lo-Fi Chill' },
];

export default function WatchPage() {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ senderName: string; text: string; isMe: boolean }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showQuickPicks, setShowQuickPicks] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  const socket = useSocketStore(state => state.socket);
  const user = useAuthStore(state => state.user);
  const [partner, setPartner] = useState<{ displayName: string; avatar?: string } | null>(null);
  const { callStatus, startCall: startGlobalCall, endCall: endGlobalCall } = useCallStore();

  useEffect(() => {
    import('../../../lib/api').then(({ default: api }) => {
      api.get('/rooms/mine').then(res => {
        const members = res.data.room?.members || [];
        const otherMember = members.find((m: any) => m._id !== user?._id);
        if (otherMember) {
          setPartner({ displayName: otherMember.displayName, avatar: otherMember.avatar });
        }
      }).catch(() => {});
    });
  }, [user]);

  const extractVideoId = (input: string) => {
    if (!input) return null;
    const trimmed = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?/\s]+)/);
    return match ? match[1] : null;
  };

  const handleLoadUrl = (customId?: string, customTitle?: string) => {
    const id = customId || extractVideoId(url);
    if (id) {
      setVideoId(id);
      setUrl(`https://www.youtube.com/watch?v=${id}`);
      socket?.emit('watch:load', { videoId: id });
      if (customTitle) {
        toast.success(`Playing ${customTitle} 🍿`);
      } else {
        toast.success('Video loaded! 🍿');
      }
    } else {
      toast.error('Please enter a valid YouTube link or ID');
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('watch:load', (data: { videoId: string }) => {
      setVideoId(data.videoId);
    });

    socket.on('watch:reaction', (data: { emoji: string }) => {
      showReaction(data.emoji);
    });

    socket.on('chat:message', (data: any) => {
      setChatMessages(prev => [
        ...prev,
        {
          senderName: data.senderId?.displayName || 'Partner',
          text: data.content,
          isMe: data.senderId?._id === user?._id || data.senderId === user?._id,
        }
      ]);
      setTimeout(() => {
        chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });

    return () => {
      socket.off('watch:load');
      socket.off('watch:reaction');
      socket.off('chat:message');
    };
  }, [socket, user]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('chat:message', { content: chatInput, type: 'text' });
    setChatInput('');
  };

  const showReaction = (emoji: string) => {
    const newReaction = { id: Date.now(), emoji, x: Math.random() * 80 + 10 };
    setReactions(prev => [...prev, newReaction]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 2000);
  };

  const sendReaction = (emoji: string) => {
    showReaction(emoji);
    socket?.emit('watch:reaction', { emoji });
  };

  return (
    <div className="relative min-h-screen bg-[#07070f] text-slate-100 flex flex-col overflow-y-auto pb-44 sm:pb-36">
      {/* Ambient Romantic Orbs */}
      <div className="ambient-glow-pink -top-28 -left-20 pointer-events-none" />
      <div className="ambient-glow-purple -bottom-28 -right-20 pointer-events-none" />

      {/* Floating Reaction Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <AnimatePresence>
          {reactions.map(r => (
            <motion.div
              key={r.id}
              initial={{ y: '100%', opacity: 1, x: `${r.x}%` }}
              animate={{ y: '-30%', opacity: 0, scale: 2.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: "easeOut" }}
              className="absolute bottom-24 text-4xl"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Navbar Header */}
      <header className="relative z-20 px-3 pt-3 pb-2 sm:p-5 max-w-5xl mx-auto w-full shrink-0">
        <div className="p-2.5 sm:p-3.5 rounded-3xl glass-panel flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shadow-2xl">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
                <Film size={18} />
              </div>
              <div className="shrink-0">
                <h2 className="text-xs sm:text-sm font-black text-white whitespace-nowrap leading-tight">Theater Lounge</h2>
                <span className="text-[9px] sm:text-[10px] text-pink-400 font-semibold uppercase tracking-wider whitespace-nowrap block">Synced & Private</span>
              </div>
            </div>

            <button
              onClick={() => setShowQuickPicks(!showQuickPicks)}
              className="sm:hidden px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-slate-300 cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Popcorn size={14} className="text-amber-400" />
              <span>Picks</span>
            </button>
          </div>

          <div className="flex flex-1 gap-2 items-center min-w-0">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                placeholder="Paste YouTube Link or tap below..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-3 py-2 sm:py-2.5 rounded-2xl glass-input text-xs text-white placeholder:text-slate-500 outline-none font-medium truncate"
              />
              <span className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                <LinkIcon size={14} />
              </span>
            </div>
            
            <button
              onClick={() => handleLoadUrl()}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl btn-sexy text-xs font-bold text-white shadow-lg cursor-pointer shrink-0 active:scale-95"
            >
              Play
            </button>

            <button
              onClick={() => setShowQuickPicks(!showQuickPicks)}
              className="hidden sm:flex px-3.5 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-slate-300 cursor-pointer items-center gap-1.5 shrink-0"
            >
              <Popcorn size={14} className="text-amber-400" />
              <span>Picks</span>
            </button>
          </div>
        </div>

        {/* Quick Picks Dropdown */}
        <AnimatePresence>
          {showQuickPicks && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 p-3 rounded-2xl glass-panel grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 z-40 border border-pink-500/20"
            >
              {CURATED_MOVIES.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    handleLoadUrl(item.id, item.title);
                    setShowQuickPicks(false);
                  }}
                  className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] hover:bg-pink-500/15 border border-white/5 hover:border-pink-500/30 text-left transition-all group cursor-pointer active:scale-95"
                >
                  <p className="text-[11px] sm:text-xs font-bold text-white group-hover:text-pink-300 truncate">{item.title}</p>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">{item.category}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Video Stage */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 py-2 sm:py-6 flex flex-col items-center justify-center relative z-10">
        {videoId ? (
          <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full aspect-video rounded-2xl sm:rounded-[32px] overflow-hidden glass-panel border border-pink-500/20 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(244,63,142,0.15)] relative">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&modestbranding=1&rel=0`}
                title="Couple Theater"
                className="w-full h-full border-0 rounded-2xl sm:rounded-[32px]"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            {/* Quick Switch / Close Bar */}
            <div className="flex items-center gap-2 sm:gap-3 py-1 flex-wrap justify-center">
              <button
                onClick={() => {
                  setVideoId(null);
                  setUrl('');
                }}
                className="px-3.5 sm:px-4 py-1.5 rounded-full bg-white/[0.06] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-xs font-semibold text-slate-300 hover:text-rose-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
              >
                <X size={14} />
                <span>Switch / Close Video</span>
              </button>

              <button
                onClick={() => setShowQuickPicks(true)}
                className="px-3.5 sm:px-4 py-1.5 rounded-full bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-xs font-semibold text-pink-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
              >
                <Popcorn size={14} className="text-amber-400" />
                <span>Pick Another Video</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-2xl rounded-3xl sm:rounded-[32px] glass-panel border border-white/[0.08] flex flex-col items-center justify-center p-5 sm:p-8 text-center shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/5 via-transparent to-purple-500/5 pointer-events-none" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-3 sm:mb-4 shadow-[0_0_30px_rgba(244,63,142,0.3)] animate-float shrink-0">
              <Film size={32} strokeWidth={1.8} />
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white mb-1.5 sm:mb-2">Private Couple Cinema</h3>
            <p className="text-xs text-slate-400 max-w-md mb-4 sm:mb-6 font-medium leading-relaxed px-2">
              Paste any YouTube video link above, or tap a romantic pick below to stream and sync together in real-time.
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-2.5 justify-center max-w-lg relative z-20">
              {CURATED_MOVIES.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleLoadUrl(m.id, m.title)}
                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-white/[0.06] hover:bg-pink-500/25 active:bg-pink-500/35 border border-white/10 hover:border-pink-500/50 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 relative z-20 shadow-md active:scale-95 touch-manipulation"
                >
                  <Sparkles size={13} className="text-pink-400 shrink-0" />
                  <span>{m.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Reaction & Call Controller Bar */}
      <div className="fixed bottom-[74px] sm:bottom-20 left-3 right-3 sm:left-4 sm:right-4 max-w-xl mx-auto z-30 pointer-events-none">
        <div className="pointer-events-auto p-2 sm:p-2.5 rounded-full bg-[#0d0d1c]/90 backdrop-blur-2xl border border-white/[0.1] shadow-[0_15px_35px_rgba(0,0,0,0.7)] flex justify-between items-center gap-2">
          {/* Reaction Bursts */}
          <div className="flex gap-1 sm:gap-1.5 pl-1">
            {[
              { id: 'heart', icon: Heart, color: 'text-pink-400 hover:text-pink-300' },
              { id: 'fire', icon: Flame, color: 'text-amber-400 hover:text-amber-300' },
              { id: 'laugh', icon: Laugh, color: 'text-emerald-400 hover:text-emerald-300' },
              { id: 'sparkles', icon: Sparkles, color: 'text-purple-400 hover:text-purple-300' },
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => sendReaction(item.id === 'heart' ? '❤️' : item.id === 'fire' ? '🔥' : item.id === 'laugh' ? '😂' : '✨')}
                  className={`w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.08] hover:scale-125 active:scale-95 flex items-center justify-center transition-all cursor-pointer ${item.color}`}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </button>
              );
            })}
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 pr-1">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`px-3.5 py-2 rounded-full flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                chatOpen 
                  ? 'bg-pink-500 text-white shadow-[0_0_15px_rgba(244,63,142,0.5)]' 
                  : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-200'
              }`}
            >
              <MessageSquareHeart size={15} />
              <span>Whisper</span>
              {chatMessages.length > 0 && !chatOpen && (
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
              )}
            </button>

            {callStatus === 'idle' ? (
              <button 
                onClick={() => {
                  if (socket) {
                    startGlobalCall(socket, 'video', partner, user);
                  } else {
                    toast.error('Connection not ready');
                  }
                }} 
                className="px-3.5 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                <Phone size={14} />
                <span>Call</span>
              </button>
            ) : (
              <button 
                onClick={() => endGlobalCall(socket)} 
                className="px-3.5 py-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                <PhoneOff size={14} />
                <span>End Call</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Chat Slide-Over */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            className="fixed top-24 right-4 bottom-32 w-80 sm:w-96 rounded-3xl glass-panel z-40 flex flex-col overflow-hidden shadow-2xl border border-pink-500/30"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0d0d1a]/80">
              <div className="flex items-center gap-2">
                <span className="text-pink-400">💕</span>
                <h3 className="font-bold text-sm text-white">Movie Whispers</h3>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-400 p-4">
                  <span className="text-3xl mb-2">🍿</span>
                  Send love notes and whispers while watching!
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-slate-400 px-1 mb-0.5">
                      {msg.isMe ? 'You' : msg.senderName}
                    </span>
                    <div
                      className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs font-medium ${
                        msg.isMe 
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-tr-sm shadow-md shadow-pink-500/20' 
                          : 'bg-white/10 text-slate-100 rounded-tl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatScrollRef} />
            </div>

            <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 bg-[#0d0d1a]/80 flex gap-2">
              <input
                type="text"
                placeholder="Whisper something..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-3.5 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-pink-500 font-medium"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="w-8 h-8 rounded-full btn-sexy disabled:opacity-40 text-white flex items-center justify-center text-xs shadow-md cursor-pointer"
              >
                ➤
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
