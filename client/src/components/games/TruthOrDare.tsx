'use client';
import { useState } from 'react';

const questions = [
  { type: 'truth', text: 'What is your favorite memory of us?' },
  { type: 'dare', text: 'Send me your favorite picture of us right now.' },
  { type: 'truth', text: 'What is one thing you want to do together this year?' },
];

export default function TruthOrDare({ onBack }: { onBack: () => void }) {
  const [current, setCurrent] = useState(questions[0]);
  const [flipped, setFlipped] = useState(false);

  const nextCard = () => {
    setFlipped(false);
    setTimeout(() => {
      setCurrent(questions[Math.floor(Math.random() * questions.length)]);
    }, 300);
  };

  return (
    <div className="p-6 max-w-lg mx-auto flex flex-col items-center h-full">
      <header className="w-full flex items-center justify-between mb-12">
        <button onClick={onBack} className="text-white/60 hover:text-white">← Back</button>
        <h1 className="font-bold text-xl">Truth or Dare</h1>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 w-full flex items-center justify-center perspective-1000">
        <div 
          className={`w-full max-w-sm aspect-[3/4] relative transition-transform duration-700 transform-style-3d cursor-pointer ${flipped ? 'rotate-y-180' : ''}`}
          onClick={() => setFlipped(true)}
        >
          {/* Front */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl shadow-2xl backface-hidden flex items-center justify-center text-4xl font-bold">
            Tap to Flip
          </div>
          {/* Back */}
          <div className="absolute inset-0 bg-surface border-2 border-primary rounded-3xl shadow-2xl backface-hidden rotate-y-180 flex flex-col items-center justify-center p-8 text-center">
            <span className="text-primary font-bold tracking-widest uppercase mb-4">{current.type}</span>
            <p className="text-2xl font-medium">{current.text}</p>
          </div>
        </div>
      </div>

      <div className="mt-12 h-16">
        {flipped && (
          <button
            onClick={nextCard}
            className="px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 font-bold transition-all"
          >
            Next Card
          </button>
        )}
      </div>
    </div>
  );
}
