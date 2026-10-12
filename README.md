# 💕 After Party

> A modern, private digital sanctuary crafted for long-distance and remote couples to stay intimately connected — watch movies synchronously, play interactive multiplayer arcade games, share real-time GPS locations with midpoint navigation, exchange secret whispers and voice notes, and receive background call alerts even when the site is closed.

---

## 🌟 Highlights & Key Features

### 💬 Intimate Real-Time Messaging
- **1-on-1 Direct & Room Chats:** Effortlessly switch between private direct conversations and shared rooms/spaces.
- **Voice Notes & Audio Recording:** Record, stream, and listen to voice memos with custom waveforms.
- **Secret Whispers:** Disappearing messages designed for private moments.
- **Rich Media & Reactions:** Send high-resolution images, emojis, and instant replies.
- **Live Presence & Receipts:** Instant typing indicators, seen ticks, and online/offline status.

### 🎬 Watch Together 2.0
- **Real-Time Video Synchronization:** Synchronous Play, Pause, Seek, and Speed adjustments for YouTube and direct video links powered by Socket.io.
- **Synchronized Video Close:** Closing a video session terminates playback seamlessly for both partners simultaneously.
- **Embedded WebRTC Video Call:** Live webcam overlays right beside the player so you can see each other's reactions in real-time.
- **Screen Sharing:** One-click screen broadcasting for streaming custom shows, browsing together, or sharing memories.

### 🎮 Couples Arcade (8+ Interactive Games & Stakes System)
- **3D Chess:** Multiplayer chess featuring 3D visuals, optional AI practice, and real-time board sync.
- **3D Pool (8-Ball Billiards):** Physics-driven 3D pool table with turn-based partner play.
- **3D Ludo:** Interactive 3D board, physics-based dice rolls, and real-time token movement.
- **3D Uno:** Classic Uno rules, custom action cards, and 3D card dealing animations.
- **3D Carrom:** Striker physics, coin pockets, and smooth touch/mouse aiming.
- **3D Bowling:** Alley physics, ball trajectory controls, and frame-by-frame scoring.
- **3D Racer:** Split/shared multiplayer arcade racing with responsive keyboard and touch controls.
- **Co-Paint Studio:** Real-time synchronized collaborative drawing canvas with custom brushes and colors.
- **Classic Date Games:** Tic-Tac-Toe, Truth or Dare (50+ prompts), Couples Quiz, and "Would You Rather".
- **Couples Stakes & Bets System:** Set playful stakes for any arcade game with instant partner sync.

### 📍 Live GPS Map & "Meet Halfway"
- **Live Location Sharing:** Opt-in GPS location sharing powered by Leaflet and OpenStreetMap.
- **"Meet Halfway" Midpoint Calculation:** Automatically calculates the geographic midpoint between partners with a single tap to launch Google Maps turn-by-turn directions.
- **Proximity & Distance Metrics:** Live distance calculations in kilometers and last-updated timestamps.

### 🔔 Background Web Push & Call Alerts
- **Offline Push Notifications (VAPID API):** Service Worker background push engine that delivers alerts even when the browser or tab is completely closed.
- **Incoming Call Ringing:** Rings your device with a system notification when your partner calls via WebRTC.
- **Room & Game Invites:** Instant push alerts when a partner invites you into a room or challenges you to a game.
- **Smart Active / Away Routing:** Suppresses unnecessary desktop popups when active in the app, and triggers sound alerts and OS push when away.
- **Auto-Recovery Service Worker:** Auto-recovers and cleans stale cached workers across Vercel deployments.

### 💖 Planned Date Countdown & Milestones
- **Live Countdown Clock:** Synchronized timer counting down days, hours, minutes, and seconds until your next reunion or date night.
- **Shared Date Milestones:** Create custom events or pick quick presets like "Midnight Movie & Cocktails".

