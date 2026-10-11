'use client';
import { ArrowLeft, Maximize2, RotateCcw } from 'lucide-react';
import { useRef, useEffect } from 'react';
import { useAuthStore } from '../../lib/store/authStore';
import { useSocketStore } from '../../lib/store/socketStore';

export default function TurboRacer({ onBack }: { onBack: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const user = useAuthStore((state) => state.user);
  const room = useAuthStore((state) => state.room);
  const socket = useSocketStore((state) => state.socket);

  const partner = room?.participants?.find((p) => p._id !== user?._id);
  const partnerName = partner?.displayName || 'Friend';
  const userName = user?.displayName || 'You';

  useEffect(() => {
    // Listen for race events from iframe and broadcast to partner via socket
    const handleWindowMessage = (e: MessageEvent) => {
      if (!e.data || !socket) return;

      if (e.data.type === 'RACE_SYNC') {
        socket.emit('racer:sync', e.data.payload);
        socket.emit('game:move', {
          sessionId: room?._id || 'race_room',
          move: e.data.payload
        });
      } else if (e.data.type === 'RACER_EVENT') {
        socket.emit('racer:event', e.data.payload);
      } else if (e.data.type === 'RACER_PING') {
        // Echo ping back to measure roundtrip
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'RACER_PONG',
            time: e.data.time
          }, '*');
        }
      }
    };

    window.addEventListener('message', handleWindowMessage);

    // Listen for partner moves from socket and send into iframe
    if (socket) {
      const handlePartnerMove = (data: any) => {
        const moveData = data?.move || data;
        if (moveData && iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'PARTNER_MOVE',
            payload: moveData
          }, '*');
        }
      };

      const handleRacerEvent = (data: any) => {
        if (data && iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'RACER_EVENT',
            payload: data
          }, '*');
        }
      };

      socket.on('racer:sync', handlePartnerMove);
      socket.on('racer:event', handleRacerEvent);
      socket.on('game:move', handlePartnerMove);

      return () => {
        window.removeEventListener('message', handleWindowMessage);
        socket.off('racer:sync', handlePartnerMove);
        socket.off('racer:event', handleRacerEvent);
        socket.off('game:move', handlePartnerMove);
      };
    }

    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [socket, room]);

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
      <header className="h-13 sm:h-14 px-3 sm:px-4 flex items-center justify-between border-b border-white/10 bg-black/70 backdrop-blur-xl z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Arcade</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 mx-2">
          <span className="text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-rose-400 truncate whitespace-nowrap">
            Turbo 3D Racer 🏎️
          </span>
          <span className="hidden sm:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
            2-Player Luxury Duel
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
          src={`/games/racer/index.html?p1=${encodeURIComponent(userName)}&p2=${encodeURIComponent(partnerName)}&code=${encodeURIComponent(room?.inviteCode || '')}`}
          className="w-full h-full border-none bg-[#08070d]"
          allow="fullscreen; autoplay; clipboard-write"
          title="Turbo 3D Racer"
        />
      </div>
    </div>
  );
}
