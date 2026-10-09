'use client';
import { useState, useEffect } from 'react';
import { useSocketStore } from '../../lib/store/socketStore';
import { useAuthStore } from '../../lib/store/authStore';

export default function TicTacToe({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  
  const socket = useSocketStore(state => state.socket);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('game:tictactoe:move', (data: { index: number, symbol: string }) => {
      setBoard(prev => {
        const newBoard = [...prev];
        newBoard[data.index] = data.symbol;
        checkWinner(newBoard);
        return newBoard;
      });
      setIsMyTurn(true);
    });

    socket.on('game:tictactoe:reset', () => {
      setBoard(Array(9).fill(null));
      setWinner(null);
      setIsMyTurn(true);
    });

    return () => {
      socket.off('game:tictactoe:move');
      socket.off('game:tictactoe:reset');
    };
  }, [socket]);

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        setWinner(squares[a]);
        return;
      }
    }
    if (!squares.includes(null)) setWinner('draw');
  };

  const handleMove = (index: number) => {
    if (board[index] || winner || !isMyTurn) return;

    const mySymbol = 'X'; // Assume player 1 is X for simplicity
    
    const newBoard = [...board];
    newBoard[index] = mySymbol;
    setBoard(newBoard);
    setIsMyTurn(false);
    checkWinner(newBoard);

    socket?.emit('game:tictactoe:move', { index, symbol: mySymbol });
  };

  const resetGame = () => {
    socket?.emit('game:tictactoe:reset');
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsMyTurn(true);
  };

  return (
    <div className="p-6 max-w-lg mx-auto flex flex-col items-center h-full">
      <header className="w-full flex items-center justify-between mb-12">
        <button onClick={onBack} className="text-white/60 hover:text-white">← Back</button>
        <h1 className="font-bold text-xl">Tic-Tac-Toe</h1>
        <div className="w-10"></div>
      </header>

      <div className="text-center mb-8">
        {winner ? (
          <h2 className="text-2xl font-bold text-primary animate-bounce">
            {winner === 'draw' ? "It's a draw!" : `${winner} wins! 🎉`}
          </h2>
        ) : (
          <h2 className="text-xl">
            {isMyTurn ? "Your turn!" : "Waiting for partner..."}
          </h2>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 w-full max-w-[300px] aspect-square">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleMove(i)}
            disabled={!isMyTurn || !!cell || !!winner}
            className={`bg-surface rounded-xl flex items-center justify-center text-5xl font-bold transition-all ${
              cell === 'X' ? 'text-primary' : 'text-secondary'
            } ${!cell && isMyTurn && !winner ? 'hover:bg-surface/80 cursor-pointer' : 'cursor-default'}`}
          >
            {cell}
          </button>
        ))}
      </div>

      {winner && (
        <button
          onClick={resetGame}
          className="mt-12 px-8 py-3 rounded-full bg-gradient-to-r from-primary to-secondary font-bold shadow-lg hover:shadow-primary/50 transition-all"
        >
          Play Again
        </button>
      )}
    </div>
  );
}
