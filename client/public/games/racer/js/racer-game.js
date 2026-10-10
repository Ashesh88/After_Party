// Couples Turbo 3D Racer - Complete 3D Cyberpunk Racing Engine
// Powered by Three.js with realistic car physics, nitro boost, AI rivals, and multiplayer modes

class TurboRacer3D {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.mode = 'couple'; // 'couple' (1v1) | 'friends' (4 racers) | 'ai' (solo vs bot)
        this.p1Name = 'You';
        this.p2Name = 'Partner';

        // Parse query parameters from URL
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode')) this.mode = params.get('mode');
        if (params.get('p1')) this.p1Name = params.get('p1');
        if (params.get('p2')) this.p2Name = params.get('p2');

        // Physics State for Player Car
        this.player = {
            pos: new THREE.Vector3(0, 0, 0),
            speed: 0, // Current speed in game units
            maxSpeed: 1.45, // ~190 km/h
            nitroMaxSpeed: 2.15, // ~270 km/h
            accel: 0.008,
            friction: 0.003,
            steerAngle: 0,
            laneX: 0, // -5.5 to 5.5
            nitro: 100, // 0 to 100%
            isNitroActive: false,
            topSpeedReached: 0,
            distance: 0,
            lap: 1,
            maxLaps: 3,
            lapLength: 2400, // units per lap
            mesh: null,
            wheels: [],
            exhausts: []
        };

        // Rivals / Opponents State
        this.rivals = [];
        this.roadSegments = [];
        this.pickups = [];
        this.obstacles = [];
        this.decorations = [];

        // Race State
        this.raceStarted = false;
        this.raceFinished = false;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.cameraViewMode = 0; // 0: Chase cam, 1: Close action cam

        // Input State
        this.input = {
            left: false,
            right: false,
            gas: true, // default gas on for smooth mobile play
            brake: false,
            nitro: false
        };

