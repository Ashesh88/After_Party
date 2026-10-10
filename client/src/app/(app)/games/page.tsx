'use client';
import { useState } from 'react';
import { useGameStore, GamePlayMode } from '../../../lib/store/gameStore';
import { useAuthStore } from '../../../lib/store/authStore';
import TicTacToe from '../../../components/games/TicTacToe';
import TruthOrDare from '../../../components/games/TruthOrDare';
import Quiz from '../../../components/games/Quiz';
import WouldYouRather from '../../../components/games/WouldYouRather';
import Chess3D from '../../../components/games/Chess3D';
import LudoGame from '../../../components/games/LudoGame';
import PoolGame from '../../../components/games/PoolGame';
import TurboRacer from '../../../components/games/TurboRacer';
import { 
  Crown, Dices, XCircle, Sparkles, HelpCircle, Split, 
  CircleDot, Zap, Heart, Users, Bot, Copy, Check, Play, X
} from 'lucide-react';

const games = [
  { 
    id: 'racer', 
    name: 'Couples Turbo 3D Racer', 
    desc: 'Neon highway, Nitro drifts & Head-to-Head',
    icon: Zap, 
    color: 'from-cyan-400 via-pink-500 to-purple-600', 
    tag: '3D RACING',
    couplePlayers: '2 Racers (1v1)',
    friendsPlayers: '4 Racers (Grand Prix)'
  },
  { 
    id: 'chess', 
    name: 'Zen 3D Chess', 
    desc: 'Luxury 3D pieces, AI & Video Call',
    icon: Crown, 
    color: 'from-amber-400 to-rose-500', 
    tag: '3D LIVE',
    couplePlayers: '2 Players (1v1)',
    friendsPlayers: '2 Players (Pass & Play)'
  },
  { 
    id: 'ludo', 
    name: 'Couples 3D Ludo', 
    desc: 'Luxury 3D pawns, Dice & Crown',
    icon: Dices, 
    color: 'from-pink-500 to-purple-600', 
    tag: '3D LIVE',
    couplePlayers: '2 Players (Red vs Yellow)',
    friendsPlayers: '4 Players (All Colors)'
  },
  { 
    id: 'pool', 
    name: 'Couples 3D Pool', 
    desc: 'Luxury 8-Ball, Cue physics & AI',
    icon: CircleDot, 
    color: 'from-emerald-400 to-teal-500', 
    tag: '3D LIVE',
    couplePlayers: '2 Players (1v1)',
    friendsPlayers: '2 Players (Pass & Play)'
  },
  { 
    id: 'tictactoe', 
    name: 'Tic-Tac-Toe', 
    desc: 'Quick 3-in-a-row showdown',
    icon: XCircle, 
    color: 'from-blue-500 to-cyan-500', 
    tag: 'QUICK',
    couplePlayers: '2 Players',
    friendsPlayers: '2 Players'
  },
  { 
    id: 'tod', 
    name: 'Truth or Dare', 
    desc: '100 intimate & spicy cards',
    icon: Sparkles, 
    color: 'from-purple-500 to-pink-500', 
    tag: 'SPICY',
    couplePlayers: '2 Players',
    friendsPlayers: 'Party Group'
  },
  { 
    id: 'quiz', 
    name: 'Couples Quiz', 
    desc: 'How well do you know each other?',
    icon: HelpCircle, 
    color: 'from-orange-500 to-rose-500', 
    tag: 'TRIVIA',
    couplePlayers: '2 Players',
    friendsPlayers: '2-4 Players'
  },
  { 
    id: 'wyr', 
    name: 'Would You Rather', 
    desc: 'Hilarious dilemnas for two',
    icon: Split, 
    color: 'from-emerald-500 to-teal-500', 
    tag: 'FUN',
    couplePlayers: '2 Players',
    friendsPlayers: 'Party Group'
  },
];

