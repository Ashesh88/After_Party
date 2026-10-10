'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Timer, Sparkles, CheckCircle, XCircle, RotateCcw, Award } from 'lucide-react';

interface QuizQuestion {
  id: number;
  category: string;
  question: string;
  options: string[];
  correct: number;
  funFact: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    category: 'Pop Culture & Cinema',
    question: 'In the movie "Titanic", what was the name of the diamond necklace?',
    options: ['The Star of Africa', 'The Heart of the Ocean', 'The Eye of Destiny', 'The Blue Hope'],
    correct: 1,
    funFact: 'The necklace was based on the famous real-life Hope Diamond!'
  },
  {
    id: 2,
    category: 'World & Travel',
    question: 'Which city is officially known as the "City of Love"?',
    options: ['Venice', 'Paris', 'Rome', 'Vienna'],
    correct: 1,
    funFact: 'Paris attracts over 30 million visitors every year!'
  },
  {
    id: 3,
    category: 'Music & Hits',
    question: 'Which artist sang the legendary song "Shape of You"?',
    options: ['Justin Bieber', 'Shawn Mendes', 'Ed Sheeran', 'Harry Styles'],
    correct: 2,
    funFact: 'It became one of the most streamed songs in Spotify history with over 3 billion plays!'
  },
  {
    id: 4,
    category: 'Science & Cosmos',
    question: 'Which planet in our solar system is nicknamed the "Red Planet"?',
    options: ['Venus', 'Mars', 'Jupiter', 'Mercury'],
    correct: 1,
    funFact: 'Its red color comes from large amounts of iron oxide (rust) on its surface!'
  },
  {
    id: 5,
    category: 'Food & Flavors',
    question: 'Which country is the birthplace of Pizza Margherita?',
    options: ['Spain', 'Greece', 'Italy', 'France'],
    correct: 2,
    funFact: 'Created in Naples in 1889 to represent the colors of the Italian flag!'
  },
  {
    id: 6,
    category: 'Cinema & Marvel',
    question: 'What is the real name of Iron Man in the Marvel Cinematic Universe?',
    options: ['Steve Rogers', 'Bruce Banner', 'Tony Stark', 'Peter Parker'],
    correct: 2,
    funFact: 'Robert Downey Jr. improvised the famous line "I am Iron Man"!'
  },
  {
    id: 7,
    category: 'Nature & Animals',
    question: 'Which is the fastest land animal in the entire world?',
    options: ['Cheetah', 'Lion', 'Peregrine Falcon', 'Gazelle'],
    correct: 0,
    funFact: 'A cheetah can accelerate from 0 to 60 mph in just three seconds!'
  },
  {
    id: 8,
    category: 'Gaming & Arcade',
    question: 'In what year was the legendary arcade game "Pac-Man" originally released?',
    options: ['1975', '1980', '1985', '1990'],
    correct: 1,
    funFact: 'Pac-Man was created by Toru Iwatani inspired by a pizza with a slice missing!'
  },
  {
    id: 9,
    category: 'Brain Teaser',
    question: 'How many hearts does an octopus have?',
    options: ['1', '2', '3', '4'],
    correct: 2,
    funFact: 'Two hearts pump blood to the gills, while the third pumps it to the rest of the body!'
  },
  {
    id: 10,
    category: 'World Wonders',
    question: 'The Taj Mahal is located in which Indian city?',
    options: ['New Delhi', 'Jaipur', 'Agra', 'Mumbai'],
    correct: 2,
    funFact: 'It was built entirely of white marble by Emperor Shah Jahan in the 17th century!'
  }
];

class QuizAudio {
  private ctx: AudioContext | null = null;
  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  playCorrect() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.2, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  }

  playWrong() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.2);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

const quizAudio = new QuizAudio();

