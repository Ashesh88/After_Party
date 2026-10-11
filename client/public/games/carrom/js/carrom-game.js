// Couples Royal 3D Carrom - Master Game Engine
// WebGL Three.js Renderer, Aiming System, Bot AI, Match State & Online Sync

class CarromGame {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.currentView = 'orbit'; // Default to realistic 3D perspective
        this.mode = 'ai'; // 'ai', 'online', 'pass'

        // Online Multi-player state
        this.sessionCode = null;
        this.myRole = 'p1'; // 'p1' (White) or 'p2' (Black)
        this.myName = 'Player 1';
        this.opponentName = 'Opponent';

        // Match Scores & Rules
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
        this.shotWatchdog = null;

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

        // OrbitControls with rock-solid touch stability (just like 8-ball pool)
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.maxPolarAngle = Math.PI / 2.3;
        this.controls.minPolarAngle = 0.20;
        this.controls.minDistance = 35;
        this.controls.maxDistance = 220;
        this.controls.enablePan = false; // Never drift or slide table off-screen
        this.controls.enabled = false;
        // Desktop: Right-click orbits camera. Left-click is 100% reserved for striker & aiming
        this.controls.mouseButtons = {
            LEFT: null,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
        };
        // Mobile / Touchscreens: Swipe outside board to orbit 3D table, touch board to aim/move pieces
        this.controls.touches = {
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
        };

        // Glare-Free Warm Diffuse Studio Lighting (Balanced levels so white pieces are crisp and never bleached)
        const ambientLight = new THREE.AmbientLight(0xfff5ea, 0.55);
        this.scene.add(ambientLight);

        // Soft main directional light
        const mainLight = new THREE.DirectionalLight(0xfffaf0, 0.65);
        mainLight.position.set(25, 60, 35);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.bias = -0.0005;
        this.scene.add(mainLight);

        // Soft fill light from opposite side
        const fillLight = new THREE.DirectionalLight(0xf5ede0, 0.35);
        fillLight.position.set(-25, 50, -35);
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

        // Establish initial 3D camera view (User requested 3D by default)
        this.setCameraView('orbit');

