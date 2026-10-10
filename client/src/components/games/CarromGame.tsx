'use client';
import { ArrowLeft, Target, Sparkles, User, Users } from 'lucide-react';
import { useAuthStore } from '../../lib/store/authStore';

export default function CarromGame({ onBack }: { onBack: () => void }) {
  const user = useAuthStore((state) => state.user);
  const room = useAuthStore((state) => state.room);

  const partner = room?.participants?.find((p) => p._id !== user?._id);
  const partnerName = partner?.displayName || 'Friend';
  const userName = user?.displayName || 'You';

  return (
    <div className="fixed inset-0 z-[100] bg-[#07070d] flex flex-col select-none text-white overflow-hidden">
      {/* Header */}
      <header className="h-14 px-3 sm:px-4 flex items-center justify-between border-b border-white/10 bg-black/70 backdrop-blur-xl z-20 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          <span>Arcade</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-400 to-amber-500">
            Royal 3D Carrom 🎯
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Structure Ready
          </span>
        </div>

        <div className="w-16" />
      </header>

      {/* Main Structure Body */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-4 overflow-y-auto">
        <div className="ambient-glow-pink -top-20 -left-20 pointer-events-none" />
        <div className="ambient-glow-purple -bottom-20 -right-20 pointer-events-none" />

        <div className="w-full max-w-lg glass-panel border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col items-center p-6 text-center">
          {/* Showcase Video preview */}
          <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/15 shadow-xl relative mb-5 bg-black/60">
            <video
              src="/videos/carrom-preview.mp4"
              poster="/videos/carrom-thumb.jpg"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold backdrop-blur-md">
              <Target className="w-3.5 h-3.5" />
              <span>3D Carrom Board Preview</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Game Under Development</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
            3D Carrom Arena
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
            High-precision striker physics, carrom-men pocketing, smooth wooden board simulation & real-time multiplayer are being engineered.
          </p>

          {/* Players Ready Structure */}
          <div className="w-full grid grid-cols-2 gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400">Player 1</p>
                <p className="text-xs font-bold text-white truncate max-w-[100px]">{userName}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400">Player 2</p>
                <p className="text-xs font-bold text-white truncate max-w-[100px]">{partnerName}</p>
              </div>
            </div>
          </div>

          <button
            onClick={onBack}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 hover:from-amber-400 hover:to-pink-400 text-white font-extrabold text-sm shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
          >
            Back to Arcade
          </button>
        </div>
      </main>
    </div>
  );
}
