'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import {
  ArrowLeft,
  RotateCcw,
  Bot,
  Users,
  Swords,
  X,
  Sparkles,
  Search,
  Clock,
  UserPlus,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Flag,
  Share2,
  Copy,
  Check,
  Send,
  MessageSquare,
  ShieldAlert,
  Trophy,
  ChevronRight,
  Shuffle,
  Undo2,
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
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  playGameOver() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [440, 554, 659, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.25, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
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

// Standard piece-square evaluation tables (perspective of White)
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

// Board Themes
const BOARD_THEMES = {
  tournament: {
    name: 'Tournament Green',
    light: '#ebecd0',
    dark: '#779556',
    border: 'border-[#4a6333]',
  },
  classicWood: {
    name: 'Classic Walnut',
    light: '#f0d9b5',
    dark: '#b58863',
    border: 'border-[#7d5635]',
  },
  midnight: {
    name: 'Midnight Slate',
    light: '#cbd5e1',
    dark: '#475569',
    border: 'border-[#334155]',
  },
};

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
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Settings & Display
  const [boardTheme, setBoardTheme] = useState<keyof typeof BOARD_THEMES>('tournament');
  const [isMuted, setIsMuted] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showResignModal, setShowResignModal] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

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

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Friends Modal State
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [onlineUsersMap, setOnlineUsersMap] = useState<Record<string, boolean>>({});

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

  // Find King square for check highlight
  const kingInCheckSquare = useMemo(() => {
    if (!isCheck) return null;
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
          return `${files[c]}${ranks[r]}` as Square;
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

    // Material difference
    let whiteMat = 0;
    let blackMat = 0;
    whiteCaptured.forEach((p) => (whiteMat += PIECE_VALUES[p]));
    blackCaptured.forEach((p) => (blackMat += PIECE_VALUES[p]));

    return {
      whiteCaptured,
      blackCaptured,
      advantage: whiteMat - blackMat, // > 0 White leads, < 0 Black leads
    };
  }, [chess, fen]);

  // Clock countdown timer
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
    sounds.playGameOver();
    const winner = color === 'w' ? 'Black' : 'White';
    toast.error(`Time out. ${winner} wins on time.`);
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

        // Sound trigger
        if (chess.isGameOver()) {
          sounds.playGameOver();
        } else if (chess.isCheck()) {
          sounds.playCheck();
        } else if (move.captured) {
          sounds.playCapture();
        } else {
          sounds.playMove();
        }

        const newFen = chess.fen();
        setFen(newFen);
        setSelectedSquare(null);
        setValidMoves([]);
        setLastMove({ from: move.from, to: move.to });
        setMoveHistory((prev) => [...prev, move.san]);
        setIsTimerRunning(true);

        return move;
      } catch (err) {
        console.error('Invalid move attempted:', err);
        return null;
      }
    },
    [chess]
  );

  // Trigger AI Move
  const makeAiMove = useCallback(() => {
    if (chess.isGameOver() || chess.turn() !== 'b') return;

    setIsAiThinking(true);
    setTimeout(() => {
      const moves = chess.moves({ verbose: true });
      if (moves.length === 0) {
        setIsAiThinking(false);
        return;
      }

      let chosenMove: Move = moves[0];

      if (aiDifficulty === 'easy') {
        // Random move with bias towards captures
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
        // Hard: Minimax depth 3 with alpha-beta pruning
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
  }, [chess, aiDifficulty, executeMove]);

  // Handle Square Click/Tap
  const handleSquareClick = (square: Square) => {
    if (isGameOver || isAiThinking) return;

    // In Online mode, player can only move pieces on their turn and matching their role
    if (mode === 'online') {
      if (turn !== playerRole) return;
      if (!isOpponentConnected) {
        toast('Waiting for opponent to connect before moving.', { icon: undefined });
        return;
      }
    }

    // In Solo AI mode, player only plays White
    if (mode === 'ai' && turn === 'b') return;

    const pieceOnSquare = chess.get(square);

    // If destination is one of the valid moves
    const matchingValidMove = validMoves.find((m) => m.to === square);

    if (matchingValidMove && selectedSquare) {
      // Check if this move is a promotion
      const piece = chess.get(selectedSquare);
      const isPawnPromotion =
        piece?.type === 'p' &&
        ((piece.color === 'w' && square[1] === '8') || (piece.color === 'b' && square[1] === '1'));

      if (isPawnPromotion) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }

      // Execute standard move
      const move = executeMove({ from: selectedSquare, to: square });

      // If in Online mode, broadcast move over socket
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

      // If in Solo AI mode, schedule AI reply
      if (mode === 'ai' && chess.turn() === 'b') {
        setTimeout(makeAiMove, 200);
      }
      return;
    }

    // If tapping on own piece, select it and find legal moves
    if (pieceOnSquare && pieceOnSquare.color === turn) {
      // In online mode, ensure piece color matches player role
      if (mode === 'online' && pieceOnSquare.color !== playerRole) return;

      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setValidMoves(moves);
      return;
    }

    // Clicked elsewhere on empty square or invalid piece
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

  // Reset Game
  const handleResetBoard = (resetClocks = true) => {
    chess.reset();
    setFen(chess.fen());
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setMoveHistory([]);
    setPendingPromotion(null);
    setIsAiThinking(false);
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
    if (isAiThinking) return;

    if (mode === 'ai') {
      // Undo both AI move and user move
      chess.undo();
      chess.undo();
    } else {
      chess.undo();
    }
    setFen(chess.fen());
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setMoveHistory((prev) => (mode === 'ai' ? prev.slice(0, -2) : prev.slice(0, -1)));
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
    sounds.playGameOver();
    toast.error('You resigned the match.');
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
      toast.success(`Joined match with ${opp}. You are playing as ${role === 'w' ? 'White' : 'Black'}.`);
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

    // Friend accepted invite
    const handleInviteAccepted = (data: { acceptedBy: string; sessionCode: string }) => {
      if (data.sessionCode === sessionCode) {
        setIsWaitingForFriend(false);
        setIsOpponentConnected(true);
        toast.success(`${opponentName || 'Friend'} accepted your challenge.`);
      }
    };

    // Friend declined invite
    const handleInviteDeclined = (data: { game: string }) => {
      if (data.game === 'chess') {
        setIsWaitingForFriend(false);
        toast.error(`${opponentName || 'Friend'} declined the challenge.`);
      }
    };

    // Opponent joined the chess room
    const handleOpponentJoined = (data: { playerName: string; role: string }) => {
      setIsWaitingForFriend(false);
      setIsOpponentConnected(true);
      toast.success(`${data.playerName || 'Opponent'} joined the match. Game is live.`);
    };

    // Remote move received
    const handleRemoteMove = (data: { move: Move; fen: string }) => {
      try {
        const move = chess.move(data.move);
        if (move) {
          if (chess.isGameOver()) sounds.playGameOver();
          else if (chess.isCheck()) sounds.playCheck();
          else if (move.captured) sounds.playCapture();
          else sounds.playMove();

          setFen(chess.fen());
          setSelectedSquare(null);
          setValidMoves([]);
          setLastMove({ from: move.from, to: move.to });
          setMoveHistory((prev) => [...prev, move.san]);
          setIsTimerRunning(true);
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

    // Remote chat message
    const handleRemoteChat = (data: { text: string; senderName: string }) => {
      setChatMessages((prev) => [...prev, { sender: data.senderName, text: data.text }]);
      toast(`${data.senderName}: ${data.text}`);
    };

    // Remote rematch request
    const handleRematch = () => {
      handleResetBoard();
      toast.success('Opponent started a rematch. Board reset.');
    };

    // Opponent resigned
    const handleOpponentResign = () => {
      sounds.playGameOver();
      toast.success('Opponent resigned. You win.');
    };

    // Opponent left
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
  }, [socket, sessionCode, opponentName, chess]);

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

  // Send in-game chat
  const handleSendChat = () => {
    if (!chatInput.trim() || !sessionCode || !socket) return;
    const msg = chatInput.trim();
    const myName = user?.displayName || 'Player';

    socket.emit('chess:chat', {
      sessionCode,
      text: msg,
      senderName: myName,
    });

    setChatMessages((prev) => [...prev, { sender: myName, text: msg }]);
    setChatInput('');
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

  // Rank & File definitions based on orientation
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayFiles = isFlipped ? [...files].reverse() : files;
  const displayRanks = isFlipped ? [...ranks].reverse() : ranks;

  const currentTheme = BOARD_THEMES[boardTheme];

  // Render game status text
  let statusText = '';
  if (chess.isCheckmate()) {
    statusText = `Checkmate. ${turn === 'w' ? 'Black' : 'White'} wins.`;
  } else if (chess.isStalemate()) {
    statusText = 'Draw by Stalemate.';
  } else if (chess.isThreefoldRepetition()) {
    statusText = 'Draw by Threefold Repetition.';
  } else if (chess.isInsufficientMaterial()) {
    statusText = 'Draw by Insufficient Material.';
  } else if (chess.isDraw()) {
    statusText = 'Game Draw.';
  } else if (isCheck) {
    statusText = `${turn === 'w' ? 'White' : 'Black'} is in Check.`;
  } else {
    statusText = `${turn === 'w' ? 'White' : 'Black'} to move.`;
  }

  return (
    <div
      ref={boardContainerRef}
      className="fixed inset-0 z-[100] bg-[#090b10] text-slate-100 flex flex-col select-none overflow-hidden font-sans"
    >
      {/* Top Navigation Bar */}
      <header className="h-14 px-3 sm:px-5 flex items-center justify-between border-b border-white/10 bg-[#0c0e14]/95 backdrop-blur-md z-30 shrink-0">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={handleLeaveGame}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Arcade</span>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">
              Classic 2D Chess
            </span>
          </div>
        </div>

        {/* Center: Mode Tabs */}
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center p-0.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs">
            <button
              onClick={() => handleSelectAiMode()}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                mode === 'ai'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">Solo AI</span>
            </button>
            <button
              onClick={handleSelectPassMode}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                mode === 'pass'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs hidden md:inline">Pass & Play</span>
              <span className="text-[11px] sm:text-xs md:hidden">2P</span>
            </button>
            <button
              onClick={() => {
                fetchFriends();
                setShowFriendsModal(true);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                mode === 'online'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">Play Friend</span>
            </button>
          </div>

          {/* AI Difficulty dropdown */}
          {mode === 'ai' && (
            <select
              value={aiDifficulty}
              onChange={(e) => handleSelectAiMode(e.target.value as 'easy' | 'medium' | 'hard')}
              className="hidden lg:inline-block bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 rounded-xl px-2.5 py-1 text-[11px] font-semibold text-slate-200 outline-none cursor-pointer"
            >
              <option value="easy" className="bg-[#12141c] text-white">Casual (Easy)</option>
              <option value="medium" className="bg-[#12141c] text-white">Tactician (Medium)</option>
              <option value="hard" className="bg-[#12141c] text-white">Grandmaster (Hard)</option>
            </select>
          )}
        </div>

        {/* Right: Quick Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Friend Challenge button */}
          <button
            onClick={() => {
              fetchFriends();
              setShowFriendsModal(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 hover:from-emerald-500/30 to-teal-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Swords className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Challenge</span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={handleToggleFullscreen}
            title="Fullscreen"
            className="hidden sm:flex p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container: Split Board and Sidebar on Desktop */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-2 sm:p-4 gap-3 overflow-y-auto">
        {/* Left / Center Board Section */}
        <div className="flex flex-col items-center justify-center w-full max-w-[560px]">
          {/* Top Player Card (Opponent or Black) */}
          <div className="w-full flex items-center justify-between px-3 py-1.5 mb-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full border border-white/20 ${
                  isFlipped ? 'bg-white' : 'bg-neutral-900 border-neutral-600'
                }`}
              />
              <span className="font-bold text-slate-200">
                {mode === 'online'
                  ? opponentName || 'Opponent'
                  : mode === 'ai'
                  ? `AI (${aiDifficulty.toUpperCase()})`
                  : 'Player 2 (Black)'}
              </span>
              {mode === 'ai' && isAiThinking && (
                <span className="text-[10px] text-amber-400 animate-pulse font-mono">Thinking...</span>
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
                  className={`px-2 py-0.5 rounded-lg font-mono text-xs font-bold ${
                    (isFlipped ? turn === 'w' : turn === 'b')
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {formatTime(isFlipped ? whiteTime : blackTime)}
                </div>
              )}
            </div>
          </div>

          {/* 8x8 Chess Board Container */}
          <div
            className={`relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 ${currentTheme.border} bg-[#181a20]`}
          >
            <div className="w-full h-full grid grid-cols-8 grid-rows-8">
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
                        backgroundColor: isLight ? currentTheme.light : currentTheme.dark,
                      }}
                      className="relative flex items-center justify-center cursor-pointer select-none transition-colors duration-100"
                    >
                      {/* Last Move Golden Highlight */}
                      {(isLastMoveFrom || isLastMoveTo) && (
                        <div className="absolute inset-0 bg-amber-400/35 pointer-events-none" />
                      )}

                      {/* Selected Square Highlight */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-emerald-400/40 ring-2 ring-emerald-400/80 pointer-events-none" />
                      )}

                      {/* King in Check Red Alert Vignette */}
                      {isKingCheck && (
                        <div className="absolute inset-0 bg-rose-600/50 ring-2 ring-rose-500 animate-pulse pointer-events-none" />
                      )}

                      {/* Coordinate Labels on Edges */}
                      {fIdx === 0 && (
                        <span
                          className={`absolute top-0.5 left-1 text-[9px] font-bold pointer-events-none ${
                            isLight ? 'text-black/45' : 'text-white/60'
                          }`}
                        >
                          {rank}
                        </span>
                      )}
                      {rIdx === 7 && (
                        <span
                          className={`absolute bottom-0.5 right-1 text-[9px] font-bold pointer-events-none ${
                            isLight ? 'text-black/45' : 'text-white/60'
                          }`}
                        >
                          {file}
                        </span>
                      )}

                      {/* Piece SVG Image */}
                      {piece && (
                        <img
                          src={`/games/chess/pieces/${piece.color}${piece.type.toUpperCase()}.svg`}
                          alt={`${piece.color} ${piece.type}`}
                          className={`w-[84%] h-[84%] object-contain pointer-events-none transition-transform duration-100 ${
                            isSelected ? 'scale-110 drop-shadow-lg' : 'hover:scale-105'
                          }`}
                        />
                      )}

                      {/* Legal Move Indicators */}
                      {isValidTarget && !isTargetCapture && (
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/60 shadow-sm pointer-events-none" />
                      )}
                      {isTargetCapture && (
                        <div className="absolute inset-1 rounded-full border-4 border-rose-500/70 pointer-events-none" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Pawn Promotion Dialog Modal Overlay */}
            {pendingPromotion && (
              <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#141822] border border-white/20 rounded-2xl p-4 shadow-2xl text-center max-w-xs w-full">
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
                          className="w-10 h-10 object-contain"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Player Card (You or White) */}
          <div className="w-full flex items-center justify-between px-3 py-1.5 mt-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full border border-white/20 ${
                  isFlipped ? 'bg-neutral-900 border-neutral-600' : 'bg-white'
                }`}
              />
              <span className="font-bold text-slate-200">
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
                  className={`px-2 py-0.5 rounded-lg font-mono text-xs font-bold ${
                    (isFlipped ? turn === 'b' : turn === 'w')
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {formatTime(isFlipped ? blackTime : whiteTime)}
                </div>
              )}
            </div>
          </div>

          {/* Match Status Strip & Quick Action Buttons */}
          <div className="w-full mt-2 flex items-center justify-between px-2 gap-2 text-xs">
            <span
              className={`font-semibold truncate ${
                isGameOver
                  ? 'text-rose-400'
                  : isCheck
                  ? 'text-amber-400 font-bold'
                  : 'text-slate-300'
              }`}
            >
              {statusText}
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Flip Board */}
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                title="Flip Board Orientation"
                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>

              {/* Undo Move */}
              {mode !== 'online' && (
                <button
                  onClick={handleUndoMove}
                  title="Undo Move"
                  className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Reset / Rematch */}
              <button
                onClick={handleRequestRematch}
                title="Restart Game"
                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Resign */}
              {mode === 'online' && (
                <button
                  onClick={() => setShowResignModal(true)}
                  title="Resign Match"
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Chat Drawer Toggle (Online) */}
              {mode === 'online' && (
                <button
                  onClick={() => setShowChat(!showChat)}
                  title="Match Chat"
                  className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Move History, Themes & Online Controls */}
        <div className="w-full lg:w-72 flex flex-col gap-3 shrink-0 max-h-[580px]">
          {/* Online Match Code Banner (if Online mode) */}
          {mode === 'online' && (
            <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-cyan-300 font-semibold">Match Code</span>
                <span className="font-mono text-white bg-black/40 px-2 py-0.5 rounded border border-cyan-500/20">
                  {sessionCode || 'PENDING'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 transition-colors cursor-pointer font-medium"
                >
                  {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
                <button
                  onClick={() => {
                    fetchFriends();
                    setShowFriendsModal(true);
                  }}
                  className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>Invite</span>
                </button>
              </div>
            </div>
          )}

          {/* Theme Selector & Settings Box */}
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs flex flex-col gap-2">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span>Board Theme</span>
              <select
                value={boardTheme}
                onChange={(e) => setBoardTheme(e.target.value as keyof typeof BOARD_THEMES)}
                className="bg-white/[0.08] border border-white/10 rounded-lg px-2 py-0.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="tournament" className="bg-[#12141c]">Tournament</option>
                <option value="classicWood" className="bg-[#12141c]">Classic Walnut</option>
                <option value="midnight" className="bg-[#12141c]">Midnight Slate</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span>Time Control</span>
              <select
                value={timeControl}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  setTimeControl(t);
                  setWhiteTime(t);
                  setBlackTime(t);
                }}
                className="bg-white/[0.08] border border-white/10 rounded-lg px-2 py-0.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value={0} className="bg-[#12141c]">Untimed</option>
                <option value={180} className="bg-[#12141c]">3 Minutes</option>
                <option value={300} className="bg-[#12141c]">5 Minutes</option>
                <option value={600} className="bg-[#12141c]">10 Minutes</option>
              </select>
            </div>
          </div>

          {/* Move History / Notation Box */}
          <div className="flex-1 min-h-[160px] max-h-[220px] p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs flex flex-col overflow-hidden">
            <div className="font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>Move History</span>
              <span className="text-[10px] text-slate-500 font-normal">{moveHistory.length} moves</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-[11px] text-slate-300">
              {moveHistory.length === 0 ? (
                <div className="text-slate-500 text-center py-6">No moves recorded yet</div>
              ) : (
                Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between px-1.5 py-0.5 rounded bg-white/[0.02]">
                    <span className="text-slate-500 w-6">{idx + 1}.</span>
                    <span className="w-16 text-slate-200">{moveHistory[idx * 2]}</span>
                    <span className="w-16 text-slate-400">{moveHistory[idx * 2 + 1] || ''}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* In-Game Live Chat Panel (Online mode only) */}
          {mode === 'online' && (
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs flex flex-col gap-2">
              <div className="font-bold text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span>Match Chat</span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] pr-1">
                {chatMessages.length === 0 ? (
                  <div className="text-slate-500 text-center py-2">No messages yet</div>
                ) : (
                  chatMessages.map((m, idx) => (
                    <div key={idx} className="leading-tight">
                      <span className="font-bold text-cyan-300 mr-1">{m.sender}:</span>
                      <span className="text-slate-200">{m.text}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Send match chat..."
                  className="flex-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400/50"
                />
                <button
                  onClick={handleSendChat}
                  className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-colors cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Friends Challenge Modal */}
      <AnimatePresence>
        {showFriendsModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-3xl bg-[#0e101a] border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-950/40 to-slate-900/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
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

              {/* Search Bar */}
              <div className="p-3 sm:p-4 border-b border-white/[0.06] bg-black/30">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search from My Friends List..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400/60 transition-colors"
                  />
                </div>
              </div>

              {/* Friends List Container */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 min-h-[220px]">
                {loadingFriends ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                    <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
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
                                <div className="w-full h-full flex items-center justify-center font-bold text-xs uppercase text-cyan-300">
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
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
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
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0 active:scale-95"
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
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
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
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
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
