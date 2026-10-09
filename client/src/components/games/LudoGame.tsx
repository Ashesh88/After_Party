'use client';
import { ArrowLeft, Maximize2, RotateCcw } from 'lucide-react';
import { useRef } from 'react';

export default function LudoGame({ onBack }: { onBack: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleReload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0c10] flex flex-col select-none">
      {/* Top Header Navigation matching Couples Arcade theme */}
      <header className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur-xl z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-pink-400" />
          <span>Arcade</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400">
            Couples 3D Ludo 🎲
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
            3D Studio
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReload}
            title="Reload Board"
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleFullscreen}
            title="Full Screen View"
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3D Ludo Canvas App Container */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-[#0a0c10]">
        <iframe
          ref={iframeRef}
          src="/games/ludo/index.html"
          className="w-full h-full border-none bg-[#0a0c10]"
          allow="fullscreen"
          title="Couples 3D Ludo Deluxe"
        />
      </div>
    </div>
  );
}