        // Render Loop
        this.clock = new THREE.Clock();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    createAimGuide() {
        this.guidelineGroup = new THREE.Group();
        this.scene.add(this.guidelineGroup);

        // 1. Primary Striker Laser Line (Emerald dotted line to contact point)
        const primaryPoints = [new THREE.Vector3(0, 0.28, 0), new THREE.Vector3(0, 0.28, -35)];
        const primaryGeo = new THREE.BufferGeometry().setFromPoints(primaryPoints);
        const primaryMat = new THREE.LineDashedMaterial({
            color: 0x10b981,
            dashSize: 1.0,
            gapSize: 0.6,
            linewidth: 2
        });
        this.aimLine = new THREE.Line(primaryGeo, primaryMat);
        this.aimLine.computeLineDistances();
        this.guidelineGroup.add(this.aimLine);

        // 2. Translucent Ghost Striker at Contact Point (like 8-ball pool ghost cue ball)
        const ghostOuterGeo = new THREE.RingGeometry(1.6, 1.95, 32);
        const ghostOuterMat = new THREE.MeshBasicMaterial({
            color: 0x34d399,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
        });
        this.ghostStrikerMesh = new THREE.Mesh(ghostOuterGeo, ghostOuterMat);
        this.ghostStrikerMesh.rotation.x = Math.PI / 2;
        this.ghostStrikerMesh.position.y = 0.28;
        this.ghostStrikerMesh.visible = false;
        this.guidelineGroup.add(this.ghostStrikerMesh);

        const ghostInnerGeo = new THREE.RingGeometry(0.7, 1.0, 32);
        const ghostInnerMat = new THREE.MeshBasicMaterial({
            color: 0x34d399,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.65
        });
        this.ghostInnerMesh = new THREE.Mesh(ghostInnerGeo, ghostInnerMat);
        this.ghostInnerMesh.rotation.x = Math.PI / 2;
        this.ghostInnerMesh.position.y = 0.28;
        this.ghostInnerMesh.visible = false;
        this.guidelineGroup.add(this.ghostInnerMesh);

        // 3. Target Piece Predicted Path (Bright amber/gold line showing where struck goti will go)
        const targetPoints = [new THREE.Vector3(0, 0.28, 0), new THREE.Vector3(0, 0.28, 1)];
        const targetGeo = new THREE.BufferGeometry().setFromPoints(targetPoints);
        const targetMat = new THREE.LineDashedMaterial({
            color: 0xf59e0b,
            dashSize: 1.0,
            gapSize: 0.6,
            linewidth: 2
        });
        this.targetPathLine = new THREE.Line(targetGeo, targetMat);
        this.targetPathLine.visible = false;
        this.guidelineGroup.add(this.targetPathLine);

        // Target Piece End Ghost Ring
        const targetRingGeo = new THREE.RingGeometry(1.15, 1.45, 32);
        const targetRingMat = new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
        });
        this.targetGhostRing = new THREE.Mesh(targetRingGeo, targetRingMat);
        this.targetGhostRing.rotation.x = Math.PI / 2;
        this.targetGhostRing.position.y = 0.28;
        this.targetGhostRing.visible = false;
        this.guidelineGroup.add(this.targetGhostRing);

        // 4. Striker Tangent Deflection Line (Mint green line showing where striker deflects after impact)
        const deflectPoints = [new THREE.Vector3(0, 0.28, 0), new THREE.Vector3(0, 0.28, 1)];
        const deflectGeo = new THREE.BufferGeometry().setFromPoints(deflectPoints);
        const deflectMat = new THREE.LineDashedMaterial({
            color: 0x6ee7b7,
            dashSize: 0.8,
            gapSize: 0.6,
            linewidth: 1.5
        });
        this.deflectPathLine = new THREE.Line(deflectGeo, deflectMat);
        this.deflectPathLine.visible = false;
        this.guidelineGroup.add(this.deflectPathLine);

        // 5. Cushion Frame Wall Rebound Line (For bank shots when aiming towards the border cushion)
        const cushionPoints = [new THREE.Vector3(0, 0.28, 0), new THREE.Vector3(0, 0.28, 1)];
        const cushionGeo = new THREE.BufferGeometry().setFromPoints(cushionPoints);
        const cushionMat = new THREE.LineDashedMaterial({
            color: 0x10b981,
            dashSize: 0.8,
            gapSize: 0.6,
            linewidth: 1.5
        });
        this.cushionBounceLine = new THREE.Line(cushionGeo, cushionMat);
        this.cushionBounceLine.visible = false;
        this.guidelineGroup.add(this.cushionBounceLine);
    }

    updateAimGuide() {
        if (!this.guidelineGroup || !this.piecesManager.striker) return;

        const striker = this.piecesManager.striker;
        if (striker.isPocketed || this.physics.isTableBusy()) {
            this.guidelineGroup.visible = false;
            return;
        }

        // Only show aim guide if it's current player's turn
        const isMyTurn = (this.mode === 'ai' && this.currentTurn === 'p1') ||
                         (this.mode === 'online' && this.currentTurn === this.myRole) ||
                         (this.mode === 'pass');

        if (!isMyTurn) {
            this.guidelineGroup.visible = false;
            return;
        }

        this.guidelineGroup.visible = true;

        const sx = striker.x;
        const sz = striker.z;
        const Rs = striker.radius || 1.95;

        // In 3D: aimAngle forward direction is (sin(aimAngle), 0, -cos(aimAngle))
        const dirX = Math.sin(this.aimAngle);
        const dirZ = -Math.cos(this.aimAngle);

        // 1. Raycast against active carrom pieces (like 8-ball pool)
        let closestHit = null;
        let minT = 100.0;

        for (const p of this.piecesManager.pieces) {
            if (p.isPocketed) continue;
            const Rp = p.radius || 1.45;
            const combR = Rs + Rp;

            const dx = p.x - sx;
            const dz = p.z - sz;
            const proj = dx * dirX + dz * dirZ;
            if (proj <= 0) continue; // Behind striker

            const h2 = (dx * dx + dz * dz) - (proj * proj);
            const targetDist2 = combR * combR;
            if (h2 < targetDist2) {
                const offset = Math.sqrt(Math.max(0, targetDist2 - h2));
                const t = proj - offset;
                if (t > 0 && t < minT) {
                    minT = t;
                    closestHit = {
                        piece: p,
                        t: t,
                        impX: sx + dirX * t,
                        impZ: sz + dirZ * t
                    };
                }
            }
        }

        // 2. Raycast against inner cushion frame wall (-35 to +35 playfield, wall at ±(35 - Rs))
        const halfWall = 35.0 - Rs;
        let wallT = 100.0;
        let wallBounceX = 0;
        let wallBounceZ = 0;

        if (dirX > 0.0001) {
            const t = (halfWall - sx) / dirX;
            if (t > 0 && t < wallT) {
                wallT = t;
                wallBounceX = -dirX;
                wallBounceZ = dirZ;
            }
        } else if (dirX < -0.0001) {
            const t = (-halfWall - sx) / dirX;
            if (t > 0 && t < wallT) {
                wallT = t;
                wallBounceX = -dirX;
                wallBounceZ = dirZ;
            }
        }

        if (dirZ > 0.0001) {
            const t = (halfWall - sz) / dirZ;
            if (t > 0 && t < wallT) {
                wallT = t;
                wallBounceX = (wallT === t) ? -dirX : dirX;
                wallBounceZ = -dirZ;
            }
        } else if (dirZ < -0.0001) {
            const t = (-halfWall - sz) / dirZ;
            if (t > 0 && t < wallT) {
                wallT = t;
                wallBounceX = (wallT === t) ? -dirX : dirX;
                wallBounceZ = -dirZ;
            }
        }

        const yLevel = 0.28;

        if (closestHit && closestHit.t < wallT) {
            const impX = closestHit.impX;
            const impZ = closestHit.impZ;
            const targetPiece = closestHit.piece;

            // 1. Primary Line: Striker to impact point
            const pos = this.aimLine.geometry.attributes.position.array;
            pos[0] = sx; pos[1] = yLevel; pos[2] = sz;
            pos[3] = impX; pos[4] = yLevel; pos[5] = impZ;
            this.aimLine.geometry.attributes.position.needsUpdate = true;
            this.aimLine.computeLineDistances();
            this.aimLine.visible = true;

            // 2. Ghost Striker at impact point
            this.ghostStrikerMesh.position.set(impX, yLevel, impZ);
            this.ghostInnerMesh.position.set(impX, yLevel, impZ);
            this.ghostStrikerMesh.visible = true;
            this.ghostInnerMesh.visible = true;

            // 3. Target Piece Predicted Path: shoots along impact normal
            let nx = targetPiece.x - impX;
            let nz = targetPiece.z - impZ;
            const nLen = Math.hypot(nx, nz) || 1;
            nx /= nLen;
            nz /= nLen;

            // Trajectory length scales smoothly with power
            const targetLen = 12 + (this.shotPower || 0.65) * 16;
            const targetEndX = targetPiece.x + nx * targetLen;
            const targetEndZ = targetPiece.z + nz * targetLen;

            const tPos = this.targetPathLine.geometry.attributes.position.array;
            tPos[0] = targetPiece.x; tPos[1] = yLevel; tPos[2] = targetPiece.z;
            tPos[3] = targetEndX; tPos[4] = yLevel; tPos[5] = targetEndZ;
            this.targetPathLine.geometry.attributes.position.needsUpdate = true;
            this.targetPathLine.computeLineDistances();
            this.targetPathLine.visible = true;

            this.targetGhostRing.position.set(targetEndX, yLevel, targetEndZ);
            this.targetGhostRing.visible = true;

            // 4. Striker Deflection Path: along tangent vector
            const dot = dirX * nx + dirZ * nz;
            let defX = dirX - dot * nx;
            let defZ = dirZ - dot * nz;
            const defLen = Math.hypot(defX, defZ);
            if (defLen > 0.001) {
                defX /= defLen;
                defZ /= defLen;
            } else {
                defX = -nz;
                defZ = nx;
            }

            const defDist = 8;
            const defEndX = impX + defX * defDist;
            const defEndZ = impZ + defZ * defDist;

            const dPos = this.deflectPathLine.geometry.attributes.position.array;
            dPos[0] = impX; dPos[1] = yLevel; dPos[2] = impZ;
            dPos[3] = defEndX; dPos[4] = yLevel; dPos[5] = defEndZ;
            this.deflectPathLine.geometry.attributes.position.needsUpdate = true;
            this.deflectPathLine.computeLineDistances();
            this.deflectPathLine.visible = true;

            this.cushionBounceLine.visible = false;

        } else {
            // Striker hits cushion wall directly
            const impX = sx + dirX * wallT;
            const impZ = sz + dirZ * wallT;

            const pos = this.aimLine.geometry.attributes.position.array;
            pos[0] = sx; pos[1] = yLevel; pos[2] = sz;
            pos[3] = impX; pos[4] = yLevel; pos[5] = impZ;
            this.aimLine.geometry.attributes.position.needsUpdate = true;
            this.aimLine.computeLineDistances();
            this.aimLine.visible = true;

            this.ghostStrikerMesh.position.set(impX, yLevel, impZ);
            this.ghostInnerMesh.position.set(impX, yLevel, impZ);
            this.ghostStrikerMesh.visible = true;
            this.ghostInnerMesh.visible = true;

            this.targetPathLine.visible = false;
            this.targetGhostRing.visible = false;
            this.deflectPathLine.visible = false;

            // Show cushion wall bounce trajectory
            const bounceLen = 12;
            const bEndX = impX + wallBounceX * bounceLen;
            const bEndZ = impZ + wallBounceZ * bounceLen;

            const cbPos = this.cushionBounceLine.geometry.attributes.position.array;
            cbPos[0] = impX; cbPos[1] = yLevel; cbPos[2] = impZ;
            cbPos[3] = bEndX; cbPos[4] = yLevel; cbPos[5] = bEndZ;
            this.cushionBounceLine.geometry.attributes.position.needsUpdate = true;
            this.cushionBounceLine.computeLineDistances();
            this.cushionBounceLine.visible = true;
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
            const dWidth = (boardExtent * 1.16) / (2 * tanHalfFov * aspect);
            const dHeight = (boardExtent * 1.65) / (2 * tanHalfFov);
            camHeight = Math.max(dWidth, dHeight);
        } else {
            // In landscape / desktop
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
                let orbitDist;
                if (isPortrait) {
                    const reqDist = (boardExtent * 1.35) / (2 * tanHalfFov * aspect);
                    orbitDist = Math.max(105, reqDist);
                } else {
                    orbitDist = (boardExtent * 1.25) / (2 * tanHalfFov);
                }
                // Distinctive 3D perspective angle (shows real 3D depth of rails, nets, and pieces)
                this.camera.position.set(orbitDist * 0.22, orbitDist * 0.72, orbitDist * 0.78);
                this.camera.lookAt(0, 0, 0);
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
        this.showStatus('Match live: Position striker on baseline to aim.');

        this.positionStrikerForTurn();
    }

    positionStrikerForTurn() {
        this.physics.stopAll(); // Force stop all piece jitter for clean turn transition
        this.isDraggingStriker = false;
        this.isAiming = false;

        // Player 1 baseline is at z = 26.0 (bottom)
        // Player 2 / Bot baseline is at z = -26.0 (top)
        const baselineZ = this.currentTurn === 'p1' ? 26.0 : -26.0;
        this.strikerX = 0;
        this.piecesManager.resetStriker(baselineZ, 0);

        // Default aim direction:
        // P1 aims upwards (angle = 0)
        // P2 aims downwards (angle = PI)
        this.aimAngle = this.currentTurn === 'p1' ? 0 : Math.PI;

        // Reset baseline slider in UI
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
                this.piecesManager.striker.mesh.position.z = baselineZ;
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
        const speed = 1.4 + power * 3.2;
        striker.vx = Math.sin(angle) * speed;
        striker.vz = -Math.cos(angle) * speed;

        this.turnPockets = [];
        if (this.guidelineGroup) this.guidelineGroup.visible = false;

        // Watchdog safety timer: force table to stop if pieces micro-jitter past 3.6s
        if (this.shotWatchdog) clearTimeout(this.shotWatchdog);
        this.shotWatchdog = setTimeout(() => {
            if (this.physics.isTableBusy()) {
                this.physics.stopAll();
            }
        }, 3600);

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
        // Clear safety watchdog
        if (this.shotWatchdog) {
            clearTimeout(this.shotWatchdog);
            this.shotWatchdog = null;
        }

        let extraTurn = false;
        let strikerFoul = false;
        let legalPiecePocketed = false;

        // Check if striker was pocketed (Foul)
        const pocketedStriker = this.turnPockets.find(p => p.type === 'striker');
        if (pocketedStriker) {
            strikerFoul = true;
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

        // ALWAYS immediately reset striker back to active player's baseline!
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
        this.showStatus('Carrom Bot is taking aim...');
        let attempts = 0;

        const executeBot = () => {
            if (this.currentTurn !== 'p2') return;

            // Wait if table is still in motion
            if (this.physics.isTableBusy()) {
                attempts++;
                if (attempts < 8) {
                    setTimeout(executeBot, 250);
                    return;
                } else {
                    this.physics.stopAll();
                }
            }

            // Find all active unpocketed pieces
            const targets = this.piecesManager.pieces.filter(p => !p.isPocketed);
            if (targets.length === 0) return;

            // Bot prefers Queen or Black pieces
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
            botX += (Math.random() - 0.5) * 1.0;

            const baselineZ = -26.0;
            const shootDirX = ghostX - botX;
            const shootDirZ = ghostZ - baselineZ;
            let targetAngle = Math.atan2(shootDirX, -shootDirZ);

            // Power based on distance
            const targetDist = Math.hypot(shootDirX, shootDirZ);
            const botPower = Math.min(0.92, Math.max(0.48, 0.42 + (targetDist / 70) * 0.42 + (Math.random() - 0.5) * 0.1));

            // Position striker on Bot's side
            this.strikerX = botX;
            this.aimAngle = targetAngle;
            this.shotPower = botPower;

            if (this.piecesManager.striker) {
                this.piecesManager.striker.x = botX;
                this.piecesManager.striker.z = baselineZ;
                if (this.piecesManager.striker.mesh) {
                    this.piecesManager.striker.mesh.position.set(botX, this.piecesManager.strikerHeight / 2, baselineZ);
                }
            }

            // Brief delay so user sees Bot aim and position, then release shot
            setTimeout(() => {
                if (this.currentTurn !== 'p2') return;
                this.takeShot(botPower, targetAngle, botX);
            }, 650);
        };

        setTimeout(executeBot, 500);
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

        // In-Game Chat Drawer Toggle
        const floatingChat = document.getElementById('floating-chat');
        document.getElementById('btn-chat-toggle')?.addEventListener('click', () => {
            floatingChat?.classList.toggle('closed');
        });
        document.getElementById('btn-close-chat')?.addEventListener('click', () => {
            floatingChat?.classList.add('closed');
        });

        // Quick Reaction Phrase Chips
        document.querySelectorAll('.chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const msg = btn.getAttribute('data-msg');
                if (msg) this.sendChatMessage(msg);
            });
        });

        // Chat Form Submit
        document.getElementById('panel-chat-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('panel-chat-input');
            if (input && input.value.trim()) {
                this.sendChatMessage(input.value.trim());
                input.value = '';
            }
        });

        // Desktop Keyboard Controls (Left/Right arrows or A/D to slide striker; Q/E to aim fine-tune; Space to strike)
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const isMyTurn = (this.mode === 'ai' && this.currentTurn === 'p1') ||
                             (this.mode === 'online' && this.currentTurn === this.myRole) ||
                             (this.mode === 'pass');

            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                if (isMyTurn && !this.physics.isTableBusy()) {
                    this.updateStrikerPositionFromCoord(this.strikerX - 1.2);
                }
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                if (isMyTurn && !this.physics.isTableBusy()) {
                    this.updateStrikerPositionFromCoord(this.strikerX + 1.2);
                }
            } else if (e.code === 'KeyQ') {
                this.aimAngle -= 0.05;
            } else if (e.code === 'KeyE') {
                this.aimAngle += 0.05;
            } else if (e.code === 'Space') {
                e.preventDefault();
                if (isMyTurn) this.takeShot();
            }
        });

        // Canvas Direct Touch/Pointer Aiming & Striker Dragging
        this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        window.addEventListener('pointermove', (e) => this.onPointerMove(e));
        window.addEventListener('pointerup', (e) => this.onPointerUp(e));

        // Listen for PostMessage from Parent (Next.js CarromGame wrapper)
        window.addEventListener('message', (e) => this.handleParentMessage(e));
    }

    sendChatMessage(text) {
        this.addMessageToChat(this.myName, text, true);
        this.showChatToast(this.myName, text);

        // Forward to parent Next.js wrapper (for socket broadcast)
        window.parent.postMessage({
            type: 'CARROM_LOCAL_CHAT',
            text
        }, '*');

        // If in solo AI mode, Bot replies playfully
        if (this.mode === 'ai') {
            setTimeout(() => {
                const botReplies = [
                    'Nice shot!',
                    'My turn now!',
                    'Good strike!',
                    'Well played!',
                    'Watch out for the Queen!'
                ];
                const botMsg = botReplies[Math.floor(Math.random() * botReplies.length)];
                this.addMessageToChat('Carrom Bot', botMsg, false);
                this.showChatToast('Carrom Bot', botMsg);
            }, 800);
        }
    }

    addMessageToChat(sender, text, isMe) {
        const container = document.getElementById('panel-chat-messages');
        if (!container) return;
        const msgEl = document.createElement('div');
        msgEl.className = `chat-msg ${isMe ? 'me' : 'other'}`;
        msgEl.textContent = `${sender}: ${text}`;
        container.appendChild(msgEl);
        container.scrollTop = container.scrollHeight;
    }

    onPointerDown(e) {
        // Only respond to primary left click or touch
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        // Ignore clicks on UI elements
        if (e.target.closest('.interactive')) return;

        if (this.physics.isTableBusy()) return;

        const isMyTurn = (this.mode === 'ai' && this.currentTurn === 'p1') ||
                         (this.mode === 'online' && this.currentTurn === this.myRole) ||
                         (this.mode === 'pass');
        if (!isMyTurn) return;

        const pt = this.getBoardPlaneIntersection(e);

        // Pointer clicked/touched inside the playing field bounds (-35 to +35)
        if (pt && Math.abs(pt.x) <= 35 && Math.abs(pt.z) <= 35) {
            // Temporarily disable OrbitControls so board interaction never wobbles the camera
            if (this.controls) this.controls.enabled = false;

            const striker = this.piecesManager.striker;
            const distToStriker = striker ? Math.hypot(pt.x - striker.x, pt.z - striker.z) : 999;

            // Striker ONLY moves when specifically clicking/touching directly ON the striker!
            if (distToStriker <= (striker?.radius || 1.95) * 2.2) {
                this.isDraggingStriker = true;
                this.updateStrikerPositionFromCoord(pt.x);
            } else {
                // Anywhere else on the board: ALWAYS AIM (TARGET)!
                this.isAiming = true;
                this.updateAimAngleFromCoord(pt.x, pt.z);
            }
        } else {
            // Touched outside playing field: OrbitControls handles rotating the 3D table smoothly!
            if (this.controls && this.currentView === 'orbit') {
                this.controls.enabled = true;
            }
        }
    }

    onPointerMove(e) {
        if (!this.isDraggingStriker && !this.isAiming) return;

        const pt = this.getBoardPlaneIntersection(e);
        if (!pt) return;

        if (this.isDraggingStriker) {
            this.updateStrikerPositionFromCoord(pt.x);
        } else if (this.isAiming) {
            this.updateAimAngleFromCoord(pt.x, pt.z);
        }
    }

    onPointerUp(e) {
        this.isDraggingStriker = false;
        this.isAiming = false;
        // Restore OrbitControls if in orbit view so 2-finger gestures or right-clicks can orbit smoothly
        if (this.controls && this.currentView === 'orbit') {
            this.controls.enabled = true;
        }
    }

    getBoardPlaneIntersection(e) {
        const mouse = new THREE.Vector2(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
            return intersectPoint;
        }
        return null;
    }

    updateStrikerPositionFromCoord(rawX) {
        const maxRange = 18.5;
        this.strikerX = Math.max(-maxRange, Math.min(maxRange, rawX));

        const baselineZ = this.currentTurn === 'p1' ? 26.0 : -26.0;
        if (this.piecesManager.striker) {
            this.piecesManager.striker.x = this.strikerX;
            this.piecesManager.striker.z = baselineZ;
            if (this.piecesManager.striker.mesh) {
                this.piecesManager.striker.mesh.position.x = this.strikerX;
                this.piecesManager.striker.mesh.position.z = baselineZ;
            }
        }

        // Sync slider
        const slider = document.getElementById('slider-baseline');
        if (slider) {
            slider.value = (this.strikerX / maxRange) * 100;
        }

        if (this.currentView === 'aim') {
            this.setCameraView('aim');
        }
    }

    updateAimAngleFromCoord(targetX, targetZ) {
        if (!this.piecesManager.striker) return;
        const striker = this.piecesManager.striker;
        const dx = targetX - striker.x;
        const dz = targetZ - striker.z;
        this.aimAngle = Math.atan2(dx, -dz);
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
        } else if (data.type === 'CARROM_CHAT') {
            this.addMessageToChat(data.senderName || 'Opponent', data.message, false);
            this.showChatToast(data.senderName || 'Opponent', data.message);
        } else if (data.type === 'CARROM_TOGGLE_MUTE') {
            if (window.CarromAudio) {
                window.CarromAudio.enabled = !data.muted;
            }
        } else if (data.type === 'CARROM_RESTART') {
            this.startMatch();
        }
    }

    showChatToast(sender, message) {
        let toast = document.getElementById('chat-toast-bubble');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'chat-toast-bubble';
            toast.className = 'chat-toast-bubble';
            document.body.appendChild(toast);
        }
        toast.textContent = `${sender}: ${message}`;
        toast.classList.add('visible');
        if (this.chatToastTimeout) clearTimeout(this.chatToastTimeout);
        this.chatToastTimeout = setTimeout(() => {
            toast.classList.remove('visible');
        }, 3200);
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
