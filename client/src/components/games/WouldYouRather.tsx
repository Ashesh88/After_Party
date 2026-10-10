'use client';
import { useState } from 'react';
import { ArrowLeft, Split, Sparkles, Flame, Laugh, Heart, RotateCcw, MessageCircle } from 'lucide-react';

interface Dilemma {
  id: number;
  category: 'romantic' | 'funny' | 'fantasy' | 'tough';
  optionA: string;
  optionB: string;
  percentA: number;
  percentB: number;
  talkPrompt: string;
}

const DILEMMAS: Dilemma[] = [
  // Romantic & Intimate
  {
    id: 1,
    category: 'romantic',
    optionA: 'Travel the world backpacking together for a whole year',
    optionB: 'Buy and design your dream luxury home together right now',
    percentA: 58,
    percentB: 42,
    talkPrompt: 'Where is the very first country you would want us to visit?'
  },
  {
    id: 2,
    category: 'romantic',
    optionA: 'Have a private romantic dinner under the stars on a beach',
    optionB: 'Have a cozy movie marathon with blankets and endless snacks',
    percentA: 52,
    percentB: 48,
    talkPrompt: 'What movie or cuisine would you pick for tonight?'
  },
  {
    id: 3,
    category: 'romantic',
    optionA: 'Always know whenever your partner is thinking about you',
    optionB: 'Have the power to instantly teleport to your partner anytime',
    percentA: 28,
    percentB: 72,
    talkPrompt: 'How often would you use the teleport button on me?'
  },
  {
    id: 4,
    category: 'romantic',
    optionA: 'Relive our favorite memory together once every month',
    optionB: 'Guarantee that we will create an even better new memory every single week',
    percentA: 22,
    percentB: 78,
    talkPrompt: 'What is our #1 favorite memory so far in your mind?'
  },

  // Funny & Absurd
  {
    id: 5,
    category: 'funny',
    optionA: 'Have to sing everything you want to say for an entire day',
    optionB: 'Have to dance every time someone says your name',
    percentA: 64,
    percentB: 36,
    talkPrompt: 'Sing your answer right now in opera style!'
  },
  {
    id: 6,
    category: 'funny',
    optionA: 'Only be able to whisper for the rest of your life',
    optionB: 'Only be able to shout whenever you get excited',
    percentA: 47,
    percentB: 53,
    talkPrompt: 'Whisper a secret or shout your favorite food right now!'
  },
  {
    id: 7,
    category: 'funny',
    optionA: 'Have hiccups that never stop for 2 hours',
    optionB: 'Feel like you are about to sneeze every 10 minutes without sneezing',
    percentA: 71,
    percentB: 29,
    talkPrompt: 'The phantom sneeze is truly the worst torture known to humankind!'
  },
  {
    id: 8,
    category: 'funny',
    optionA: 'Accidentally send an embarrassing selfie to your family group chat',
    optionB: 'Accidentally reply to your boss with "Love you, goodnight!"',
    percentA: 43,
    percentB: 57,
    talkPrompt: 'How would you explain either of these tomorrow morning?'
  },

  // Fantasy & Superpowers
  {
    id: 9,
    category: 'fantasy',
    optionA: 'Be able to read minds, but only when people are thinking about food',
    optionB: 'Be able to become invisible, but only when nobody is looking directly at you',
    percentA: 62,
    percentB: 38,
    talkPrompt: 'Knowing what everyone craves to eat is actually a superpower at dinner!'
  },
  {
    id: 10,
    category: 'fantasy',
    optionA: 'Have unlimited free flights anywhere in the world for life',
    optionB: 'Never have to pay for any meal or restaurant bill ever again',
    percentA: 55,
    percentB: 45,
    talkPrompt: 'Would you rather travel the globe or dine like royalty every single night?'
  },
  {
    id: 11,
    category: 'fantasy',
    optionA: 'Be able to pause time for 10 minutes whenever you want',
    optionB: 'Be able to rewind time by 30 seconds once per day',
    percentA: 68,
    percentB: 32,
    talkPrompt: 'Think of all the awkward moments 30 seconds rewind could fix!'
  },

  // Tough Decisions
  {
    id: 12,
    category: 'tough',
    optionA: 'Lose the ability to use your smartphone for an entire month',
    optionB: 'Not be allowed to listen to any music or podcasts for 6 months',
    percentA: 39,
    percentB: 61,
    talkPrompt: 'Could you genuinely survive 30 days with a flip phone?'
  },
  {
    id: 13,
    category: 'tough',
    optionA: 'Know the exact date and year of your future retirement',
    optionB: 'Know the exact secret passion that will make you happiest in life',
    percentA: 19,
    percentB: 81,
    talkPrompt: 'What passion do you think you would love discovering?'
  }
];

class WouldAudio {
  private ctx: AudioContext | null = null;
  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  playPick() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }
}

const wouldAudio = new WouldAudio();

