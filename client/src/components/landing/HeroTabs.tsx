'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, MessageCircle } from 'lucide-react';

type TabType = 'watch' | 'games' | 'chat';

const TABS: { id: TabType; label: string }[] = [
  { id: 'watch', label: 'Watch Party' },
  { id: 'games', label: 'Arcade Games' },
  { id: 'chat', label: 'Private Space' },
];

export default function HeroTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('watch');
  const tabRefs = useRef<{ [key in TabType]?: HTMLButtonElement | null }>({});
  const videoWatchRef = useRef<HTMLVideoElement | null>(null);
  const videoGamesRef = useRef<HTMLVideoElement | null>(null);

  // IntersectionObserver to only play videos when in viewport and respect prefers-reduced-motion
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.25 }
    );

    if (videoWatchRef.current) observer.observe(videoWatchRef.current);
    if (videoGamesRef.current) observer.observe(videoGamesRef.current);

    return () => observer.disconnect();
  }, [activeTab]);

  // Arrow key navigation across tablist (WAI-ARIA pattern)
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % TABS.length;
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + TABS.length) % TABS.length;
      e.preventDefault();
    } else if (e.key === 'Home') {
      nextIndex = 0;
      e.preventDefault();
    } else if (e.key === 'End') {
      nextIndex = TABS.length - 1;
      e.preventDefault();
    }

    if (nextIndex !== index) {
      const nextTab = TABS[nextIndex].id;
      setActiveTab(nextTab);
      tabRefs.current[nextTab]?.focus();
    }
  };

  return (
    <div className="mt-12 sm:mt-16 max-w-4xl mx-auto rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-white/15 via-white/[0.04] to-transparent border border-white/15 shadow-[0_25px_80px_rgba(0,0,0,0.85)]">
      <div className="rounded-[22px] bg-[#121224] border border-white/[0.08] overflow-hidden text-left shadow-2xl">
        
        {/* App Window Chrome / Header */}
        <div className="px-4 py-3 border-b border-white/[0.08] bg-[#17172e]/60 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-xs font-semibold text-slate-300 hidden sm:inline-block">
              After Party — You & Alex
            </span>
          </div>

          {/* Accessible Tab Switcher (role="tablist") */}
          <div 
            role="tablist" 
            aria-label="App features demo tabs" 
            className="flex items-center gap-1 p-0.5 rounded-xl bg-black/40 border border-white/10 text-xs"
          >
            {TABS.map((tab, idx) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`hero-tab-${tab.id}`}
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`hero-panel-${tab.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  ref={(el) => { tabRefs.current[tab.id] = el; }}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                    isSelected
                      ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Window Body / Interactive Preview */}
        <div className="p-4 sm:p-6 bg-[#0e0e1c]">
          
          {/* Panel 1: Watch Together */}
          <div
            id="hero-panel-watch"
            role="tabpanel"
            aria-labelledby="hero-tab-watch"
            hidden={activeTab !== 'watch'}
            className="space-y-4"
          >
            {activeTab === 'watch' && (
              <>
                <div className="aspect-video w-full rounded-2xl bg-[#141224] border border-white/10 relative overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoWatchRef}
                    src="/videos/watch-preview.mp4"
                    preload="none"
                    loop
                    muted
                    playsInline
                    aria-label="Synchronized Watch Party movie video demo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex flex-col justify-between p-4 pointer-events-none">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-emerald-400 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        In Sync
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-slate-300 text-xs font-medium border border-white/10">
                        Sample preview
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-200 font-medium">
                        <span>Movie Night • Sintel</span>
                        <span className="text-rose-300 font-semibold font-mono">00:42 / 00:52 • Synced</span>
                      </div>
                      {/* Scrub bar indicator */}
                      <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
                        <div className="w-4/5 h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-xs">
                      Y
                    </div>
                    <div>
                      <p className="font-semibold text-white">You</p>
                      <p className="text-xs text-slate-400">Sample preview</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
                      A
                    </div>
                    <div>
                      <p className="font-semibold text-white">Alex</p>
                      <p className="text-xs text-slate-400">Sample preview</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Panel 2: Arcade Games */}
          <div
            id="hero-panel-games"
            role="tabpanel"
            aria-labelledby="hero-tab-games"
            hidden={activeTab !== 'games'}
            className="space-y-4"
          >
            {activeTab === 'games' && (
              <>
                <div className="aspect-video w-full rounded-2xl bg-[#111928] border border-white/10 relative overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoGamesRef}
                    src="/videos/pool-preview.mp4"
                    poster="/videos/pool-thumb.jpg"
                    preload="none"
                    loop
                    muted
                    playsInline
                    aria-label="Multiplayer 8-Ball Pool demo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-4 pointer-events-none">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="font-semibold text-white">8-Ball Pool Match</span>
                      <span className="text-amber-400 font-mono">Sample preview</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-medium text-slate-300">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">3D Ludo</div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">Master Chess</div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">Card Game</div>
                </div>
              </>
            )}
          </div>

          {/* Panel 3: Private Space & Chat */}
          <div
            id="hero-panel-chat"
            role="tabpanel"
            aria-labelledby="hero-tab-chat"
            hidden={activeTab !== 'chat'}
            className="space-y-3"
          >
            {activeTab === 'chat' && (
              <>
                <div className="h-52 sm:h-60 rounded-2xl bg-[#141224] border border-white/[0.08] p-4 flex flex-col justify-between font-sans relative overflow-hidden">
                  {/* Top lounge header */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-semibold text-white">Private Lounge • 1-on-1</span>
                    </div>
                    <span className="text-xs text-rose-300 font-medium px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                      Live Call Connected
                    </span>
                  </div>

                  {/* Messages */}
                  <div className="flex flex-col gap-2.5 my-auto">
                    <div className="self-start max-w-[80%] px-3.5 py-2 rounded-2xl rounded-bl-sm bg-white/[0.08] border border-white/10 text-xs sm:text-sm text-slate-100">
                      Can&apos;t wait for movie night tonight! Popcorn is ready.
                    </div>
                    <div className="self-end max-w-[80%] px-3.5 py-2 rounded-2xl rounded-br-sm bg-gradient-to-r from-rose-500 to-pink-600 text-xs sm:text-sm text-white shadow-sm">
                      Just queued up the video in our room! Joining now.
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 text-rose-300">
                      <MapPin size={13} />
                      <span>1,240 km apart</span>
                    </span>
                    <span className="font-mono text-emerald-400">Delivered & Seen</span>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
