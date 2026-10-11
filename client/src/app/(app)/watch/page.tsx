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
  Film, Popcorn, Flame, Laugh, Send, X, Link as LinkIcon, Search, Loader2, Play,
  ExternalLink, RefreshCw, ShieldAlert
} from 'lucide-react';
import { soundService } from '../../../lib/soundService';
import api from '../../../lib/api';

const CURATED_MOVIES = [
  { title: 'La La Land (Trailer)', id: '0pdqf4P9MB8', category: 'Romantic Musical', duration: 'Trailer' },
  { title: 'Ed Sheeran - Perfect', id: '2Vv-BfVoq4g', category: 'Romantic Ballad', duration: 'Official Video' },
  { title: 'Rainy Cafe & Jazz', id: 'c0_ejQQcrwI', category: 'Cozy Atmosphere', duration: 'Chill Session' },
  { title: 'About Time (Movie Trailer)', id: 'T7A810duHvw', category: 'Love Story', duration: 'Trailer' },
  { title: 'Bruno Mars - Just The Way You Are', id: 'LjhCEhWiKXk', category: 'Couples Hit', duration: 'Music Video' },
  { title: 'Cozy Lo-Fi Beats', id: 'jfKfPfyJRdk', category: 'Relax & Chat', duration: 'Lo-Fi Chill' },
];

interface MediaState {
  type: 'youtube' | 'direct' | 'embed';
  src: string;
  title?: string;
}

