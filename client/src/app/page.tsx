'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Clapperboard,
  Gamepad2,
  MessageCircle,
  Phone,
  Video,
  ShieldCheck,
  MapPin,
  Sparkles,
  ArrowRight,
  Check,
  ChevronDown,
  Lock,
  Radio,
  Play,
  Users,
  Menu,
  X,
  Minus,
  Laptop,
  Smartphone,
  ExternalLink,
} from 'lucide-react';

// Steps for "How it works"
const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create your private space',
    description: 'Set up an invite-only room in one click. No lengthy onboarding or credit card needed.',
  },
  {
    step: '02',
    title: 'Share your 6-digit room code',
    description: 'Send your code directly to your partner. Only people with your code can enter.',
  },
  {
    step: '03',
    title: 'Start hanging out together',
    description: 'Stream videos in sync, challenge each other in games, or talk privately with zero feeds.',
  },
];

// Feature showcase rows
const FEATURE_SHOWCASE = [
  {
    id: 'watch',
    tag: 'Watch Together',
    title: 'Watch movies in shared sync, wherever you are.',
    description: 'Paste any YouTube link and press play. When you pause to grab a drink or skip ahead, your partner’s screen stays in sync within a fraction of a second.',
    bullets: [
      'Synchronized play, pause, seek, and playback speed',
      'Floating emoji reactions that appear in real time',
      'Picture-in-picture webcam view while streaming',
    ],
    videoSrc: '/videos/ludo-preview.mp4',
    posterSrc: '/videos/ludo-thumb.jpg',
    visualType: 'watch',
    ctaText: 'Start a Watch Party',
    ctaLink: '/register',
  },
  {
    id: 'games',
    tag: '3D Arcade Games',
    title: 'Challenge each other in real-time games.',
    description: 'Play 8-Ball Pool, 3D Ludo, Chess, Uno, and Carrom directly inside your browser. No separate downloads or account registrations required.',
    bullets: [
      'Live multiplayer with real-time physics',
      'Interactive 3D board, dice, and pieces',
      'In-game audio, quick reactions, and rematch stats',
    ],
    videoSrc: '/videos/pool-preview.mp4',
    posterSrc: '/videos/pool-thumb.jpg',
    visualType: 'games',
    ctaText: 'Explore the Game Room',
    ctaLink: '/register',
  },
  {
    id: 'calls',
    tag: 'Private Chat & Calls',
    title: 'Talk face-to-face with crystal clear WebRTC calls.',
    description: 'One-tap voice and video calls built right into your room. No meeting links, Zoom limits, or switching between chat and video apps.',
    bullets: [
      'Direct peer-to-peer WebRTC video and audio',
      'Front and rear camera flip on mobile phones',
      'Integrated chat with photos, seen ticks, and voice notes',
    ],
    videoSrc: '/videos/carrom-preview.mp4',
    posterSrc: '/videos/carrom-thumb.jpg',
    visualType: 'calls',
    ctaText: 'Start Talking Privately',
    ctaLink: '/register',
  },
  {
    id: 'distance',
    tag: 'Proximity Radar',
    title: 'Feel closer with live distance tracking.',
    description: 'See the distance between you and your partner in kilometers or miles with custom heart markers. Turn location sharing on or off anytime with complete control.',
    bullets: [
      'Live distance calculation with heart map markers',
      'Ephemeral live socket stream — never stored permanently in a database',
      'Countdown capsule to your next planned reunion date',
    ],
    videoSrc: '/videos/chess-preview.mp4',
    posterSrc: '/videos/chess-thumb.jpg',
    visualType: 'distance',
    ctaText: 'Create Your Couple Space',
    ctaLink: '/register',
  },
];