        this.initThree();
        this.initTrack();
        this.initCars();
        this.initEntities();
        this.initEvents();
        this.setMode(this.mode);
        this.startCountdown();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0a0715, 0.007);

        this.camera = new THREE.PerspectiveCamera(
            window.innerWidth < 650 ? 65 : 55,
            window.innerWidth / window.innerHeight,
            0.1,
            600
        );
        this.camera.position.set(0, 3.8, -7.5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x08070d);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const hemiLight = new THREE.HemisphereLight(0xec4899, 0x06b6d4, 0.45);
        this.scene.add(hemiLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.75);
        this.dirLight.position.set(10, 25, -20);
        this.scene.add(this.dirLight);

        // Horizon Retro Neon Grid & Sky
        this.createSynthSkyline();
    }

    createSynthSkyline() {
        // Distant Cyber City Skyline & Sunset
        const skyGroup = new THREE.Group();

        // Neon Cyber Sun / Moon
        const sunGeo = new THREE.CircleGeometry(32, 32);
        const sunMat = new THREE.MeshBasicMaterial({
            color: 0xff3388,
            fog: false
        });
        const sun = new THREE.Mesh(sunGeo, sunMat);
        sun.position.set(0, 20, 280);
        skyGroup.add(sun);

        // Background Cyber Skyscraper Silhouettes
        const cityWidth = 400;
        for (let i = 0; i < 40; i++) {
            const h = 25 + Math.random() * 55;
            const w = 8 + Math.random() * 14;
            const bGeo = new THREE.BoxGeometry(w, h, 10);
            const bMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0x0f0c24 : 0x140e2e
            });
            const building = new THREE.Mesh(bGeo, bMat);
            const x = -cityWidth / 2 + Math.random() * cityWidth;
            building.position.set(x, h / 2 - 5, 260);
            skyGroup.add(building);
        }

        this.skyGroup = skyGroup;
        this.scene.add(skyGroup);
    }

    initTrack() {
        this.trackGroup = new THREE.Group();
        this.scene.add(this.trackGroup);

        this.roadWidth = 14;
        this.segmentCount = 60;
        this.segmentLength = 12;

        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x11111e,
            roughness: 0.6,
            metalness: 0.2
        });

        const curbMatL = new THREE.MeshBasicMaterial({ color: 0xec4899 });
        const curbMatR = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        for (let i = 0; i < this.segmentCount; i++) {
            const z = i * this.segmentLength;
            const seg = new THREE.Group();

            // Asphalt slab
            const roadMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(this.roadWidth, this.segmentLength),
                roadMat
            );
            roadMesh.rotation.x = -Math.PI / 2;
            roadMesh.receiveShadow = true;
            seg.add(roadMesh);

            // Left Neon Barrier
            const curbL = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.4, this.segmentLength),
                curbMatL
            );
            curbL.position.set(-this.roadWidth / 2 - 0.25, 0.2, 0);
            seg.add(curbL);

            // Right Neon Barrier
            const curbR = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.4, this.segmentLength),
                curbMatR
            );
            curbR.position.set(this.roadWidth / 2 + 0.25, 0.2, 0);
            seg.add(curbR);

            // Dashed Center Lane Dividers
            [-2.3, 2.3].forEach(laneX => {
                const dash = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.2, 4.5),
                    lineMat
                );
                dash.rotation.x = -Math.PI / 2;
                dash.position.set(laneX, 0.02, 0);
                seg.add(dash);
            });

            // Occasional Neon Overhead Arch
            if (i % 12 === 0) {
                const arch = this.createNeonArch(i % 24 === 0 ? 0xec4899 : 0x06b6d4);
                arch.position.set(0, 0, 0);
                seg.add(arch);
            }

            seg.position.set(0, 0, z);
            seg.userData = { initialZ: z };
            this.trackGroup.add(seg);
            this.roadSegments.push(seg);
        }
    }

    createNeonArch(hexColor) {
        const arch = new THREE.Group();
        const mat = new THREE.MeshBasicMaterial({ color: hexColor });

        // Left post
        const pL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 0.4), mat);
        pL.position.set(-this.roadWidth / 2 - 0.3, 2.75, 0);
        arch.add(pL);

        // Right post
        const pR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 0.4), mat);
        pR.position.set(this.roadWidth / 2 + 0.3, 2.75, 0);
        arch.add(pR);

        // Top crossbeam
        const beam = new THREE.Mesh(new THREE.BoxGeometry(this.roadWidth + 1.2, 0.4, 0.4), mat);
        beam.position.set(0, 5.5, 0);
        arch.add(beam);

        return arch;
    }

    // Procedural 3D Supercar Factory
    buildCarMesh(colorHex, underglowHex, isPlayer = false) {
        const car = new THREE.Group();

        // 1. Sleek Supercar Lower Chassis
        const bodyMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.25,
            metalness: 0.75
        });

        const chassisGeo = new THREE.BoxGeometry(1.9, 0.45, 3.8);
        const chassis = new THREE.Mesh(chassisGeo, bodyMat);
        chassis.position.y = 0.4;
        chassis.castShadow = true;
        car.add(chassis);

        // Front Hood Wedge
        const hoodGeo = new THREE.BoxGeometry(1.85, 0.22, 1.3);
        const hood = new THREE.Mesh(hoodGeo, bodyMat);
        hood.position.set(0, 0.32, 1.4);
        hood.rotation.x = 0.12;
        car.add(hood);

        // 2. Aerodynamic Cockpit Glass Canopy
        const cabinMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.85
        });
        const cabinGeo = new THREE.BoxGeometry(1.4, 0.42, 1.8);
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 0.78, -0.2);
        car.add(cabin);

        // 3. Rear GT Spoiler Wing
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0f, metalness: 0.8 });
        const wingBeam = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 0.4), wingMat);
        wingBeam.position.set(0, 1.05, -1.8);
        car.add(wingBeam);

        [-0.7, 0.7].forEach(x => {
            const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.1), wingMat);
            strut.position.set(x, 0.82, -1.8);
            car.add(strut);
        });

        // 4. Headlights (Bright White/Cyan)
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
        [-0.7, 0.7].forEach(x => {
            const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.1), lightMat);
            hl.position.set(x, 0.4, 1.95);
            car.add(hl);
        });

        // 5. Taillights (Neon Red/Pink strip)
        const tailMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        const tl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), tailMat);
        tl.position.set(0, 0.52, -1.93);
        car.add(tl);

        // 6. Dual Exhausts with Flame jets
        const exhaustPipes = [];
        [-0.45, 0.45].forEach(x => {
            const pipe = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.1, 0.25, 8),
                new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
            );
            pipe.rotation.x = Math.PI / 2;
            pipe.position.set(x, 0.3, -1.95);
            car.add(pipe);

            // Nitro Flame Jet (initially hidden/small)
            const flame = new THREE.Mesh(
                new THREE.ConeGeometry(0.12, 0.7, 8),
                new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
            );
            flame.rotation.x = -Math.PI / 2;
            flame.position.set(x, 0.3, -2.4);
            flame.visible = false;
            car.add(flame);
            exhaustPipes.push(flame);
        });

        // 7. Glowing Underglow
        const glowGeo = new THREE.PlaneGeometry(2.1, 3.9);
        const glowMat = new THREE.MeshBasicMaterial({
            color: underglowHex,
            transparent: true,
            opacity: 0.7
        });
        const underglow = new THREE.Mesh(glowGeo, glowMat);
        underglow.rotation.x = -Math.PI / 2;
        underglow.position.y = 0.08;
        car.add(underglow);

        // 8. 4 Alloy Wheels
        const wheelMeshes = [];
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.24, 16);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.8 });
        const rimMat = new THREE.MeshBasicMaterial({ color: underglowHex });

        const wheelCoords = [
            [-0.98, 0.35, 1.2],
            [0.98, 0.35, 1.2],
            [-0.98, 0.35, -1.2],
            [0.98, 0.35, -1.2]
        ];

        wheelCoords.forEach(pos => {
            const wGroup = new THREE.Group();
            const tire = new THREE.Mesh(wheelGeo, wheelMat);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            wGroup.add(tire);

            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.25, 8), rimMat);
            rim.rotation.z = Math.PI / 2;
            wGroup.add(rim);

            wGroup.position.set(pos[0], pos[1], pos[2]);
            car.add(wGroup);
            wheelMeshes.push(wGroup);
        });

        return { mesh: car, wheels: wheelMeshes, exhausts: exhaustPipes };
    }

    initCars() {
        // Player 1 Car (Cyber Rose Gold / Pink)
        const pCar = this.buildCarMesh(0xec4899, 0xf43f5e, true);
        this.player.mesh = pCar.mesh;
        this.player.wheels = pCar.wheels;
        this.player.exhausts = pCar.exhausts;
        this.player.mesh.position.set(-1.8, 0, 0);
        this.player.laneX = -1.8;
        this.scene.add(this.player.mesh);

        // Pre-create 3 Rival/Opponent Cars
        const rivalConfigs = [
            { id: 'rival1', name: this.p2Name, color: 0x06b6d4, glow: 0x38bdf8, initX: 1.8, initZ: 6 },
            { id: 'rival2', name: 'Friend Alex', color: 0xf59e0b, glow: 0xfbbf24, initX: -4.0, initZ: 14 },
            { id: 'rival3', name: 'Friend Sam', color: 0x10b981, glow: 0x34d399, initX: 4.0, initZ: 22 }
        ];

        rivalConfigs.forEach(cfg => {
            const rCar = this.buildCarMesh(cfg.color, cfg.glow, false);
            this.scene.add(rCar.mesh);
            this.rivals.push({
                id: cfg.id,
                name: cfg.name,
                color: cfg.color,
                mesh: rCar.mesh,
                wheels: rCar.wheels,
                exhausts: rCar.exhausts,
                laneX: cfg.initX,
                targetLaneX: cfg.initX,
                distance: cfg.initZ,
                speed: 1.1 + Math.random() * 0.15,
                baseSpeed: 1.25,
                laneChangeTimer: Math.random() * 80,
                active: true
            });
        });
    }

    initEntities() {
        this.entityGroup = new THREE.Group();
        this.scene.add(this.entityGroup);

        // Spawn Speed Boost Strips and Nitro Orbs along the track
        for (let i = 0; i < 18; i++) {
            const z = 60 + i * 130 + Math.random() * 30;
            const laneX = [-3.8, 0, 3.8][i % 3];

            if (i % 2 === 0) {
                // Nitro Battery Orb (Floating rotating 3D diamond)
                const orb = new THREE.Mesh(
                    new THREE.OctahedronGeometry(0.7),
                    new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: false })
                );
                orb.position.set(laneX, 1.2, z);
                orb.userData = { type: 'nitro', z: z, initialZ: z };
                this.entityGroup.add(orb);
                this.pickups.push(orb);
            } else {
                // Boost Pad (Glowing Floor Chevron)
                const pad = new THREE.Mesh(
                    new THREE.PlaneGeometry(2.4, 4.0),
                    new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.85 })
                );
                pad.rotation.x = -Math.PI / 2;
                pad.position.set(laneX, 0.05, z);
                pad.userData = { type: 'boost', z: z, initialZ: z };
                this.entityGroup.add(pad);
                this.pickups.push(pad);
            }
        }
    }

    setMode(mode) {
        this.mode = mode;

        ['couple', 'friends', 'ai'].forEach(m => {
            const btn = document.getElementById(`btn-mode-${m}`);
            if (btn) btn.classList.toggle('active', m === mode);
        });

        if (mode === 'couple') {
            // 2 Cars only: Player vs Partner
            this.rivals[0].active = true;
            this.rivals[0].name = this.p2Name;
            this.rivals[1].active = false;
            this.rivals[2].active = false;
            this.rivals[1].mesh.visible = false;
            this.rivals[2].mesh.visible = false;
            document.getElementById('pos-tot').textContent = '/2';
        } else if (mode === 'friends') {
            // 4 Cars: Grand Prix
            this.rivals.forEach(r => {
                r.active = true;
                r.mesh.visible = true;
            });
            document.getElementById('pos-tot').textContent = '/4';
        } else if (mode === 'ai') {
            // Solo vs AI Bot
            this.rivals[0].active = true;
            this.rivals[0].name = 'Cyber Bot 🤖';
            this.rivals[1].active = true;
            this.rivals[1].mesh.visible = true;
            this.rivals[2].active = false;
            this.rivals[2].mesh.visible = false;
            document.getElementById('pos-tot').textContent = '/3';
        }

        this.restartRace();
    }

    startCountdown() {
        const overlay = document.getElementById('countdown-overlay');
        const numEl = document.getElementById('countdown-num');
        if (!overlay || !numEl) return;

        overlay.classList.add('show');
        let count = 3;
        numEl.textContent = count;

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                numEl.textContent = count;
            } else if (count === 0) {
                numEl.textContent = 'GO! 🚀';
                this.raceStarted = true;
                this.startTime = Date.now();
                if (window.racerAudio) window.racerAudio.startEngine();
            } else {
                clearInterval(interval);
                overlay.classList.remove('show');
            }
        }, 800);
    }

    initEvents() {
        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = true;
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.input.gas = true;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.input.brake = true;
            if (e.key === ' ' || e.key === 'Shift') this.triggerNitro(true);
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = false;
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.input.gas = false;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.input.brake = false;
            if (e.key === ' ' || e.key === 'Shift') this.triggerNitro(false);
        });

        // Touch Buttons
        const bindTouch = (id, onDown, onUp) => {
            const el = document.getElementById(id);
            if (!el) return;
            const startHandler = (e) => { e.preventDefault(); onDown(); };
            const endHandler = (e) => { e.preventDefault(); onUp(); };
            el.addEventListener('pointerdown', startHandler);
            el.addEventListener('pointerup', endHandler);
            el.addEventListener('pointerleave', endHandler);
            el.addEventListener('pointercancel', endHandler);
        };

        bindTouch('touch-left', () => { this.input.left = true; }, () => { this.input.left = false; });
        bindTouch('touch-right', () => { this.input.right = true; }, () => { this.input.right = false; });
        bindTouch('touch-brake', () => { this.input.brake = true; }, () => { this.input.brake = false; });
        bindTouch('touch-gas', () => { this.input.gas = true; }, () => { this.input.gas = false; });
        bindTouch('touch-nitro', () => { this.triggerNitro(true); }, () => { this.triggerNitro(false); });

        // Mode Toggles
        ['couple', 'friends', 'ai'].forEach(m => {
            const btn = document.getElementById(`btn-mode-${m}`);
            if (btn) btn.addEventListener('click', () => this.setMode(m));
        });

        // Cam, Audio, Restart buttons
        document.getElementById('btn-cam').addEventListener('click', () => {
            this.cameraViewMode = (this.cameraViewMode + 1) % 2;
        });

        document.getElementById('btn-mute').addEventListener('click', (e) => {
            if (window.racerAudio) {
                window.racerAudio.muted = !window.racerAudio.muted;
                const icon = e.currentTarget.querySelector('i');
                icon.className = window.racerAudio.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
            }
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            this.restartRace();
        });

        document.getElementById('btn-race-again').addEventListener('click', () => {
            document.getElementById('modal-victory').classList.remove('open');
            this.restartRace();
        });

        // Listen for postMessage from parent React component
        window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'SET_MODE') {
                this.setMode(e.data.mode);
            }
            if (e.data && e.data.type === 'SET_NAMES') {
                if (e.data.p1) this.p1Name = e.data.p1;
                if (e.data.p2) {
                    this.p2Name = e.data.p2;
                    this.rivals[0].name = e.data.p2;
                }
            }
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.fov = window.innerWidth < 650 ? 65 : 55;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    triggerNitro(active) {
        if (active && this.player.nitro > 8 && !this.player.isNitroActive) {
            this.player.isNitroActive = true;
            if (window.racerAudio) window.racerAudio.playNitro();
            this.player.exhausts.forEach(f => f.visible = true);
        } else if (!active && this.player.isNitroActive) {
            this.player.isNitroActive = false;
            this.player.exhausts.forEach(f => f.visible = false);
        }
    }

    restartRace() {
        this.raceFinished = false;
        this.raceStarted = false;
        this.player.speed = 0;
        this.player.distance = 0;
        this.player.laneX = -1.8;
        this.player.nitro = 100;
        this.player.lap = 1;
        this.player.isNitroActive = false;
        this.player.exhausts.forEach(f => f.visible = false);

        // Reset rivals
        this.rivals.forEach((r, idx) => {
            r.distance = 6 + idx * 8;
            r.speed = 1.1 + Math.random() * 0.15;
            r.laneX = idx === 0 ? 1.8 : (idx === 1 ? -4.0 : 4.0);
            r.targetLaneX = r.laneX;
        });

        this.startCountdown();
    }

    updatePhysics() {
        if (!this.raceStarted || this.raceFinished) return;

        // 1. Acceleration & Braking
        const targetMax = this.player.isNitroActive ? this.player.nitroMaxSpeed : this.player.maxSpeed;
        if (this.input.gas && !this.input.brake) {
            this.player.speed += this.player.accel;
            if (this.player.isNitroActive) this.player.speed += 0.015;
        } else if (this.input.brake) {
            this.player.speed -= 0.035;
        } else {
            this.player.speed -= this.player.friction;
        }

        // Clamp speed
        this.player.speed = Math.max(0, Math.min(this.player.speed, targetMax));

        // Consume & Recharge Nitro
        if (this.player.isNitroActive) {
            this.player.nitro -= 0.6;
            if (this.player.nitro <= 0) {
                this.triggerNitro(false);
            }
        } else {
            this.player.nitro = Math.min(100, this.player.nitro + 0.12);
        }

        // 2. Steering & Drifting
        const steerSpeed = 0.13 * (this.player.speed / 1.0);
        if (this.input.left) {
            this.player.laneX -= steerSpeed;
            this.player.steerAngle = Math.max(-0.25, this.player.steerAngle - 0.04);
            if (this.player.speed > 1.2 && Math.random() < 0.05 && window.racerAudio) {
                window.racerAudio.playDrift();
            }
        } else if (this.input.right) {
            this.player.laneX += steerSpeed;
            this.player.steerAngle = Math.min(0.25, this.player.steerAngle + 0.04);
            if (this.player.speed > 1.2 && Math.random() < 0.05 && window.racerAudio) {
                window.racerAudio.playDrift();
            }
        } else {
            this.player.steerAngle *= 0.8;
        }

        // Road boundaries (-5.5 to 5.5)
        const roadLimit = this.roadWidth / 2 - 1.2;
        if (this.player.laneX < -roadLimit) {
            this.player.laneX = -roadLimit;
            this.player.speed *= 0.96; // slight barrier friction
        }
        if (this.player.laneX > roadLimit) {
            this.player.laneX = roadLimit;
            this.player.speed *= 0.96;
        }

        // Update distance
        this.player.distance += this.player.speed;
        this.player.mesh.position.x = this.player.laneX;
        this.player.mesh.rotation.y = this.player.steerAngle;
        this.player.mesh.rotation.z = -this.player.steerAngle * 0.4; // body tilt

        // Wheel rotation
        this.player.wheels.forEach(w => {
            w.children[0].rotation.x += this.player.speed * 0.5;
        });

        // Track highest speed (KM/H)
        const kmh = Math.round(this.player.speed * 135);
        if (kmh > this.player.topSpeedReached) this.player.topSpeedReached = kmh;

        // Engine Audio
        if (window.racerAudio) {
            window.racerAudio.updateEngine(this.player.speed / this.player.maxSpeed);
        }

        // 3. Update AI Rivals
        this.rivals.forEach(rival => {
            if (!rival.active) return;

            // Rubber-banding AI to keep match exciting
            const distDiff = rival.distance - this.player.distance;
            let aiTargetSpeed = rival.baseSpeed;
            if (distDiff > 40) aiTargetSpeed *= 0.88; // rival slows if too far ahead
            if (distDiff < -30) aiTargetSpeed *= 1.25; // rival speeds up if trailing

            rival.speed += (aiTargetSpeed - rival.speed) * 0.02;
            rival.distance += rival.speed;

            // AI Lane changes
            rival.laneChangeTimer--;
            if (rival.laneChangeTimer <= 0) {
                rival.laneChangeTimer = 60 + Math.random() * 100;
                rival.targetLaneX = [-4.0, -1.8, 1.8, 4.0][Math.floor(Math.random() * 4)];
            }
            rival.laneX += (rival.targetLaneX - rival.laneX) * 0.04;

            // Mesh relative to player
            const relativeZ = rival.distance - this.player.distance;
            rival.mesh.position.set(rival.laneX, 0, relativeZ);

            // Wheel rotation
            rival.wheels.forEach(w => {
                w.children[0].rotation.x += rival.speed * 0.5;
            });
        });

        // 4. Update Infinite Looping Road Segments
        const totalTrackSpan = this.segmentCount * this.segmentLength;
        this.roadSegments.forEach(seg => {
            const relZ = (seg.userData.initialZ - (this.player.distance % totalTrackSpan) + totalTrackSpan) % totalTrackSpan;
            seg.position.z = relZ - 15;
        });

        // 5. Pickups & Collision (Nitro Orbs & Boost Pads)
        this.pickups.forEach(p => {
            // Relocate relative to player distance
            const relZ = ((p.userData.initialZ - this.player.distance) % 500 + 500) % 500 - 20;
            p.position.z = relZ;

            if (p.userData.type === 'nitro') {
                p.rotation.y += 0.04;
                p.rotation.x += 0.02;
            }

            // Hit test
            if (Math.abs(relZ) < 2.0 && Math.abs(p.position.x - this.player.laneX) < 1.8) {
                if (p.userData.type === 'nitro') {
                    this.player.nitro = Math.min(100, this.player.nitro + 35);
                    if (window.racerAudio) window.racerAudio.playBoostPad();
                    p.userData.initialZ += 500; // recycle ahead
                } else if (p.userData.type === 'boost') {
                    this.player.speed = Math.min(this.player.speed + 0.35, this.player.nitroMaxSpeed);
                    if (window.racerAudio) window.racerAudio.playBoostPad();
                    p.userData.initialZ += 500;
                }
            }
        });

        // 6. Check Lap & Finish
        const totalDistanceRequired = this.player.maxLaps * this.player.lapLength;
        const currentLap = Math.min(this.player.maxLaps, Math.floor(this.player.distance / this.player.lapLength) + 1);
        this.player.lap = currentLap;

        if (this.player.distance >= totalDistanceRequired && !this.raceFinished) {
            this.handleFinishRace();
        }
    }

    updateCamera() {
        if (!this.player.mesh) return;

        if (this.cameraViewMode === 0) {
            // Smooth Chase Cam
            const targetCamZ = this.player.mesh.position.z - (this.player.isNitroActive ? 8.8 : 7.2);
            const targetCamY = 3.6;
            const targetCamX = this.player.laneX * 0.45;

            this.camera.position.x += (targetCamX - this.camera.position.x) * 0.12;
            this.camera.position.y += (targetCamY - this.camera.position.y) * 0.1;
            this.camera.position.z = targetCamZ;

            this.camera.lookAt(this.player.laneX * 0.8, 1.2, this.player.mesh.position.z + 16);
        } else {
            // Close Action Hood Cam
            this.camera.position.set(this.player.laneX, 1.3, this.player.mesh.position.z + 0.8);
            this.camera.lookAt(this.player.laneX, 1.2, this.player.mesh.position.z + 24);
        }
    }

    updateHUD() {
        // Speedometer
        const kmh = Math.round(this.player.speed * 135);
        const speedVal = document.getElementById('speed-val');
        if (speedVal) speedVal.textContent = kmh;

        // Nitro Bar
        const nitroFill = document.getElementById('nitro-fill');
        const nitroPct = document.getElementById('nitro-pct');
        if (nitroFill && nitroPct) {
            const pct = Math.max(0, Math.min(100, Math.round(this.player.nitro)));
            nitroFill.style.width = `${pct}%`;
            nitroPct.textContent = `${pct}%`;
        }

        // Lap
        const lapEl = document.getElementById('lap-text');
        if (lapEl) lapEl.textContent = `Lap ${this.player.lap}/${this.player.maxLaps}`;

        // Timer
        if (this.raceStarted && !this.raceFinished) {
            const elapsed = (Date.now() - this.startTime) / 1000;
            this.elapsedTime = elapsed;
            const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const secs = (elapsed % 60).toFixed(1).padStart(4, '0');
            const timeEl = document.getElementById('time-display');
            if (timeEl) timeEl.textContent = `${mins}:${secs}`;
        }

        // Live Position Calculation
        const activeRivals = this.rivals.filter(r => r.active);
        let rank = 1;
        activeRivals.forEach(r => {
            if (r.distance > this.player.distance) rank++;
        });

        const posVal = document.getElementById('pos-val');
        if (posVal) posVal.textContent = rank;

        // Rival proximity banner
        const r1 = this.rivals[0];
        const rText = document.getElementById('rival-text');
        if (rText && r1 && r1.active) {
            const diff = Math.round(r1.distance - this.player.distance);
            if (diff > 0) {
                rText.textContent = `${r1.name}: +${diff}m`;
            } else {
                rText.textContent = `You Leading (+${Math.abs(diff)}m) ❤️`;
            }
        }
    }

    handleFinishRace() {
        this.raceFinished = true;
        this.player.isNitroActive = false;
        if (window.racerAudio) {
            window.racerAudio.stopEngine();
            window.racerAudio.playVictory();
        }

        // Calculate final place
        const activeRivals = this.rivals.filter(r => r.active);
        let rank = 1;
        activeRivals.forEach(r => {
            if (r.distance > this.player.distance) rank++;
        });

        const medalMap = { 1: '1st Place 🥇 Champion!', 2: '2nd Place 🥈 Runner Up!', 3: '3rd Place 🥉', 4: '4th Place' };

        const mins = Math.floor(this.elapsedTime / 60).toString().padStart(2, '0');
        const secs = (this.elapsedTime % 60).toFixed(1).padStart(4, '0');

        document.getElementById('victory-title').textContent = rank === 1 ? `Victory! 🏆` : `Finished! 🏁`;
        document.getElementById('victory-subtitle').textContent = rank === 1 ? `${this.p1Name} Wins the Race! 💖` : `Great Match!`;
        document.getElementById('vstat-time').textContent = `${mins}:${secs}`;
        document.getElementById('vstat-speed').textContent = `${this.player.topSpeedReached} KM/H`;
        document.getElementById('vstat-pos').textContent = medalMap[rank] || `${rank}th Place`;

        document.getElementById('modal-victory').classList.add('open');
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.updatePhysics();
        this.updateCamera();
        this.updateHUD();
        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.turboRacer = new TurboRacer3D();
});