export default function Quiz({ onBack }: { onBack: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isGameOver, setIsGameOver] = useState(false);

  const currentQ = QUIZ_QUESTIONS[currentIndex];

  // 15-second countdown timer
  useEffect(() => {
    if (isAnswered || isGameOver) return;
    if (timeLeft <= 0) {
      handleTimeOut();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isAnswered, isGameOver]);

  const handleTimeOut = () => {
    setIsAnswered(true);
    setSelectedOption(-1); // timeout
    setStreak(0);
    quizAudio.playWrong();
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    if (idx === currentQ.correct) {
      const bonus = streak >= 2 ? 150 : 100;
      setScore(prev => prev + bonus);
      setStreak(prev => prev + 1);
      quizAudio.playCorrect();
    } else {
      setStreak(0);
      quizAudio.playWrong();
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < QUIZ_QUESTIONS.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeLeft(15);
    } else {
      setIsGameOver(true);
    }
  };

  const restartQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setStreak(0);
    setTimeLeft(15);
    setIsGameOver(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090815] flex flex-col justify-between p-4 sm:p-6 select-none overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between max-w-md w-full mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-orange-400" />
          <span>Arcade</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-rose-300 to-amber-300">
            Trivia Quiz Show 🎙️
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-white/[0.06] px-3 py-1 rounded-full border border-white/10 text-xs font-black text-amber-300">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>{score} pts</span>
        </div>
      </header>

      {!isGameOver ? (
        /* Question Card & Options */
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-md w-full mx-auto my-3">
          {/* Progress & Timer Bar */}
          <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-400">
            <span>Question {currentIndex + 1} of {QUIZ_QUESTIONS.length}</span>
            <div className="flex items-center gap-1.5 text-orange-400">
              <Timer className="w-3.5 h-3.5" />
              <span>{timeLeft}s</span>
            </div>
          </div>

          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full transition-all duration-1000 ${
                timeLeft <= 5 ? 'bg-rose-500' : 'bg-gradient-to-r from-orange-400 to-rose-500'
              }`}
              style={{ width: `${(timeLeft / 15) * 100}%` }}
            />
          </div>

          {/* Question Box */}
          <div className="p-6 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-2xl mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
              {currentQ.category}
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-white mt-3 leading-snug">
              {currentQ.question}
            </h2>
          </div>

          {/* 4 Multiple Choice Options */}
          <div className="flex flex-col gap-2.5">
            {currentQ.options.map((opt, idx) => {
              const isChosen = selectedOption === idx;
              const isCorrectOpt = isAnswered && idx === currentQ.correct;
              const isWrongChosen = isAnswered && isChosen && idx !== currentQ.correct;

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  className={`p-3.5 rounded-2xl border text-left font-bold text-sm transition-all duration-200 cursor-pointer flex items-center justify-between ${
                    isCorrectOpt
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : isWrongChosen
                      ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-white/10 text-xs flex items-center justify-center font-black">
                      {['A', 'B', 'C', 'D'][idx]}
                    </span>
                    <span>{opt}</span>
                  </div>
                  {isCorrectOpt && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {isWrongChosen && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Fun Fact / Explanation upon answering */}
          {isAnswered && (
            <div className="mt-4 p-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-200 flex items-start gap-2 animate-fadeIn">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span><strong>Fun Fact:</strong> {currentQ.funFact}</span>
            </div>
          )}
        </div>
      ) : (
        /* Game Over Podium Card */
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-md w-full mx-auto my-3 text-center">
          <div className="w-20 h-20 rounded-3xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-4xl mb-4 shadow-[0_0_30px_rgba(251,191,36,0.3)]">
            🏆
          </div>
          <h2 className="text-2xl font-black text-white">Quiz Completed!</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Here is how you performed on the show</p>

          <div className="p-6 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl w-full max-w-sm mb-6">
            <div className="text-4xl font-black text-amber-400 mb-1">{score}</div>
            <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Points Earned</div>
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-around text-xs">
              <div>
                <span className="text-slate-400">Questions:</span>
                <p className="font-bold text-white text-sm">{QUIZ_QUESTIONS.length}</p>
              </div>
              <div>
                <span className="text-slate-400">Rank:</span>
                <p className="font-bold text-emerald-400 text-sm">
                  {score >= 800 ? 'Trivia Master 🌟' : score >= 500 ? 'Smart Brain 🧠' : 'Party Starter 🎉'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={restartQuiz}
            className="flex items-center gap-2 py-3 px-8 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        </div>
      )}

      {/* Footer Next Button */}
      {!isGameOver && isAnswered && (
        <footer className="relative z-10 flex items-center justify-center max-w-md w-full mx-auto mt-2">
          <button
            onClick={handleNextQuestion}
            className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 text-white font-black text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center"
          >
            {currentIndex + 1 < QUIZ_QUESTIONS.length ? 'Next Question →' : 'See Final Results 🏆'}
          </button>
        </footer>
      )}
    </div>
  );
}
