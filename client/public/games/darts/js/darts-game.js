// 3D Pub Darts Studio - WebGL / Three.js
(function () {
  'use strict';

  // Extract query params for player names
  const urlParams = new URLSearchParams(window.location.search);
  const p1Param = urlParams.get('p1') || 'Player 1';
  const p2Param = urlParams.get('p2') || 'Friend';

  // Game state
  let currentTurn = 1; // 1 or 2
  let dartsInTurn = 3;
  let p1Score = 301;
  let p2Score = 301;
  let p1TurnScore = 0;
  let p2TurnScore = 0;
  let gameMode = '301'; // '301' or 'duel' (highest score)
  let vsAI = false;
  let isThrowing = false;
  let gameOver = false;

  // Active darts stuck in the board
  let stuckDarts = [];

  // Three.js instances
  let scene, camera, renderer;
  let boardMesh, cabinetMesh;
  let currentDart = null;
  let aimTarget = { x: 0, y: 0 };
  let swayTime = 0;

  // Standard English Dartboard slice numbers in clockwise order from top (12 o'clock)
  const DARTBOARD_SLICES = [
    20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5
  ];

  // DOM Elements
  const p1Card = document.getElementById('p1-card');
  const p2Card = document.getElementById('p2-card');
  const p1NameEl = document.getElementById('p1-name');
  const p2NameEl = document.getElementById('p2-name');
  const p1ScoreEl = document.getElementById('p1-score');
  const p2ScoreEl = document.getElementById('p2-score');
  const p1RoundScoreEl = document.getElementById('p1-round-score');
  const p2RoundScoreEl = document.getElementById('p2-round-score');
  const turnIndicatorEl = document.getElementById('turn-indicator');
  const lastHitEl = document.getElementById('last-hit-display');
  const throwBtn = document.getElementById('throw-btn');
  const aimXSlider = document.getElementById('aim-x-slider');
  const aimYSlider = document.getElementById('aim-y-slider');
  const aimXValEl = document.getElementById('aim-x-val');
  const aimYValEl = document.getElementById('aim-y-val');
  const aimCrosshair = document.getElementById('aim-crosshair');
  const dartIcon1 = document.getElementById('dart-icon-1');
  const dartIcon2 = document.getElementById('dart-icon-2');
  const dartIcon3 = document.getElementById('dart-icon-3');
  const modeBtn = document.getElementById('mode-btn');
  const aiBtn = document.getElementById('ai-btn');
  const resetBtn = document.getElementById('reset-btn');
  const winModal = document.getElementById('win-modal');
  const winTitleEl = document.getElementById('win-title');
  const winSubtitleEl = document.getElementById('win-subtitle');
  const modalRestartBtn = document.getElementById('modal-restart-btn');

  p1NameEl.textContent = p1Param;
  p2NameEl.textContent = p2Param;

  // Create High-Res Dartboard Texture procedurally
  function createDartboardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const cx = 512;
    const cy = 512;
    const maxR = 480;

    // Background dark wood/sisal outer rim
    ctx.fillStyle = '#0f0e11';
    ctx.fillRect(0, 0, 1024, 1024);

    // Number ring
    ctx.fillStyle = '#181514';
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx.fill();

    const rDoubleOuter = 380;
    const rDoubleInner = 350;
    const rTripleOuter = 240;
    const rTripleInner = 210;
    const rOuterBull = 60;
    const rInnerBull = 26;

    const sliceAngle = (Math.PI * 2) / 20;

    // Draw 20 slices
    for (let i = 0; i < 20; i++) {
      // Angle: 20 is at the top (-PI/2)
      const startA = -Math.PI / 2 - sliceAngle / 2 + i * sliceAngle;
      const endA = startA + sliceAngle;

      const isOdd = i % 2 === 1;
      const bedColor = isOdd ? '#f5eedb' : '#1e1c1b'; // Cream or Black
      const ringColor = isOdd ? '#15803d' : '#dc2626'; // Green or Red

      // Outer Single Bed
      ctx.fillStyle = bedColor;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, rDoubleInner, startA, endA);
      ctx.closePath();
      ctx.fill();

      // Double Ring
      ctx.fillStyle = ringColor;
      ctx.beginPath();
      ctx.arc(cx, cy, rDoubleOuter, startA, endA);
      ctx.arc(cx, cy, rDoubleInner, endA, startA, true);
      ctx.closePath();
      ctx.fill();

      // Inner Single Bed
      ctx.fillStyle = bedColor;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, rTripleInner, startA, endA);
      ctx.closePath();
      ctx.fill();

      // Triple Ring
      ctx.fillStyle = ringColor;
      ctx.beginPath();
      ctx.arc(cx, cy, rTripleOuter, startA, endA);
      ctx.arc(cx, cy, rTripleInner, endA, startA, true);
      ctx.closePath();
      ctx.fill();
    }

    // Outer Bullseye (Green)
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(cx, cy, rOuterBull, 0, Math.PI * 2);
    ctx.fill();

    // Inner Bullseye (Red)
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(cx, cy, rInnerBull, 0, Math.PI * 2);
    ctx.fill();

    // Spider Wires (Metallic Silver wire frame)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;

    // Circular wires
    [rInnerBull, rOuterBull, rTripleInner, rTripleOuter, rDoubleInner, rDoubleOuter].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Radial wires
    for (let i = 0; i < 20; i++) {
      const angle = -Math.PI / 2 - sliceAngle / 2 + i * sliceAngle;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * rOuterBull, cy + Math.sin(angle) * rOuterBull);
      ctx.lineTo(cx + Math.cos(angle) * rDoubleOuter, cy + Math.sin(angle) * rDoubleOuter);
      ctx.stroke();
    }

    // Numbers printed around rim
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px -apple-system, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 20; i++) {
      const angle = -Math.PI / 2 + i * sliceAngle;
      const numR = 430;
      const nx = cx + Math.cos(angle) * numR;
      const ny = cy + Math.sin(angle) * numR;

      ctx.save();
      ctx.translate(nx, ny);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(DARTBOARD_SLICES[i].toString(), 0, 0);
      ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    return texture;
  }

  // Create 3D Dart Model
  function createDartModel(playerNum) {
    const dartGroup = new THREE.Group();

    // Steel Tip (pointy needle)
    const tipGeo = new THREE.ConeGeometry(0.04, 0.45, 12);
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.9,
      roughness: 0.2
    });
    const tipMesh = new THREE.Mesh(tipGeo, tipMat);
    tipMesh.rotation.x = -Math.PI / 2;
    tipMesh.position.z = -0.7;
    dartGroup.add(tipMesh);

    // Brass Barrel (knurled grip)
    const barrelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 16);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: playerNum === 1 ? 0xf59e0b : 0x38bdf8,
      metalness: 0.85,
      roughness: 0.3
    });
    const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
    barrelMesh.rotation.x = Math.PI / 2;
    barrelMesh.position.z = -0.3;
    dartGroup.add(barrelMesh);

    // Shaft / Stem
    const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.55, 12);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.5,
      roughness: 0.5
    });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.rotation.x = Math.PI / 2;
    stemMesh.position.z = 0.2;
    dartGroup.add(stemMesh);

    // Flights (4 wings)
    const flightMat = new THREE.MeshStandardMaterial({
      color: playerNum === 1 ? 0xef4444 : 0x0ea5e9,
      roughness: 0.4,
      side: THREE.DoubleSide
    });
    const wingGeo = new THREE.PlaneGeometry(0.35, 0.4);

    const wing1 = new THREE.Mesh(wingGeo, flightMat);
    wing1.position.z = 0.65;
    dartGroup.add(wing1);

    const wing2 = new THREE.Mesh(wingGeo, flightMat);
    wing2.position.z = 0.65;
    wing2.rotation.z = Math.PI / 2;
    dartGroup.add(wing2);

    return dartGroup;
  }

  // Setup Three.js Scene
  function init3D() {
    const container = document.getElementById('canvas-container');
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0a09);

    camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0, 0, 11);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Warm Pub Ambient & Studio Spotlight
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 0.65);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffeedd, 2.2);
    spotLight.position.set(0, 6, 9);
    spotLight.angle = Math.PI / 5;
    spotLight.penumbra = 0.4;
    spotLight.castShadow = true;
    scene.add(spotLight);

    const rimLight = new THREE.PointLight(0xf59e0b, 1.2, 15);
    rimLight.position.set(0, -3, 4);
    scene.add(rimLight);

    // Pub Back wall (Warm mahogany paneling)
    const wallGeo = new THREE.PlaneGeometry(24, 18);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1c130d,
      roughness: 0.85,
      metalness: 0.1
    });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.z = -0.3;
    scene.add(wallMesh);

    // Dart Cabinet Surround ring
    const surroundGeo = new THREE.CylinderGeometry(4.2, 4.2, 0.4, 48);
    const surroundMat = new THREE.MeshStandardMaterial({
      color: 0x1f140e,
      roughness: 0.7,
      metalness: 0.15
    });
    cabinetMesh = new THREE.Mesh(surroundGeo, surroundMat);
    cabinetMesh.rotation.x = Math.PI / 2;
    cabinetMesh.position.z = -0.15;
    scene.add(cabinetMesh);

    // Tournament Dartboard (Circle 3D Disc)
    const boardGeo = new THREE.CylinderGeometry(3.6, 3.6, 0.25, 64);
    const boardTex = createDartboardTexture();
    const boardMatSide = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const boardMatFace = new THREE.MeshStandardMaterial({
      map: boardTex,
      roughness: 0.8,
      metalness: 0.05
    });

    boardMesh = new THREE.Mesh(boardGeo, [boardMatSide, boardMatFace, boardMatFace]);
    boardMesh.rotation.x = Math.PI / 2;
    boardMesh.position.z = 0;
    scene.add(boardMesh);

    window.addEventListener('resize', onWindowResize);
  }

  function onWindowResize() {
    const container = document.getElementById('canvas-container');
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  // Calculate Dart Score from 3D Board hit coordinates (x, y)
  // Board radius in 3D world space is 3.6 units
  function calculateScore(x, y) {
    const r = Math.sqrt(x * x + y * y);
    const scale = 3.6 / 480; // texture maxR is 480

    // Radii in 3D units
    const rInnerBull = 26 * scale; // ~0.195
    const rOuterBull = 60 * scale; // ~0.45
    const rTripleInner = 210 * scale; // ~1.575
    const rTripleOuter = 240 * scale; // ~1.8
    const rDoubleInner = 350 * scale; // ~2.625
    const rDoubleOuter = 380 * scale; // ~2.85

    // Check Bullseye
    if (r <= rInnerBull) {
      return { points: 50, desc: 'DOUBLE BULL (50) 🎯🔥', isBull: true };
    }
    if (r <= rOuterBull) {
      return { points: 25, desc: 'BULLSEYE (25) 🎯', isBull: true };
    }
    if (r > rDoubleOuter) {
      return { points: 0, desc: 'MISS (0) 💨', isBull: false };
    }

    // Determine slice angle
    // In Three.js: top is +y, right is +x
    // Math angle from +x: atan2(y, x). 12 o'clock (top) is +PI/2
    let angle = Math.atan2(y, x);
    // Convert so 12 o'clock is 0, clockwise
    let clockAngle = Math.PI / 2 - angle;
    if (clockAngle < 0) clockAngle += Math.PI * 2;

    const sliceAngle = (Math.PI * 2) / 20;
    // Offset by half slice so 20 is centered around 0
    let index = Math.floor((clockAngle + sliceAngle / 2) / sliceAngle) % 20;
    const baseNumber = DARTBOARD_SLICES[index];

    if (r >= rTripleInner && r <= rTripleOuter) {
      return { points: baseNumber * 3, desc: `TRIPLE ${baseNumber} (${baseNumber * 3})! ⚡`, isBull: false };
    }
    if (r >= rDoubleInner && r <= rDoubleOuter) {
      return { points: baseNumber * 2, desc: `DOUBLE ${baseNumber} (${baseNumber * 2})!`, isBull: false };
    }

    return { points: baseNumber, desc: `SINGLE ${baseNumber} (${baseNumber})`, isBull: false };
  }

  // Update UI Darts remaining icons
  function updateDartsIcons() {
    [dartIcon1, dartIcon2, dartIcon3].forEach((icon, i) => {
      if (i < dartsInTurn) {
        icon.classList.add('active');
      } else {
        icon.classList.remove('active');
      }
    });
  }

  // Update Scoreboard UI
  function updateScoreboard() {
    p1ScoreEl.textContent = p1Score;
    p2ScoreEl.textContent = p2Score;
    p1RoundScoreEl.textContent = `Rd: ${p1TurnScore}`;
    p2RoundScoreEl.textContent = `Rd: ${p2TurnScore}`;

    if (currentTurn === 1) {
      p1Card.classList.add('active');
      p2Card.classList.remove('active');
      turnIndicatorEl.textContent = `${p1Param}'s Turn`;
    } else {
      p2Card.classList.add('active');
      p1Card.classList.remove('active');
      turnIndicatorEl.textContent = `${vsAI ? 'Robot AI' : p2Param}'s Turn`;
    }

    updateDartsIcons();
  }

  // Switch Turn
  function switchTurn() {
    dartsInTurn = 3;
    p1TurnScore = 0;
    p2TurnScore = 0;

    // Clear board darts with subtle fade
    stuckDarts.forEach(d => scene.remove(d));
    stuckDarts = [];

    currentTurn = currentTurn === 1 ? 2 : 1;
    updateScoreboard();

    if (currentTurn === 2 && vsAI && !gameOver) {
      throwBtn.disabled = true;
      setTimeout(aiThrowTurn, 900);
    } else {
      throwBtn.disabled = false;
    }
  }

  // AI Throw routine (3 darts)
  function aiThrowTurn() {
    if (gameOver) return;

    let dartCount = 0;
    const doAiDart = () => {
      if (dartCount >= 3 || gameOver) {
        setTimeout(switchTurn, 1000);
        return;
      }

      // AI target: tries for 20, Triple 20, or Bullseye with slight variance
      const variance = (Math.random() - 0.5) * 1.2;
      const varianceY = (Math.random() - 0.5) * 1.2;
      const targetX = 0 + variance;
      const targetY = 1.7 + varianceY; // Top 20 area

      executeDartThrow(targetX, targetY, () => {
        dartCount++;
        setTimeout(doAiDart, 700);
      });
    };

    doAiDart();
  }

  // Execute Dart Throw Animation
  function executeDartThrow(targetX, targetY, callback) {
    if (isThrowing) return;
    isThrowing = true;
    throwBtn.disabled = true;

    if (window.dartsAudio) window.dartsAudio.playDartThrow();

    // Create 3D Dart
    const dart = createDartModel(currentTurn);
    // Start dart at bottom right of screen, moving to target
    dart.position.set(targetX * 0.3 + 0.6, -1.8, 9.5);
    dart.rotation.set(-0.2, 0.1, 0);
    scene.add(dart);

    const startPos = dart.position.clone();
    const endPos = new THREE.Vector3(targetX, targetY, 0.15); // stick into board surface
    const duration = 400; // ms
    const startTime = performance.now();

    function animateFlight(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      dart.position.lerpVectors(startPos, endPos, ease);
      // Realistic ballistic pitch
      dart.rotation.x = THREE.MathUtils.lerp(-0.35, 0.05, ease);
      dart.rotation.y = THREE.MathUtils.lerp(0.15, 0, ease);

      if (progress < 1) {
        requestAnimationFrame(animateFlight);
      } else {
        // Hit Board!
        isThrowing = false;
        stuckDarts.push(dart);

        // Shake camera slightly
        camera.position.z = 10.9;
        setTimeout(() => camera.position.z = 11, 70);

        // Score logic
        const hit = calculateScore(targetX, targetY);
        if (window.dartsAudio) window.dartsAudio.playBoardThud(hit.isBull);

        lastHitEl.textContent = hit.desc;

        // Apply score
        if (gameMode === '301') {
          if (currentTurn === 1) {
            if (p1Score - hit.points >= 0) {
              p1Score -= hit.points;
              p1TurnScore += hit.points;
              if (p1Score === 0) {
                handleVictory(p1Param);
                return;
              }
            } else {
              lastHitEl.textContent = 'BUST! Over 301 ❌';
            }
          } else {
            if (p2Score - hit.points >= 0) {
              p2Score -= hit.points;
              p2TurnScore += hit.points;
              if (p2Score === 0) {
                handleVictory(vsAI ? 'Robot AI' : p2Param);
                return;
              }
            } else {
              lastHitEl.textContent = 'BUST! Over 301 ❌';
            }
          }
        } else {
          // Duel mode (highest score)
          if (currentTurn === 1) {
            p1Score += hit.points;
            p1TurnScore += hit.points;
          } else {
            p2Score += hit.points;
            p2TurnScore += hit.points;
          }
        }

        dartsInTurn--;
        updateScoreboard();

        if (callback) callback();

        if (dartsInTurn <= 0 && (!vsAI || currentTurn === 1)) {
          setTimeout(switchTurn, 1000);
        } else if (currentTurn === 1 || !vsAI) {
          throwBtn.disabled = false;
        }
      }
    }

    requestAnimationFrame(animateFlight);
  }

  // Handle Victory
  function handleVictory(winnerName) {
    gameOver = true;
    throwBtn.disabled = true;
    if (window.dartsAudio) window.dartsAudio.playVictory();

    winTitleEl.textContent = `🎯 ${winnerName} WINS!`;
    winSubtitleEl.textContent = gameMode === '301' 
      ? `Finished with a sensational checkout!`
      : `High Score Champion!`;
    winModal.classList.add('show');
  }

  // Reset Match
  function resetGame() {
    gameOver = false;
    currentTurn = 1;
    dartsInTurn = 3;
    p1Score = gameMode === '301' ? 301 : 0;
    p2Score = gameMode === '301' ? 301 : 0;
    p1TurnScore = 0;
    p2TurnScore = 0;
    winModal.classList.remove('show');
    lastHitEl.textContent = 'Aim & Throw!';

    stuckDarts.forEach(d => scene.remove(d));
    stuckDarts = [];

    aimXSlider.value = 0;
    aimYSlider.value = 0;
    aimXValEl.textContent = '0°';
    aimYValEl.textContent = '0';

    throwBtn.disabled = false;
    updateScoreboard();
  }

  // Event Listeners
  throwBtn.addEventListener('click', () => {
    if (isThrowing || gameOver) return;
    // Convert slider coordinates (-30..30) to 3D board units (-3.0..3.0)
    // Add subtle aim sway
    const swayX = Math.sin(swayTime * 2.5) * 0.12;
    const swayY = Math.cos(swayTime * 2.1) * 0.12;

    const targetX = (parseFloat(aimXSlider.value) / 30) * 3.0 + swayX;
    const targetY = (parseFloat(aimYSlider.value) / 30) * 3.0 + swayY;

    executeDartThrow(targetX, targetY);
  });

  aimXSlider.addEventListener('input', (e) => {
    aimXValEl.textContent = `${e.target.value}°`;
  });

  aimYSlider.addEventListener('input', (e) => {
    aimYValEl.textContent = `${e.target.value}`;
  });

  modeBtn.addEventListener('click', () => {
    if (window.dartsAudio) window.dartsAudio.playClick();
    gameMode = gameMode === '301' ? 'duel' : '301';
    modeBtn.textContent = gameMode === '301' ? 'Mode: 301 Classic' : 'Mode: High Score Duel';
    resetGame();
  });

  aiBtn.addEventListener('click', () => {
    if (window.dartsAudio) window.dartsAudio.playClick();
    vsAI = !vsAI;
    aiBtn.textContent = vsAI ? 'Opponent: Robot AI' : 'Opponent: Friend (2P)';
    p2NameEl.textContent = vsAI ? 'Robot AI' : p2Param;
    resetGame();
  });

  resetBtn.addEventListener('click', () => {
    if (window.dartsAudio) window.dartsAudio.playClick();
    resetGame();
  });

  modalRestartBtn.addEventListener('click', () => {
    if (window.dartsAudio) window.dartsAudio.playClick();
    resetGame();
  });

  // Main Render Loop
  function animate() {
    requestAnimationFrame(animate);

    swayTime += 0.03;

    // Update crosshair cursor position on screen
    if (aimCrosshair && camera) {
      const rawX = (parseFloat(aimXSlider.value) / 30) * 3.0;
      const rawY = (parseFloat(aimYSlider.value) / 30) * 3.0;
      // Add natural breathing tremor
      const swayX = Math.sin(swayTime * 2.5) * 0.12;
      const swayY = Math.cos(swayTime * 2.1) * 0.12;

      const vec = new THREE.Vector3(rawX + swayX, rawY + swayY, 0);
      vec.project(camera);

      const w = window.innerWidth;
      const h = window.innerHeight;
      const screenX = (vec.x * 0.5 + 0.5) * w;
      const screenY = (-(vec.y * 0.5) + 0.5) * h;

      aimCrosshair.style.left = `${screenX}px`;
      aimCrosshair.style.top = `${screenY}px`;
    }

    renderer.render(scene, camera);
  }

  // Initialize
  init3D();
  updateScoreboard();
  animate();
})();
