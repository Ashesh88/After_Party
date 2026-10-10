// Cosmic 3D Bowling - Advanced 1P/2P/3P/4P Engine with Three.js
(function () {
    'use strict';

    // Player color palettes
    const PLAYER_CONFIGS = [
        { id: 'p1', defaultName: 'Player 1', colorHex: 0xa855f7, cssClass: 'p-theme-p1', badgeText: 'P1' },
        { id: 'p2', defaultName: 'Player 2', colorHex: 0x06b6d4, cssClass: 'p-theme-p2', badgeText: 'P2' },
        { id: 'p3', defaultName: 'Player 3', colorHex: 0x10b981, cssClass: 'p-theme-p3', badgeText: 'P3' },
        { id: 'p4', defaultName: 'Player 4', colorHex: 0xf43f5e, cssClass: 'p-theme-p4', badgeText: 'P4' }
    ];

    class CosmicBowling3D {
        constructor() {
            this.container = document.getElementById('canvas-container');

            const params = new URLSearchParams(window.location.search);
            this.urlP1 = params.get('p1') || 'You';
            this.urlP2 = params.get('p2') || 'Friend';

            // Game Settings & Multi-Player State
            this.gameMode = '2p'; // 'ai', '2p', '3p', '4p'
            this.maxFrames = 10;
            this.currentFrame = 1; // 1 to 10
            this.currentRoll = 1; // 1 or 2
            this.activePlayerIndex = 0;
            this.players = [];

            // Aim & Throw controls
            this.aimX = 0; // -1.4 to +1.4
            this.aimSpin = 0; // -0.035 to +0.035
            this.powerMultiplier = 0.85; // soft: 0.7, normal: 0.85, turbo: 1.0
            this.isRolling = false;

            // Camera views
            this.camViewIndex = 0; // 0: Bowler Cam, 1: High Overhead, 2: Action Cam
            this.camViews = [
                { pos: new THREE.Vector3(0, 3.4, 9.8), target: new THREE.Vector3(0, 0.4, -16), label: 'Bowler' },
                { pos: new THREE.Vector3(0, 9.5, -4.0), target: new THREE.Vector3(0, 0, -17), label: 'Overhead' },
                { pos: new THREE.Vector3(0, 3.2, 9.5), target: new THREE.Vector3(0, 0.4, -18), label: 'Action' }
            ];

            // 10 Pins and Sweeper
            this.pins = [];
            this.pinsKnockedThisFrame = 0;
            this.sweeperMesh = null;
            this.isSweeping = false;

            // DOM References
            this.cacheDOM();

            // Initialize Three.js scene
            this.initThree();
            this.initAlley();
            this.initBall();
            this.initTrajectoryGuide();
            this.initSweeper();
            this.setup10Pins();

            // Setup players & HUD
            this.setupPlayers();
            this.initEvents();
            this.updateHUD();

            // Animation Loop
            this.animate = this.animate.bind(this);
            requestAnimationFrame(this.animate);
        }

        cacheDOM() {
            this.scoreboardsDock = document.getElementById('scoreboards-dock');
            this.framePill = document.getElementById('frame-pill');
            this.announcerText = document.getElementById('announcer-text');
            this.sliderPos = document.getElementById('slider-pos');
            this.sliderSpin = document.getElementById('slider-spin');
            this.posVal = document.getElementById('pos-val');
            this.spinVal = document.getElementById('spin-val');
            this.btnRoll = document.getElementById('btn-roll');
            this.btnCam = document.getElementById('btn-cam');
            this.camBadge = document.getElementById('cam-badge');
            this.btnMute = document.getElementById('btn-mute');
            this.btnRestart = document.getElementById('btn-restart');
            this.celebrationBanner = document.getElementById('celebration-banner');
            this.bannerTitle = document.getElementById('banner-title');
            this.bannerSub = document.getElementById('banner-sub');
            this.modalVictory = document.getElementById('modal-victory');
            this.resultsPodium = document.getElementById('results-podium');
            this.btnRematch = document.getElementById('btn-rematch');
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
                const card = document.createElement('div');
                card.id = `scorecard-${p.id}`;
                card.className = `player-scorecard ${p.cssClass} ${idx === this.activePlayerIndex ? 'active-turn' : ''}`;

                let framesHTML = '';
                for (let f = 0; f < this.maxFrames; f++) {
                    const fr = p.frames[f];
                    let r1Str = fr.r1 === null ? '' : fr.r1;
                    let r2Str = fr.r2 === null ? '' : fr.r2;
                    let cellClass = 'frame-dot';
                    if (r1Str === 'X') cellClass += ' strike';
                    else if (r2Str === '/') cellClass += ' spare';

                    framesHTML += `<span class="${cellClass}">${r1Str || '-'}${r2Str ? '|' + r2Str : ''}</span>`;
                }

                card.innerHTML = `
                    <div class="card-head">
                        <span class="p-badge ${p.id}-badge">${p.badgeText}</span>
                        <span class="p-name">${p.name}</span>
                        <span class="turn-dot"></span>
                    </div>
                    <div class="score-display">
                        <span class="score-num" id="${p.id}-score-val">${p.score}</span>
                        <span class="score-lbl">PTS</span>
                    </div>
                    <div class="frame-indicators" id="${p.id}-frames-row">
                        ${framesHTML}
                    </div>
                `;
                this.scoreboardsDock.appendChild(card);
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
            this.scene.fog = new THREE.FogExp2(0x090814, 0.011);

            const aspect = window.innerWidth / window.innerHeight;
            this.camera = new THREE.PerspectiveCamera(window.innerWidth < 650 ? 56 : 46, aspect, 0.1, 140);
            this.updateCameraPosition();

            this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setClearColor(0x090814);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.container.appendChild(this.renderer.domElement);

            // Lighting Setup
            const ambient = new THREE.AmbientLight(0x7c3aed, 0.5);
            this.scene.add(ambient);

            // Lane main overhead light
            const mainLight = new THREE.DirectionalLight(0xfff7ed, 0.85);
            mainLight.position.set(0, 10, -2);
            mainLight.castShadow = true;
            mainLight.shadow.mapSize.width = 1024;
            mainLight.shadow.mapSize.height = 1024;
            this.scene.add(mainLight);

            // Pin deck luminous spotlight
            this.pinLight = new THREE.SpotLight(0xffffff, 2.0);
            this.pinLight.position.set(0, 7.5, -16);
            this.pinLight.target.position.set(0, 0.5, -19);
            this.pinLight.angle = Math.PI / 4;
            this.pinLight.penumbra = 0.3;
            this.pinLight.castShadow = true;
            this.scene.add(this.pinLight);
            this.scene.add(this.pinLight.target);

            // Ball follower point light
            this.ballSpot = new THREE.PointLight(0xa855f7, 1.2, 6);
            this.ballSpot.position.set(0, 1.2, 5.5);
            this.scene.add(this.ballSpot);

            window.addEventListener('resize', () => {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            });
        }

        updateCameraPosition() {
            const current = this.camViews[this.camViewIndex];
            if (this.camViewIndex === 2 && this.isRolling) {
                // Action cam follows ball
                const bPos = this.ball ? this.ball.position : new THREE.Vector3(0, 0.32, 5.5);
                this.camera.position.set(bPos.x * 0.4, 2.2, bPos.z + 4.2);
                this.camera.lookAt(bPos.x, 0.4, bPos.z - 6.0);
            } else {
                this.camera.position.copy(current.pos);
                this.camera.lookAt(current.target);
            }
        }

        initAlley() {
            this.alleyGroup = new THREE.Group();

            // 1. Polished Maple Wood Lane (Width 3.8 x Length 32)
            const laneGeo = new THREE.BoxGeometry(3.6, 0.2, 32);
            const laneMat = new THREE.MeshStandardMaterial({
                color: 0x2e1d13, // Rich warm hardwood
                roughness: 0.18,
                metalness: 0.12
            });
            const lane = new THREE.Mesh(laneGeo, laneMat);
            lane.position.set(0, -0.1, -7);
            lane.receiveShadow = true;
            this.alleyGroup.add(lane);

            // 2. Foul Line (Red & Black band at z = 4.0)
            const foulGeo = new THREE.PlaneGeometry(3.6, 0.12);
            const foulMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
            const foulLine = new THREE.Mesh(foulGeo, foulMat);
            foulLine.rotation.x = -Math.PI / 2;
            foulLine.position.set(0, 0.01, 3.8);
            this.alleyGroup.add(foulLine);

            // 3. Aiming Arrows on Lane at z = -2.5
            [-1.0, -0.5, 0, 0.5, 1.0].forEach(x => {
                const arrowShape = new THREE.Shape();
                arrowShape.moveTo(0, 0.25);
                arrowShape.lineTo(0.08, -0.15);
                arrowShape.lineTo(0, -0.05);
                arrowShape.lineTo(-0.08, -0.15);
                arrowShape.closePath();

                const arrowGeo = new THREE.ShapeGeometry(arrowShape);
                const arrowMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
                const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
                arrowMesh.rotation.x = -Math.PI / 2;
                arrowMesh.position.set(x, 0.015, -2.5);
                this.alleyGroup.add(arrowMesh);
            });

            // 4. Approach Dots at z = 2.0
            [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2].forEach(x => {
                const dot = new THREE.Mesh(
                    new THREE.CircleGeometry(0.05, 10),
                    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
                );
                dot.rotation.x = -Math.PI / 2;
                dot.position.set(x, 0.015, 2.0);
                this.alleyGroup.add(dot);
            });

            // 5. Left & Right Cosmic Gutters
            [-2.12, 2.12].forEach((x, idx) => {
                const gutterGeo = new THREE.BoxGeometry(0.58, 0.22, 32);
                const gutterMat = new THREE.MeshStandardMaterial({ color: 0x0a0815, roughness: 0.75 });
                const gutter = new THREE.Mesh(gutterGeo, gutterMat);
                gutter.position.set(x, -0.16, -7);
                this.alleyGroup.add(gutter);

                // Neon Edge Strips
                const neonGeo = new THREE.BoxGeometry(0.06, 0.06, 32);
                const neonMat = new THREE.MeshBasicMaterial({
                    color: idx === 0 ? 0xa855f7 : 0x06b6d4
                });
                const neon = new THREE.Mesh(neonGeo, neonMat);
                neon.position.set(x + (idx === 0 ? -0.28 : 0.28), 0.02, -7);
                this.alleyGroup.add(neon);
            });

            // 6. Side Kickbacks / Bumpers
            [-2.48, 2.48].forEach(x => {
                const bumperGeo = new THREE.BoxGeometry(0.18, 0.5, 32);
                const bumperMat = new THREE.MeshStandardMaterial({ color: 0x181528, roughness: 0.6 });
                const bumper = new THREE.Mesh(bumperGeo, bumperMat);
                bumper.position.set(x, 0.15, -7);
                this.alleyGroup.add(bumper);
            });

            // 7. Pin Pit & Back Wall
            const pitWall = new THREE.Mesh(
                new THREE.BoxGeometry(5.8, 4.0, 0.6),
                new THREE.MeshStandardMaterial({ color: 0x05040a, roughness: 0.5 })
            );
            pitWall.position.set(0, 1.8, -23.5);
            this.alleyGroup.add(pitWall);

            // Cosmic Logo on Back Wall
            const screen = new THREE.Mesh(
                new THREE.PlaneGeometry(4.2, 1.4),
                new THREE.MeshBasicMaterial({ color: 0x1f143d })
            );
            screen.position.set(0, 2.4, -23.15);
            this.alleyGroup.add(screen);

            this.scene.add(this.alleyGroup);
        }

        initBall() {
            const ballGeo = new THREE.SphereGeometry(0.32, 28, 28);
            this.ballMat = new THREE.MeshStandardMaterial({
                color: 0xa855f7,
                roughness: 0.12,
                metalness: 0.6
            });

            this.ball = new THREE.Mesh(ballGeo, this.ballMat);
            this.ball.castShadow = true;
            this.ball.position.set(0, 0.32, 5.5);
            this.scene.add(this.ball);

            // 3 Drilled Finger Holes
            const holeMat = new THREE.MeshBasicMaterial({ color: 0x0d0b14 });
            const holes = [
                { x: 0, y: 0.31, z: 0.05 },
                { x: -0.06, y: 0.30, z: -0.05 },
                { x: 0.06, y: 0.30, z: -0.05 }
            ];
            holes.forEach(pos => {
                const hole = new THREE.Mesh(new THREE.CircleGeometry(0.04, 10), holeMat);
                hole.rotation.x = -Math.PI / 2;
                hole.position.set(pos.x, pos.y, pos.z);
                this.ball.add(hole);
            });

            this.ballState = {
                pos: new THREE.Vector3(0, 0.32, 5.5),
                vel: new THREE.Vector3(0, 0, 0),
                spin: 0,
                isRolling: false,
                inGutter: false
            };
        }

        initTrajectoryGuide() {
            // Projected dotted trajectory curve
            const points = [];
            for (let i = 0; i <= 24; i++) {
                points.push(new THREE.Vector3(0, 0.02, 5.5 - i * 1.0));
            }
            const guideGeo = new THREE.BufferGeometry().setFromPoints(points);
            this.guideMat = new THREE.LineDashedMaterial({
                color: 0xfbbf24,
                dashSize: 0.35,
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
            let velX = this.aimSpin * 8.0;

            for (let i = 0; i <= 24; i++) {
                const z = 5.5 - i * 1.0;
                curX += velX * 0.12;
                positions[i * 3] = curX;
                positions[i * 3 + 1] = 0.02;
                positions[i * 3 + 2] = z;
            }
            this.guideLine.geometry.attributes.position.needsUpdate = true;
            this.guideLine.computeLineDistances();
        }

        initSweeper() {
            // Motorized Pin Sweeper Arm
            this.sweeperGroup = new THREE.Group();

            const barGeo = new THREE.BoxGeometry(3.6, 0.15, 0.2);
            const barMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.5 });
            const bar = new THREE.Mesh(barGeo, barMat);
            this.sweeperGroup.add(bar);

            this.sweeperGroup.position.set(0, 1.8, -16.5);
            this.scene.add(this.sweeperGroup);
        }

        createRealisticPinMesh() {
            const pin = new THREE.Group();
            const whiteMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.25,
                metalness: 0.08
            });
            const redMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });

            // Base & Belly
            const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.25, 16), whiteMat);
            baseMesh.position.y = 0.125;
            baseMesh.castShadow = true;
            pin.add(baseMesh);

            const bellyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.35, 16), whiteMat);
            bellyMesh.position.y = 0.425;
            bellyMesh.castShadow = true;
            pin.add(bellyMesh);

            // Neck
            const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.19, 0.28, 16), whiteMat);
            neckMesh.position.y = 0.74;
            pin.add(neckMesh);

            // Red Double Rings
            const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.04, 16), redMat);
            ring1.position.y = 0.72;
            pin.add(ring1);

            const ring2 = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.04, 16), redMat);
            ring2.position.y = 0.78;
            pin.add(ring2);

            // Head Dome
            const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 16), whiteMat);
            headMesh.position.y = 0.92;
            headMesh.castShadow = true;
            pin.add(headMesh);

            return pin;
        }

        setup10Pins() {
            // Remove previous pins
            this.pins.forEach(p => this.scene.remove(p.mesh));
            this.pins = [];

            // Standard Official 10-Pin Coordinates in Triangle
            // Pin 1 at apex (z = -17.2)
            // Pins 2, 3 at z = -18.4
            // Pins 4, 5, 6 at z = -19.6
            // Pins 7, 8, 9, 10 at z = -20.8
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

        rollBall() {
            if (this.isRolling) return;
            this.isRolling = true;
            this.btnRoll.disabled = true;
            if (this.guideLine) this.guideLine.visible = false;

            // Apply Aim Position and Power
            this.ballState.pos.set(this.aimX, 0.32, 5.5);
            const baseSpeed = -0.74 * this.powerMultiplier;
            this.ballState.vel.set(0, 0, baseSpeed);
            this.ballState.spin = this.aimSpin;
            this.ballState.inGutter = false;

            this.ball.position.copy(this.ballState.pos);

            if (window.bowlingAudio) window.bowlingAudio.startRollSound();
        }

        updatePhysics() {
            if (!this.isRolling) return;

            // 1. Ball forward translation with lateral curve
            this.ballState.vel.x += this.ballState.spin;
            this.ballState.pos.add(this.ballState.vel);

            // Ball rotation along its motion vector
            this.ball.rotation.x -= 0.22 * this.powerMultiplier;
            this.ball.rotation.z -= this.ballState.vel.x * 0.45;

            // Gutter check (|x| > 1.8)
            if (Math.abs(this.ballState.pos.x) > 1.8 && !this.ballState.inGutter) {
                this.ballState.inGutter = true;
                this.ballState.vel.x = 0; // lock into gutter groove
                this.ballState.pos.y = 0.1;
                if (window.bowlingAudio) window.bowlingAudio.playGutter();
            }

            this.ball.position.copy(this.ballState.pos);
            if (this.ballSpot) {
                this.ballSpot.position.set(this.ballState.pos.x, 1.2, this.ballState.pos.z);
            }

            // 2. Ball-to-Pin Collisions
            let hitOccurred = false;
            this.pins.forEach(pin => {
                if (pin.isKnocked) return;
                const dist = pin.mesh.position.distanceTo(this.ballState.pos);
                if (dist < 0.54) {
                    hitOccurred = true;
                    pin.isKnocked = true;
                    const hitDir = new THREE.Vector3().subVectors(pin.mesh.position, this.ballState.pos).normalize();
                    const force = 0.26 * this.powerMultiplier;
                    pin.vel.copy(hitDir).multiplyScalar(force);
                    pin.angVel.set(
                        (Math.random() - 0.5) * 0.35,
                        Math.random() * 0.3,
                        (Math.random() - 0.5) * 0.35
                    );
                }
            });

            // 3. Pin-to-Pin Chain Reaction Collisions
            this.pins.forEach(p1 => {
                if (!p1.isKnocked) return;
                this.pins.forEach(p2 => {
                    if (p2.isKnocked || p1 === p2) return;
                    const d = p1.mesh.position.distanceTo(p2.mesh.position);
                    if (d < 0.5) {
                        hitOccurred = true;
                        p2.isKnocked = true;
                        const chainDir = new THREE.Vector3().subVectors(p2.mesh.position, p1.mesh.position).normalize();
                        p2.vel.copy(chainDir).multiplyScalar(0.2);
                        p2.angVel.set(
                            (Math.random() - 0.5) * 0.3,
                            Math.random() * 0.25,
                            (Math.random() - 0.5) * 0.3
                        );
                    }
                });
            });

            if (hitOccurred) {
                const knockedCount = this.pins.filter(p => p.isKnocked).length;
                if (window.bowlingAudio) window.bowlingAudio.playPinCrash(knockedCount);
                this.updatePinRadar();
            }

            // 4. Knocked Pin Physics (sliding, tipping over)
            this.pins.forEach(pin => {
                if (pin.isKnocked && pin.vel.length() > 0.005) {
                    pin.mesh.position.add(pin.vel);
                    pin.mesh.rotation.x += pin.angVel.x;
                    pin.mesh.rotation.z += pin.angVel.z;
                    pin.vel.multiplyScalar(0.92); // surface friction
                }
            });

            // 5. End of roll check (ball past pit at z < -24.5)
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
                this.showCelebration('STRIKE! 🎳🔥', 'Perfect Pocket Hit!');
                if (window.bowlingAudio) window.bowlingAudio.playStrikeFanfare();
            } else if (isSpare) {
                this.showCelebration('SPARE! ✨🎯', 'Cleaned the Deck!');
                if (window.bowlingAudio) window.bowlingAudio.playStrikeFanfare();
            } else if (pinsThisRoll === 0 && this.ballState.inGutter) {
                this.showCelebration('GUTTER BALL! 💨', 'Better luck next roll!');
            }

            // Record in Active Player Scorecard
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
                    // Prepare Roll 2
                    this.currentRoll = 2;
                    this.renderScorecards();
                    this.triggerSweeperAnimation(() => {
                        // Remove fallen pins from deck
                        this.pins.forEach(p => {
                            if (p.isKnocked) p.mesh.visible = false;
                        });
                        this.resetBallPosition();
                        this.btnRoll.disabled = false;
                        this.setAnnouncer(`${activePlayer.name}: Roll 2 (${10 - totalKnocked} pins left)`);
                    });
                    return;
                }
            } else {
                // Roll 2 Complete
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

            // Lower sweeper arm down and slide to -22, then return up
            let startTime = performance.now();
            const duration = 900; // ms

            const animateSweeper = (now) => {
                const elapsed = now - startTime;
                const p = Math.min(elapsed / duration, 1);

                if (p < 0.4) {
                    // Lowering
                    this.sweeperGroup.position.y = THREE.MathUtils.lerp(1.8, 0.4, p / 0.4);
                } else if (p < 0.8) {
                    // Sweeping backward
                    const t = (p - 0.4) / 0.4;
                    this.sweeperGroup.position.z = THREE.MathUtils.lerp(-16.5, -21.5, t);
                } else {
                    // Raising and returning
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

            // Move to next player
            this.activePlayerIndex++;
            if (this.activePlayerIndex >= this.players.length) {
                // All players finished current frame -> next frame
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
            // Realistic AI aim selection
            this.aimX = (Math.random() - 0.5) * 0.9;
            this.aimSpin = (Math.random() - 0.5) * 0.02;
            this.sliderPos.value = this.aimX;
            this.sliderSpin.value = this.aimSpin;
            this.posVal.textContent = `${this.aimX.toFixed(2)}`;
            this.spinVal.textContent = this.aimSpin > 0 ? 'Hook Right' : (this.aimSpin < 0 ? 'Hook Left' : 'Straight');
            this.updateTrajectoryGuide();

            this.rollBall();
        }

        resetBallPosition() {
            this.ballState.pos.set(this.aimX, 0.32, 5.5);
            this.ballState.vel.set(0, 0, 0);
            this.ball.position.copy(this.ballState.pos);
            this.updateCameraPosition();
            this.updateTrajectoryGuide();
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

            // Rank players by total score
            const ranked = [...this.players].sort((a, b) => b.score - a.score);

            if (this.resultsPodium) {
                this.resultsPodium.innerHTML = '';
                ranked.forEach((p, idx) => {
                    const row = document.createElement('div');
                    row.className = `podium-row ${idx === 0 ? 'winner' : ''}`;
                    row.innerHTML = `
                        <span>${idx === 0 ? '👑' : `#${idx + 1}`} ${p.name}</span>
                        <span>${p.score} PTS</span>
                    `;
                    this.resultsPodium.appendChild(row);
                });
            }

            if (this.modalVictory) this.modalVictory.classList.add('show');
        }

        updateHUD() {
            if (this.framePill) {
                this.framePill.textContent = `Frame ${this.currentFrame} / ${this.maxFrames}`;
            }
        }

        initEvents() {
            // Position Slider & Steppers
            this.sliderPos.addEventListener('input', (e) => {
                this.aimX = parseFloat(e.target.value);
                this.posVal.textContent = `${this.aimX >= 0 ? '+' : ''}${this.aimX.toFixed(2)}`;
                if (!this.isRolling) {
                    this.ball.position.x = this.aimX;
                    this.updateTrajectoryGuide();
                }
            });

            document.getElementById('btn-pos-left').addEventListener('click', () => {
                if (window.bowlingAudio) window.bowlingAudio.playClick();
                this.aimX = Math.max(-1.4, this.aimX - 0.15);
                this.sliderPos.value = this.aimX;
                this.posVal.textContent = `${this.aimX.toFixed(2)}`;
                this.resetBallPosition();
            });

            document.getElementById('btn-pos-right').addEventListener('click', () => {
                if (window.bowlingAudio) window.bowlingAudio.playClick();
                this.aimX = Math.min(1.4, this.aimX + 0.15);
                this.sliderPos.value = this.aimX;
                this.posVal.textContent = `${this.aimX.toFixed(2)}`;
                this.resetBallPosition();
            });

            // Spin Slider & Steppers
            this.sliderSpin.addEventListener('input', (e) => {
                this.aimSpin = parseFloat(e.target.value);
                this.spinVal.textContent = this.aimSpin > 0 ? 'Hook Right' : (this.aimSpin < 0 ? 'Hook Left' : 'Straight');
                this.updateTrajectoryGuide();
            });

            document.getElementById('btn-spin-left').addEventListener('click', () => {
                if (window.bowlingAudio) window.bowlingAudio.playClick();
                this.aimSpin = Math.max(-0.035, this.aimSpin - 0.01);
                this.sliderSpin.value = this.aimSpin;
                this.spinVal.textContent = 'Hook Left';
                this.updateTrajectoryGuide();
            });

            document.getElementById('btn-spin-right').addEventListener('click', () => {
                if (window.bowlingAudio) window.bowlingAudio.playClick();
                this.aimSpin = Math.min(0.035, this.aimSpin + 0.01);
                this.sliderSpin.value = this.aimSpin;
                this.spinVal.textContent = 'Hook Right';
                this.updateTrajectoryGuide();
            });

            // Spin Presets
            const presets = [
                { id: 'btn-preset-hook-l', spin: -0.025, label: 'Hook Left' },
                { id: 'btn-preset-straight', spin: 0, label: 'Straight' },
                { id: 'btn-preset-hook-r', spin: 0.025, label: 'Hook Right' }
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
                        this.sliderSpin.value = pr.spin;
                        this.spinVal.textContent = pr.label;
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
                    if (pw === 'soft') this.powerMultiplier = 0.7;
                    else if (pw === 'normal') this.powerMultiplier = 0.85;
                    else if (pw === 'turbo') this.powerMultiplier = 1.0;
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

            // Camera toggle
            this.btnCam.addEventListener('click', () => {
                if (window.bowlingAudio) window.bowlingAudio.playClick();
                this.camViewIndex = (this.camViewIndex + 1) % this.camViews.length;
                this.camBadge.textContent = this.camViews[this.camViewIndex].label;
                this.updateCameraPosition();
            });

            // Sound mute toggle
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

            // Direct Touch / Pointer drag on canvas to position the ball
            let isDragging = false;
            const container = this.container;

            const onPointerMove = (e) => {
                if (!isDragging || this.isRolling) return;
                const rect = container.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const normX = (clientX - rect.left) / rect.width; // 0 to 1
                // Map to -1.4 .. +1.4
                this.aimX = (normX - 0.5) * 2.8;
                this.aimX = Math.max(-1.4, Math.min(1.4, this.aimX));
                this.sliderPos.value = this.aimX;
                this.posVal.textContent = `${this.aimX.toFixed(2)}`;
                this.ball.position.x = this.aimX;
                this.updateTrajectoryGuide();
            };

            container.addEventListener('pointerdown', (e) => {
                if (e.clientY > window.innerHeight * 0.45 && !this.isRolling) {
                    isDragging = true;
                    onPointerMove(e);
                }
            });

            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', () => { isDragging = false; });
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
            this.setAnnouncer(`${this.players[0].name}: Set Position & Roll!`);
        }

        animate() {
            requestAnimationFrame(this.animate);
            this.updatePhysics();
            this.updateCameraPosition();
            this.renderer.render(this.scene, this.camera);
        }
    }

    // Initialize on window load
    window.addEventListener('DOMContentLoaded', () => {
        new CosmicBowling3D();
    });
})();
