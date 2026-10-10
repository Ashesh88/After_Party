'use client';
import { useGameStore } from '../../../lib/store/gameStore';
import TicTacToe from '../../../components/games/TicTacToe';
import TruthOrDare from '../../../components/games/TruthOrDare';
import Quiz from '../../../components/games/Quiz';
import WouldYouRather from '../../../components/games/WouldYouRather';
import Chess3D from '../../../components/games/Chess3D';
import LudoGame from '../../../components/games/LudoGame';
import PoolGame from '../../../components/games/PoolGame';
import TurboRacer from '../../../components/games/TurboRacer';
import CardsGame from '../../../components/games/CardsGame';
import { Crown, Dices, XCircle, Sparkles, HelpCircle, Split, CircleDot, Zap, Spade } from 'lucide-react';

const games = [
  { 
    id: 'cards', 
    name: 'Royal 3D Cards', 
    desc: 'Luxury Blackjack, 3D dealing & chips',
    icon: Spade, 
    color: 'from-emerald-400 via-teal-500 to-amber-500', 
    tag: '3D LIVE' 
  },
  { 
    id: 'racer', 
    name: 'Turbo 3D Racer', 
    desc: 'Luxury supercars, 2-Player duel & Nitro',
    icon: Zap, 
    color: 'from-cyan-400 via-pink-500 to-purple-600', 
    tag: '3D RACING' 
  },
  { 
    id: 'chess', 
    name: 'Zen 3D Chess', 
    desc: 'Luxury 3D pieces, AI & Video Call',
    icon: Crown, 
    color: 'from-amber-400 to-rose-500', 
    tag: '3D LIVE' 
  },
  { 
    id: 'ludo', 
    name: 'Classic 3D Ludo', 
    desc: 'Luxury 3D pawns, Dice & Crown',
    icon: Dices, 
    color: 'from-pink-500 to-purple-600', 
    tag: '3D LIVE' 
  },
  { 
    id: 'pool', 
    name: 'Luxury 3D Pool', 
    desc: '8-Ball billiards, Cue physics & AI',
    icon: CircleDot, 
    color: 'from-emerald-400 to-teal-500', 
    tag: '3D LIVE' 
  },
  { 
    id: 'tictactoe', 
    name: 'Tic-Tac-Toe', 
    desc: 'Quick 3-in-a-row showdown',
    icon: XCircle, 
    color: 'from-blue-500 to-cyan-500', 
    tag: 'QUICK' 
  },
  { 
    id: 'tod', 
    name: 'Truth or Dare', 
    desc: '100 intimate & spicy cards',
    icon: Sparkles, 
    color: 'from-purple-500 to-pink-500', 
    tag: 'SPICY' 
  },
  { 
    id: 'quiz', 
    name: 'Trivia Quiz Show', 
    desc: 'How well do you know each other?',
    icon: HelpCircle, 
    color: 'from-orange-500 to-rose-500', 
    tag: 'TRIVIA' 
  },
  { 
    id: 'wyr', 
    name: 'Would You Rather', 
    desc: 'Hilarious dilemnas for two',
    icon: Split, 
    color: 'from-emerald-500 to-teal-500', 
    tag: 'FUN' 
  },
];

export default function GamesPage() {
  const { activeGame, setActiveGame } = useGameStore();

  if (activeGame === 'cards') return <CardsGame onBack={() => setActiveGame(null)} />;
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

      <header className="mb-6 relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-pink-400">Play & Connect</span>
          <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
          <span>Game</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400">Arcade</span>
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-1">Real-time 3D games and party challenges</p>
      </header>

      <div className="grid grid-cols-2 gap-3.5 relative z-10">
        {games.map(game => {
          const Icon = game.icon;
          return (
            <button
              key={game.id}
              onClick={() => setActiveGame(game.id)}
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
    </div>
  );
}
