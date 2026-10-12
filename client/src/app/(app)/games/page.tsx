'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../../lib/store/gameStore';
import TicTacToe from '../../../components/games/TicTacToe';
import TruthOrDare from '../../../components/games/TruthOrDare';
import Quiz from '../../../components/games/Quiz';
import WouldYouRather from '../../../components/games/WouldYouRather';
import Chess2D from '../../../components/games/Chess2D';
import LudoGame from '../../../components/games/LudoGame';
import PoolGame from '../../../components/games/PoolGame';
import TurboRacer from '../../../components/games/TurboRacer';
import BowlingGame from '../../../components/games/BowlingGame';
import CarromGame from '../../../components/games/CarromGame';
import UnoGame from '../../../components/games/UnoGame';
import CoPaintStudio from '../../../components/games/CoPaintStudio';
import ArcadeStakesBar from '../../../components/games/ArcadeStakesBar';
import { Crown, Dices, XCircle, Sparkles, HelpCircle, Split, CircleDot, Zap, Disc, Target, Layers, Palette, ArrowRight } from 'lucide-react';

const games = [
  { 
    id: 'chess', 
    name: 'Classic 2D Chess', 
    desc: 'Tournament board, smart AI & online multiplayer',
    icon: Crown, 
    color: 'from-amber-400 to-rose-500', 
    tag: 'CLASSIC 2D',
    video: '/videos/chess-preview.mp4',
    thumb: '/videos/chess-thumb.jpg'
  },
  { 
    id: 'pool', 
    name: 'Luxury 3D Pool', 
    desc: '8-Ball billiards, Cue physics & AI',
    icon: CircleDot, 
    color: 'from-emerald-400 to-teal-500', 
    tag: '3D LIVE',
    video: '/videos/pool-preview.mp4',
    thumb: '/videos/pool-thumb.jpg'
  },
  { 
    id: 'ludo', 
    name: 'Classic Ludo', 
    desc: 'Luxury 3D pawns, Dice & Crown',
    icon: Dices, 
    color: 'from-pink-500 to-purple-600', 
    tag: '3D LIVE',
    video: '/videos/ludo-preview.mp4',
    thumb: '/videos/ludo-thumb.jpg'
  },
  { 
    id: 'bowling', 
    name: 'Cosmic 3D Bowling', 
    desc: '10-pin hardwood alley, strikes & cosmic pins',
    icon: Disc, 
    color: 'from-purple-500 via-pink-500 to-amber-400', 
    tag: '3D LIVE',
    video: '/videos/bowling-preview.mp4',
    thumb: '/videos/bowling-thumb.jpg'
  },
  { 
    id: 'racer', 
    name: 'Turbo 3D Racer', 
    desc: 'Luxury supercars, 2-Player duel & Nitro',
    icon: Zap, 
    color: 'from-cyan-400 via-pink-500 to-purple-600', 
    tag: '3D RACING',
    video: '/videos/racer-preview.mp4',
    thumb: '/videos/racer-thumb.jpg'
  },
  { 
    id: 'carrom', 
    name: 'Royal 3D Carrom', 
    desc: 'Wooden board, striker & multiplayer physics',
    icon: Target, 
    color: 'from-amber-400 via-rose-500 to-amber-600', 
    tag: '3D LIVE',
    video: '/videos/carrom-preview.mp4',
    thumb: '/videos/carrom-thumb.jpg'
  },
  { 
    id: 'uno', 
    name: 'UNO Party', 
    desc: 'Wild cards, reverse & fast-paced battle',
    icon: Layers, 
    color: 'from-red-500 via-amber-500 to-yellow-400', 
    tag: '3D LIVE',
    video: '/videos/uno-preview.mp4',
    thumb: '/videos/uno-thumb.jpg'
  },
  { 
    id: 'paint', 
    name: 'Sunset Canvas Studio', 
    desc: 'Co-op painting, scenery, shapes & real-time chat',
    icon: Palette, 
    color: 'from-amber-500 via-rose-500 to-purple-600', 
    tag: 'CO-OP ART',
    video: '/videos/painting-preview.mp4',
    thumb: '/videos/painting-thumb.jpg'
  },
  { 
    id: 'tictactoe', 
    name: 'Tic-Tac-Toe', 
    desc: 'Quick 3-in-a-row showdown',
    icon: XCircle, 
    color: 'from-blue-500 to-cyan-500', 
    tag: '3D SHOWDOWN',
    video: '/videos/tictactoe-preview.mp4',
    thumb: '/videos/tictactoe-thumb.jpg'
  },
  { 
    id: 'tod', 
    name: 'Truth or Dare', 
    desc: '100 intimate & spicy cards',
    icon: Sparkles, 
    color: 'from-purple-500 to-pink-500', 
    tag: '3D SPICY',
    video: '/videos/tod-preview.mp4',
    thumb: '/videos/tod-thumb.jpg'
  },
  { 
    id: 'quiz', 
    name: 'Trivia Quiz Show', 
    desc: 'How well do you know each other?',
    icon: HelpCircle, 
    color: 'from-orange-500 to-rose-500', 
    tag: '3D TRIVIA',
    video: '/videos/quiz-preview.mp4',
    thumb: '/videos/quiz-thumb.jpg'
  },
  { 
    id: 'wyr', 
    name: 'Would You Rather', 
    desc: 'Hilarious dilemnas for two',
    icon: Split, 
    color: 'from-emerald-500 to-teal-500', 
    tag: '3D ARCADE',
    video: '/videos/wyr-preview.mp4',
    thumb: '/videos/wyr-thumb.jpg'
  },
];

