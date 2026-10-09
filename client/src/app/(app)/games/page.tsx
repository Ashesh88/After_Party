'use client';
import { useState } from 'react';
import TicTacToe from '../../../components/games/TicTacToe';
import TruthOrDare from '../../../components/games/TruthOrDare';
import Quiz from '../../../components/games/Quiz';
import WouldYouRather from '../../../components/games/WouldYouRather';
import Chess3D from '../../../components/games/Chess3D';
import LudoGame from '../../../components/games/LudoGame';
import { Crown, Dices, XCircle, Sparkles, HelpCircle, Split, Gamepad2 } from 'lucide-react';

const games = [
  { 
    id: 'chess', 
    name: 'Classic Chess', 
    desc: 'Real FIDE rules & checkmate',
    icon: Crown, 
    color: 'from-amber-400 to-rose-500', 
    tag: 'STRATEGY' 
  },
  { 
    id: 'ludo', 
    name: 'Couples Ludo', 
    desc: 'Race 2 tokens to the crown',
    icon: Dices, 
    color: 'from-pink-500 to-purple-600', 
    tag: 'FAVORITE' 
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
    name: 'Couples Quiz', 
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
  const [activeGame, setActiveGame] = useState<string | null>(null);

  if (activeGame === 'chess') return <Chess3D onBack={() => setActiveGame(null)} />;
  if (activeGame === 'ludo') return <LudoGame onBack={() => setActiveGame(null)} />;
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
          <span>Couples</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400">Arcade</span>
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-1">Real-time turn-based games for you and your partner</p>
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
