// Couples 3D Pool - Master Game Controller & 8-Ball Rule Engine
// Realistic 3D ball rolling rotation, smart aiming guide, AI Bot, and couples turn HUD

class PoolGameApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.clock = new THREE.Clock();

        this.mode = '2p'; // '2p' or 'ai'
        this.currentTurn = 'p1'; // 'p1' or 'p2'
        this.playerGroups = { p1: null, p2: null }; // 'solids' or 'stripes'
        this.playerNames = { p1: 'Player 1 💖', p2: 'Player 2 💙' };

        this.aimAngle = Math.PI / 2; // Aim pointing right towards rack initially
        this.power = 0.5; // 0.1 to 1.0
        this.isShotActive = false;
        this.cueBallScratch = false;
        this.pocketedThisShot = [];
        this.cameraViewMode = 'orbit'; // 'orbit', 'top', 'cue'

        this.initThree();
        this.initEntities();
        this.initEvents();
        this.updateHUD();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0c10);

        const isMobile = window.innerWidth < 768;
        this.camera = new THREE.PerspectiveCamera(isMobile ? 54 : 42, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, isMobile ? 9.8 : 7.8, isMobile ? 6.8 : 6.2);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.15; // Don't go below table surface
        this.controls.minDistance = 3.5;
        this.controls.maxDistance = 18;
        this.controls.target.set(0, 0, 0);

        // Soft Diffused Lighting (Zero blinding glare)
        const ambient = new THREE.AmbientLight(0xfff7ed, 0.65);
        this.scene.add(ambient);

        // Overhead Pool Table Overhead Pendant Light
        const tableLight = new THREE.DirectionalLight(0xfffaed, 0.85);
        tableLight.position.set(0, 10, 0);
        tableLight.castShadow = true;
        tableLight.shadow.mapSize.width = 2048;
        tableLight.shadow.mapSize.height = 2048;
        tableLight.shadow.camera.near = 1;
        tableLight.shadow.camera.far = 15;
        tableLight.shadow.camera.left = -5;
        tableLight.shadow.camera.right = 5;
        tableLight.shadow.camera.top = 3;
        tableLight.shadow.camera.bottom = -3;
        tableLight.shadow.bias = -0.0005;
        this.scene.add(tableLight);

        // Subtle Fill Lights
        const fill1 = new THREE.DirectionalLight(0x38bdf8, 0.25);
        fill1.position.set(-8, 5, 4);
        this.scene.add(fill1);

        const fill2 = new THREE.DirectionalLight(0xf472b6, 0.2);
        fill2.position.set(8, 5, -4);
        this.scene.add(fill2);

        // Floor Shadow Catcher
        const floorGeo = new THREE.PlaneGeometry(40, 40);
        const floorMat = new THREE.ShadowMaterial({ opacity: 0.35 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1.95;
        floor.receiveShadow = true;
        this.scene.add(floor);

        window.addEventListener('resize', () => {
            const isMob = window.innerWidth < 768;
            this.camera.fov = isMob ? 54 : 42;
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initEntities() {
        this.table = new PoolTable3D(this.scene);
        this.physics = new PoolPhysics(this.table);
        this.ballFactory = new PoolBallFactory();
        this.cue = new PoolCue3D(this.scene);

        this.ballsData = [];
        this.ballMeshes = {};

        this.spawnBalls();
    }

    spawnBalls() {
        // Clear previous meshes
        Object.values(this.ballMeshes).forEach(mesh => this.scene.remove(mesh));
        this.ballMeshes = {};

        this.ballsData = this.ballFactory.createInitialRackedBalls();

        this.ballsData.forEach(b => {
            const mesh = this.ballFactory.createBallMesh(b.number);
            mesh.position.set(b.x, this.ballFactory.radius, b.z);
            this.scene.add(mesh);
            this.ballMeshes[b.number] = mesh;
        });

        this.aimAngle = 0; // Point towards foot rack
        this.updateAiming();
    }

    initEvents() {
        let isDraggingAim = false;
        let lastMouseX = 0;

        // Pointer Drag for Aim Rotation
        this.renderer.domElement.addEventListener('pointerdown', (e) => {
            if (this.isShotActive) return;
            // Only drag aim if left click
            if (e.button === 0) {
                isDraggingAim = true;
                lastMouseX = e.clientX;
            }
        });

        window.addEventListener('pointermove', (e) => {
            if (isDraggingAim && !this.isShotActive) {
                const deltaX = e.clientX - lastMouseX;
                lastMouseX = e.clientX;
                this.aimAngle += deltaX * 0.008;
                this.updateAiming();
            }
        });

        window.addEventListener('pointerup', () => {
            isDraggingAim = false;
        });

        // UI Controls
        const btnShoot = document.getElementById('btn-shoot');
        const sliderPower = document.getElementById('slider-power');
        const sliderAim = document.getElementById('slider-aim-fine');

        if (sliderPower) {
            sliderPower.addEventListener('input', (e) => {
                this.power = parseFloat(e.target.value);
                const pct = Math.round(this.power * 100);
                const label = document.getElementById('power-value-label');
                if (label) label.textContent = `${pct}%`;
                this.updateAiming();
            });
        }

        if (sliderAim) {
            sliderAim.addEventListener('input', (e) => {
                this.aimAngle = parseFloat(e.target.value);
                this.updateAiming();
            });
        }

        if (btnShoot) {
            btnShoot.addEventListener('click', () => {
                this.takeShot();
            });
        }

        // View Mode Toggles
        document.getElementById('btn-view-orbit')?.addEventListener('click', () => this.setCameraView('orbit'));
        document.getElementById('btn-view-top')?.addEventListener('click', () => this.setCameraView('top'));
        document.getElementById('btn-view-cue')?.addEventListener('click', () => this.setCameraView('cue'));

        // Game Mode Toggles
        document.getElementById('btn-mode-2p')?.addEventListener('click', () => this.setGameMode('2p'));
        document.getElementById('btn-mode-ai')?.addEventListener('click', () => this.setGameMode('ai'));

        // Audio Toggle
        document.getElementById('btn-mute')?.addEventListener('click', () => {
            const active = window.poolAudio.toggle();
            const icon = document.querySelector('#btn-mute i');
            if (icon) icon.className = active ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
        });

        // Restart
        document.getElementById('btn-restart')?.addEventListener('click', () => this.restartGame());
        document.getElementById('btn-play-again')?.addEventListener('click', () => {
            document.getElementById('modal-victory')?.classList.remove('open');
            this.restartGame();
        });
    }

    setGameMode(mode) {
        this.mode = mode;
        this.playerNames.p2 = mode === 'ai' ? 'Smart AI Bot 🤖' : 'Player 2 💙';
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-mode-${mode}`)?.classList.add('active');
        this.restartGame();
    }

    setCameraView(view) {
        this.cameraViewMode = view;
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-view-${view}`)?.classList.add('active');

        const isMob = window.innerWidth < 768;

        if (view === 'top') {
            // Direct Top-Down Bird's Eye View
            this.camera.position.set(0, isMob ? 11.5 : 9.5, 0);
            this.controls.target.set(0, 0, 0);
        } else if (view === 'cue') {
            // Over-the-cue aim view
            this.updateCueCamera();
        } else {
            // Orbit view
            this.camera.position.set(0, isMob ? 9.8 : 7.8, isMob ? 6.8 : 6.2);
            this.controls.target.set(0, 0, 0);
        }
        this.controls.update();
    }

    updateCueCamera() {
        const cueBall = this.ballsData[0];
        if (!cueBall || cueBall.inPocket) return;

        // Position camera behind cue ball along aim angle
        const camDist = 2.4;
        const camHeight = 1.1;
        const camX = cueBall.x - Math.cos(this.aimAngle) * camDist;
        const camZ = cueBall.z - Math.sin(this.aimAngle) * camDist;

        this.camera.position.set(camX, camHeight, camZ);
        this.controls.target.set(cueBall.x + Math.cos(this.aimAngle) * 2.0, 0.1, cueBall.z + Math.sin(this.aimAngle) * 2.0);
    }

    updateAiming() {
        const cueBall = this.ballsData[0];
        if (!cueBall || cueBall.inPocket) {
            this.cue.visible = false;
            return;
        }

        // Raycast aim line towards target ball
        const dirX = Math.cos(this.aimAngle);
        const dirZ = Math.sin(this.aimAngle);
        let closestDist = 5.0;

        for (let i = 1; i < this.ballsData.length; i++) {
            const b = this.ballsData[i];
            if (b.inPocket) continue;

            const dx = b.x - cueBall.x;
            const dz = b.z - cueBall.z;
            const proj = dx * dirX + dz * dirZ;

            if (proj > 0 && proj < closestDist) {
                const perp = Math.abs(dx * dirZ - dz * dirX);
                if (perp < this.ballFactory.radius * 2) {
                    closestDist = proj;
                }
            }
        }

        this.cue.update(
            new THREE.Vector3(cueBall.x, this.ballFactory.radius, cueBall.z),
            this.aimAngle + Math.PI / 2, // Convert polar to Three.js orientation
            this.power
        );
        this.cue.setGhostTarget(closestDist);

        if (this.cameraViewMode === 'cue') {
            this.updateCueCamera();
        }
    }

    takeShot() {
        if (this.isShotActive) return;
        const cueBall = this.ballsData[0];
        if (!cueBall || cueBall.inPocket) return;

        this.isShotActive = true;
        this.pocketedThisShot = [];
        this.cueBallScratch = false;
        document.getElementById('btn-shoot')?.setAttribute('disabled', 'true');

        this.cue.strike(() => {
            // Apply shot impulse to cue ball
            const speed = 4.0 + this.power * 10.5;
            cueBall.vx = Math.cos(this.aimAngle) * speed;
            cueBall.vz = Math.sin(this.aimAngle) * speed;

            if (window.poolAudio) {
                window.poolAudio.playCueHit(this.power);
            }
        });
    }

    animate() {
        requestAnimationFrame(this.animate);
        const delta = this.clock.getDelta();

        // 1. Run physics update
        this.physics.update(this.ballsData, delta);

        // 2. Sync 3D Meshes & Rolling Ball Rotations
        for (let i = 0; i < this.ballsData.length; i++) {
            const b = this.ballsData[i];
            const mesh = this.ballMeshes[b.number];
            if (!mesh) continue;

            if (b.inPocket) {
                // Drop downward into leather pocket recess
                if (mesh.position.y > -0.35) {
                    mesh.position.y -= delta * 0.8;
                    mesh.scale.multiplyScalar(0.96);
                } else {
                    mesh.visible = false;
                }
            } else {
                mesh.position.x = b.x;
                mesh.position.z = b.z;
                mesh.position.y = this.ballFactory.radius;

                // 3D Physical Ball Roll Rotation
                const speed = Math.hypot(b.vx, b.vz);
                if (speed > 0.001) {
                    const distMoved = speed * delta;
                    const rollAngle = distMoved / this.ballFactory.radius;
                    const axis = new THREE.Vector3(b.vz, 0, -b.vx).normalize();
                    mesh.rotateOnWorldAxis(axis, rollAngle);
                }
            }
        }

        // 3. Check when all balls come to a complete stop
        if (this.isShotActive && this.physics.areAllBallsStationary(this.ballsData)) {
            this.onShotComplete();
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onShotComplete() {
        this.isShotActive = false;
        document.getElementById('btn-shoot')?.removeAttribute('disabled');

        const cueBall = this.ballsData[0];

        // 1. Check Scratch (Cue ball in pocket)
        if (cueBall.inPocket) {
            this.cueBallScratch = true;
            this.showStatus('Scratch! Foul committed ⚠️ Cue ball replaced.');
            // Reset Cue Ball to head string
            cueBall.inPocket = false;
            cueBall.x = -1.8;
            cueBall.z = 0;
            cueBall.vx = 0;
            cueBall.vz = 0;
            const mesh = this.ballMeshes[0];
            if (mesh) {
                mesh.visible = true;
                mesh.scale.set(1, 1, 1);
                mesh.position.set(-1.8, this.ballFactory.radius, 0);
            }
        }

        // 2. Check 8-Ball Pocketed
        const eightBall = this.ballsData.find(b => b.number === 8);
        if (eightBall && eightBall.inPocket) {
            const pGroup = this.playerGroups[this.currentTurn];
            const hasRemainingBalls = this.hasRemainingGroupBalls(pGroup);

            if (!hasRemainingBalls && !this.cueBallScratch) {
                // Legitimate Victory!
                this.handleVictory(this.currentTurn);
                return;
            } else {
                // Illegal 8-ball drop (Early or with scratch) = Loss!
                const opponent = this.currentTurn === 'p1' ? 'p2' : 'p1';
                this.handleVictory(opponent, '8-ball sunk prematurely or with a foul!');
                return;
            }
        }

        // 3. Assign groups if open
        const pocketedThisTurn = this.ballsData.filter(b => b.number !== 0 && b.number !== 8 && b.inPocket);
        if (!this.playerGroups.p1 && pocketedThisTurn.length > 0) {
            const first = pocketedThisTurn[0];
            const isSolid = first.number <= 7;
            if (this.currentTurn === 'p1') {
                this.playerGroups.p1 = isSolid ? 'solids' : 'stripes';
                this.playerGroups.p2 = isSolid ? 'stripes' : 'solids';
            } else {
                this.playerGroups.p2 = isSolid ? 'solids' : 'stripes';
                this.playerGroups.p1 = isSolid ? 'stripes' : 'solids';
            }
        }

        // 4. Determine turn continuation
        let switchTurn = true;
        if (!this.cueBallScratch) {
            const currentGroup = this.playerGroups[this.currentTurn];
            // If sunk any valid ball of their group, player shoots again!
            const sunkOwnGroup = pocketedThisTurn.some(b => {
                if (!currentGroup) return true;
                return currentGroup === 'solids' ? b.number <= 7 : b.number >= 9;
            });
            if (sunkOwnGroup) {
                switchTurn = false;
                this.showStatus(`${this.playerNames[this.currentTurn]} pocketed a ball! Shoot again! 🎯`);
            }
        }

        if (switchTurn) {
            this.currentTurn = this.currentTurn === 'p1' ? 'p2' : 'p1';
            this.showStatus(`${this.playerNames[this.currentTurn]}'s turn! Aim & Shoot 🎱`);
        }

        this.cue.visible = true;
        this.updateAiming();
        this.updateHUD();

        // 5. Trigger AI shot if AI's turn
        if (this.mode === 'ai' && this.currentTurn === 'p2') {
            setTimeout(() => this.executeAIShot(), 900);
        }
    }

    hasRemainingGroupBalls(group) {
        if (!group) return true;
        return this.ballsData.some(b => {
            if (b.inPocket) return false;
            return group === 'solids' ? (b.number >= 1 && b.number <= 7) : (b.number >= 9 && b.number <= 15);
        });
    }

    executeAIShot() {
        if (this.isShotActive || this.currentTurn !== 'p2') return;

        const cueBall = this.ballsData[0];
        const group = this.playerGroups.p2;

        // Find best target ball
        let targets = this.ballsData.filter(b => {
            if (b.inPocket || b.number === 0) return false;
            if (!group) return b.number !== 8;
            const hasRest = this.hasRemainingGroupBalls(group);
            if (!hasRest) return b.number === 8;
            return group === 'solids' ? (b.number <= 7) : (b.number >= 9 && b.number <= 15);
        });

        if (targets.length === 0) {
            targets = this.ballsData.filter(b => !b.inPocket && b.number === 8);
        }

        if (targets.length > 0) {
            // Target closest ball
            targets.sort((a, b) => Math.hypot(a.x - cueBall.x, a.z - cueBall.z) - Math.hypot(b.x - cueBall.x, b.z - cueBall.z));
            const target = targets[0];

            // Aim angle towards target + slight natural human imperfection
            const angle = Math.atan2(target.z - cueBall.z, target.x - cueBall.x) + (Math.random() - 0.5) * 0.05;
            this.aimAngle = angle;
            this.power = 0.45 + Math.random() * 0.35;
            this.updateAiming();

            setTimeout(() => this.takeShot(), 600);
        }
    }

    handleVictory(winnerKey, reason = '') {
        const winnerName = this.playerNames[winnerKey];
        if (window.poolAudio) window.poolAudio.playVictory();

        const titleEl = document.getElementById('victory-title');
        const descEl = document.getElementById('victory-desc');
        if (titleEl) titleEl.textContent = `👑 ${winnerName} Wins!`;
        if (descEl) descEl.textContent = reason || 'Masterful 8-Ball execution! Congratulations on claiming the Couples Trophy!';

        document.getElementById('modal-victory')?.classList.add('open');
    }

    restartGame() {
        this.currentTurn = 'p1';
        this.playerGroups = { p1: null, p2: null };
        this.isShotActive = false;
        this.cueBallScratch = false;
        this.spawnBalls();
        this.showStatus('New Rack! Player 1 breaks the balls 🎱');
        this.updateHUD();
    }

    showStatus(msg) {
        const banner = document.getElementById('status-banner');
        if (banner) banner.textContent = msg;
    }

    updateHUD() {
        const cardP1 = document.getElementById('card-p1');
        const cardP2 = document.getElementById('card-p2');
        const nameP1 = document.getElementById('name-p1');
        const nameP2 = document.getElementById('name-p2');
        const badgeP1 = document.getElementById('badge-p1');
        const badgeP2 = document.getElementById('badge-p2');

        if (nameP1) nameP1.textContent = this.playerNames.p1;
        if (nameP2) nameP2.textContent = this.playerNames.p2;

        if (cardP1) cardP1.classList.toggle('active-turn', this.currentTurn === 'p1');
        if (cardP2) cardP2.classList.toggle('active-turn', this.currentTurn === 'p2');

        if (badgeP1) badgeP1.textContent = this.playerGroups.p1 ? this.playerGroups.p1.toUpperCase() : 'ANY';
        if (badgeP2) badgeP2.textContent = this.playerGroups.p2 ? this.playerGroups.p2.toUpperCase() : 'ANY';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.poolGame = new PoolGameApp();
});
