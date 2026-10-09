'use client';
import { useState, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { useSocketStore } from '../../lib/store/socketStore';
import toast from 'react-hot-toast';

const PIECE_ICONS: Record<string, string> = {
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
};

// Map row/col (0..7) to chess square 'a8'..'h1'
const coordsToSquare = (r: number, c: number): Square => {
  const file = String.fromCharCode('a'.charCodeAt(0) + c);
  const rank = 8 - r;
  return `${file}${rank}` as Square;
};

export default function Chess3D({ onBack }: { onBack: () => void }) {
  const chessRef = useRef<Chess>(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [view3D, setView3D] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const socket = useSocketStore(state => state.socket);

  // Sync state changes from FEN
  const updateGameState = () => {
    const game = chessRef.current;
    setFen(game.fen());

    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black (Neon Violet)' : 'White (Gold)';
      setStatusMessage(`Checkmate! 🏆 ${winner} Wins!`);
      toast.success(`Checkmate! ${winner} Wins! 🎉`);
    } else if (game.isDraw()) {
      setStatusMessage('Game Draw!');
    } else if (game.inCheck()) {
      setStatusMessage(`⚠️ Check on ${game.turn() === 'w' ? 'White' : 'Black'}!`);
    } else {
      setStatusMessage('');
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('game:chess:move', (data: { from: string; to: string; promotion?: string }) => {
      try {
        const move = chessRef.current.move({
          from: data.from,
          to: data.to,
          promotion: data.promotion || 'q',
        });
        if (move) {
          updateGameState();
          setSelectedSquare(null);
          setValidMoves([]);
        }
      } catch (err) {
        console.error('Invalid incoming move:', err);
      }
    });

    socket.on('game:chess:reset', () => {
      chessRef.current.reset();
      updateGameState();
      setSelectedSquare(null);
      setValidMoves([]);
      toast('Chess board reset');
    });

    return () => {
      socket.off('game:chess:move');
      socket.off('game:chess:reset');
    };
  }, [socket]);

  const handleSquareClick = (r: number, c: number) => {
    const game = chessRef.current;
    if (game.isGameOver()) return;

    const sq = coordsToSquare(r, c);
    const piece = game.get(sq);

    // If already selected a square
    if (selectedSquare) {
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }

      // Try making the move
      try {
        const move = game.move({
          from: selectedSquare,
          to: sq,
          promotion: 'q', // auto queen promotion
        });

        if (move) {
          updateGameState();
          setSelectedSquare(null);
          setValidMoves([]);

          // Broadcast to partner
          socket?.emit('game:chess:move', {
            from: move.from,
            to: move.to,
            promotion: move.promotion,
          });
          return;
        }
      } catch (err) {
        // Illegal move - check if clicked on another piece of own color to switch selection
        if (piece && piece.color === game.turn()) {
          setSelectedSquare(sq);
          const moves = game.moves({ square: sq, verbose: true });
          setValidMoves(moves.map(m => m.to));
          return;
        }
        toast.error('Illegal Move according to Chess rules!');
        setSelectedSquare(null);
        setValidMoves([]);
      }
    } else {
      // Selecting a piece
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(sq);
        const moves = game.moves({ square: sq, verbose: true });
        setValidMoves(moves.map(m => m.to));
      }
    }
  };

  const handleReset = () => {
    chessRef.current.reset();
    updateGameState();
    setSelectedSquare(null);
    setValidMoves([]);
    socket?.emit('game:chess:reset');
  };

  const currentBoard = chessRef.current.board();
  const currentTurn = chessRef.current.turn() === 'w' ? 'White (Gold)' : 'Black (Neon Violet)';

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto flex flex-col items-center select-none pb-28">
      {/* Top Header */}
      <header className="w-full flex justify-between items-center mb-5">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-slate-300"
        >
          ← Games
        </button>
        <div className="text-center">
          <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-300 to-pink-400">
            3D Cyber Chess ♟️
          </h2>
          <span className="text-[11px] font-semibold text-pink-400">
            Turn: {currentTurn}
          </span>
        </div>
        <button
          onClick={() => setView3D(!view3D)}
          className="px-3.5 py-1.5 rounded-2xl bg-pink-500/20 border border-pink-500/30 text-[11px] font-bold text-pink-300"
        >
          {view3D ? 'Flat View' : '3D View'}
        </button>
      </header>

      {/* Check / Alert Banner */}
      {statusMessage && (
        <div className="w-full p-2.5 mb-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold text-center animate-pulse">
          {statusMessage}
        </div>
      )}

      {/* Chess Board Container */}
      <div 
        className="w-full aspect-square max-w-[390px] p-3 rounded-[32px] glass-panel transition-all duration-700 ease-out flex items-center justify-center relative"
        style={{ perspective: view3D ? '900px' : 'none' }}
      >
        <div 
          className="w-full h-full grid grid-cols-8 grid-rows-8 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10"
          style={{
            transform: view3D ? 'rotateX(32deg) scale(0.92)' : 'none',
            transformStyle: 'preserve-3d',
            boxShadow: view3D ? '0 30px 60px rgba(0,0,0,0.9), 0 0 35px rgba(244,63,142,0.2)' : 'none',
          }}
        >
          {currentBoard.map((row, r) =>
            row.map((piece, c) => {
              const sq = coordsToSquare(r, c);
              const isDark = (r + c) % 2 === 1;
              const isSelected = selectedSquare === sq;
              const isValidDestination = validMoves.includes(sq);

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleSquareClick(r, c)}
                  className={`relative flex items-center justify-center transition-all cursor-pointer ${
                    isDark ? 'bg-[#18182c]' : 'bg-[#292942]'
                  } ${isSelected ? '!bg-pink-500/40 ring-2 ring-pink-400 z-10' : ''}`}
                >
                  {/* Legal move highlight dot */}
                  {isValidDestination && (
                    <span className="absolute w-3 h-3 rounded-full bg-emerald-400/80 shadow-[0_0_10px_#34d399] z-20 pointer-events-none animate-ping" />
                  )}

                  {piece && (
                    <span 
                      className={`text-2xl sm:text-3xl font-bold transition-transform ${
                        view3D ? '-translate-y-1' : ''
                      } ${
                        piece.color === 'w'
                          ? 'text-amber-200 drop-shadow-[0_4px_10px_rgba(253,230,138,0.7)]' 
                          : 'text-pink-400 drop-shadow-[0_4px_12px_rgba(244,63,142,0.8)]'
                      } ${isSelected ? 'scale-125' : 'hover:scale-110'}`}
                    >
                      {PIECE_ICONS[piece.color === 'w' ? piece.type.toUpperCase() : piece.type]}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Legal Move Helper Text */}
      <p className="text-[11px] text-slate-400 mt-4 text-center">
        {selectedSquare 
          ? 'Tap any glowing green square to move according to FIDE rules' 
          : 'Tap your piece to see its legal moves on the board'}
      </p>

      {/* Control Buttons */}
      <div className="w-full flex justify-center gap-4 mt-4">
        <button
          onClick={handleReset}
          className="px-6 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
        >
          Reset Game 🔄
        </button>
      </div>
    </div>
  );
}
