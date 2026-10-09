'use client';
import { useState, useEffect } from 'react';
import { useSocketStore } from '../../lib/store/socketStore';
import { useAuthStore } from '../../lib/store/authStore';

// 2-Player Ludo Board Setup: Pink (You) vs Violet (Partner)
// Each player has 2 tokens to race from home base (0) to finish (24)
const TRACK_LENGTH = 24;

export default function LudoGame({ onBack }: { onBack: () => void }) {
  const [tokens, setTokens] = useState<{ p1: number[]; p2: number[] }>({
    p1: [0, 0], // Pink tokens
    p2: [0, 0], // Violet tokens
  });
  const [dice, setDice] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [turn, setTurn] = useState<'p1' | 'p2'>('p1');
  const [winner, setWinner] = useState<string | null>(null);

  const socket = useSocketStore(state => state.socket);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (!socket) return;

    socket.on('game:ludo:roll', (data: { dice: number; nextTurn: 'p1' | 'p2' }) => {
      setDice(data.dice);
    });

    socket.on('game:ludo:move', (data: { tokens: { p1: number[]; p2: number[] }; nextTurn: 'p1' | 'p2'; winner: string | null }) => {
      setTokens(data.tokens);
      setTurn(data.nextTurn);
      setDice(null);
      if (data.winner) setWinner(data.winner);
    });

    socket.on('game:ludo:reset', () => {
      setTokens({ p1: [0, 0], p2: [0, 0] });
      setDice(null);
      setTurn('p1');
      setWinner(null);
    });

    return () => {
      socket.off('game:ludo:roll');
      socket.off('game:ludo:move');
      socket.off('game:ludo:reset');
    };
  }, [socket]);

  const rollDice = () => {
    if (isRolling || dice !== null || winner) return;

    setIsRolling(true);
    setTimeout(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      setDice(rolled);
      setIsRolling(false);
      socket?.emit('game:ludo:roll', { dice: rolled, nextTurn: turn });
    }, 600);
  };

  const moveToken = (player: 'p1' | 'p2', tokenIdx: number) => {
    if (turn !== player || dice === null || winner) return;

    const currentPos = tokens[player][tokenIdx];
    const newPos = Math.min(currentPos + dice, TRACK_LENGTH);

    const nextTokens = {
      ...tokens,
      [player]: tokens[player].map((pos, i) => i === tokenIdx ? newPos : pos),
    };

    // Check winner
    let gameWinner: string | null = null;
    if (nextTokens.p1.every(pos => pos >= TRACK_LENGTH)) gameWinner = 'Pink Team 💕';
    if (nextTokens.p2.every(pos => pos >= TRACK_LENGTH)) gameWinner = 'Violet Team 💜';

    const nextTurn = dice === 6 ? player : (player === 'p1' ? 'p2' : 'p1');

    setTokens(nextTokens);
    setDice(null);
    setTurn(nextTurn);
    if (gameWinner) setWinner(gameWinner);

    socket?.emit('game:ludo:move', {
      tokens: nextTokens,
      nextTurn,
      winner: gameWinner,
    });
  };

  const resetGame = () => {
    setTokens({ p1: [0, 0], p2: [0, 0] });
    setDice(null);
    setTurn('p1');
    setWinner(null);
    socket?.emit('game:ludo:reset');
  };

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto flex flex-col items-center">
      <header className="w-full flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-slate-300"
        >
          ← Games
        </button>
        <div className="text-center">
          <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400">
            Couples Ludo 🎲
          </h2>
          <span className="text-[11px] font-semibold text-slate-300">
            Current Turn:{' '}
            <span className={turn === 'p1' ? 'text-pink-400' : 'text-purple-400'}>
              {turn === 'p1' ? 'Pink Player (You)' : 'Violet Player (Partner)'}
            </span>
          </span>
        </div>
        <div className="w-16" />
      </header>

      {winner && (
        <div className="w-full p-4 mb-4 rounded-2xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/40 text-center animate-bounce">
          <span className="text-2xl">🏆</span>
          <h3 className="font-bold text-white text-base mt-1">{winner} Wins the Crown!</h3>
        </div>
      )}

      {/* Ludo Track Visualizer */}
      <div className="w-full max-w-[380px] p-5 rounded-[32px] glass-panel space-y-6">
        {/* Pink Track (P1) */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
              <span>💖</span> Pink Tokens
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Tokens: {tokens.p1[0]}/{TRACK_LENGTH} &bull; {tokens.p1[1]}/{TRACK_LENGTH}
            </span>
          </div>

          <div className="flex gap-2">
            {tokens.p1.map((pos, idx) => (
              <button
                key={idx}
                disabled={turn !== 'p1' || dice === null || pos >= TRACK_LENGTH}
                onClick={() => moveToken('p1', idx)}
                className={`flex-1 p-3 rounded-2xl border transition-all text-center ${
                  turn === 'p1' && dice !== null && pos < TRACK_LENGTH
                    ? 'bg-pink-500/30 border-pink-400 shadow-[0_0_15px_rgba(244,63,142,0.4)] animate-pulse cursor-pointer'
                    : 'bg-white/[0.04] border-white/5 opacity-80'
                }`}
              >
                <div className="text-lg mb-1">{pos >= TRACK_LENGTH ? '🏁' : '🌸'}</div>
                <div className="text-xs font-bold text-white">Token {idx + 1}</div>
                <div className="text-[10px] text-pink-300 font-mono mt-0.5">
                  {pos >= TRACK_LENGTH ? 'FINISHED' : `Step ${pos}`}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Violet Track (P2) */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
              <span>💜</span> Violet Tokens
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Tokens: {tokens.p2[0]}/{TRACK_LENGTH} &bull; {tokens.p2[1]}/{TRACK_LENGTH}
            </span>
          </div>

          <div className="flex gap-2">
            {tokens.p2.map((pos, idx) => (
              <button
                key={idx}
                disabled={turn !== 'p2' || dice === null || pos >= TRACK_LENGTH}
                onClick={() => moveToken('p2', idx)}
                className={`flex-1 p-3 rounded-2xl border transition-all text-center ${
                  turn === 'p2' && dice !== null && pos < TRACK_LENGTH
                    ? 'bg-purple-500/30 border-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.4)] animate-pulse cursor-pointer'
                    : 'bg-white/[0.04] border-white/5 opacity-80'
                }`}
              >
                <div className="text-lg mb-1">{pos >= TRACK_LENGTH ? '🏁' : '🔮'}</div>
                <div className="text-xs font-bold text-white">Token {idx + 1}</div>
                <div className="text-[10px] text-purple-300 font-mono mt-0.5">
                  {pos >= TRACK_LENGTH ? 'FINISHED' : `Step ${pos}`}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dice Rolling Pad */}
        <div className="pt-4 border-t border-white/10 flex flex-col items-center">
          <button
            onClick={rollDice}
            disabled={isRolling || dice !== null || !!winner}
            className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-xl transition-all cursor-pointer ${
              isRolling 
                ? 'animate-spin bg-white/20' 
                : 'bg-gradient-to-tr from-pink-500 to-purple-600 hover:scale-110 active:scale-95 shadow-pink-500/30'
            } disabled:opacity-50 disabled:hover:scale-100`}
          >
            {dice ? ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dice - 1] : '🎲'}
          </button>
          
          <p className="text-xs text-slate-400 mt-3 font-medium">
            {dice 
              ? `You rolled a ${dice}! Tap a highlighted token to move` 
              : 'Tap dice to roll! (Roll 6 gets extra turn)'}
          </p>
        </div>
      </div>

      <button
        onClick={resetGame}
        className="mt-6 px-6 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
      >
        Reset Match 🔄
      </button>
    </div>
  );
}
