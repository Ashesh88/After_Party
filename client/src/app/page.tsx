import Link from 'next/link';
import Image from 'next/image';
import {
  Heart,
  ShieldCheck,
  Radio,
  Smartphone,
  ArrowRight,
  Check,
  Minus,
  Lock,
  Phone,
  MapPin,
  Sparkles,
} from 'lucide-react';

import LandingHeader from '../components/landing/LandingHeader';
import HeroTabs from '../components/landing/HeroTabs';
import FaqAccordion, { FaqItem } from '../components/landing/FaqAccordion';
import StickyCta from '../components/landing/StickyCta';
import LazyVideo from '../components/landing/LazyVideo';

// 3 Simple Steps for "How it works"
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

// Feature showcase items (alternating media + text, max 3 bullets each)
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
    videoSrc: '/videos/watch-preview.mp4',
    ctaText: 'Start a Watch Party',
    ctaLink: '/register',
  },
  {
    id: 'games',
    tag: '3D Arcade Games',
    title: 'Challenge each other in real-time games.',
    description: 'Play 8-Ball Pool, 3D Ludo, Chess, Card Game, and Carrom directly inside your browser. No separate downloads or account registrations required.',
    bullets: [
      'Live multiplayer with real-time physics',
      'Interactive 3D board, dice, and pieces',
      'In-game audio, quick reactions, and rematch stats',
    ],
    videoSrc: '/videos/pool-preview.mp4',
    posterSrc: '/videos/pool-thumb.jpg',
    ctaText: 'Explore the Game Room',
    ctaLink: '/register',
  },
  {
    id: 'calls',
    tag: 'Private Chat & Calls',
    title: 'Talk face-to-face with crystal clear WebRTC calls.',
    description: 'One-tap voice and video calls built right into your room. Direct connection between your devices with zero meeting links or Zoom limits.',
    bullets: [
      'Direct peer-to-peer WebRTC video and audio',
      'Front and rear camera flip on mobile phones',
      'Integrated chat with photos, seen ticks, and voice notes',
    ],
    videoSrc: '/videos/carrom-preview.mp4',
    posterSrc: '/videos/carrom-thumb.jpg',
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
      'Ephemeral live socket stream — never stored in the database',
      'Countdown capsule to your next planned reunion date',
    ],
    imageSrc: '/distance-radar.svg',
    imageAlt: 'Proximity Radar showing real-time distance and heart markers between partners',
    ctaText: 'Create Your Couple Space',
    ctaLink: '/register',
  },
];

// Comparison table data
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
    other: 'Both must download separate apps',
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

// FAQ items
const FAQS: FaqItem[] = [
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
    a: 'Currently, After Party natively supports YouTube video URLs as well as direct MP4 video streams. You can paste any public or unlisted YouTube link to watch together with synced playback, live reactions, and voice/video overlay.',
  },
];

