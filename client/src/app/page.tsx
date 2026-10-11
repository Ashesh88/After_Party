'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Sparkles, Clapperboard, Gamepad2, MessageCircle, 
  Phone, Video, ShieldCheck, MapPin, Layers, Users, ArrowRight, 
  Check, ChevronDown, Lock, Radio, Zap, Flame, Smile, Play, Globe, EyeOff
} from 'lucide-react';

const FEATURES = [
  {
    icon: Clapperboard,
    color: 'from-pink-500 to-rose-500',
    borderColor: 'border-pink-500/30',
    title: 'Synchronized Watch Party',
    description: 'Stream YouTube videos and movies together in sub-millisecond sync with floating emoji reactions and live webcam tiles.',
    tag: 'Watch Together',
  },
  {
    icon: Gamepad2,
    color: 'from-purple-500 to-indigo-500',
    borderColor: 'border-purple-500/30',
    title: 'Full Multiplayer Arcade',
    description: 'Play live 8-Ball Pool, 4-player Ludo, Master Chess, Uno, Carrom, Quizzes, and spicy Truth or Dare directly in your room.',
    tag: 'Instant Games',
  },
  {
    icon: MessageCircle,
    color: 'from-pink-500 to-purple-600',
    borderColor: 'border-pink-500/30',
    title: 'Private Direct & Spaces Chat',
    description: 'Private 1-on-1 direct messaging and shared space group chats with voice notes, photo sharing, live typing, and read receipts.',
    tag: 'Private Chat',
  },
  {
    icon: Phone,
    color: 'from-emerald-500 to-teal-500',
    borderColor: 'border-emerald-500/30',
    title: '1-Tap HD Voice & Video Calls',
    description: 'Peer-to-peer WebRTC encrypted calls built right into your lounge — no external apps, links, or meeting codes required.',
    tag: 'Crystal Clear Audio',
  },
  {
    icon: Layers,
    color: 'from-indigo-500 to-pink-500',
    borderColor: 'border-indigo-500/30',
    title: 'Multi-Space Switcher',
    description: 'Save different dedicated spaces ("Love Nest 💕" with partner vs "Squad Lounge 🎮" with friends) and switch anytime without losing data.',
    tag: 'Zero Data Loss',
  },
  {
    icon: MapPin,
    color: 'from-cyan-500 to-blue-500',
    borderColor: 'border-cyan-500/30',
    title: 'Live Proximity & Location Radar',
    description: 'See live distance in km/miles between you and your partner with romantic heart markers and privacy-first location sharing.',
    tag: 'Distance Tracker',
  },
];

const AUDIENCES = [
  {
    emoji: '💕',
    title: 'Long-Distance & Couples',
    subtitle: 'Close the physical gap with shared intimate rituals',
    points: [
      'Synchronized movie nights with live webcam reactions',
      'Countdown capsule to your next reunion date',
      'Interactive mood atmosphere sync (Romantic, playful, cozy)',
      'Haptic heartbeat pulse across screens with custom tones',
    ],
    gradient: 'from-pink-500/20 via-rose-500/15 to-purple-500/20',
    border: 'border-pink-500/30',
    accentText: 'text-pink-400',
  },
  {
    emoji: '🎮',
    title: 'Best Friends & Squads',
    subtitle: 'The private virtual lounge away from chaotic social media',
    points: [
      'Multiplayer 8-Ball Pool, Ludo, Uno, Carrom, and Chess',
      'Casual walkie-talkie audio lounge with live streaming',
      'Spicy Truth or Dare and "How well do you know me" quizzes',
      'Shared group space with dedicated nicknames and goals',
    ],
    gradient: 'from-purple-500/20 via-indigo-500/15 to-pink-500/20',
    border: 'border-purple-500/30',
    accentText: 'text-purple-400',
  },
  {
    emoji: '🔒',
    title: 'Privacy Purists',
    subtitle: 'Zero feeds, zero algorithms, and zero strangers',
    points: [
      'Only invited connections with verified User IDs can enter',
      'No public follower counts, vanity metrics, or ads',
      'Switch spaces seamlessly without losing chat notes or goals',
      'End-to-end peer-to-peer real-time encrypted connection',
    ],
    gradient: 'from-cyan-500/20 via-teal-500/15 to-emerald-500/20',
    border: 'border-cyan-500/30',
    accentText: 'text-cyan-400',
  },
];

