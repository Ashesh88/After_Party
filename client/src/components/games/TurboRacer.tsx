'use client';
import { ArrowLeft, Maximize2, RotateCcw, Zap, Users, Bot, Heart, Copy, Check } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAuthStore } from '../../lib/store/authStore';

export default function TurboRacer({ onBack }: { onBack: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentMode, setCurrentMode] = useState<'couple' | 'friends' | 'ai'>('couple');
  const [copied, setCopied] = useState(false);

  const user = useAuthStore((state) => state.user);
  const room = useAuthStore((state) => state.room);

  // Identify partner name if in a room
  const partner = room?.participants?.find((p) => p._id !== user?._id);
  const partnerName = partner?.displayName || 'Partner';
  const userName = user?.displayName || 'You';
  const roomCode = room?.inviteCode || 'AFTERPARTY';

  const handleModeChange = (mode: 'couple' | 'friends' | 'ai') => {
    setCurrentMode(mode);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'SET_MODE', mode }, '*');
    }
  };

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleFullscreen = () => {
    if (iframeRef.current && iframeRef.current.requestFullscreen) {
      iframeRef.current.requestFullscreen();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#08070d] flex flex-col select-none">
      {/* Top Header Navigation matching Couples Arcade theme */}
      <header className="h-14 px-3 sm:px-4 flex items-center justify-between border-b border-white/10 bg-black/80 backdrop-blur-xl z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-pink-400" />
          <span>Arcade</span>
        </button>

        {/* Mode Selector Badges in Header */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-white/[0.05] p-1 rounded-full border border-white/10">
          <button
            onClick={() => handleModeChange('couple')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              currentMode === 'couple'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-[0_2px_10px_rgba(244,63,142,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart size={12} className={currentMode === 'couple' ? 'fill-current' : ''} />
            <span className="hidden sm:inline">Couple</span> 1v1
          </button>

          <button
            onClick={() => handleModeChange('friends')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              currentMode === 'friends'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_2px_10px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users size={12} />
            <span className="hidden sm:inline">Friends</span> 4P
          </button>

          <button
            onClick={() => handleModeChange('ai')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              currentMode === 'ai'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_2px_10px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot size={12} />
            <span>vs AI</span>
          </button>
        </div>

        {/* Partner Connection info & utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {currentMode === 'friends' && roomCode && (
            <button
              onClick={handleCopyCode}
              title="Copy Room Code for Friends"
              className="hidden md:flex items-center gap-1 px-2 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/20 cursor-pointer"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              <span>Code: {roomCode}</span>
            </button>
          )}

          <button
            onClick={handleReload}
            title="Reload Race"
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

      {/* 3D Car Race Canvas Container */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-[#08070d]">
        <iframe
          ref={iframeRef}
          src={`/games/racer/index.html?mode=${currentMode}&p1=${encodeURIComponent(userName)}&p2=${encodeURIComponent(partnerName)}`}
          className="w-full h-full border-none bg-[#08070d]"
          allow="fullscreen; autoplay"
          title="Couples Turbo 3D Racer"
        />
      </div>
    </div>
  );
}
