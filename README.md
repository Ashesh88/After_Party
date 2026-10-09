# 💕 After Party

> A private digital space for couples to connect remotely — watch movies together, play games, share locations, chat, and plan your future.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS + Framer Motion |
| Backend | Node.js + Express + Socket.io |
| Database | MongoDB (Mongoose) |
| Auth | JWT (email/password) + invite-code pairing |
| Realtime | Socket.io (chat, sync, games, location) |
| Video/Call | WebRTC via simple-peer |
| Maps | Leaflet + OpenStreetMap |
| Push Notifs | Web Push API + node-cron |

---

## Project Structure

```
after-party/
├── client/          # Next.js 14 frontend (PWA)
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── (auth)/      # Login, Register
│   │   │   ├── (app)/       # Dashboard, Watch, Chat, Games, Map, Goals
│   │   │   └── room/        # Room setup (create/join)
│   │   ├── components/      # Reusable UI components
│   │   │   └── games/       # TicTacToe, TruthOrDare, Quiz, WouldYouRather
│   │   ├── hooks/           # useWebRTC, useLocation, useChat, useWatch
│   │   ├── lib/
│   │   │   ├── store/       # Zustand stores (auth, socket)
│   │   │   ├── api.ts       # Axios instance
│   │   │   └── types.ts     # TypeScript interfaces
│   │   └── middleware.ts    # Auth route protection
│   └── public/
│       ├── manifest.json    # PWA manifest
│       └── sw.js            # Service worker
│
└── server/          # Node.js + Express backend
    ├── src/
    │   ├── models/          # Mongoose schemas
    │   ├── routes/          # REST API endpoints
    │   ├── socket/          # Socket.io event handlers
    │   ├── services/        # Reminder scheduler, Push notifications
    │   ├── games/           # Game logic & question decks
    │   ├── middleware/       # Auth, error handler, upload
    │   └── config/          # DB connection
    └── uploads/             # Uploaded images (local)
```

---

## Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- (Optional) VAPID keys for push notifications

### 1. Generate VAPID Keys
```bash
npx web-push generate-vapid-keys
```

### 2. Server Setup
```bash
cd server
cp .env.example .env
# Fill in your MongoDB URI, JWT secret, and VAPID keys in .env
npm install
npm run dev
```

### 3. Client Setup
```bash
cd client
cp .env.local.example .env.local
# Fill in API URL and VAPID public key
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rooms/create` | Create a new room |
| POST | `/api/rooms/join` | Join room by invite code |
| GET | `/api/rooms/mine` | Get your room details |
| DELETE | `/api/rooms/leave` | Leave your room |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages?page=1&limit=50` | Get chat history |
| POST | `/api/messages` | Send text/emoji message |
| POST | `/api/messages/image` | Upload image message |
| PATCH | `/api/messages/:id/seen` | Mark as seen |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goals` | List all goals |
| POST | `/api/goals` | Create goal |
| PUT | `/api/goals/:id` | Update goal |
| PATCH | `/api/goals/:id/progress` | Update progress |
| DELETE | `/api/goals/:id` | Delete goal |
| GET | `/api/goals/stats` | Goals statistics |

### Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reminders` | List reminders |
| POST | `/api/reminders` | Create + schedule reminder |
| PUT | `/api/reminders/:id` | Update reminder |
| PUT | `/api/reminders/:id/toggle` | Enable/disable |
| DELETE | `/api/reminders/:id` | Delete reminder |

### Push Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/push/subscribe` | Save push subscription |
| DELETE | `/api/push/unsubscribe` | Remove subscription |

---

## Socket.io Events

### Connection
```js
// Client connects with JWT
const socket = io(SOCKET_URL, {
  auth: { token: 'your-jwt-token' }
});
```

### Chat
| Event | Direction | Payload |
|-------|-----------|---------|
| `chat:message` | Client → Server → Partner | `{ content, type }` |
| `chat:typing` | Client → Server → Partner | `{ isTyping }` |
| `chat:seen` | Client → Server → Partner | `{ messageId }` |

### Watch Together
| Event | Direction | Payload |
|-------|-----------|---------|
| `watch:state` | Client → Server → Partner | `{ action, currentTime, playbackRate, source }` |
| `watch:reaction` | Client → Server → Partner | `{ emoji }` |
| `watch:join` | Client → Server → Partner | `{}` |
| `watch:leave` | Client → Server → Partner | `{}` |

### WebRTC (Video Call / Screen Share)
| Event | Direction | Payload |
|-------|-----------|---------|
| `webrtc:offer` | Client → Server → Partner | `{ signal }` |
| `webrtc:answer` | Client → Server → Partner | `{ signal }` |
| `webrtc:ice-candidate` | Client → Server → Partner | `{ candidate }` |
| `webrtc:hangup` | Client → Server → Partner | `{}` |

### Location
| Event | Direction | Payload |
|-------|-----------|---------|
| `location:update` | Client → Server → Partner | `{ lat, lng, timestamp }` |
| `location:stop` | Client → Server → Partner | `{}` |

### Games
| Event | Direction | Payload |
|-------|-----------|---------|
| `game:start` | Client → Server → Room | `{ gameType }` |
| `game:move` | Client → Server → Room | `{ sessionId, move }` |
| `game:end` | Client → Server → Room | `{ sessionId }` |

### Presence
| Event | Direction | Payload |
|-------|-----------|---------|
| `presence:online` | Server → Partner | `{ userId }` |
| `presence:offline` | Server → Partner | `{ userId }` |

---

## Features by Phase

### ✅ Phase 1 — Auth + Pairing + Chat
- JWT register/login
- Create/join room with invite code (max 2 members)
- Real-time 1-to-1 chat with text, images, emoji
- Typing indicators, seen status
- Message history

### ✅ Phase 2 — Dashboard + Goals + Reminders
- Goals with progress, categories, streaks
- Reminder scheduler with Web Push notifications
- Dashboard widgets

### ✅ Phase 3 — Watch Together
- Synced YouTube / direct URL / local file playback
- WebRTC video call tiles while watching
- Screen sharing
- Emoji reactions overlay

### ✅ Phase 4 — Live Location
- Opt-in GPS sharing via Geolocation API
- Leaflet map with both user markers
- Distance calculation, last-updated time

### ✅ Phase 5 — Games
- Tic-Tac-Toe, Truth or Dare, Quiz, Would You Rather
- Real-time game state via Socket.io
- Score tracking

---

## Environment Variables

### Server (`server/.env`)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/after-party
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:admin@afterparty.app
MAX_FILE_SIZE_MB=50
```

### Client (`client/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
```

---

## PWA Installation
After Party is installable as a Progressive Web App. On mobile, tap **"Add to Home Screen"** from the browser menu.

---

## License
MIT
