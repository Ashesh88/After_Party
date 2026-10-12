'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Paintbrush,
  Pen,
  Eraser,
  Download,
  Users,
  MessageSquare,
  Undo2,
  Redo2,
  Trash2,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  X,
  Send,
  Square,
  Circle,
  Star,
  Heart,
  Cloud,
  Mountain,
  Layers,
  Image as ImageIcon,
  Search,
  FileText,
  RotateCw,
  Sparkles,
  Maximize2,
  Minimize2,
  Move,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../lib/store/authStore';
import { useSocketStore } from '../../lib/store/socketStore';
import { useGameStore } from '../../lib/store/gameStore';
import api from '../../lib/api';
import { Friend } from '../../lib/types';

// Types & Definitions
type ToolCategory = 'pen' | 'brush' | 'color' | 'page' | 'scenery' | 'shape' | 'sticker' | 'frame';
type BaseTool = 'pen' | 'brush' | 'eraser';
type ShapeType = 'line' | 'rectangle' | 'circle' | 'star' | 'heart' | 'cloud' | 'mountain';
type CanvasRatio = 'fit' | '1:1' | '3:4' | '16:9';

export interface SceneryAdjust {
  scale: number;
  scaleX?: number;
  scaleY?: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
  rotation: number;
}

export interface FrameAdjust {
  scale: number;
  scaleX?: number;
  scaleY?: number;
  offsetX: number;
  offsetY: number;
  width?: number;
  height?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  tool: BaseTool;
  subType?: string;
  color: string;
  size: number;
  opacity: number;
  points: Point[];
  author: string;
}