const FAQS = [
  {
    q: 'What exactly is After Party?',
    a: 'After Party is an all-in-one private virtual lounge designed exclusively for couples, best friends, and close circles. Instead of juggling 5 different apps for movie nights, calling, gaming, and messaging, After Party brings synchronized video streaming, live multiplayer games, voice/video calls, and dedicated spaces into one seamless digital sanctuary.',
  },
  {
    q: 'How does the Watch Party feature sync video?',
    a: 'Our proprietary real-time socket engine coordinates playback actions (play, pause, seek, speed changes) across both participants with millisecond precision. When one partner pauses to grab snacks or seeks forward, the other screen updates instantly.',
  },
  {
    q: 'Can I have multiple rooms (e.g. one with partner, one with best friend)?',
    a: 'Yes! With our Multi-Space Switcher, you can create and name custom spaces (like "Love Nest 💕" and "Squad Lounge 🎮"). You can leave and switch spaces anytime — your countdowns, goals, themes, and chat history remain safely intact without data loss.',
  },
  {
    q: 'Do I have to download an app from Google Play or App Store?',
    a: 'No download is required. After Party is a progressive web app (PWA) that runs instantly in any mobile or desktop browser (Chrome, Safari, etc.). You can also tap "Add to Home Screen" on your phone to get an app icon and native full-screen experience.',
  },
  {
    q: 'Is my chat and location data secure and private?',
    a: '100%. After Party has no public feeds, discoverability, or algorithm. Real-time audio/video calls use WebRTC peer-to-peer encryption, and location data is streamed ephemerally over live sockets and never permanently stored in the database.',
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#070710] text-white selection:bg-pink-500/30 relative overflow-x-hidden font-sans">
      
      {/* Background Ambient Lighting Blobs */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-pink-600/12 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-1/4 w-[500px] h-[500px] bg-purple-600/12 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-1/3 w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* ======================================================== */}
      {/* NAVBAR                                                   */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#070710]/80 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shadow-[0_0_20px_rgba(244,63,142,0.4)] group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0d0d1a] rounded-[14px] flex items-center justify-center">
                <Heart size={20} className="text-pink-400 fill-pink-400/30 animate-pulse" />
              </div>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-purple-300">
                AFTER PARTY
              </span>
              <span className="hidden sm:inline-block text-[9px] font-mono tracking-widest text-slate-400 block -mt-1 uppercase">
                Private Lounge
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-pink-300 transition-colors">Features</a>
            <a href="#audience" className="hover:text-pink-300 transition-colors">Who It's For</a>
            <a href="#games" className="hover:text-pink-300 transition-colors">Arcade & Watch</a>
            <a href="#faqs" className="hover:text-pink-300 transition-colors">FAQs</a>
          </nav>

          {/* Right Action CTA Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 sm:px-5 py-2.5 rounded-2xl btn-sexy text-xs sm:text-sm font-bold text-white shadow-[0_0_20px_rgba(244,63,142,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* HERO SECTION                                             */}
      {/* ======================================================== */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Glow badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-transparent border border-pink-500/30 text-pink-300 text-xs font-semibold mb-6 shadow-[0_0_20px_rgba(244,63,142,0.15)]"
        >
          <Sparkles size={14} className="text-pink-400 animate-spin [animation-duration:8s]" />
          <span>The Private Virtual Lounge for You & Your Inner Circle</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.08] max-w-5xl mx-auto"
        >
          Where Distance Disappears &{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400 drop-shadow-[0_4px_25px_rgba(244,63,142,0.4)]">
            Closeness Begins.
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mt-6 leading-relaxed"
        >
          Stream movies in sub-millisecond sync, challenge each other in live multiplayer games, share intimate notes, and talk in encrypted spaces — with <strong>zero algorithms, ads, or public noise</strong>.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-9"
        >
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl btn-sexy text-white font-extrabold text-sm sm:text-base shadow-[0_10px_30px_rgba(244,63,142,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Start Your Space Free</span>
            <ArrowRight size={17} />
          </Link>
          <Link
            href="/room/setup"
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2"
          >
            <Layers size={17} className="text-purple-400" />
            <span>Join with Room Code</span>
          </Link>
        </motion.div>

        {/* Micro Trust Indicators */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 mt-8 text-xs text-slate-400 font-medium flex-wrap">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={15} className="text-emerald-400" />
            <span>100% Private & Encrypted</span>
          </span>
          <span className="flex items-center gap-1.5">
            <EyeOff size={15} className="text-pink-400" />
            <span>Zero Public Feeds or Ads</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Globe size={15} className="text-cyan-400" />
            <span>Works on Any Mobile or PC</span>
          </span>
        </div>

        {/* ======================================================== */}
        {/* INTERACTIVE MOCKUP SHOWCASE CARD                         */}
        {/* ======================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-14 max-w-5xl mx-auto rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.9)]"
        >
          <div className="rounded-[22px] bg-[#0c0d18] border border-white/[0.06] overflow-hidden p-4 sm:p-7 text-left space-y-6">
            
            {/* Top Mockup Bar */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md">
                  AP
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                    <span>Private Space: Love Nest</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Connected
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">Synchronized Lounge with Ashesh & Partner</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold hidden sm:inline-flex items-center gap-1.5">
                  <Flame size={14} className="text-pink-400" />
                  <span>Mood: Romantic Glow</span>
                </span>
              </div>
            </div>

            {/* 3 Split Interactive Cards in Mockup */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card 1: Watch Together */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clapperboard size={14} />
                    <span>Watch Together</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">Synced 0.0ms</span>
                </div>
                <div className="h-28 rounded-xl bg-gradient-to-tr from-purple-950/60 to-pink-950/60 border border-white/5 flex flex-col items-center justify-center text-center p-3 relative overflow-hidden group">
                  <Play size={28} className="text-pink-400 fill-pink-400/40 mb-1" />
                  <span className="text-xs font-semibold text-white">Interstellar (2014)</span>
                  <span className="text-[10px] text-slate-400">1:42:15 / 2:49:00 • 1080p HD</span>
                </div>
              </div>

              {/* Card 2: Multiplayer Arcade */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Gamepad2 size={14} />
                    <span>Live Game Room</span>
                  </span>
                  <span className="text-[10px] text-pink-400 font-bold">Round 3</span>
                </div>
                <div className="h-28 rounded-xl bg-gradient-to-tr from-indigo-950/60 to-purple-950/60 border border-white/5 flex flex-col items-center justify-center text-center p-3">
                  <span className="text-2xl mb-1">🎱</span>
                  <span className="text-xs font-semibold text-white">8-Ball Pool Shootout</span>
                  <span className="text-[10px] text-purple-300 font-mono mt-0.5">Ashesh: 2 • Partner: 1</span>
                </div>
              </div>

              {/* Card 3: Encrypted Direct Chat */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageCircle size={14} />
                    <span>Live Messages</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">10:42 PM</span>
                </div>
                <div className="h-28 rounded-xl bg-gradient-to-tr from-pink-950/40 via-purple-950/40 to-slate-900 border border-white/5 p-3 flex flex-col justify-end space-y-1.5">
                  <div className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-[11px] font-medium self-end flex items-center gap-1">
                    <span>Miss you so much! 💕</span>
                    <Check size={12} className="text-cyan-300" />
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono self-end">Delivered & Seen</span>
                </div>
              </div>

            </div>

          </div>
        </motion.div>
      </section>

      {/* ======================================================== */}
      {/* WHO IS AFTER PARTY FOR? (AUDIENCE SECTION)               */}
      {/* ======================================================== */}
      <section id="audience" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-pink-400">Designed for True Intimacy</span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-2">
            Built for Two & Your Inner Circle.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-4">
            Most social apps are optimized for public feeds, ads, and strangers. After Party is built for the people who actually matter to you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {AUDIENCES.map((aud, idx) => (
            <motion.div
              key={aud.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className={`p-7 rounded-3xl bg-gradient-to-b ${aud.gradient} border ${aud.border} shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col justify-between`}
            >
              <div>
                <span className="text-4xl mb-4 block">{aud.emoji}</span>
                <h3 className="text-xl font-bold text-white mb-2">{aud.title}</h3>
                <p className="text-xs text-slate-300 mb-6 leading-relaxed">{aud.subtitle}</p>

                <ul className="space-y-3">
                  {aud.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={10} className={aud.accentText} />
                      </div>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-white/[0.08]">
                <Link
                  href="/register"
                  className={`text-xs font-bold ${aud.accentText} hover:underline flex items-center gap-1`}
                >
                  <span>Experience this Space</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* FEATURES SHOWCASE GRID                                   */}
      {/* ======================================================== */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-purple-400">Everything in One Place</span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-2">
            No Juggling 5 Different Apps.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-4">
            Everything you need to spend quality time together online — beautifully integrated into a zero-distraction lounge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`p-6 sm:p-7 rounded-3xl glass-panel border ${feat.borderColor} hover:scale-[1.02] transition-transform shadow-[0_15px_40px_rgba(0,0,0,0.6)] group`}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${feat.color} flex items-center justify-center text-white mb-5 shadow-lg group-hover:rotate-6 transition-transform`}>
                  <Icon size={22} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                  {feat.tag}
                </span>
                <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feat.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* COMPARISON TABLE: ORDINARY APPS VS AFTER PARTY           */}
      {/* ======================================================== */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-white/[0.06]">
        <div className="text-center mb-14">
          <span className="text-xs font-extrabold uppercase tracking-widest text-pink-400">Why It's Different</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">
            Standard Social Apps vs After Party
          </h2>
        </div>

        <div className="rounded-3xl glass-panel border border-white/[0.1] overflow-hidden shadow-2xl">
          <div className="grid grid-cols-3 p-4 sm:p-5 bg-white/[0.04] border-b border-white/[0.08] text-xs font-black uppercase tracking-wider text-slate-300">
            <div>Feature</div>
            <div className="text-slate-500 text-center">Instagram / Discord</div>
            <div className="text-pink-400 text-center font-extrabold">After Party</div>
          </div>

          <div className="divide-y divide-white/[0.04] text-xs">
            <div className="grid grid-cols-3 p-4 sm:p-5 items-center">
              <span className="font-semibold text-white">Synchronized Video Watch</span>
              <span className="text-slate-500 text-center">❌ Third-party bots / Screenshare</span>
              <span className="text-emerald-400 text-center font-bold">✅ Built-in Native Player</span>
            </div>

            <div className="grid grid-cols-3 p-4 sm:p-5 items-center">
              <span className="font-semibold text-white">Live Multiplayer Arcade</span>
              <span className="text-slate-500 text-center">❌ Must download separate apps</span>
              <span className="text-emerald-400 text-center font-bold">✅ 8-Ball, Ludo, Chess, Uno in 1 Tap</span>
            </div>

            <div className="grid grid-cols-3 p-4 sm:p-5 items-center">
              <span className="font-semibold text-white">Saved Spaces (Multi-Room)</span>
              <span className="text-slate-500 text-center">❌ Messy servers & public lists</span>
              <span className="text-emerald-400 text-center font-bold">✅ 1-Click Switch Without Data Loss</span>
            </div>

            <div className="grid grid-cols-3 p-4 sm:p-5 items-center">
              <span className="font-semibold text-white">Algorithms & Strangers</span>
              <span className="text-rose-400 text-center font-bold">⚠️ Feeds, doomscrolling & ads</span>
              <span className="text-emerald-400 text-center font-bold">✅ 100% Private Sacred Space</span>
            </div>

            <div className="grid grid-cols-3 p-4 sm:p-5 items-center">
              <span className="font-semibold text-white">Distance & Proximity Radar</span>
              <span className="text-slate-500 text-center">❌ Not supported</span>
              <span className="text-emerald-400 text-center font-bold">✅ Real-time Radar with Hearts</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* FAQS SECTION                                             */}
      {/* ======================================================== */}
      <section id="faqs" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-white/[0.06]">
        <div className="text-center mb-14">
          <span className="text-xs font-extrabold uppercase tracking-widest text-pink-400">Got Questions?</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.q}
                className="rounded-2xl glass-panel border border-white/[0.08] overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between text-sm sm:text-base font-bold text-white cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-pink-400' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
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
      {/* FINAL CALL TO ACTION                                     */}
      {/* ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-r from-pink-900/40 via-purple-900/30 to-rose-900/40 border border-pink-500/30 shadow-[0_30px_90px_rgba(244,63,142,0.25)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Ready to Build Your Private Space?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Create your lounge in 30 seconds. Invite your partner or squad with a single code and start hanging out today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl btn-sexy text-white font-extrabold text-sm sm:text-base shadow-[0_10px_30px_rgba(244,63,142,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Create Free Lounge</span>
              <ArrowRight size={17} />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-bold text-sm sm:text-base transition-all flex items-center justify-center"
            >
              <span>Sign In to Space</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* FOOTER                                                   */}
      {/* ======================================================== */}
      <footer className="border-t border-white/[0.08] py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-2.5">
          <Heart size={16} className="text-pink-400 fill-pink-400/20" />
          <span className="font-bold text-white">AFTER PARTY</span>
          <span>• Private Virtual Lounge for Connections</span>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/login" className="hover:text-slate-300 transition-colors">Sign In</Link>
          <Link href="/register" className="hover:text-slate-300 transition-colors">Register</Link>
          <Link href="/room/setup" className="hover:text-slate-300 transition-colors">Join Space</Link>
        </div>

        <div>
          © {new Date().getFullYear()} After Party. Built with love for real connection.
        </div>
      </footer>

    </div>
  );
}
