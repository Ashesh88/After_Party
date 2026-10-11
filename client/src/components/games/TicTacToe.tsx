'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, RotateCcw, Bot, Users, Trophy, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useSocketStore } from '../../lib/store/socketStore';
import { useAuthStore } from '../../lib/store/authStore';

// Web Audio sound synthesizer for TicTacToe
class TicAudio {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  playPop(isX: boolean) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isX ? 520 : 680, now);
    osc.frequency.exponentialRampToValueAtTime(isX ? 780 : 920, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playWin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    [440, 554, 659, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.25, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.5);
    });
  }

  playTie() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(160, now + 0.2);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }
}

const audio = new TicAudio();

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

export default function TicTacToe({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [gameMode, setGameMode] = useState<'ai' | '2p'>('2p');
  const [winner, setWinner] = useState<string | null>(null);
  const [winningCombo, setWinningCombo] = useState<number[] | null>(null);
  const [scores, setScores] = useState({ X: 0, O: 0, ties: 0 });
  const [muted, setMuted] = useState(false);

  const socket = useSocketStore(state => state.socket);
  const user = useAuthStore(state => state.user);
  const room = useAuthStore(state => state.room);
  const partner = room?.participants?.find(p => p._id !== user?._id);
  const p1Name = user?.displayName || 'Player 1';
  const p2Name = partner?.displayName || (gameMode === 'ai' ? 'Robot AI' : 'Player 2');

  // Socket listener for room multiplayer
  useEffect(() => {
    if (!socket) return;
    const handleMove = (data: { index: number, symbol: string }) => {
      setBoard(prev => {
        if (prev[data.index]) return prev;
        const next = [...prev];
        next[data.index] = data.symbol;
        checkGameResult(next);
        return next;
      });
      setTurn(data.symbol === 'X' ? 'O' : 'X');
      audio.playPop(data.symbol === 'X');
    };

    const handleReset = () => {
      resetBoard();
    };

    socket.on('game:tictactoe:move', handleMove);
    socket.on('game:tictactoe:reset', handleReset);

    return () => {
      socket.off('game:tictactoe:move', handleMove);
      socket.off('game:tictactoe:reset', handleReset);
    };
  }, [socket]);

  // AI Move calculation
  useEffect(() => {
    if (gameMode === 'ai' && turn === 'O' && !winner) {
      const timer = setTimeout(() => {
        makeAiMove();
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [turn, gameMode, winner, board]);

  const checkGameResult = (currentBoard: (string | null)[]) => {
    for (const [a, b, c] of WIN_LINES) {
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        const winSymbol = currentBoard[a]!;
        setWinner(winSymbol);
        setWinningCombo([a, b, c]);
        setScores(prev => ({ ...prev, [winSymbol]: prev[winSymbol as 'X' | 'O'] + 1 }));
        audio.playWin();
        return;
      }
    }
    if (!currentBoard.includes(null)) {
      setWinner('draw');
      setScores(prev => ({ ...prev, ties: prev.ties + 1 }));
      audio.playTie();
    }
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner) return;
    if (gameMode === 'ai' && turn === 'O') return;

    const currentSymbol = turn;
    const nextBoard = [...board];
    nextBoard[index] = currentSymbol;
    setBoard(nextBoard);
    audio.playPop(currentSymbol === 'X');

    checkGameResult(nextBoard);

    if (socket && room) {
      socket.emit('game:tictactoe:move', { index, symbol: currentSymbol });
    }

    setTurn(currentSymbol === 'X' ? 'O' : 'X');
  };

  const makeAiMove = () => {
    // 1. Can AI win immediately?
    for (const [a, b, c] of WIN_LINES) {
      if (board[a] === 'O' && board[b] === 'O' && !board[c]) return applyAi(c);
      if (board[a] === 'O' && board[c] === 'O' && !board[b]) return applyAi(b);
      if (board[b] === 'O' && board[c] === 'O' && !board[a]) return applyAi(a);
    }
    // 2. Can player win? Block player!
    for (const [a, b, c] of WIN_LINES) {
      if (board[a] === 'X' && board[b] === 'X' && !board[c]) return applyAi(c);
      if (board[a] === 'X' && board[c] === 'X' && !board[b]) return applyAi(b);
      if (board[b] === 'X' && board[c] === 'X' && !board[a]) return applyAi(a);
    }
    // 3. Take center if available
    if (!board[4]) return applyAi(4);
    // 4. Take corners
    const corners = [0, 2, 6, 8].filter(i => !board[i]);
    if (corners.length > 0) {
      return applyAi(corners[Math.floor(Math.random() * corners.length)]);
    }
    // 5. Take any remaining empty cell
    const emptyIndices = board.map((v, i) => v === null ? i : null).filter((v): v is number => v !== null);
    if (emptyIndices.length > 0) {
      applyAi(emptyIndices[Math.floor(Math.random() * emptyIndices.length)]);
    }
  };

  const applyAi = (index: number) => {
    const nextBoard = [...board];
    nextBoard[index] = 'O';
    setBoard(nextBoard);
    audio.playPop(false);
    checkGameResult(nextBoard);
    setTurn('X');
  };

  const resetBoard = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningCombo(null);
    setTurn('X');
  };

  const handleRematch = () => {
    resetBoard();
    if (socket && room) {
      socket.emit('game:tictactoe:reset');
    }
  };

  const toggleMute = () => {
    audio.muted = !muted;
    setMuted(!muted);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090814] flex flex-col justify-between p-4 sm:p-6 select-none overflow-y-auto">
      {/* Background ambient neon glow */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between max-w-md w-full mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Arcade</span>
        </button>

        <div className="flex items-center gap-1 bg-white/[0.06] p-1 rounded-full border border-white/10">
          <button
            onClick={() => { setGameMode('2p'); resetBoard(); }}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              gameMode === '2p' ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2P Duel</span>
          </button>
          <button
            onClick={() => { setGameMode('ai'); resetBoard(); }}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              gameMode === 'ai' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>vs AI</span>
          </button>
        </div>

        <button
          onClick={toggleMute}
          className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
        </button>
      </header>

      {/* Main Game Area */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 my-4 max-w-md w-full mx-auto">
        {/* Players & Scoreboard Cards */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          {/* Player X */}
          <div className={`p-3 rounded-2xl border transition-all duration-300 ${
            turn === 'X' && !winner
              ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)] scale-[1.02]'
              : 'bg-white/[0.04] border-white/10 opacity-75'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-400 font-black text-xs flex items-center justify-center">X</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                {turn === 'X' && !winner ? 'Active Turn' : 'Waiting'}
              </span>
            </div>
            <div className="font-extrabold text-sm text-white truncate">{p1Name}</div>
            <div className="text-xl font-black text-cyan-400 mt-1">{scores.X} <span className="text-xs font-semibold text-slate-400">Wins</span></div>
          </div>

          {/* Player O */}
          <div className={`p-3 rounded-2xl border transition-all duration-300 ${
            turn === 'O' && !winner
              ? 'bg-pink-500/15 border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.35)] scale-[1.02]'
              : 'bg-white/[0.04] border-white/10 opacity-75'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="w-5 h-5 rounded-lg bg-pink-500/20 text-pink-400 font-black text-xs flex items-center justify-center">O</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-300">
                {turn === 'O' && !winner ? 'Active Turn' : 'Waiting'}
              </span>
            </div>
            <div className="font-extrabold text-sm text-white truncate">{p2Name}</div>
            <div className="text-xl font-black text-pink-400 mt-1">{scores.O} <span className="text-xs font-semibold text-slate-400">Wins</span></div>
          </div>
        </div>

        {/* Status Announcement Banner */}
        <div className="mb-5 min-h-8 flex items-center justify-center">
          {winner ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-sm font-black animate-pulse">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>{winner === 'draw' ? "It's a Tie Game!" : `${winner === 'X' ? p1Name : p2Name} Wins!`}</span>
              </div>
              {winner !== 'draw' && (
                <div className="text-[11px] font-bold text-pink-300 bg-pink-500/15 border border-pink-500/30 px-3 py-1 rounded-xl flex items-center gap-1">
                  <span>Loser owes: </span>
                  <span className="text-white font-extrabold">
                    {typeof window !== 'undefined' ? (localStorage.getItem('afterparty_arcade_stake') || '15-min massage').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g, '').trim() : '15-min massage'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>{turn === 'X' ? `${p1Name}'s Turn (X)` : `${p2Name}'s Turn (O)`}</span>
            </div>
          )}
        </div>

        {/* 3x3 Neon Grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[340px] aspect-square p-3 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl">
          {board.map((cell, index) => {
            const isWinningCell = winningCombo?.includes(index);
            return (
              <button
                key={index}
                onClick={() => handleCellClick(index)}
                disabled={!!cell || !!winner || (gameMode === 'ai' && turn === 'O')}
                className={`relative rounded-2xl flex items-center justify-center text-4xl sm:text-5xl font-black transition-all duration-200 cursor-pointer ${
                  cell === null && !winner
                    ? 'bg-white/[0.04] hover:bg-white/[0.09] hover:scale-105 border border-white/5'
                    : isWinningCell
                    ? 'bg-amber-400/30 border-2 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] animate-bounce'
                    : 'bg-white/[0.06] border border-white/10'
                }`}
              >
                {cell === 'X' && (
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-blue-500 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]">
                    X
                  </span>
                )}
                {cell === 'O' && (
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-pink-300 to-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]">
                    O
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Controls */}
      <footer className="relative z-10 flex items-center justify-center gap-3 max-w-md w-full mx-auto">
        <button
          onClick={handleRematch}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-500 text-white font-extrabold text-sm shadow-[0_8px_25px_rgba(6,182,212,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{winner ? 'Play Again' : 'Restart Board'}</span>
        </button>
      </footer>
    </div>
  );
}