export interface ShapeItem {
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

export interface StickerItem {
  id: string;
  stickerKey: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  author: string;
}

export interface CanvasPage {
  id: string;
  title: string;
  pageColor: string;
  sceneryPreset: string;
  sceneryAdjust?: SceneryAdjust;
  customSceneryUrl?: string | null;
  frame: string;
  frameAdjust?: FrameAdjust;
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

// 1. Curated Palette (Default Color is pure black #000000)
const BRUSH_PALETTE = [
  '#000000', // Midnight Black (Default)
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
];

// 2. Curated Page Tint Colors (Paper Texture removed per user directive)
const PAGE_COLORS = [
  { label: 'White', color: '#ffffff' },
  { label: 'Ivory Cream', color: '#fefae0' },
  { label: 'Pastel Blush', color: '#fce7f3' },
  { label: 'Sky Mist', color: '#e0f2fe' },
  { label: 'Soft Mint', color: '#ecfdf5' },
  { label: 'Warm Sand', color: '#f5ebe0' },
  { label: 'Lavender', color: '#f3e8ff' },
  { label: 'Midnight Dark', color: '#111827' },
];

// 3. Pen Types from User Reference Image with Visual Preview
export const PEN_TYPES = [
  { key: 'smart-pen', label: 'Smart Pen', desc: 'Silky smooth line', previewColor: '#3b82f6' },
  { key: 'tattoo-pen', label: 'Tattoo Pen', desc: 'Needle fine crisp line', previewColor: '#db2777' },
  { key: 'graphite', label: 'Graphite', desc: 'Textured pencil sketch', previewColor: '#64748b' },
  { key: 'glitter', label: 'Glitter', desc: 'Sparkling diamond shimmer', previewColor: '#38bdf8' },
  { key: 'whiteboard', label: 'Whiteboard', desc: 'Smooth dry marker glide', previewColor: '#0284c7' },
  { key: 'permanent', label: 'Permanent', desc: 'Bold opaque ink', previewColor: '#0f172a' },
  { key: 'multicolor', label: 'Multicolor', desc: 'Rainbow hue spectrum', previewColor: '#a855f7' },
  { key: 'fiber-tip', label: 'Fiber-tip', desc: 'Precision uniform line', previewColor: '#0ea5e9' },
  { key: 'twin-tip', label: 'Twin-tip', desc: 'Parallel double line', previewColor: '#eab308' },
  { key: 'watercolor-pen', label: 'Watercolor pen', desc: 'Soft bleeding edge', previewColor: '#60a5fa' },
  { key: 'dry-erase', label: 'Dry-erase', desc: 'Semi-opaque marker', previewColor: '#ef4444' },
  { key: 'acrylic-paint-pen', label: 'Acrylic paint pen', desc: 'Thick creamy acrylic', previewColor: '#ec4899' },
  { key: 'chalk-marker', label: 'Chalk marker', desc: 'Textured chalk stroke', previewColor: '#f472b6' },
  { key: 'soft-tip', label: 'Soft-tip', desc: 'Pressure sensitive curve', previewColor: '#f97316' },
  { key: 'fluorescent-pen', label: 'Fluorescent pen', desc: 'Vibrant neon glow', previewColor: '#ec4899' },
  { key: 'tilt-pen', label: 'Tilt pen', desc: 'Dynamic angle stroke', previewColor: '#38bdf8' },
  { key: 'bamboo-pen', label: 'Bamboo pen', desc: 'Asian calligraphy chisel', previewColor: '#b45309' },
  { key: 'digital-pen', label: 'Digital pen', desc: 'Pixel-perfect digital line', previewColor: '#1e293b' },
  { key: '3d-pen', label: '3D pen', desc: 'Embossed shaded tube', previewColor: '#8b5cf6' },
  { key: 'pocket-pen', label: 'Pocket pen', desc: 'Compact handy ballpoint', previewColor: '#1d4ed8' },
];

// 4. Brush Types from User Reference Image with Visual Preview
export const BRUSH_TYPES = [
  { key: 'round-tip', label: 'Round Tip', desc: 'Classic artist round tip' },
  { key: 'hog-bristle', label: 'Hog Bristle', desc: 'Multi-hair textured bristle' },
  { key: 'mop-brush', label: 'Mop Brush', desc: 'Large watery soft wash' },
  { key: 'flat-wash', label: 'Flat Wash', desc: 'Broad flat ribbon stroke' },
  { key: 'filbert', label: 'Filbert', desc: 'Curved flat chisel wash' },
  { key: 'round-long-hair', label: 'Round Long hair', desc: 'Fluid continuous stroke' },
  { key: 'fan-brush', label: 'Fan Brush', desc: 'Radial fan spread' },
  { key: 'cats-tongue', label: "Cat's Tongue", desc: 'Pointed oval wash' },
  { key: 'dagger-stripper', label: 'Dagger Stripper', desc: 'Sharp angled curve' },
  { key: 'liner-rigger', label: 'Liner / Rigger', desc: 'Ultra-thin long lines' },
  { key: 'angular-chisel', label: 'Angular / Chisel', desc: 'Crisp slant edge' },
  { key: 'oval-mop', label: 'Oval Mop', desc: 'Deep absorbent wash' },
  { key: 'notch', label: 'Notch', desc: 'Double tip split brush' },
  { key: 'comb-brush', label: 'Comb Brush', desc: 'Parallel rake hairs' },
  { key: 'hog-bristle-domed', label: 'Hog Bristle round domed', desc: 'Dense domed stippling' },
  { key: 'pipe-overgrainer', label: 'Pipe over-grainer', desc: 'Wood grain texture' },
  { key: 'round-script-light-ox', label: 'Round script light ox', desc: 'Fine lettering script' },
];

// 5. New Sceneries (5 New User Images)
export const SCENERY_PRESETS = [
  { key: 'blank', label: 'Blank Canvas', src: '' },
  { key: 'dolphins-sunset', label: 'Sunset Dolphins Lagoon', src: '/scenery/scenery-dolphins-sunset.png' },
  { key: 'balloon-house', label: 'Floating Balloon House', src: '/scenery/scenery-balloon-house.png' },
  { key: 'mushroom-village', label: 'Enchanted Mushroom Village', src: '/scenery/scenery-mushroom-village.png' },
  { key: 'autumn-basket', label: 'Autumn Harvest Basket', src: '/scenery/scenery-autumn-basket.png' },
  { key: 'cozy-fireplace-fox', label: 'Cozy Fireplace Fox', src: '/scenery/scenery-cozy-fireplace-fox.png' },
];

// 6. New Photo Frames (5 New User Images)
export const PHOTO_FRAMES = [
  { key: 'none', label: 'Frameless Clean', src: '' },
  { key: 'baroque-gold', label: 'Ornate Royal Baroque Gold', src: '/frames/frame-baroque-gold.png' },
  { key: 'classic-wood', label: 'Classic Carved Walnut Wood', src: '/frames/frame-classic-wood.png' },
  { key: 'plaid-yellow', label: 'Sunny Yellow Gingham Plaid', src: '/frames/frame-plaid-yellow.png' },
  { key: 'pink-dots', label: 'Pastel Pink Candy Dots', src: '/frames/frame-pink-dots.png' },
  { key: 'checkerboard-red', label: 'Red & Cream Checkerboard', src: '/frames/frame-checkerboard-red.png' },
];

// 7. All 46 New Stickers
export const STICKER_LIST = [
  { key: 'sticker-artist-pup', label: 'Artist Pup', category: 'animals' },
  { key: 'sticker-brachiosaurus', label: 'Brachiosaurus', category: 'animals' },
  { key: 'sticker-bubble-bath-girl', label: 'Bubble Bath Girl', category: 'characters' },
  { key: 'sticker-caveman-club', label: 'Caveman Club', category: 'characters' },
  { key: 'sticker-cherry-blossom-tree', label: 'Cherry Blossom Tree', category: 'nature' },
  { key: 'sticker-cherry-pie', label: 'Cherry Pie', category: 'food' },
  { key: 'sticker-chibi-reaper', label: 'Chibi Reaper', category: 'characters' },
  { key: 'sticker-cozy-fox', label: 'Cozy Fox', category: 'animals' },
  { key: 'sticker-cupid-arrow', label: 'Cupid Arrow', category: 'objects' },
  { key: 'sticker-cute-bunny', label: 'Cute Bunny', category: 'animals' },
  { key: 'sticker-cute-elephant', label: 'Cute Elephant', category: 'animals' },
  { key: 'sticker-cute-snail', label: 'Cute Snail', category: 'animals' },
  { key: 'sticker-dice', label: 'Lucky Dice', category: 'objects' },
  { key: 'sticker-flying-parrot', label: 'Flying Parrot', category: 'animals' },
  { key: 'sticker-flying-witch', label: 'Flying Witch', category: 'characters' },
  { key: 'sticker-fork-heart', label: 'Fork Heart', category: 'objects' },
  { key: 'sticker-frog-namaste', label: 'Namaste Frog', category: 'animals' },
  { key: 'sticker-gothic-coffin', label: 'Gothic Coffin', category: 'objects' },
  { key: 'sticker-green-chick', label: 'Green Chick', category: 'animals' },
  { key: 'sticker-green-tree', label: 'Green Tree', category: 'nature' },
  { key: 'sticker-happy-corgi', label: 'Happy Corgi', category: 'animals' },
  { key: 'sticker-happy-flame', label: 'Happy Flame', category: 'nature' },
  { key: 'sticker-happy-shark', label: 'Happy Shark', category: 'animals' },
  { key: 'sticker-happy-sun', label: 'Happy Sun', category: 'nature' },
  { key: 'sticker-heart-lock-key', label: 'Heart Lock & Key', category: 'objects' },
  { key: 'sticker-hi-bluebird', label: 'Hi Bluebird', category: 'animals' },
  { key: 'sticker-iceberg-mountain', label: 'Iceberg Mountain', category: 'nature' },
  { key: 'sticker-laughing-octopus', label: 'Laughing Octopus', category: 'animals' },
  { key: 'sticker-magic-diary', label: 'Magic Diary', category: 'objects' },
  { key: 'sticker-palm-tree', label: 'Palm Tree', category: 'nature' },
  { key: 'sticker-party-piglet', label: 'Party Piglet', category: 'animals' },
  { key: 'sticker-pine-tree', label: 'Pine Tree', category: 'nature' },
  { key: 'sticker-pink-flamingo', label: 'Pink Flamingo', category: 'animals' },
  { key: 'sticker-potted-succulent', label: 'Potted Succulent', category: 'nature' },
  { key: 'sticker-rainy-umbrella', label: 'Rainy Umbrella', category: 'objects' },
  { key: 'sticker-ramen-axolotl', label: 'Ramen Axolotl', category: 'animals' },
  { key: 'sticker-rose-bouquet', label: 'Rose Bouquet', category: 'nature' },
  { key: 'sticker-shy-cat', label: 'Shy Cat', category: 'animals' },
  { key: 'sticker-silly-axolotl', label: 'Silly Axolotl', category: 'animals' },
  { key: 'sticker-sparkle-cat', label: 'Sparkle Cat', category: 'animals' },
  { key: 'sticker-sun-mountain-lake', label: 'Sun Mountain Lake', category: 'nature' },
  { key: 'sticker-swinging-monkey', label: 'Swinging Monkey', category: 'animals' },
  { key: 'sticker-talking-cats', label: 'Talking Cats', category: 'animals' },
  { key: 'sticker-win-streak-trophy', label: 'Win Streak Trophy', category: 'objects' },
  { key: 'sticker-yellow-dino', label: 'Yellow Dino', category: 'animals' },
  { key: 'sticker-yellow-house', label: 'Yellow House', category: 'nature' },
];

export default function CoPaintStudio({ onBack }: CoPaintStudioProps) {
  const user = useAuthStore((state) => state.user);
  const socket = useSocketStore((state) => state.socket);
  const { sessionData, setSessionData } = useGameStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
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

  // Active Tool Navigation (Default color is strictly pure black #000000)
  const [activeTab, setActiveTab] = useState<ToolCategory>('pen');
  const [activeBaseTool, setActiveBaseTool] = useState<BaseTool>('pen');
  const [selectedPenType, setSelectedPenType] = useState<string>('smart-pen');
  const [selectedBrushType, setSelectedBrushType] = useState<string>('round-tip');
  const [brushColor, setBrushColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(6);
  const [brushOpacity, setBrushOpacity] = useState<number>(100);

  // Shape state
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle');
  const [shapeFilled, setShapeFilled] = useState<boolean>(false);
  const [shapeDragStart, setShapeDragStart] = useState<Point | null>(null);
  const [currentShapePreview, setCurrentShapePreview] = useState<ShapeItem | null>(null);

  // Canva-style Interactive Selection & Manipulation State
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [isDraggingSticker, setIsDraggingSticker] = useState<boolean>(false);
  const [stickerDragOffset, setStickerDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [activeResizeHandle, setActiveResizeHandle] = useState<string | null>(null);
  const [resizeInitialData, setResizeInitialData] = useState<{ clientX: number; clientY: number; w: number; h: number; x: number; y: number } | null>(null);

  // Frame Interactive Transform State
  const [isFrameSelected, setIsFrameSelected] = useState<boolean>(false);
  const [isDraggingFrame, setIsDraggingFrame] = useState<boolean>(false);
  const [frameDragOffset, setFrameDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [activeFrameHandle, setActiveFrameHandle] = useState<string | null>(null);
  const [frameResizeInitialData, setFrameResizeInitialData] = useState<{ clientX: number; clientY: number; scale: number; scaleX: number; scaleY: number } | null>(null);

  // Scenery Interactive Transform State
  const [isScenerySelected, setIsScenerySelected] = useState<boolean>(false);
  const [isDraggingScenery, setIsDraggingScenery] = useState<boolean>(false);
  const [sceneryDragOffset, setSceneryDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [activeSceneryHandle, setActiveSceneryHandle] = useState<string | null>(null);
  const [sceneryResizeInitialData, setSceneryResizeInitialData] = useState<{ clientX: number; clientY: number; scale: number } | null>(null);

  // Popup Box Modals (for Pens, Brushes, Stickers, Scenery, Frames)
  const [showPenModal, setShowPenModal] = useState<boolean>(false);
  const [showBrushModal, setShowBrushModal] = useState<boolean>(false);
  const [showStickerModal, setShowStickerModal] = useState<boolean>(false);
  const [showSceneryModal, setShowSceneryModal] = useState<boolean>(false);
  const [showFrameModal, setShowFrameModal] = useState<boolean>(false);
  const [stickerSearch, setStickerSearch] = useState<string>('');
  const [stickerCategoryFilter, setStickerCategoryFilter] = useState<string>('all');

  // Multi-Page Canvas Management
  const [pages, setPages] = useState<CanvasPage[]>([
    {
      id: 'page-1',
      title: 'Page 1',
      pageColor: '#ffffff',
      sceneryPreset: 'blank',
      sceneryAdjust: { scale: 1, scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, opacity: 1, rotation: 0 },
      customSceneryUrl: null,
      frame: 'none',
      frameAdjust: { scale: 1, scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 },
      canvasRatio: typeof window !== 'undefined' && window.innerWidth < 768 ? '3:4' : '16:9',
      strokes: [],
      shapes: [],
      stickers: [],
      history: [{ strokes: [], shapes: [], stickers: [] }],
      historyStep: 0,
    },
  ]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const currentPage = pages[activePageIndex] || pages[0];

  // Chat State
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

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState<boolean>(false);
  const [onlineUsersMap, setOnlineUsersMap] = useState<Record<string, boolean>>({});
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [customJoinCode, setCustomJoinCode] = useState<string>('');

  // -------------------------------------------------------------
  // GLOBAL SAFETY POINTER RELEASE (Guarantees objects never get stuck)
  // -------------------------------------------------------------
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      setIsDraggingSticker(false);
      setIsDraggingFrame(false);
      setIsDraggingScenery(false);
      setActiveResizeHandle(null);
      setActiveFrameHandle(null);
      setActiveSceneryHandle(null);
      setResizeInitialData(null);
      setFrameResizeInitialData(null);
      setSceneryResizeInitialData(null);
      isDrawingRef.current = false;
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  // -------------------------------------------------------------
  // SOCKET & MULTIPLAYER
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

  useEffect(() => {
    if (!socket) return;

    const handleOpponentJoined = (data: { playerName: string; role: string }) => {
      setIsWaitingForFriend(false);
      setIsOpponentConnected(true);
      if (data.playerName) setOpponentName(data.playerName);
      toast.success(`${data.playerName || 'Friend'} joined the canvas!`);

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
          if (page) page.shapes = [...page.shapes, payload.shape];
          return next;
        });
      } else if (actionType === 'add_sticker' && payload?.sticker) {
        setPages((prev) => {
          const next = [...prev];
          const page = next[activePageIndex];
          if (page) page.stickers = [...page.stickers, payload.sticker];
          return next;
        });
      } else if (actionType === 'update_sticker' && payload?.sticker) {
        setPages((prev) => {
          const next = [...prev];
          const page = next[activePageIndex];
          if (page) {
            page.stickers = page.stickers.map((s) => (s.id === payload.sticker.id ? payload.sticker : s));
          }
          return next;
        });
      } else if (actionType === 'delete_sticker' && payload?.id) {
        setPages((prev) => {
          const next = [...prev];
          const page = next[activePageIndex];
          if (page) page.stickers = page.stickers.filter((s) => s.id !== payload.id);
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
      } else if (actionType === 'adjust_scenery' && payload?.sceneryAdjust) {
        setPages((prev) => {
          const next = [...prev];
          const page = next[activePageIndex];
          if (page) {
            page.sceneryAdjust = {
              scale: page.sceneryAdjust?.scale ?? 1,
              offsetX: page.sceneryAdjust?.offsetX ?? 0,
              offsetY: page.sceneryAdjust?.offsetY ?? 0,
              opacity: page.sceneryAdjust?.opacity ?? 1,
              rotation: page.sceneryAdjust?.rotation ?? 0,
              ...payload.sceneryAdjust,
            };
          }
          return next;
        });
      } else if (actionType === 'set_frame' && payload?.frame) {
        setPages((prev) => {
          const next = [...prev];
          const page = next[activePageIndex];
          if (page) page.frame = payload.frame;
          return next;
        });
      } else if (actionType === 'adjust_frame' && payload?.frameAdjust) {
        setPages((prev) => {
          const next = [...prev];
          const page = next[activePageIndex];
          if (page) {
            page.frameAdjust = {
              scale: page.frameAdjust?.scale ?? 1,
              offsetX: page.frameAdjust?.offsetX ?? 0,
              offsetY: page.frameAdjust?.offsetY ?? 0,
              ...payload.frameAdjust,
            };
          }
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

    socket.on('paint:opponent_joined', handleOpponentJoined);
    socket.on('paint:draw', handleRemoteDraw);
    socket.on('paint:action', handleRemoteAction);
    socket.on('paint:cursor', handleRemoteCursor);
    socket.on('paint:sync_state', handleSyncState);
    socket.on('paint:chat', handleRemoteChat);
    socket.on('paint:opponent_left', handleOpponentLeft);

    return () => {
      socket.off('paint:opponent_joined', handleOpponentJoined);
      socket.off('paint:draw', handleRemoteDraw);
      socket.off('paint:action', handleRemoteAction);
      socket.off('paint:cursor', handleRemoteCursor);
      socket.off('paint:sync_state', handleSyncState);
      socket.off('paint:chat', handleRemoteChat);
      socket.off('paint:opponent_left', handleOpponentLeft);
    };
  }, [socket, sessionCode, playerRole, pages, activePageIndex, showChatModal]);

  const showFloatingToast = (sender: string, text: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setFloatingToast({ sender, text });
    toastTimeoutRef.current = setTimeout(() => {
      setFloatingToast(null);
      toastTimeoutRef.current = null;
    }, 2000);
  };

  // -------------------------------------------------------------
  // TWO-CANVAS RENDERING ENGINE
  // -------------------------------------------------------------
  const redrawBackgroundLayer = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;

    const width = bgCanvas.width;
    const height = bgCanvas.height;

    ctx.clearRect(0, 0, width, height);

    // 1. Fill Clean Base Page Tint Color
    ctx.fillStyle = currentPage.pageColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Scenery Line Art Outline from New Set
    if (currentPage.sceneryPreset && currentPage.sceneryPreset !== 'blank') {
      const presetDef = SCENERY_PRESETS.find((s) => s.key === currentPage.sceneryPreset);
      if (presetDef && presetDef.src) {
        const src = presetDef.src;
        const img = imageCacheRef.current.get(src);
        const adjust = currentPage.sceneryAdjust || { scale: 1, offsetX: 0, offsetY: 0, opacity: 1, rotation: 0 };

        ctx.save();
        ctx.globalAlpha = Math.max(0.05, Math.min(1.0, adjust.opacity ?? 1.0));

        if (img && img.complete && img.naturalWidth > 0) {
          const padding = 20;
          const baseScale = Math.min((width - padding * 2) / img.naturalWidth, (height - padding * 2) / img.naturalHeight);
          const finalScale = baseScale * (adjust.scale ?? 1.0);
          const dw = img.naturalWidth * finalScale;
          const dh = img.naturalHeight * finalScale;

          ctx.translate(width / 2 + (adjust.offsetX ?? 0), height / 2 + (adjust.offsetY ?? 0));
          if (adjust.rotation) {
            ctx.rotate((adjust.rotation * Math.PI) / 180);
          }
          ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        } else {
          const newImg = new Image();
          newImg.src = src;
          newImg.onload = () => {
            imageCacheRef.current.set(src, newImg);
            redrawBackgroundLayer();
          };
        }
        ctx.restore();
      }
    }
  }, [currentPage.pageColor, currentPage.sceneryPreset, currentPage.sceneryAdjust]);

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

    // 1.1 Live Shape Preview
    if (currentShapePreview) {
      drawShapeOnCanvas(ctx, currentShapePreview, true);
    }

    // 2. Draw Brush & Pen Strokes
    currentPage.strokes.forEach((stroke) => {
      drawStrokeOnCanvas(ctx, stroke);
    });

    // 3. Draw Image Stickers
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

  // Handle Canvas Resize
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
  // STROKE RENDERING ENGINE (PENS & BRUSHES)
  // -------------------------------------------------------------
  const drawStrokeOnCanvas = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (!stroke.points || stroke.points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = stroke.size * 2.5;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.globalCompositeOperation = 'source-over';
    const sub = stroke.subType || (stroke.tool === 'pen' ? 'smart-pen' : 'round-tip');

    if (stroke.tool === 'pen') {
      if (sub === 'graphite') {
        ctx.lineWidth = Math.max(1, stroke.size * 0.75);
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = (stroke.opacity / 100) * 0.8;
      } else if (sub === 'glitter') {
        ctx.lineWidth = stroke.size;
        ctx.strokeStyle = stroke.color;
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = stroke.size * 1.8;
        ctx.globalAlpha = stroke.opacity / 100;
      } else if (sub === 'fluorescent-pen') {
        ctx.lineWidth = stroke.size * 1.3;
        ctx.strokeStyle = stroke.color;
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = stroke.size * 3;
        ctx.globalAlpha = 0.95;
      } else if (sub === 'watercolor-pen') {
        ctx.lineWidth = stroke.size * 1.6;
        ctx.strokeStyle = stroke.color;
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = 6;
        ctx.globalAlpha = (stroke.opacity / 100) * 0.45;
      } else if (sub === 'chalk-marker') {
        ctx.lineWidth = stroke.size * 1.5;
        ctx.strokeStyle = stroke.color;
        ctx.setLineDash([4, 2]);
        ctx.globalAlpha = (stroke.opacity / 100) * 0.85;
      } else if (sub === 'twin-tip') {
        ctx.lineWidth = Math.max(1.5, stroke.size * 0.5);
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = stroke.opacity / 100;
        const offset = stroke.size * 0.6;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x - offset, stroke.points[0].y - offset);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x - offset, stroke.points[i].y - offset);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x + offset, stroke.points[0].y + offset);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x + offset, stroke.points[i].y + offset);
        }
        ctx.stroke();
        ctx.restore();
        return;
      } else if (sub === 'tattoo-pen') {
        ctx.lineWidth = Math.max(1, stroke.size * 0.5);
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = 1.0;
      } else if (sub === '3d-pen') {
        ctx.lineWidth = stroke.size * 1.4;
        ctx.strokeStyle = '#1e293b';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x + 2, stroke.points[0].y + 2);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x + 2, stroke.points[i].y + 2);
        }
        ctx.stroke();

        ctx.lineWidth = stroke.size;
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = stroke.opacity / 100;
      } else if (sub === 'multicolor') {
        for (let i = 1; i < stroke.points.length; i++) {
          const hue = (i * 22) % 360;
          ctx.strokeStyle = `hsl(${hue}, 90%, 55%)`;
          ctx.lineWidth = stroke.size;
          ctx.globalAlpha = stroke.opacity / 100;
          ctx.beginPath();
          ctx.moveTo(stroke.points[i - 1].x, stroke.points[i - 1].y);
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          ctx.stroke();
        }
        ctx.restore();
        return;
      } else {
        ctx.lineWidth = stroke.size;
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = stroke.opacity / 100;
      }
    } else {
      if (sub === 'mop-brush' || sub === 'oval-mop') {
        ctx.lineWidth = stroke.size * 2.6;
        ctx.strokeStyle = stroke.color;
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = stroke.size;
        ctx.globalAlpha = (stroke.opacity / 100) * 0.35;
      } else if (sub === 'flat-wash') {
        ctx.lineWidth = stroke.size * 2.2;
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = (stroke.opacity / 100) * 0.55;
      } else if (sub === 'hog-bristle' || sub === 'hog-bristle-domed') {
        ctx.lineWidth = Math.max(1, stroke.size * 0.4);
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = (stroke.opacity / 100) * 0.65;
        [-2, 0, 2].forEach((offset) => {
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x + offset, stroke.points[0].y + offset);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x + offset, stroke.points[i].y + offset);
          }
          ctx.stroke();
        });
        ctx.restore();
        return;
      } else if (sub === 'comb-brush') {
        ctx.lineWidth = Math.max(1, stroke.size * 0.3);
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = stroke.opacity / 100;
        [-4, -1, 2, 5].forEach((offset) => {
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x + offset, stroke.points[0].y + offset);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x + offset, stroke.points[i].y + offset);
          }
          ctx.stroke();
        });
        ctx.restore();
        return;
      } else if (sub === 'liner-rigger' || sub === 'round-script-light-ox') {
        ctx.lineWidth = Math.max(1.5, stroke.size * 0.55);
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = stroke.opacity / 100;
      } else {
        ctx.lineWidth = stroke.size * 1.2;
        ctx.strokeStyle = stroke.color;
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = 2;
        ctx.globalAlpha = stroke.opacity / 100;
      }
    }

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
      const step = Math.PI / spikes;

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

  const drawStickerOnCanvas = (ctx: CanvasRenderingContext2D, sticker: StickerItem) => {
    const src = `/stickers/${sticker.stickerKey}.png`;
    const img = imageCacheRef.current.get(src);
    const w = sticker.width || 90;
    const h = sticker.height || 90;

    ctx.save();
    ctx.translate(sticker.x, sticker.y);
    if (sticker.rotation) {
      ctx.rotate((sticker.rotation * Math.PI) / 180);
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      const newImg = new Image();
      newImg.src = src;
      newImg.onload = () => {
        imageCacheRef.current.set(src, newImg);
        redrawDrawingLayer();
      };
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, 0, w / 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement> | React.PointerEvent<HTMLDivElement>): Point => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Add Sticker to Center of Canvas (Static & Selected, not dragging)
  const handleAddSticker = (key: string) => {
    const container = containerRef.current;
    const defaultX = container ? container.clientWidth / 2 : 200;
    const defaultY = container ? container.clientHeight / 2 : 200;

    const newSticker: StickerItem = {
      id: 'stk-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      stickerKey: key,
      x: defaultX,
      y: defaultY,
      width: 120,
      height: 120,
      rotation: 0,
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

    setSelectedStickerId(newSticker.id);
    setIsDraggingSticker(false);
    setShowStickerModal(false);

    if (socket && isOpponentConnected) {
      socket.emit('paint:action', {
        sessionCode,
        actionType: 'add_sticker',
        payload: { sticker: newSticker },
      });
    }

    toast.success('Sticker placed on canvas');
  };

  // -------------------------------------------------------------
  // CANVAS POINTER HANDLERS
  // -------------------------------------------------------------
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawCanvasRef.current?.setPointerCapture(e.pointerId);
    const pt = getCanvasCoords(e);

    // 1. Check if user clicked an existing sticker on canvas
    for (let i = currentPage.stickers.length - 1; i >= 0; i--) {
      const st = currentPage.stickers[i];
      const w = st.width || 120;
      const h = st.height || 120;
      if (Math.abs(pt.x - st.x) <= w / 2 && Math.abs(pt.y - st.y) <= h / 2) {
        setSelectedStickerId(st.id);
        setIsDraggingSticker(true);
        setStickerDragOffset({ x: pt.x - st.x, y: pt.y - st.y });
        return;
      }
    }

    // If clicked empty area, deselect any active sticker, frame or scenery selection
    setSelectedStickerId(null);
    setIsFrameSelected(false);
    setIsScenerySelected(false);

    // 2. Shape Drag Start
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

    // 3. Normal Stroke Drawing
    isDrawingRef.current = true;
    currentPointsRef.current = [pt];
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pt = getCanvasCoords(e);

    if (socket && isOpponentConnected) {
      socket.emit('paint:cursor', {
        sessionCode,
        cursorPosition: pt,
        playerName: user?.displayName || 'Artist',
      });
    }

    // Sticker Dragging
    if (isDraggingSticker && selectedStickerId) {
      const updatedX = Math.round(pt.x - stickerDragOffset.x);
      const updatedY = Math.round(pt.y - stickerDragOffset.y);

      setPages((prev) => {
        const next = [...prev];
        const page = next[activePageIndex];
        if (page) {
          page.stickers = page.stickers.map((s) =>
            s.id === selectedStickerId ? { ...s, x: updatedX, y: updatedY } : s
          );
        }
        return next;
      });
      return;
    }

    // Shape Preview
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

    // Stroke Drawing
    if (!isDrawingRef.current) return;
    currentPointsRef.current.push(pt);

    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tempStroke: Stroke = {
      id: 'current',
      tool: activeBaseTool,
      subType: activeBaseTool === 'pen' ? selectedPenType : selectedBrushType,
      color: brushColor,
      size: brushSize,
      opacity: brushOpacity,
      points: currentPointsRef.current,
      author: user?.displayName || 'Me',
    };

    redrawDrawingLayer();
    drawStrokeOnCanvas(ctx, tempStroke);
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawCanvasRef.current?.releasePointerCapture(e.pointerId);

    // Stop Sticker Dragging & Paste cleanly
    if (isDraggingSticker) {
      setIsDraggingSticker(false);
      const st = currentPage.stickers.find((s) => s.id === selectedStickerId);
      if (st && socket && isOpponentConnected) {
        socket.emit('paint:action', {
          sessionCode,
          actionType: 'update_sticker',
          payload: { sticker: st },
        });
      }
      return;
    }

    // Finalize Shape
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

    // Finalize Stroke
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentPointsRef.current.length >= 2) {
      const newStroke: Stroke = {
        id: Math.random().toString(),
        tool: activeBaseTool,
        subType: activeBaseTool === 'pen' ? selectedPenType : selectedBrushType,
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
  // CANVA-STYLE STICKER INTERACTIVE TRANSFORMS
  // -------------------------------------------------------------
  const activeSelectedSticker = currentPage.stickers.find((s) => s.id === selectedStickerId);

  // Wheel Zoom on Sticker directly
  const handleStickerWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (!selectedStickerId) return;
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    handleZoomSticker(delta);
  };

  const handleZoomSticker = (deltaRatio: number) => {
    if (!selectedStickerId) return;
    setPages((prev) => {
      const next = [...prev];
      const page = next[activePageIndex];
      if (page) {
        page.stickers = page.stickers.map((s) => {
          if (s.id === selectedStickerId) {
            const nextW = Math.max(30, Math.min(500, Math.round((s.width || 120) * (1 + deltaRatio))));
            const nextH = Math.max(30, Math.min(500, Math.round((s.height || 120) * (1 + deltaRatio))));
            const updated = { ...s, width: nextW, height: nextH };
            if (socket && isOpponentConnected) {
              socket.emit('paint:action', { sessionCode, actionType: 'update_sticker', payload: { sticker: updated } });
            }
            return updated;
          }
          return s;
        });
      }
      return next;
    });
  };

  const handleRotateSticker = () => {
    if (!selectedStickerId) return;
    setPages((prev) => {
      const next = [...prev];
      const page = next[activePageIndex];
      if (page) {
        page.stickers = page.stickers.map((s) => {
          if (s.id === selectedStickerId) {
            const nextRot = (((s.rotation || 0) + 45) % 360);
            const updated = { ...s, rotation: nextRot };
            if (socket && isOpponentConnected) {
              socket.emit('paint:action', { sessionCode, actionType: 'update_sticker', payload: { sticker: updated } });
            }
            return updated;
          }
          return s;
        });
      }
      return next;
    });
  };

  const handleDuplicateSticker = () => {
    if (!activeSelectedSticker) return;
    const duplicated: StickerItem = {
      ...activeSelectedSticker,
      id: 'stk-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      x: activeSelectedSticker.x + 30,
      y: activeSelectedSticker.y + 30,
    };
    setPages((prev) => {
      const next = [...prev];
      const page = next[activePageIndex];
      if (page) {
        page.stickers = [...page.stickers, duplicated];
      }
      return next;
    });
    setSelectedStickerId(duplicated.id);
    if (socket && isOpponentConnected) {
      socket.emit('paint:action', { sessionCode, actionType: 'add_sticker', payload: { sticker: duplicated } });
    }
  };

  const handleDeleteSelectedSticker = () => {
    if (!selectedStickerId) return;
    const idToDelete = selectedStickerId;
    setPages((prev) => {
      const next = [...prev];
      const page = next[activePageIndex];
      if (page) {
        page.stickers = page.stickers.filter((s) => s.id !== idToDelete);
      }
      return next;
    });
    setSelectedStickerId(null);
    if (socket && isOpponentConnected) {
      socket.emit('paint:action', { sessionCode, actionType: 'delete_sticker', payload: { id: idToDelete } });
    }
    toast.success('Sticker removed');
  };

  // Sticker Handle Pointer Down
  const handleStickerResizeHandleDown = (e: React.PointerEvent<HTMLDivElement>, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (!activeSelectedSticker) return;
    setActiveResizeHandle(handle);
    setResizeInitialData({
      clientX: e.clientX,
      clientY: e.clientY,
      w: activeSelectedSticker.width || 120,
      h: activeSelectedSticker.height || 120,
      x: activeSelectedSticker.x,
      y: activeSelectedSticker.y,
    });
  };

  // Sticker Handle Pointer Move
  const handleStickerResizeHandleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeResizeHandle || !resizeInitialData || !selectedStickerId) return;
    e.stopPropagation();
    e.preventDefault();

    const dx = e.clientX - resizeInitialData.clientX;
    const dy = e.clientY - resizeInitialData.clientY;

    let newW = resizeInitialData.w;
    let newH = resizeInitialData.h;

    if (activeResizeHandle.includes('e')) newW = resizeInitialData.w + dx * 2;
    if (activeResizeHandle.includes('w')) newW = resizeInitialData.w - dx * 2;
    if (activeResizeHandle.includes('s')) newH = resizeInitialData.h + dy * 2;
    if (activeResizeHandle.includes('n')) newH = resizeInitialData.h - dy * 2;

    // Corner handles scale proportionally
    if (activeResizeHandle === 'se' || activeResizeHandle === 'nw') {
      const delta = (dx + dy) / 2;
      newW = activeResizeHandle === 'se' ? resizeInitialData.w + delta * 2 : resizeInitialData.w - delta * 2;
      newH = newW;
    } else if (activeResizeHandle === 'ne' || activeResizeHandle === 'sw') {
      const delta = (dx - dy) / 2;
      newW = activeResizeHandle === 'ne' ? resizeInitialData.w + delta * 2 : resizeInitialData.w - delta * 2;
      newH = newW;
    }

    newW = Math.max(30, Math.min(500, Math.round(newW)));
    newH = Math.max(30, Math.min(500, Math.round(newH)));

    setPages((prev) => {
      const next = [...prev];
      const page = next[activePageIndex];
      if (page) {
        page.stickers = page.stickers.map((s) => (s.id === selectedStickerId ? { ...s, width: newW, height: newH } : s));
      }
      return next;
    });
  };

  const handleStickerResizeHandleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setActiveResizeHandle(null);
    setResizeInitialData(null);
    const st = currentPage.stickers.find((s) => s.id === selectedStickerId);
    if (st && socket && isOpponentConnected) {
      socket.emit('paint:action', { sessionCode, actionType: 'update_sticker', payload: { sticker: st } });
    }
  };

  // -------------------------------------------------------------
  // CANVA-STYLE PHOTO FRAME INTERACTIVE TRANSFORMS
  // -------------------------------------------------------------
  const handleFrameWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    handleAdjustFrame({ scale: Math.max(0.4, Math.min(1.8, (currentPage.frameAdjust?.scale ?? 1) + delta)) });
  };

  const handleFrameResizeHandleDown = (e: React.PointerEvent<HTMLDivElement>, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveFrameHandle(handle);
    setFrameResizeInitialData({
      clientX: e.clientX,
      clientY: e.clientY,
      scale: currentPage.frameAdjust?.scale ?? 1,
      scaleX: currentPage.frameAdjust?.scaleX ?? 1,
      scaleY: currentPage.frameAdjust?.scaleY ?? 1,
    });
  };

  const handleFrameResizeHandleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeFrameHandle || !frameResizeInitialData) return;
    e.stopPropagation();
    e.preventDefault();

    const dx = e.clientX - frameResizeInitialData.clientX;
    const dy = e.clientY - frameResizeInitialData.clientY;

    if (activeFrameHandle === 'e' || activeFrameHandle === 'w') {
      const mult = activeFrameHandle === 'e' ? dx : -dx;
      const nextScaleX = Math.max(0.4, Math.min(1.8, frameResizeInitialData.scaleX + mult * 0.005));
      handleAdjustFrame({ scaleX: nextScaleX });
    } else if (activeFrameHandle === 'n' || activeFrameHandle === 's') {
      const mult = activeFrameHandle === 's' ? dy : -dy;
      const nextScaleY = Math.max(0.4, Math.min(1.8, frameResizeInitialData.scaleY + mult * 0.005));
      handleAdjustFrame({ scaleY: nextScaleY });
    } else {
      // Corner scale
      const mult = (dx + dy) / 2;
      const nextScale = Math.max(0.4, Math.min(1.8, frameResizeInitialData.scale + mult * 0.004));
      handleAdjustFrame({ scale: nextScale });
    }
  };

  const handleFrameResizeHandleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setActiveFrameHandle(null);
    setFrameResizeInitialData(null);
  };

  // -------------------------------------------------------------
  // CANVA-STYLE SCENERY INTERACTIVE TRANSFORMS
  // -------------------------------------------------------------
  const handleSceneryWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    handleAdjustScenery({ scale: Math.max(0.4, Math.min(2.5, (currentPage.sceneryAdjust?.scale ?? 1) + delta)) });
  };

  const handleSceneryResizeHandleDown = (e: React.PointerEvent<HTMLDivElement>, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveSceneryHandle(handle);
    setSceneryResizeInitialData({
      clientX: e.clientX,
      clientY: e.clientY,
      scale: currentPage.sceneryAdjust?.scale ?? 1,
    });
  };

  const handleSceneryResizeHandleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeSceneryHandle || !sceneryResizeInitialData) return;
    e.stopPropagation();
    e.preventDefault();
    const dx = e.clientX - sceneryResizeInitialData.clientX;
    const dy = e.clientY - sceneryResizeInitialData.clientY;
    const mult = (dx + dy) / 2;
    const nextScale = Math.max(0.4, Math.min(2.5, sceneryResizeInitialData.scale + mult * 0.005));
    handleAdjustScenery({ scale: nextScale });
  };

  const handleSceneryResizeHandleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setActiveSceneryHandle(null);
    setSceneryResizeInitialData(null);
  };

  const handleAdjustScenery = (partial: Partial<SceneryAdjust>) => {
    setPages((prev) => {
      const next = [...prev];
      const page = next[activePageIndex];
      if (page) {
        page.sceneryAdjust = {
          scale: page.sceneryAdjust?.scale ?? 1,
          offsetX: page.sceneryAdjust?.offsetX ?? 0,
          offsetY: page.sceneryAdjust?.offsetY ?? 0,
          opacity: page.sceneryAdjust?.opacity ?? 1,
          rotation: page.sceneryAdjust?.rotation ?? 0,
          ...partial,
        };
      }
      return next;
    });

    if (socket && isOpponentConnected) {
      socket.emit('paint:action', {
        sessionCode,
        actionType: 'adjust_scenery',
        payload: { sceneryAdjust: partial },
      });
    }
  };

  const handleAdjustFrame = (partial: Partial<FrameAdjust>) => {
    setPages((prev) => {
      const next = [...prev];
      const page = next[activePageIndex];
      if (page) {
        page.frameAdjust = {
          scale: page.frameAdjust?.scale ?? 1,
          scaleX: page.frameAdjust?.scaleX ?? 1,
          scaleY: page.frameAdjust?.scaleY ?? 1,
          offsetX: page.frameAdjust?.offsetX ?? 0,
          offsetY: page.frameAdjust?.offsetY ?? 0,
          ...partial,
        };
      }
      return next;
    });

    if (socket && isOpponentConnected) {
      socket.emit('paint:action', {
        sessionCode,
        actionType: 'adjust_frame',
        payload: { frameAdjust: partial },
      });
    }
  };

  const handleSelectSceneryPreset = (preset: string) => {
    setPages((prev) => {
      const next = [...prev];
      const page = next[activePageIndex];
      if (page) page.sceneryPreset = preset;
      return next;
    });
    setShowSceneryModal(false);
    setIsScenerySelected(preset !== 'blank');

    if (socket && isOpponentConnected) {
      socket.emit('paint:action', {
        sessionCode,
        actionType: 'set_scenery',
        payload: { sceneryPreset: preset },
      });
    }
  };

  const handleSelectFrame = (frameKey: string) => {
    setPages((prev) => {
      const next = [...prev];
      const page = next[activePageIndex];
      if (page) page.frame = frameKey;
      return next;
    });
    setShowFrameModal(false);
    setIsFrameSelected(frameKey !== 'none');

    if (socket && isOpponentConnected) {
      socket.emit('paint:action', {
        sessionCode,
        actionType: 'set_frame',
        payload: { frame: frameKey },
      });
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
    if (confirm('Clear drawings and stickers on this page?')) {
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
      setSelectedStickerId(null);

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

  // Multi-Page
  const handleAddPage = () => {
    const newPageNum = pages.length + 1;
    const newPage: CanvasPage = {
      id: `page-${Date.now()}`,
      title: `Page ${newPageNum}`,
      pageColor: '#ffffff',
      sceneryPreset: 'blank',
      sceneryAdjust: { scale: 1, scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, opacity: 1, rotation: 0 },
      customSceneryUrl: null,
      frame: 'none',
      frameAdjust: { scale: 1, scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 },
      canvasRatio: typeof window !== 'undefined' && window.innerWidth < 768 ? '3:4' : '16:9',
      strokes: [],
      shapes: [],
      stickers: [],
      history: [{ strokes: [], shapes: [], stickers: [] }],
      historyStep: 0,
    };

    setPages((prev) => [...prev, newPage]);
    setActivePageIndex(pages.length);
    setSelectedStickerId(null);

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
      setSelectedStickerId(null);
      if (socket && isOpponentConnected) {
        socket.emit('paint:action', {
          sessionCode,
          actionType: 'switch_page',
          payload: { pageIndex: index },
        });
      }
    }
  };

  // High-Res Artwork Export
  const handleDownloadArtwork = async () => {
    const bgCanvas = bgCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!bgCanvas || !drawCanvas) return;

    const exportCanvas = document.createElement('canvas');
    const width = bgCanvas.width;
    const height = bgCanvas.height;
    exportCanvas.width = width;
    exportCanvas.height = height;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(bgCanvas, 0, 0);
    ctx.drawImage(drawCanvas, 0, 0);

    if (currentPage.frame && currentPage.frame !== 'none') {
      const frameDef = PHOTO_FRAMES.find((f) => f.key === currentPage.frame);
      if (frameDef && frameDef.src) {
        await new Promise<void>((resolve) => {
          const frameImg = new Image();
          frameImg.crossOrigin = 'anonymous';
          frameImg.onload = () => {
            ctx.save();
            const fAdj = currentPage.frameAdjust || { scale: 1, offsetX: 0, offsetY: 0 };
            const scaleX = (fAdj.scaleX ?? 1) * (fAdj.scale ?? 1);
            const scaleY = (fAdj.scaleY ?? 1) * (fAdj.scale ?? 1);
            const dw = width * scaleX;
            const dh = height * scaleY;
            ctx.translate(width / 2 + (fAdj.offsetX ?? 0), height / 2 + (fAdj.offsetY ?? 0));
            ctx.drawImage(frameImg, -dw / 2, -dh / 2, dw, dh);
            ctx.restore();
            resolve();
          };
          frameImg.onerror = () => resolve();
          frameImg.src = frameDef.src;
        });
      }
    }

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Sunset_Studio_Artwork_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    toast.success('Artwork downloaded successfully!');
  };

  // Chat & Invites
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

  const filteredStickers = STICKER_LIST.filter((st) => {
    const matchesSearch = st.label.toLowerCase().includes(stickerSearch.toLowerCase());
    const matchesCat = stickerCategoryFilter === 'all' || st.category === stickerCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const activeFrameDef = PHOTO_FRAMES.find((f) => f.key === currentPage.frame);
  const activePenDef = PEN_TYPES.find((p) => p.key === selectedPenType) || PEN_TYPES[0];
  const activeBrushDef = BRUSH_TYPES.find((b) => b.key === selectedBrushType) || BRUSH_TYPES[0];

  return (
    <div className="relative flex flex-col h-[100dvh] w-full bg-slate-950 text-slate-100 overflow-hidden select-none font-sans">
      {/* 1. Header Bar */}
      <header className="flex-none flex items-center justify-between px-3 sm:px-6 py-2 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 z-30">
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
        <div className="hidden md:flex items-center gap-2 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-700/50">
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

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Eraser Toggle */}
          <button
            onClick={() => {
              if (activeBaseTool === 'eraser') {
                setActiveBaseTool('pen');
                setActiveTab('pen');
              } else {
                setActiveBaseTool('eraser');
              }
            }}
            className={`p-2 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center gap-1 border ${
              activeBaseTool === 'eraser'
                ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30'
                : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Clean Non-Destructive Eraser"
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden sm:inline">Eraser</span>
          </button>

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

          {/* Chat */}
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

          {/* Invite */}
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

          {/* Download */}
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
      <div className="flex md:hidden flex-none items-center justify-between px-3 py-1 bg-slate-900 border-b border-slate-800/60 text-xs">
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

      {/* 2. Main Studio Canvas Work Area with Canva-Style Interactive Handles */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center p-2 sm:p-4">
        <div
          className={`relative flex items-center justify-center transition-all duration-300 ${
            currentPage.canvasRatio === '1:1'
              ? 'aspect-square h-full max-h-[75vh]'
              : currentPage.canvasRatio === '3:4'
              ? 'aspect-[3/4] h-full max-h-[75vh]'
              : currentPage.canvasRatio === '16:9'
              ? 'aspect-[16/9] w-full max-w-5xl'
              : 'w-full h-full max-w-5xl'
          } rounded-xl border border-slate-800 shadow-2xl overflow-hidden`}
        >
          {/* Inner Canvas Mount */}
          <div
            ref={containerRef}
            className="relative w-full h-full overflow-hidden"
            style={{ touchAction: 'none' }}
          >
            {/* Layer 1: Background Canvas (Page tint & scenery outline) */}
            <canvas
              ref={bgCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none block"
            />

            {/* Layer 2: Transparent Drawing Canvas (Strokes, Shapes & Stickers) */}
            <canvas
              ref={drawCanvasRef}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerUp}
              className="absolute inset-0 w-full h-full cursor-crosshair block z-10"
              style={{ touchAction: 'none' }}
            />

            {/* Layer 3: Authentic Photo Frame with Interactive Handles */}
            {activeFrameDef && activeFrameDef.src && (
              <div
                className="absolute pointer-events-none select-none"
                style={{
                  left: `calc(50% + ${currentPage.frameAdjust?.offsetX || 0}px)`,
                  top: `calc(50% + ${currentPage.frameAdjust?.offsetY || 0}px)`,
                  width: `${(currentPage.frameAdjust?.scaleX ?? 1) * (currentPage.frameAdjust?.scale ?? 1) * 100}%`,
                  height: `${(currentPage.frameAdjust?.scaleY ?? 1) * (currentPage.frameAdjust?.scale ?? 1) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 18,
                }}
              >
                <img
                  src={activeFrameDef.src}
                  alt="Photo Frame"
                  className="w-full h-full object-fill select-none pointer-events-none"
                />

                {/* Canva-style Frame Interactive Resize Border & Handles (When Frame Tab Active or Frame Selected) */}
                {(activeTab === 'frame' || isFrameSelected) && (
                  <div
                    className="absolute inset-0 border-2 border-purple-400 border-dashed rounded-lg pointer-events-auto"
                    onWheel={handleFrameWheel}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setIsDraggingFrame(true);
                      const pt = getCanvasCoords(e);
                      setFrameDragOffset({ x: pt.x - (currentPage.frameAdjust?.offsetX || 0), y: pt.y - (currentPage.frameAdjust?.offsetY || 0) });
                    }}
                    onPointerMove={(e) => {
                      if (!isDraggingFrame) return;
                      e.stopPropagation();
                      const pt = getCanvasCoords(e);
                      handleAdjustFrame({ offsetX: Math.round(pt.x - frameDragOffset.x), offsetY: Math.round(pt.y - frameDragOffset.y) });
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      setIsDraggingFrame(false);
                    }}
                  >
                    {/* Top Edge Handle */}
                    <div
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-3 bg-purple-400 rounded-full border-2 border-slate-900 cursor-ns-resize"
                      onPointerDown={(e) => handleFrameResizeHandleDown(e, 'n')}
                      onPointerMove={handleFrameResizeHandleMove}
                      onPointerUp={handleFrameResizeHandleUp}
                    />
                    {/* Bottom Edge Handle */}
                    <div
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-3 bg-purple-400 rounded-full border-2 border-slate-900 cursor-ns-resize"
                      onPointerDown={(e) => handleFrameResizeHandleDown(e, 's')}
                      onPointerMove={handleFrameResizeHandleMove}
                      onPointerUp={handleFrameResizeHandleUp}
                    />
                    {/* Left Edge Handle */}
                    <div
                      className="absolute top-1/2 -left-2 -translate-y-1/2 w-3 h-6 bg-purple-400 rounded-full border-2 border-slate-900 cursor-ew-resize"
                      onPointerDown={(e) => handleFrameResizeHandleDown(e, 'w')}
                      onPointerMove={handleFrameResizeHandleMove}
                      onPointerUp={handleFrameResizeHandleUp}
                    />
                    {/* Right Edge Handle */}
                    <div
                      className="absolute top-1/2 -right-2 -translate-y-1/2 w-3 h-6 bg-purple-400 rounded-full border-2 border-slate-900 cursor-ew-resize"
                      onPointerDown={(e) => handleFrameResizeHandleDown(e, 'e')}
                      onPointerMove={handleFrameResizeHandleMove}
                      onPointerUp={handleFrameResizeHandleUp}
                    />

                    {/* Corner Handles */}
                    <div
                      className="absolute -top-2 -left-2 w-4 h-4 bg-purple-400 rounded-full border-2 border-slate-900 cursor-nwse-resize"
                      onPointerDown={(e) => handleFrameResizeHandleDown(e, 'nw')}
                      onPointerMove={handleFrameResizeHandleMove}
                      onPointerUp={handleFrameResizeHandleUp}
                    />
                    <div
                      className="absolute -top-2 -right-2 w-4 h-4 bg-purple-400 rounded-full border-2 border-slate-900 cursor-nesw-resize"
                      onPointerDown={(e) => handleFrameResizeHandleDown(e, 'ne')}
                      onPointerMove={handleFrameResizeHandleMove}
                      onPointerUp={handleFrameResizeHandleUp}
                    />
                    <div
                      className="absolute -bottom-2 -left-2 w-4 h-4 bg-purple-400 rounded-full border-2 border-slate-900 cursor-nesw-resize"
                      onPointerDown={(e) => handleFrameResizeHandleDown(e, 'sw')}
                      onPointerMove={handleFrameResizeHandleMove}
                      onPointerUp={handleFrameResizeHandleUp}
                    />
                    <div
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-purple-400 rounded-full border-2 border-slate-900 cursor-nwse-resize"
                      onPointerDown={(e) => handleFrameResizeHandleDown(e, 'se')}
                      onPointerMove={handleFrameResizeHandleMove}
                      onPointerUp={handleFrameResizeHandleUp}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Canva-Style Active Sticker Selection Box with Handles */}
            {activeSelectedSticker && (
              <div
                className="absolute pointer-events-auto border-2 border-amber-400 border-dashed rounded-lg"
                style={{
                  left: `${activeSelectedSticker.x}px`,
                  top: `${activeSelectedSticker.y}px`,
                  width: `${activeSelectedSticker.width || 120}px`,
                  height: `${activeSelectedSticker.height || 120}px`,
                  transform: `translate(-50%, -50%) rotate(${activeSelectedSticker.rotation || 0}deg)`,
                  zIndex: 25,
                  cursor: isDraggingSticker ? 'grabbing' : 'grab',
                }}
                onWheel={handleStickerWheel}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  setIsDraggingSticker(true);
                  const pt = getCanvasCoords(e);
                  setStickerDragOffset({ x: pt.x - activeSelectedSticker.x, y: pt.y - activeSelectedSticker.y });
                }}
                onPointerMove={(e) => {
                  if (!isDraggingSticker) return;
                  e.stopPropagation();
                  const pt = getCanvasCoords(e);
                  const newX = Math.round(pt.x - stickerDragOffset.x);
                  const newY = Math.round(pt.y - stickerDragOffset.y);
                  setPages((prev) => {
                    const next = [...prev];
                    const page = next[activePageIndex];
                    if (page) {
                      page.stickers = page.stickers.map((s) => (s.id === selectedStickerId ? { ...s, x: newX, y: newY } : s));
                    }
                    return next;
                  });
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                  setIsDraggingSticker(false);
                  const st = currentPage.stickers.find((s) => s.id === selectedStickerId);
                  if (st && socket && isOpponentConnected) {
                    socket.emit('paint:action', { sessionCode, actionType: 'update_sticker', payload: { sticker: st } });
                  }
                }}
              >
                {/* Floating Action Bar */}
                <div
                  className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 border border-amber-500/70 rounded-full px-2 py-1 shadow-2xl backdrop-blur-md pointer-events-auto"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleZoomSticker(-0.15)}
                    className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center justify-center text-xs"
                    title="Zoom Out (Smaller)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleZoomSticker(0.15)}
                    className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center justify-center text-xs"
                    title="Zoom In (Bigger)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRotateSticker}
                    className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs"
                    title="Rotate 45 deg"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDuplicateSticker}
                    className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedSticker}
                    className="w-6 h-6 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 flex items-center justify-center text-xs"
                    title="Delete Sticker"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStickerId(null)}
                    className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
                    title="Deselect"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 4 Corner Resize Handles */}
                <div
                  className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-900 cursor-nwse-resize shadow-md"
                  onPointerDown={(e) => handleStickerResizeHandleDown(e, 'nw')}
                  onPointerMove={handleStickerResizeHandleMove}
                  onPointerUp={handleStickerResizeHandleUp}
                />
                <div
                  className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-900 cursor-nesw-resize shadow-md"
                  onPointerDown={(e) => handleStickerResizeHandleDown(e, 'ne')}
                  onPointerMove={handleStickerResizeHandleMove}
                  onPointerUp={handleStickerResizeHandleUp}
                />
                <div
                  className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-900 cursor-nesw-resize shadow-md"
                  onPointerDown={(e) => handleStickerResizeHandleDown(e, 'sw')}
                  onPointerMove={handleStickerResizeHandleMove}
                  onPointerUp={handleStickerResizeHandleUp}
                />
                <div
                  className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-900 cursor-nwse-resize shadow-md"
                  onPointerDown={(e) => handleStickerResizeHandleDown(e, 'se')}
                  onPointerMove={handleStickerResizeHandleMove}
                  onPointerUp={handleStickerResizeHandleUp}
                />

                {/* 4 Edge Handles */}
                <div
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-2 rounded bg-amber-400 border border-slate-900 cursor-ns-resize"
                  onPointerDown={(e) => handleStickerResizeHandleDown(e, 'n')}
                  onPointerMove={handleStickerResizeHandleMove}
                  onPointerUp={handleStickerResizeHandleUp}
                />
                <div
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-2 rounded bg-amber-400 border border-slate-900 cursor-ns-resize"
                  onPointerDown={(e) => handleStickerResizeHandleDown(e, 's')}
                  onPointerMove={handleStickerResizeHandleMove}
                  onPointerUp={handleStickerResizeHandleUp}
                />
                <div
                  className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2 h-4 rounded bg-amber-400 border border-slate-900 cursor-ew-resize"
                  onPointerDown={(e) => handleStickerResizeHandleDown(e, 'w')}
                  onPointerMove={handleStickerResizeHandleMove}
                  onPointerUp={handleStickerResizeHandleUp}
                />
                <div
                  className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 h-4 rounded bg-amber-400 border border-slate-900 cursor-ew-resize"
                  onPointerDown={(e) => handleStickerResizeHandleDown(e, 'e')}
                  onPointerMove={handleStickerResizeHandleMove}
                  onPointerUp={handleStickerResizeHandleUp}
                />
              </div>
            )}

            {/* On-Canvas Scenery Quick Adjustment Floating Controls */}
            {currentPage.sceneryPreset && currentPage.sceneryPreset !== 'blank' && (
              <div
                className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-slate-900/95 border border-amber-500/50 backdrop-blur-md px-3 py-1 rounded-full shadow-2xl pointer-events-auto"
                onWheel={handleSceneryWheel}
              >
                <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider pl-0.5">Scenery:</span>
                <button
                  type="button"
                  onClick={() => handleAdjustScenery({ scale: Math.max(0.4, (currentPage.sceneryAdjust?.scale ?? 1) - 0.1) })}
                  className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center justify-center border border-slate-700"
                  title="Zoom Out Scenery"
                >
                  -
                </button>
                <span className="text-[11px] font-mono font-black text-amber-300 px-1 min-w-[34px] text-center">
                  {Math.round((currentPage.sceneryAdjust?.scale ?? 1) * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => handleAdjustScenery({ scale: Math.min(2.5, (currentPage.sceneryAdjust?.scale ?? 1) + 0.1) })}
                  className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center justify-center border border-slate-700"
                  title="Zoom In Scenery"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustScenery({ rotation: (((currentPage.sceneryAdjust?.rotation ?? 0) + 90) % 360) })}
                  className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 border border-slate-700 ml-1"
                  title="Rotate Scenery"
                >
                  Rotate
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustScenery({ scale: 1, offsetX: 0, offsetY: 0, opacity: 1, rotation: 0 })}
                  className="px-2 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-bold text-rose-300 border border-rose-500/30 ml-0.5"
                  title="Reset Scenery"
                >
                  Reset
                </button>
              </div>
            )}

            {/* On-Canvas Frame Quick Adjustment Floating Controls */}
            {currentPage.frame && currentPage.frame !== 'none' && (
              <div
                className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-slate-900/95 border border-purple-500/50 backdrop-blur-md px-3 py-1 rounded-full shadow-2xl pointer-events-auto"
                onWheel={handleFrameWheel}
              >
                <span className="text-[10px] font-black text-purple-300 uppercase tracking-wider pl-0.5">Frame:</span>
                <button
                  type="button"
                  onClick={() => handleAdjustFrame({ scale: Math.max(0.4, (currentPage.frameAdjust?.scale ?? 1) - 0.05) })}
                  className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center justify-center border border-slate-700"
                  title="Zoom Out Frame"
                >
                  -
                </button>
                <span className="text-[11px] font-mono font-black text-purple-300 px-1 min-w-[34px] text-center">
                  {Math.round((currentPage.frameAdjust?.scale ?? 1) * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => handleAdjustFrame({ scale: Math.min(1.8, (currentPage.frameAdjust?.scale ?? 1) + 0.05) })}
                  className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center justify-center border border-slate-700"
                  title="Zoom In Frame"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustFrame({ scale: 1, scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 })}
                  className="px-2 py-0.5 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-[10px] font-bold text-purple-300 border border-purple-500/30 ml-1"
                  title="Fit Frame to Canvas"
                >
                  Fit
                </button>
              </div>
            )}

            {/* Remote Friend Cursor */}
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

            {/* 2-Second Toast */}
            <AnimatePresence>
              {floatingToast && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-sm sm:max-w-md w-auto px-4 py-2 rounded-full bg-slate-900/95 border border-amber-500/40 backdrop-blur-md shadow-2xl flex items-center gap-2 pointer-events-none"
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

      {/* 3. Floating Bottom Tools Dock (Clean & Popup-Triggered) */}
      <footer className="flex-none bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-2 sm:px-6 py-2 z-30">
        <div className="max-w-5xl mx-auto flex flex-col gap-2">
          {/* Sub-Panel: Selected Tool Actions & Sliders */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
            {/* 1. PEN: Popup Trigger with Active Pen Visual & Sliders */}
            {activeTab === 'pen' && (
              <div className="flex items-center gap-3 w-full justify-between sm:justify-start">
                <button
                  onClick={() => setShowPenModal(true)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-amber-500/50 shadow-md flex-none active:scale-95 transition-all"
                >
                  <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center bg-white p-0.5">
                    <img
                      src={`/pens/pen-${activePenDef.key}.png`}
                      alt={activePenDef.label}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] text-amber-400 font-bold uppercase block leading-none">Pen Style:</span>
                    <span className="text-xs font-black text-white">{activePenDef.label}</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold ml-1">
                    Change
                  </span>
                </button>

                {/* Size Slider */}
                <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-1 rounded-xl flex-none border border-slate-700/60">
                  <span className="text-[11px] font-bold text-slate-400">Size</span>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-20 accent-amber-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-amber-300 w-5">{brushSize}</span>
                </div>

                {/* Opacity Slider */}
                <div className="hidden sm:flex items-center gap-2 bg-slate-800/60 px-3 py-1 rounded-xl flex-none border border-slate-700/60">
                  <span className="text-[11px] font-bold text-slate-400">Opacity</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={brushOpacity}
                    onChange={(e) => setBrushOpacity(Number(e.target.value))}
                    className="w-16 accent-amber-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-amber-300 w-7">{brushOpacity}%</span>
                </div>
              </div>
            )}

            {/* 2. BRUSHES: Popup Trigger with Active Brush Visual & Sliders */}
            {activeTab === 'brush' && (
              <div className="flex items-center gap-3 w-full justify-between sm:justify-start">
                <button
                  onClick={() => setShowBrushModal(true)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-amber-500/50 shadow-md flex-none active:scale-95 transition-all"
                >
                  <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center bg-white p-0.5">
                    <img
                      src={`/brushes/brush-${activeBrushDef.key}.png`}
                      alt={activeBrushDef.label}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] text-amber-400 font-bold uppercase block leading-none">Brush Style:</span>
                    <span className="text-xs font-black text-white">{activeBrushDef.label}</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold ml-1">
                    Change
                  </span>
                </button>

                {/* Size Slider */}
                <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-1 rounded-xl flex-none border border-slate-700/60">
                  <span className="text-[11px] font-bold text-slate-400">Size</span>
                  <input
                    type="range"
                    min="3"
                    max="60"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-20 accent-amber-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-amber-300 w-5">{brushSize}</span>
                </div>

                {/* Opacity Slider */}
                <div className="hidden sm:flex items-center gap-2 bg-slate-800/60 px-3 py-1 rounded-xl flex-none border border-slate-700/60">
                  <span className="text-[11px] font-bold text-slate-400">Opacity</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={brushOpacity}
                    onChange={(e) => setBrushOpacity(Number(e.target.value))}
                    className="w-16 accent-amber-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-amber-300 w-7">{brushOpacity}%</span>
                </div>
              </div>
            )}

            {/* 3. COLORS: Default Black (#000000) & Palettes */}
            {activeTab === 'color' && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 w-full">
                {BRUSH_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setBrushColor(c);
                      if (activeBaseTool === 'eraser') setActiveBaseTool('pen');
                    }}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-none transition-transform active:scale-90 border-2 ${
                      brushColor === c ? 'border-amber-400 scale-110 shadow-lg' : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <div className="flex items-center gap-1.5 ml-2 bg-slate-800/80 px-2 py-1 rounded-xl flex-none border border-slate-700">
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => {
                      setBrushColor(e.target.value);
                      if (activeBaseTool === 'eraser') setActiveBaseTool('pen');
                    }}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono uppercase">{brushColor}</span>
                </div>
              </div>
            )}

            {/* 4. PAGES: Base Tint & Ratio */}
            {activeTab === 'page' && (
              <div className="flex items-center gap-3 overflow-x-auto py-1 w-full justify-between sm:justify-start">
                <div className="flex items-center gap-1.5 flex-none">
                  <span className="text-[11px] font-bold text-slate-400 flex-none">Base Tint:</span>
                  {PAGE_COLORS.map((pc) => (
                    <button
                      key={pc.color}
                      onClick={() => handleSelectPageColor(pc.color)}
                      title={pc.label}
                      className={`w-6 h-6 rounded-full flex-none border-2 transition-transform ${
                        currentPage.pageColor === pc.color ? 'border-amber-400 scale-110 shadow-md' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: pc.color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={currentPage.pageColor}
                    onChange={(e) => handleSelectPageColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 flex-none ml-1"
                    title="Custom tint"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl flex-none border border-slate-700/60 ml-2">
                  <span className="text-[11px] font-bold text-slate-400 px-1">Ratio:</span>
                  {[
                    { key: '16:9', label: '16:9 Desktop' },
                    { key: '3:4', label: '3:4 Mobile' },
                    { key: '1:1', label: '1:1 Square' },
                    { key: 'fit', label: 'Auto Fit' },
                  ].map((sz) => (
                    <button
                      key={sz.key}
                      onClick={() => handleSelectCanvasRatio(sz.key as CanvasRatio)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                        currentPage.canvasRatio === sz.key
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 5. SCENERY */}
            {activeTab === 'scenery' && (
              <div className="flex items-center gap-3 overflow-x-auto py-1 w-full">
                <button
                  onClick={() => setShowSceneryModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white text-xs font-black shadow-md flex-none active:scale-95"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Choose Scenery ({SCENERY_PRESETS.length - 1} New)</span>
                </button>
                {currentPage.sceneryPreset !== 'blank' && (
                  <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-xl flex-none border border-slate-700">
                    <span className="text-xs font-bold text-amber-300">
                      {SCENERY_PRESETS.find((s) => s.key === currentPage.sceneryPreset)?.label || 'Scenery Active'}
                    </span>
                    <button
                      onClick={() => handleSelectSceneryPreset('blank')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-bold ml-1"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 6. SHAPES */}
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
                          ? 'bg-amber-500 text-slate-950 font-black'
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

            {/* 7. STICKERS */}
            {activeTab === 'sticker' && (
              <div className="flex items-center gap-3 overflow-x-auto py-1 w-full">
                <button
                  onClick={() => setShowStickerModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white text-xs font-black shadow-lg flex-none active:scale-95 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Choose Sticker (46 Available in Popup)</span>
                </button>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Drag handles to resize or zoom on the sticker directly!
                </span>
              </div>
            )}

            {/* 8. PHOTO FRAMES */}
            {activeTab === 'frame' && (
              <div className="flex items-center gap-3 overflow-x-auto py-1 w-full">
                <button
                  onClick={() => setShowFrameModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-black shadow-lg flex-none active:scale-95 transition-all"
                >
                  <Layers className="w-4 h-4" />
                  <span>Choose Photo Frame ({PHOTO_FRAMES.length - 1} New)</span>
                </button>
                {currentPage.frame !== 'none' && (
                  <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-xl flex-none border border-slate-700">
                    <span className="text-xs font-bold text-purple-300">
                      {PHOTO_FRAMES.find((f) => f.key === currentPage.frame)?.label || 'Frame Active'}
                    </span>
                    <button
                      onClick={() => handleSelectFrame('none')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-bold ml-1"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Primary Tool Categories Switcher */}
          <div className="flex items-center justify-around sm:justify-center gap-1 sm:gap-6 pt-1 border-t border-slate-800/60 overflow-x-auto no-scrollbar">
            {/* 1. Pens */}
            <button
              onClick={() => {
                setActiveTab('pen');
                setActiveBaseTool('pen');
                setShowPenModal(true);
              }}
              className={`flex flex-col items-center gap-0.5 text-[11px] font-bold transition-all px-2 py-1 rounded-xl ${
                activeTab === 'pen' && activeBaseTool === 'pen' ? 'text-amber-400 bg-slate-800/60' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Pen className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Pens</span>
            </button>

            {/* 2. Brushes */}
            <button
              onClick={() => {
                setActiveTab('brush');
                setActiveBaseTool('brush');
                setShowBrushModal(true);
              }}
              className={`flex flex-col items-center gap-0.5 text-[11px] font-bold transition-all px-2 py-1 rounded-xl ${
                activeTab === 'brush' && activeBaseTool === 'brush' ? 'text-amber-400 bg-slate-800/60' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Paintbrush className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Brushes</span>
            </button>

            {/* 3. Colors */}
            <button
              onClick={() => setActiveTab('color')}
              className={`flex flex-col items-center gap-0.5 text-[11px] font-bold transition-all px-2 py-1 rounded-xl ${
                activeTab === 'color' ? 'text-amber-400 bg-slate-800/60' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-slate-500" style={{ backgroundColor: brushColor }} />
              <span>Colors</span>
            </button>

            {/* 4. Pages */}
            <button
              onClick={() => setActiveTab('page')}
              className={`flex flex-col items-center gap-0.5 text-[11px] font-bold transition-all px-2 py-1 rounded-xl ${
                activeTab === 'page' ? 'text-amber-400 bg-slate-800/60' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Pages</span>
            </button>

            {/* 5. Scenery */}
            <button
              onClick={() => {
                setActiveTab('scenery');
                setShowSceneryModal(true);
              }}
              className={`flex flex-col items-center gap-0.5 text-[11px] font-bold transition-all px-2 py-1 rounded-xl ${
                activeTab === 'scenery' ? 'text-amber-400 bg-slate-800/60' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Scenery</span>
            </button>

            {/* 6. Shapes */}
            <button
              onClick={() => setActiveTab('shape')}
              className={`flex flex-col items-center gap-0.5 text-[11px] font-bold transition-all px-2 py-1 rounded-xl ${
                activeTab === 'shape' ? 'text-amber-400 bg-slate-800/60' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Square className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Shapes</span>
            </button>

            {/* 7. Stickers */}
            <button
              onClick={() => {
                setActiveTab('sticker');
                setShowStickerModal(true);
              }}
              className={`flex flex-col items-center gap-0.5 text-[11px] font-bold transition-all px-2 py-1 rounded-xl ${
                activeTab === 'sticker' ? 'text-amber-400 bg-slate-800/60' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Stickers</span>
            </button>

            {/* 8. Photo Frames */}
            <button
              onClick={() => {
                setActiveTab('frame');
                setShowFrameModal(true);
              }}
              className={`flex flex-col items-center gap-0.5 text-[11px] font-bold transition-all px-2 py-1 rounded-xl ${
                activeTab === 'frame' ? 'text-amber-400 bg-slate-800/60' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Frames</span>
            </button>
          </div>
        </div>
      </footer>

      {/* 4. POPUP BOX MODAL: PENS WITH REFERENCE IMAGES & PREVIEWS */}
      <AnimatePresence>
        {showPenModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
            onClick={() => setShowPenModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-none">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <Pen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-100">
                      Pen Styles Collection ({PEN_TYPES.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Select a pen style with realistic stroke rendering
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPenModal(false)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid of Pens */}
              <div className="flex-1 overflow-y-auto py-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {PEN_TYPES.map((pt) => (
                  <button
                    key={pt.key}
                    onClick={() => {
                      setSelectedPenType(pt.key);
                      setActiveBaseTool('pen');
                      setActiveTab('pen');
                      setShowPenModal(false);
                      toast.success(`Selected ${pt.label}`);
                    }}
                    className={`flex flex-col items-center justify-between p-3 rounded-2xl border transition-all text-center group ${
                      selectedPenType === pt.key && activeBaseTool === 'pen'
                        ? 'bg-amber-500/10 border-amber-400 shadow-lg scale-102'
                        : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="w-20 h-24 flex items-center justify-center p-1 bg-white rounded-xl shadow-inner overflow-hidden mb-2">
                      <img
                        src={`/pens/pen-${pt.key}.png`}
                        alt={pt.label}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <span className="text-xs font-black text-slate-200 block truncate w-full">{pt.label}</span>
                    <span className="text-[10px] text-slate-400 block truncate w-full mt-0.5">{pt.desc}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. POPUP BOX MODAL: BRUSHES WITH REFERENCE IMAGES & PREVIEWS */}
      <AnimatePresence>
        {showBrushModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
            onClick={() => setShowBrushModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-none">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <Paintbrush className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-100">
                      Brush Styles Collection ({BRUSH_TYPES.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Select an authentic artist brush style with live textured strokes
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBrushModal(false)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid of Brushes */}
              <div className="flex-1 overflow-y-auto py-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {BRUSH_TYPES.map((bt) => (
                  <button
                    key={bt.key}
                    onClick={() => {
                      setSelectedBrushType(bt.key);
                      setActiveBaseTool('brush');
                      setActiveTab('brush');
                      setShowBrushModal(false);
                      toast.success(`Selected ${bt.label}`);
                    }}
                    className={`flex flex-col items-center justify-between p-3 rounded-2xl border transition-all text-center group ${
                      selectedBrushType === bt.key && activeBaseTool === 'brush'
                        ? 'bg-amber-500/10 border-amber-400 shadow-lg scale-102'
                        : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="w-20 h-28 flex items-center justify-center p-1 bg-white rounded-xl shadow-inner overflow-hidden mb-2">
                      <img
                        src={`/brushes/brush-${bt.key}.png`}
                        alt={bt.label}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <span className="text-xs font-black text-slate-200 block truncate w-full">{bt.label}</span>
                    <span className="text-[10px] text-slate-400 block truncate w-full mt-0.5">{bt.desc}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. POPUP BOX MODAL: ALL 46 STICKERS */}
      <AnimatePresence>
        {showStickerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
            onClick={() => setShowStickerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-none">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-100">
                      Sticker Collection ({STICKER_LIST.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tap any sticker to place on canvas. Drag handles directly to zoom/resize!
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStickerModal(false)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 py-3 flex-none">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={stickerSearch}
                    onChange={(e) => setStickerSearch(e.target.value)}
                    placeholder="Search stickers (cat, dog, dino, tree, bird...)"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {['all', 'animals', 'nature', 'characters', 'objects', 'food'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setStickerCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                        stickerCategoryFilter === cat
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of 46 Compact Stickers */}
              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 py-2">
                {filteredStickers.map((st) => (
                  <button
                    key={st.key}
                    onClick={() => handleAddSticker(st.key)}
                    className="flex flex-col items-center justify-between p-2 rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/60 transition-all hover:scale-105 active:scale-95 group shadow-md"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center overflow-hidden">
                      <img
                        src={`/stickers/${st.key}.png`}
                        alt={st.label}
                        className="w-full h-full object-contain pointer-events-none group-hover:scale-110 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[10px] text-slate-300 font-bold text-center truncate w-full mt-1.5">
                      {st.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. POPUP BOX MODAL: SCENERY SELECTION */}
      <AnimatePresence>
        {showSceneryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
            onClick={() => setShowSceneryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-none">
                <div>
                  <h3 className="font-extrabold text-base text-slate-100">Scenery Outlines for Coloring</h3>
                  <p className="text-xs text-slate-400">Choose a scenery background to color together</p>
                </div>
                <button
                  onClick={() => setShowSceneryModal(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {SCENERY_PRESETS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => handleSelectSceneryPreset(s.key)}
                    className={`flex flex-col rounded-2xl overflow-hidden border transition-all text-left group ${
                      currentPage.sceneryPreset === s.key
                        ? 'border-amber-400 bg-amber-500/10 shadow-lg'
                        : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="w-full h-32 bg-slate-950 flex items-center justify-center overflow-hidden p-2">
                      {s.src ? (
                        <img
                          src={s.src}
                          alt={s.label}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <span className="text-xs text-slate-500 font-bold">Blank Pure Canvas</span>
                      )}
                    </div>
                    <div className="p-3">
                      <span className="text-xs font-bold text-slate-200 block truncate">{s.label}</span>
                      <span className="text-[11px] text-amber-400/80 font-medium">
                        {currentPage.sceneryPreset === s.key ? 'Active Preset' : 'Select'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. POPUP BOX MODAL: AUTHENTIC PHOTO FRAMES */}
      <AnimatePresence>
        {showFrameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
            onClick={() => setShowFrameModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-none">
                <div>
                  <h3 className="font-extrabold text-base text-slate-100">Authentic Photo Frames</h3>
                  <p className="text-xs text-slate-400">Select an authentic border frame. Drag edges to resize each side!</p>
                </div>
                <button
                  onClick={() => setShowFrameModal(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {PHOTO_FRAMES.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => handleSelectFrame(f.key)}
                    className={`flex flex-col rounded-2xl overflow-hidden border transition-all text-left group ${
                      currentPage.frame === f.key
                        ? 'border-purple-400 bg-purple-500/10 shadow-lg'
                        : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="w-full h-28 bg-slate-950 flex items-center justify-center overflow-hidden p-2">
                      {f.src ? (
                        <img
                          src={f.src}
                          alt={f.label}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <span className="text-xs text-slate-500 font-bold">Frameless Clean</span>
                      )}
                    </div>
                    <div className="p-3">
                      <span className="text-xs font-bold text-slate-200 block truncate">{f.label}</span>
                      <span className="text-[11px] text-purple-400/80 font-medium">
                        {currentPage.frame === f.key ? 'Active Frame' : 'Apply Frame'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 9. Chat Modal Drawer */}
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

      {/* 10. Invite Friends Modal */}
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
