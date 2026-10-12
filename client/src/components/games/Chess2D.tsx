'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol, Move } from 'chess.js';
import {
  ArrowLeft,
  RotateCcw,
  Bot,
  Users,
  Swords,
  X,
  Sparkles,
  Search,
  UserPlus,
  Volume2,
  VolumeX,
  Maximize2,
  Flag,
  Copy,
  Check,
  Send,
  MessageSquare,
  ShieldAlert,
  Trophy,
  Shuffle,
  Undo2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../lib/store/authStore';
import { useSocketStore } from '../../lib/store/socketStore';
import { useGameStore } from '../../lib/store/gameStore';
import api from '../../lib/api';
import { Friend } from '../../lib/types';

// Web Audio API Sound Synthesizer for high fidelity chess effects
class ChessSoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playMove() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  playCapture() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }

  playCheck() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [580, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.3, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.07 + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.15);
      });
    } catch {}
  }

  playVictory() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [523, 659, 784, 1046].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.3, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.35);
      });
    } catch {}
  }

  playDefeat() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [350, 311, 277, 220].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.25, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.35);
      });
    } catch {}
  }
}

const sounds = new ChessSoundEngine();

// Piece values & positional tables for AI Minimax Engine
const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

function evaluateBoard(chess: Chess): number {
  let totalScore = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      let score = PIECE_VALUES[piece.type];
      const squareIdx = piece.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;

      if (piece.type === 'p') score += PAWN_TABLE[squareIdx];
      else if (piece.type === 'n') score += KNIGHT_TABLE[squareIdx];
      else if (piece.type === 'b') score += BISHOP_TABLE[squareIdx];
      else if (piece.type === 'r') score += ROOK_TABLE[squareIdx];
      else if (piece.type === 'q') score += QUEEN_TABLE[squareIdx];
      else if (piece.type === 'k') score += KING_TABLE[squareIdx];

      totalScore += piece.color === 'w' ? score : -score;
    }
  }

  return totalScore;
}

function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): { score: number; move: Move | null } {
  if (depth === 0 || chess.isGameOver()) {
    return { score: evaluateBoard(chess), move: null };
  }

  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) {
    return { score: evaluateBoard(chess), move: null };
  }

  let bestMove: Move = moves[0];

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const evaluation = minimax(chess, depth - 1, alpha, beta, false).score;
      chess.undo();
      if (evaluation > maxEval) {
        maxEval = evaluation;
        bestMove = move;
      }
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const evaluation = minimax(chess, depth - 1, alpha, beta, true).score;
      chess.undo();
      if (evaluation < minEval) {
        minEval = evaluation;
        bestMove = move;
      }
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
}

// Quick Chat Presets
const QUICK_CHAT_PRESETS = [
  'Good move!',
  'Well played!',
  'Rematch?',
  'Thinking...',
  'Nice game!',
  'One more round!',
  'Checkmate incoming!',
];

// AI Simulated Quick Responses
const AI_CHAT_RESPONSES = [
  'Nice move! Let us see how this plays out.',
  'Well played! I am calculating my response.',
  'Good game! You play well.',
  'Let us see what the board holds.',
  'Always ready for another round!',
];

interface Chess2DProps {
  onBack: () => void;
}