### 🎨 Ambient Mood Themes & Soundscapes
- **Dynamic Atmosphere:** Select moods (Romantic, Cozy, Playful, Chill, Midnight) that dynamically tint the UI with glowing ambient particles.
- **Synthesized Audio Soundscapes:** Procedural audio tones and gentle chimes using the built-in Web Audio API sound service.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [Next.js 14](https://nextjs.org/) (App Router) |
| **Styling & UI** | [Tailwind CSS](https://tailwindcss.com/) + Custom Glassmorphism |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) |
| **Backend Framework** | [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) |
| **Realtime Engine** | [Socket.io](https://socket.io/) (v4) |
| **Database** | [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/) |
| **Video & Calls** | WebRTC via `simple-peer` & native RTCPeerConnection |
| **Mapping & Geospatial** | [Leaflet](https://leafletjs.com/) + [React-Leaflet](https://react-leaflet.js.org/) |
| **Push Notifications** | Web Push API + [web-push](https://github.com/web-push-libs/web-push) (VAPID) |
| **3D Rendering** | [Three.js](https://threejs.org/) (for Arcade 3D games) |
| **PWA Engine** | `next-pwa` + Custom Service Worker (`/sw.js`) |

---

## 📂 Project Architecture

```
after-party/
├── client/                     # Next.js 14 PWA Frontend
│   ├── public/                 # Static assets, 3D game engines, manifest & service worker
│   │   ├── games/              # Three.js 3D game engines (chess, pool, ludo, uno, etc.)
│   │   ├── manifest.json       # PWA Web App Manifest
│   │   └── sw.js               # Background service worker with push handlers
│   ├── src/
│   │   ├── app/                # Next.js App Router
│   │   │   ├── (auth)/         # Login & Register routes
│   │   │   ├── (app)/          # Main App: /dashboard, /chat, /watch, /games, /map, /goals, /reminders
│   │   │   └── room/setup/     # Room creation & invite code pairing
│   │   ├── components/         # Modular UI Components
│   │   │   ├── games/          # Arcade game wrappers (CoPaint, TicTacToe, Stakes, etc.)
│   │   │   ├── CallOverlay.tsx # Global WebRTC incoming & active call overlay
│   │   │   ├── BottomNav.tsx   # Mobile-friendly romantic glass navigation
│   │   │   └── ...             # Modals, Overlays, and Sound services
│   │   ├── hooks/              # useWebRTC, useLocation, useSound hooks
│   │   ├── lib/
│   │   │   ├── store/          # Zustand stores (authStore, socketStore, callStore, moodStore)
│   │   │   ├── pushSubscription.ts # VAPID push manager registration & auto-recovery
│   │   │   ├── soundService.ts # Web Audio procedural sound generator
│   │   │   └── api.ts          # Axios client with JWT interceptor
│   │   └── middleware.ts       # Auth route guards
│   └── worker/                 # Service Worker worker sources
│
└── server/                     # Node.js Express & Socket.io Backend
    ├── src/
    │   ├── config/             # Database connection & options
    │   ├── games/              # Server validation for game moves & decks
    │   ├── middleware/         # Auth JWT verification, multer upload, errorHandler
    │   ├── models/             # Mongoose schemas (User, Room, Message, Goal, Reminder, GameSession)
    │   ├── routes/             # REST Endpoints (auth, rooms, friends, messages, goals, reminders, push)
    │   ├── services/           # pushService (VAPID web-push), reminderService (node-cron)
    │   ├── socket/             # Socket.io handlers (chat, calls, watch sync, presence, arcade)
    │   └── index.js            # Main HTTP & Socket server bootstrap
    └── uploads/                # Local asset upload directory
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ installed
- **MongoDB** instance (Local MongoDB or MongoDB Atlas URI)
- Modern web browser (Chrome, Edge, Safari, Firefox)

### 1. Generate VAPID Keys (for Web Push)
```bash
npx web-push generate-vapid-keys
```

### 2. Backend Setup
```bash
cd server
cp .env.example .env
```
Configure `server/.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
VAPID_PUBLIC_KEY=your_generated_public_key
VAPID_PRIVATE_KEY=your_generated_private_key
VAPID_EMAIL=mailto:support@yourdomain.app
MAX_FILE_SIZE_MB=50
```
Install dependencies and run:
```bash
npm install
npm run dev
```

### 3. Frontend Setup
```bash
cd client
cp .env.local.example .env.local
```
Configure `client/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_generated_public_key
```
Install dependencies and run:
```bash
npm install
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📡 REST API Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new account with email & password |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile and room details |
| `PATCH` | `/api/auth/profile` | Update display name and avatar |

### 🏠 Rooms & Spaces (`/api/rooms`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/rooms/create` | Generate a private couple room with an 8-char invite code |
| `POST` | `/api/rooms/join` | Join an existing room via invite code |
| `GET` | `/api/rooms/mine` | Retrieve active room info, members, and planned date |
| `POST` | `/api/rooms/invite` | Send room invitation to a friend |
| `POST` | `/api/rooms/event` | Save or update planned countdown event |
| `DELETE` | `/api/rooms/leave` | Leave current room |

### 👥 Friends & Social (`/api/friends`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/friends` | List all connected partner/friends |
| `POST` | `/api/friends/add` | Connect with a friend via 8-digit Friend ID |
| `POST` | `/api/friends/invite` | Send room invitation directly to connection |

### 💬 Messages (`/api/messages`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/messages` | Paginated message history (`?page=1&limit=50`) |
| `POST` | `/api/messages` | Send text, whisper, or audio voice note |
| `POST` | `/api/messages/image` | Upload and send image message (Multipart) |
| `PATCH` | `/api/messages/:id/seen` | Mark specific message as seen |

### 🎯 Goals & Reminders (`/api/goals`, `/api/reminders`)
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/goals` | List or create shared relationship goals |
| `PATCH` | `/api/goals/:id/progress`| Update goal progress percentage (0–100) |
| `GET/POST` | `/api/reminders` | List or schedule reminders with cron triggers |

### 🔔 Web Push Notifications (`/api/push`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/push/subscribe` | Register/update browser Web Push subscription |
| `POST` | `/api/push/test` | Dispatch an immediate test push to verify device push channel |
| `DELETE` | `/api/push/unsubscribe` | Unsubscribe device from push notifications |

---

## ⚡ Socket.io Real-Time Events

### 💬 Messaging & Typing
- `chat:message` — Broadcast room messages.
- `chat:direct-message` — Deliver direct 1-to-1 messages.
- `chat:typing` / `chat:direct-typing` — Live typing indicator broadcast.
- `chat:seen` / `chat:direct-seen` — Seen status receipt synchronization.

### 📞 WebRTC Video & Audio Calls
- `webrtc:call-user` — Ring partner directly with Web Push fallback.
- `webrtc:incoming-call` — Deliver incoming call signal.
- `webrtc:accept-call` / `webrtc:reject-call` — Call acceptance and rejection signaling.
- `webrtc:signal` — ICE candidate & SDP offer/answer exchange.
- `webrtc:end` — Terminate active call session.

### 🎬 Watch Together
- `watch:state` — Sync play, pause, seek position, and playback speed.
- `watch:close` — Synchronously close the active video on both devices.
- `watch:join` / `watch:leave` — Sync partner presence in the theater.

### 🎮 Arcade & Games
- `arcade:set-stake` — Set and synchronize playful stakes for arcade sessions.
- `game:invite` — Challenge friend to an arcade game with background push.
- `game:move` — Synchronize turn-based moves (Chess, Pool, Ludo, Uno, etc.).

### 📍 Live Location
- `location:update` — Transmit live GPS coordinates (in-memory, never persisted).
- `location:stop` — Cease active location transmission.

---

## 📱 Progressive Web App (PWA)

After Party is built mobile-first and fully installable as a standalone PWA:
- **Android:** Tap the browser menu `⋮` and select **"Install App"** or **"Add to Home Screen"**.
- **iOS:** Tap the Share button `⎋` in Safari and select **"Add to Home Screen"**.
- **Desktop:** Click the install icon in the browser address bar to run After Party in a dedicated borderless window.

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE).