// Comparison data (No emojis - strictly SVG checks and minuses)
const COMPARISON_ROWS = [
  {
    feature: 'Everything in one tab (movies, games, call)',
    other: 'Requires 4–5 separate apps',
    afterParty: 'All integrated in one private lounge',
  },
  {
    feature: 'Synchronized video streaming',
    other: 'Browser extension required / clumsy screen shares',
    afterParty: 'Built-in real-time sync engine',
  },
  {
    feature: 'Multiplayer games without installing',
    other: 'Both must download Ludo King / GamePigeon',
    afterParty: 'Instant 3D games in any web browser',
  },
  {
    feature: 'Feeds, algorithms & public profiles',
    other: 'Endless doomscrolling and stranger DMs',
    afterParty: 'Zero public feeds — strictly your invite-only space',
  },
  {
    feature: 'Persistent couple milestones & countdowns',
    other: 'Scattered across notes and calendar apps',
    afterParty: 'Shared countdown capsule & relationship goals',
  },
];

// FAQs: Accordion format, first open by default
const FAQS = [
  {
    q: 'Do I need to download an app?',
    a: 'No app download is needed. After Party runs entirely in your mobile or desktop browser (Safari, Chrome, Firefox, Edge). On iOS or Android, you can also tap "Add to Home Screen" to install it as a lightweight Progressive Web App (PWA) with a full-screen experience.',
  },
  {
    q: 'Is it free to use?',
    a: 'Yes, After Party is completely free to create and use. You can invite your partner, stream videos, play games, and make voice/video calls without any subscription or hidden fees.',
  },
  {
    q: 'How does playback sync work?',
    a: 'When you or your partner play, pause, or jump to a timestamp, lightweight signaling events are exchanged over real-time WebSockets. This keeps playback in sync within a fraction of a second so you are always reacting to the exact same moment together.',
  },
  {
    q: 'Who can see my data and room?',
    a: 'Only people who have your unique room invite code can enter your space. There are no public user directories, searchable profiles, or algorithmic feeds. Audio and video calls connect directly via WebRTC peer-to-peer protocols, and location sharing is streamed ephemerally over live sockets without permanent location logging.',
  },
  {
    q: 'What can we watch together?',
    a: 'Currently, After Party natively supports YouTube video URLs as well as direct MP4 video streams. You can paste any public or unlisted YouTube link to watch together with synced playback, synchronized volume, and live reactions.',
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [activeHeroTab, setActiveHeroTab] = useState<'watch' | 'games' | 'chat'>('watch');

  // Trigger sticky mobile CTA bar after scrolling past hero (~450px)
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCta(window.scrollY > 480);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-slate-100 relative overflow-x-hidden selection:bg-rose-500/30 selection:text-rose-200">
      
      {/* Subtle, Warm Romantic Ambient Glows (Performance-friendly soft blur) */}
      <div 
        aria-hidden="true" 
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[650px] sm:w-[900px] h-[450px] bg-gradient-to-b from-rose-600/15 via-purple-600/10 to-transparent rounded-full blur-[120px] pointer-events-none -z-10" 
      />
      <div 
        aria-hidden="true" 
        className="fixed bottom-1/4 right-0 w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[140px] pointer-events-none -z-10" 
      />

      {/* ======================================================== */}
      {/* 1. HEADER / NAVBAR                                       */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0f0f1a]/85 border-b border-white/[0.08] transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-xl p-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-600 p-[1.5px] shadow-[0_0_20px_rgba(244,63,94,0.35)] group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#121224] rounded-[14px] flex items-center justify-center">
                <Heart size={18} className="text-rose-400 fill-rose-400/30" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-rose-200 transition-colors">
                After Party
              </span>
              <span className="text-[10px] font-medium tracking-wider text-slate-400 -mt-1 hidden sm:block">
                For Long-Distance Couples
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#how-it-works" className="hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-md px-1 py-0.5">
              How It Works
            </a>
            <a href="#features" className="hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-md px-1 py-0.5">
              Features
            </a>
            <a href="#squads" className="hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-md px-1 py-0.5">
              Friend Squads
            </a>
            <a href="#privacy" className="hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-md px-1 py-0.5">
              Privacy
            </a>
            <a href="#faqs" className="hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-md px-1 py-0.5">
              FAQ
            </a>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-xl"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold text-sm shadow-[0_4px_20px_rgba(244,63,94,0.35)] hover:shadow-[0_4px_25px_rgba(244,63,94,0.5)] active:scale-95 transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <span>Start Free</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Mobile Hamburger Button (Minimum 44x44px target) */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white"
            >
              Sign In
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 text-slate-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-white/[0.08] bg-[#121224]/95 backdrop-blur-2xl px-5 py-6 space-y-4 overflow-hidden"
            >
              <div className="flex flex-col gap-3 font-medium text-slate-200">
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  How It Works
                </a>
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  Features
                </a>
                <a
                  href="#squads"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  Friend Squads
                </a>
                <a
                  href="#privacy"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  Privacy
                </a>
                <a
                  href="#faqs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  FAQ
                </a>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex flex-col gap-2.5">
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-center text-sm shadow-md"
                >
                  Start your space, free
                </Link>
                <Link
                  href="/room/setup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-xl bg-white/[0.08] text-white font-semibold text-center text-sm border border-white/10"
                >
                  Join with room code
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        {/* ======================================================== */}
        {/* 2. HERO SECTION                                          */}
        {/* ======================================================== */}
        <section className="pt-12 pb-16 sm:pt-20 sm:pb-28 px-4 sm:px-6 max-w-5xl mx-auto text-center">
          
          {/* Subtle Audience Tagline Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-semibold mb-6">
            <Heart size={13} className="text-rose-400 fill-rose-400/40" />
            <span>Built exclusively for long-distance couples</span>
          </div>

          {/* Headline (Exact max 8 words requirement) */}
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.08] max-w-4xl mx-auto">
            Close the physical distance between you two.
          </h1>

          {/* Subheadline (Exact copy requirement) */}
          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mt-6 leading-relaxed">
            Watch movies, play games and talk privately with your partner, in perfect sync, from anywhere.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8 sm:mt-10">
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-base shadow-[0_8px_30px_rgba(244,63,94,0.35)] hover:shadow-[0_8px_35px_rgba(244,63,94,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <span>Start your space, free</span>
              <ArrowRight size={17} />
            </Link>
            <Link
              href="/room/setup"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white font-semibold text-base transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <span>Join with room code</span>
            </Link>
          </div>

          {/* Small Honest Assurance Line under CTAs */}
          <p className="text-xs text-slate-400 mt-3.5">
            No app download needed. Works in your browser on phone and PC.
          </p>

          {/* Single Subtle Trust Row */}
          <div className="flex items-center justify-center gap-6 sm:gap-8 mt-7 text-xs text-slate-400 font-medium flex-wrap">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-rose-400" />
              <span>Private invite-only rooms</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Radio size={14} className="text-emerald-400" />
              <span>Stays in sync within a fraction of a second</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Smartphone size={14} className="text-slate-300" />
              <span>Free to use on any device</span>
            </span>
          </div>

          {/* REAL POLISHED DEVICE FRAME WITH ACTUAL APP DEMO */}
          <div className="mt-12 sm:mt-16 max-w-4xl mx-auto rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-white/15 via-white/[0.04] to-transparent border border-white/15 shadow-[0_25px_80px_rgba(0,0,0,0.85)]">
            <div className="rounded-[22px] bg-[#121224] border border-white/[0.08] overflow-hidden text-left shadow-2xl">
              
              {/* App Window Chrome / Header */}
              <div className="px-4 py-3 border-b border-white/[0.08] bg-[#17172e]/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-semibold text-slate-300 hidden sm:inline-block">
                    After Party — You & Alex
                  </span>
                </div>

                {/* Tab Switcher in Device Frame */}
                <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/40 border border-white/10 text-xs">
                  <button
                    onClick={() => setActiveHeroTab('watch')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      activeHeroTab === 'watch'
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Watch Party
                  </button>
                  <button
                    onClick={() => setActiveHeroTab('games')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      activeHeroTab === 'games'
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Arcade Games
                  </button>
                  <button
                    onClick={() => setActiveHeroTab('chat')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      activeHeroTab === 'chat'
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Private Space
                  </button>
                </div>
              </div>

              {/* Window Body / Interactive Preview */}
              <div className="p-4 sm:p-6 bg-[#0e0e1c]">
                {activeHeroTab === 'watch' && (
                  <div className="space-y-4">
                    <div className="aspect-video w-full rounded-2xl bg-gradient-to-tr from-[#1a1329] to-[#261536] border border-white/10 relative overflow-hidden flex items-center justify-center group">
                      <video
                        src="/videos/ludo-preview.mp4"
                        poster="/videos/ludo-thumb.jpg"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-4 pointer-events-none">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-emerald-400 text-[11px] font-semibold border border-emerald-500/30 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Synced • 1080p
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-slate-200 text-[11px] font-medium border border-white/10">
                            Movie Night
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span>01:14:28 / 02:08:45</span>
                          <span className="text-rose-300 font-medium">Both watching together</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs">
                          Y
                        </div>
                        <div>
                          <p className="font-semibold text-white">You</p>
                          <p className="text-[10px] text-slate-400">Webcam active</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
                          A
                        </div>
                        <div>
                          <p className="font-semibold text-white">Alex</p>
                          <p className="text-[10px] text-slate-400">Webcam active</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeHeroTab === 'games' && (
                  <div className="space-y-4">
                    <div className="aspect-video w-full rounded-2xl bg-gradient-to-tr from-[#111928] to-[#1f293d] border border-white/10 relative overflow-hidden flex items-center justify-center">
                      <video
                        src="/videos/pool-preview.mp4"
                        poster="/videos/pool-thumb.jpg"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 pointer-events-none">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">8-Ball Pool Shootout</span>
                          <span className="text-amber-400 font-mono">You: 2 • Alex: 1</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-slate-300">
                      <div className="p-2 rounded-xl bg-white/[0.04] border border-white/5">3D Ludo</div>
                      <div className="p-2 rounded-xl bg-white/[0.04] border border-white/5">Master Chess</div>
                      <div className="p-2 rounded-xl bg-white/[0.04] border border-white/5">Classic Uno</div>
                    </div>
                  </div>
                )}

                {activeHeroTab === 'chat' && (
                  <div className="space-y-3">
                    <div className="h-48 sm:h-56 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 flex flex-col justify-end gap-2.5 font-sans">
                      <div className="self-start max-w-[80%] px-3.5 py-2 rounded-2xl rounded-bl-sm bg-white/[0.08] border border-white/10 text-xs text-slate-200">
                        Can&apos;t wait for movie night tonight! Got the popcorn ready.
                      </div>
                      <div className="self-end max-w-[80%] px-3.5 py-2 rounded-2xl rounded-br-sm bg-gradient-to-r from-rose-500 to-pink-600 text-xs text-white">
                        Just queued up the film in our room! Joining now.
                      </div>
                      <div className="text-[10px] text-slate-500 self-end font-mono">
                        Seen 10:42 PM
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5 text-rose-300">
                        <MapPin size={13} />
                        <span>Distance: 1,240 km apart</span>
                      </span>
                      <span>Next reunion: 18 days left</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </section>

        {/* ======================================================== */}
        {/* 3. HOW IT WORKS (3 SIMPLE STEPS)                         */}
        {/* ======================================================== */}
        <section id="how-it-works" className="py-20 sm:py-28 px-4 sm:px-6 max-w-5xl mx-auto border-t border-white/[0.06]">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-400">Simple 3-Step Setup</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
              Ready in less than 30 seconds
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-3">
              No software installations, no complex server setups, no hassle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="p-6 sm:p-7 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-rose-500/30 transition-colors flex flex-col justify-between"
              >
                <div>
                  <span className="font-display text-2xl font-black text-rose-400/60 block mb-3">
                    {item.step}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4. FEATURE SHOWCASE (ALTERNATING SCREENSHOT + TEXT ROWS) */}
        {/* ======================================================== */}
        <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 max-w-6xl mx-auto border-t border-white/[0.06] space-y-24">
          
          <div className="text-center max-w-2xl mx-auto mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-400">Everything Built In</span>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight mt-2">
              All your shared activities in one place
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-3">
              Designed specifically for long-distance couples to replace cluttered app-switching.
            </p>
          </div>

          {FEATURE_SHOWCASE.map((feature, index) => {
            const isReversed = index % 2 === 1;
            return (
              <div
                key={feature.id}
                className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-10 lg:gap-14`}
              >
                {/* Text Column */}
                <div className="w-full lg:w-1/2 space-y-5 text-left">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    {feature.tag}
                  </span>
                  <h3 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-[65ch]">
                    {feature.description}
                  </p>

                  <ul className="space-y-2.5 pt-2">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                        <div className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={11} />
                        </div>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-3">
                    <Link
                      href={feature.ctaLink}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white font-semibold text-xs sm:text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      <span>{feature.ctaText}</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>

                {/* Visual / Media Column */}
                <div className="w-full lg:w-1/2">
                  <div className="rounded-2xl p-2 bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-2xl">
                    <div className="rounded-xl overflow-hidden aspect-video bg-[#121224] relative flex items-center justify-center">
                      <video
                        src={feature.videoSrc}
                        poster={feature.posterSrc}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        </section>

        {/* ======================================================== */}
        {/* 5. SQUADS SECTION (SHORT, SECONDARY)                     */}
        {/* ======================================================== */}
        <section id="squads" className="py-16 sm:py-24 px-4 sm:px-6 max-w-4xl mx-auto border-t border-white/[0.06]">
          <div className="p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-[#18182f] to-[#121224] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 text-left">
            <div className="space-y-3 max-w-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Also Great for Close Circles
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Have a friend squad too? Create dedicated spaces.
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                You can switch anytime between your intimate Couple space and your Friend game room without losing your chat logs, goals, or reunion countdowns.
              </p>
            </div>

            <div className="shrink-0 w-full md:w-auto">
              <Link
                href="/register"
                className="w-full md:w-auto px-6 py-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <span>Create a Squad Lounge</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 6. COMPARISON TABLE                                      */}
        {/* ======================================================== */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 max-w-4xl mx-auto border-t border-white/[0.06]">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-400">The Problem Solved</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
              Using 5 separate apps vs After Party
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-3">
              Stop juggling WhatsApp, Netflix Party, Ludo King, FaceTime, and Maps.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden shadow-xl">
            <div className="grid grid-cols-3 p-4 sm:p-5 bg-white/[0.03] border-b border-white/[0.08] text-xs font-bold text-slate-300">
              <div>Capability</div>
              <div className="text-slate-400 text-center">Using 5 Separate Apps</div>
              <div className="text-rose-400 text-center font-bold">After Party</div>
            </div>

            <div className="divide-y divide-white/[0.04] text-xs sm:text-sm">
              {COMPARISON_ROWS.map((row) => (
                <div key={row.feature} className="grid grid-cols-3 p-4 sm:p-5 items-center gap-2">
                  <span className="font-medium text-white">{row.feature}</span>
                  <div className="flex items-center justify-center gap-1.5 text-slate-400 text-center">
                    <Minus size={14} className="text-rose-400/80 shrink-0" />
                    <span className="text-xs">{row.other}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-center font-medium">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span className="text-xs">{row.afterParty}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 7. PRIVACY & TRUST SECTION                               */}
        {/* ======================================================== */}
        <section id="privacy" className="py-20 sm:py-28 px-4 sm:px-6 max-w-4xl mx-auto border-t border-white/[0.06]">
          <div className="p-8 sm:p-12 rounded-3xl bg-[#141426] border border-white/[0.08] text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
              <ShieldCheck size={14} />
              <span>Honest Privacy Architecture</span>
            </div>

            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              A private digital sanctuary, not an advertising platform.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs sm:text-sm text-slate-300">
              <div className="space-y-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Lock size={15} className="text-rose-400" />
                  <span>Private Rooms Only</span>
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Rooms are strictly accessible via invite code. There is no public user directory, search bar, or follower mechanism.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Phone size={15} className="text-rose-400" />
                  <span>Peer-to-Peer Calling</span>
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Audio and video streams route directly between devices via WebRTC peer-to-peer protocols without passing through video recording servers.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <MapPin size={15} className="text-rose-400" />
                  <span>Ephemeral Location Sharing</span>
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Location coordinates are transmitted live over socket streams and are never permanently stored in the database. You can stop sharing at any second.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Sparkles size={15} className="text-rose-400" />
                  <span>No Ads or Data Brokering</span>
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  We don&apos;t run third-party advertising trackers or sell your personal conversations to brokers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 8. EARLY ACCESS & SOCIAL PROOF                           */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-4xl mx-auto border-t border-white/[0.06] text-center">
          <div className="p-8 sm:p-10 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
            <div className="flex items-center justify-center gap-1 text-rose-400">
              {[...Array(5)].map((_, i) => (
                <Heart key={i} size={15} className="fill-rose-400 text-rose-400" />
              ))}
            </div>
            <blockquote className="text-base sm:text-xl font-medium text-slate-200 italic max-w-2xl mx-auto leading-relaxed">
              &ldquo;Being in different time zones is hard, but hopping into our room to watch YouTube and play a round of 8-ball makes us feel like we are sitting on the same couch.&rdquo;
            </blockquote>
            <p className="text-xs font-semibold text-slate-400">
              — Early Access Couple (London & New York)
            </p>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 9. ACCESSIBLE FAQ ACCORDION                              */}
        {/* ======================================================== */}
        <section id="faqs" className="py-20 sm:py-28 px-4 sm:px-6 max-w-3xl mx-auto border-t border-white/[0.06]">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-400">Common Questions</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-3 text-left">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${idx}`}
                    className="w-full p-5 text-left flex items-center justify-between text-sm sm:text-base font-bold text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform duration-200 shrink-0 ml-4 ${
                        isOpen ? 'rotate-180 text-rose-400' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-answer-${idx}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/[0.04] pt-3">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* ======================================================== */}
        {/* 10. FINAL CALL TO ACTION                                 */}
        {/* ======================================================== */}
        <section className="py-20 px-4 sm:px-6 max-w-4xl mx-auto text-center">
          <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-[#22132d] via-[#1a1226] to-[#120f20] border border-rose-500/30 shadow-[0_20px_70px_rgba(244,63,94,0.2)] relative overflow-hidden">
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
              Start your private couple space today.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-8">
              No apps to download. Create your space for free, send your partner the room code, and start hanging out.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <span>Start your space, free</span>
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/room/setup"
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-semibold text-base border border-white/10 transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <span>Join with room code</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ======================================================== */}
      {/* 11. FOOTER                                               */}
      {/* ======================================================== */}
      <footer className="border-t border-white/[0.08] py-12 px-4 sm:px-6 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-2.5">
          <Heart size={15} className="text-rose-400 fill-rose-400/20" />
          <span className="font-bold text-white tracking-wide">AFTER PARTY</span>
          <span>• Private Virtual Lounge for Long-Distance Couples</span>
        </div>

        <nav aria-label="Footer links" className="flex items-center gap-6">
          <Link href="/login" className="hover:text-slate-300 transition-colors">Sign In</Link>
          <Link href="/register" className="hover:text-slate-300 transition-colors">Register</Link>
          <Link href="/room/setup" className="hover:text-slate-300 transition-colors">Join Space</Link>
        </nav>

        <div>
          © {new Date().getFullYear()} After Party. Built for real intimacy.
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 12. MOBILE STICKY BOTTOM BAR (AFTER HERO SCROLLS OUT)    */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showStickyCta && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-[#0f0f1a]/95 backdrop-blur-xl border-t border-white/10 flex items-center gap-2.5 shadow-[0_-10px_25px_rgba(0,0,0,0.8)]"
          >
            <Link
              href="/register"
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-center text-xs sm:text-sm shadow-md active:scale-95 transition-transform"
            >
              Start your space, free
            </Link>
            <Link
              href="/room/setup"
              className="py-3 px-3.5 rounded-xl bg-white/[0.08] text-white font-medium text-xs border border-white/10 shrink-0"
            >
              Enter Code
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
