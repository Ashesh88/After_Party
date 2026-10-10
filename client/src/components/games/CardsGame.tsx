'use client';
import { ArrowLeft, Maximize2, RotateCcw } from 'lucide-react';
import { useRef } from 'react';
import { useAuthStore } from '../../lib/store/authStore';

export default function CardsGame({ onBack }: { onBack: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const user = useAuthStore((state) => state.user);
  const room = useAuthStore((state) => state.room);

  const partner = room?.participants?.find((p) => p._id !== user?._id);
  const partnerName = partner?.displayName || 'Friend';
  const userName = user?.displayName || 'You';

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
    <div className="fixed inset-0 z-[100] bg-[#060b09] flex flex-col select-none">
      {/* Top Header Navigation matching Arcade theme */}
      <header className="h-13 sm:h-14 px-3 sm:px-4 flex items-center justify-between border-b border-white/10 bg-black/70 backdrop-blur-xl z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Arcade</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 mx-2">
          <span className="text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 truncate whitespace-nowrap">
            Royal 3D Cards ♠️
          </span>
          <span className="hidden sm:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
            3D Studio
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={handleReload}
            title="Reload Table"
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

      {/* 3D Cards Canvas App Container */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-[#060b09]">
        <iframe
          ref={iframeRef}
          src={`/games/cards/index.html?p1=${encodeURIComponent(userName)}&p2=${encodeURIComponent(partnerName)}`}
          className="w-full h-full border-none bg-[#060b09]"
          allow="fullscreen; autoplay"
          title="Royal 3D Cards Studio"
        />
      </div>
    </div>
  );
}
