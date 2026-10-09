'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Clapperboard, Gamepad2, MessageCircleHeart, MapPin } from 'lucide-react';

const tabs = [
  { name: 'Home', path: '/dashboard', icon: Home },
  { name: 'Watch', path: '/watch', icon: Clapperboard },
  { name: 'Games', path: '/games', icon: Gamepad2 },
  { name: 'Chat', path: '/chat', icon: MessageCircleHeart },
  { name: 'Map', path: '/map', icon: MapPin },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center px-4 pointer-events-none z-50">
      <nav className="pointer-events-auto flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-full bg-[#0d0d1a]/90 backdrop-blur-2xl border border-white/[0.08] shadow-[0_20px_40px_rgba(0,0,0,0.7)]">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path || pathname.startsWith(tab.path + '/');
          const Icon = tab.icon;
          
          return (
            <Link
              key={tab.name}
              href={tab.path}
              className={`relative flex flex-col items-center justify-center w-14 h-12 rounded-full transition-all duration-300 ${
                isActive 
                  ? 'text-pink-400 bg-pink-500/10 shadow-[inset_0_1px_1px_rgba(244,63,142,0.3)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Icon 
                size={20} 
                strokeWidth={isActive ? 2.5 : 2}
                className={`transition-transform duration-300 ${isActive ? 'scale-110 -translate-y-0.5 filter drop-shadow-[0_0_8px_rgba(244,63,142,0.6)]' : ''}`}
              />
              <span className={`text-[10px] font-semibold tracking-tight mt-0.5 ${isActive ? 'text-pink-400 opacity-100 font-bold' : 'opacity-60'}`}>
                {tab.name}
              </span>

              {isActive && (
                <motion.div
                  layoutId="nav-glow-indicator"
                  className="absolute -bottom-1 w-5 h-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_8px_#f43f8e]"
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
