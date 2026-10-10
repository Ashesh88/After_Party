// Cosmic 3D Bowling - Complete 3D Bowling Game Engine with Three.js

class CosmicBowling3D {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.isBotMode = false;

        const params = new URLSearchParams(window.location.search);
        this.p1Name = params.get('p1') || 'You';
        this.p2Name = params.get('p2') || 'Friend';

        // Match State
        this.currentPlayer = 'p1'; // 'p1' | 'p2'
        this.currentFrame = 1;
        this.maxFrames = 10;
        this.currentRoll = 1; // 1 or 2

        this.scores = {
            p1: { total: 0, frames: Array(10).fill(null).map(() => ({ r1: null, r2: null, total: null })) },
            p2: { total: 0, frames: Array(10).fill(null).map(() => ({ r1: null, r2: null, total: null })) }
        };

        // Aim Controls
        this.aimX = 0; // -1.4 to 1.4
        this.aimSpin = 0; // -0.03 to 0.03
        this.isRolling = false;

        // Pin definitions: 10 pins in triangle
        this.pins = [];
        this.pinsKnockedThisFrame = 0;

        this.initThree();
        this.initAlley();
        this.initBall();
        this.setup10Pins();
        this.initEvents();
        this.updateHUD();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x090814, 0.012);

        this.camera = new THREE.PerspectiveCamera(
            window.innerWidth < 650 ? 58 : 48,
            window.innerWidth / window.innerHeight,
            0.1,
            120
        );
        this.camera.position.set(0, 3.6, 10.5);
        this.camera.lookAt(0, 0.5, -16);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x090814);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting: Overhead track spotlights & neon glow
        const ambient = new THREE.AmbientLight(0x7c3aed, 0.45);
        this.scene.add(ambient);

        const spot = new THREE.SpotLight(0xffffff, 1.2);
        spot.position.set(0, 8, -4);
        spot.target.position.set(0, 0, -18);
        spot.castShadow = true;
        this.scene.add(spot);
        this.scene.add(spot.target);

        const pinSpot = new THREE.PointLight(0xec4899, 1.0, 15);
        pinSpot.position.set(0, 4, -18);
        this.scene.add(pinSpot);
    }

    initAlley() {
        this.alleyGroup = new THREE.Group();

        // 1. Hardwood Bowling Lane (Width 3.8 x Length 32)
        const laneGeo = new THREE.BoxGeometry(3.6, 0.2, 30);
        const laneMat = new THREE.MeshStandardMaterial({
            color: 0x271911, // Rich Amber Maple Wood
            roughness: 0.25,
            metalness: 0.15
        });
        const lane = new THREE.Mesh(laneGeo, laneMat);
        lane.position.set(0, -0.1, -6);
        lane.receiveShadow = true;
        this.alleyGroup.add(lane);

        // Lane Arrows & Dots
        [-0.8, -0.4, 0, 0.4, 0.8].forEach(x => {
            const dot = new THREE.Mesh(
                new THREE.CircleGeometry(0.06, 8),
                new THREE.MeshBasicMaterial({ color: 0xec4899 })
            );
            dot.rotation.x = -Math.PI / 2;
            dot.position.set(x, 0.01, 1.5);
            this.alleyGroup.add(dot);
        });

        // 2. Left & Right Cosmic Neon Gutters
        [-2.1, 2.1].forEach((x, idx) => {
            const gutterGeo = new THREE.BoxGeometry(0.55, 0.2, 30);
            const gutterMat = new THREE.MeshStandardMaterial({ color: 0x0f0c1e, roughness: 0.8 });
            const gutter = new THREE.Mesh(gutterGeo, gutterMat);
            gutter.position.set(x, -0.18, -6);
            this.alleyGroup.add(gutter);

            // Glowing Neon Edge Line
            const neon = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.06, 30),
                new THREE.MeshBasicMaterial({ color: idx === 0 ? 0xec4899 : 0x06b6d4 })
            );
            neon.position.set(x + (idx === 0 ? -0.28 : 0.28), 0.02, -6);
            this.alleyGroup.add(neon);
        });

        // 3. Pin Pit & Back Wall
        const wall = new THREE.Mesh(
            new THREE.BoxGeometry(5.2, 3.5, 0.8),
            new THREE.MeshStandardMaterial({ color: 0x080612, metalness: 0.8 })
        );
        wall.position.set(0, 1.5, -22.5);
        this.alleyGroup.add(wall);

        this.scene.add(this.alleyGroup);
    }

    createPinMesh() {
        const pin = new THREE.Group();

        // Pin Body: Stacked Lathe / Cylinders for authentic curve
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3 });
        const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

        // Belly
        const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.5, 14), whiteMat);
        belly.position.y = 0.25;
        belly.castShadow = true;
        pin.add(belly);

        // Neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.18, 0.3, 14), whiteMat);
        neck.position.y = 0.6;
        pin.add(neck);

        // Red Neck Rings
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.08, 14), redMat);
        ring.position.y = 0.62;
        pin.add(ring);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), whiteMat);
        head.position.y = 0.8;
        head.castShadow = true;
        pin.add(head);

        return pin;
    }

    setup10Pins() {
        // Clear existing pins
        this.pins.forEach(p => this.scene.remove(p.mesh));
        this.pins = [];

        // 10 Pins Coordinate Offsets in Triangle:
        // Row 1 (1 pin) at z = -17.5
        // Row 2 (2 pins) at z = -18.7
        // Row 3 (3 pins) at z = -19.9
        // Row 4 (4 pins) at z = -21.1
        const pinCoords = [
            // Row 1
            [0, -17.5],
            // Row 2
            [-0.35, -18.7], [0.35, -18.7],
            // Row 3
            [-0.7, -19.9], [0, -19.9], [0.7, -19.9],
            // Row 4
            [-1.05, -21.1], [-0.35, -21.1], [0.35, -21.1], [1.05, -21.1]
        ];

        pinCoords.forEach((coord, idx) => {
            const mesh = this.createPinMesh();
            mesh.position.set(coord[0], 0, coord[1]);
            this.scene.add(mesh);

            this.pins.push({
                id: idx + 1,
                mesh: mesh,
                initPos: new THREE.Vector3(coord[0], 0, coord[1]),
                vel: new THREE.Vector3(0, 0, 0),
                angVel: new THREE.Vector3(0, 0, 0),
                isKnocked: false
            });
        });
    }

    initBall() {
        // High-Gloss Marble Cosmic Bowling Ball
        const ballGeo = new THREE.SphereGeometry(0.32, 24, 24);
        const ballMat = new THREE.MeshStandardMaterial({
            color: 0x9333ea, // Cosmic Violet
            roughness: 0.15,
            metalness: 0.8
        });

        this.ball = new THREE.Mesh(ballGeo, ballMat);
        this.ball.castShadow = true;
        this.ball.position.set(0, 0.32, 5.5);
        this.scene.add(this.ball);

        // 3 Finger Holes
        const holeMat = new THREE.MeshBasicMaterial({ color: 0x111116 });
        const h1 = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8), holeMat);
        h1.rotation.x = -Math.PI / 2;
        h1.position.set(0, 0.32, -0.01);
        this.ball.add(h1);

        this.ballState = {
            pos: new THREE.Vector3(0, 0.32, 5.5),
            vel: new THREE.Vector3(0, 0, 0),
            spin: 0,
            isRolling: false,
            inGutter: false
        };
    }

    rollBall() {
        if (this.isRolling) return;
        this.isRolling = true;
        document.getElementById('btn-roll').disabled = true;

        this.ballState.pos.set(this.aimX, 0.32, 5.5);
        this.ballState.vel.set(0, 0, -0.68); // Forward speed
        this.ballState.spin = this.aimSpin;
        this.ballState.inGutter = false;

        this.ball.position.copy(this.ballState.pos);

        if (window.bowlingAudio) window.bowlingAudio.startRollSound();
    }

    updatePhysics() {
        if (!this.isRolling) return;

        // Ball movement
        this.ballState.vel.x += this.ballState.spin;
        this.ballState.pos.add(this.ballState.vel);

        // Ball rotation
        this.ball.rotation.x -= 0.18;
        this.ball.rotation.z -= this.ballState.vel.x * 0.4;

        // Gutter check (|x| > 1.8)
        if (Math.abs(this.ballState.pos.x) > 1.8 && !this.ballState.inGutter) {
            this.ballState.inGutter = true;
            this.ballState.vel.x = 0; // trap in gutter groove
            this.ballState.pos.y = 0.12;
            if (window.bowlingAudio) window.bowlingAudio.playGutter();
        }

        this.ball.position.copy(this.ballState.pos);

        // Collision with 10 Pins
        let hitOccurred = false;
        this.pins.forEach(pin => {
            if (pin.isKnocked) return;

            const dist = pin.mesh.position.distanceTo(this.ballState.pos);
            if (dist < 0.52) {
                // Ball hits Pin!
                hitOccurred = true;
                pin.isKnocked = true;
                const hitDir = new THREE.Vector3().subVectors(pin.mesh.position, this.ballState.pos).normalize();
                pin.vel.copy(hitDir).multiplyScalar(0.24);
                pin.angVel.set(Math.random() * 0.3 - 0.15, Math.random() * 0.3, Math.random() * 0.3 - 0.15);
            }
        });

        // Pin-to-Pin Collisions (Chain Reaction)
        this.pins.forEach(p1 => {
            if (!p1.isKnocked) return;
            this.pins.forEach(p2 => {
                if (p2.isKnocked || p1 === p2) return;
                const d = p1.mesh.position.distanceTo(p2.mesh.position);
                if (d < 0.48) {
                    hitOccurred = true;
                    p2.isKnocked = true;
                    const chainDir = new THREE.Vector3().subVectors(p2.mesh.position, p1.mesh.position).normalize();
                    p2.vel.copy(chainDir).multiplyScalar(0.18);
                    p2.angVel.set(Math.random() * 0.25, Math.random() * 0.2, Math.random() * 0.25);
                }
            });
        });

        if (hitOccurred && window.bowlingAudio) {
            const knockedCount = this.pins.filter(p => p.isKnocked).length;
            window.bowlingAudio.playPinCrash(knockedCount);
        }

        // Animate knocked pins tumbling
        this.pins.forEach(pin => {
            if (pin.isKnocked && pin.vel.length() > 0.005) {
                pin.mesh.position.add(pin.vel);
                pin.mesh.rotation.x += pin.angVel.x;
                pin.mesh.rotation.z += pin.angVel.z;
                pin.vel.multiplyScalar(0.92); // friction
            }
        });

        // End of Roll check (ball passed pit at z < -24)
        if (this.ballState.pos.z < -24) {
            this.finishCurrentRoll();
        }
    }

    finishCurrentRoll() {
        this.isRolling = false;
        if (window.bowlingAudio) window.bowlingAudio.stopRollSound();

        // Count knocked pins
        const currentKnocked = this.pins.filter(p => p.isKnocked).length;
        const pinsThisRoll = currentKnocked - this.pinsKnockedThisFrame;
        this.pinsKnockedThisFrame = currentKnocked;

        const isStrike = this.currentRoll === 1 && currentKnocked === 10;
        const isSpare = this.currentRoll === 2 && currentKnocked === 10;

        if (isStrike) {
            this.showCelebration("STRIKE! 🎳🔥");
            if (window.bowlingAudio) window.bowlingAudio.playStrikeFanfare();
        } else if (isSpare) {
            this.showCelebration("SPARE! 🎯✨");
            if (window.bowlingAudio) window.bowlingAudio.playStrikeFanfare();
        }

        // Record roll in scorecard
        const pScores = this.scores[this.currentPlayer];
        const f = pScores.frames[this.currentFrame - 1];

        if (this.currentRoll === 1) {
            f.r1 = isStrike ? 'X' : pinsThisRoll;
            if (isStrike || this.currentFrame === 10 && currentKnocked === 10) {
                // Strike moves directly to next frame/player
                f.total = (this.currentFrame > 1 ? pScores.frames[this.currentFrame - 2].total : 0) + 10;
                pScores.total = f.total;
                setTimeout(() => this.nextTurn(), 1400);
                return;
            } else {
                this.currentRoll = 2;
                // Remove knocked pins for roll 2
                this.pins.forEach(p => {
                    if (p.isKnocked) p.mesh.visible = false;
                });
                this.resetBallPosition();
                document.getElementById('btn-roll').disabled = false;
                this.setAnnouncer(`Roll 2: ${10 - currentKnocked} pins remaining!`);
                return;
            }
        } else {
            f.r2 = isSpare ? '/' : pinsThisRoll;
            const prevTotal = this.currentFrame > 1 ? pScores.frames[this.currentFrame - 2].total : 0;
            f.total = prevTotal + currentKnocked;
            pScores.total = f.total;
            setTimeout(() => this.nextTurn(), 1400);
        }
    }

    nextTurn() {
        this.currentRoll = 1;
        this.pinsKnockedThisFrame = 0;
        this.setup10Pins();
        this.resetBallPosition();
        document.getElementById('btn-roll').disabled = false;

        // Alternate players in 2P mode
        if (this.currentPlayer === 'p1') {
            this.currentPlayer = 'p2';
            this.updateHUD();
            this.setAnnouncer(`${this.p2Name}'s Turn (Frame ${this.currentFrame})`);

            if (this.isBotMode) {
                setTimeout(() => this.playBotRoll(), 1000);
            }
        } else {
            this.currentPlayer = 'p1';
            this.currentFrame++;
            this.updateHUD();

            if (this.currentFrame > this.maxFrames) {
                this.handleMatchVictory();
                return;
            }
            this.setAnnouncer(`${this.p1Name}'s Turn (Frame ${this.currentFrame})`);
        }
    }

    playBotRoll() {
        if (!this.isBotMode || this.currentPlayer !== 'p2') return;
        // Bot random slight offset
        this.aimX = (Math.random() - 0.5) * 0.8;
        this.aimSpin = (Math.random() - 0.5) * 0.015;
        this.rollBall();
    }

    resetBallPosition() {
        this.ballState.pos.set(this.aimX, 0.32, 5.5);
        this.ballState.vel.set(0, 0, 0);
        this.ball.position.copy(this.ballState.pos);
    }

    showCelebration(text) {
        const el = document.getElementById('celebration-banner');
        const tEl = document.getElementById('banner-title');
        if (tEl) tEl.textContent = text;
        if (el) {
            el.classList.add('show');
            setTimeout(() => el.classList.remove('show'), 1500);
        }
    }

    handleMatchVictory() {
        const p1Total = this.scores.p1.total;
        const p2Total = this.scores.p2.total;
        const p1Won = p1Total >= p2Total;

        const winner = p1Won ? this.p1Name : this.p2Name;
        document.getElementById('victory-title').textContent = `${winner} Wins! 🏆`;
        document.getElementById('res-p1-pts').textContent = `${p1Total} PTS`;
        document.getElementById('res-p2-pts').textContent = `${p2Total} PTS`;
        document.getElementById('modal-victory').classList.add('open');
    }

    updateHUD() {
        const p1Card = document.getElementById('p1-card');
        const p2Card = document.getElementById('p2-card');
        if (p1Card) p1Card.classList.toggle('active-turn', this.currentPlayer === 'p1');
        if (p2Card) p2Card.classList.toggle('active-turn', this.currentPlayer === 'p2');

        const p1TotalEl = document.getElementById('p1-total');
        const p2TotalEl = document.getElementById('p2-total');
        if (p1TotalEl) p1TotalEl.textContent = this.scores.p1.total;
        if (p2TotalEl) p2TotalEl.textContent = this.scores.p2.total;

        const framePill = document.getElementById('frame-pill');
        if (framePill) framePill.textContent = `Frame ${Math.min(10, this.currentFrame)} / 10`;

        const p1NameEl = document.getElementById('p1-name');
        const p2NameEl = document.getElementById('p2-name');
        if (p1NameEl) p1NameEl.textContent = this.p1Name;
        if (p2NameEl) p2NameEl.textContent = this.p2Name;
    }

    setAnnouncer(text) {
        const el = document.getElementById('announcer-text');
        if (el) el.textContent = text;
    }

    initEvents() {
        // Aim Position Slider
        const posSlider = document.getElementById('slider-pos');
        if (posSlider) {
            posSlider.addEventListener('input', (e) => {
                if (this.isRolling) return;
                this.aimX = parseFloat(e.target.value);
                this.resetBallPosition();
                document.getElementById('pos-val').textContent = this.aimX === 0 ? 'Center' : (this.aimX < 0 ? `Left ${Math.abs(this.aimX)}` : `Right ${this.aimX}`);
            });
        }

        document.getElementById('btn-pos-left').addEventListener('click', () => {
            if (posSlider) {
                posSlider.value = Math.max(-1.4, parseFloat(posSlider.value) - 0.2);
                posSlider.dispatchEvent(new Event('input'));
            }
        });
        document.getElementById('btn-pos-right').addEventListener('click', () => {
            if (posSlider) {
                posSlider.value = Math.min(1.4, parseFloat(posSlider.value) + 0.2);
                posSlider.dispatchEvent(new Event('input'));
            }
        });

        // Spin Slider
        const spinSlider = document.getElementById('slider-spin');
        if (spinSlider) {
            spinSlider.addEventListener('input', (e) => {
                this.aimSpin = parseFloat(e.target.value);
                document.getElementById('spin-val').textContent = this.aimSpin === 0 ? 'Straight' : (this.aimSpin < 0 ? 'Hook Left' : 'Hook Right');
            });
        }

        // Roll Button
        document.getElementById('btn-roll').addEventListener('click', () => this.rollBall());

        // Mode Toggles
        document.getElementById('btn-mode-2p').addEventListener('click', () => {
            this.isBotMode = false;
            document.getElementById('btn-mode-2p').classList.add('active');
            document.getElementById('btn-mode-bot').classList.remove('active');
            this.resetGame();
        });
        document.getElementById('btn-mode-bot').addEventListener('click', () => {
            this.isBotMode = true;
            document.getElementById('btn-mode-bot').classList.add('active');
            document.getElementById('btn-mode-2p').classList.remove('active');
            this.resetGame();
        });

        // Rematch & Restart
        document.getElementById('btn-rematch').addEventListener('click', () => {
            document.getElementById('modal-victory').classList.remove('open');
            this.resetGame();
        });
        document.getElementById('btn-restart').addEventListener('click', () => this.resetGame());

        // Mute
        document.getElementById('btn-mute').addEventListener('click', (e) => {
            if (window.bowlingAudio) {
                window.bowlingAudio.muted = !window.bowlingAudio.muted;
                const icon = e.currentTarget.querySelector('i');
                icon.className = window.bowlingAudio.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
            }
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.fov = window.innerWidth < 650 ? 58 : 48;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    resetGame() {
        this.currentPlayer = 'p1';
        this.currentFrame = 1;
        this.currentRoll = 1;
        this.pinsKnockedThisFrame = 0;
        this.scores.p1.total = 0;
        this.scores.p2.total = 0;
        this.setup10Pins();
        this.resetBallPosition();
        document.getElementById('btn-roll').disabled = false;
        this.updateHUD();
        this.setAnnouncer("Aim & Roll the Ball!");
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.updatePhysics();
        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.cosmicBowling = new CosmicBowling3D();
});