export default function LandingPage() {
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

      {/* 1. HEADER / NAVBAR (Extracted Client Component) */}
      <LandingHeader />

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

          {/* Headline (Exact 8-word H1) */}
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.08] max-w-4xl mx-auto">
            Close the physical distance between you two.
          </h1>

          {/* Subheadline (Exact copy requirement) */}
          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mt-6 leading-relaxed max-w-[65ch]">
            Watch movies, play games and talk privately with your partner, in perfect sync, from anywhere.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8 sm:mt-10">
            <Link
              href="/register"
              className="w-full sm:w-auto min-h-[48px] px-7 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-base shadow-[0_8px_30px_rgba(244,63,94,0.35)] hover:shadow-[0_8px_35px_rgba(244,63,94,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <span>Start your space, free</span>
              <ArrowRight size={17} />
            </Link>
            <Link
              href="/room/setup"
              className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white font-semibold text-base transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <span>Join with room code</span>
            </Link>
          </div>

          {/* Small Honest Assurance Line under CTAs */}
          <p className="text-xs sm:text-sm text-slate-400 mt-3.5">
            No app download needed. Works in your browser on phone and PC.
          </p>

          {/* Single Subtle Trust Row */}
          <div className="flex items-center justify-center gap-6 sm:gap-8 mt-7 text-xs sm:text-sm text-slate-300 font-medium flex-wrap">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-rose-400" />
              <span>Private invite-only rooms</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Radio size={15} className="text-emerald-400" />
              <span>Stays in sync within a fraction of a second</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Smartphone size={15} className="text-slate-300" />
              <span>Free to use on any device</span>
            </span>
          </div>

          {/* REAL POLISHED DEVICE FRAME (Extracted Accessible Client Component) */}
          <HeroTabs />

        </section>

        {/* ======================================================== */}
        {/* 3. HOW IT WORKS (3 SIMPLE STEPS)                         */}
        {/* ======================================================== */}
        <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-28 px-4 sm:px-6 max-w-5xl mx-auto border-t border-white/[0.08]">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-400">Simple 3-Step Setup</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
              Ready in less than 30 seconds
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-3 max-w-[65ch] mx-auto">
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
                  <span className="font-display text-2xl font-black text-rose-400/80 block mb-3">
                    {item.step}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4. FEATURE SHOWCASE (ALTERNATING MEDIA + TEXT ROWS)       */}
        {/* ======================================================== */}
        <section id="features" className="scroll-mt-24 py-20 sm:py-28 px-4 sm:px-6 max-w-6xl mx-auto border-t border-white/[0.08] space-y-24">
          
          <div className="text-center max-w-2xl mx-auto mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-400">Everything Built In</span>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight mt-2">
              All your shared activities in one place
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-3 max-w-[65ch] mx-auto">
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
                  <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-[65ch]">
                    {feature.description}
                  </p>

                  <ul className="space-y-2.5 pt-2">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
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
                      className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white font-semibold text-xs sm:text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
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
                      {feature.videoSrc ? (
                        <LazyVideo
                          src={feature.videoSrc}
                          poster={feature.posterSrc}
                          ariaLabel={`${feature.tag} live demonstration video`}
                        />
                      ) : (
                        <Image
                          src={feature.imageSrc || '/distance-radar.svg'}
                          alt={feature.imageAlt || feature.title}
                          width={800}
                          height={450}
                          className="w-full h-full object-cover"
                        />
                      )}
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
        <section id="squads" className="scroll-mt-24 py-16 sm:py-24 px-4 sm:px-6 max-w-4xl mx-auto border-t border-white/[0.08]">
          <div className="p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-[#18182f] to-[#121224] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 text-left">
            <div className="space-y-3 max-w-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Also Great for Close Circles
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Have a friend squad too? Create dedicated spaces.
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-[65ch]">
                You can switch anytime between your intimate Couple space and your Friend game room without losing your chat logs, goals, or reunion countdowns.
              </p>
            </div>

            <div className="shrink-0 w-full md:w-auto">
              <Link
                href="/register"
                className="w-full md:w-auto min-h-[44px] px-6 py-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 font-semibold text-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <span>Create a Squad Lounge</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 6. COMPARISON TABLE: 5 APPS VS AFTER PARTY                */}
        {/* ======================================================== */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 max-w-4xl mx-auto border-t border-white/[0.08]">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-400">The Problem Solved</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
              Using 5 separate apps vs After Party
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-3 max-w-[65ch] mx-auto">
              Stop juggling WhatsApp, Netflix Party, Ludo King, FaceTime, and Maps.
            </p>
          </div>

          {/* Desktop & Tablet: 3-Column Grid Table */}
          <div className="hidden md:block rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden shadow-xl">
            <div className="grid grid-cols-3 p-4 sm:p-5 bg-white/[0.03] border-b border-white/[0.08] text-xs font-bold text-slate-200">
              <div>Capability</div>
              <div className="text-slate-300 text-center">Using 5 Separate Apps</div>
              <div className="text-rose-400 text-center font-bold">After Party</div>
            </div>

            <div className="divide-y divide-white/[0.04] text-xs sm:text-sm">
              {COMPARISON_ROWS.map((row) => (
                <div key={row.feature} className="grid grid-cols-3 p-4 sm:p-5 items-center gap-2">
                  <span className="font-medium text-white">{row.feature}</span>
                  <div className="flex items-center justify-center gap-1.5 text-slate-300 text-center">
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

          {/* Mobile: Stacked Cards (below md) */}
          <div className="md:hidden space-y-4">
            {COMPARISON_ROWS.map((row) => (
              <div key={row.feature} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <h3 className="font-bold text-white text-sm">{row.feature}</h3>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-slate-300 flex items-start gap-2">
                    <Minus size={14} className="text-rose-400 shrink-0 mt-0.5" />
                    <span><strong>5 Separate Apps:</strong> {row.other}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>After Party:</strong> {row.afterParty}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ======================================================== */}
        {/* 7. PRIVACY & TRUST SECTION                               */}
        {/* ======================================================== */}
        <section id="privacy" className="scroll-mt-24 py-20 sm:py-28 px-4 sm:px-6 max-w-4xl mx-auto border-t border-white/[0.08]">
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
                <p className="text-slate-300 leading-relaxed max-w-[65ch]">
                  Rooms are strictly accessible via invite code. There is no public user directory, search bar, or follower mechanism.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Phone size={15} className="text-rose-400" />
                  <span>Peer-to-Peer Calling</span>
                </h3>
                <p className="text-slate-300 leading-relaxed max-w-[65ch]">
                  WebRTC calls go peer-to-peer when possible. A relay server is used only if a direct connection fails.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <MapPin size={15} className="text-rose-400" />
                  <span>Live Location Streaming</span>
                </h3>
                <p className="text-slate-300 leading-relaxed max-w-[65ch]">
                  Location is streamed live over real-time sockets and is never permanently stored in the database.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Sparkles size={15} className="text-rose-400" />
                  <span>No Trackers or Data Brokering</span>
                </h3>
                <p className="text-slate-300 leading-relaxed max-w-[65ch]">
                  We don&apos;t run third-party advertising trackers or sell your personal conversations to brokers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 8. EARLY ACCESS NOTE (HONEST SOCIAL PROOF)               */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-4xl mx-auto border-t border-white/[0.08] text-center">
          <div className="p-8 sm:p-10 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
              <Sparkles size={13} className="text-rose-400" />
              <span>Early access</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Currently in active early access
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              We are constantly refining the experience for long-distance couples. Create your space today and help shape the future of After Party.
            </p>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 9. ACCESSIBLE FAQ ACCORDION (Extracted Client Component) */}
        {/* ======================================================== */}
        <section id="faqs" className="scroll-mt-24 py-20 sm:py-28 px-4 sm:px-6 max-w-3xl mx-auto border-t border-white/[0.08]">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-400">Common Questions</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
              Frequently asked questions
            </h2>
          </div>

          <FaqAccordion items={FAQS} />
        </section>

        {/* ======================================================== */}
        {/* 10. FINAL CALL TO ACTION                                 */}
        {/* ======================================================== */}
        <section className="py-20 px-4 sm:px-6 max-w-4xl mx-auto text-center">
          <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-[#22132d] via-[#1a1226] to-[#120f20] border border-rose-500/30 shadow-[0_20px_70px_rgba(244,63,94,0.2)] relative overflow-hidden">
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
              Start your private couple space today.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-8 max-w-[65ch]">
              No apps to download. Create your space for free, send your partner the room code, and start hanging out.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/register"
                className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <span>Start your space, free</span>
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/room/setup"
                className="w-full sm:w-auto min-h-[48px] px-7 py-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-semibold text-base border border-white/10 transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <span>Join with room code</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ======================================================== */}
      {/* 11. FOOTER (pb-24 on mobile so sticky bar doesn't cover)  */}
      {/* ======================================================== */}
      <footer className="border-t border-white/[0.08] py-12 pb-24 md:pb-12 px-4 sm:px-6 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs sm:text-sm text-slate-400">
        <div className="flex items-center gap-2.5">
          <Heart size={15} className="text-rose-400 fill-rose-400/20" />
          <span className="font-bold text-white tracking-wide">AFTER PARTY</span>
          <span>• Private Virtual Lounge for Long-Distance Couples</span>
        </div>

        <nav aria-label="Footer links" className="flex items-center gap-6">
          <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          <Link href="/register" className="hover:text-white transition-colors">Register</Link>
          <Link href="/room/setup" className="hover:text-white transition-colors">Join Space</Link>
        </nav>

        <div>
          © {new Date().getFullYear()} After Party. Built for real intimacy.
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 12. STICKY MOBILE CTA BAR (Extracted Client Component)   */}
      {/* ======================================================== */}
      <StickyCta />

    </div>
  );
}