export default function Chess2D({ onBack }: Chess2DProps) {
  const user = useAuthStore((state) => state.user);
  const socket = useSocketStore((state) => state.socket);
  const { sessionData, setSessionData } = useGameStore();

  // Core Game State
  const [chess] = useState<Chess>(() => new Chess());
  const [fen, setFen] = useState<string>(chess.fen());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Settings & Display
  const [isMuted, setIsMuted] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showResignModal, setShowResignModal] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Game Over Modal State
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [gameOverInfo, setGameOverInfo] = useState<{
    result: 'win' | 'loss' | 'draw';
    title: string;
    subtitle: string;
    reason: string;
  } | null>(null);

  // Mode Selection
  const [mode, setMode] = useState<'ai' | 'pass' | 'online'>('ai');
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Online Multiplayer State
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<'w' | 'b'>('w');
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [isWaitingForFriend, setIsWaitingForFriend] = useState(false);
  const [isOpponentConnected, setIsOpponentConnected] = useState(false);

  // Clocks / Timers (in seconds)
  const [timeControl, setTimeControl] = useState<number>(300); // 5 min default, 0 = untimed
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Chat State (with 2.5s floating bubble)
  const [showChatModal, setShowChatModal] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; sender: string; text: string; isMe: boolean }>
  >([]);
  const [chatInput, setChatInput] = useState('');
  const [floatingMessage, setFloatingMessage] = useState<{ sender: string; text: string } | null>(null);
  const floatingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Friends Modal State
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [onlineUsersMap, setOnlineUsersMap] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState(false);

  const boardContainerRef = useRef<HTMLDivElement>(null);

  // Sound Engine Mute sync
  const toggleMute = () => {
    sounds.muted = !sounds.muted;
    setIsMuted(sounds.muted);
  };

  // Turn detection
  const turn = chess.turn(); // 'w' | 'b'
  const isGameOver = chess.isGameOver();
  const isCheck = chess.isCheck();

  // Floating chat bubble trigger
  const triggerFloatingMessage = useCallback((sender: string, text: string) => {
    if (floatingTimerRef.current) clearTimeout(floatingTimerRef.current);
    setFloatingMessage({ sender, text });
    floatingTimerRef.current = setTimeout(() => {
      setFloatingMessage(null);
    }, 2500);
  }, []);

  // Find King square for check highlight
  const kingInCheckSquare = useMemo(() => {
    if (!isCheck) return null;
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          const fileArr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          const rankArr = ['8', '7', '6', '5', '4', '3', '2', '1'];
          return `${fileArr[c]}${rankArr[r]}` as Square;
        }
      }
    }
    return null;
  }, [chess, fen, isCheck, turn]);

  // Captured pieces calculation
  const capturedPieces = useMemo(() => {
    const counts: Record<string, number> = {
      wP: 0, wN: 0, wB: 0, wR: 0, wQ: 0,
      bP: 0, bN: 0, bB: 0, bR: 0, bQ: 0,
    };
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type !== 'k') {
          const key = `${p.color}${p.type.toUpperCase()}`;
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }

    const standard: Record<string, number> = {
      wP: 8, wN: 2, wB: 2, wR: 2, wQ: 1,
      bP: 8, bN: 2, bB: 2, bR: 2, bQ: 1,
    };

    const whiteCaptured: PieceSymbol[] = []; // Black pieces captured by White
    const blackCaptured: PieceSymbol[] = []; // White pieces captured by Black

    (['p', 'n', 'b', 'r', 'q'] as PieceSymbol[]).forEach((type) => {
      const uType = type.toUpperCase();
      const whiteLoss = standard[`w${uType}`] - (counts[`w${uType}`] || 0);
      for (let i = 0; i < whiteLoss; i++) blackCaptured.push(type);

      const blackLoss = standard[`b${uType}`] - (counts[`b${uType}`] || 0);
      for (let i = 0; i < blackLoss; i++) whiteCaptured.push(type);
    });

    let whiteMat = 0;
    let blackMat = 0;
    whiteCaptured.forEach((p) => (whiteMat += PIECE_VALUES[p]));
    blackCaptured.forEach((p) => (blackMat += PIECE_VALUES[p]));

    return {
      whiteCaptured,
      blackCaptured,
      advantage: whiteMat - blackMat,
    };
  }, [chess, fen]);

  // Check Game Over and trigger GameOverModal
  const handleCheckGameOver = useCallback(() => {
    if (!chess.isGameOver()) return;

    setIsTimerRunning(false);

    let result: 'win' | 'loss' | 'draw' = 'draw';
    let title = 'Game Over';
    let subtitle = '';
    let reason = '';

    if (chess.isCheckmate()) {
      const winnerColor = chess.turn() === 'w' ? 'b' : 'w';
      reason = 'Checkmate delivered on the board.';

      if (mode === 'ai') {
        if (winnerColor === 'w') {
          result = 'win';
          title = 'VICTORY';
          subtitle = 'You defeated the AI by checkmate!';
          sounds.playVictory();
        } else {
          result = 'loss';
          title = 'DEFEAT';
          subtitle = 'You lost by checkmate against the AI.';
          sounds.playDefeat();
        }
      } else if (mode === 'online') {
        if (winnerColor === playerRole) {
          result = 'win';
          title = 'VICTORY';
          subtitle = `You defeated ${opponentName || 'Opponent'} by checkmate!`;
          sounds.playVictory();
        } else {
          result = 'loss';
          title = 'DEFEAT';
          subtitle = `You lost by checkmate to ${opponentName || 'Opponent'}.`;
          sounds.playDefeat();
        }
      } else {
        result = 'win';
        title = `${winnerColor === 'w' ? 'White' : 'Black'} Wins!`;
        subtitle = `${winnerColor === 'w' ? 'White' : 'Black'} won by checkmate.`;
        sounds.playVictory();
      }
    } else if (chess.isStalemate()) {
      result = 'draw';
      title = 'STALEMATE';
      subtitle = 'Game drawn. No legal moves remaining.';
      reason = 'Stalemate reached.';
      sounds.playMove();
    } else if (chess.isThreefoldRepetition()) {
      result = 'draw';
      title = 'DRAW';
      subtitle = 'Game drawn by threefold repetition.';
      reason = 'Same position repeated 3 times.';
      sounds.playMove();
    } else if (chess.isInsufficientMaterial()) {
      result = 'draw';
      title = 'DRAW';
      subtitle = 'Game drawn by insufficient material.';
      reason = 'Neither player has enough pieces to checkmate.';
      sounds.playMove();
    } else if (chess.isDraw()) {
      result = 'draw';
      title = 'DRAW';
      subtitle = 'Game concluded in a draw.';
      reason = '50-move rule or draw agreement.';
      sounds.playMove();
    }

    setGameOverInfo({ result, title, subtitle, reason });
    setShowGameOverModal(true);
  }, [chess, mode, playerRole, opponentName]);

  // Clocks countdown timer
  useEffect(() => {
    if (timeControl === 0 || isGameOver || !isTimerRunning) return;

    const interval = setInterval(() => {
      if (turn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleTimeOut('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleTimeOut('b');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeControl, isGameOver, isTimerRunning, turn]);

  const handleTimeOut = (color: 'w' | 'b') => {
    setIsTimerRunning(false);
    const winnerColor = color === 'w' ? 'b' : 'w';
    let result: 'win' | 'loss' | 'draw' = 'draw';

    if (mode === 'ai') {
      result = winnerColor === 'w' ? 'win' : 'loss';
      if (result === 'win') sounds.playVictory();
      else sounds.playDefeat();
    } else if (mode === 'online') {
      result = winnerColor === playerRole ? 'win' : 'loss';
      if (result === 'win') sounds.playVictory();
      else sounds.playDefeat();
    }

    setGameOverInfo({
      result,
      title: result === 'win' ? 'VICTORY' : 'DEFEAT',
      subtitle: `${color === 'w' ? 'White' : 'Black'} ran out of time.`,
      reason: 'Time flag fallen.',
    });
    setShowGameOverModal(true);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Perform Local or Remote Move
  const executeMove = useCallback(
    (moveOptions: { from: Square; to: Square; promotion?: PieceSymbol }) => {
      try {
        const move = chess.move(moveOptions);
        if (!move) return null;

        const newFen = chess.fen();
        setFen(newFen);
        setSelectedSquare(null);
        setValidMoves([]);
        setLastMove({ from: move.from, to: move.to });
        setIsTimerRunning(true);

        if (chess.isGameOver()) {
          handleCheckGameOver();
        } else if (chess.isCheck()) {
          sounds.playCheck();
        } else if (move.captured) {
          sounds.playCapture();
        } else {
          sounds.playMove();
        }

        return move;
      } catch (err) {
        console.error('Invalid move attempted:', err);
        return null;
      }
    },
    [chess, handleCheckGameOver]
  );

  // Trigger AI Move
  const makeAiMove = useCallback(() => {
    if (chess.isGameOver() || chess.turn() !== 'b') return;

    setIsAiThinking(true);
    setTimeout(() => {
      const moves = chess.moves({ verbose: true });
      if (moves.length === 0) {
        setIsAiThinking(false);
        handleCheckGameOver();
        return;
      }

      let chosenMove: Move = moves[0];

      if (aiDifficulty === 'easy') {
        const captures = moves.filter((m) => m.captured);
        if (captures.length > 0 && Math.random() < 0.6) {
          chosenMove = captures[Math.floor(Math.random() * captures.length)];
        } else {
          chosenMove = moves[Math.floor(Math.random() * moves.length)];
        }
      } else if (aiDifficulty === 'medium') {
        const result = minimax(chess, 2, -Infinity, Infinity, false);
        if (result.move) chosenMove = result.move;
      } else {
        const result = minimax(chess, 3, -Infinity, Infinity, false);
        if (result.move) chosenMove = result.move;
      }

      executeMove({
        from: chosenMove.from,
        to: chosenMove.to,
        promotion: chosenMove.promotion as PieceSymbol | undefined,
      });

      setIsAiThinking(false);
    }, 450);
  }, [chess, aiDifficulty, executeMove, handleCheckGameOver]);

  // Handle Square Click/Tap
  const handleSquareClick = (square: Square) => {
    if (isGameOver || isAiThinking) return;

    if (mode === 'online') {
      if (turn !== playerRole) return;
      if (!isOpponentConnected) {
        toast('Waiting for opponent to connect before moving.');
        return;
      }
    }

    if (mode === 'ai' && turn === 'b') return;

    const pieceOnSquare = chess.get(square);
    const matchingValidMove = validMoves.find((m) => m.to === square);

    if (matchingValidMove && selectedSquare) {
      const piece = chess.get(selectedSquare);
      const isPawnPromotion =
        piece?.type === 'p' &&
        ((piece.color === 'w' && square[1] === '8') || (piece.color === 'b' && square[1] === '1'));

      if (isPawnPromotion) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }

      const move = executeMove({ from: selectedSquare, to: square });

      if (move && mode === 'online' && sessionCode && socket) {
        socket.emit('chess:move', {
          sessionCode,
          move: {
            from: move.from,
            to: move.to,
            promotion: move.promotion,
          },
          fen: chess.fen(),
        });
      }

      if (mode === 'ai' && chess.turn() === 'b') {
        setTimeout(makeAiMove, 200);
      }
      return;
    }

    if (pieceOnSquare && pieceOnSquare.color === turn) {
      if (mode === 'online' && pieceOnSquare.color !== playerRole) return;

      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setValidMoves(moves);
      return;
    }

    setSelectedSquare(null);
    setValidMoves([]);
  };

  // Complete Pawn Promotion Selection
  const handleSelectPromotion = (pieceType: PieceSymbol) => {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    setPendingPromotion(null);

    const move = executeMove({ from, to, promotion: pieceType });

    if (move && mode === 'online' && sessionCode && socket) {
      socket.emit('chess:move', {
        sessionCode,
        move: {
          from: move.from,
          to: move.to,
          promotion: pieceType,
        },
        fen: chess.fen(),
      });
    }

    if (mode === 'ai' && chess.turn() === 'b') {
      setTimeout(makeAiMove, 200);
    }
  };

  // Reset Game / Play Again
  const handleResetBoard = (resetClocks = true) => {
    chess.reset();
    setFen(chess.fen());
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setPendingPromotion(null);
    setIsAiThinking(false);
    setShowGameOverModal(false);
    setGameOverInfo(null);
    if (resetClocks) {
      setWhiteTime(timeControl);
      setBlackTime(timeControl);
      setIsTimerRunning(false);
    }
  };

  // Undo Move (Solo AI or Pass & Play only)
  const handleUndoMove = () => {
    if (mode === 'online') {
      toast.error('Undo is disabled in competitive online matches.');
      return;
    }
    if (isAiThinking || chess.history().length === 0) return;

    if (mode === 'ai') {
      chess.undo();
      if (chess.turn() === 'b') chess.undo();
    } else {
      chess.undo();
    }
    setFen(chess.fen());
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setShowGameOverModal(false);
  };

  // Resign Match
  const handleResign = () => {
    setShowResignModal(false);
    if (mode === 'online' && sessionCode && socket) {
      socket.emit('chess:resign', {
        sessionCode,
        role: playerRole,
      });
    }
    sounds.playDefeat();
    setGameOverInfo({
      result: 'loss',
      title: 'DEFEAT',
      subtitle: 'You resigned the match.',
      reason: 'Player conceded defeat.',
    });
    setShowGameOverModal(true);
  };

  // Send In-Game Chat Message
  const handleSendChat = (messageText?: string) => {
    const text = (messageText || chatInput).trim();
    if (!text) return;

    const myName = user?.displayName || 'You';
    const newMsg = {
      id: Math.random().toString(),
      sender: myName,
      text,
      isMe: true,
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    setShowChatModal(false);
    triggerFloatingMessage(myName, text);

    if (mode === 'online' && sessionCode && socket) {
      socket.emit('chess:chat', {
        sessionCode,
        text,
        senderName: myName,
      });
    } else if (mode === 'ai') {
      setTimeout(() => {
        const aiReply =
          AI_CHAT_RESPONSES[Math.floor(Math.random() * AI_CHAT_RESPONSES.length)];
        const replyMsg = {
          id: Math.random().toString(),
          sender: `AI (${aiDifficulty.toUpperCase()})`,
          text: aiReply,
          isMe: false,
        };
        setChatMessages((prev) => [...prev, replyMsg]);
        triggerFloatingMessage(`AI (${aiDifficulty.toUpperCase()})`, aiReply);
        if (!showChatModal) setUnreadChatCount((prev) => prev + 1);
      }, 900);
    }
  };

  // Switch to Solo AI Mode
  const handleSelectAiMode = (diff = aiDifficulty) => {
    setMode('ai');
    setAiDifficulty(diff);
    setIsWaitingForFriend(false);
    setIsOpponentConnected(false);
    setSessionCode(null);
    setOpponentName(null);
    setIsFlipped(false);
    handleResetBoard();
    toast.success(`Solo AI active: ${diff.toUpperCase()} mode.`);
  };

  // Switch to Pass & Play Mode
  const handleSelectPassMode = () => {
    setMode('pass');
    setIsWaitingForFriend(false);
    setIsOpponentConnected(false);
    setSessionCode(null);
    setOpponentName(null);
    handleResetBoard();
    toast.success('Pass & Play active: 2 players on 1 device.');
  };

  // Handle incoming sessionData if user clicked Accept on global invite
  useEffect(() => {
    if (sessionData?.sessionCode) {
      const code = sessionData.sessionCode;
      const role = (sessionData.role as 'w' | 'b') || 'b';
      const opp = sessionData.opponentName || 'Friend';
      const oppId = sessionData.opponentId || null;

      setMode('online');
      setSessionCode(code);
      setPlayerRole(role);
      setOpponentName(opp);
      setOpponentId(oppId);
      setIsWaitingForFriend(false);
      setIsOpponentConnected(true);
      setIsFlipped(role === 'b');
      handleResetBoard();

      const myName = user?.displayName || 'Player';
      if (socket) {
        socket.emit('chess:join', {
          sessionCode: code,
          role,
          playerName: myName,
        });
      }

      setSessionData(null);
      toast.success(
        `Joined match with ${opp}. You are playing as ${role === 'w' ? 'White' : 'Black'}.`
      );
    }
  }, [sessionData, socket, user, setSessionData]);

  // Load mutual friends from API
  const fetchFriends = useCallback(async () => {
    setLoadingFriends(true);
    try {
      const res = await api.get('/friends');
      const friends: Friend[] = res.data.friends || [];
      setFriendsList(friends);

      if (socket && friends.length > 0) {
        const friendIds = friends.map((f) => f._id);
        socket.emit('presence:query', { targetUserIds: friendIds });
      }
    } catch (err) {
      console.error('Failed to load friends list:', err);
    } finally {
      setLoadingFriends(false);
    }
  }, [socket]);

  // Handle presence events
  useEffect(() => {
    if (!socket) return;

    const handlePresenceStatus = (statusMap: Record<string, boolean>) => {
      setOnlineUsersMap((prev) => ({ ...prev, ...statusMap }));
    };
    const handleUserOnline = ({ userId }: { userId: string }) => {
      setOnlineUsersMap((prev) => ({ ...prev, [userId]: true }));
    };
    const handleUserOffline = ({ userId }: { userId: string }) => {
      setOnlineUsersMap((prev) => ({ ...prev, [userId]: false }));
    };

    socket.on('presence:status', handlePresenceStatus);
    socket.on('presence:online', handleUserOnline);
    socket.on('presence:offline', handleUserOffline);

    return () => {
      socket.off('presence:status', handlePresenceStatus);
      socket.off('presence:online', handleUserOnline);
      socket.off('presence:offline', handleUserOffline);
    };
  }, [socket]);

  // Socket Game Event Handlers
  useEffect(() => {
    if (!socket) return;

    const handleInviteAccepted = (data: { acceptedBy: string; sessionCode: string }) => {
      if (data.sessionCode === sessionCode) {
        setIsWaitingForFriend(false);
        setIsOpponentConnected(true);
        toast.success(`${opponentName || 'Friend'} accepted your challenge.`);
      }
    };

    const handleInviteDeclined = (data: { game: string }) => {
      if (data.game === 'chess') {
        setIsWaitingForFriend(false);
        toast.error(`${opponentName || 'Friend'} declined the challenge.`);
      }
    };

    const handleOpponentJoined = (data: { playerName: string; role: string }) => {
      setIsWaitingForFriend(false);
      setIsOpponentConnected(true);
      toast.success(`${data.playerName || 'Opponent'} joined the match.`);
    };

    const handleRemoteMove = (data: { move: Move; fen: string }) => {
      try {
        const move = chess.move(data.move);
        if (move) {
          setFen(chess.fen());
          setSelectedSquare(null);
          setValidMoves([]);
          setLastMove({ from: move.from, to: move.to });
          setIsTimerRunning(true);

          if (chess.isGameOver()) {
            handleCheckGameOver();
          } else if (chess.isCheck()) {
            sounds.playCheck();
          } else if (move.captured) {
            sounds.playCapture();
          } else {
            sounds.playMove();
          }
        } else if (data.fen) {
          chess.load(data.fen);
          setFen(chess.fen());
        }
      } catch (err) {
        if (data.fen) {
          chess.load(data.fen);
          setFen(chess.fen());
        }
      }
    };

    const handleRemoteChat = (data: { text: string; senderName: string }) => {
      const msg = {
        id: Math.random().toString(),
        sender: data.senderName,
        text: data.text,
        isMe: false,
      };
      setChatMessages((prev) => [...prev, msg]);
      triggerFloatingMessage(data.senderName, data.text);
      if (!showChatModal) setUnreadChatCount((prev) => prev + 1);
    };

    const handleRematch = () => {
      handleResetBoard();
      toast.success('Opponent requested a rematch. Board reset.');
    };

    const handleOpponentResign = () => {
      sounds.playVictory();
      setGameOverInfo({
        result: 'win',
        title: 'VICTORY',
        subtitle: `${opponentName || 'Opponent'} resigned the match.`,
        reason: 'Opponent conceded defeat.',
      });
      setShowGameOverModal(true);
    };

    const handleOpponentLeft = () => {
      setIsOpponentConnected(false);
      toast('Opponent disconnected or left match.');
    };

    socket.on('game:invite:accepted', handleInviteAccepted);
    socket.on('game:invite:declined', handleInviteDeclined);
    socket.on('chess:opponent_joined', handleOpponentJoined);
    socket.on('chess:move', handleRemoteMove);
    socket.on('chess:chat', handleRemoteChat);
    socket.on('chess:rematch', handleRematch);
    socket.on('chess:resign', handleOpponentResign);
    socket.on('chess:opponent_left', handleOpponentLeft);

    return () => {
      socket.off('game:invite:accepted', handleInviteAccepted);
      socket.off('game:invite:declined', handleInviteDeclined);
      socket.off('chess:opponent_joined', handleOpponentJoined);
      socket.off('chess:move', handleRemoteMove);
      socket.off('chess:chat', handleRemoteChat);
      socket.off('chess:rematch', handleRematch);
      socket.off('chess:resign', handleOpponentResign);
      socket.off('chess:opponent_left', handleOpponentLeft);
    };
  }, [socket, sessionCode, opponentName, chess, handleCheckGameOver, showChatModal, triggerFloatingMessage]);

  // Challenge friend
  const handleChallengeFriend = (friend: Friend) => {
    const generatedCode = `CHESS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const myName = user?.displayName || 'Player';

    setMode('online');
    setSessionCode(generatedCode);
    setPlayerRole('w');
    setOpponentName(friend.displayName);
    setOpponentId(friend._id);
    setIsWaitingForFriend(true);
    setIsOpponentConnected(false);
    setIsFlipped(false);
    handleResetBoard();

    if (socket) {
      socket.emit('game:invite', {
        targetUserId: friend._id,
        senderName: myName,
        senderAvatar: user?.avatar,
        game: 'chess',
        sessionCode: generatedCode,
      });

      socket.emit('chess:join', {
        sessionCode: generatedCode,
        role: 'w',
        playerName: myName,
      });
    }

    setShowFriendsModal(false);
    toast.success(`Challenge sent to ${friend.displayName}. Waiting for acceptance.`);
  };

  // Copy Match Code
  const handleCopyCode = () => {
    if (!sessionCode) return;
    navigator.clipboard.writeText(sessionCode);
    setCopiedCode(true);
    toast.success('Match code copied.');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Rematch request
  const handleRequestRematch = () => {
    if (mode === 'online' && sessionCode && socket) {
      socket.emit('chess:rematch', { sessionCode });
    }
    handleResetBoard();
    toast.success('Board reset for new match.');
  };

  // Leave Game
  const handleLeaveGame = () => {
    if (sessionCode && socket) {
      socket.emit('chess:leave', { sessionCode });
    }
    onBack();
  };

  // Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      boardContainerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Ranks & Files definitions based on orientation
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayFiles = isFlipped ? [...files].reverse() : files;
  const displayRanks = isFlipped ? [...ranks].reverse() : ranks;

  // Board Wood Palette as requested by reference image
  const WOOD_LIGHT = '#dfba87';
  const WOOD_DARK = '#a86134';

  return (
    <div
      ref={boardContainerRef}
      className="fixed inset-0 z-[100] bg-[#090b10] text-slate-100 flex flex-col select-none overflow-hidden font-sans"
    >
      {/* Top Navigation Bar - Compact and 100% visible on Mobile & Desktop */}
      <header className="h-14 px-2.5 sm:px-5 flex items-center justify-between border-b border-white/10 bg-[#0c0e14]/95 backdrop-blur-md z-30 shrink-0 w-full">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            onClick={handleLeaveGame}
            className="flex items-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Arcade</span>
          </button>
          <div className="flex items-center gap-1">
            <span className="text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-amber-200">
              <span className="sm:hidden">Chess</span>
              <span className="hidden sm:inline">Classic 2D Chess</span>
            </span>
          </div>
        </div>

        {/* Right: Sound, Chat, Challenge (Always Visible on Mobile & Desktop) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* In-Game Match Chat Toggle */}
          <button
            onClick={() => {
              setShowChatModal(true);
              setUnreadChatCount(0);
            }}
            className="relative p-1.5 sm:p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
            title="Match Chat"
          >
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-black flex items-center justify-center text-white">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Friend Challenge Button */}
          <button
            onClick={() => {
              fetchFriends();
              setShowFriendsModal(true);
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 hover:from-amber-500/30 to-orange-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Swords className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Challenge</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            title="Fullscreen"
            className="hidden md:flex p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Game Screen */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto">
        {/* Floating In-Game Chat Bubble (2.5 Seconds) */}
        <AnimatePresence>
          {floatingMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-3 z-40 px-4 py-2 rounded-2xl bg-[#1a1410]/95 border-2 border-amber-500/50 shadow-2xl backdrop-blur-md flex items-center gap-2 max-w-sm pointer-events-none"
            >
              <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-amber-300 mr-1.5">{floatingMessage.sender}:</span>
                <span className="text-xs text-white font-medium">{floatingMessage.text}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Board and Player Area Container */}
        <div className="flex flex-col items-center justify-center w-full max-w-[530px]">
          {/* Mode Tabs & AI Difficulty Bar (Always Visible on Mobile & Desktop) */}
          <div className="w-full flex items-center justify-between gap-1.5 mb-2 px-1">
            {/* Mode Switcher */}
            <div className="flex items-center p-0.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs">
              <button
                onClick={() => handleSelectAiMode()}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  mode === 'ai'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span className="text-[11px] sm:text-xs">Solo AI</span>
              </button>
              <button
                onClick={handleSelectPassMode}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  mode === 'pass'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="text-[11px] sm:text-xs">2P</span>
              </button>
              <button
                onClick={() => {
                  fetchFriends();
                  setShowFriendsModal(true);
                }}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  mode === 'online'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="text-[11px] sm:text-xs">Friends</span>
              </button>
            </div>

            {/* AI Difficulty Dropdown (Visible on Mobile & Desktop in Solo AI mode) */}
            {mode === 'ai' && (
              <div className="flex items-center gap-1">
                <select
                  value={aiDifficulty}
                  onChange={(e) => handleSelectAiMode(e.target.value as 'easy' | 'medium' | 'hard')}
                  className="bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 rounded-xl px-2 py-1 text-[11px] font-bold text-amber-300 outline-none cursor-pointer"
                >
                  <option value="easy" className="bg-[#12141c] text-white">Casual (Easy)</option>
                  <option value="medium" className="bg-[#12141c] text-amber-300 font-bold">Tactician (Medium)</option>
                  <option value="hard" className="bg-[#12141c] text-white">Grandmaster (Hard)</option>
                </select>
              </div>
            )}

            {/* Online match room code badge */}
            {mode === 'online' && sessionCode && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[10px] font-mono text-cyan-200">
                <span>{sessionCode}</span>
              </div>
            )}
          </div>
          {/* Top Player Card (Opponent or Black) */}
          <div className="w-full flex items-center justify-between px-3.5 py-2 mb-2 rounded-2xl bg-white/[0.04] border border-white/10 text-xs shadow-md">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-3.5 h-3.5 rounded-full border border-white/30 shadow-inner ${
                  isFlipped ? 'bg-white' : 'bg-neutral-900 border-neutral-600'
                }`}
              />
              <span className="font-bold text-slate-100 text-sm">
                {mode === 'online'
                  ? opponentName || 'Opponent'
                  : mode === 'ai'
                  ? `AI (${aiDifficulty.toUpperCase()})`
                  : 'Player 2 (Black)'}
              </span>
              {mode === 'ai' && isAiThinking && (
                <span className="text-[11px] text-amber-400 animate-pulse font-mono">Thinking...</span>
              )}
            </div>

            {/* Top Captured Pieces & Clock */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5">
                {(isFlipped ? capturedPieces.blackCaptured : capturedPieces.whiteCaptured).map((p, idx) => (
                  <img
                    key={idx}
                    src={`/games/chess/pieces/${isFlipped ? 'w' : 'b'}${p.toUpperCase()}.svg`}
                    alt={p}
                    className="w-4 h-4 object-contain inline-block"
                  />
                ))}
              </div>
              {timeControl > 0 && (
                <div
                  className={`px-2.5 py-1 rounded-xl font-mono text-xs font-bold ${
                    (isFlipped ? turn === 'w' : turn === 'b')
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {formatTime(isFlipped ? whiteTime : blackTime)}
                </div>
              )}
            </div>
          </div>

          {/* Luxury Wood Board Frame matching Reference Image */}
          <div className="relative w-full aspect-square rounded-3xl p-3 sm:p-4 bg-gradient-to-br from-[#4a2411] via-[#3a1c0d] to-[#2b1307] border-4 border-[#5d3018] shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_40px_rgba(168,97,52,0.25)] flex flex-col justify-between">
            {/* Top Coordinates Row: a b c d e f g h */}
            <div className="flex justify-between items-center px-4 sm:px-5 pb-1">
              {displayFiles.map((f) => (
                <span
                  key={f}
                  className="w-[12.5%] text-center text-xs sm:text-sm font-black text-[#edd6b5] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                >
                  {f}
                </span>
              ))}
            </div>

            {/* Middle Section: Left Coordinates + 8x8 Grid + Right Coordinates */}
            <div className="flex-1 flex items-stretch">
              {/* Left Coordinates Column: 8 to 1 */}
              <div className="flex flex-col justify-between items-center pr-1.5 sm:pr-2.5 py-1">
                {displayRanks.map((r) => (
                  <span
                    key={r}
                    className="h-[12.5%] flex items-center justify-center text-xs sm:text-sm font-black text-[#edd6b5] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  >
                    {r}
                  </span>
                ))}
              </div>

              {/* 8x8 Board Grid */}
              <div className="flex-1 aspect-square rounded-xl overflow-hidden border-2 border-[#301608] shadow-inner grid grid-cols-8 grid-rows-8">
                {displayRanks.map((rank, rIdx) =>
                  displayFiles.map((file, fIdx) => {
                    const square = `${file}${rank}` as Square;
                    const piece = chess.get(square);
                    const isLight = (rIdx + fIdx) % 2 === 0;
                    const isSelected = selectedSquare === square;
                    const isLastMoveFrom = lastMove?.from === square;
                    const isLastMoveTo = lastMove?.to === square;
                    const isKingCheck = kingInCheckSquare === square;
                    const isValidTarget = validMoves.some((m) => m.to === square);
                    const isTargetCapture = isValidTarget && piece;

                    return (
                      <div
                        key={square}
                        onClick={() => handleSquareClick(square)}
                        style={{
                          backgroundColor: isLight ? WOOD_LIGHT : WOOD_DARK,
                        }}
                        className="relative flex items-center justify-center cursor-pointer select-none transition-colors duration-100"
                      >
                        {/* Last Move Amber Highlight */}
                        {(isLastMoveFrom || isLastMoveTo) && (
                          <div className="absolute inset-0 bg-amber-400/35 pointer-events-none" />
                        )}

                        {/* Selected Square Glow */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-amber-300/40 ring-4 ring-amber-400/90 pointer-events-none" />
                        )}

                        {/* King in Check Red Alert Vignette */}
                        {isKingCheck && (
                          <div className="absolute inset-0 bg-rose-600/50 ring-4 ring-rose-500 animate-pulse pointer-events-none" />
                        )}

                        {/* Piece SVG Image */}
                        {piece && (
                          <img
                            src={`/games/chess/pieces/${piece.color}${piece.type.toUpperCase()}.svg`}
                            alt={`${piece.color} ${piece.type}`}
                            className={`w-[85%] h-[85%] object-contain pointer-events-none transition-transform duration-100 drop-shadow-md ${
                              isSelected ? 'scale-110 drop-shadow-xl' : 'hover:scale-105'
                            }`}
                          />
                        )}

                        {/* Legal Move Indicators */}
                        {isValidTarget && !isTargetCapture && (
                          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/70 shadow-md pointer-events-none" />
                        )}
                        {isTargetCapture && (
                          <div className="absolute inset-1 rounded-full border-4 border-rose-500/80 pointer-events-none" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Coordinates Column: 8 to 1 */}
              <div className="flex flex-col justify-between items-center pl-1.5 sm:pr-0 pl-1.5 py-1">
                {displayRanks.map((r) => (
                  <span
                    key={r}
                    className="h-[12.5%] flex items-center justify-center text-xs sm:text-sm font-black text-[#edd6b5] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Coordinates Row: a b c d e f g h */}
            <div className="flex justify-between items-center px-4 sm:px-5 pt-1">
              {displayFiles.map((f) => (
                <span
                  key={f}
                  className="w-[12.5%] text-center text-xs sm:text-sm font-black text-[#edd6b5] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                >
                  {f}
                </span>
              ))}
            </div>

            {/* Pawn Promotion Dialog Modal Overlay */}
            {pendingPromotion && (
              <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm rounded-3xl flex items-center justify-center p-4">
                <div className="bg-[#141822] border border-amber-500/30 rounded-2xl p-5 shadow-2xl text-center max-w-xs w-full">
                  <h4 className="text-sm font-bold text-white mb-3">Choose Promotion Piece</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => handleSelectPromotion(type)}
                        className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.18] border border-white/10 transition-transform active:scale-95 cursor-pointer flex flex-col items-center justify-center"
                      >
                        <img
                          src={`/games/chess/pieces/${turn}${type.toUpperCase()}.svg`}
                          alt={type}
                          className="w-10 h-10 object-contain drop-shadow"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Player Card (You or White) */}
          <div className="w-full flex items-center justify-between px-3.5 py-2 mt-2 rounded-2xl bg-white/[0.04] border border-white/10 text-xs shadow-md">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-3.5 h-3.5 rounded-full border border-white/30 shadow-inner ${
                  isFlipped ? 'bg-neutral-900 border-neutral-600' : 'bg-white'
                }`}
              />
              <span className="font-bold text-slate-100 text-sm">
                {mode === 'online'
                  ? user?.displayName || 'You'
                  : mode === 'ai'
                  ? `${user?.displayName || 'You'} (White)`
                  : 'Player 1 (White)'}
              </span>
            </div>

            {/* Bottom Captured Pieces & Clock */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5">
                {(isFlipped ? capturedPieces.whiteCaptured : capturedPieces.blackCaptured).map((p, idx) => (
                  <img
                    key={idx}
                    src={`/games/chess/pieces/${isFlipped ? 'b' : 'w'}${p.toUpperCase()}.svg`}
                    alt={p}
                    className="w-4 h-4 object-contain inline-block"
                  />
                ))}
              </div>
              {timeControl > 0 && (
                <div
                  className={`px-2.5 py-1 rounded-xl font-mono text-xs font-bold ${
                    (isFlipped ? turn === 'b' : turn === 'w')
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {formatTime(isFlipped ? blackTime : whiteTime)}
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Control Strip */}
          <div className="w-full mt-2.5 flex items-center justify-between px-1 gap-2 text-xs">
            {/* Turn Status Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10">
              <span
                className={`w-2 h-2 rounded-full ${
                  isGameOver ? 'bg-rose-500' : isCheck ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                }`}
              />
              <span className="font-semibold text-slate-200">
                {isGameOver
                  ? 'Game Concluded'
                  : isCheck
                  ? `${turn === 'w' ? 'White' : 'Black'} in Check!`
                  : `${turn === 'w' ? 'White' : 'Black'} to move`}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Flip Board */}
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                title="Flip Board"
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              {/* Undo Move */}
              {mode !== 'online' && (
                <button
                  onClick={handleUndoMove}
                  title="Undo Move"
                  className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
              )}

              {/* Reset Game */}
              <button
                onClick={handleRequestRematch}
                title="Restart Board"
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Resign Button */}
              {mode === 'online' && (
                <button
                  onClick={() => setShowResignModal(true)}
                  title="Resign Match"
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                >
                  <Flag className="w-4 h-4" />
                </button>
              )}

              {/* Chat Button (Quick Access from Bottom) */}
              <button
                onClick={() => {
                  setShowChatModal(true);
                  setUnreadChatCount(0);
                }}
                title="Match Chat"
                className="relative p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                {unreadChatCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] font-black flex items-center justify-center text-white">
                    {unreadChatCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Game Over Modal ("DEFEAT" / "VICTORY" / "DRAW") */}
      <AnimatePresence>
        {showGameOverModal && gameOverInfo && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl border ${
                gameOverInfo.result === 'win'
                  ? 'bg-gradient-to-b from-[#0a2e1d] to-[#0d141e] border-emerald-500/40 shadow-emerald-500/20'
                  : gameOverInfo.result === 'loss'
                  ? 'bg-gradient-to-b from-[#2e0a0a] to-[#0d141e] border-rose-500/40 shadow-rose-500/20'
                  : 'bg-gradient-to-b from-[#2a200a] to-[#0d141e] border-amber-500/40 shadow-amber-500/20'
              }`}
            >
              {/* Badge Icon */}
              <div
                className={`w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg ${
                  gameOverInfo.result === 'win'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : gameOverInfo.result === 'loss'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {gameOverInfo.result === 'win' ? (
                  <Trophy className="w-8 h-8" />
                ) : (
                  <ShieldAlert className="w-8 h-8" />
                )}
              </div>

              {/* Title */}
              <h2
                className={`text-2xl sm:text-3xl font-black tracking-wider uppercase mb-1.5 ${
                  gameOverInfo.result === 'win'
                    ? 'text-emerald-400'
                    : gameOverInfo.result === 'loss'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {gameOverInfo.title}
              </h2>

              {/* Subtitle */}
              <p className="text-sm font-semibold text-white mb-1">
                {gameOverInfo.subtitle}
              </p>
              <p className="text-xs text-slate-400 mb-6">{gameOverInfo.reason}</p>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleRequestRematch}
                  className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95 text-white ${
                    gameOverInfo.result === 'win'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/30'
                      : gameOverInfo.result === 'loss'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/30'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-600 shadow-amber-500/30'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Play Again</span>
                </button>

                <button
                  onClick={() => setShowGameOverModal(false)}
                  className="w-full py-2.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Review Final Board</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* In-Game Match Chat Modal (Like Ludo / Uno) */}
      <AnimatePresence>
        {showChatModal && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 right-4 sm:right-6 w-80 sm:w-96 h-[420px] bg-[#0f111a]/95 border border-amber-500/30 backdrop-blur-2xl rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden text-white"
          >
            {/* Chat Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-950/40 to-slate-900/60">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">Match Chat</span>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Chat Presets */}
            <div className="p-2 border-b border-white/[0.08] bg-black/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {QUICK_CHAT_PRESETS.map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChat(phrase)}
                  className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-amber-500/20 hover:text-amber-300 text-[11px] font-medium text-slate-300 whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  {phrase}
                </button>
              ))}
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  <span>No chat messages yet.</span>
                  <span className="text-[10px] text-slate-600 mt-1">Tap a preset above or type below.</span>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-slate-400 mb-0.5">{msg.sender}</span>
                    <div
                      className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-xs ${
                        msg.isMe
                          ? 'bg-amber-600 text-white rounded-br-xs'
                          : 'bg-white/10 text-slate-100 rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input Box */}
            <div className="p-2.5 border-t border-white/10 flex gap-2 bg-black/40">
              <input
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
              <button
                onClick={() => handleSendChat()}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friends Challenge Modal */}
      <AnimatePresence>
        {showFriendsModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-3xl bg-[#0e101a] border border-amber-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white"
            >
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-950/40 to-slate-900/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                    <Swords className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Challenge a Friend</h3>
                    <p className="text-xs text-slate-400">Play real-time 2D Chess with official rules</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFriendsModal(false)}
                  className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Match Code Section */}
              {mode === 'online' && sessionCode && (
                <div className="p-3 bg-amber-950/30 border-b border-white/[0.08] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Room Code:</span>
                    <span className="font-mono text-amber-300 font-bold bg-black/40 px-2 py-0.5 rounded border border-amber-500/30">
                      {sessionCode}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}

              {/* Search Bar */}
              <div className="p-3 sm:p-4 border-b border-white/[0.06] bg-black/30">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search from My Friends List..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400/60 transition-colors"
                  />
                </div>
              </div>

              {/* Friends List Container */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 min-h-[220px]">
                {loadingFriends ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                    <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Loading friends...</span>
                  </div>
                ) : friendsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-400 mb-3">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-200">No friends added yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Add friends using their unique Friend ID in the Friends tab to challenge them here anytime.
                    </p>
                  </div>
                ) : (
                  friendsList
                    .filter((f) => (f.displayName || '').toLowerCase().includes(searchFilter.toLowerCase()))
                    .map((friend) => {
                      const isOnline = onlineUsersMap[friend._id];
                      return (
                        <div
                          key={friend._id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative w-10 h-10 rounded-2xl overflow-hidden bg-black/40 border border-white/15 shrink-0">
                              {friend.avatar ? (
                                <img
                                  src={friend.avatar}
                                  alt={friend.displayName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-xs uppercase text-amber-300">
                                  {friend.displayName.slice(0, 2)}
                                </div>
                              )}
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0e101a] ${
                                  isOnline ? 'bg-emerald-400 ring-2 ring-emerald-500/20' : 'bg-slate-500'
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                                {friend.displayName}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={`text-[10px] font-semibold ${
                                    isOnline ? 'text-emerald-400' : 'text-slate-400'
                                  }`}
                                >
                                  {isOnline ? 'Online' : 'Offline'}
                                </span>
                                {friend.friendId && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    #{friend.friendId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleChallengeFriend(friend)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0 active:scale-95"
                          >
                            <Swords className="w-3.5 h-3.5" />
                            <span>Challenge</span>
                          </button>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 sm:p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Invited friend receives an instant match pop-up.</span>
                </div>
                <button
                  onClick={() => setShowFriendsModal(false)}
                  className="px-3 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Resignation Confirmation Modal */}
      <AnimatePresence>
        {showResignModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#141822] border border-white/20 rounded-2xl p-5 max-w-xs w-full text-center shadow-2xl"
            >
              <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">Resign Match?</h3>
              <p className="text-xs text-slate-400 mb-4">
                Are you sure you want to resign? This will immediately concede victory to your opponent.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowResignModal(false)}
                  className="flex-1 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResign}
                  className="flex-1 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
                >
                  Resign
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
