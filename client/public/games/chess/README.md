# ♟️ Zen Chess 3D — Real-Time Multiplayer & AI Web App

An ultra-sleek, luxury **3D Chess Web Application** built with **Three.js**, **chess.js**, and **PeerJS (WebRTC P2P)**.

![Zen Chess 3D](https://raw.githubusercontent.com/DEEPALI0505/3D_Chess/main/preview.jpg)

---

## ✨ Features

- 🎮 **3 Game Modes:**
  - **Online Multiplayer (P2P):** Play with friends anywhere with zero server latency using WebRTC PeerJS.
  - **Player vs AI:** Play against an intelligent computer engine with 3 difficulty levels (Easy, Medium, Grandmaster) using Minimax & Alpha-Beta Pruning.
  - **Pass & Play:** 2 Players on the same device.
- 🔗 **Instant Friend Invite Link & WhatsApp Share:**
  - One-click copy invite link with custom `#room=CODE` hash.
  - Direct WhatsApp match invitation button.
- 🎨 **Luxury 3D Graphics (Three.js):**
  - Photorealistic Carrara Marble & Obsidian pieces and board.
  - Realistic studio lighting, soft shadows, and reflective floor.
  - Interactive green holographic highlights for legal moves and yellow ring for selected piece.
  - 360° Orbit camera controls (Rotate, Zoom, Pan) with Camera Reset and Board Flip.
- ⏱️ **Digital Chess Timers & Time Controls:**
  - 1 Min Bullet, 3 Min Blitz, 10 Min Rapid, and Unlimited modes.
- 💬 **In-Game Live Chat & Floating Emoji Reactions:**
  - Real-time chatting between players and floating animated reactions (👍, 🔥, 😮, 👑, ♟️, 👏).
- 🔊 **Procedural Web Audio API Sound Effects:**
  - Marble piece move tap, heavy capture strike, check alert, victory fanfare, and chat notifications (no external MP3 downloads required!).
- 📜 **Full Chess Rules Compliant:**
  - Castling (Kingside & Queenside), En Passant, Pawn Promotion modal, Check, Checkmate, and Stalemate detection.

---

## 🚀 Quick Start (Play Locally)

No complicated node module installation required!

### Option 1: Direct Double Click
Simply double click `index.html` in your web browser.

### Option 2: Local HTTP Server (Recommended for testing multiple browser tabs)
```bash
# Using Python
python -m http.server 8080

# Or using npx
npx serve
```
Open your browser at `http://localhost:8080`.

---

## 🌐 Deploy to GitHub Pages (Free Hosting)

1. Go to your repository on GitHub: `https://github.com/DEEPALI0505/3D_Chess`
2. Click **Settings** > **Pages** (in the left sidebar).
3. Under **Branch**, select `main` branch and folder `/ (root)`.
4. Click **Save**.
5. Your 3D Chess game will be live online within a minute at:
   `https://deepali0505.github.io/3D_Chess/`

---

## 🛠️ Tech Stack

- **Graphics:** [Three.js (r128)](https://threejs.org/) + OrbitControls
- **Game Logic:** [chess.js](https://github.com/jhlywa/chess.js)
- **Multiplayer:** [PeerJS](https://peerjs.com/) (WebRTC DataConnection)
- **Audio:** Web Audio API (procedural synthesis)
- **Styling:** Modern Glassmorphism CSS3 + Google Fonts (`Outfit`, `Inter`, `JetBrains Mono`)