export default function WouldYouRather({ onBack }: { onBack: () => void }) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'romantic' | 'funny' | 'fantasy' | 'tough'>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);

  const filteredPool = DILEMMAS.filter(d => categoryFilter === 'all' || d.category === categoryFilter);
  const currentDilemma = filteredPool[currentIndex % filteredPool.length] || DILEMMAS[0];

  const handleChoose = (choice: 'A' | 'B') => {
    if (selectedChoice) return;
    setSelectedChoice(choice);
    setAnsweredCount(prev => prev + 1);
    wouldAudio.playPick();
  };

  const handleNext = () => {
    setSelectedChoice(null);
    setCurrentIndex(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070b15] flex flex-col justify-between p-4 sm:p-6 select-none overflow-y-auto">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between max-w-md w-full mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Arcade</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Would You Rather 🤔
          </span>
        </div>

        <div className="text-xs font-bold text-slate-300 bg-white/[0.06] px-3 py-1 rounded-full border border-white/10">
          <span>{answeredCount} Answered</span>
        </div>
      </header>

      {/* Category Pills Bar */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 my-2 max-w-md w-full mx-auto overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All', icon: Sparkles },
          { id: 'romantic', label: 'Romance', icon: Heart },
          { id: 'funny', label: 'Funny', icon: Laugh },
          { id: 'fantasy', label: 'Powers', icon: Flame },
          { id: 'tough', label: 'Dilemmas', icon: Split },
        ].map(cat => {
          const Icon = cat.icon;
          const isActive = categoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setCategoryFilter(cat.id as any); setSelectedChoice(null); setCurrentIndex(0); }}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                  : 'bg-white/[0.05] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Dilemma Stage: Option A vs Option B */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-md w-full mx-auto my-2 gap-3">
        {/* Option A Box (Cyan/Blue Theme) */}
        <button
          onClick={() => handleChoose('A')}
          className={`relative p-5 rounded-3xl border-2 transition-all duration-300 text-left overflow-hidden cursor-pointer ${
            selectedChoice === 'A'
              ? 'bg-cyan-500/25 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)] scale-[1.02]'
              : selectedChoice === 'B'
              ? 'bg-white/[0.03] border-white/10 opacity-70'
              : 'bg-white/[0.04] hover:bg-cyan-500/10 border-white/10 hover:border-cyan-500/40'
          }`}
        >
          {/* Animated percentage background fill when answered */}
          {selectedChoice && (
            <div
              className="absolute inset-0 bg-cyan-500/20 transition-all duration-1000 -z-0"
              style={{ width: `${currentDilemma.percentA}%` }}
            />
          )}

          <div className="relative z-10 flex items-start justify-between gap-3">
            <span className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-black flex items-center justify-center shrink-0">
              A
            </span>
            <p className="flex-1 text-sm sm:text-base font-extrabold text-white leading-snug">
              {currentDilemma.optionA}
            </p>
            {selectedChoice && (
              <span className="text-xl font-black text-cyan-400 shrink-0 animate-fadeIn">
                {currentDilemma.percentA}%
              </span>
            )}
          </div>
        </button>

        {/* Center OR Divider */}
        <div className="flex items-center justify-center gap-3 my-1">
          <div className="h-px bg-white/10 flex-1" />
          <span className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/15 flex items-center justify-center text-xs font-black text-slate-300">
            OR
          </span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        {/* Option B Box (Pink/Rose Theme) */}
        <button
          onClick={() => handleChoose('B')}
          className={`relative p-5 rounded-3xl border-2 transition-all duration-300 text-left overflow-hidden cursor-pointer ${
            selectedChoice === 'B'
              ? 'bg-pink-500/25 border-pink-400 shadow-[0_0_25px_rgba(236,72,153,0.4)] scale-[1.02]'
              : selectedChoice === 'A'
              ? 'bg-white/[0.03] border-white/10 opacity-70'
              : 'bg-white/[0.04] hover:bg-pink-500/10 border-white/10 hover:border-pink-500/40'
          }`}
        >
          {/* Animated percentage background fill when answered */}
          {selectedChoice && (
            <div
              className="absolute inset-0 bg-pink-500/20 transition-all duration-1000 -z-0"
              style={{ width: `${currentDilemma.percentB}%` }}
            />
          )}

          <div className="relative z-10 flex items-start justify-between gap-3">
            <span className="w-7 h-7 rounded-xl bg-pink-500/20 text-pink-300 text-xs font-black flex items-center justify-center shrink-0">
              B
            </span>
            <p className="flex-1 text-sm sm:text-base font-extrabold text-white leading-snug">
              {currentDilemma.optionB}
            </p>
            {selectedChoice && (
              <span className="text-xl font-black text-pink-400 shrink-0 animate-fadeIn">
                {currentDilemma.percentB}%
              </span>
            )}
          </div>
        </button>

        {/* Conversation Starter Prompt */}
        {selectedChoice && (
          <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10 text-xs text-slate-300 flex items-start gap-2.5 animate-fadeIn mt-1">
            <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-emerald-300 font-bold block mb-0.5">Talk About It:</strong>
              <span>{currentDilemma.talkPrompt}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Next Button */}
      <footer className="relative z-10 flex items-center justify-center max-w-md w-full mx-auto mt-2">
        {selectedChoice ? (
          <button
            onClick={handleNext}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-black text-sm shadow-[0_8px_25px_rgba(16,185,129,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center"
          >
            Next Dilemma 🎲 →
          </button>
        ) : (
          <p className="text-xs text-slate-500 font-bold text-center">
            Tap either Option A or Option B to cast your vote!
          </p>
        )}
      </footer>
    </div>
  );
}