export default function WatchPage() {
  const [url, setUrl] = useState('');
  const [mediaState, setMediaState] = useState<MediaState | null>(null);
  const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ senderName: string; text: string; isMe: boolean }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showQuickPicks, setShowQuickPicks] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [useProxy, setUseProxy] = useState(false);
  const [theaterLights, setTheaterLights] = useState(true);
  const [showCurtains, setShowCurtains] = useState(true);
  const [popcornTossed, setPopcornTossed] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  const socket = useSocketStore(state => state.socket);
  const user = useAuthStore(state => state.user);
  const [partner, setPartner] = useState<{ _id?: string; displayName: string; avatar?: string } | null>(null);
  const { callStatus, startCall: startGlobalCall, endCall: endGlobalCall } = useCallStore();
  const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

  useEffect(() => {
    import('../../../lib/api').then(({ default: api }) => {
      api.get('/rooms/mine').then(res => {
        const members = res.data.room?.members || [];
        const otherMember = members.find((m: any) => m._id !== user?._id);
        if (otherMember) {
          setPartner({ _id: otherMember._id, displayName: otherMember.displayName, avatar: otherMember.avatar });
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

  const detectMedia = (input: string): MediaState | null => {
    if (!input) return null;
    const trimmed = input.trim();

    // 1. YouTube check
    const ytId = extractVideoId(trimmed);
    if (ytId) {
      return { type: 'youtube', src: ytId, title: 'YouTube Video' };
    }

    // 2. Direct video file check (.mp4, .webm, .mkv, .ogv, .mov, etc.)
    if (/^https?:\/\/.*\.(mp4|webm|ogv|mov|m4v)(\?.*)?$/i.test(trimmed)) {
      const fileName = trimmed.split('/').pop()?.split('?')[0] || 'Video Stream';
      return { type: 'direct', src: trimmed, title: decodeURIComponent(fileName) };
    }

    // 3. Web Stream / Embed URL (FMHY, vidsrc, embed.su, any streaming site)
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const domain = new URL(trimmed).hostname.replace('www.', '');
        return { type: 'embed', src: trimmed, title: `${domain} Stream` };
      } catch {
        return { type: 'embed', src: trimmed, title: 'Web Stream' };
      }
    }

    return null;
  };

  const detectedMedia = detectMedia(url);
  const isDirectOrStreamLink = Boolean(detectedMedia);

  const handleLoadMedia = (target: MediaState, customTitle?: string) => {
    const finalState = { ...target, title: customTitle || target.title };
    setMediaState(finalState);
    setUseProxy(false);
    if (finalState.type === 'youtube') {
      setUrl(`https://www.youtube.com/watch?v=${finalState.src}`);
    } else {
      setUrl(finalState.src);
    }

    socket?.emit('watch:load', { 
      mediaType: finalState.type, 
      src: finalState.src, 
      title: finalState.title,
      videoId: finalState.type === 'youtube' ? finalState.src : undefined 
    });

    if (customTitle) {
      toast.success(`Playing ${customTitle} 🍿`);
    } else if (finalState.type === 'direct') {
      toast.success('Playing direct video stream 🎬');
    } else if (finalState.type === 'embed') {
      toast.success('Streaming link loaded! 🍿');
    } else {
      toast.success('Video loaded! 🍿');
    }
  };

  const handleSearchOrPlay = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    const detected = detectMedia(url);
    if (detected) {
      handleLoadMedia(detected);
      setShowSearchResults(false);
      return;
    }

    // Keyword Search
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const res = await api.get('/watch/search?q=' + encodeURIComponent(url.trim()));
      const videos = res.data.videos || [];
      setSearchResults(videos);
      if (videos.length === 0) {
        toast('No videos found for this search');
      }
    } catch {
      toast.error('Search failed. Please try a different query or paste link');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('watch:load', (data: any) => {
      setUseProxy(false);
      if (data?.mediaType && data?.src) {
        setMediaState({ type: data.mediaType, src: data.src, title: data.title });
        setUrl(data.src);
      } else if (data?.videoId) {
        setMediaState({ type: 'youtube', src: data.videoId, title: data.title });
        setUrl(`https://www.youtube.com/watch?v=${data.videoId}`);
      }
    });

    socket.on('watch:reaction', (data: { emoji: string }) => {
      showReaction(data.emoji);
    });

    socket.on('chat:message', (data: any) => {
      const isMe = data.senderId?._id === user?._id || data.senderId === user?._id;
      setChatMessages(prev => [
        ...prev,
        {
          senderName: data.senderId?.displayName || 'Partner',
          text: data.content,
          isMe,
        }
      ]);
      if (!isMe) {
        soundService.playMessageTone();
      }
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

          <form onSubmit={handleSearchOrPlay} className="flex flex-1 gap-2 items-center min-w-0">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                placeholder="Paste movie link (FMHY, MP4, Stream) or search YouTube..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-3 py-2 sm:py-2.5 rounded-2xl glass-input text-xs text-white placeholder:text-slate-500 outline-none font-medium truncate"
              />
              <span className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                {isDirectOrStreamLink ? <LinkIcon size={14} /> : <Search size={14} />}
              </span>
            </div>
            
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl btn-sexy text-xs font-bold text-white shadow-lg cursor-pointer shrink-0 active:scale-95 flex items-center gap-1.5"
            >
              {isSearching ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Searching</span>
                </>
              ) : isDirectOrStreamLink ? (
                <>
                  <Play size={12} className="fill-current" />
                  <span>Play</span>
                </>
              ) : (
                <>
                  <Search size={13} />
                  <span>Search</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowQuickPicks(!showQuickPicks);
                setShowSearchResults(false);
              }}
              className="hidden sm:flex px-3.5 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-slate-300 cursor-pointer items-center gap-1.5 shrink-0"
            >
              <Popcorn size={14} className="text-amber-400" />
              <span>Picks</span>
            </button>
          </form>
        </div>

        {/* YouTube Keyword Search Results Tray */}
        <AnimatePresence>
          {showSearchResults && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="mt-2.5 p-3.5 sm:p-4 rounded-3xl glass-panel border border-pink-500/30 bg-[#0d0d1b]/95 backdrop-blur-2xl shadow-2xl z-40 max-h-96 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-pink-400 font-bold text-xs">YouTube Results:</span>
                  <span className="text-white font-bold text-xs truncate max-w-[200px]">"{url}"</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSearchResults(false)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {isSearching ? (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="animate-spin text-pink-400" size={24} />
                  <span>Searching YouTube for "{url}"...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No videos found. Try a different keyword or paste a link directly.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {searchResults.map(video => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => {
                        handleLoadMedia({ type: 'youtube', src: video.id, title: video.title });
                        setShowSearchResults(false);
                      }}
                      className="flex flex-col text-left p-2 rounded-2xl bg-white/[0.04] hover:bg-pink-500/20 border border-white/5 hover:border-pink-500/40 transition-all group cursor-pointer active:scale-95"
                    >
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black mb-2">
                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        {video.duration && (
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/80 text-[10px] font-mono font-bold text-white">
                            {video.duration}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play size={24} className="text-white fill-white drop-shadow-md" />
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-pink-300 transition-colors">
                        {video.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 truncate mt-1">
                        {video.channel}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

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
                    handleLoadMedia({ type: 'youtube', src: item.id, title: item.title });
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

      {/* Main Video Stage - Luxury Cinema Theater Experience */}
      <main className={`flex-1 w-full mx-auto px-2 sm:px-4 py-2 sm:py-4 flex flex-col items-center justify-center relative z-10 transition-colors duration-700 ${theaterLights ? 'bg-black/95' : ''} ${mediaState ? 'max-w-6xl' : 'max-w-5xl'}`}>
        {mediaState ? (
          <div className="w-full flex flex-col items-center gap-3 relative">
            {/* Projector Light Beam from Above */}
            <div 
              className={`absolute -top-16 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 pointer-events-none transition-opacity duration-1000 ${theaterLights ? 'opacity-85' : 'opacity-20'}`}
              style={{
                background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.22) 0%, rgba(244, 63, 142, 0.12) 35%, transparent 75%)',
                filter: 'blur(25px)',
              }}
            />

            {/* Theater Stage Frame with Curtains */}
            <div className="w-full relative flex flex-col items-center shadow-[0_25px_60px_rgba(0,0,0,0.95)]">
              
              {/* Top Velvet Curtain Valance / Pelmet with Gold Trim */}
              {showCurtains && (
                <div className="w-full h-6 sm:h-9 z-20 flex items-center justify-between overflow-hidden shadow-2xl relative rounded-t-2xl sm:rounded-t-3xl border-b-2 border-amber-500/40 bg-gradient-to-r from-[#3f020c] via-[#750b20] to-[#3f020c]">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/25 via-transparent to-black/40 pointer-events-none" />
                  <div className="w-full flex justify-between items-center px-3 sm:px-4 text-[9px] sm:text-[11px] font-black tracking-widest text-amber-300 uppercase select-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    <span className="flex items-center gap-1">★ VIP CINEMA</span>
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-amber-200/90 font-mono text-[10px]">
                      DOLBY THEATER 4K • SYNCED LOUNGE
                    </span>
                    <span>HALL 1 ★</span>
                  </div>
                </div>
              )}

              {/* Middle Section: Big Screen + Left & Right Curtains */}
              <div className="w-full flex items-stretch relative">
                {/* Left Velvet Curtain Column */}
                {showCurtains && (
                  <div className="w-3.5 sm:w-10 md:w-14 shrink-0 bg-gradient-to-r from-[#200107] via-[#5c0819] to-[#36020c] rounded-l-2xl sm:rounded-l-3xl shadow-[5px_0_15px_rgba(0,0,0,0.8)] z-20 relative overflow-hidden flex flex-col justify-between py-4 border-r border-amber-500/20">
                    <div className="w-full h-full opacity-35 bg-[repeating-linear-gradient(90deg,_transparent,_transparent_8px,_rgba(0,0,0,0.5)_8px,_rgba(0,0,0,0.5)_16px)] pointer-events-none" />
                  </div>
                )}

                {/* The Big Silver Screen */}
                <div className="flex-1 aspect-video overflow-hidden relative bg-black shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_40px_rgba(244,63,142,0.18)] border-2 border-slate-800/90 rounded-none sm:rounded-sm">
                  {mediaState.type === 'youtube' && (
                    <iframe
                      src={`https://www.youtube.com/embed/${mediaState.src}?autoplay=1&enablejsapi=1&modestbranding=1&rel=0`}
                      title="Couple Theater - YouTube"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  )}

                  {mediaState.type === 'direct' && (
                    <video
                      src={mediaState.src}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain bg-black"
                    >
                      Your browser does not support HTML5 video streaming.
                    </video>
                  )}

                  {mediaState.type === 'embed' && (
                    <iframe
                      key={`${mediaState.src}-${useProxy}`}
                      src={
                        useProxy
                          ? `${apiOrigin}/api/watch/proxy?url=${encodeURIComponent(mediaState.src)}`
                          : mediaState.src
                      }
                      title="Couple Theater - Web Stream"
                      className="w-full h-full border-0 bg-black"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                      allowFullScreen
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>

                {/* Right Velvet Curtain Column */}
                {showCurtains && (
                  <div className="w-3.5 sm:w-10 md:w-14 shrink-0 bg-gradient-to-l from-[#200107] via-[#5c0819] to-[#36020c] rounded-r-2xl sm:rounded-r-3xl shadow-[-5px_0_15px_rgba(0,0,0,0.8)] z-20 relative overflow-hidden flex flex-col justify-between py-4 border-l border-amber-500/20">
                    <div className="w-full h-full opacity-35 bg-[repeating-linear-gradient(90deg,_transparent,_transparent_8px,_rgba(0,0,0,0.5)_8px,_rgba(0,0,0,0.5)_16px)] pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Polished Stage Reflection Floor & Aisle LED Runners */}
              <div className="w-full h-3.5 sm:h-5 bg-gradient-to-b from-[#161624] to-[#080812] border-t border-white/10 flex justify-between items-center px-4 shadow-inner">
                <div className="w-16 sm:w-28 h-1 rounded-full bg-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.9)] animate-pulse" />
                <div className="text-[8px] font-black tracking-widest text-slate-500 uppercase">STAGE FRONT</div>
                <div className="w-16 sm:w-28 h-1 rounded-full bg-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.9)] animate-pulse" />
              </div>
            </div>

            {/* VIP Couple Theater Recliner Lounge (You & Partner in Front Row) */}
            <div className="w-full max-w-xl p-3 sm:p-4 rounded-3xl bg-gradient-to-b from-[#1b0610]/90 to-[#0e0614]/95 border border-pink-500/30 shadow-[0_15px_45px_rgba(0,0,0,0.95)] backdrop-blur-xl relative z-20">
              {/* Flying popcorn animation */}
              <AnimatePresence>
                {popcornTossed && (
                  <motion.div
                    initial={{ scale: 0.5, y: 15, opacity: 0 }}
                    animate={{ scale: [1, 1.8, 1.4], y: [-10, -50, -15], opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute left-1/2 -top-12 -translate-x-1/2 text-3xl z-40 select-none pointer-events-none"
                  >
                    🍿🍿🍿
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between gap-2 sm:gap-4">
                
                {/* Seat 1: You */}
                <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 p-[2px] shadow-lg shadow-pink-500/25">
                      <div className="w-full h-full rounded-[14px] bg-[#0c0c17] overflow-hidden flex items-center justify-center">
                        {user?.avatar ? (
                          <img src={user.avatar} alt="You" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-pink-400">You</span>
                        )}
                      </div>
                    </div>
                    {/* Popcorn bucket icon badge */}
                    <span className="absolute -bottom-1 -right-1 text-xs sm:text-sm bg-black/80 rounded-full p-0.5 shadow border border-white/10">
                      🍿
                    </span>
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="text-[9px] uppercase tracking-wider text-pink-400 font-extrabold block">Recliner A1</span>
                    <p className="text-xs sm:text-sm font-bold text-white truncate">{user?.displayName || 'You'}</p>
                  </div>
                </div>

                {/* Center Console: Cinema Hall Controls & Popcorn Toss */}
                <div className="flex flex-col items-center gap-1.5 px-1 sm:px-2 shrink-0">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {/* Toggle Dim Lights */}
                    <button
                      type="button"
                      onClick={() => setTheaterLights(!theaterLights)}
                      title={theaterLights ? "Dim Lights (Cinema Mode ON)" : "Brighten Lights"}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer border ${
                        theaterLights
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                          : 'bg-white/10 border-white/20 text-slate-300'
                      }`}
                    >
                      <span>💡</span>
                      <span className="hidden sm:inline">{theaterLights ? 'Lights Dim' : 'Lights On'}</span>
                    </button>

                    {/* Share Popcorn button */}
                    <button
                      type="button"
                      onClick={() => {
                        setPopcornTossed(true);
                        sendReaction('🍿');
                        setTimeout(() => setPopcornTossed(false), 2200);
                      }}
                      title="Share Popcorn with partner"
                      className="px-2.5 py-1 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-[10px] font-bold text-pink-200 transition-all active:scale-95 cursor-pointer shadow-md flex items-center gap-1"
                    >
                      <span>🍿</span>
                      <span className="hidden sm:inline">Share</span>
                    </button>

                    {/* Curtains Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowCurtains(!showCurtains)}
                      title="Toggle Curtains"
                      className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-300 transition-all active:scale-95 cursor-pointer"
                    >
                      <span>🎭</span>
                    </button>
                  </div>
                  <span className="text-[9px] font-semibold text-slate-400">VIP Private Screen</span>
                </div>

                {/* Seat 2: Partner */}
                <div className="flex items-center gap-2.5 sm:gap-3 flex-1 justify-end text-right min-w-0">
                  <div className="min-w-0 truncate">
                    <span className="text-[9px] uppercase tracking-wider text-purple-400 font-extrabold block">Recliner A2</span>
                    <p className="text-xs sm:text-sm font-bold text-white truncate">{partner?.displayName || 'Partner'}</p>
                  </div>
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 p-[2px] shadow-lg shadow-purple-500/25">
                      <div className="w-full h-full rounded-[14px] bg-[#0c0c17] overflow-hidden flex items-center justify-center">
                        {partner?.avatar ? (
                          <img src={partner.avatar} alt="Partner" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-purple-400">Partner</span>
                        )}
                      </div>
                    </div>
                    {/* Drink cup icon badge */}
                    <span className="absolute -bottom-1 -left-1 text-xs sm:text-sm bg-black/80 rounded-full p-0.5 shadow border border-white/10">
                      🥤
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Unblock & Popout Assistant Bar for Web Streams */}
            {mediaState.type === 'embed' && (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 shadow-lg">
                <div className="flex items-center gap-2 text-left">
                  <ShieldAlert size={18} className="text-amber-400 shrink-0" />
                  <span>
                    {useProxy ? (
                      <strong className="text-emerald-300">⚡ Proxy unblock active (stripping X-Frame-Options & CSP headers). If still blank, use Popout Tab:</strong>
                    ) : (
                      <span>Site blocked or refused to connect (sad face)? Tap <strong>Proxy Unblock</strong> or <strong>Popout Tab</strong>:</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !useProxy;
                      setUseProxy(next);
                      toast(next ? 'Proxy Unblock activated ⚡' : 'Switched to Direct Embed', { icon: '⚡' });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 ${
                      useProxy
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold shadow-amber-500/20'
                    }`}
                  >
                    <RefreshCw size={13} className={useProxy ? 'animate-spin' : ''} />
                    <span>{useProxy ? '⚡ Using Proxy' : '⚡ Try Proxy Unblock'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.open(mediaState.src, '_blank');
                      toast.success('Opened stream in popout tab! Call & chat remain active here.');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                  >
                    <ExternalLink size={13} className="text-pink-400" />
                    <span>↗ Popout Tab</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Switch / Close Bar */}
            <div className="flex items-center gap-2 sm:gap-3 py-1 flex-wrap justify-center">
              <span className="px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/5 text-[11px] font-medium text-slate-300">
                Playing: <strong className="text-white">{mediaState.title || (mediaState.type === 'youtube' ? 'YouTube' : mediaState.type === 'direct' ? 'Direct Stream' : 'Web Stream')}</strong>
              </span>

              {mediaState.type === 'embed' && (
                <button
                  type="button"
                  onClick={() => {
                    window.open(mediaState.src, '_blank');
                    toast.success('Opened stream in popout window! Call & chat remain active here.');
                  }}
                  className="px-3.5 sm:px-4 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/15 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
                  title="Open stream in synced popout tab"
                >
                  <ExternalLink size={14} className="text-pink-400" />
                  <span>Popout Tab</span>
                </button>
              )}

              <button
                onClick={() => {
                  setMediaState(null);
                  setUrl('');
                }}
                className="px-3.5 sm:px-4 py-1.5 rounded-full bg-white/[0.06] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-xs font-semibold text-slate-300 hover:text-rose-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
              >
                <X size={14} />
                <span>Close Video</span>
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
              Paste any streaming link (FMHY movie site, MP4, Web stream) or search YouTube above to watch in sync.
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-2.5 justify-center max-w-lg relative z-20">
              {CURATED_MOVIES.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleLoadMedia({ type: 'youtube', src: m.id, title: m.title })}
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
