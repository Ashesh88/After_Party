'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Clapperboard, Gamepad2, MessageCircleHeart, MapPin, Users } from 'lucide-react';
import { useGameStore } from '../lib/store/gameStore';

const tabs = [
  { name: 'Home', path: '/dashboard', icon: Home },
  { name: 'Room', path: '/room', icon: Users },
  { name: 'Watch', path: '/watch', icon: Clapperboard },
  { name: 'Games', path: '/games', icon: Gamepad2 },
  { name: 'Chat', path: '/chat', icon: MessageCircleHeart },
  { name: 'Map', path: '/map', icon: MapPin },
];

export default function BottomNav() {
  const pathname = usePathname();
  const activeGame = useGameStore((state) => state.activeGame);

  // Hide the bottom navigation tabs completely when inside any game (Chess, Ludo, Pool, etc.)
  if (activeGame) {
    return null;
  }

  return (
    <div className="bottom-nav-container fixed bottom-3 sm:bottom-4 left-0 right-0 flex justify-center px-2 sm:px-4 pointer-events-none z-40">
      <nav className="pointer-events-auto flex items-center gap-0.5 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full bg-[#0d0d1a]/92 backdrop-blur-2xl border border-white/[0.08] shadow-[0_20px_40px_rgba(0,0,0,0.7)] max-w-full overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path || pathname.startsWith(tab.path + '/');
          const Icon = tab.icon;
          
          return (
            <Link
              key={tab.name}
              href={tab.path}
              className={`relative flex flex-col items-center justify-center w-11 sm:w-13 h-11 sm:h-12 rounded-full transition-all duration-300 ${
                isActive 
                  ? 'text-pink-400 bg-pink-500/10 shadow-[inset_0_1px_1px_rgba(244,63,142,0.3)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Icon 
                size={18} 
                strokeWidth={isActive ? 2.5 : 2}
                className={`transition-transform duration-300 sm:w-5 sm:h-5 ${isActive ? 'scale-110 -translate-y-0.5 filter drop-shadow-[0_0_8px_rgba(244,63,142,0.6)]' : ''}`}
              />
              <span className={`text-[9px] sm:text-[10px] font-semibold tracking-tight mt-0.5 ${isActive ? 'text-pink-400 opacity-100 font-bold' : 'opacity-60'}`}>
                {tab.name}
              </span>

              {isActive && (
                <motion.div
                  layoutId="nav-glow-indicator"
                  className="absolute -bottom-1 w-4 sm:w-5 h-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_8px_#f43f8e]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
