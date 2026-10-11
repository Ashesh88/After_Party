// Couples Royal 3D Carrom - Master Game Engine
// WebGL Three.js Renderer, Aiming System, Bot AI, Match State & Online Sync

class CarromGame {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.currentView = 'top'; // 'top', 'aim', 'orbit'
        this.mode = 'ai'; // 'ai', 'online', 'pass'

        // Online Multi-player state
        this.sessionCode = null;
        this.myRole = 'p1'; // 'p1' (White) or 'p2' (Black)
        this.myName = 'Player 1';
        this.opponentName = 'Opponent';

        // Match Scores
        this.scores = { p1: 0, p2: 0 };
        this.currentTurn = 'p1'; // 'p1' or 'p2'
        this.turnPockets = []; // Tracks pieces pocketed in current shot
        this.queenPendingCover = false; // Queen cover rule tracker
        this.queenCoverBy = null;

        // Aim & Striker
        this.aimAngle = 0; // In radians (0 = pointing straight up towards P2)
        this.shotPower = 0.65;
        this.strikerX = 0;
        this.isAiming = false;
        this.isDraggingStriker = false;

        this.initThree();
        this.setupEventListeners();
        this.parseURLParams();
        this.startMatch();
    }

    parseURLParams() {
        const params = new URLSearchParams(window.location.search);
        this.mode = params.get('mode') || 'ai';
        this.sessionCode = params.get('code') || null;
        this.myRole = params.get('role') || 'p1';
        this.myName = params.get('name') || (this.myRole === 'p1' ? 'You' : 'Player 2');
        this.opponentName = params.get('opponent') || (this.mode === 'ai' ? 'Carrom Bot' : 'Partner');

        const elNameP1 = document.getElementById('name-p1');
        const elNameP2 = document.getElementById('name-p2');
        if (this.myRole === 'p1') {
            if (elNameP1) elNameP1.textContent = this.myName;
            if (elNameP2) elNameP2.textContent = this.opponentName;
        } else {
            if (elNameP1) elNameP1.textContent = this.opponentName;
            if (elNameP2) elNameP2.textContent = this.myName;
        }
    }

    initThree() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x07070e);

        // Camera
        this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 1, 1000);

        // Renderer with soft shadow maps
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.15;
        this.controls.minDistance = 25;
        this.controls.maxDistance = 180;
        this.controls.enabled = false;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xfff7ed, 0.7);
        this.scene.add(ambientLight);

        // Overhead Spotlight mimicking carrom club table lamp
        const spotLight = new THREE.SpotLight(0xfffbf2, 1.8, 160, Math.PI / 3.2, 0.4, 1.0);
        spotLight.position.set(0, 65, 0);
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 2048;
        spotLight.shadow.mapSize.height = 2048;
        spotLight.shadow.bias = -0.0005;
        this.scene.add(spotLight);

        // Soft warm directional rim light
        const dirLight = new THREE.DirectionalLight(0xfef08a, 0.5);
        dirLight.position.set(30, 45, 30);
        this.scene.add(dirLight);

        // Subtle side fill light
        const fillLight = new THREE.DirectionalLight(0xe0e7ff, 0.35);
        fillLight.position.set(-30, 35, -30);
        this.scene.add(fillLight);

        // Build 3D Board and Pieces
        this.board = new CarromBoard3D(this.scene);
        this.piecesManager = new CarromPieces3D(this.scene);
        this.physics = new CarromPhysics(this.board, this.piecesManager);

        // Trajectory Guideline helper
        this.createAimGuide();

        // Physics callbacks
        this.physics.onPiecePocketed = (piece) => this.handlePiecePocketed(piece);
        this.physics.onAllStopped = () => this.handleShotComplete();

        // Establish proper initial top-down camera view AFTER controls & scene are ready
        this.setCameraView('top');

        // Render Loop
        this.clock = new THREE.Clock();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    createAimGuide() {
        // Dotted laser line for striker aim
        const points = [new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(0, 0.3, -35)];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineDashedMaterial({
            color: 0x10b981,
            dashSize: 1.2,
            gapSize: 0.8,
            linewidth: 2
        });
        this.aimLine = new THREE.Line(geo, mat);
        this.aimLine.computeLineDistances();
        this.aimLine.visible = true;
        this.scene.add(this.aimLine);

        // Target Impact Ring
        const ringGeo = new THREE.RingGeometry(1.2, 1.45, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide });
        this.targetRing = new THREE.Mesh(ringGeo, ringMat);
        this.targetRing.rotation.x = Math.PI / 2;
        this.targetRing.position.y = 0.15;
        this.targetRing.visible = false;
        this.scene.add(this.targetRing);
    }

    updateAimGuide() {
        if (!this.aimLine || !this.piecesManager.striker) return;

        const striker = this.piecesManager.striker;
        if (striker.isPocketed || this.physics.isTableBusy()) {
            this.aimLine.visible = false;
            this.targetRing.visible = false;
            return;
        }

        // Only show aim guide if it's your turn (or AI's turn during bot thought)
        const isMyTurn = (this.mode === 'ai' && this.currentTurn === 'p1') ||
                         (this.mode === 'online' && this.currentTurn === this.myRole) ||
                         (this.mode === 'pass');

        if (!isMyTurn) {
            this.aimLine.visible = false;
            this.targetRing.visible = false;
            return;
        }

        this.aimLine.visible = true;

        const startX = striker.x;
        const startZ = striker.z;

        // Angle in 3D: aimAngle is radians. Forward direction is (sin(a), 0, -cos(a))
        const dirX = Math.sin(this.aimAngle);
        const dirZ = -Math.cos(this.aimAngle);

        // Raycast to find first piece or cushion hit
        let hitDist = 55;
        let hitPiece = null;

        // Check piece intersections
        this.piecesManager.pieces.forEach(p => {
            if (p.isPocketed) return;
            const toPx = p.x - startX;
            const toPz = p.z - startZ;
            const proj = toPx * dirX + toPz * dirZ;
            if (proj > 0 && proj < hitDist) {
                const perpX = toPx - proj * dirX;
                const perpZ = toPz - proj * dirZ;
                const distToRay = Math.hypot(perpX, perpZ);
                if (distToRay < striker.radius + p.radius) {
                    hitDist = proj;
                    hitPiece = p;
                }
            }
        });

        const endX = startX + dirX * hitDist;
        const endZ = startZ + dirZ * hitDist;

        const positions = this.aimLine.geometry.attributes.position.array;
        positions[0] = startX;
        positions[1] = 0.25;
        positions[2] = startZ;
        positions[3] = endX;
        positions[4] = 0.25;
        positions[5] = endZ;
        this.aimLine.geometry.attributes.position.needsUpdate = true;
        this.aimLine.computeLineDistances();

        if (hitPiece) {
            this.targetRing.position.set(hitPiece.x, 0.15, hitPiece.z);
            this.targetRing.visible = true;
        } else {
            this.targetRing.visible = false;
        }
    }

    setCameraView(view) {
        this.currentView = view;
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-view-${view}`);
        if (activeBtn) activeBtn.classList.add('active');

        const aspect = window.innerWidth / window.innerHeight;
        const isPortrait = aspect < 1.0;
        const boardExtent = 84; // complete board footprint including outer frame & corner pockets

        // Camera half vertical FOV in radians (fov = 42 deg)
        const fovRad = (this.camera.fov * Math.PI) / 180;
        const tanHalfFov = Math.tan(fovRad / 2); // ~0.38386

        let camHeight;
        if (isPortrait) {
            // In portrait phones, screen width is the main constraint.
            // visibleWidth = 2 * d * tanHalfFov * aspect >= boardExtent * 1.16
            const dWidth = (boardExtent * 1.16) / (2 * tanHalfFov * aspect);
            // Also ensure vertical height leaves plenty of clear room for top and bottom HUDs
            const dHeight = (boardExtent * 1.65) / (2 * tanHalfFov);
            camHeight = Math.max(dWidth, dHeight);
        } else {
            // In landscape / desktop, screen height is the main constraint.
            // Board occupies ~65% of screen height to clear top and bottom HUDs
            camHeight = (boardExtent / (2 * tanHalfFov)) * 1.55;
        }

        if (view === 'top') {
            if (this.controls) this.controls.enabled = false;
            // Direct Top-Down Bird's Eye View with proper orientation (up: 0, 0, -1)
            this.camera.up.set(0, 0, -1);
            this.camera.position.set(0, camHeight, 0);
            this.camera.lookAt(0, 0, 0);
            if (this.controls) this.controls.target.set(0, 0, 0);
        } else if (view === 'aim') {
            if (this.controls) this.controls.enabled = false;
            this.camera.up.set(0, 1, 0);
            const sz = this.piecesManager?.striker?.z || 26;
            const sx = this.piecesManager?.striker?.x || 0;
            const sign = sz > 0 ? 1 : -1;
            const camDist = isPortrait ? 52 : 40;
            const camY = isPortrait ? 38 : 28;
            this.camera.position.set(sx * 0.35, camY, sz + sign * camDist);
            this.camera.lookAt(sx, 0, sz - sign * 25);
            if (this.controls) this.controls.target.set(sx, 0, sz - sign * 25);
        } else if (view === 'orbit') {
            this.camera.up.set(0, 1, 0);
            if (this.controls) {
                this.controls.enabled = true;
                const orbitDist = isPortrait ? 120 : 85;
                this.camera.position.set(0, orbitDist * 0.65, orbitDist * 0.85);
                this.controls.target.set(0, 0, 0);
                this.controls.update();
            }
        }
    }

    startMatch() {
        this.scores = { p1: 0, p2: 0 };
        this.currentTurn = 'p1';
        this.queenPendingCover = false;
        this.queenCoverBy = null;

        this.piecesManager.setupInitialRack();
        this.updateHUD();
        this.showStatus('Match Started: Position striker and take your aim.');

        this.positionStrikerForTurn();
    }

    positionStrikerForTurn() {
        // Player 1 baseline is at z = 26.0 (bottom)
        // Player 2 / Bot baseline is at z = -26.0 (top)
        const baselineZ = this.currentTurn === 'p1' ? 26.0 : -26.0;
        this.strikerX = 0;
        this.piecesManager.resetStriker(baselineZ, 0);

        // Default aim direction:
        // P1 aims upwards (angle = 0)
        // P2 aims downwards (angle = PI)
        this.aimAngle = this.currentTurn === 'p1' ? 0 : Math.PI;

        // Reset baseline slider to middle
        const slider = document.getElementById('slider-baseline');
        if (slider) slider.value = 0;

        if (this.currentView === 'aim') {
            this.setCameraView('aim');
        }

        // If it's Bot turn in AI mode
        if (this.mode === 'ai' && this.currentTurn === 'p2') {
            this.triggerBotTurn();
        }
    }

    handleStrikerSlide(val) {
        if (this.physics.isTableBusy()) return;
        const isMyTurn = (this.mode === 'ai' && this.currentTurn === 'p1') ||
                         (this.mode === 'online' && this.currentTurn === this.myRole) ||
                         (this.mode === 'pass');
        if (!isMyTurn) return;

        // Baseline range is -18.5 to +18.5
        const maxRange = 18.5;
        this.strikerX = (val / 100) * maxRange;

        const baselineZ = this.currentTurn === 'p1' ? 26.0 : -26.0;
        if (this.piecesManager.striker) {
            this.piecesManager.striker.x = this.strikerX;
            this.piecesManager.striker.z = baselineZ;
            if (this.piecesManager.striker.mesh) {
                this.piecesManager.striker.mesh.position.x = this.strikerX;
            }
        }

        if (this.currentView === 'aim') {
            this.setCameraView('aim');
        }
    }

    takeShot(customPower = null, customAngle = null, customX = null) {
        if (this.physics.isTableBusy()) return;

        const striker = this.piecesManager.striker;
        if (!striker || striker.isPocketed) return;

        const power = customPower !== null ? customPower : this.shotPower;
        const angle = customAngle !== null ? customAngle : this.aimAngle;
        const posX = customX !== null ? customX : this.strikerX;

        // Sync striker position
        striker.x = posX;
        striker.z = this.currentTurn === 'p1' ? 26.0 : -26.0;
        if (striker.mesh) {
            striker.mesh.position.x = posX;
            striker.mesh.position.z = striker.z;
        }

        // Calculate velocity vector
        // Power scalar between 1.8 and 4.2
        const speed = 1.4 + power * 3.2;
        striker.vx = Math.sin(angle) * speed;
        striker.vz = -Math.cos(angle) * speed;

        this.turnPockets = [];

        // Audio
        if (window.CarromAudio) {
            window.CarromAudio.playStrikerFlick(power);
        }

        // Notify parent Next.js if in online multiplayer
        if (this.mode === 'online' && customPower === null) {
            window.parent.postMessage({
                type: 'CARROM_SHOT_TAKEN',
                power,
                aimAngle: angle,
                strikerX: posX
            }, '*');
        }

        this.showStatus('Shot released. Watching the board...');
    }

    handlePiecePocketed(piece) {
        this.turnPockets.push(piece);

        if (piece.type === 'striker') {
            this.showStatus('FOUL: Striker pocketed in net.');
            return;
        }

        if (piece.type === 'queen') {
            this.showStatus('QUEEN POCKETED: Must cover with another piece.');
            return;
        }

        const pts = piece.points || 5;
        this.showStatus(`${piece.type.toUpperCase()} Piece Pocketed (+${pts} pts)`);
    }

    handleShotComplete() {
        let extraTurn = false;
        let strikerFoul = false;
        let legalPiecePocketed = false;

        // Check if striker was pocketed (Foul)
        const pocketedStriker = this.turnPockets.find(p => p.type === 'striker');
        if (pocketedStriker) {
            strikerFoul = true;
            // Penalty: -5 points or return a piece to center
            if (this.scores[this.currentTurn] >= 5) {
                this.scores[this.currentTurn] -= 5;
            }
        }

        // Tally pocketed pieces
        this.turnPockets.forEach(piece => {
            if (piece.type === 'striker') return;

            if (piece.type === 'queen') {
                this.queenPendingCover = true;
                this.queenCoverBy = this.currentTurn;
                extraTurn = true;
                return;
            }

            // Standard White or Black goti
            this.scores[this.currentTurn] += piece.points;
            legalPiecePocketed = true;
            extraTurn = true;
        });

        // Resolve Queen Cover Rule
        if (this.queenPendingCover && this.queenCoverBy === this.currentTurn) {
            if (legalPiecePocketed) {
                // Queen covered!
                this.scores[this.currentTurn] += 30;
                this.queenPendingCover = false;
                this.queenCoverBy = null;
                this.showStatus('QUEEN COVERED: +30 Points Bonus!');
            } else if (!this.turnPockets.find(p => p.type === 'queen')) {
                // Failed to cover queen on follow-up turn -> return queen to center
                const queenPiece = this.piecesManager.pieces.find(p => p.type === 'queen');
                if (queenPiece) {
                    queenPiece.isPocketed = false;
                    queenPiece.isFalling = false;
                    queenPiece.x = 0;
                    queenPiece.z = 0;
                    queenPiece.vx = 0;
                    queenPiece.vz = 0;
                    if (queenPiece.mesh) {
                        queenPiece.mesh.position.set(0, this.piecesManager.pieceHeight / 2, 0);
                        queenPiece.mesh.scale.set(1, 1, 1);
                        queenPiece.mesh.visible = true;
                    }
                }
                this.queenPendingCover = false;
                this.queenCoverBy = null;
                this.showStatus('Queen cover missed: Queen returned to board center.');
            }
        }

        // Striker foul overrides extra turn
        if (strikerFoul) {
            extraTurn = false;
        }

        // Check Game Over condition (all 19 pieces pocketed)
        const remainingPieces = this.piecesManager.pieces.filter(p => !p.isPocketed);
        if (remainingPieces.length === 0) {
            this.handleGameOver();
            return;
        }

        // Switch turn or continue
        if (!extraTurn) {
            this.currentTurn = this.currentTurn === 'p1' ? 'p2' : 'p1';
            const name = this.currentTurn === 'p1' ? this.myName : this.opponentName;
            this.showStatus(`Next Turn: ${name}`);
        } else {
            const name = this.currentTurn === 'p1' ? this.myName : this.opponentName;
            this.showStatus(`Extra Turn Awarded to ${name}!`);
        }

        this.updateHUD();
        this.positionStrikerForTurn();

        // Sync pieces state in multiplayer
        if (this.mode === 'online') {
            this.broadcastBoardSync();
        }
    }

    broadcastBoardSync() {
        const piecesData = this.piecesManager.pieces.map(p => ({
            id: p.id,
            type: p.type,
            x: p.x,
            z: p.z,
            isPocketed: p.isPocketed
        }));

        window.parent.postMessage({
            type: 'CARROM_SYNC_PIECES',
            piecesData,
            scores: this.scores,
            currentTurn: this.currentTurn
        }, '*');
    }

    triggerBotTurn() {
        this.showStatus('Carrom Bot is calculating optimal angle and power...');

        setTimeout(() => {
            if (this.currentTurn !== 'p2' || this.physics.isTableBusy()) return;

            // Find all active unpocketed pieces
            const targets = this.piecesManager.pieces.filter(p => !p.isPocketed);
            if (targets.length === 0) return;

            // Bot prefers Black pieces or Queen
            let bestPiece = targets.find(p => p.type === 'queen');
            if (!bestPiece) {
                bestPiece = targets.find(p => p.type === 'black') || targets[0];
            }

            // Select nearest corner pocket to target piece
            let bestPocket = this.board.pocketPositions[0];
            let minDist = 9999;
            this.board.pocketPositions.forEach(pocket => {
                const d = Math.hypot(bestPiece.x - pocket.x, bestPiece.z - pocket.z);
                if (d < minDist) {
                    minDist = d;
                    bestPocket = pocket;
                }
            });

            // Calculate ghost ball position (behind piece opposite to pocket direction)
            const toPocketX = bestPocket.x - bestPiece.x;
            const toPocketZ = bestPocket.z - bestPiece.z;
            const len = Math.hypot(toPocketX, toPocketZ) || 1;
            const normX = toPocketX / len;
            const normZ = toPocketZ / len;

            const ghostX = bestPiece.x - normX * (this.piecesManager.pieceRadius + this.piecesManager.strikerRadius);
            const ghostZ = bestPiece.z - normZ * (this.piecesManager.pieceRadius + this.piecesManager.strikerRadius);

            // Bot places striker on baseline at suitable X to get a clean line of sight
            let botX = Math.max(-18, Math.min(18, ghostX));
            // Add slight human-like randomness (+-0.6)
            botX += (Math.random() - 0.5) * 1.2;

            const baselineZ = -26.0;
            const shootDirX = ghostX - botX;
            const shootDirZ = ghostZ - baselineZ;
            let targetAngle = Math.atan2(shootDirX, -shootDirZ);

            // Power based on distance
            const targetDist = Math.hypot(shootDirX, shootDirZ);
            const botPower = Math.min(0.95, Math.max(0.45, 0.4 + (targetDist / 70) * 0.4 + Math.random() * 0.15));

            this.strikerX = botX;
            this.aimAngle = targetAngle;
            this.shotPower = botPower;

            // Execute bot strike
            this.takeShot(botPower, targetAngle, botX);
        }, 1200);
    }

    handleGameOver() {
        const winner = this.scores.p1 >= this.scores.p2 ? this.myName : this.opponentName;
        const modal = document.getElementById('modal-victory');
        const title = document.getElementById('victory-title');
        const desc = document.getElementById('victory-desc');

        if (title) title.textContent = `${winner} Wins!`;
        if (desc) desc.textContent = `Final Score: ${this.myName} (${this.scores.p1} pts) — ${this.opponentName} (${this.scores.p2} pts)`;
        if (modal) modal.classList.add('open');

        if (window.CarromAudio) {
            window.CarromAudio.playVictory();
        }

        window.parent.postMessage({
            type: 'CARROM_GAME_OVER',
            scores: this.scores,
            winner
        }, '*');
    }

    showStatus(msg) {
        const banner = document.getElementById('status-banner');
        if (banner) {
            banner.textContent = msg;
            banner.classList.remove('pulse');
            void banner.offsetWidth; // Trigger reflow
            banner.classList.add('pulse');
        }
    }

    updateHUD() {
        const s1 = document.getElementById('score-p1');
        const s2 = document.getElementById('score-p2');
        if (s1) s1.textContent = `${this.scores.p1} pts`;
        if (s2) s2.textContent = `${this.scores.p2} pts`;

        const card1 = document.getElementById('card-p1');
        const card2 = document.getElementById('card-p2');
        if (card1) card1.classList.toggle('active-turn', this.currentTurn === 'p1');
        if (card2) card2.classList.toggle('active-turn', this.currentTurn === 'p2');

        const badge1 = document.getElementById('badge-p1');
        const badge2 = document.getElementById('badge-p2');
        if (badge1) badge1.textContent = this.currentTurn === 'p1' ? 'STRIKING' : 'WAITING';
        if (badge2) badge2.textContent = this.currentTurn === 'p2' ? 'STRIKING' : 'WAITING';
    }

    setupEventListeners() {
        // Window Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.setCameraView(this.currentView);
        });

        // View Toggles
        document.getElementById('btn-view-top')?.addEventListener('click', () => this.setCameraView('top'));
        document.getElementById('btn-view-aim')?.addEventListener('click', () => this.setCameraView('aim'));
        document.getElementById('btn-view-orbit')?.addEventListener('click', () => this.setCameraView('orbit'));

        // Baseline Striker Slider
        const baselineSlider = document.getElementById('slider-baseline');
        if (baselineSlider) {
            baselineSlider.addEventListener('input', (e) => {
                this.handleStrikerSlide(parseFloat(e.target.value));
            });
        }

        // Aim Fine-Tune Buttons
        document.getElementById('btn-aim-left')?.addEventListener('click', () => {
            this.aimAngle -= 0.05;
        });
        document.getElementById('btn-aim-right')?.addEventListener('click', () => {
            this.aimAngle += 0.05;
        });

        // Strike Power Range Slider
        const powerSlider = document.getElementById('slider-power');
        const powerLabel = document.getElementById('power-value-label');
        if (powerSlider) {
            powerSlider.addEventListener('input', (e) => {
                this.shotPower = parseFloat(e.target.value);
                if (powerLabel) powerLabel.textContent = `${Math.round(this.shotPower * 100)}%`;
            });
        }

        // SHOOT Button
        document.getElementById('btn-shoot')?.addEventListener('click', () => {
            this.takeShot();
        });

        // Play Again Button in Modal
        document.getElementById('btn-play-again')?.addEventListener('click', () => {
            document.getElementById('modal-victory')?.classList.remove('open');
            this.startMatch();
        });

        // Canvas Direct Touch/Pointer Aiming
        this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        window.addEventListener('pointermove', (e) => this.onPointerMove(e));
        window.addEventListener('pointerup', (e) => this.onPointerUp(e));

        // Listen for PostMessage from Parent (Next.js CarromGame wrapper)
        window.addEventListener('message', (e) => this.handleParentMessage(e));
    }

    onPointerDown(e) {
        if (this.currentView === 'orbit' || this.physics.isTableBusy()) return;

        // Check if pointer is on UI elements
        if (e.target.closest('.interactive')) return;

        this.isAiming = true;
        this.updateAimAngleFromPointer(e);
    }

    onPointerMove(e) {
        if (!this.isAiming) return;
        this.updateAimAngleFromPointer(e);
    }

    onPointerUp() {
        this.isAiming = false;
    }

    updateAimAngleFromPointer(e) {
        if (!this.piecesManager.striker) return;

        // Raycast from camera to board plane (y = 0)
        const mouse = new THREE.Vector2(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectPoint);

        if (intersectPoint) {
            const striker = this.piecesManager.striker;
            const dx = intersectPoint.x - striker.x;
            const dz = intersectPoint.z - striker.z;

            // Invert dz because forward is -z
            this.aimAngle = Math.atan2(dx, -dz);
        }
    }

    handleParentMessage(e) {
        const data = e.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'CARROM_SHOT') {
            // Opponent executed shot in online mode
            this.takeShot(data.power, data.aimAngle, data.strikerX);
        } else if (data.type === 'CARROM_SYNC_PIECES') {
            // Full sync from host
            if (data.scores) this.scores = data.scores;
            if (data.currentTurn) this.currentTurn = data.currentTurn;
            if (Array.isArray(data.piecesData)) {
                data.piecesData.forEach(pData => {
                    const match = this.piecesManager.pieces.find(p => p.id === pData.id);
                    if (match) {
                        match.x = pData.x;
                        match.z = pData.z;
                        match.isPocketed = pData.isPocketed;
                        if (match.mesh) {
                            match.mesh.position.set(pData.x, this.piecesManager.pieceHeight / 2, pData.z);
                            match.mesh.visible = !pData.isPocketed;
                        }
                    }
                });
            }
            this.updateHUD();
        } else if (data.type === 'CARROM_TOGGLE_MUTE') {
            if (window.CarromAudio) {
                window.CarromAudio.enabled = !data.muted;
            }
        } else if (data.type === 'CARROM_RESTART') {
            this.startMatch();
        }
    }

    animate() {
        requestAnimationFrame(this.animate);
        const dt = Math.min(this.clock.getDelta(), 0.05);

        // Step physics
        this.physics.step(dt);

        // Update aiming line
        this.updateAimGuide();

        // Update OrbitControls if enabled
        if (this.controls.enabled) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Instantiate game on load
window.addEventListener('DOMContentLoaded', () => {
    window.carromGame = new CarromGame();
});
