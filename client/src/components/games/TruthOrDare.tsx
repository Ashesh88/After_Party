'use client';
import { useState } from 'react';
import { ArrowLeft, Sparkles, Flame, Laugh, Heart, Zap, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';

interface CardItem {
  id: number;
  type: 'truth' | 'dare';
  category: 'spicy' | 'fun' | 'deep' | 'wild';
  prompt: string;
}

const CARDS_DATABASE: CardItem[] = [
  // Spicy & Intimate
  { id: 1, type: 'truth', category: 'spicy', prompt: 'What is the most attractive thing about me that you never told me?' },
  { id: 2, type: 'dare', category: 'spicy', prompt: 'Look into my eyes for 60 seconds straight without speaking or laughing.' },
  { id: 3, type: 'truth', category: 'spicy', prompt: 'What was your very first romantic impression of me?' },
  { id: 4, type: 'dare', category: 'spicy', prompt: 'Whisper your deepest secret fantasy into my ear.' },
  { id: 5, type: 'truth', category: 'spicy', prompt: 'What is something you secretly love that I do?' },
  { id: 6, type: 'dare', category: 'spicy', prompt: 'Give me a 2-minute relaxing shoulder massage right now.' },
  { id: 7, type: 'truth', category: 'spicy', prompt: 'When was the exact moment you realized you had feelings for me?' },
  { id: 8, type: 'dare', category: 'spicy', prompt: 'Send me a cute romantic selfie right now with a flirty caption.' },
  { id: 9, type: 'truth', category: 'spicy', prompt: 'What is your idea of the ultimate romantic getaway for just the two of us?' },
  { id: 10, type: 'dare', category: 'spicy', prompt: 'Hold my hand and say 3 genuine reasons why you appreciate having me in your life.' },

  // Fun & Hilarious
  { id: 11, type: 'truth', category: 'fun', prompt: 'What is the most embarrassing song you secretly know every single lyric to?' },
  { id: 12, type: 'dare', category: 'fun', prompt: 'Do your best dramatic movie villain laugh right now.' },
  { id: 13, type: 'truth', category: 'fun', prompt: 'What is the weirdest habit you have when you are alone in your room?' },
  { id: 14, type: 'dare', category: 'fun', prompt: 'Speak in a fake accent of my choice for the next 3 turns.' },
  { id: 15, type: 'truth', category: 'fun', prompt: 'If you had to swap lives with any cartoon character for 24 hours, who would it be?' },
  { id: 16, type: 'dare', category: 'fun', prompt: 'Do your best runway model strut across the room with dramatic music.' },
  { id: 17, type: 'truth', category: 'fun', prompt: 'What is the most ridiculous excuse you ever made to cancel plans?' },
  { id: 18, type: 'dare', category: 'fun', prompt: 'Let me look through your last 5 searched items on Google or YouTube.' },
  { id: 19, type: 'truth', category: 'fun', prompt: 'What is the dumbest fashion trend you actually participated in?' },
  { id: 20, type: 'dare', category: 'fun', prompt: 'Sing the chorus of the first song that pops into your head right now.' },

  // Deep & Real
  { id: 21, type: 'truth', category: 'deep', prompt: 'What is a dream or goal you have that you rarely talk about?' },
  { id: 22, type: 'truth', category: 'deep', prompt: 'What is a life lesson that changed the way you view the world?' },
  { id: 23, type: 'truth', category: 'deep', prompt: 'What is something you wish more people understood about you?' },
  { id: 24, type: 'truth', category: 'deep', prompt: 'What are you most proud of accomplishing in the past year?' },
  { id: 25, type: 'truth', category: 'deep', prompt: 'What does genuine happiness look like to you in everyday life?' },
  { id: 26, type: 'dare', category: 'deep', prompt: 'Share a photo from your childhood and tell me the story behind it.' },
  { id: 27, type: 'truth', category: 'deep', prompt: 'What is a quality in a close friend that you value above everything else?' },
  { id: 28, type: 'dare', category: 'deep', prompt: 'Write down a promise to yourself for the future and read it out loud.' },

  // Wild Party Dares
  { id: 29, type: 'dare', category: 'wild', prompt: 'Do 15 quick pushups or 20 jumping jacks right now.' },
  { id: 30, type: 'dare', category: 'wild', prompt: 'Let me draw a funny little smiley face on your hand with a pen.' },
  { id: 31, type: 'dare', category: 'wild', prompt: 'Dance like a robot for 30 seconds with full seriousness.' },
  { id: 32, type: 'dare', category: 'wild', prompt: 'Show me the oldest photo currently stored on your phone.' },
  { id: 33, type: 'dare', category: 'wild', prompt: 'Imitate my signature laugh or expression until I recognize it.' },
  { id: 34, type: 'truth', category: 'wild', prompt: 'What is the wildest thing you have ever done on a dare?' },
  { id: 35, type: 'dare', category: 'wild', prompt: 'Send a heart emoji to the 3rd person on your WhatsApp recent chats.' }
];

export default function TruthOrDare({ onBack }: { onBack: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'spicy' | 'fun' | 'deep' | 'wild'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'truth' | 'dare'>('all');
  const [currentCard, setCurrentCard] = useState<CardItem>(CARDS_DATABASE[0]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [forfeitedCount, setForfeitedCount] = useState(0);

  const filterPool = () => {
    return CARDS_DATABASE.filter(c => {
      const matchCat = selectedCategory === 'all' || c.category === selectedCategory;
      const matchType = typeFilter === 'all' || c.type === typeFilter;
      return matchCat && matchType;
    });
  };

  const drawNextCard = (forcedType?: 'truth' | 'dare') => {
    setIsFlipped(false);
    setTimeout(() => {
      let pool = CARDS_DATABASE.filter(c => {
        const matchCat = selectedCategory === 'all' || c.category === selectedCategory;
        const matchType = forcedType ? c.type === forcedType : (typeFilter === 'all' || c.type === typeFilter);
        return matchCat && matchType;
      });
      if (pool.length === 0) pool = CARDS_DATABASE;
      const next = pool[Math.floor(Math.random() * pool.length)];
      setCurrentCard(next);
      // Auto flip after slide
      setTimeout(() => setIsFlipped(true), 250);
    }, 250);
  };

  const handleComplete = () => {
    setCompletedCount(prev => prev + 1);
    drawNextCard();
  };

  const handleForfeit = () => {
    setForfeitedCount(prev => prev + 1);
    drawNextCard();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0714] flex flex-col justify-between p-4 sm:p-6 select-none overflow-y-auto">
      {/* Ambient background aura */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between max-w-md w-full mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-pink-400" />
          <span>Arcade</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400">
            Truth or Dare ✨
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-white/[0.06] px-2.5 py-1 rounded-full border border-white/10">
          <span className="text-emerald-400">✓ {completedCount}</span>
          <span className="text-slate-500">|</span>
          <span className="text-rose-400">✗ {forfeitedCount}</span>
        </div>
      </header>

      {/* Category Pills Bar */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 my-3 max-w-md w-full mx-auto overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Cards', icon: Sparkles },
          { id: 'spicy', label: 'Spicy', icon: Flame },
          { id: 'fun', label: 'Fun', icon: Laugh },
          { id: 'deep', label: 'Deep', icon: Heart },
          { id: 'wild', label: 'Wild', icon: Zap },
        ].map(cat => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id as any); drawNextCard(); }}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                  : 'bg-white/[0.05] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main 3D Flipping Card Stage */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-sm w-full mx-auto my-2 perspective-1000">
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className={`w-full aspect-[3/4] max-h-[360px] relative rounded-3xl cursor-pointer transition-transform duration-700 transform-style-3d shadow-2xl ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Card Front (Tap to Reveal) */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-pink-600/90 via-purple-700/90 to-indigo-900/90 border border-white/20 p-6 flex flex-col items-center justify-between backface-hidden shadow-[0_15px_35px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/10 text-pink-200 border border-white/15">
                {currentCard.category.toUpperCase()}
              </span>
              <Sparkles className="w-4 h-4 text-pink-300 animate-pulse" />
            </div>

            <div className="text-center flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-3xl shadow-inner border border-white/20">
                {currentCard.type === 'truth' ? '🕊️' : '⚡'}
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                {currentCard.type === 'truth' ? 'TRUTH' : 'DARE'}
              </h2>
              <p className="text-xs text-pink-200/80 font-medium">Tap card to reveal challenge</p>
            </div>

            <div className="text-[10px] uppercase font-bold tracking-wider text-pink-300/60">
              Card #{currentCard.id}
            </div>
          </div>

          {/* Card Back (Challenge Content) */}
          <div className="absolute inset-0 rounded-3xl bg-[#140e26] border-2 border-pink-500/50 p-6 flex flex-col items-center justify-between backface-hidden rotate-y-180 shadow-[0_0_40px_rgba(236,72,153,0.3)]">
            <div className="flex items-center justify-between w-full">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                currentCard.type === 'truth'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {currentCard.type.toUpperCase()} • {currentCard.category.toUpperCase()}
              </span>
              <span className="text-xs text-slate-400">Card #{currentCard.id}</span>
            </div>

            <div className="text-center px-2">
              <p className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                "{currentCard.prompt}"
              </p>
            </div>

            <div className="text-[11px] text-pink-300 font-semibold text-center">
              Tap again to hide or choose action below
            </div>
          </div>
        </div>

        {/* Action Buttons: Pass or Completed */}
        {isFlipped && (
          <div className="flex items-center justify-center gap-3 mt-4 w-full animate-fadeIn">
            <button
              onClick={handleForfeit}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Forfeit / Skip</span>
            </button>
            <button
              onClick={handleComplete}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Completed!</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Pick Selector */}
      <footer className="relative z-10 flex items-center justify-center gap-2 max-w-md w-full mx-auto mt-2">
        <button
          onClick={() => drawNextCard('truth')}
          className="flex-1 py-3 px-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center"
        >
          🕊️ Pick Truth
        </button>
        <button
          onClick={() => drawNextCard()}
          className="p-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 border border-white/10 transition-all cursor-pointer"
          title="Random Card"
        >
          <RotateCcw className="w-4 h-4 text-pink-400" />
        </button>
        <button
          onClick={() => drawNextCard('dare')}
          className="flex-1 py-3 px-3 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center"
        >
          ⚡ Pick Dare
        </button>
      </footer>
    </div>
  );
}
