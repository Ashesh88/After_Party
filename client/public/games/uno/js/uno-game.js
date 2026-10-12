// 3D UNO Party - Three.js Interactive Gameplay Engine
// Handles 3D table rendering, raycasting, card fanning, animation tweens, and game state binding
// Strict Classic UNO rules with high-visibility non-overlapping card layout

class Uno3DGame {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.textureFactory = new UnoCardTextureFactory();
        this.audio = window.unoAudio;

        // Parse query params
        const params = new URLSearchParams(window.location.search);
        this.mode = params.get('mode') || 'ai'; // 'ai' | 'pass' | 'online'
        this.p1Name = params.get('name') || 'You';
        this.p2Name = params.get('opponent') || (this.mode === 'ai' ? 'Uno Bot' : 'Player 2');
        this.sessionCode = params.get('code') || null;
        this.myRole = params.get('role') || 'p1'; // 'p1' or 'p2'

        // 3D Scene Objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // 3D Mesh Groups
        this.tableGroup = new THREE.Group();
        this.drawPileMeshes = [];
        this.drawHitCollider = null;
        this.discardMeshes = [];
        this.playerCardMeshes = [];
        this.opponentCardMeshes = [];
        this.directionRingMesh = null;
        this.colorGlowMesh = null;

        // Interactive States
        this.hoveredCardMesh = null;
        this.animatingCards = [];
        this.isProcessingMove = false;
        this.selectedWildCardId = null;
        this.tiltStep = 0;
        this.autoDrawTimeout = null;

        this.currentViewMode = 'orbit';

        // Initialize Rules Engine
        this.rules = new UnoGameLogic({
            playersCount: 2,
            playerNames: [this.p1Name, this.p2Name],
            onStateChange: (state) => this.onGameStateUpdate(state),
            onEvent: (type, data) => this.onGameEvent(type, data)
        });

        this.initThree();
        this.initTable();
        this.initDOM();
        this.initEvents();
        this.setupWindowMessaging();

        // Start fresh game round
        this.rules.startNewGame();
        this.syncCards3D();

        // If game started with bot turn (fail-safe)
        if (this.rules.currentPlayer === 1 && this.mode === 'ai') {
            setTimeout(() => this.checkBotTurn(), 800);
        }

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    getCameraPreset(modeName) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;
        const isMobile = width < 700 || aspect < 0.85;

        if (isMobile) {
            return {
                orbit: { pos: new THREE.Vector3(0, 11.4, 9.5), target: new THREE.Vector3(0, -0.2, 0.5) },
                hand: { pos: new THREE.Vector3(0, 9.2, 7.2), target: new THREE.Vector3(0, -0.1, 0.8) },
                top: { pos: new THREE.Vector3(0, 15.5, 0.8), target: new THREE.Vector3(0, 0, 0) }
            }[modeName] || { pos: new THREE.Vector3(0, 11.4, 9.5), target: new THREE.Vector3(0, -0.2, 0.5) };
        }