export default function GamesPage() {
  const { activeGame, setActiveGame, gameMode, setGameMode } = useGameStore();
  const [selectedGameForModal, setSelectedGameForModal] = useState<typeof games[0] | null>(null);
  const [copied, setCopied] = useState(false);

  const user = useAuthStore((state) => state.user);
  const room = useAuthStore((state) => state.room);

  const partner = room?.participants?.find((p) => p._id !== user?._id);
  const partnerName = partner?.displayName || 'Partner';
  const isPartnerConnected = !!partner;
  const roomCode = room?.inviteCode || 'AFTERPARTY';

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLaunchGame = (gameId: string) => {
    setSelectedGameForModal(null);
    setActiveGame(gameId);
  };

  // If a game is active, render its full-screen interactive view
  if (activeGame === 'racer') return <TurboRacer onBack={() => setActiveGame(null)} />;
  if (activeGame === 'chess') return <Chess3D onBack={() => setActiveGame(null)} />;
  if (activeGame === 'ludo') return <LudoGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'pool') return <PoolGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'tictactoe') return <TicTacToe onBack={() => setActiveGame(null)} />;
  if (activeGame === 'tod') return <TruthOrDare onBack={() => setActiveGame(null)} />;
  if (activeGame === 'quiz') return <Quiz onBack={() => setActiveGame(null)} />;
  if (activeGame === 'wyr') return <WouldYouRather onBack={() => setActiveGame(null)} />;

  return (
    <div className="relative min-h-screen p-4 sm:p-6 max-w-lg mx-auto pb-28">
      {/* Ambient background glow */}
      <div className="ambient-glow-pink -top-24 -left-20 pointer-events-none" />
      <div className="ambient-glow-purple -bottom-24 -right-20 pointer-events-none" />

      <header className="mb-4 relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-pink-400">Play & Connect</span>
          <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
          <span>Couples</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400">Arcade</span>
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Real-time games with your partner, friends party & AI bots
        </p>
      </header>

      {/* Connected Partner / Party Mode Header Bar */}
      <div className="mb-5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl relative z-10 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-white">
              {isPartnerConnected ? (
                <span>Connected with <strong className="text-pink-300">{partnerName}</strong> ❤️</span>
              ) : (
                <span className="text-slate-300">Room Code Active</span>
              )}
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-pink-500/15 border border-pink-500/30 text-[10px] font-bold text-pink-300 hover:bg-pink-500/25 transition-all cursor-pointer"
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            <span>Code: {roomCode}</span>
          </button>
        </div>

        {/* Global Play Mode Switcher */}
        <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setGameMode('couple')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              gameMode === 'couple'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart size={12} className={gameMode === 'couple' ? 'fill-current' : ''} />
            <span>Couple</span>
          </button>

          <button
            onClick={() => setGameMode('friends')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              gameMode === 'friends'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={12} />
            <span>Friends</span>
          </button>

          <button
            onClick={() => setGameMode('ai')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              gameMode === 'ai'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot size={12} />
            <span>vs AI</span>
          </button>
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-2 gap-3.5 relative z-10">
        {games.map(game => {
          const Icon = game.icon;
          return (
            <button
              key={game.id}
              onClick={() => setSelectedGameForModal(game)}
              className="p-5 rounded-[28px] glass-panel hover:border-pink-500/40 transition-all duration-300 text-left group overflow-hidden relative cursor-pointer"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-15 transition-opacity`} />
              
              <div className="flex justify-between items-start mb-3">
                <div className="w-11 h-11 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-pink-400 group-hover:scale-110 group-hover:border-pink-500/40 transition-all shadow-md">
                  <Icon size={22} strokeWidth={2} />
                </div>
                {game.tag && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/30">
                    {game.tag}
                  </span>
                )}
              </div>

              <h3 className="font-extrabold text-white text-sm mb-0.5 group-hover:text-pink-200 transition-colors">
                {game.name}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mb-2">
                {game.desc}
              </p>

              <div className="flex items-center text-[10px] font-bold text-pink-400 gap-1 group-hover:translate-x-1 transition-transform">
                <span>Play now</span>
                <span>→</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Match Setup & Connectivity Modal */}
      {selectedGameForModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121220] border border-pink-500/30 rounded-3xl p-5 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedGameForModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
                <selectedGameForModal.icon size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">
                  {selectedGameForModal.name}
                </h3>
                <p className="text-xs text-slate-400">Choose match mode to start</p>
              </div>
            </div>

            {/* Mode selection buttons */}
            <div className="space-y-2 mb-5">
              {/* Couple Mode */}
              <button
                onClick={() => setGameMode('couple')}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  gameMode === 'couple'
                    ? 'bg-pink-500/15 border-pink-500/50 text-white'
                    : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Heart size={16} className="text-pink-400 fill-current" />
                  <div>
                    <div className="text-xs font-bold text-white">Couples Duel (1v1)</div>
                    <div className="text-[10px] text-slate-400">
                      {isPartnerConnected ? `Playing with ${partnerName} ❤️` : '2 Players showdown'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300">
                  {selectedGameForModal.couplePlayers || '2 Players'}
                </span>
              </button>

              {/* Friends Mode */}
              <button
                onClick={() => setGameMode('friends')}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  gameMode === 'friends'
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-white'
                    : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users size={16} className="text-cyan-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Friends Party</div>
                    <div className="text-[10px] text-slate-400">
                      Multiplayer with room invite code
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                  {selectedGameForModal.friendsPlayers || '4 Players'}
                </span>
              </button>

              {/* vs AI Mode */}
              <button
                onClick={() => setGameMode('ai')}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  gameMode === 'ai'
                    ? 'bg-amber-500/15 border-amber-500/50 text-white'
                    : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bot size={16} className="text-amber-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Solo Practice vs AI</div>
                    <div className="text-[10px] text-slate-400">Instant play against computer bots</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  Solo + Bot
                </span>
              </button>
            </div>

            {/* Launch button */}
            <button
              onClick={() => handleLaunchGame(selectedGameForModal.id)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(244,63,142,0.4)] hover:opacity-95 transition-all cursor-pointer"
            >
              <Play size={14} className="fill-current" />
              <span>Launch Match 🚀</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