// High-performance Card component for games with video preview:
// 1. Mobile & Desktop 60fps Optimization:
//    - Mounts static image thumbnail by default (zero VRAM overhead, instant 60fps scrolling).
//    - ONLY mounts and decodes the <video> element for the currently active/hovered/touched card.
//    - Uses GPU layer hardware acceleration (translateZ(0)) to eliminate mobile frame drops.
// 2. Bottom crop (h-[116%] with object-position 'top center' inside overflow-hidden):
//    - Preserves top game title (CHESS, POOL, LUDO, CAR RACING, CARROM, UNO) 100% uncut,
//    - while cropping the bottom edge to hide the Gemini logo/watermark.
function GameVideoCard({
  game,
  isActive,
  onActivate,
  onDeactivate,
  onSelect,
}: {
  game: (typeof games)[0];
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onSelect: () => void;
}) {
  const videoSrc = (game as any).video;
  const thumbSrc = (game as any).thumb;

  const handleClick = (e: React.MouseEvent) => {
    // If mobile touch device and card is not yet playing, start video preview smoothly
    const isTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    if (isTouch && !isActive) {
      e.preventDefault();
      onActivate();
      return;
    }
    onSelect();
  };

  return (
    <div
      key={game.id}
      onClick={handleClick}
      onMouseEnter={onActivate}
      onMouseLeave={onDeactivate}
      onTouchStart={onActivate}
      className="w-full aspect-video rounded-[24px] sm:rounded-[28px] overflow-hidden relative cursor-pointer group glass-panel border border-white/10 hover:border-pink-500/50 shadow-xl transition-all duration-300 p-0 select-none"
      style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
    >
      {/* 
        Video container with overflow-hidden and bottom cropping:
        Height is set to 116% and top is 0 with object-position 'top center'.
        This pins the top edge (game title) perfectly in place without any cutting,
        while pushing the bottom 16% containing the watermark out of view.
      */}
      <div className="absolute inset-0 overflow-hidden bg-black/40">
        {/* Fast, lightweight static thumbnail (always present as instant base layer) */}
        <img
          src={thumbSrc}
          alt={game.name}
          loading="lazy"
          className="absolute inset-x-0 top-0 w-full h-[116%] object-cover object-top transition-transform duration-500 group-hover:scale-105 pointer-events-none"
          style={{ objectPosition: 'top center', transform: 'translateZ(0)' }}
        />

        {/* 
          High-performance Single Active Video:
          Only mounted when active to ensure mobile hardware decoder is never overloaded.
          Guarantees buttery-smooth 60fps playback on phone browsers.
        */}
        {isActive && (
          <video
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-x-0 top-0 w-full h-[116%] object-cover object-top pointer-events-none"
            style={{
              objectPosition: 'top center',
              transform: 'translateZ(0)',
              WebkitTransform: 'translateZ(0)',
            }}
          />
        )}

        {/* Soft bottom vignette to ensure watermark is completely blocked and text is sharp */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-30 transition-opacity pointer-events-none" />

      {/* Floating Play now in bottom-left corner */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className="absolute bottom-1.5 left-2.5 sm:bottom-2 sm:left-3 flex items-center gap-1 text-white text-[10px] sm:text-[11px] font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] group-hover:translate-x-1 transition-transform z-10 cursor-pointer"
      >
        <span className="text-white/95">Play now</span>
        <ArrowRight className="w-3.5 h-3.5 text-pink-400" />
      </div>
    </div>
  );
}

export default function GamesPage() {
  const { activeGame, setActiveGame } = useGameStore();
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  if (activeGame === 'chess') return <Chess2D onBack={() => setActiveGame(null)} />;
  if (activeGame === 'pool') return <PoolGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'ludo') return <LudoGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'bowling') return <BowlingGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'racer') return <TurboRacer onBack={() => setActiveGame(null)} />;
  if (activeGame === 'carrom') return <CarromGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'uno') return <UnoGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'paint') return <CoPaintStudio onBack={() => setActiveGame(null)} />;
  if (activeGame === 'tictactoe') return <TicTacToe onBack={() => setActiveGame(null)} />;
  if (activeGame === 'tod') return <TruthOrDare onBack={() => setActiveGame(null)} />;
  if (activeGame === 'quiz') return <Quiz onBack={() => setActiveGame(null)} />;
  if (activeGame === 'wyr') return <WouldYouRather onBack={() => setActiveGame(null)} />;

  return (
    <div className="relative min-h-screen p-4 sm:p-6 md:p-8 lg:p-10 w-full max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto pb-32">
      {/* Ambient background glow */}
      <div className="ambient-glow-pink -top-24 -left-20 pointer-events-none" />
      <div className="ambient-glow-purple -bottom-24 -right-20 pointer-events-none" />

      <header className="mb-6 md:mb-8 relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-pink-400">Play & Connect</span>
          <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight flex items-center gap-2">
          <span>Game</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400">Arcade</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">Real-time 3D games and party challenges</p>
      </header>

      {/* Couples Arcade Stakes & Bets Selector */}
      <ArcadeStakesBar />

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5 xl:gap-6 relative z-10">
        {games.map(game => {
          const Icon = game.icon;
          const videoSrc = (game as any).video;

          // For video games: Full section video, plays on hover/touch only, bottom cropped to hide logo
          if (videoSrc) {
            return (
              <GameVideoCard
                key={game.id}
                game={game}
                isActive={activeVideoId === game.id}
                onActivate={() => setActiveVideoId(game.id)}
                onDeactivate={() => setActiveVideoId(null)}
                onSelect={() => setActiveGame(game.id)}
              />
            );
          }

          // For standard cards without video
          return (
            <button
              key={game.id}
              onClick={() => setActiveGame(game.id)}
              className="p-4 sm:p-5 rounded-[28px] glass-panel hover:border-pink-500/40 transition-all duration-300 text-left group overflow-hidden relative cursor-pointer flex flex-col justify-between"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-15 transition-opacity`} />
              
              <div>
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
              </div>

              <div className="flex items-center text-[10px] font-bold text-pink-400 gap-1 group-hover:translate-x-1 transition-transform mt-auto">
                <span>Play now</span>
                <ArrowRight className="w-3.5 h-3.5 text-pink-400" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