        return {
            orbit: { pos: new THREE.Vector3(0, 9.6, 7.8), target: new THREE.Vector3(0, -0.3, 0.4) },
            hand: { pos: new THREE.Vector3(0, 7.4, 5.6), target: new THREE.Vector3(0, -0.2, 0.6) },
            top: { pos: new THREE.Vector3(0, 13.5, 0.6), target: new THREE.Vector3(0, 0, 0) }
        }[modeName] || { pos: new THREE.Vector3(0, 9.6, 7.8), target: new THREE.Vector3(0, -0.3, 0.4) };
    }

    initThree() {
        this.scene = new THREE.Scene();
        // Warm mahogany / dark walnut background & fog
        this.scene.fog = new THREE.FogExp2(0x0c0807, 0.022);

        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;
        const isMobile = width < 700 || aspect < 0.85;
        const fov = isMobile ? Math.max(56, Math.min(68, Math.round(34 / aspect))) : 44;

        this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
        const preset = this.getCameraPreset(this.currentViewMode);
        this.camera.position.copy(preset.pos);
        this.camera.lookAt(preset.target);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x0c0807);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Soft warm diffuse ambient lighting without harsh white hotspots
        const ambientLight = new THREE.AmbientLight(0xfff7ed, 0.95);
        this.scene.add(ambientLight);

        // Gentle warm overhead table spotlight
        const spotLight = new THREE.SpotLight(0xffedd5, 0.65);
        spotLight.position.set(0, 14, 2);
        spotLight.angle = Math.PI / 3;
        spotLight.penumbra = 0.6;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        this.scene.add(spotLight);

        // OrbitControls strictly bounded so player cannot orbit behind opponent
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minAzimuthAngle = -Math.PI / 4.5; // Max 40 deg left
        this.controls.maxAzimuthAngle = Math.PI / 4.5;  // Max 40 deg right
        this.controls.minPolarAngle = Math.PI / 5;      // 36 deg from top
        this.controls.maxPolarAngle = Math.PI / 2.3;    // 78 deg from top
        this.controls.minDistance = 5.2;
        this.controls.maxDistance = 14.0;
        this.controls.target.copy(preset.target);
    }

    initTable() {
        // Luxury Walnut & Mahogany Brown Gaming Table
        this.tableGroup = new THREE.Group();

        // 1. Table Felt Top (Rich warm walnut / dark cognac brown)
        const tableGeo = new THREE.CylinderGeometry(6.6, 6.6, 0.35, 64);
        const tableMat = new THREE.MeshStandardMaterial({
            color: 0x3d2011, // Rich Warm Walnut Brown
            roughness: 0.85,
            metalness: 0.05
        });
        const tableMesh = new THREE.Mesh(tableGeo, tableMat);
        tableMesh.position.y = -0.175;
        tableMesh.receiveShadow = true;
        this.tableGroup.add(tableMesh);

        // 2. Solid Wood Polished Beveled Rim
        const rimGeo = new THREE.TorusGeometry(6.65, 0.22, 16, 64);
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0x221008, // Dark burnished mahogany
            roughness: 0.5,
            metalness: 0.15
        });
        const rimMesh = new THREE.Mesh(rimGeo, rimMat);
        rimMesh.rotation.x = Math.PI / 2;
        rimMesh.position.y = 0.02;
        this.tableGroup.add(rimMesh);

        // 3. Central Playfield Mat (Saddle Leather Brown)
        const playMatGeo = new THREE.CircleGeometry(3.6, 48);
        const playMatMat = new THREE.MeshStandardMaterial({
            color: 0x26140b, // Deep saddle brown leather mat
            roughness: 0.9,
            metalness: 0.02
        });
        const playMat = new THREE.Mesh(playMatGeo, playMatMat);
        playMat.rotation.x = -Math.PI / 2;
        playMat.position.y = 0.005;
        playMat.receiveShadow = true;
        this.tableGroup.add(playMat);

        // 4. Direction & Active Color Aura Ring
        const ringGeo = new THREE.RingGeometry(1.65, 1.85, 48);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xd97706,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.65
        });
        this.colorGlowMesh = new THREE.Mesh(ringGeo, ringMat);
        this.colorGlowMesh.rotation.x = -Math.PI / 2;
        this.colorGlowMesh.position.y = 0.01;
        this.tableGroup.add(this.colorGlowMesh);

        this.scene.add(this.tableGroup);
    }

    initDOM() {
        this.dom = {
            banner: document.getElementById('status-banner'),
            scoreP1: document.getElementById('score-p1'),
            scoreP2: document.getElementById('score-p2'),
            countP1: document.getElementById('count-p1'),
            countP2: document.getElementById('count-p2'),
            cardP1: document.getElementById('card-p1'),
            cardP2: document.getElementById('card-p2'),
            activeColorBadge: document.getElementById('active-color-badge'),
            activeColorText: document.getElementById('active-color-text'),
            btnUno: document.getElementById('btn-uno-shout'),
            btnCatch: document.getElementById('btn-catch-uno'),
            btnDraw: document.getElementById('btn-draw-card'),
            btnPass: document.getElementById('btn-pass-turn'),
            wildModal: document.getElementById('modal-wild-picker'),
            challengeModal: document.getElementById('modal-wild4-challenge'),
            wild4ChallengeDesc: document.getElementById('wild4-challenge-desc'),
            btnChallengeYes: document.getElementById('btn-challenge-yes'),
            btnChallengeNo: document.getElementById('btn-challenge-no'),
            victoryModal: document.getElementById('modal-victory'),
            victoryTitle: document.getElementById('victory-title'),
            victoryDesc: document.getElementById('victory-desc'),
            btnPlayAgain: document.getElementById('btn-play-again')
        };
    }

    initEvents() {
        window.addEventListener('resize', () => this.onResize());

        // View toggle buttons
        document.getElementById('btn-view-orbit')?.addEventListener('click', () => this.switchView('orbit'));
        document.getElementById('btn-view-hand')?.addEventListener('click', () => this.switchView('hand'));
        document.getElementById('btn-view-top')?.addEventListener('click', () => this.switchView('top'));
        document.getElementById('btn-rotate-board')?.addEventListener('click', () => this.rotateViewAngle());
        document.getElementById('btn-chat-toggle')?.addEventListener('click', () => {
            window.parent?.postMessage({ type: 'OPEN_CHAT_MODAL' }, '*');
        });

        // Draw / Pass action buttons
        this.dom.btnDraw?.addEventListener('click', () => this.handlePlayerDraw());
        this.dom.btnPass?.addEventListener('click', () => this.handlePlayerPass());

        // UNO shout and Catch buttons
        this.dom.btnUno?.addEventListener('click', () => this.handlePlayerUnoShout());
        this.dom.btnCatch?.addEventListener('click', () => this.handlePlayerCatchUno());

        // Wild color choice buttons
        const colorChoiceButtons = document.querySelectorAll('.btn-color-choice');
        colorChoiceButtons.forEach(btn => {
            const handlePick = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                }
                const color = btn.getAttribute('data-color') ||
                    (e && e.currentTarget && e.currentTarget.getAttribute('data-color')) ||
                    (e && e.target && e.target.closest('.btn-color-choice')?.getAttribute('data-color'));
                this.executeWildCardPlay(color);
            };

            btn.addEventListener('click', handlePick);
            btn.addEventListener('pointerdown', (e) => e.stopPropagation());
            btn.addEventListener('touchend', (e) => {
                e.stopPropagation();
                handlePick(e);
            }, { passive: false });
        });

        // Wild modal cancel button
        document.getElementById('btn-wild-cancel')?.addEventListener('click', (e) => {
            if (e) e.stopPropagation();
            this.cancelWildCardSelection();
        });

        // Challenge modal buttons
        this.dom.btnChallengeYes?.addEventListener('click', (e) => {
            if (e) e.stopPropagation();
            this.handleWild4ChallengeDecision(true);
        });
        this.dom.btnChallengeNo?.addEventListener('click', (e) => {
            if (e) e.stopPropagation();
            this.handleWild4ChallengeDecision(false);
        });

        // Replay / Next Round button
        this.dom.btnPlayAgain?.addEventListener('click', () => {
            this.handleNextRoundClick();
        });

        // Canvas pointer interactions
        const domElement = this.renderer.domElement;
        domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
        domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    }

    setupWindowMessaging() {
        window.addEventListener('message', (event) => {
            const data = event.data;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'UNO_TOGGLE_MUTE') {
                this.audio.setMuted(!!data.muted);
            } else if (data.type === 'UNO_RESET_ROUND') {
                this.rules.startNewGame();
                this.syncCards3D();
            } else if (data.type === 'UNO_REMOTE_ACTION') {
                if (data.actionType === 'play_card') {
                    this.rules.playCard(1, data.payload.cardId, data.payload.chosenColor);
                    this.audio.playCardPlay();
                    this.syncCards3D();
                } else if (data.actionType === 'draw_card') {
                    this.audio.playCardDraw();
                    this.rules.playerDrawCard(1);
                    this.syncCards3D();
                } else if (data.actionType === 'call_uno') {
                    this.rules.callUno(1);
                    this.audio.playUnoCall();
                } else if (data.actionType === 'catch_uno') {
                    this.rules.catchUno(1, 0);
                    this.audio.playPenalty();
                    this.syncCards3D();
                }
            }
        });
    }

    switchView(mode) {
        if (!['orbit', 'hand', 'top'].includes(mode)) return;
        this.currentViewMode = mode;
        const preset = this.getCameraPreset(mode);

        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-view-${mode}`)?.classList.add('active');

        this.tweenCamera(preset.pos, preset.target, 500);
    }

    // Dynamic tilt angle: toggles gently between center, left-angle, right-angle
    rotateViewAngle() {
        this.tiltStep = ((this.tiltStep || 0) + 1) % 3;
        const angles = [0, -0.28, 0.28];
        const targetAngle = angles[this.tiltStep];

        const preset = this.getCameraPreset(this.currentViewMode);
        const radius = preset.pos.length();
        const targetPos = new THREE.Vector3(
            Math.sin(targetAngle) * radius * 0.7,
            preset.pos.y,
            Math.cos(targetAngle) * preset.pos.z
        );
        this.tweenCamera(targetPos, preset.target, 550);
    }

    tweenCamera(targetPos, targetLookAt, duration = 500) {
        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const startTime = performance.now();

        const updateAnim = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            // Smooth ease-out cubic
            const ease = 1 - Math.pow(1 - t, 3);

            this.camera.position.lerpVectors(startPos, targetPos, ease);
            this.controls.target.lerpVectors(startTarget, targetLookAt, ease);
            this.controls.update();

            if (t < 1) {
                requestAnimationFrame(updateAnim);
            }
        };
        requestAnimationFrame(updateAnim);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;
        this.camera.aspect = aspect;

        const isMobile = width < 700 || aspect < 0.85;
        this.camera.fov = isMobile ? Math.max(56, Math.min(68, Math.round(34 / aspect))) : 44;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        // Re-sync cards so spacing dynamically fits the viewport width
        this.syncCards3D();
    }

    onPointerMove(e) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Check hover over player hand
        const intersects = this.raycaster.intersectObjects(this.playerCardMeshes, false);
        if (intersects.length > 0 && this.rules.currentPlayer === 0) {
            const hitMesh = intersects[0].object;
            if (this.hoveredCardMesh !== hitMesh) {
                this.resetCardHover();
                this.hoveredCardMesh = hitMesh;
                hitMesh.position.y = (hitMesh.userData.baseY || 0) + 0.32;
                hitMesh.position.z = (hitMesh.userData.baseZ || 0) + 0.18;
                document.body.style.cursor = 'pointer';
            }
        } else {
            this.resetCardHover();
            const drawIntersects = this.raycaster.intersectObjects([
                ...this.drawPileMeshes,
                this.drawHitCollider
            ].filter(Boolean), false);

            if (drawIntersects.length > 0 && this.rules.currentPlayer === 0) {
                document.body.style.cursor = 'pointer';
            } else {
                document.body.style.cursor = 'default';
            }
        }
    }

    resetCardHover() {
        if (this.hoveredCardMesh) {
            this.hoveredCardMesh.position.y = this.hoveredCardMesh.userData.baseY || 0;
            this.hoveredCardMesh.position.z = this.hoveredCardMesh.userData.baseZ || 0;
            this.hoveredCardMesh = null;
        }
    }

    onPointerDown(e) {
        // Support both mouse click (button 0) and touch tap
        if (e.button !== undefined && e.button !== 0) return;
        if (this.isProcessingMove) return;
        if (this.rules.isGameOver) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // 1. Check player hand clicks (Prioritize playable cards when overlapping)
        const cardIntersects = this.raycaster.intersectObjects(this.playerCardMeshes, false);
        if (cardIntersects.length > 0) {
            cardIntersects.sort((a, b) => {
                const aPlayable = !!a.object.userData.isPlayable;
                const bPlayable = !!b.object.userData.isPlayable;
                if (aPlayable && !bPlayable) return -1;
                if (!aPlayable && bPlayable) return 1;
                return a.distance - b.distance;
            });

            const mesh = cardIntersects[0].object;
            const card = mesh.userData.card;
            if (card) {
                this.handlePlayerPlayCard(card);
            }
            return;
        }

        // 2. Check draw pile click (meshes or center collider)
        const drawIntersects = this.raycaster.intersectObjects([
            ...this.drawPileMeshes,
            this.drawHitCollider
        ].filter(Boolean), false);

        if (drawIntersects.length > 0 && this.rules.currentPlayer === 0) {
            this.handlePlayerDraw();
            return;
        }
    }

    // -------------------------------------------------------------
    // CARD RECONCILIATION & 3D LAYOUT (HIGH VISIBILITY)
    // -------------------------------------------------------------
    syncCards3D() {
        // Clear previous meshes
        this.playerCardMeshes.forEach(m => this.scene.remove(m));
        this.opponentCardMeshes.forEach(m => this.scene.remove(m));
        this.drawPileMeshes.forEach(m => this.scene.remove(m));
        this.discardMeshes.forEach(m => this.scene.remove(m));
        if (this.drawHitCollider) {
            this.scene.remove(this.drawHitCollider);
            this.drawHitCollider = null;
        }

        this.playerCardMeshes = [];
        this.opponentCardMeshes = [];
        this.drawPileMeshes = [];
        this.discardMeshes = [];

        // 1. Draw Pile (left stack: x = -1.25, z = 0)
        const drawStackCount = Math.min(Math.max(this.rules.deck.length, 3), 14);
        for (let i = 0; i < drawStackCount; i++) {
            const mesh = this.textureFactory.createCardMesh(new UnoCard('deck', 'wild', 'wild'), true);
            mesh.rotation.x = Math.PI / 2; // Flat face-down
            mesh.rotation.y = 0;
            mesh.rotation.z = (Math.random() - 0.5) * 0.05;
            mesh.position.set(-1.25, 0.02 + i * 0.022, 0);
            this.scene.add(mesh);
            this.drawPileMeshes.push(mesh);
        }

        // Table center draw collider for effortless mobile touch
        const drawColliderGeo = new THREE.CylinderGeometry(2.2, 2.2, 1.2, 24);
        const drawColliderMat = new THREE.MeshBasicMaterial({ visible: false });
        this.drawHitCollider = new THREE.Mesh(drawColliderGeo, drawColliderMat);
        this.drawHitCollider.position.set(-1.25, 0.25, 0);
        this.scene.add(this.drawHitCollider);

        // 2. Discard Pile (right stack: x = 1.25, z = 0)
        const topCard = this.rules.getTopCard();
        if (topCard) {
            const discardCount = Math.min(this.rules.discardPile.length, 5);
            for (let i = 0; i < discardCount; i++) {
                const card = (i === discardCount - 1) ? topCard : this.rules.discardPile[this.rules.discardPile.length - discardCount + i] || topCard;
                const mesh = this.textureFactory.createCardMesh(card, false);
                mesh.rotation.x = -Math.PI / 2; // Flat face-up
                mesh.rotation.z = ((i * 19) % 30 - 15) * Math.PI / 180;
                mesh.position.set(1.25, 0.02 + i * 0.022, 0);
                this.scene.add(mesh);
                this.discardMeshes.push(mesh);
            }
        }

        // 3. Player Hand - Multi-Tier Layout (1 Line <= 5 cards, 2 Lines 6-10 cards, 3 Lines > 10 cards)
        // Group cards into sequential rows (Back, Middle, Front) with clean Y and Z stadium elevation,
        // so cards NEVER jump between rows and NEVER clip through each other!
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isMobile = width < 700 || (width / height) < 0.85;

        const p1Cards = this.rules.playersHands[0] || [];
        const count = p1Cards.length;

        // Partition cards into sequential tiers
        let tiers = [];
        if (count <= 5) {
            tiers = [{ cards: p1Cards, y: 1.15, z: 3.65 }];
        } else if (count <= 10) {
            const row0Count = Math.ceil(count / 2);
            tiers = [
                { cards: p1Cards.slice(0, row0Count), y: 1.55, z: 3.00 },
                { cards: p1Cards.slice(row0Count), y: 0.95, z: 3.90 }
            ];
        } else {
            const row0Count = Math.ceil(count / 3);
            const remaining = count - row0Count;
            const row1Count = Math.ceil(remaining / 2);
            tiers = [
                { cards: p1Cards.slice(0, row0Count), y: 1.85, z: 2.50 },
                { cards: p1Cards.slice(row0Count, row0Count + row1Count), y: 1.30, z: 3.35 },
                { cards: p1Cards.slice(row0Count + row1Count), y: 0.75, z: 4.20 }
            ];
        }

        tiers.forEach((tier) => {
            const tierCards = tier.cards;
            const tierCount = tierCards.length;
            const maxSpread = isMobile ? 3.4 : 5.8;
            const spacing = Math.min(maxSpread / Math.max(tierCount - 1, 1), isMobile ? 0.62 : 1.10);

            tierCards.forEach((card, j) => {
                const mesh = this.textureFactory.createCardMesh(card, false);
                const isPlayable = this.rules.isCardPlayable(card, 0) && (this.rules.currentPlayer === 0);

                const centerOffset = j - (tierCount - 1) / 2;
                const x = centerOffset * spacing;
                // Tiny Z micro-stagger within row so cards sit cleanly on top of each other without polygon clipping
                let y = tier.y - Math.abs(centerOffset) * 0.015;
                let z = tier.z + j * 0.018;
                const rotZ = -centerOffset * 0.02;

                if (isPlayable) {
                    y += 0.28;
                    z += 0.04;
                }

                mesh.position.set(x, y, z);
                mesh.rotation.set(-0.30, 0, rotZ);
                mesh.userData.baseY = y;
                mesh.userData.baseZ = z;
                mesh.userData.isPlayable = isPlayable;
                mesh.userData.card = card;

                this.scene.add(mesh);
                this.playerCardMeshes.push(mesh);
            });
        });

        // 4. Opponent Hand (Dual-face back texture guarantees no peeking)
        const p2Cards = this.rules.playersHands[1] || [];
        const oppCount = p2Cards.length;
        const oppMaxSpread = isMobile ? 3.2 : 5.0;
        const oppSpacing = Math.min(oppMaxSpread / Math.max(oppCount - 1, 1), isMobile ? 0.45 : 0.65);

        p2Cards.forEach((card, i) => {
            const mesh = this.textureFactory.createCardMesh(card, true);
            const centerOffset = i - (oppCount - 1) / 2;
            const x = centerOffset * oppSpacing;
            const y = 1.05 - Math.abs(centerOffset) * 0.02;
            const z = -3.4 + Math.abs(centerOffset) * 0.05 + i * 0.01;
            const rotZ = centerOffset * (isMobile ? 0.035 : 0.025);

            mesh.position.set(x, y, z);
            mesh.rotation.set(Math.PI - 0.30, 0, rotZ);
            this.scene.add(mesh);
            this.opponentCardMeshes.push(mesh);
        });

        // 5. Update Center Aura Ring Color
        if (this.colorGlowMesh && this.rules.activeColor) {
            const hex = UNO_COLOR_HEX[this.rules.activeColor] || 0xb91c1c;
            this.colorGlowMesh.material.color.setHex(hex);
        }
    }

    // -------------------------------------------------------------
    // PLAYER ACTIONS
    // -------------------------------------------------------------
    handlePlayerPlayCard(card) {
        // If a challenge is pending against player 0, tapping a card accepts the +4 penalty
        if (this.rules.pendingChallenge && this.rules.pendingChallenge.challengerIdx === 0) {
            this.handleWild4ChallengeDecision(false);
            return;
        }

        if (this.rules.currentPlayer !== 0) {
            this.updateBanner('Wait for your turn! Uno Bot is playing.');
            return;
        }

        if (!this.rules.isCardPlayable(card, 0)) {
            this.audio.playPenalty();
            this.wiggleCardRefusal(card.id);
            const top = this.rules.getTopCard();
            const colorName = (this.rules.activeColor || '').toUpperCase();
            const valName = top ? top.getLabel() : '';
            this.updateBanner(`Cannot play ${card.getLabel()}. Match color ${colorName} or value ${valName}!`);
            return;
        }

        // Wild Card requires color choice dialog
        if (card.isWild()) {
            this.selectedWildCardId = card.id;
            const choosingPlayer = (typeof this.rules.currentPlayer === 'number') ? this.rules.currentPlayer : 0;
            this.populateWildColorPickerHand(choosingPlayer);
            if (this.dom.wildModal) {
                this.dom.wildModal.classList.add('active');
            }
            return;
        }

        this.executeCardPlay(0, card.id, null);
    }

    populateWildColorPickerHand(playerIdx) {
        const handContainer = document.getElementById('wild-hand-cards');
        const countLabel = document.getElementById('wild-hand-count');
        const countRedEl = document.getElementById('wild-count-red');
        const countBlueEl = document.getElementById('wild-count-blue');
        const countGreenEl = document.getElementById('wild-count-green');
        const countYellowEl = document.getElementById('wild-count-yellow');

        if (!handContainer) return;

        // Strictly fetch ONLY the choosing player's hand (never opponent cards)
        const hand = this.rules.playersHands[playerIdx] || [];
        // Exclude the wild card being played right now
        const remainingCards = hand.filter(c => c && c.id !== this.selectedWildCardId);

        if (countLabel) {
            countLabel.textContent = `${remainingCards.length} card${remainingCards.length === 1 ? '' : 's'}`;
        }

        // Color counter
        const counts = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
        remainingCards.forEach(c => {
            if (c.color in counts) {
                counts[c.color]++;
            }
        });

        if (countRedEl) countRedEl.textContent = `${counts.red}`;
        if (countBlueEl) countBlueEl.textContent = `${counts.blue}`;
        if (countGreenEl) countGreenEl.textContent = `${counts.green}`;
        if (countYellowEl) countYellowEl.textContent = `${counts.yellow}`;

        // Clear previous cards
        handContainer.innerHTML = '';

        if (remainingCards.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'wild-hand-empty';
            emptyEl.textContent = 'No remaining cards! (Last card played)';
            handContainer.appendChild(emptyEl);
            return;
        }

        // Render each card for ONLY the current choosing player
        remainingCards.forEach(card => {
            const cardEl = document.createElement('div');
            const colorClass = `card-${card.color}`;
            cardEl.className = `mini-uno-card ${colorClass}`;
            cardEl.title = `${card.color.toUpperCase()} ${card.getLabel()} (Tap to choose this color)`;

            const ovalEl = document.createElement('div');
            ovalEl.className = 'mini-card-oval';

            const valEl = document.createElement('span');
            valEl.className = 'mini-card-val';
            valEl.textContent = card.getLabel();

            ovalEl.appendChild(valEl);
            cardEl.appendChild(ovalEl);

            // Tapping a colored card in hand preview directly selects that color
            if (card.color !== 'wild') {
                cardEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.executeWildCardPlay(card.color);
                });
            }

            handContainer.appendChild(cardEl);
        });
    }

    executeWildCardPlay(chosenColor) {
        if (this.dom.wildModal) {
            this.dom.wildModal.classList.remove('active');
        }

        const validColors = ['red', 'blue', 'green', 'yellow'];
        const normalizedColor = (chosenColor && validColors.includes(String(chosenColor).toLowerCase()))
            ? String(chosenColor).toLowerCase()
            : 'red';

        // Retrieve card ID, with fail-safe fallback to first wild card in player's hand
        let cardId = this.selectedWildCardId;
        if (!cardId) {
            const hand = this.rules.playersHands[0] || [];
            const wildCard = hand.find(c => c && c.isWild && c.isWild());
            if (wildCard) {
                cardId = wildCard.id;
            }
        }
        this.selectedWildCardId = null;

        if (!cardId) {
            this.updateBanner('No Wild card found in hand to play.');
            return;
        }

        this.isProcessingMove = false;
        this.audio.playWildChime();
        this.executeCardPlay(0, cardId, normalizedColor);
    }

    cancelWildCardSelection() {
        if (this.dom.wildModal) {
            this.dom.wildModal.classList.remove('active');
        }
        this.selectedWildCardId = null;
        this.isProcessingMove = false;
        this.updateBanner('Color choice cancelled. Select a card or tap Draw.');
    }

    executeCardPlay(playerIdx, cardId, chosenColor) {
        if (this.autoDrawTimeout) {
            clearTimeout(this.autoDrawTimeout);
            this.autoDrawTimeout = null;
        }

        this.isProcessingMove = true;
        this.resetCardHover();

        const result = this.rules.playCard(playerIdx, cardId, chosenColor);
        if (!result.success) {
            this.isProcessingMove = false;
            this.updateBanner('Cannot play card: ' + result.reason);
            return;
        }

        if (playerIdx === 0 && this.dom.btnPass) {
            this.dom.btnPass.style.display = 'none';
            this.dom.btnPass.classList.remove('pulsing');
        }

        this.audio.playCardPlay();
        this.syncCards3D();

        // Broadcast to parent if in online mode
        if (this.mode === 'online' && playerIdx === 0) {
            window.parent?.postMessage({
                type: 'UNO_ACTION_TRIGGERED',
                actionType: 'play_card',
                payload: { cardId, chosenColor }
            }, '*');
        }

        // If Player 0 played Wild+4, Bot decides challenge promptly
        if (result.effect === 'wild4' && result.pendingChallenge) {
            this.updateBanner(`You played WILD +4! Active color is ${chosenColor.toUpperCase()}. Uno Bot is deciding challenge...`);
            setTimeout(() => {
                const botShouldChallenge = (this.rules.playersHands[0].length >= 3 && Math.random() < 0.40);
                this.rules.resolveWild4Challenge(1, botShouldChallenge);
                this.syncCards3D();
                this.isProcessingMove = false;

                if (this.rules.currentPlayer === 1 && !this.rules.isGameOver) {
                    this.checkBotTurn();
                } else if (this.rules.currentPlayer === 0 && !this.rules.isGameOver) {
                    this.updateBanner(`Uno Bot accepted +4! Your turn to play matching ${chosenColor.toUpperCase()}.`);
                }
            }, 500);
            return;
        }

        // Check if next turn is Bot
        setTimeout(() => {
            this.isProcessingMove = false;
            if (this.rules.currentPlayer === 1 && this.mode === 'ai' && !this.rules.isGameOver) {
                this.checkBotTurn();
            }
        }, 550);
    }

    handleWild4ChallengeDecision(didChallenge) {
        if (this.dom.challengeModal) {
            this.dom.challengeModal.classList.remove('active');
        }

        this.rules.resolveWild4Challenge(0, didChallenge);
        this.syncCards3D();
        this.isProcessingMove = false;

        if (this.rules.currentPlayer === 1 && !this.rules.isGameOver) {
            setTimeout(() => this.checkBotTurn(), 850);
        }
    }

    handlePlayerDraw() {
        // If a challenge is pending against player 0, tapping draw accepts the +4 penalty
        if (this.rules.pendingChallenge && this.rules.pendingChallenge.challengerIdx === 0) {
            this.handleWild4ChallengeDecision(false);
            return;
        }

        if (this.rules.currentPlayer !== 0) {
            this.updateBanner('Wait for your turn! Uno Bot is thinking.');
            return;
        }
        if (this.rules.hasDrawnThisTurn) {
            this.updateBanner('You already drew 1 card. Play any matching card or tap PASS.');
            return;
        }

        if (this.autoDrawTimeout) {
            clearTimeout(this.autoDrawTimeout);
            this.autoDrawTimeout = null;
        }

        this.isProcessingMove = true;
        this.audio.playCardDraw();

        const drawRes = this.rules.playerDrawCard(0);
        this.syncCards3D();

        if (this.mode === 'online') {
            window.parent?.postMessage({
                type: 'UNO_ACTION_TRIGGERED',
                actionType: 'draw_card',
                payload: {}
            }, '*');
        }

        const playableAfterDraw = this.rules.getPlayableCards(0);
        if (playableAfterDraw.length > 0) {
            const cardName = drawRes && drawRes.card ? drawRes.card.getLabel() : 'Card';
            this.updateBanner(`You drew ${cardName}. Play any matching card, or tap PASS.`);
            if (this.dom.btnPass) {
                this.dom.btnPass.style.display = 'inline-flex';
                this.dom.btnPass.classList.remove('pulsing');
            }
            this.isProcessingMove = false;
        } else {
            const cardName = drawRes && drawRes.card ? drawRes.card.getLabel() : 'Card';
            this.updateBanner(`Card drawn (${cardName}) cannot be played. Tap PASS to end your turn.`);
            if (this.dom.btnPass) {
                this.dom.btnPass.style.display = 'inline-flex';
                this.dom.btnPass.classList.add('pulsing');
            }
            this.isProcessingMove = false;
        }
    }

    handlePlayerPass() {
        if (this.rules.currentPlayer !== 0) return;
        if (!this.rules.hasDrawnThisTurn) {
            this.updateBanner('Classic UNO rule: You must draw 1 card before passing.');
            return;
        }

        if (this.autoDrawTimeout) {
            clearTimeout(this.autoDrawTimeout);
            this.autoDrawTimeout = null;
        }

        if (this.dom.btnPass) {
            this.dom.btnPass.style.display = 'none';
            this.dom.btnPass.classList.remove('pulsing');
        }
        this.rules.passTurn(0);
        this.syncCards3D();
        this.checkBotTurn();
    }

    handlePlayerUnoShout() {
        const called = this.rules.callUno(0);
        if (called) {
            this.audio.playUnoCall();
            this.dom.btnUno.classList.remove('pulsing');
            this.updateBanner('UNO! You called UNO and are protected!');

            if (this.mode === 'online') {
                window.parent?.postMessage({
                    type: 'UNO_ACTION_TRIGGERED',
                    actionType: 'call_uno',
                    payload: {}
                }, '*');
            }
        }
    }

    handlePlayerCatchUno() {
        const caught = this.rules.catchUno(0, 1);
        if (caught) {
            this.audio.playPenalty();
            this.updateBanner('Caught! Opponent forgot UNO and draws 2 penalty cards!');
            this.syncCards3D();

            if (this.mode === 'online') {
                window.parent?.postMessage({
                    type: 'UNO_ACTION_TRIGGERED',
                    actionType: 'catch_uno',
                    payload: {}
                }, '*');
            }
        }
    }

    handleNextRoundClick() {
        if (this.dom.victoryModal) {
            this.dom.victoryModal.classList.remove('active');
        }
        if (this.rules.matchWinner !== null) {
            this.rules.startNewGame();
        } else {
            this.rules.startNewRound();
        }
        this.syncCards3D();
    }

    // Refusal wiggle animation when illegal card is tapped
    wiggleCardRefusal(cardId) {
        const mesh = this.playerCardMeshes.find(m => m.userData.card?.id === cardId);
        if (!mesh) return;

        const origX = mesh.position.x;
        const startTime = performance.now();
        const duration = 280;

        const anim = (now) => {
            const elapsed = now - startTime;
            if (elapsed < duration) {
                const offset = Math.sin((elapsed / duration) * Math.PI * 6) * 0.12;
                mesh.position.x = origX + offset;
                requestAnimationFrame(anim);
            } else {
                mesh.position.x = origX;
            }
        };
        requestAnimationFrame(anim);
    }

    // -------------------------------------------------------------
    // BOT AI TURN EXECUTION
    // -------------------------------------------------------------
    checkBotTurn() {
        if (this.rules.isGameOver) {
            this.isProcessingMove = false;
            return;
        }
        if (this.rules.currentPlayer !== 1 || this.mode !== 'ai') {
            this.isProcessingMove = false;
            return;
        }

        this.isProcessingMove = true;
        this.updateBanner('Uno Bot is thinking...');
        this.dom.cardP2.classList.add('active-turn');
        this.dom.cardP1.classList.remove('active-turn');

        setTimeout(() => {
            const move = this.rules.getBestBotMove(1);

            // Bot Uno shout check
            if (move.shouldCallUno) {
                this.rules.callUno(1);
                this.audio.playUnoCall();
            }

            if (move.action === 'play') {
                const playResult = this.rules.playCard(1, move.card.id, move.chosenColor);
                if (!playResult.success) {
                    this.rules.playerDrawCard(1);
                    this.rules.passTurn(1);
                    this.isProcessingMove = false;
                    this.syncCards3D();
                    return;
                }
                this.audio.playCardPlay();
                this.syncCards3D();

                const playedCard = move.card;
                const label = playedCard ? playedCard.getLabel() : '';
                const color = (this.rules.activeColor || '').toUpperCase();

                // If Bot played Wild+4, show challenge modal to Human
                if (playResult.effect === 'wild4' && playResult.pendingChallenge) {
                    if (this.dom.challengeModal) {
                        this.dom.challengeModal.classList.add('active');
                    }
                    if (this.dom.wild4ChallengeDesc) {
                        this.dom.wild4ChallengeDesc.innerText = `Uno Bot played WILD +4! Active color chosen: ${color}. Do you want to challenge? If Bot held matching color, Bot draws 4 cards! If innocent, you draw 6 cards.`;
                    }
                    this.updateBanner(`Uno Bot played WILD +4! Choose CHALLENGE or ACCEPT.`);
                    this.isProcessingMove = false;
                    return;
                }

                if (playResult.effect === 'skip' || playResult.effect === 'reverse_2p_skip') {
                    this.updateBanner(`Uno Bot played SKIP! You lose your turn. Uno Bot plays again.`);
                } else if (playResult.effect === 'draw2') {
                    this.updateBanner(`Uno Bot played +2! You drew 2 penalty cards.`);
                } else {
                    this.updateBanner(`Uno Bot played ${color} ${label}. Your turn!`);
                }

                // If bot played Skip, Reverse (in 2p), or Draw 2, next player is Bot again
                if (this.rules.currentPlayer === 1 && !this.rules.isGameOver) {
                    setTimeout(() => this.checkBotTurn(), 1100);
                } else {
                    this.isProcessingMove = false;
                }
            } else {
                // Bot draws
                this.audio.playCardDraw();
                const drawRes = this.rules.playerDrawCard(1);
                this.syncCards3D();

                if (drawRes && drawRes.isPlayable) {
                    // Bot plays drawn card immediately
                    setTimeout(() => {
                        const botBest = this.rules.getBestBotMove(1);
                        this.rules.playCard(1, drawRes.card.id, botBest.chosenColor || 'blue');
                        this.audio.playCardPlay();
                        this.syncCards3D();
                        this.updateBanner(`Uno Bot drew and played a matching card! Your turn.`);

                        if (this.rules.currentPlayer === 1 && !this.rules.isGameOver) {
                            setTimeout(() => this.checkBotTurn(), 1100);
                        } else {
                            this.isProcessingMove = false;
                        }
                    }, 650);
                } else {
                    this.rules.passTurn(1);
                    this.updateBanner(`Uno Bot drew a card and passed. Your turn!`);
                    this.isProcessingMove = false;
                }
            }
        }, 850);
    }

    // -------------------------------------------------------------
    // EVENT & STATE BINDING
    // -------------------------------------------------------------
    onGameEvent(type, data) {
        if (type === 'card_played') {
            if (data.effect === 'skip') {
                this.audio.playSkip();
                this.updateBanner(`${this.rules.playerNames[data.playerIdx]} played SKIP! Turn skipped.`);
            } else if (data.effect === 'reverse_2p_skip' || data.effect === 'reverse') {
                this.audio.playReverse();
                this.updateBanner(`${this.rules.playerNames[data.playerIdx]} played REVERSE!`);
            } else if (data.effect === 'draw2') {
                this.audio.playDrawAttack(2);
                this.updateBanner(`${this.rules.playerNames[data.playerIdx]} played +2! Opponent draws 2.`);
            } else if (data.effect === 'wild') {
                this.audio.playWildChime();
                this.updateBanner(`${this.rules.playerNames[data.playerIdx]} chose color ${data.activeColor.toUpperCase()}.`);
            }
        } else if (type === 'wild4_challenge_result') {
            if (data.success) {
                this.audio.playPenalty();
                this.updateBanner(`Challenge Succeeded! ${this.rules.playerNames[data.guiltyPlayer]} was caught with matching color and drew ${data.penaltyCount} cards!`);
            } else {
                this.audio.playPenalty();
                this.updateBanner(`Challenge Failed! Opponent was innocent. ${this.rules.playerNames[data.challenger]} drew ${data.penaltyCount} penalty cards!`);
            }
        } else if (type === 'wild4_accepted') {
            this.audio.playDrawAttack(4);
            this.updateBanner(`${this.rules.playerNames[data.victim]} accepted Wild +4 and drew 4 cards.`);
        } else if (type === 'uno_called') {
            this.updateBanner(`${data.playerName} shouts UNO! (1 card remaining)`);
        } else if (type === 'uno_caught') {
            this.updateBanner(`${data.catcherName} CAUGHT ${data.targetName} without saying UNO! (+2 penalty)`);
        } else if (type === 'game_won') {
            this.audio.playVictory();
            if (data.isMatchWon) {
                this.dom.victoryTitle.innerText = `${data.matchWinnerName} Won the Match!`;
                this.dom.victoryDesc.innerText = `Reached 500+ points! Total Score: ${data.totalScore} pts!`;
                this.dom.btnPlayAgain.innerHTML = `<i class="fa-solid fa-rotate-right"></i> New Match`;
            } else {
                this.dom.victoryTitle.innerText = `${data.winnerName} Won the Round!`;
                this.dom.victoryDesc.innerText = `Scored +${data.roundPoints} points this round! Total: ${data.totalScore} / 500 pts`;
                this.dom.btnPlayAgain.innerHTML = `<i class="fa-solid fa-play"></i> Next Round`;
            }
            this.dom.victoryModal.classList.add('active');
        }
    }

    onGameStateUpdate(state) {
        // Active Turn Highlighting
        const isMyTurn = state.currentPlayer === 0;
        if (isMyTurn) {
            this.dom.cardP1.classList.add('active-turn');
            this.dom.cardP2.classList.remove('active-turn');
            const top = state.topCard;
            const topVal = top ? top.getLabel() : '';
            const topCol = (state.activeColor || '').toUpperCase();

            if (state.hasDrawnThisTurn) {
                if (this.dom.btnPass) this.dom.btnPass.style.display = 'inline-flex';
                if (this.dom.btnDraw) this.dom.btnDraw.classList.remove('pulsing');
                const playableCards = this.rules.getPlayableCards(0);
                if (playableCards.length > 0) {
                    this.updateBanner(`You drew a card. Play any matching card, or tap PASS.`);
                    if (this.dom.btnPass) this.dom.btnPass.classList.remove('pulsing');
                } else {
                    this.updateBanner(`Drawn card cannot be played. Tap PASS to end your turn.`);
                    if (this.dom.btnPass) this.dom.btnPass.classList.add('pulsing');
                }
            } else {
                if (this.dom.btnPass) {
                    this.dom.btnPass.style.display = 'none';
                    this.dom.btnPass.classList.remove('pulsing');
                }
                const playableCards = this.rules.getPlayableCards(0);
                if (playableCards.length === 0) {
                    this.updateBanner(`No matching card (${topCol} or ${topVal}). Tap DRAW pile to draw a card.`);
                    if (this.dom.btnDraw) this.dom.btnDraw.classList.add('pulsing');
                } else {
                    if (this.dom.btnDraw) this.dom.btnDraw.classList.remove('pulsing');
                    this.updateBanner(`Your Turn: Play any ${topCol} card, or match ${topVal}, or tap Draw.`);
                }
            }
        } else {
            if (this.autoDrawTimeout) {
                clearTimeout(this.autoDrawTimeout);
                this.autoDrawTimeout = null;
            }
            this.dom.cardP2.classList.add('active-turn');
            this.dom.cardP1.classList.remove('active-turn');
            if (this.dom.btnPass) {
                this.dom.btnPass.style.display = 'none';
                this.dom.btnPass.classList.remove('pulsing');
            }
            if (this.dom.btnDraw) this.dom.btnDraw.classList.remove('pulsing');
        }

        // Card Counts
        this.dom.countP1.innerText = `${state.playersCardsCount[0]} cards`;
        this.dom.countP2.innerText = `${state.playersCardsCount[1]} cards`;
        this.dom.scoreP1.innerText = `${state.scores[0]} pts`;
        this.dom.scoreP2.innerText = `${state.scores[1]} pts`;

        // Active Color Pill
        if (this.dom.activeColorBadge && state.activeColor) {
            this.dom.activeColorBadge.className = `active-color-pill color-${state.activeColor}`;
            this.dom.activeColorText.innerText = state.activeColor.toUpperCase();
        }

        // UNO Button Status
        if (state.playersCardsCount[0] === 2 || state.playersCardsCount[0] === 1) {
            this.dom.btnUno.classList.add('pulsing');
        } else {
            this.dom.btnUno.classList.remove('pulsing');
        }

        // Catch Button: Show if opponent has 1 card and hasn't called Uno
        if (state.playersCardsCount[1] === 1 && !state.saidUno[1]) {
            this.dom.btnCatch.style.display = 'inline-flex';
        } else {
            this.dom.btnCatch.style.display = 'none';
        }
    }

    updateBanner(msg) {
        if (this.dom.banner) {
            this.dom.banner.innerText = msg;
        }
    }

    animate() {
        requestAnimationFrame(this.animate);

        if (this.controls) {
            this.controls.update();
        }

        // Gentle floating animation on color aura ring
        if (this.colorGlowMesh) {
            this.colorGlowMesh.rotation.z += 0.008 * this.rules.direction;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.unoGame = new Uno3DGame();
});
