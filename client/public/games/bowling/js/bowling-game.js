// Cosmic 3D Bowling - Advanced 3D Engine with Transparent Glassmorphism & OrbitControls
(function () {
    'use strict';

    // Player color palettes & configs
    const PLAYER_CONFIGS = [
        { id: 'p1', defaultName: 'Player 1', colorHex: 0xa855f7, cssClass: 'p-theme-p1', badgeText: 'P1' },
        { id: 'p2', defaultName: 'Player 2', colorHex: 0x06b6d4, cssClass: 'p-theme-p2', badgeText: 'P2' },
        { id: 'p3', defaultName: 'Player 3', colorHex: 0x10b981, cssClass: 'p-theme-p3', badgeText: 'P3' },
        { id: 'p4', defaultName: 'Player 4', colorHex: 0xf43f5e, cssClass: 'p-theme-p4', badgeText: 'P4' }
    ];

    // Physical Constants & Lane Boundaries
    const LANE_WIDTH = 3.6;
    const BALL_RADIUS = 0.34;
    const BALL_Y_LANE = 0.34;
    const BALL_Y_GUTTER = 0.22;
    const LANE_MIN_X = -1.46; // -(LANE_WIDTH / 2 - BALL_RADIUS)
    const LANE_MAX_X = 1.46;  // +(LANE_WIDTH / 2 - BALL_RADIUS)
    const GUTTER_LEFT_X = -2.12;
    const GUTTER_RIGHT_X = 2.12;
    const HARD_LIMIT_X = 2.22;
    const STEER_SPEED_AIM = 2.5; // units per second during aiming
    const STEER_FORCE_ROLL = 4.2; // lateral steering acceleration during roll
    const BASE_ROLL_SPEED = -22.0; // units per second forward velocity

    class CosmicBowling3D {
        constructor() {
            this.container = document.getElementById('canvas-container');

            const params = new URLSearchParams(window.location.search);
            this.urlP1 = params.get('p1') || 'You';
            this.urlP2 = params.get('p2') || 'Friend';

            // Match State
            this.gameMode = '2p'; // 'ai', '2p', '3p', '4p'
            this.maxFrames = 10;
            this.currentFrame = 1;
            this.currentRoll = 1; // 1 or 2
            this.activePlayerIndex = 0;
            this.players = [];

            // Aim & Power
            this.aimX = 0; // -1.46 to 1.46
            this.aimSpin = 0; // -0.035 to 0.035
            this.powerMultiplier = 0.85;
            this.isRolling = false;

            // Frame-rate Independent Clock & Controls
            this.clock = new THREE.Clock();
            this.keys = { left: false, right: false };
            this.stepperHold = { left: false, right: false };

            // Camera & OrbitControls
            this.isOrbitEnabled = false;
            this.camViewIndex = 0;
            this.camViews = [
                { pos: new THREE.Vector3(0, 2.7, 5.0), target: new THREE.Vector3(0, 0.4, -15), label: 'Bowler' },
                { pos: new THREE.Vector3(0, 8.5, -4.0), target: new THREE.Vector3(0, 0, -17), label: 'Overhead' },
                { pos: new THREE.Vector3(0, 2.4, 4.2), target: new THREE.Vector3(0, 0.4, -18), label: 'Action' }
            ];

            // 10 Pins
            this.pins = [];
            this.pinsKnockedThisFrame = 0;

            // DOM Cache
            this.cacheDOM();

            // 3D Setup
            this.initThree();
            this.initAlleyEnvironment();
            this.initBall();
            this.initTrajectoryGuide();
            this.initSweeper();
            this.setup10Pins();

            // Setup Players & HUD
            this.setupPlayers();
            this.initEvents();
            this.updateHUD();

            // Render loop
            this.animate = this.animate.bind(this);
            requestAnimationFrame(this.animate);
        }

        cacheDOM() {
            this.scoreboardsDock = document.getElementById('scoreboards-dock');
            this.announcerText = document.getElementById('announcer-text');
            this.sliderPos = document.getElementById('slider-pos');
            this.btnRoll = document.getElementById('btn-roll');
            this.btnCam = document.getElementById('btn-cam');
            this.camBadge = document.getElementById('cam-badge');
            this.btnOrbit = document.getElementById('btn-orbit');
            this.btnMute = document.getElementById('btn-mute');
            this.btnRestart = document.getElementById('btn-restart');
            this.celebrationBanner = document.getElementById('celebration-banner');
            this.bannerTitle = document.getElementById('banner-title');
            this.bannerSub = document.getElementById('banner-sub');
            this.modalVictory = document.getElementById('modal-victory');
            this.resultsPodium = document.getElementById('results-podium');
            this.btnRematch = document.getElementById('btn-rematch');
            this.laneHint = document.getElementById('lane-hint');
        }

        setupPlayers() {
            let count = 2;
            if (this.gameMode === 'ai') count = 2;
            else if (this.gameMode === '2p') count = 2;
            else if (this.gameMode === '3p') count = 3;
            else if (this.gameMode === '4p') count = 4;

            this.players = [];
            for (let i = 0; i < count; i++) {
                const cfg = PLAYER_CONFIGS[i];
                let name = cfg.defaultName;
                if (i === 0) name = this.urlP1;
                else if (i === 1) name = this.gameMode === 'ai' ? 'Robot AI' : this.urlP2;

                this.players.push({
                    id: cfg.id,
                    name: name,
                    isAI: this.gameMode === 'ai' && i === 1,
                    colorHex: cfg.colorHex,
                    cssClass: cfg.cssClass,
                    badgeText: cfg.badgeText,
                    score: 0,
                    frames: Array(this.maxFrames).fill(null).map(() => ({ r1: null, r2: null, total: null }))
                });
            }

            this.activePlayerIndex = 0;
            this.currentFrame = 1;
            this.currentRoll = 1;
            this.renderScorecards();
            this.updateActivePlayerBall();
        }

        renderScorecards() {
            if (!this.scoreboardsDock) return;
            this.scoreboardsDock.innerHTML = '';

            this.players.forEach((p, idx) => {
                const chip = document.createElement('div');
                chip.id = `scorecard-${p.id}`;
                chip.className = `player-scorecard ${p.cssClass} ${idx === this.activePlayerIndex ? 'active-turn' : ''}`;

                chip.innerHTML = `
                    <span class="p-badge ${p.id}-badge">${p.badgeText}</span>
                    <span class="p-name">${p.name}</span>
                    <span class="score-num" id="${p.id}-score-val">${p.score}</span>
                `;
                this.scoreboardsDock.appendChild(chip);
            });
        }

        updateActivePlayerBall() {
            if (this.ballMat && this.players[this.activePlayerIndex]) {
                const activeColor = this.players[this.activePlayerIndex].colorHex;
                this.ballMat.color.setHex(activeColor);
                if (this.ballSpot) this.ballSpot.color.setHex(activeColor);
            }
        }

        initThree() {
            this.scene = new THREE.Scene();
            this.scene.fog = new THREE.FogExp2(0x06050c, 0.012);

            const isMobile = window.innerWidth < 650;
            const aspect = window.innerWidth / window.innerHeight;
            // Higher FOV on portrait mobile to ensure the ball and full lane are visible
            const fov = isMobile ? 62 : 48;

            this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 150);
            this.updateCameraPosition();

            this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setClearColor(0x06050c);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.container.appendChild(this.renderer.domElement);

            // OrbitControls
            if (window.THREE && window.THREE.OrbitControls) {
                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.05;
                this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // don't go below floor
                this.controls.minDistance = 2.5;
                this.controls.maxDistance = 25;
                this.controls.enabled = false; // default off, enabled on toggle
                this.controls.target.set(0, 0.4, -14);
            }

            // Lighting Setup (Cosmic Alley Atmosphere)
            const ambient = new THREE.AmbientLight(0x9333ea, 0.6);
            this.scene.add(ambient);

            // Directional overhead lane light
            const mainLight = new THREE.DirectionalLight(0xfff5ea, 1.0);
            mainLight.position.set(0, 12, 0);
            mainLight.castShadow = true;
            mainLight.shadow.mapSize.width = 1024;
            mainLight.shadow.mapSize.height = 1024;
            this.scene.add(mainLight);

            // Pin deck luminous spotlight
            this.pinLight = new THREE.SpotLight(0xffffff, 2.5);
            this.pinLight.position.set(0, 8.5, -16);
            this.pinLight.target.position.set(0, 0.5, -19);
            this.pinLight.angle = Math.PI / 3.5;
            this.pinLight.penumbra = 0.3;
            this.pinLight.castShadow = true;
            this.scene.add(this.pinLight);
            this.scene.add(this.pinLight.target);

            // Ball aura light
            this.ballSpot = new THREE.PointLight(0xa855f7, 1.4, 7);
            this.ballSpot.position.set(0, 1.4, 1.8);
            this.scene.add(this.ballSpot);

            window.addEventListener('resize', () => {
                const mob = window.innerWidth < 650;
                this.camera.fov = mob ? 62 : 48;
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            });
        }

        updateCameraPosition() {
            if (this.isOrbitEnabled && this.controls) return;

            const current = this.camViews[this.camViewIndex];
            if (this.camViewIndex === 2 && this.isRolling) {
                // Action cam follows ball down lane
                const bPos = this.ball ? this.ball.position : new THREE.Vector3(0, 0.34, 1.8);
                this.camera.position.set(bPos.x * 0.35, 1.8, bPos.z + 3.4);
                this.camera.lookAt(bPos.x, 0.4, bPos.z - 7.0);
            } else {
                this.camera.position.copy(current.pos);
                this.camera.lookAt(current.target);
            }
        }

        initAlleyEnvironment() {
            this.alleyGroup = new THREE.Group();

            // 1. Surrounding Spectator Floor (Dark Polished Floor)
            const floorGeo = new THREE.PlaneGeometry(36, 44);
            const floorMat = new THREE.MeshStandardMaterial({
                color: 0x090714,
                roughness: 0.7,
                metalness: 0.1
            });
            const floorMesh = new THREE.Mesh(floorGeo, floorMat);
            floorMesh.rotation.x = -Math.PI / 2;
            floorMesh.position.set(0, -0.22, -8);
            floorMesh.receiveShadow = true;
            this.alleyGroup.add(floorMesh);

            // 2. Maple Hardwood Bowling Lane (Width 3.8 x Length 32)
            const laneGeo = new THREE.BoxGeometry(3.6, 0.22, 32);
            const laneMat = new THREE.MeshStandardMaterial({
                color: 0x3d2716, // Warm glowing polished maple
                roughness: 0.12, // High shine reflection
                metalness: 0.15
            });
            const lane = new THREE.Mesh(laneGeo, laneMat);
            lane.position.set(0, -0.11, -8);
            lane.receiveShadow = true;
            this.alleyGroup.add(lane);

            // Lane Plank lines (simulated wood stripes)
            for (let i = -1.6; i <= 1.6; i += 0.4) {
                const plankLine = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.015, 32),
                    new THREE.MeshBasicMaterial({ color: 0x221309, transparent: true, opacity: 0.6 })
                );
                plankLine.rotation.x = -Math.PI / 2;
                plankLine.position.set(i, 0.005, -8);
                this.alleyGroup.add(plankLine);
            }

            // 3. Foul Line (Red & Glow Stripe at z = 1.0)
            const foulGeo = new THREE.PlaneGeometry(3.6, 0.15);
            const foulMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
            const foulLine = new THREE.Mesh(foulGeo, foulMat);
            foulLine.rotation.x = -Math.PI / 2;
            foulLine.position.set(0, 0.01, 0.6);
            this.alleyGroup.add(foulLine);

            // 4. Aiming Chevrons at z = -4.5
            [-1.0, -0.5, 0, 0.5, 1.0].forEach(x => {
                const arrowShape = new THREE.Shape();
                arrowShape.moveTo(0, 0.3);
                arrowShape.lineTo(0.09, -0.18);
                arrowShape.lineTo(0, -0.06);
                arrowShape.lineTo(-0.09, -0.18);
                arrowShape.closePath();

                const arrowMesh = new THREE.Mesh(
                    new THREE.ShapeGeometry(arrowShape),
                    new THREE.MeshBasicMaterial({ color: 0xec4899 })
                );
                arrowMesh.rotation.x = -Math.PI / 2;
                arrowMesh.position.set(x, 0.015, -4.5);
                this.alleyGroup.add(arrowMesh);
            });

            // 5. Targeting Dots at z = -1.5
            [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2].forEach(x => {
                const dot = new THREE.Mesh(
                    new THREE.CircleGeometry(0.05, 12),
                    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
                );
                dot.rotation.x = -Math.PI / 2;
                dot.position.set(x, 0.015, -1.5);
                this.alleyGroup.add(dot);
            });

            // 6. Left & Right Neon Gutters
            [-2.12, 2.12].forEach((x, idx) => {
                const gutterGeo = new THREE.BoxGeometry(0.58, 0.22, 32);
                const gutterMat = new THREE.MeshStandardMaterial({ color: 0x080611, roughness: 0.8 });
                const gutter = new THREE.Mesh(gutterGeo, gutterMat);
                gutter.position.set(x, -0.16, -8);
                this.alleyGroup.add(gutter);

                // Neon Edge Strip (Purple on left, Cyan on right)
                const neonColor = idx === 0 ? 0xa855f7 : 0x06b6d4;
                const neon = new THREE.Mesh(
                    new THREE.BoxGeometry(0.08, 0.08, 32),
                    new THREE.MeshBasicMaterial({ color: neonColor })
                );
                neon.position.set(x + (idx === 0 ? -0.28 : 0.28), 0.03, -8);
                this.alleyGroup.add(neon);
            });

            // 7. Side Outer Walls / Gutters Kickbacks
            [-2.5, 2.5].forEach(x => {
                const kickback = new THREE.Mesh(
                    new THREE.BoxGeometry(0.2, 0.6, 32),
                    new THREE.MeshStandardMaterial({ color: 0x161226, roughness: 0.5 })
                );
                kickback.position.set(x, 0.18, -8);
                this.alleyGroup.add(kickback);
            });

            // 8. Overhead Cosmic Neon Lighting Truss
            [-1.8, 1.8].forEach((x, idx) => {
                const trussGeo = new THREE.CylinderGeometry(0.04, 0.04, 32, 8);
                const trussMat = new THREE.MeshBasicMaterial({
                    color: idx === 0 ? 0xd946ef : 0x0ea5e9
                });
                const truss = new THREE.Mesh(trussGeo, trussMat);
                truss.rotation.x = Math.PI / 2;
                truss.position.set(x, 5.0, -8);
                this.alleyGroup.add(truss);
            });

            // 9. Pin Pit Back Wall & Cosmic Screen
            const pitWall = new THREE.Mesh(
                new THREE.BoxGeometry(6.0, 4.2, 0.8),
                new THREE.MeshStandardMaterial({ color: 0x05040a, roughness: 0.5 })
            );
            pitWall.position.set(0, 1.9, -24.5);
            this.alleyGroup.add(pitWall);

            // Glowing Cosmic Video Screen above pin deck
            const screen = new THREE.Mesh(
                new THREE.PlaneGeometry(4.6, 1.6),
                new THREE.MeshBasicMaterial({ color: 0x221245 })
            );
            screen.position.set(0, 2.6, -24.08);
            this.alleyGroup.add(screen);

            this.scene.add(this.alleyGroup);
        }

        initBall() {
            // Ball at z = 1.8 (clearly visible, right in front of the camera, not hidden under HUD!)
            const ballGeo = new THREE.SphereGeometry(0.34, 32, 32);
            this.ballMat = new THREE.MeshStandardMaterial({
                color: 0xa855f7,
                roughness: 0.1,
                metalness: 0.55
            });

            this.ball = new THREE.Mesh(ballGeo, this.ballMat);
            this.ball.castShadow = true;
            this.ball.position.set(0, 0.34, 1.8);
            this.scene.add(this.ball);

            // 3 Drilled Finger Holes
            const holeMat = new THREE.MeshBasicMaterial({ color: 0x0b0914 });
            const holes = [
                { x: 0, y: 0.33, z: 0.06 },
                { x: -0.07, y: 0.32, z: -0.05 },
                { x: 0.07, y: 0.32, z: -0.05 }
            ];
            holes.forEach(pos => {
                const hole = new THREE.Mesh(new THREE.CircleGeometry(0.045, 10), holeMat);
                hole.rotation.x = -Math.PI / 2;
                hole.position.set(pos.x, pos.y, pos.z);
                this.ball.add(hole);
            });

            this.ballState = {
                pos: new THREE.Vector3(0, 0.34, 1.8),
                vel: new THREE.Vector3(0, 0, 0),
                spin: 0,
                isRolling: false,
                inGutter: false
            };
        }

        initTrajectoryGuide() {
            const points = [];
            for (let i = 0; i <= 22; i++) {
                points.push(new THREE.Vector3(0, 0.02, 1.8 - i * 1.0));
            }
            const guideGeo = new THREE.BufferGeometry().setFromPoints(points);
            this.guideMat = new THREE.LineDashedMaterial({
                color: 0xfbbf24,
                dashSize: 0.4,
                gapSize: 0.25,
                linewidth: 2
            });
            this.guideLine = new THREE.Line(guideGeo, this.guideMat);
            this.guideLine.computeLineDistances();
            this.scene.add(this.guideLine);
            this.updateTrajectoryGuide();
        }

        updateTrajectoryGuide() {
            if (!this.guideLine || this.isRolling) {
                if (this.guideLine) this.guideLine.visible = false;
                return;
            }
            this.guideLine.visible = true;

            const positions = this.guideLine.geometry.attributes.position.array;
            let curX = this.aimX;
            let velX = this.aimSpin * 7.5;

            for (let i = 0; i <= 22; i++) {
                const z = 1.8 - i * 1.0;
                curX += velX * 0.12;
                positions[i * 3] = Math.max(LANE_MIN_X, Math.min(LANE_MAX_X, curX));
                positions[i * 3 + 1] = 0.02;
                positions[i * 3 + 2] = z;
            }
            this.guideLine.geometry.attributes.position.needsUpdate = true;
            this.guideLine.computeLineDistances();
        }

        initSweeper() {
            this.sweeperGroup = new THREE.Group();
            const barGeo = new THREE.BoxGeometry(3.6, 0.16, 0.2);
            const barMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6 });
            const bar = new THREE.Mesh(barGeo, barMat);
            this.sweeperGroup.add(bar);

            this.sweeperGroup.position.set(0, 1.8, -16.5);
            this.scene.add(this.sweeperGroup);
        }

        createRealisticPinMesh() {
            const pin = new THREE.Group();
            const whiteMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.2,
                metalness: 0.05
            });
            const redMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });

            // Base & Belly
            const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.25, 16), whiteMat);
            baseMesh.position.y = 0.125;
            baseMesh.castShadow = true;
            pin.add(baseMesh);

            const bellyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.14, 0.35, 16), whiteMat);
            bellyMesh.position.y = 0.425;
            bellyMesh.castShadow = true;
            pin.add(bellyMesh);

            // Neck
            const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.20, 0.28, 16), whiteMat);
            neckMesh.position.y = 0.74;
            pin.add(neckMesh);

            // Double Red Neck Rings
            const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.04, 16), redMat);
            ring1.position.y = 0.72;
            pin.add(ring1);

            const ring2 = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.04, 16), redMat);
            ring2.position.y = 0.78;
            pin.add(ring2);

            // Head Dome
            const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), whiteMat);
            headMesh.position.y = 0.92;
            headMesh.castShadow = true;
            pin.add(headMesh);

            return pin;
        }

        setup10Pins() {
            this.pins.forEach(p => this.scene.remove(p.mesh));
            this.pins = [];

            // Standard Official 10-Pin Coordinates
            const pinCoords = [
                { id: 1, x: 0, z: -17.2 },
                { id: 2, x: -0.38, z: -18.4 },
                { id: 3, x: 0.38, z: -18.4 },
                { id: 4, x: -0.76, z: -19.6 },
                { id: 5, x: 0, z: -19.6 },
                { id: 6, x: 0.76, z: -19.6 },
                { id: 7, x: -1.14, z: -20.8 },
                { id: 8, x: -0.38, z: -20.8 },
                { id: 9, x: 0.38, z: -20.8 },
                { id: 10, x: 1.14, z: -20.8 }
            ];

            pinCoords.forEach(item => {
                const mesh = this.createRealisticPinMesh();
                mesh.position.set(item.x, 0, item.z);
                this.scene.add(mesh);

                this.pins.push({
                    id: item.id,
                    mesh: mesh,
                    initPos: new THREE.Vector3(item.x, 0, item.z),
                    vel: new THREE.Vector3(0, 0, 0),
                    angVel: new THREE.Vector3(0, 0, 0),
                    isKnocked: false
                });
            });

            this.updatePinRadar();
        }

        updatePinRadar() {
            this.pins.forEach(p => {
                const dot = document.getElementById(`rpin-${p.id}`);
                if (dot) {
                    if (p.isKnocked) {
                        dot.classList.add('knocked');
                    } else {
                        dot.classList.remove('knocked');
                    }
                }
            });
        }

        updateControls(dt) {
            let moveDir = 0;
            if (this.keys.left || this.stepperHold.left) moveDir -= 1;
            if (this.keys.right || this.stepperHold.right) moveDir += 1;

            if (moveDir !== 0) {
                this.aimX = Math.max(LANE_MIN_X, Math.min(LANE_MAX_X, this.aimX + moveDir * STEER_SPEED_AIM * dt));
                if (this.sliderPos) this.sliderPos.value = this.aimX.toFixed(2);
                this.ball.position.x = this.aimX;
                this.ballState.pos.x = this.aimX;
                this.updateTrajectoryGuide();
            }
        }

        rollBall() {
            if (this.isRolling) return;
            this.isRolling = true;
            this.btnRoll.disabled = true;
            if (this.laneHint) this.laneHint.style.opacity = '0';
            if (this.guideLine) this.guideLine.visible = false;

            // Roll starting from z = 1.8, grounded at BALL_Y_LANE
            this.aimX = Math.max(LANE_MIN_X, Math.min(LANE_MAX_X, this.aimX));
            this.ballState.pos.set(this.aimX, BALL_Y_LANE, 1.8);
            const baseSpeed = BASE_ROLL_SPEED * this.powerMultiplier;
            this.ballState.vel.set(0, 0, baseSpeed);
            this.ballState.spin = this.aimSpin;
            this.ballState.inGutter = false;

            this.ball.position.copy(this.ballState.pos);

            if (window.bowlingAudio) window.bowlingAudio.startRollSound();
        }

        updatePhysics(dt) {
            if (!this.isRolling) return;

            const safeDt = Math.min(dt || 0.016, 0.05);

            // Ball lateral steering & curving
            if (!this.ballState.inGutter) {
                let steerInput = 0;
                if (this.keys.left || this.stepperHold.left) steerInput -= 1;
                if (this.keys.right || this.stepperHold.right) steerInput += 1;

                this.ballState.vel.x += (steerInput * STEER_FORCE_ROLL + this.ballState.spin * 36.0) * safeDt;
                const lateralDamping = Math.pow(0.85, safeDt * 60);
                this.ballState.vel.x *= lateralDamping;

                this.ballState.pos.x += this.ballState.vel.x * safeDt;
                this.ballState.pos.y = BALL_Y_LANE;

                // Gutter drop detection when ball rolls off lane edge (lane half-width is 1.80)
                if (Math.abs(this.ballState.pos.x) > 1.80) {
                    this.ballState.inGutter = true;
                    this.ballState.vel.x = 0;
                    if (window.bowlingAudio) window.bowlingAudio.playGutter();
                }
            } else {
                // Ball in gutter channel: disabled steering, smooth channel follow towards pins
                const targetGutterX = this.ballState.pos.x < 0 ? GUTTER_LEFT_X : GUTTER_RIGHT_X;
                this.ballState.pos.x = THREE.MathUtils.lerp(this.ballState.pos.x, targetGutterX, safeDt * 8);
                this.ballState.pos.y = THREE.MathUtils.lerp(this.ballState.pos.y, BALL_Y_GUTTER, safeDt * 8);
                this.ballState.vel.x = 0;
            }

            // Hard boundary clamping: absolute barrier at outer kickbacks
            this.ballState.pos.x = Math.max(-HARD_LIMIT_X, Math.min(HARD_LIMIT_X, this.ballState.pos.x));

            // Forward translation
            this.ballState.pos.z += this.ballState.vel.z * safeDt;

            // Rolling rotation without slip
            this.ball.rotation.x -= (Math.abs(this.ballState.vel.z) / BALL_RADIUS) * safeDt;
            this.ball.rotation.z -= (this.ballState.vel.x / BALL_RADIUS) * safeDt;

            this.ball.position.copy(this.ballState.pos);
            if (this.ballSpot) {
                this.ballSpot.position.set(this.ballState.pos.x, 1.4, this.ballState.pos.z);
            }

            // Ball-to-Pin Collisions
            let hitOccurred = false;
            this.pins.forEach(pin => {
                if (pin.isKnocked) return;
                const dist = pin.mesh.position.distanceTo(this.ballState.pos);
                if (dist < 0.54) {
                    hitOccurred = true;
                    pin.isKnocked = true;
                    const hitDir = new THREE.Vector3().subVectors(pin.mesh.position, this.ballState.pos).normalize();
                    const force = 18.0 * this.powerMultiplier;
                    pin.vel.copy(hitDir).multiplyScalar(force);
                    pin.angVel.set(
                        (Math.random() - 0.5) * 20.0,
                        Math.random() * 18.0,
                        (Math.random() - 0.5) * 20.0
                    );
                }
            });

            // Pin-to-Pin Collisions (Chain Reaction)
            this.pins.forEach(p1 => {
                if (!p1.isKnocked) return;
                this.pins.forEach(p2 => {
                    if (p2.isKnocked || p1 === p2) return;
                    const d = p1.mesh.position.distanceTo(p2.mesh.position);
                    if (d < 0.5) {
                        hitOccurred = true;
                        p2.isKnocked = true;
                        const chainDir = new THREE.Vector3().subVectors(p2.mesh.position, p1.mesh.position).normalize();
                        p2.vel.copy(chainDir).multiplyScalar(12.0);
                        p2.angVel.set(
                            (Math.random() - 0.5) * 18.0,
                            Math.random() * 16.0,
                            (Math.random() - 0.5) * 18.0
                        );
                    }
                });
            });

            if (hitOccurred) {
                const knockedCount = this.pins.filter(p => p.isKnocked).length;
                if (window.bowlingAudio) window.bowlingAudio.playPinCrash(knockedCount);
                this.updatePinRadar();
            }

            // Knocked Pin Tumbling & Physics
            this.pins.forEach(pin => {
                if (pin.isKnocked && pin.vel.length() > 0.05) {
                    pin.mesh.position.addScaledVector(pin.vel, safeDt);
                    pin.mesh.rotation.x += pin.angVel.x * safeDt;
                    pin.mesh.rotation.z += pin.angVel.z * safeDt;
                    const pinFriction = Math.pow(0.88, safeDt * 60);
                    pin.vel.multiplyScalar(pinFriction);
                    pin.angVel.multiplyScalar(pinFriction);
                }
            });

            // End of Roll check (ball passed pit at z < -24.5)
            if (this.ballState.pos.z < -24.5) {
                this.finishCurrentRoll();
            }
        }

        finishCurrentRoll() {
            this.isRolling = false;
            if (window.bowlingAudio) window.bowlingAudio.stopRollSound();

            const totalKnocked = this.pins.filter(p => p.isKnocked).length;
            const pinsThisRoll = totalKnocked - this.pinsKnockedThisFrame;
            this.pinsKnockedThisFrame = totalKnocked;

            const isStrike = this.currentRoll === 1 && totalKnocked === 10;
            const isSpare = this.currentRoll === 2 && totalKnocked === 10;

            if (isStrike) {
                this.showCelebration('STRIKE!', 'Perfect Pocket Hit!');
                if (window.bowlingAudio) window.bowlingAudio.playStrikeFanfare();
            } else if (isSpare) {
                this.showCelebration('SPARE!', 'Cleaned the Deck!');
                if (window.bowlingAudio) window.bowlingAudio.playStrikeFanfare();
            } else if (pinsThisRoll === 0 && this.ballState.inGutter) {
                this.showCelebration('GUTTER BALL!', 'Zero pins knocked');
            }

            const activePlayer = this.players[this.activePlayerIndex];
            const f = activePlayer.frames[this.currentFrame - 1];

            if (this.currentRoll === 1) {
                f.r1 = isStrike ? 'X' : pinsThisRoll;
                if (isStrike) {
                    const prevTotal = this.currentFrame > 1 ? activePlayer.frames[this.currentFrame - 2].total || 0 : 0;
                    f.total = prevTotal + 10;
                    activePlayer.score = f.total;
                    this.renderScorecards();
                    this.triggerSweeperAnimation(() => {
                        this.nextPlayerTurn();
                    });
                    return;
                } else {
                    this.currentRoll = 2;
                    this.renderScorecards();
                    this.triggerSweeperAnimation(() => {
                        this.pins.forEach(p => {
                            if (p.isKnocked) p.mesh.visible = false;
                        });
                        this.resetBallPosition();
                        this.btnRoll.disabled = false;
                        this.setAnnouncer(`${activePlayer.name}: Roll 2 (${10 - totalKnocked} left)`);
                    });
                    return;
                }
            } else {
                f.r2 = isSpare ? '/' : pinsThisRoll;
                const prevTotal = this.currentFrame > 1 ? activePlayer.frames[this.currentFrame - 2].total || 0 : 0;
                f.total = prevTotal + totalKnocked;
                activePlayer.score = f.total;
                this.renderScorecards();

                this.triggerSweeperAnimation(() => {
                    this.nextPlayerTurn();
                });
            }
        }

        triggerSweeperAnimation(callback) {
            if (!this.sweeperGroup) {
                if (callback) callback();
                return;
            }
            if (window.bowlingAudio) window.bowlingAudio.playSweeper();

            let startTime = performance.now();
            const duration = 850;

            const animateSweeper = (now) => {
                const elapsed = now - startTime;
                const p = Math.min(elapsed / duration, 1);

                if (p < 0.4) {
                    this.sweeperGroup.position.y = THREE.MathUtils.lerp(1.8, 0.4, p / 0.4);
                } else if (p < 0.8) {
                    const t = (p - 0.4) / 0.4;
                    this.sweeperGroup.position.z = THREE.MathUtils.lerp(-16.5, -21.5, t);
                } else {
                    const t = (p - 0.8) / 0.2;
                    this.sweeperGroup.position.y = THREE.MathUtils.lerp(0.4, 1.8, t);
                    this.sweeperGroup.position.z = THREE.MathUtils.lerp(-21.5, -16.5, t);
                }

                if (p < 1) {
                    requestAnimationFrame(animateSweeper);
                } else {
                    if (callback) callback();
                }
            };

            requestAnimationFrame(animateSweeper);
        }

        nextPlayerTurn() {
            this.currentRoll = 1;
            this.pinsKnockedThisFrame = 0;
            this.setup10Pins();
            this.resetBallPosition();

            this.activePlayerIndex++;
            if (this.activePlayerIndex >= this.players.length) {
                this.activePlayerIndex = 0;
                this.currentFrame++;

                if (this.currentFrame > this.maxFrames) {
                    this.handleMatchVictory();
                    return;
                }
            }

            this.updateActivePlayerBall();
            this.renderScorecards();
            this.updateHUD();

            const p = this.players[this.activePlayerIndex];
            this.setAnnouncer(`${p.name}'s Turn • Frame ${this.currentFrame}`);

            if (p.isAI) {
                this.btnRoll.disabled = true;
                setTimeout(() => this.playAIRoll(), 900);
            } else {
                this.btnRoll.disabled = false;
            }
        }

        playAIRoll() {
            if (this.isRolling) return;
            this.aimX = (Math.random() - 0.5) * 2.2;
            this.aimX = Math.max(LANE_MIN_X, Math.min(LANE_MAX_X, this.aimX));
            this.aimSpin = (Math.random() - 0.5) * 0.02;
            if (this.sliderPos) this.sliderPos.value = this.aimX.toFixed(2);
            this.updateTrajectoryGuide();
            this.rollBall();
        }

        resetBallPosition() {
            this.aimX = Math.max(LANE_MIN_X, Math.min(LANE_MAX_X, this.aimX));
            this.ballState.pos.set(this.aimX, BALL_Y_LANE, 1.8);
            this.ballState.vel.set(0, 0, 0);
            this.ballState.spin = 0;
            this.ballState.inGutter = false;
            this.ball.position.copy(this.ballState.pos);
            this.ball.rotation.set(0, 0, 0);
            if (this.sliderPos) this.sliderPos.value = this.aimX.toFixed(2);
            this.updateCameraPosition();
            this.updateTrajectoryGuide();
            if (this.laneHint) this.laneHint.style.opacity = '0.85';
        }

        setAnnouncer(text) {
            if (this.announcerText) this.announcerText.textContent = text;
        }

        showCelebration(title, sub) {
            if (!this.celebrationBanner) return;
            this.bannerTitle.textContent = title;
            this.bannerSub.textContent = sub;
            this.celebrationBanner.classList.add('show');
            setTimeout(() => {
                this.celebrationBanner.classList.remove('show');
            }, 1400);
        }

        handleMatchVictory() {
            this.btnRoll.disabled = true;
            if (window.bowlingAudio) window.bowlingAudio.playStrikeFanfare();

            const ranked = [...this.players].sort((a, b) => b.score - a.score);

            if (this.resultsPodium) {
                this.resultsPodium.innerHTML = '';
                ranked.forEach((p, idx) => {
                    const row = document.createElement('div');
                    row.className = `podium-row ${idx === 0 ? 'winner' : ''}`;
                    row.innerHTML = `
                        <span>${idx === 0 ? 'WINNER' : '#' + (idx + 1)} ${p.name}</span>
                        <span>${p.score} PTS</span>
                    `;
                    this.resultsPodium.appendChild(row);
                });
            }

            if (this.modalVictory) this.modalVictory.classList.add('show');
        }

        updateHUD() {
            const p = this.players[this.activePlayerIndex];
            if (p) {
                this.setAnnouncer(`${p.name}'s Turn • Frame ${this.currentFrame}`);
            }
        }

        initEvents() {
            // Keyboard controls for smooth responsive steering
            window.addEventListener('keydown', (e) => {
                if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    this.keys.left = true;
                    e.preventDefault();
                } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    this.keys.right = true;
                    e.preventDefault();
                } else if (e.code === 'Space' || e.code === 'Enter') {
                    if (!this.isRolling && !this.btnRoll.disabled) {
                        this.rollBall();
                        e.preventDefault();
                    }
                }
            });

            window.addEventListener('keyup', (e) => {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    this.keys.left = false;
                } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    this.keys.right = false;
                }
            });

            window.addEventListener('blur', () => {
                this.keys.left = false;
                this.keys.right = false;
                this.stepperHold.left = false;
                this.stepperHold.right = false;
            });

            // Position Slider
            this.sliderPos.addEventListener('input', (e) => {
                this.aimX = Math.max(LANE_MIN_X, Math.min(LANE_MAX_X, parseFloat(e.target.value)));
                if (!this.isRolling) {
                    this.ball.position.x = this.aimX;
                    this.ballState.pos.x = this.aimX;
                    this.updateTrajectoryGuide();
                }
            });

            // Position Steppers with continuous hold support
            const btnLeft = document.getElementById('btn-pos-left');
            const btnRight = document.getElementById('btn-pos-right');

            if (btnLeft) {
                const startLeft = (e) => {
                    e.preventDefault();
                    if (window.bowlingAudio) window.bowlingAudio.playClick();
                    this.stepperHold.left = true;
                };
                const stopLeft = () => {
                    this.stepperHold.left = false;
                };
                btnLeft.addEventListener('pointerdown', startLeft);
                btnLeft.addEventListener('pointerup', stopLeft);
                btnLeft.addEventListener('pointercancel', stopLeft);
                btnLeft.addEventListener('pointerleave', stopLeft);
            }

            if (btnRight) {
                const startRight = (e) => {
                    e.preventDefault();
                    if (window.bowlingAudio) window.bowlingAudio.playClick();
                    this.stepperHold.right = true;
                };
                const stopRight = () => {
                    this.stepperHold.right = false;
                };
                btnRight.addEventListener('pointerdown', startRight);
                btnRight.addEventListener('pointerup', stopRight);
                btnRight.addEventListener('pointercancel', stopRight);
                btnRight.addEventListener('pointerleave', stopRight);
            }

            // Spin Presets
            const presets = [
                { id: 'btn-preset-hook-l', spin: -0.025 },
                { id: 'btn-preset-straight', spin: 0 },
                { id: 'btn-preset-hook-r', spin: 0.025 }
            ];
            presets.forEach(pr => {
                const btn = document.getElementById(pr.id);
                if (btn) {
                    btn.addEventListener('click', () => {
                        if (window.bowlingAudio) window.bowlingAudio.playClick();
                        presets.forEach(p => {
                            const b = document.getElementById(p.id);
                            if (b) b.classList.remove('active');
                        });
                        btn.classList.add('active');
                        this.aimSpin = pr.spin;
                        this.updateTrajectoryGuide();
                    });
                }
            });

            // Power selection
            document.querySelectorAll('.power-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    if (window.bowlingAudio) window.bowlingAudio.playClick();
                    document.querySelectorAll('.power-pill').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                    const pw = pill.getAttribute('data-power');
                    this.powerMultiplier = pw === 'turbo' ? 1.0 : 0.85;
                });
            });

            // Roll button
            this.btnRoll.addEventListener('click', () => {
                this.rollBall();
            });

            // Player Mode Buttons
            ['btn-mode-ai', 'btn-mode-2p', 'btn-mode-3p', 'btn-mode-4p'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.addEventListener('click', () => {
                        if (window.bowlingAudio) window.bowlingAudio.playClick();
                        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        this.gameMode = btn.getAttribute('data-mode');
                        this.restartMatch();
                    });
                }
            });

            // Camera View cycle
            this.btnCam.addEventListener('click', () => {
                if (window.bowlingAudio) window.bowlingAudio.playClick();
                this.isOrbitEnabled = false;
                if (this.controls) this.controls.enabled = false;
                this.btnOrbit.style.background = 'rgba(255, 255, 255, 0.08)';

                this.camViewIndex = (this.camViewIndex + 1) % this.camViews.length;
                this.camBadge.textContent = this.camViews[this.camViewIndex].label;
                this.updateCameraPosition();
            });

            // Free 3D Orbit View toggle (like Chess and Ludo)
            this.btnOrbit.addEventListener('click', () => {
                if (window.bowlingAudio) window.bowlingAudio.playClick();
                this.isOrbitEnabled = !this.isOrbitEnabled;
                if (this.controls) this.controls.enabled = this.isOrbitEnabled;
                this.btnOrbit.style.background = this.isOrbitEnabled ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.08)';
                if (!this.isOrbitEnabled) {
                    this.updateCameraPosition();
                }
            });

            // Audio mute toggle
            this.btnMute.addEventListener('click', () => {
                if (window.bowlingAudio) {
                    const isMuted = window.bowlingAudio.toggleMute();
                    this.btnMute.innerHTML = isMuted 
                        ? '<i class="fa-solid fa-volume-xmark" style="color: #ef4444"></i>' 
                        : '<i class="fa-solid fa-volume-high"></i>';
                }
            });

            // Restart match
            this.btnRestart.addEventListener('click', () => {
                if (window.bowlingAudio) window.bowlingAudio.playClick();
                this.restartMatch();
            });

            if (this.btnRematch) {
                this.btnRematch.addEventListener('click', () => {
                    if (window.bowlingAudio) window.bowlingAudio.playClick();
                    this.restartMatch();
                });
            }

            // Direct Touch/Drag on the 3D Lane to position the ball
            let isDragging = false;
            const container = this.container;

            const onPointerMove = (e) => {
                if (!isDragging || this.isRolling || this.isOrbitEnabled) return;
                const rect = container.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const normX = (clientX - rect.left) / rect.width;
                // Map screen width to lane width (-1.46 to 1.46)
                const computedAim = (normX - 0.5) * (LANE_WIDTH * 0.95);
                this.aimX = Math.max(LANE_MIN_X, Math.min(LANE_MAX_X, computedAim));
                if (this.sliderPos) this.sliderPos.value = this.aimX.toFixed(2);
                this.ball.position.x = this.aimX;
                this.ballState.pos.x = this.aimX;
                this.updateTrajectoryGuide();
            };

            container.addEventListener('pointerdown', (e) => {
                if (e.clientY > window.innerHeight * 0.4 && !this.isRolling && !this.isOrbitEnabled) {
                    isDragging = true;
                    onPointerMove(e);
                }
            });

            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', () => { isDragging = false; });
            window.addEventListener('pointercancel', () => { isDragging = false; });
        }

        restartMatch() {
            if (this.modalVictory) this.modalVictory.classList.remove('show');
            this.isRolling = false;
            this.currentFrame = 1;
            this.currentRoll = 1;
            this.activePlayerIndex = 0;
            this.pinsKnockedThisFrame = 0;

            this.setupPlayers();
            this.setup10Pins();
            this.resetBallPosition();
            this.btnRoll.disabled = false;
            this.updateHUD();
        }

        animate() {
            requestAnimationFrame(this.animate);
            const dt = Math.min(this.clock.getDelta(), 0.05);

            if (this.isOrbitEnabled && this.controls) {
                this.controls.update();
            } else {
                this.updateCameraPosition();
            }

            if (!this.isRolling) {
                this.updateControls(dt);
            } else {
                this.updatePhysics(dt);
            }

            this.renderer.render(this.scene, this.camera);
        }
    }

    // Launch
    window.addEventListener('DOMContentLoaded', () => {
        new CosmicBowling3D();
    });
})();
