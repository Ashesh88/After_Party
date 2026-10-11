'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Paintbrush,
  Pen,
  Sparkles,
  Eraser,
  Download,
  Share2,
  Users,
  MessageSquare,
  Undo2,
  Redo2,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Check,
  Copy,
  X,
  Send,
  Square,
  Circle,
  Star,
  Heart,
  Cloud,
  Sun,
  Mountain,
  Waves,
  Trees,
  Palette,
  Layers,
  Image as ImageIcon,
  Flame,
  Search,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../lib/store/authStore';
import { useSocketStore } from '../../lib/store/socketStore';
import { useGameStore } from '../../lib/store/gameStore';
import api from '../../lib/api';
import { Friend } from '../../lib/types';

// Types
type ToolType = 'pen' | 'brush' | 'neon' | 'spray' | 'eraser';
type ShapeType = 'line' | 'rectangle' | 'circle' | 'star' | 'heart' | 'cloud' | 'mountain';
type FrameType =
  | 'floral-daisy'
  | 'victorian-lace'
  | 'rose-garland'
  | 'peach-botanical'
  | 'baroque-gold'
  | 'rustic-wood'
  | 'antique-parchment'
  | 'red-ribbon'
  | 'minimal'
  | 'none';
type SceneryPreset =
  | 'blank'
  | 'coffee-date'
  | 'mountain-cabin'
  | 'capybara-halloween'
  | 'rainy-frog'
  | 'elemental-touch'
  | 'balloon-house'
  | 'sunset-lake'
  | 'beach-sunset'
  | 'forest-stars'
  | 'desert-dunes';
type CanvasRatio = 'fit' | '1:1' | '3:4' | '16:9';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  tool: ToolType;
  color: string;
  size: number;
  opacity: number;
  points: Point[];
  author: string;
}

interface ShapeItem {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string | null;
  strokeWidth: number;
  author: string;
}

interface StickerItem {
  id: string;
  stickerKey: string;
  x: number;
  y: number;
  size: number;
  author: string;
}

interface CanvasPage {
  id: string;
  title: string;
  pageColor: string;
  sceneryPreset: SceneryPreset;
  customSceneryUrl?: string | null;
  frame: FrameType;
  canvasRatio: CanvasRatio;
  strokes: Stroke[];
  shapes: ShapeItem[];
  stickers: StickerItem[];
  history: Array<{ strokes: Stroke[]; shapes: ShapeItem[]; stickers: StickerItem[] }>;
  historyStep: number;
}

interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: number;
  isMe: boolean;
}

interface CoPaintStudioProps {
  onBack: () => void;
}

// Curated Brush Palettes
const BRUSH_PALETTE = [
  '#ef4444', // Crimson Red
  '#f97316', // Sunset Orange
  '#f59e0b', // Sun Amber
  '#eab308', // Gold Yellow
  '#10b981', // Emerald Green
  '#06b6d4', // Cyan Wave
  '#3b82f6', // Ocean Blue
  '#8b5cf6', // Twilight Violet
  '#ec4899', // Rose Pink
  '#78350f', // Earth Wood
  '#ffffff', // Pure White
  '#0f172a', // Midnight Obsidian
];

// Curated Page Paper Colors
const PAGE_COLORS = [
  { label: 'White', color: '#ffffff' },
  { label: 'Ivory Cream', color: '#fefae0' },
  { label: 'Pastel Blush', color: '#fce7f3' },
  { label: 'Sky Mist', color: '#e0f2fe' },
  { label: 'Soft Mint', color: '#ecfdf5' },
  { label: 'Warm Sand', color: '#f5ebe0' },
  { label: 'Lavender', color: '#f3e8ff' },
  { label: 'Charcoal Dark', color: '#1e293b' },
];

const SCENERY_STICKERS = [
  { key: 'sun', label: 'Sun', icon: Sun },
  { key: 'cloud', label: 'Cloud', icon: Cloud },
  { key: 'mountain', label: 'Mountain', icon: Mountain },
  { key: 'waves', label: 'Ocean Waves', icon: Waves },
  { key: 'trees', label: 'Pine Trees', icon: Trees },
  { key: 'heart', label: 'Love Heart', icon: Heart },
  { key: 'star', label: 'Star', icon: Star },
  { key: 'flame', label: 'Campfire', icon: Flame },
  { key: 'sparkle', label: 'Sparkles', icon: Sparkles },
  { key: 'compass', label: 'Compass', icon: Compass },
];

const SCENERY_IMAGE_MAP: Record<string, string> = {
  'coffee-date': '/scenery/scenery-coffee-date.png',
  'mountain-cabin': '/scenery/scenery-mountain-cabin.png',
  'capybara-halloween': '/scenery/scenery-capybara-halloween.png',
  'rainy-frog': '/scenery/scenery-rainy-frog.png',
  'elemental-touch': '/scenery/scenery-elemental-touch.png',
  'balloon-house': '/scenery/scenery-balloon-house.png',
};

const FRAME_IMAGE_MAP: Record<string, string> = {
  'floral-daisy': '/frames/frame-floral-daisy.png',
  'victorian-lace': '/frames/frame-victorian-lace.png',
  'rose-garland': '/frames/frame-rose-garland.png',
  'peach-botanical': '/frames/frame-peach-botanical.png',
  'baroque-gold': '/frames/frame-baroque-gold.png',
  'rustic-wood': '/frames/frame-rustic-wood.png',
  'antique-parchment': '/frames/frame-antique-parchment.png',
  'red-ribbon': '/frames/frame-red-ribbon.png',
};

const PHOTO_FRAMES: Array<{ key: FrameType; label: string }> = [
  { key: 'floral-daisy', label: 'Vintage Daisy Meadow' },
  { key: 'victorian-lace', label: 'Victorian Lace Filigree' },
  { key: 'rose-garland', label: 'Rose Garland & Scroll' },
  { key: 'peach-botanical', label: 'Peach Botanical Floral' },
  { key: 'baroque-gold', label: 'Baroque Gilded Gold' },
  { key: 'rustic-wood', label: 'Rustic Wood & Passepartout' },
  { key: 'antique-parchment', label: 'Antique Ornate Parchment' },
  { key: 'red-ribbon', label: 'Red Ribbon & Blossom' },
  { key: 'minimal', label: 'Minimal Studio Border' },
  { key: 'none', label: 'Frameless Clean' },
];

