// 3D UNO Party - Three.js Interactive Gameplay Engine
// Handles 3D table rendering, raycasting, card fanning, animation tweens, and game state binding

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
        this.discardMeshes = [];
        this.playerCardMeshes = [];
        this.opponentCardMeshes = [];
        this.directionRingMesh = null;
        this.colorGlowMesh = null;

        // Interactive States
        this.hoveredCardMesh = null;
        this.animatingCards = []; // Active tween animations
        this.isProcessingMove = false;
        this.selectedWildCardId = null;

        // Camera presets
        this.cameraModes = {
            orbit: { pos: new THREE.Vector3(0, 9.2, 7.8), target: new THREE.Vector3(0, -0.4, 0.2) },
            hand: { pos: new THREE.Vector3(0, 7.2, 6.0), target: new THREE.Vector3(0, -0.5, 0.4) },
            top: { pos: new THREE.Vector3(0, 12.5, 1.2), target: new THREE.Vector3(0, 0, 0) }
        };
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

        // Start round
        this.rules.startNewGame();
        this.syncCards3D();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x080914, 0.022);

        this.camera = new THREE.PerspectiveCamera(
            window.innerWidth < 650 ? 54 : 45,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        const preset = this.cameraModes[this.currentViewMode];
        this.camera.position.copy(preset.pos);
        this.camera.lookAt(preset.target);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x080914);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xffffff, 1.4);
        spotLight.position.set(0, 14, 2);
        spotLight.angle = Math.PI / 3;
        spotLight.penumbra = 0.5;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        this.scene.add(spotLight);

        // OrbitControls for smooth background 3D table inspection
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.maxPolarAngle = Math.PI / 2.15;
        this.controls.minDistance = 5.0;
        this.controls.maxDistance = 16.0;
        this.controls.target.copy(preset.target);
    }

    initTable() {
        // Luxury Modern Gaming Table
        this.tableGroup = new THREE.Group();

        // 1. Table Felt Top (Rich midnight indigo table surface)
        const tableGeo = new THREE.CylinderGeometry(6.6, 6.6, 0.35, 64);
        const tableMat = new THREE.MeshStandardMaterial({
            color: 0x11162b,
            roughness: 0.75,
            metalness: 0.1
        });
        const tableMesh = new THREE.Mesh(tableGeo, tableMat);
        tableMesh.position.y = -0.175;
        tableMesh.receiveShadow = true;
        this.tableGroup.add(tableMesh);

        // 2. Glowing Neon Border Rim
        const rimGeo = new THREE.TorusGeometry(6.7, 0.18, 16, 64);
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0x312e81,
            emissive: 0x4338ca,
            emissiveIntensity: 0.5,
            roughness: 0.3,
            metalness: 0.4
        });
        const rimMesh = new THREE.Mesh(rimGeo, rimMat);
        rimMesh.rotation.x = Math.PI / 2;
        rimMesh.position.y = 0.02;
        this.tableGroup.add(rimMesh);

        // 3. Central Playfield Mat
        const playMatGeo = new THREE.CircleGeometry(3.6, 48);
        const playMatMat = new THREE.MeshStandardMaterial({
            color: 0x181e38,
            roughness: 0.85,
            metalness: 0.05
        });
        const playMat = new THREE.Mesh(playMatGeo, playMatMat);
        playMat.rotation.x = -Math.PI / 2;
        playMat.position.y = 0.005;
        playMat.receiveShadow = true;
        this.tableGroup.add(playMat);

        // 4. Direction & Active Color Aura Ring
        const ringGeo = new THREE.RingGeometry(1.65, 1.85, 48);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75
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
        document.getElementById('btn-rotate-board')?.addEventListener('click', () => this.rotateViewAngle(Math.PI / 4));
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
        document.querySelectorAll('.btn-color-choice').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = e.currentTarget.getAttribute('data-color');
                this.executeWildCardPlay(color);
            });
        });

        // Replay button
        this.dom.btnPlayAgain?.addEventListener('click', () => {
            this.dom.victoryModal.classList.remove('active');
            this.rules.startNewGame();
            this.syncCards3D();
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
        if (!this.cameraModes[mode]) return;
        this.currentViewMode = mode;
        const preset = this.cameraModes[mode];

        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-view-${mode}`)?.classList.add('active');

        // Smooth camera tween
        this.tweenCamera(preset.pos, preset.target, 550);
    }

    rotateViewAngle(deltaAngle) {
        const offset = this.camera.position.clone().sub(this.controls.target);
        const radius = Math.sqrt(offset.x * offset.x + offset.z * offset.z);
        const currentAngle = Math.atan2(offset.z, offset.x);
        const targetAngle = currentAngle + deltaAngle;

        const targetPos = new THREE.Vector3(
            Math.cos(targetAngle) * radius,
            this.camera.position.y,
            Math.sin(targetAngle) * radius
        );
        this.tweenCamera(targetPos, this.controls.target, 400);
    }

    tweenCamera(targetPos, targetLookAt, duration = 500) {
        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const startTime = performance.now();

        const anim = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            const ease = 0.5 - Math.cos(progress * Math.PI) / 2;

            this.camera.position.lerpVectors(startPos, targetPos, ease);
            this.controls.target.lerpVectors(startTarget, targetLookAt, ease);

            if (progress < 1.0) {
                requestAnimationFrame(anim);
            }
        };
        requestAnimationFrame(anim);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.fov = width < 650 ? 54 : 45;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    onPointerMove(e) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        if (this.isProcessingMove) return;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.playerCardMeshes, false);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            if (this.hoveredCardMesh !== hitMesh) {
                this.resetCardHover();
                this.hoveredCardMesh = hitMesh;
                // Lift card up on hover
                hitMesh.position.y = (hitMesh.userData.baseY || 0) + 0.35;
                hitMesh.position.z = (hitMesh.userData.baseZ || 0) + 0.2;
                document.body.style.cursor = 'pointer';
            }
        } else {
            this.resetCardHover();
            // Check draw pile hover
            const drawIntersects = this.raycaster.intersectObjects(this.drawPileMeshes, false);
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
        if (e.button !== 0) return; // Left click only
        if (this.isProcessingMove) return;
        if (this.rules.isGameOver) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // 1. Check player hand clicks
        const cardIntersects = this.raycaster.intersectObjects(this.playerCardMeshes, false);
        if (cardIntersects.length > 0 && this.rules.currentPlayer === 0) {
            const mesh = cardIntersects[0].object;
            const card = mesh.userData.card;
            if (card) {
                this.handlePlayerPlayCard(card);
            }
            return;
        }

        // 2. Check draw pile click
        const drawIntersects = this.raycaster.intersectObjects(this.drawPileMeshes, false);
        if (drawIntersects.length > 0 && this.rules.currentPlayer === 0) {
            this.handlePlayerDraw();
            return;
        }
    }

    // -------------------------------------------------------------
    // CARD RECONCILIATION & 3D LAYOUT
    // -------------------------------------------------------------
    syncCards3D() {
        // Clear previous meshes
        this.playerCardMeshes.forEach(m => this.scene.remove(m));
        this.opponentCardMeshes.forEach(m => this.scene.remove(m));
        this.drawPileMeshes.forEach(m => this.scene.remove(m));
        this.discardMeshes.forEach(m => this.scene.remove(m));

        this.playerCardMeshes = [];
        this.opponentCardMeshes = [];
        this.drawPileMeshes = [];
        this.discardMeshes = [];

        // 1. Draw Pile (left stack: x = -1.3, z = 0)
        const drawStackCount = Math.min(Math.max(this.rules.deck.length, 3), 14);
        for (let i = 0; i < drawStackCount; i++) {
            const mesh = this.textureFactory.createCardMesh(new UnoCard('deck', 'wild', 'wild'));
            mesh.rotation.x = Math.PI / 2; // Flat face-down
            mesh.rotation.y = 0;
            mesh.rotation.z = (Math.random() - 0.5) * 0.05;
            mesh.position.set(-1.25, 0.02 + i * 0.022, 0);
            this.scene.add(mesh);
            this.drawPileMeshes.push(mesh);
        }

        // 2. Discard Pile (right stack: x = 1.25, z = 0)
        const topCard = this.rules.getTopCard();
        if (topCard) {
            const discardCount = Math.min(this.rules.discardPile.length, 5);
            for (let i = 0; i < discardCount; i++) {
                const card = (i === discardCount - 1) ? topCard : this.rules.discardPile[this.rules.discardPile.length - discardCount + i] || topCard;
                const mesh = this.textureFactory.createCardMesh(card);
                mesh.rotation.x = -Math.PI / 2; // Flat face-up
                mesh.rotation.z = ((i * 19) % 30 - 15) * Math.PI / 180;
                mesh.position.set(1.25, 0.02 + i * 0.022, 0);
                this.scene.add(mesh);
                this.discardMeshes.push(mesh);
            }
        }

        // 3. Player Hand (Bottom Arc)
        const p1Cards = this.rules.playersHands[0] || [];
        const count = p1Cards.length;
        const maxFanAngle = Math.min(count * 0.065, 0.55);
        const cardSpacing = Math.min(3.8 / Math.max(count, 5), 0.72);

        p1Cards.forEach((card, i) => {
            const mesh = this.textureFactory.createCardMesh(card);
            const centerOffset = i - (count - 1) / 2;
            const x = centerOffset * cardSpacing;
            const y = 0.5 - Math.abs(centerOffset) * 0.04;
            const z = 3.65 - Math.abs(centerOffset) * 0.07;
            const rotZ = -centerOffset * (maxFanAngle / Math.max(count, 1));

            mesh.position.set(x, y, z);
            mesh.rotation.set(-0.38, 0, rotZ); // Slightly tilted up towards camera
            mesh.userData.baseY = y;
            mesh.userData.baseZ = z;

            this.scene.add(mesh);
            this.playerCardMeshes.push(mesh);
        });

        // 4. Opponent Hand (Top Arc - Face Down)
        const p2Cards = this.rules.playersHands[1] || [];
        const oppCount = p2Cards.length;
        const oppSpacing = Math.min(3.4 / Math.max(oppCount, 5), 0.65);

        p2Cards.forEach((card, i) => {
            const mesh = this.textureFactory.createCardMesh(card);
            const centerOffset = i - (oppCount - 1) / 2;
            const x = centerOffset * oppSpacing;
            const y = 0.5 - Math.abs(centerOffset) * 0.03;
            const z = -3.4 + Math.abs(centerOffset) * 0.06;
            const rotZ = centerOffset * 0.04;

            mesh.position.set(x, y, z);
            mesh.rotation.set(Math.PI - 0.35, 0, rotZ); // Facing towards table / away from user
            this.scene.add(mesh);
            this.opponentCardMeshes.push(mesh);
        });

        // 5. Update Center Aura Ring Color
        if (this.colorGlowMesh && this.rules.activeColor) {
            const hex = UNO_COLOR_HEX[this.rules.activeColor] || 0xef4444;
            this.colorGlowMesh.material.color.setHex(hex);
        }
    }

    // -------------------------------------------------------------
    // PLAYER ACTIONS
    // -------------------------------------------------------------
    handlePlayerPlayCard(card) {
        if (!this.rules.isCardPlayable(card)) {
            this.audio.playPenalty();
            this.wiggleCardRefusal(card.id);
            this.updateBanner('Card must match active color or number!');
            return;
        }

        // Wild Card requires color choice dialog
        if (card.isWild()) {
            this.selectedWildCardId = card.id;
            this.dom.wildModal?.classList.add('active');
            return;
        }

        this.executeCardPlay(0, card.id, null);
    }

    executeWildCardPlay(chosenColor) {
        this.dom.wildModal?.classList.remove('active');
        if (!this.selectedWildCardId) return;

        const cardId = this.selectedWildCardId;
        this.selectedWildCardId = null;
        this.audio.playWildChime();
        this.executeCardPlay(0, cardId, chosenColor);
    }

    executeCardPlay(playerIdx, cardId, chosenColor) {
        this.isProcessingMove = true;
        this.resetCardHover();

        const result = this.rules.playCard(playerIdx, cardId, chosenColor);
        if (!result.success) {
            this.isProcessingMove = false;
            return;
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

        // Check if next turn is Bot
        setTimeout(() => {
            this.isProcessingMove = false;
            this.checkBotTurn();
        }, 600);
    }

    handlePlayerDraw() {
        if (this.isProcessingMove || this.rules.currentPlayer !== 0) return;

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

        if (drawRes && drawRes.isPlayable) {
            this.updateBanner('You drew a playable card! Play it or Pass.');
            this.dom.btnPass.style.display = 'inline-flex';
            this.isProcessingMove = false;
        } else {
            this.updateBanner('Card drawn was not playable. Turn passes.');
            setTimeout(() => {
                this.rules.passTurn(0);
                this.dom.btnPass.style.display = 'none';
                this.isProcessingMove = false;
                this.checkBotTurn();
            }, 750);
        }
    }

    handlePlayerPass() {
        if (this.rules.currentPlayer !== 0) return;
        this.dom.btnPass.style.display = 'none';
        this.rules.passTurn(0);
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
        if (this.rules.isGameOver) return;
        if (this.rules.currentPlayer !== 1 || this.mode !== 'ai') return;

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
                this.rules.playCard(1, move.card.id, move.chosenColor);
                this.audio.playCardPlay();
                this.syncCards3D();
            } else {
                // Bot draws
                this.audio.playCardDraw();
                const drawRes = this.rules.playerDrawCard(1);
                this.syncCards3D();

                if (drawRes && drawRes.isPlayable) {
                    // Bot plays drawn card
                    setTimeout(() => {
                        this.rules.playCard(1, drawRes.card.id, 'blue');
                        this.audio.playCardPlay();
                        this.syncCards3D();
                    }, 500);
                } else {
                    this.rules.passTurn(1);
                }
            }
        }, 900);
    }

    // -------------------------------------------------------------
    // EVENT & STATE BINDING
    // -------------------------------------------------------------
    onGameEvent(type, data) {
        if (type === 'card_played') {
            if (data.effect === 'skip') {
                this.audio.playSkip();
                this.updateBanner(`${this.rules.playerNames[data.playerIdx]} played SKIP! Next turn skipped.`);
            } else if (data.effect === 'reverse_2p_skip' || data.effect === 'reverse') {
                this.audio.playReverse();
                this.updateBanner(`${this.rules.playerNames[data.playerIdx]} played REVERSE!`);
            } else if (data.effect === 'draw2') {
                this.audio.playDrawAttack(2);
                this.updateBanner(`${this.rules.playerNames[data.playerIdx]} played +2! Opponent draws 2.`);
            } else if (data.effect === 'wild4') {
                this.audio.playDrawAttack(4);
                this.updateBanner(`${this.rules.playerNames[data.playerIdx]} played WILD +4! Color changed to ${data.activeColor.toUpperCase()}.`);
            } else if (data.effect === 'wild') {
                this.audio.playWildChime();
                this.updateBanner(`${this.rules.playerNames[data.playerIdx]} chose color ${data.activeColor.toUpperCase()}.`);
            }
        } else if (type === 'uno_called') {
            this.updateBanner(`${data.playerName} shouts UNO! (1 card remaining)`);
        } else if (type === 'uno_caught') {
            this.updateBanner(`${data.catcherName} CAUGHT ${data.targetName} without saying UNO! (+2 penalty)`);
        } else if (type === 'game_won') {
            this.audio.playVictory();
            this.dom.victoryTitle.innerText = `${data.winnerName} Wins!`;
            this.dom.victoryDesc.innerText = `Scored +${data.roundPoints} points this round! Total Score: ${data.totalScore}`;
            this.dom.victoryModal.classList.add('active');
        }
    }

    onGameStateUpdate(state) {
        // Active Turn Highlighting
        const isMyTurn = state.currentPlayer === 0;
        if (isMyTurn) {
            this.dom.cardP1.classList.add('active-turn');
            this.dom.cardP2.classList.remove('active-turn');
            this.updateBanner('Your Turn: Select a matching card or draw.');
        } else {
            this.dom.cardP2.classList.add('active-turn');
            this.dom.cardP1.classList.remove('active-turn');
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