export default function CoPaintStudio({ onBack }: CoPaintStudioProps) {
  const user = useAuthStore((state) => state.user);
  const socket = useSocketStore((state) => state.socket);
  const { sessionData, setSessionData } = useGameStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);

  // Session & Multiplayer State
  const [sessionCode, setSessionCode] = useState<string>(() => {
    return sessionData?.sessionCode || 'ART-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  });
  const [playerRole, setPlayerRole] = useState<'host' | 'guest'>('host');
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [isOpponentConnected, setIsOpponentConnected] = useState(false);
  const [isWaitingForFriend, setIsWaitingForFriend] = useState(false);
  const [remoteCursor, setRemoteCursor] = useState<{ x: number; y: number; name: string } | null>(null);

  // Active Tool Navigation
  const [activeTab, setActiveTab] = useState<'brush' | 'color' | 'page' | 'scenery' | 'shape' | 'sticker' | 'frame'>('brush');
  const [selectedTool, setSelectedTool] = useState<ToolType>('brush');
  const [brushColor, setBrushColor] = useState<string>('#ef4444');
  const [brushSize, setBrushSize] = useState<number>(8);
  const [brushOpacity, setBrushOpacity] = useState<number>(100);
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle');
  const [shapeFilled, setShapeFilled] = useState<boolean>(false);
  const [selectedSticker, setSelectedSticker] = useState<string>('sun');

  // Multi-Page Canvas Management (Default Clean Pure White Canvas)
  const [pages, setPages] = useState<CanvasPage[]>([
    {
      id: 'page-1',
      title: 'Page 1',
      pageColor: '#ffffff', // Default pure white page
      sceneryPreset: 'blank', // Default clean blank sheet
      customSceneryUrl: null,
      frame: 'floral-daisy', // Real vintage daisy photo frame by default
      canvasRatio: 'fit', // Responsive fit
      strokes: [],
      shapes: [],
      stickers: [],
      history: [{ strokes: [], shapes: [], stickers: [] }],
      historyStep: 0,
    },
  ]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const currentPage = pages[activePageIndex] || pages[0];

  // Chat State & 2-Second Screen Toast
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      senderName: 'Studio Host',
      text: 'Welcome to Sunset Canvas Studio! Start painting or invite a friend.',
      timestamp: Date.now(),
      isMe: false,
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [floatingToast, setFloatingToast] = useState<{ sender: string; text: string } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Friends Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState<boolean>(false);
  const [onlineUsersMap, setOnlineUsersMap] = useState<Record<string, boolean>>({});
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [customJoinCode, setCustomJoinCode] = useState<string>('');

  // Shape placement drag state
  const [shapeDragStart, setShapeDragStart] = useState<Point | null>(null);
  const [currentShapePreview, setCurrentShapePreview] = useState<ShapeItem | null>(null);

  // -------------------------------------------------------------
  // MULTIPLAYER INITIALIZATION & SOCKET ROUTING
  // -------------------------------------------------------------
  useEffect(() => {
    if (sessionData?.sessionCode) {
      const code = sessionData.sessionCode;
      const role = (sessionData.role as 'host' | 'guest') || 'guest';
      const opp = sessionData.opponentName || 'Friend';
      setSessionCode(code);
      setPlayerRole(role);
      setOpponentName(opp);
      setIsOpponentConnected(true);
      setIsWaitingForFriend(false);

      if (socket) {
        socket.emit('paint:join', {
          sessionCode: code,
          role,
          playerName: user?.displayName || 'Artist',
        });
      }
      setSessionData(null);
    } else {
      if (socket) {
        socket.emit('paint:join', {
          sessionCode,
          role: 'host',
          playerName: user?.displayName || 'Host',
        });
      }
    }
  }, [sessionData, socket, sessionCode, user, setSessionData]);

  // Socket listener registrations
  useEffect(() => {
    if (!socket) return;

    const handleOpponentJoined = (data: { playerName: string; role: string }) => {
      setIsWaitingForFriend(false);
      setIsOpponentConnected(true);
      if (data.playerName) setOpponentName(data.playerName);
      toast.success(`${data.playerName || 'Friend'} joined the canvas!`);

      // Host transmits current state to newly joined friend
      if (playerRole === 'host') {
        socket.emit('paint:sync_state', {
          sessionCode,
          canvasData: { pages, activePageIndex },
        });
      }
    };

    const handleRemoteDraw = (data: { strokeData: Stroke }) => {
      if (!data?.strokeData) return;
      setPages((prev) => {
        const next = [...prev];
        const page = next[activePageIndex];
        if (page) {
          page.strokes = [...page.strokes, data.strokeData];
          page.history = [
            ...page.history.slice(0, page.historyStep + 1),
            { strokes: page.strokes, shapes: page.shapes, stickers: page.stickers },
          ];
          page.historyStep = page.history.length - 1;
        }
        return next;
      });
    };

    const handleRemoteAction = (data: { actionType: string; payload: any }) => {
      if (!data) return;
      const { actionType, payload } = data;

      if (actionType === 'add_shape' && payload?.shape) {
        setPages((prev) => {
          const next = [...prev];
          const page = next[activePageIndex];
          if (page) {
            page.shapes = [...page.shapes, payload.shape];
          }
          return next;
        });
      } else if (actionType === 'add_sticker' && payload?.sticker) {
        setPages((prev) => {
          const next = [...prev];
          const page = next[activePageIndex];
          if (page) {
            page.stickers = [...page.stickers, payload.sticker];
          }
          return next;
        });
      } else if (actionType === 'clear_canvas') {
        setPages((prev) => {
          const next = [...prev];
          const page = next[activePageIndex];
          if (page) {
            page.strokes = [];
            page.shapes = [];
            page.stickers = [];
          }
          return next;
        });
        toast('Friend cleared the canvas');
      } else if (actionType === 'set_page_color' && payload?.pageColor) {
        setPages((prev) => {
          const next = [...prev];
          const page = next[activePageIndex];
          if (page) page.pageColor = payload.pageColor;
          return next;
        });
      } else if (actionType === 'set_scenery' && payload?.sceneryPreset) {
        setPages((prev) => {
          const next = [...prev];
          const page = next[activePageIndex];
          if (page) page.sceneryPreset = payload.sceneryPreset;
          return next;
        });
      } else if (actionType === 'set_frame' && payload?.frame) {
        setPages((prev) => {
          const next = [...prev];
          const page = next[activePageIndex];
          if (page) page.frame = payload.frame;
          return next;
        });
      } else if (actionType === 'set_ratio' && payload?.canvasRatio) {
        setPages((prev) => {
          const next = [...prev];
          const page = next[activePageIndex];
          if (page) page.canvasRatio = payload.canvasRatio;
          return next;
        });
      } else if (actionType === 'switch_page' && typeof payload?.pageIndex === 'number') {
        setActivePageIndex(payload.pageIndex);
      } else if (actionType === 'add_page' && payload?.newPage) {
        setPages((prev) => [...prev, payload.newPage]);
      }
    };

    const handleRemoteCursor = (data: { cursorPosition: { x: number; y: number }; playerName: string }) => {
      if (data?.cursorPosition) {
        setRemoteCursor({
          x: data.cursorPosition.x,
          y: data.cursorPosition.y,
          name: data.playerName || 'Friend',
        });
      }
    };

    const handleSyncState = (data: { canvasData: { pages: CanvasPage[]; activePageIndex: number } }) => {
      if (data?.canvasData?.pages) {
        setPages(data.canvasData.pages);
        if (typeof data.canvasData.activePageIndex === 'number') {
          setActivePageIndex(data.canvasData.activePageIndex);
        }
        toast.success('Canvas synchronized with host!');
      }
    };

    const handleRemoteChat = (data: { message: string; senderName: string; timestamp: number }) => {
      if (!data?.message) return;
      const newMsg: ChatMessage = {
        id: Math.random().toString(),
        senderName: data.senderName || 'Friend',
        text: data.message,
        timestamp: data.timestamp || Date.now(),
        isMe: false,
      };

      setChatMessages((prev) => [...prev, newMsg]);
      showFloatingToast(data.senderName || 'Friend', data.message);

      if (!showChatModal) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const handleOpponentLeft = () => {
      setIsOpponentConnected(false);
      setOpponentName(null);
      toast('Friend disconnected from studio');
    };

    const handleInviteAccepted = (data: { acceptedBy: string; sessionCode: string; game: string }) => {
      if (data.sessionCode === sessionCode && (data.game === 'paint' || data.game === 'painting')) {
        setIsWaitingForFriend(false);
        setIsOpponentConnected(true);
        toast.success(`${opponentName || 'Friend'} joined your art canvas!`);
      }
    };

    const handleInviteDeclined = (data: { game: string }) => {
      if (data.game === 'paint' || data.game === 'painting') {
        setIsWaitingForFriend(false);
        toast.error('Friend declined the art session invitation.');
      }
    };

    socket.on('paint:opponent_joined', handleOpponentJoined);
    socket.on('paint:draw', handleRemoteDraw);
    socket.on('paint:action', handleRemoteAction);
    socket.on('paint:cursor', handleRemoteCursor);
    socket.on('paint:sync_state', handleSyncState);
    socket.on('paint:chat', handleRemoteChat);
    socket.on('paint:opponent_left', handleOpponentLeft);
    socket.on('game:invite:accepted', handleInviteAccepted);
    socket.on('game:invite:declined', handleInviteDeclined);

    return () => {
      socket.off('paint:opponent_joined', handleOpponentJoined);
      socket.off('paint:draw', handleRemoteDraw);
      socket.off('paint:action', handleRemoteAction);
      socket.off('paint:cursor', handleRemoteCursor);
      socket.off('paint:sync_state', handleSyncState);
      socket.off('paint:chat', handleRemoteChat);
      socket.off('paint:opponent_left', handleOpponentLeft);
      socket.off('game:invite:accepted', handleInviteAccepted);
      socket.off('game:invite:declined', handleInviteDeclined);
    };
  }, [socket, sessionCode, playerRole, pages, activePageIndex, showChatModal, opponentName, user]);

  // Presence Query
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
      console.error('Failed to load friends:', err);
    } finally {
      setLoadingFriends(false);
    }
  }, [socket]);

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

  // -------------------------------------------------------------
  // 2-SECOND FLOATING TOAST LOGIC
  // -------------------------------------------------------------
  const showFloatingToast = (sender: string, text: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setFloatingToast({ sender, text });
    toastTimeoutRef.current = setTimeout(() => {
      setFloatingToast(null);
      toastTimeoutRef.current = null;
    }, 2000); // Exactly 2 seconds
  };

  // -------------------------------------------------------------
  // TWO-CANVAS RENDERING ENGINE (NON-DESTRUCTIVE CLEAN ERASER)
  // -------------------------------------------------------------
  const redrawBackgroundLayer = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;

    const width = bgCanvas.width;
    const height = bgCanvas.height;

    ctx.clearRect(0, 0, width, height);

    // 1. Fill Page Base Color (Default White or User Chosen)
    ctx.fillStyle = currentPage.pageColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Prebuilt Scenery Coloring Line Art Outline
    drawSceneryLineArt(ctx, width, height, currentPage.sceneryPreset);
  }, [currentPage.pageColor, currentPage.sceneryPreset]);

  const redrawDrawingLayer = useCallback(() => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    if (!ctx) return;

    const width = drawCanvas.width;
    const height = drawCanvas.height;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Vector Shapes
    currentPage.shapes.forEach((shape) => {
      drawShapeOnCanvas(ctx, shape);
    });

    // 1.1 Draw Live Shape Preview during drag
    if (currentShapePreview) {
      drawShapeOnCanvas(ctx, currentShapePreview, true);
    }

    // 2. Draw Brush Strokes (Eraser uses destination-out cleanly on this transparent layer!)
    currentPage.strokes.forEach((stroke) => {
      drawStrokeOnCanvas(ctx, stroke);
    });

    // 3. Draw Stickers & Stamps
    currentPage.stickers.forEach((sticker) => {
      drawStickerOnCanvas(ctx, sticker);
    });
  }, [currentPage.shapes, currentPage.strokes, currentPage.stickers, currentShapePreview]);

  useEffect(() => {
    redrawBackgroundLayer();
  }, [redrawBackgroundLayer]);

  useEffect(() => {
    redrawDrawingLayer();
  }, [redrawDrawingLayer]);

  // Synchronized resize with retina scaling
  useEffect(() => {
    const updateCanvasDimensions = () => {
      const container = containerRef.current;
      const bgCanvas = bgCanvasRef.current;
      const drawCanvas = drawCanvasRef.current;
      if (!container || !bgCanvas || !drawCanvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const targetWidth = Math.floor(rect.width);
      const targetHeight = Math.floor(rect.height);

      if (targetWidth > 0 && targetHeight > 0) {
        [bgCanvas, drawCanvas].forEach((c) => {
          c.width = targetWidth * dpr;
          c.height = targetHeight * dpr;
          c.style.width = `${targetWidth}px`;
          c.style.height = `${targetHeight}px`;

          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr);
          }
        });

        redrawBackgroundLayer();
        redrawDrawingLayer();
      }
    };

    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    return () => window.removeEventListener('resize', updateCanvasDimensions);
  }, [redrawBackgroundLayer, redrawDrawingLayer]);

  // -------------------------------------------------------------
  // SCENERY LINE ART OUTLINES FOR COLORING
  // -------------------------------------------------------------
  const drawSceneryLineArt = (ctx: CanvasRenderingContext2D, w: number, h: number, preset: SceneryPreset) => {
    if (preset === 'blank') return;

    ctx.save();

    if (preset in SCENERY_IMAGE_MAP) {
      const src = SCENERY_IMAGE_MAP[preset];
      const img = imageCacheRef.current.get(src);
      if (img && img.complete && img.naturalWidth > 0) {
        const padding = 24;
        const scale = Math.min((w - padding * 2) / img.naturalWidth, (h - padding * 2) / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        const dx = (w - dw) / 2;
        const dy = (h - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
      } else {
        const newImg = new Image();
        newImg.src = src;
        newImg.onload = () => {
          imageCacheRef.current.set(src, newImg);
          redrawBackgroundLayer();
        };
      }
      ctx.restore();
      return;
    }

    ctx.strokeStyle = '#334155'; // Crisp dark slate line art
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (preset === 'sunset-lake') {
      // 1. Setting Sun Horizon Circle
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.48, Math.min(w, h) * 0.18, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Sun rays
      for (let i = 0; i < 7; i++) {
        const ang = Math.PI + (i * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(w * 0.5 + Math.cos(ang) * (Math.min(w, h) * 0.22), h * 0.48 + Math.sin(ang) * (Math.min(w, h) * 0.22));
        ctx.lineTo(w * 0.5 + Math.cos(ang) * (Math.min(w, h) * 0.32), h * 0.48 + Math.sin(ang) * (Math.min(w, h) * 0.32));
        ctx.stroke();
      }

      // 2. Majestic Mountains
      ctx.beginPath();
      ctx.moveTo(0, h * 0.58);
      ctx.lineTo(w * 0.22, h * 0.32);
      ctx.lineTo(w * 0.35, h * 0.45);
      ctx.lineTo(w * 0.58, h * 0.28);
      ctx.lineTo(w * 0.78, h * 0.48);
      ctx.lineTo(w, h * 0.38);
      ctx.stroke();

      // Mountain Snowcaps
      ctx.beginPath();
      ctx.moveTo(w * 0.22, h * 0.32);
      ctx.lineTo(w * 0.18, h * 0.38);
      ctx.lineTo(w * 0.26, h * 0.38);
      ctx.moveTo(w * 0.58, h * 0.28);
      ctx.lineTo(w * 0.53, h * 0.35);
      ctx.lineTo(w * 0.63, h * 0.35);
      ctx.stroke();

      // 3. Lake Horizon & Water Ripples
      ctx.beginPath();
      ctx.moveTo(0, h * 0.62);
      ctx.lineTo(w, h * 0.62);
      ctx.stroke();

      // Waves
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.72);
      ctx.bezierCurveTo(w * 0.35, h * 0.7, w * 0.65, h * 0.74, w * 0.8, h * 0.72);
      ctx.moveTo(w * 0.1, h * 0.84);
      ctx.bezierCurveTo(w * 0.3, h * 0.82, w * 0.7, h * 0.86, w * 0.9, h * 0.84);
      ctx.stroke();

      // 4. Shoreline Pine Trees
      drawTreeOutline(ctx, w * 0.08, h * 0.68, 60);
      drawTreeOutline(ctx, w * 0.15, h * 0.65, 45);
      drawTreeOutline(ctx, w * 0.88, h * 0.66, 55);
    } else if (preset === 'beach-sunset') {
      // 1. Sun on Water Line
      ctx.beginPath();
      ctx.arc(w * 0.6, h * 0.52, Math.min(w, h) * 0.16, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Sea Horizon
      ctx.beginPath();
      ctx.moveTo(0, h * 0.52);
      ctx.lineTo(w, h * 0.52);
      ctx.stroke();

      // 2. Surf shoreline
      ctx.beginPath();
      ctx.moveTo(0, h * 0.72);
      ctx.bezierCurveTo(w * 0.3, h * 0.68, w * 0.7, h * 0.85, w, h * 0.78);
      ctx.stroke();

      // 3. Slanted Palm Tree
      ctx.beginPath();
      ctx.moveTo(w * 0.15, h * 0.95);
      ctx.quadraticCurveTo(w * 0.18, h * 0.5, w * 0.32, h * 0.38);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.18, h * 0.95);
      ctx.quadraticCurveTo(w * 0.21, h * 0.5, w * 0.32, h * 0.38);
      ctx.stroke();

      // Palm fronds
      const px = w * 0.32;
      const py = h * 0.38;
      const frondAngles = [-0.8, -0.3, 0.2, 0.7, 1.2, -1.3];
      frondAngles.forEach((a) => {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + Math.cos(a) * 45, py + Math.sin(a) * 45 - 15, px + Math.cos(a) * 75, py + Math.sin(a) * 75);
        ctx.stroke();
      });

      // 4. Flying Birds
      drawBirdOutline(ctx, w * 0.45, h * 0.28, 22);
      drawBirdOutline(ctx, w * 0.52, h * 0.22, 18);
      drawBirdOutline(ctx, w * 0.58, h * 0.26, 15);
    } else if (preset === 'forest-stars') {
      // 1. Crescent Moon
      ctx.beginPath();
      ctx.arc(w * 0.82, h * 0.22, 32, 0.5 * Math.PI, 1.5 * Math.PI);
      ctx.quadraticCurveTo(w * 0.82 + 10, h * 0.22, w * 0.82, h * 0.22 + 32);
      ctx.stroke();

      // 2. Stars
      const stars = [
        { x: 0.15, y: 0.18 },
        { x: 0.32, y: 0.12 },
        { x: 0.48, y: 0.24 },
        { x: 0.65, y: 0.14 },
        { x: 0.25, y: 0.32 },
        { x: 0.72, y: 0.28 },
      ];
      stars.forEach((st) => {
        drawStarOutline(ctx, w * st.x, h * st.y, 8);
      });

      // 3. Pine Forest Horizon
      ctx.beginPath();
      ctx.moveTo(0, h * 0.75);
      for (let x = 0; x <= w; x += 35) {
        const th = 40 + (Math.sin(x) * 15);
        ctx.lineTo(x + 17, h * 0.75 - th);
        ctx.lineTo(x + 35, h * 0.75);
      }
      ctx.stroke();

      // 4. Campfire with Logs
      const cx = w * 0.5;
      const cy = h * 0.88;
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy + 12);
      ctx.lineTo(cx + 30, cy - 8);
      ctx.moveTo(cx - 30, cy - 8);
      ctx.lineTo(cx + 30, cy + 12);
      ctx.stroke();

      // Flame
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy);
      ctx.quadraticCurveTo(cx - 20, cy - 35, cx, cy - 50);
      ctx.quadraticCurveTo(cx + 20, cy - 35, cx + 15, cy);
      ctx.closePath();
      ctx.stroke();
    } else if (preset === 'desert-dunes') {
      // Sun
      ctx.beginPath();
      ctx.arc(w * 0.3, h * 0.35, 45, 0, Math.PI * 2);
      ctx.stroke();

      // Dunes
      ctx.beginPath();
      ctx.moveTo(0, h * 0.58);
      ctx.bezierCurveTo(w * 0.25, h * 0.52, w * 0.6, h * 0.68, w, h * 0.55);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, h * 0.72);
      ctx.bezierCurveTo(w * 0.4, h * 0.82, w * 0.75, h * 0.68, w, h * 0.76);
      ctx.stroke();

      // Saguaro Cactus
      const kx = w * 0.78;
      const ky = h * 0.65;
      ctx.beginPath();
      ctx.moveTo(kx, ky + 60);
      ctx.lineTo(kx, ky);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(kx - 18, ky + 30);
      ctx.lineTo(kx - 18, ky + 15);
      ctx.lineTo(kx, ky + 25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(kx + 18, ky + 38);
      ctx.lineTo(kx + 18, ky + 20);
      ctx.lineTo(kx, ky + 32);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawTreeOutline = (ctx: CanvasRenderingContext2D, x: number, y: number, height: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - height * 0.25, y - height * 0.3);
    ctx.lineTo(x - height * 0.15, y - height * 0.3);
    ctx.lineTo(x - height * 0.22, y - height * 0.65);
    ctx.lineTo(x - height * 0.12, y - height * 0.65);
    ctx.lineTo(x, y - height);
    ctx.lineTo(x + height * 0.12, y - height * 0.65);
    ctx.lineTo(x + height * 0.22, y - height * 0.65);
    ctx.lineTo(x + height * 0.15, y - height * 0.3);
    ctx.lineTo(x + height * 0.25, y - height * 0.3);
    ctx.closePath();
    ctx.stroke();
  };

  const drawBirdOutline = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.beginPath();
    ctx.arc(x - size * 0.5, y, size * 0.5, Math.PI, 0);
    ctx.arc(x + size * 0.5, y, size * 0.5, Math.PI, 0);
    ctx.stroke();
  };

  const drawStarOutline = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.3, y - r * 0.3);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.3, y + r * 0.3);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.3, y + r * 0.3);
    ctx.lineTo(x - r, y);
    ctx.lineTo(x - r * 0.3, y - r * 0.3);
    ctx.closePath();
    ctx.stroke();
  };

  // -------------------------------------------------------------
  // BRUSH STROKE RENDERING ENGINE
  // -------------------------------------------------------------
  const drawStrokeOnCanvas = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (!stroke.points || stroke.points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      // Destination-out on transparent drawing layer cleanly erases without cutting into paper!
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = stroke.size * 2.2;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else if (stroke.tool === 'neon') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = stroke.size;
      ctx.strokeStyle = stroke.color;
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = stroke.size * 2;
      ctx.globalAlpha = stroke.opacity / 100;
    } else if (stroke.tool === 'spray') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = stroke.color;
      ctx.globalAlpha = (stroke.opacity / 100) * 0.6;
      stroke.points.forEach((pt) => {
        const radius = stroke.size * 1.5;
        for (let i = 0; i < 8; i++) {
          const offsetX = (Math.random() - 0.5) * radius * 2;
          const offsetY = (Math.random() - 0.5) * radius * 2;
          ctx.beginPath();
          ctx.arc(pt.x + offsetX, pt.y + offsetY, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();
      return;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = stroke.size;
      ctx.strokeStyle = stroke.color;
      ctx.globalAlpha = stroke.opacity / 100;
      if (stroke.tool === 'brush') {
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = 2;
      }
    }

    // Smooth quadratic curves
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length - 1; i++) {
      const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
      const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
    }

    const last = stroke.points[stroke.points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();

    ctx.restore();
  };

  const drawShapeOnCanvas = (ctx: CanvasRenderingContext2D, shape: ShapeItem, isPreview = false) => {
    ctx.save();
    ctx.strokeStyle = shape.strokeColor;
    ctx.lineWidth = shape.strokeWidth;
    ctx.fillStyle = shape.fillColor || 'transparent';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isPreview) {
      ctx.setLineDash([6, 6]);
      ctx.globalAlpha = 0.8;
    }

    const { x, y, width: w, height: h, type } = shape;

    ctx.beginPath();
    if (type === 'rectangle') {
      ctx.rect(x, y, w, h);
    } else if (type === 'circle') {
      const radiusX = Math.abs(w / 2);
      const radiusY = Math.abs(h / 2);
      ctx.ellipse(x + w / 2, y + h / 2, radiusX, radiusY, 0, 0, Math.PI * 2);
    } else if (type === 'line') {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
    } else if (type === 'heart') {
      const topCurveHeight = h * 0.3;
      ctx.moveTo(x + w / 2, y + h * 0.25);
      ctx.bezierCurveTo(x + w / 2, y, x, y, x, y + topCurveHeight);
      ctx.bezierCurveTo(x, y + (h + topCurveHeight) / 2, x + w / 2, y + (h + topCurveHeight) / 1.3, x + w / 2, y + h);
      ctx.bezierCurveTo(x + w / 2, y + (h + topCurveHeight) / 1.3, x + w, y + (h + topCurveHeight) / 2, x + w, y + topCurveHeight);
      ctx.bezierCurveTo(x + w, y, x + w / 2, y, x + w / 2, y + h * 0.25);
    } else if (type === 'star') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const spikes = 5;
      const outerRadius = Math.min(Math.abs(w), Math.abs(h)) / 2;
      const innerRadius = outerRadius * 0.45;
      let rot = (Math.PI / 2) * 3;
      let step = Math.PI / spikes;

      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        let sx = cx + Math.cos(rot) * outerRadius;
        let sy = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(sx, sy);
        rot += step;

        sx = cx + Math.cos(rot) * innerRadius;
        sy = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(sx, sy);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
    } else if (type === 'mountain') {
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + w * 0.5, y);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
    } else if (type === 'cloud') {
      const r = Math.min(Math.abs(w), Math.abs(h)) * 0.22;
      ctx.arc(x + w * 0.3, y + h * 0.5, r, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(x + w * 0.5, y + h * 0.35, r * 1.3, Math.PI * 0.8, Math.PI * 2.2);
      ctx.arc(x + w * 0.7, y + h * 0.5, r, Math.PI * 1.5, Math.PI * 0.5);
      ctx.closePath();
    }

    if (shape.fillColor) {
      ctx.fill();
    }
    ctx.stroke();
    ctx.restore();
  };

  // -------------------------------------------------------------
  // VIBRANT VECTOR STICKERS RENDERING
  // -------------------------------------------------------------
  const drawStickerOnCanvas = (ctx: CanvasRenderingContext2D, sticker: StickerItem) => {
    ctx.save();
    ctx.translate(sticker.x, sticker.y);
    const s = sticker.size || 75;

    if (sticker.stickerKey === 'sun') {
      // Golden Sun with Bright Corona Rays
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * (s * 0.46), Math.sin(ang) * (s * 0.46));
        ctx.lineTo(Math.cos(ang) * (s * 0.65), Math.sin(ang) * (s * 0.65));
        ctx.stroke();
      }
    } else if (sticker.stickerKey === 'cloud') {
      // Fluffy Sky Cloud
      ctx.fillStyle = '#e0f2fe';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-s * 0.2, 0, s * 0.2, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(0, -s * 0.16, s * 0.28, Math.PI * 0.8, Math.PI * 2.2);
      ctx.arc(s * 0.2, 0, s * 0.2, Math.PI * 1.5, Math.PI * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (sticker.stickerKey === 'mountain') {
      // Snowcapped Mountain
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, s * 0.4);
      ctx.lineTo(0, -s * 0.4);
      ctx.lineTo(s * 0.5, s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Snowcap
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.4);
      ctx.lineTo(-s * 0.18, -s * 0.12);
      ctx.lineTo(s * 0.18, -s * 0.12);
      ctx.closePath();
      ctx.fill();
    } else if (sticker.stickerKey === 'waves') {
      // Ocean Surf
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, 0);
      ctx.bezierCurveTo(-s * 0.25, -s * 0.35, 0, s * 0.35, s * 0.25, 0);
      ctx.bezierCurveTo(s * 0.35, -s * 0.25, s * 0.45, 0, s * 0.5, 0);
      ctx.stroke();
      ctx.strokeStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(-s * 0.45, s * 0.2);
      ctx.bezierCurveTo(-s * 0.2, -s * 0.15, 0.05, s * 0.45, s * 0.3, s * 0.2);
      ctx.stroke();
    } else if (sticker.stickerKey === 'trees') {
      // Evergreen Pine
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(-s * 0.3, -s * 0.1);
      ctx.lineTo(-s * 0.15, -s * 0.1);
      ctx.lineTo(-s * 0.4, s * 0.3);
      ctx.lineTo(s * 0.4, s * 0.3);
      ctx.lineTo(s * 0.15, -s * 0.1);
      ctx.lineTo(s * 0.3, -s * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Trunk
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-s * 0.06, s * 0.3, s * 0.12, s * 0.18);
    } else if (sticker.stickerKey === 'heart') {
      // Crimson Love Heart
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(-s * 0.5, -s * 0.1, -s * 0.4, -s * 0.45, 0, -s * 0.2);
      ctx.bezierCurveTo(s * 0.4, -s * 0.45, s * 0.5, -s * 0.1, 0, s * 0.35);
      ctx.fill();
      ctx.stroke();
    } else if (sticker.stickerKey === 'star' || sticker.stickerKey === 'sparkle') {
      // Golden Sparkling Star
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(s * 0.12, -s * 0.12);
      ctx.lineTo(s * 0.5, 0);
      ctx.lineTo(s * 0.12, s * 0.12);
      ctx.lineTo(0, s * 0.5);
      ctx.lineTo(-s * 0.12, s * 0.12);
      ctx.lineTo(-s * 0.5, 0);
      ctx.lineTo(-s * 0.12, -s * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (sticker.stickerKey === 'flame') {
      // Campfire Flame
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-s * 0.25, s * 0.35);
      ctx.quadraticCurveTo(-s * 0.4, -s * 0.1, 0, -s * 0.45);
      ctx.quadraticCurveTo(s * 0.4, -s * 0.1, s * 0.25, s * 0.35);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-s * 0.12, s * 0.35);
      ctx.quadraticCurveTo(-s * 0.2, 0, 0, -s * 0.2);
      ctx.quadraticCurveTo(s * 0.2, 0, s * 0.12, s * 0.35);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // -------------------------------------------------------------
  // POINTER & TOUCH EVENT HANDLING
  // -------------------------------------------------------------
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePlaceSticker = (key: string, x: number, y: number) => {
    const newSticker: StickerItem = {
      id: Math.random().toString(),
      stickerKey: key,
      x,
      y,
      size: 75,
      author: user?.displayName || 'Me',
    };

    setPages((prev) => {
      const next = [...prev];
      const page = next[activePageIndex];
      if (page) {
        page.stickers = [...page.stickers, newSticker];
        page.history = [
          ...page.history.slice(0, page.historyStep + 1),
          { strokes: page.strokes, shapes: page.shapes, stickers: page.stickers },
        ];
        page.historyStep = page.history.length - 1;
      }
      return next;
    });

    if (socket && isOpponentConnected) {
      socket.emit('paint:action', {
        sessionCode,
        actionType: 'add_sticker',
        payload: { sticker: newSticker },
      });
    }

    toast.success('Sticker placed on canvas! Tap to place more.');
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawCanvasRef.current?.setPointerCapture(e.pointerId);

    const pt = getCanvasCoords(e);

    if (activeTab === 'shape') {
      setShapeDragStart(pt);
      setCurrentShapePreview({
        id: Math.random().toString(),
        type: selectedShape,
        x: pt.x,
        y: pt.y,
        width: 0,
        height: 0,
        strokeColor: brushColor,
        fillColor: shapeFilled ? brushColor : null,
        strokeWidth: brushSize,
        author: user?.displayName || 'Me',
      });
      return;
    }

    if (activeTab === 'sticker') {
      handlePlaceSticker(selectedSticker, pt.x, pt.y);
      return;
    }

    isDrawingRef.current = true;
    currentPointsRef.current = [pt];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pt = getCanvasCoords(e);

    // Broadcast cursor position to friend
    if (socket && isOpponentConnected) {
      socket.emit('paint:cursor', {
        sessionCode,
        cursorPosition: pt,
        playerName: user?.displayName || 'Artist',
      });
    }

    if (activeTab === 'shape' && shapeDragStart) {
      setCurrentShapePreview({
        id: 'preview',
        type: selectedShape,
        x: Math.min(shapeDragStart.x, pt.x),
        y: Math.min(shapeDragStart.y, pt.y),
        width: Math.abs(pt.x - shapeDragStart.x),
        height: Math.abs(pt.y - shapeDragStart.y),
        strokeColor: brushColor,
        fillColor: shapeFilled ? brushColor : null,
        strokeWidth: brushSize,
        author: user?.displayName || 'Me',
      });
      return;
    }

    if (!isDrawingRef.current) return;

    currentPointsRef.current.push(pt);

    // Live preview of stroke currently being drawn
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tempStroke: Stroke = {
      id: 'current',
      tool: selectedTool,
      color: brushColor,
      size: brushSize,
      opacity: brushOpacity,
      points: currentPointsRef.current,
      author: user?.displayName || 'Me',
    };

    redrawDrawingLayer();
    drawStrokeOnCanvas(ctx, tempStroke);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawCanvasRef.current?.releasePointerCapture(e.pointerId);

    if (activeTab === 'shape' && currentShapePreview) {
      if (currentShapePreview.width > 5 || currentShapePreview.height > 5) {
        const finalShape: ShapeItem = {
          ...currentShapePreview,
          id: Math.random().toString(),
        };

        setPages((prev) => {
          const next = [...prev];
          const page = next[activePageIndex];
          if (page) {
            page.shapes = [...page.shapes, finalShape];
            page.history = [
              ...page.history.slice(0, page.historyStep + 1),
              { strokes: page.strokes, shapes: page.shapes, stickers: page.stickers },
            ];
            page.historyStep = page.history.length - 1;
          }
          return next;
        });

        if (socket && isOpponentConnected) {
          socket.emit('paint:action', {
            sessionCode,
            actionType: 'add_shape',
            payload: { shape: finalShape },
          });
        }
      }
      setShapeDragStart(null);
      setCurrentShapePreview(null);
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentPointsRef.current.length >= 2) {
      const newStroke: Stroke = {
        id: Math.random().toString(),
        tool: selectedTool,
        color: brushColor,
        size: brushSize,
        opacity: brushOpacity,
        points: [...currentPointsRef.current],
        author: user?.displayName || 'Me',
      };

      setPages((prev) => {
        const next = [...prev];
        const page = next[activePageIndex];
        if (page) {
          page.strokes = [...page.strokes, newStroke];
          page.history = [
            ...page.history.slice(0, page.historyStep + 1),
            { strokes: page.strokes, shapes: page.shapes, stickers: page.stickers },
          ];
          page.historyStep = page.history.length - 1;
        }
        return next;
      });

      // Transmit stroke live to friend
      if (socket && isOpponentConnected) {
        socket.emit('paint:draw', {
          sessionCode,
          strokeData: newStroke,
        });
      }
    }

    currentPointsRef.current = [];
  };

  // -------------------------------------------------------------
  // UNDO, REDO & CLEAR
  // -------------------------------------------------------------
  const handleUndo = () => {
    if (currentPage.historyStep > 0) {
      const prevStep = currentPage.historyStep - 1;
      const snapshot = currentPage.history[prevStep];
      setPages((prev) => {
        const next = [...prev];
        const page = next[activePageIndex];
        if (page && snapshot) {
          page.strokes = [...snapshot.strokes];
          page.shapes = [...snapshot.shapes];
          page.stickers = [...snapshot.stickers];
          page.historyStep = prevStep;
        }
        return next;
      });
    }
  };

  const handleRedo = () => {
    if (currentPage.historyStep < currentPage.history.length - 1) {
      const nextStep = currentPage.historyStep + 1;
      const snapshot = currentPage.history[nextStep];
      setPages((prev) => {
        const next = [...prev];
        const page = next[activePageIndex];
        if (page && snapshot) {
          page.strokes = [...snapshot.strokes];
          page.shapes = [...snapshot.shapes];
          page.stickers = [...snapshot.stickers];
          page.historyStep = nextStep;
        }
        return next;
      });
    }
  };

  const handleClearCanvas = () => {
    if (confirm('Clear the drawings on this page?')) {
      setPages((prev) => {
        const next = [...prev];
        const page = next[activePageIndex];
        if (page) {
          page.strokes = [];
          page.shapes = [];
          page.stickers = [];
          page.history = [
            ...page.history.slice(0, page.historyStep + 1),
            { strokes: [], shapes: [], stickers: [] },
          ];
          page.historyStep = page.history.length - 1;
        }
        return next;
      });

      if (socket && isOpponentConnected) {
        socket.emit('paint:action', {
          sessionCode,
          actionType: 'clear_canvas',
          payload: {},
        });
      }
      toast.success('Canvas cleared');
    }
  };

  // -------------------------------------------------------------
  // PAGE MANAGEMENT & CUSTOMIZATION
  // -------------------------------------------------------------
  const handleAddPage = () => {
    const newPageNum = pages.length + 1;
    const newPage: CanvasPage = {
      id: `page-${Date.now()}`,
      title: `Page ${newPageNum}`,
      pageColor: '#ffffff',
      sceneryPreset: 'blank',
      customSceneryUrl: null,
      frame: 'floral-daisy',
      canvasRatio: 'fit',
      strokes: [],
      shapes: [],
      stickers: [],
      history: [{ strokes: [], shapes: [], stickers: [] }],
      historyStep: 0,
    };

    setPages((prev) => [...prev, newPage]);
    setActivePageIndex(pages.length);

    if (socket && isOpponentConnected) {
      socket.emit('paint:action', {
        sessionCode,
        actionType: 'add_page',
        payload: { newPage },
      });
      socket.emit('paint:action', {
        sessionCode,
        actionType: 'switch_page',
        payload: { pageIndex: pages.length },
      });
    }

    toast.success(`Created Page ${newPageNum}`);
  };

  const handleSwitchPage = (index: number) => {
    if (index >= 0 && index < pages.length) {
      setActivePageIndex(index);
      if (socket && isOpponentConnected) {
        socket.emit('paint:action', {
          sessionCode,
          actionType: 'switch_page',
          payload: { pageIndex: index },
        });
      }
    }
  };

  const handleSelectPageColor = (color: string) => {
    setPages((prev) => {
      const next = [...prev];
      const page = next[activePageIndex];
      if (page) page.pageColor = color;
      return next;
    });

    if (socket && isOpponentConnected) {
      socket.emit('paint:action', {
        sessionCode,
        actionType: 'set_page_color',
        payload: { pageColor: color },
      });
    }
  };

  const handleSelectSceneryPreset = (preset: SceneryPreset) => {
    setPages((prev) => {
      const next = [...prev];
      const page = next[activePageIndex];
      if (page) page.sceneryPreset = preset;
      return next;
    });

    if (socket && isOpponentConnected) {
      socket.emit('paint:action', {
        sessionCode,
        actionType: 'set_scenery',
        payload: { sceneryPreset: preset },
      });
    }
  };

  const handleSelectFrame = (frame: FrameType) => {
    setPages((prev) => {
      const next = [...prev];
      const page = next[activePageIndex];
      if (page) page.frame = frame;
      return next;
    });

    if (socket && isOpponentConnected) {
      socket.emit('paint:action', {
        sessionCode,
        actionType: 'set_frame',
        payload: { frame },
      });
    }
  };

  const handleSelectCanvasRatio = (ratio: CanvasRatio) => {
    setPages((prev) => {
      const next = [...prev];
      const page = next[activePageIndex];
      if (page) page.canvasRatio = ratio;
      return next;
    });

    if (socket && isOpponentConnected) {
      socket.emit('paint:action', {
        sessionCode,
        actionType: 'set_ratio',
        payload: { canvasRatio: ratio },
      });
    }
  };

  // -------------------------------------------------------------
  // HIGH-RESOLUTION ARTWORK DOWNLOAD
  // -------------------------------------------------------------
  const handleDownloadArtwork = async () => {
    const bgCanvas = bgCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!bgCanvas || !drawCanvas) return;

    // Create high-res export canvas
    const exportCanvas = document.createElement('canvas');
    const width = bgCanvas.width;
    const height = bgCanvas.height;
    exportCanvas.width = width;
    exportCanvas.height = height;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw Background
    ctx.drawImage(bgCanvas, 0, 0);

    // 2. Draw Drawings on top
    ctx.drawImage(drawCanvas, 0, 0);

    // 3. Draw Authentic Photo Frame Overlay if selected
    const frameUrl = FRAME_IMAGE_MAP[currentPage.frame];
    if (frameUrl) {
      await new Promise<void>((resolve) => {
        const frameImg = new Image();
        frameImg.crossOrigin = 'anonymous';
        frameImg.onload = () => {
          ctx.drawImage(frameImg, 0, 0, width, height);
          resolve();
        };
        frameImg.onerror = () => resolve();
        frameImg.src = frameUrl;
      });
    } else if (currentPage.frame === 'minimal') {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, width - 8, height - 8);
    }

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Sunset_Studio_Artwork_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    toast.success('Artwork downloaded successfully!');
  };

  // -------------------------------------------------------------
  // CHAT SYSTEM
  // -------------------------------------------------------------
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const myName = user?.displayName || 'You';
    const text = chatInput.trim();

    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      senderName: myName,
      text,
      timestamp: Date.now(),
      isMe: true,
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');

    if (socket && isOpponentConnected) {
      socket.emit('paint:chat', {
        sessionCode,
        message: text,
        senderName: myName,
      });
    }

    showFloatingToast(myName, text);
  };

  // -------------------------------------------------------------
  // FRIEND INVITATION HANDLERS
  // -------------------------------------------------------------
  const handleInviteFriend = (friend: Friend) => {
    if (!socket) {
      toast.error('Socket disconnected');
      return;
    }

    socket.emit('game:invite', {
      targetUserId: friend._id,
      senderName: user?.displayName || 'Your Friend',
      senderAvatar: user?.avatar,
      game: 'paint',
      sessionCode,
    });

    setIsWaitingForFriend(true);
    setOpponentName(friend.displayName);
    setShowInviteModal(false);
    toast.success(`Invitation sent to ${friend.displayName}!`);
  };

  const handleCopyInviteLink = () => {
    const inviteLink = `${window.location.origin}/games?game=paint&code=${sessionCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast.success('Session invite link copied!');
  };

  const handleJoinCustomCode = () => {
    if (!customJoinCode.trim()) return;
    const cleanCode = customJoinCode.trim().toUpperCase();
    setSessionCode(cleanCode);
    setPlayerRole('guest');

    if (socket) {
      socket.emit('paint:join', {
        sessionCode: cleanCode,
        role: 'guest',
        playerName: user?.displayName || 'Artist',
      });
    }

    setShowInviteModal(false);
    toast.success(`Joined room ${cleanCode}!`);
  };

  return (
    <div className="relative flex flex-col h-[100dvh] w-full bg-slate-950 text-slate-100 overflow-hidden select-none font-sans">
      {/* 1. Sleek Header Bar */}
      <header className="flex-none flex items-center justify-between px-3 sm:px-6 py-2.5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 z-30">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 transition-all text-slate-300 hover:text-white"
            title="Back to games"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-sm sm:text-base font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-purple-400">
              Sunset Canvas Studio
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isOpponentConnected ? `Live with ${opponentName || 'Friend'}` : 'Solo Creative Canvas'}</span>
            </div>
          </div>
        </div>

        {/* Center Page Selector */}
        <div className="hidden md:flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/50">
          <button
            onClick={() => handleSwitchPage(activePageIndex - 1)}
            disabled={activePageIndex === 0}
            className="p-1 rounded-full text-slate-300 disabled:opacity-30 hover:bg-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold px-2">
            Page {activePageIndex + 1} of {pages.length}
          </span>
          <button
            onClick={() => handleSwitchPage(activePageIndex + 1)}
            disabled={activePageIndex === pages.length - 1}
            className="p-1 rounded-full text-slate-300 disabled:opacity-30 hover:bg-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleAddPage}
            className="flex items-center gap-1 text-[11px] font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 px-2.5 py-0.5 rounded-full border border-amber-500/40 ml-1"
          >
            <Plus className="w-3 h-3" />
            <span>New Page</span>
          </button>
        </div>

        {/* Right Header Action Icons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={currentPage.historyStep <= 0}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 disabled:opacity-30 active:scale-95 text-slate-300"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={currentPage.historyStep >= currentPage.history.length - 1}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 disabled:opacity-30 active:scale-95 text-slate-300"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {/* Clear Canvas */}
          <button
            onClick={handleClearCanvas}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-red-500/20 hover:text-red-300 active:scale-95 text-slate-400"
            title="Clear Page"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Chat with unread badge */}
          <button
            onClick={() => {
              setShowChatModal(true);
              setUnreadCount(0);
            }}
            className="relative p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 active:scale-95 text-slate-300"
            title="Studio Chat"
          >
            <MessageSquare className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Invite Friend */}
          <button
            onClick={() => {
              fetchFriends();
              setShowInviteModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-bold active:scale-95 transition-all shadow-lg shadow-rose-500/20"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Invite Friend</span>
          </button>

          {/* Download Image */}
          <button
            onClick={handleDownloadArtwork}
            className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 active:scale-95"
            title="Download Artwork"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Page Strip (< 768px) */}
      <div className="flex md:hidden flex-none items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleSwitchPage(activePageIndex - 1)}
            disabled={activePageIndex === 0}
            className="p-1 rounded text-slate-400 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold px-1">
            Page {activePageIndex + 1} / {pages.length}
          </span>
          <button
            onClick={() => handleSwitchPage(activePageIndex + 1)}
            disabled={activePageIndex === pages.length - 1}
            className="p-1 rounded text-slate-400 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={handleAddPage}
          className="flex items-center gap-1 bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md font-bold text-[11px]"
        >
          <Plus className="w-3 h-3" />
          <span>New Page</span>
        </button>
      </div>

      {/* 2. Main Studio Canvas Work Area with Authentic Photo Frame */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center p-2 sm:p-5">
        {/* Photo Frame Container */}
        <div
          className={`relative flex items-center justify-center transition-all duration-300 ${
            currentPage.canvasRatio === '1:1'
              ? 'aspect-square h-full max-h-[75vh]'
              : currentPage.canvasRatio === '3:4'
              ? 'aspect-[3/4] h-full max-h-[75vh]'
              : currentPage.canvasRatio === '16:9'
              ? 'aspect-[16/9] w-full max-w-5xl'
              : 'w-full h-full max-w-5xl'
          } ${
            currentPage.frame === 'minimal'
              ? 'rounded-2xl border-2 border-slate-700/60 shadow-2xl overflow-hidden'
              : currentPage.frame === 'none'
              ? 'rounded-xl border border-slate-800 shadow-xl overflow-hidden'
              : 'rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden'
          }`}
        >
          {/* Inner Canvas Mount with Drop Shadow */}
          <div
            ref={containerRef}
            className="relative w-full h-full rounded-lg overflow-hidden shadow-inner"
            style={{ touchAction: 'none' }}
          >
            {/* Layer 1: Background Canvas (Paper Color & Scenery Outline) */}
            <canvas
              ref={bgCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none block"
            />

            {/* Layer 2: Transparent Drawing Canvas (Non-Destructive Smooth Strokes) */}
            <canvas
              ref={drawCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="absolute inset-0 w-full h-full cursor-crosshair block z-10"
              style={{ touchAction: 'none' }}
            />

            {/* Layer 3: Authentic Photo Frame Image Overlay */}
            {FRAME_IMAGE_MAP[currentPage.frame] && (
              <img
                src={FRAME_IMAGE_MAP[currentPage.frame]}
                alt="Photo Frame"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
                style={{ zIndex: 15 }}
              />
            )}

            {/* Remote Friend's Cursor Indicator */}
            {remoteCursor && (
              <div
                className="absolute pointer-events-none transition-all duration-75 ease-out z-20"
                style={{
                  left: `${remoteCursor.x}px`,
                  top: `${remoteCursor.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="w-4 h-4 rounded-full border-2 border-white bg-rose-500 shadow-md" />
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-white whitespace-nowrap ml-2">
                  {remoteCursor.name}
                </span>
              </div>
            )}

            {/* 2-Second Floating Chat Toast Over Canvas (Exact User Request) */}
            <AnimatePresence>
              {floatingToast && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-sm sm:max-w-md w-auto px-4 py-2.5 rounded-full bg-slate-900/90 border border-amber-500/40 backdrop-blur-md shadow-2xl flex items-center gap-2 pointer-events-none"
                >
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping flex-none" />
                  <span className="text-xs font-black text-amber-300 flex-none">{floatingToast.sender}:</span>
                  <span className="text-xs font-medium text-slate-100 truncate">{floatingToast.text}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 3. Floating Bottom Tools Dock (Clean, Non-Clipping, Fully Categorized) */}
      <footer className="flex-none bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-2 sm:px-6 py-2 z-30">
        <div className="max-w-5xl mx-auto flex flex-col gap-2">
          {/* Sub-Panel: Dynamic Options Based on Active Tab */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
            {activeTab === 'brush' && (
              <div className="flex items-center gap-3 w-full justify-between sm:justify-start">
                <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl">
                  <button
                    onClick={() => setSelectedTool('pen')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedTool === 'pen' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Pen
                  </button>
                  <button
                    onClick={() => setSelectedTool('brush')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedTool === 'brush' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Brush
                  </button>
                  <button
                    onClick={() => setSelectedTool('neon')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedTool === 'neon' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Neon
                  </button>
                  <button
                    onClick={() => setSelectedTool('spray')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedTool === 'spray' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Spray
                  </button>
                  <button
                    onClick={() => setSelectedTool('eraser')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedTool === 'eraser' ? 'bg-rose-500 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Eraser
                  </button>
                </div>

                {/* Size Slider */}
                <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-xl">
                  <span className="text-[11px] font-bold text-slate-400">Size</span>
                  <input
                    type="range"
                    min="2"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-20 sm:w-28 accent-amber-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-amber-300 w-5">{brushSize}</span>
                </div>

                {/* Opacity Slider */}
                <div className="hidden sm:flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-xl">
                  <span className="text-[11px] font-bold text-slate-400">Opacity</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={brushOpacity}
                    onChange={(e) => setBrushOpacity(Number(e.target.value))}
                    className="w-20 accent-amber-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-amber-300 w-8">{brushOpacity}%</span>
                </div>
              </div>
            )}

            {activeTab === 'color' && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 w-full">
                {BRUSH_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setBrushColor(c)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-none transition-transform active:scale-90 border-2 ${
                      brushColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                {/* Custom Hex Color Input */}
                <div className="flex items-center gap-1.5 ml-2 bg-slate-800/80 px-2 py-1 rounded-xl flex-none">
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono uppercase">{brushColor}</span>
                </div>
              </div>
            )}

            {/* PAGE TAB: Page Color & Canvas Size */}
            {activeTab === 'page' && (
              <div className="flex items-center gap-3 overflow-x-auto py-1 w-full justify-between sm:justify-start">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 flex-none">Paper Color:</span>
                  {PAGE_COLORS.map((pc) => (
                    <button
                      key={pc.color}
                      onClick={() => handleSelectPageColor(pc.color)}
                      title={pc.label}
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex-none border-2 transition-transform ${
                        currentPage.pageColor === pc.color ? 'border-amber-400 scale-110 shadow-md' : 'border-slate-600'
                      }`}
                      style={{ backgroundColor: pc.color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={currentPage.pageColor}
                    onChange={(e) => handleSelectPageColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 flex-none ml-1"
                    title="Custom paper color"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl flex-none ml-2">
                  <span className="text-[11px] font-bold text-slate-400 px-1">Size:</span>
                  {[
                    { key: 'fit', label: 'Fit' },
                    { key: '1:1', label: '1:1' },
                    { key: '3:4', label: '3:4' },
                    { key: '16:9', label: '16:9' },
                  ].map((sz) => (
                    <button
                      key={sz.key}
                      onClick={() => handleSelectCanvasRatio(sz.key as CanvasRatio)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                        currentPage.canvasRatio === sz.key
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SCENERY TAB: Prebuilt Scenery Outlines Ready for Coloring */}
            {activeTab === 'scenery' && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 w-full">
                {[
                  { key: 'blank', label: 'Blank Canvas' },
                  { key: 'coffee-date', label: 'Romantic Cafe Date' },
                  { key: 'mountain-cabin', label: 'Mountain Cabin River' },
                  { key: 'capybara-halloween', label: 'Halloween Capybaras' },
                  { key: 'rainy-frog', label: 'Cute Rainy Frog' },
                  { key: 'elemental-touch', label: 'Fire & Water Elemental' },
                  { key: 'balloon-house', label: 'Balloon Flying House' },
                  { key: 'sunset-lake', label: 'Sunset Lake Sketch' },
                  { key: 'beach-sunset', label: 'Tropical Beach Sketch' },
                  { key: 'forest-stars', label: 'Forest Campfire Sketch' },
                  { key: 'desert-dunes', label: 'Desert Dunes Sketch' },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => handleSelectSceneryPreset(s.key as SceneryPreset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex-none transition-all ${
                      currentPage.sceneryPreset === s.key
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800/80 text-slate-300 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'shape' && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 w-full">
                {[
                  { key: 'rectangle', label: 'Rectangle', icon: Square },
                  { key: 'circle', label: 'Circle', icon: Circle },
                  { key: 'star', label: 'Star', icon: Star },
                  { key: 'heart', label: 'Heart', icon: Heart },
                  { key: 'cloud', label: 'Cloud', icon: Cloud },
                  { key: 'mountain', label: 'Mountain', icon: Mountain },
                ].map((s) => {
                  const IconComponent = s.icon;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setSelectedShape(s.key as ShapeType)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-none transition-all ${
                        selectedShape === s.key
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800/80 text-slate-300 hover:text-white'
                      }`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => setShapeFilled(!shapeFilled)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ml-2 flex-none ${
                    shapeFilled
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400'
                  }`}
                >
                  {shapeFilled ? 'Fill: On' : 'Fill: Off'}
                </button>
              </div>
            )}

            {/* STICKERS TAB: Instant Placement on Tap & Canvas Drop */}
            {activeTab === 'sticker' && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 w-full">
                {SCENERY_STICKERS.map((st) => {
                  const IconComp = st.icon;
                  return (
                    <button
                      key={st.key}
                      onClick={() => {
                        setSelectedSticker(st.key);
                        // Instant center placement for convenience!
                        const c = drawCanvasRef.current;
                        const w = c ? c.width / 4 : 200;
                        const h = c ? c.height / 4 : 200;
                        handlePlaceSticker(st.key, w, h);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-none transition-all ${
                        selectedSticker === st.key
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800/80 text-slate-300 hover:text-white'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* FRAMES TAB: Authentic Photo Frames */}
            {activeTab === 'frame' && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 w-full">
                {PHOTO_FRAMES.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => handleSelectFrame(f.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex-none transition-all ${
                      currentPage.frame === f.key
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800/80 text-slate-300 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Primary Tool Categories Switcher */}
          <div className="flex items-center justify-around sm:justify-center gap-2 sm:gap-6 pt-1 border-t border-slate-800/60">
            <button
              onClick={() => setActiveTab('brush')}
              className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-all ${
                activeTab === 'brush' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Paintbrush className="w-5 h-5" />
              <span>Brushes</span>
            </button>

            <button
              onClick={() => setActiveTab('color')}
              className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-all ${
                activeTab === 'color' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="w-5 h-5 rounded-full border border-slate-500" style={{ backgroundColor: brushColor }} />
              <span>Colors</span>
            </button>

            {/* Page & Size Tab */}
            <button
              onClick={() => setActiveTab('page')}
              className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-all ${
                activeTab === 'page' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Page & Size</span>
            </button>

            {/* Scenery Line Art Outlines */}
            <button
              onClick={() => setActiveTab('scenery')}
              className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-all ${
                activeTab === 'scenery' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-5 h-5" />
              <span>Scenery</span>
            </button>

            <button
              onClick={() => setActiveTab('shape')}
              className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-all ${
                activeTab === 'shape' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Square className="w-5 h-5" />
              <span>Shapes</span>
            </button>

            <button
              onClick={() => setActiveTab('sticker')}
              className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-all ${
                activeTab === 'sticker' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-5 h-5" />
              <span>Stickers</span>
            </button>

            <button
              onClick={() => setActiveTab('frame')}
              className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-all ${
                activeTab === 'frame' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-5 h-5" />
              <span>Photo Frames</span>
            </button>
          </div>
        </div>
      </footer>

      {/* 4. Chat Modal Drawer (Full History & Messaging) */}
      <AnimatePresence>
        {showChatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
          >
            <motion.div
              initial={{ x: 350 }}
              animate={{ x: 0 }}
              exit={{ x: 350 }}
              className="w-full max-w-sm h-full bg-slate-900 border-l border-slate-800 flex flex-col p-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-400" />
                  <h3 className="font-extrabold text-sm text-slate-100">Studio Live Chat</h3>
                </div>
                <button
                  onClick={() => setShowChatModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Message Scroll */}
              <div className="flex-1 overflow-y-auto space-y-3 py-4">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-slate-400 px-1 mb-0.5">{msg.senderName}</span>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs font-medium ${
                        msg.isMe
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-tr-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Invite Friends Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="font-extrabold text-base text-slate-100">Invite a Friend to Paint</h3>
                  <p className="text-xs text-slate-400">Collaborate live on the same canvas in real-time</p>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Room Code & Copy Link */}
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-400">Session Room Code</span>
                <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                  <span className="font-mono font-black text-amber-400 tracking-wider text-sm">{sessionCode}</span>
                  <button
                    onClick={handleCopyInviteLink}
                    className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Join Existing Room Code */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customJoinCode}
                  onChange={(e) => setCustomJoinCode(e.target.value)}
                  placeholder="Or enter friend's Room Code"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono tracking-wider focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleJoinCustomCode}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-white active:scale-95"
                >
                  Join
                </button>
              </div>

              {/* Friends List for Direct 1-Click Invites */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Online Friends</span>
                  <span className="text-[11px] text-slate-500">{friendsList.length} total</span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search friend..."
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {loadingFriends ? (
                    <div className="text-center py-4 text-xs text-slate-500">Loading friends...</div>
                  ) : friendsList.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500">No friends added yet. Share room code above!</div>
                  ) : (
                    friendsList
                      .filter((f) => f.displayName.toLowerCase().includes(searchFilter.toLowerCase()))
                      .map((f) => {
                        const isOnline = onlineUsersMap[f._id] || false;
                        return (
                          <div
                            key={f._id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50"
                          >
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-amber-400">
                                  {f.displayName.substring(0, 1).toUpperCase()}
                                </div>
                                <span
                                  className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-slate-900 ${
                                    isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                                  }`}
                                />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-200 block">{f.displayName}</span>
                                <span className="text-[10px] text-slate-400">{isOnline ? 'Online now' : 'Offline'}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleInviteFriend(f)}
                              className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold active:scale-95 transition-all"
                            >
                              Invite
                            </button>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
