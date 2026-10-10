// Couples 3D Turbo Racer - Luxury 2-Player Head-to-Head Highway Duel
// Pure 1v1 Race: Player 1 (You) vs Player 2 (Friend / Partner) in High-End Luxury Supercars!

class LuxuryDuelRacer3D {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.isBotMode = false; // false: 2-Player controls (You & Friend) | true: Player 2 controlled by AI Bot

        // Read query params for names
        const params = new URLSearchParams(window.location.search);
        this.p1Name = params.get('p1') || 'You';
        this.p2Name = params.get('p2') || 'Friend';

        // Track & Race Configuration
        this.trackLength = 1500; // 1500m sprint to checkered finish line
        this.roadWidth = 14;
        this.segmentCount = 50;
        this.segmentLength = 12;
        this.raceStarted = false;
        this.raceFinished = false;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.winner = null;

        // Player 1 (You - Crimson Hypercar)
        this.p1 = {
            id: 'p1',
            name: this.p1Name,
            colorHex: 0xd91636, // Metallic Rosso Corsa
            glowHex: 0xf43f5e,
            rimHex: 0xf59e0b, // Forged Gold
            pos: new THREE.Vector3(-2.2, 0, 0),
            speed: 0,
            maxSpeed: 1.48, // ~200 km/h
            nitroMaxSpeed: 2.15, // ~280 km/h
            accel: 0.009,
            friction: 0.0035,
            steerAngle: 0,
            laneX: -2.2,
            distance: 0,
            nitro: 100,
            isNitroActive: false,
            topSpeed: 0,
            finishTime: 0,
            mesh: null,
            wheels: [],
            exhausts: [],
            brakeLight: null
        };

        // Player 2 (Friend - Cobalt Blue Hypercar)
        this.p2 = {
            id: 'p2',
            name: this.p2Name,
            colorHex: 0x0284c7, // Metallic Cobalt Hypercar
            glowHex: 0x06b6d4,
            rimHex: 0xe2e8f0, // Polished Chrome
            pos: new THREE.Vector3(2.2, 0, 0),
            speed: 0,
            maxSpeed: 1.48,
            nitroMaxSpeed: 2.15,
            accel: 0.009,
            friction: 0.0035,
            steerAngle: 0,
            laneX: 2.2,
            distance: 0,
            nitro: 100,
            isNitroActive: false,
            topSpeed: 0,
            finishTime: 0,
            mesh: null,
            wheels: [],
            exhausts: [],
            brakeLight: null,
            botSteerTarget: 2.2,
            botTimer: 0
        };

        // Input States for Both Racers
        this.input = {
            // Player 1: Arrow keys
            p1Left: false,
            p1Right: false,
            p1Gas: false,
            p1Brake: false,
            p1Nitro: false,
            // Player 2: WASD
            p2Left: false,
            p2Right: false,
            p2Gas: false,
            p2Brake: false,
            p2Nitro: false
        };

        this.roadSegments = [];
        this.cameraMode = 0; // 0: Chase leader, 1: P1 focus, 2: P2 focus

        this.initThree();
        this.initTrack();
        this.initLuxurySupercars();
        this.initFinishLine();
        this.initEvents();
        this.updateHUDNames();
        this.startGantryCountdown();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    updateHUDNames() {
        const p1El = document.getElementById('p1-name-display');
        const p2El = document.getElementById('p2-name-display');
        if (p1El) p1El.textContent = this.p1Name;
        if (p2El) p2El.textContent = this.p2Name;
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x080612, 0.008);

        this.camera = new THREE.PerspectiveCamera(
            window.innerWidth < 650 ? 64 : 54,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );
        this.camera.position.set(0, 3.8, -8);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x080612);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting: Soft moonlight & ambient street glow
        const hemiLight = new THREE.HemisphereLight(0x06b6d4, 0xec4899, 0.4);
        this.scene.add(hemiLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
        this.dirLight.position.set(15, 30, -25);
        this.dirLight.castShadow = true;
        this.scene.add(this.dirLight);

        // Ambient city skyline horizon
        this.buildHorizon();
    }

    buildHorizon() {
        const horizon = new THREE.Group();
        // Starfield dots
        const starsGeo = new THREE.BufferGeometry();
        const starCoords = [];
        for (let i = 0; i < 400; i++) {
            starCoords.push(
                (Math.random() - 0.5) * 400,
                15 + Math.random() * 80,
                150 + Math.random() * 150
            );
        }
        starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
        const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8 });
        horizon.add(new THREE.Points(starsGeo, starsMat));

        // Distant Glowing City Silhouettes
        for (let i = 0; i < 35; i++) {
            const h = 20 + Math.random() * 50;
            const w = 10 + Math.random() * 18;
            const b = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, 8),
                new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x0c0c1e : 0x111026 })
            );
            b.position.set((Math.random() - 0.5) * 350, h / 2 - 2, 220);
            horizon.add(b);
        }

        this.scene.add(horizon);
    }

    initTrack() {
        this.trackGroup = new THREE.Group();
        this.scene.add(this.trackGroup);

        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x12121a,
            roughness: 0.5,
            metalness: 0.3
        });
        const curbMatL = new THREE.MeshBasicMaterial({ color: 0xec4899 });
        const curbMatR = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        for (let i = 0; i < this.segmentCount; i++) {
            const z = i * this.segmentLength;
            const seg = new THREE.Group();

            // Dark Asphalt Highway
            const asphalt = new THREE.Mesh(
                new THREE.PlaneGeometry(this.roadWidth, this.segmentLength),
                roadMat
            );
            asphalt.rotation.x = -Math.PI / 2;
            asphalt.receiveShadow = true;
            seg.add(asphalt);

            // Left Neon Barrier
            const curbL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, this.segmentLength), curbMatL);
            curbL.position.set(-this.roadWidth / 2 - 0.2, 0.18, 0);
            seg.add(curbL);

            // Right Neon Barrier
            const curbR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, this.segmentLength), curbMatR);
            curbR.position.set(this.roadWidth / 2 + 0.2, 0.18, 0);
            seg.add(curbR);

            // Center Dash Line
            const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 4.5), lineMat);
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(0, 0.02, 0);
            seg.add(dash);

            // Checkered starting grid on first 2 segments
            if (i === 1) {
                const gridPlane = this.createStartingGridTexture();
                gridPlane.position.set(0, 0.03, 0);
                seg.add(gridPlane);
            }

            // Highway street lamp posts every 8 segments
            if (i % 8 === 0) {
                const lamp = this.createStreetLamp(i % 16 === 0 ? 0xec4899 : 0x06b6d4);
                lamp.position.set(-this.roadWidth / 2 - 0.8, 0, 0);
                seg.add(lamp);
            }

            seg.position.set(0, 0, z);
            seg.userData = { initialZ: z };
            this.trackGroup.add(seg);
            this.roadSegments.push(seg);
        }
    }

    createStartingGridTexture() {
        const group = new THREE.Group();
        // Checkered line across track
        const lineGeo = new THREE.PlaneGeometry(this.roadWidth - 1, 1.2);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.rotation.x = -Math.PI / 2;
        group.add(line);

        // P1 & P2 Grid Boxes
        [-2.2, 2.2].forEach((x, idx) => {
            const box = new THREE.Mesh(
                new THREE.PlaneGeometry(2.4, 4.0),
                new THREE.MeshBasicMaterial({
                    color: idx === 0 ? 0xec4899 : 0x06b6d4,
                    transparent: true,
                    opacity: 0.4
                })
            );
            box.rotation.x = -Math.PI / 2;
            box.position.set(x, 0.01, -2.5);
            group.add(box);
        });

        return group;
    }

    createStreetLamp(lightHex) {
        const lamp = new THREE.Group();
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6.5, 8), poleMat);
        pole.position.y = 3.25;
        lamp.add(pole);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), poleMat);
        arm.position.set(0.8, 6.4, 0);
        lamp.add(arm);

        const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            new THREE.MeshBasicMaterial({ color: lightHex })
        );
        bulb.position.set(1.5, 6.3, 0);
        lamp.add(bulb);

        return lamp;
    }

    initFinishLine() {
        // Giant 3D Overhead Checkered Finish Line Arch
        this.finishArch = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });

        // Left & Right Pillars
        [-this.roadWidth / 2 - 0.4, this.roadWidth / 2 + 0.4].forEach(x => {
            const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7.5, 0.6), mat);
            p.position.set(x, 3.75, 0);
            this.finishArch.add(p);
        });

        // Top Gantry Banner
        const beam = new THREE.Mesh(new THREE.BoxGeometry(this.roadWidth + 1.4, 1.4, 0.6), mat);
        beam.position.set(0, 7.0, 0);
        this.finishArch.add(beam);

        // Neon Finish Sign
        const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 0.8),
            new THREE.MeshBasicMaterial({ color: 0xf59e0b })
        );
        sign.position.set(0, 7.0, -0.32);
        this.finishArch.add(sign);

        // Checkered Finish Strip on Road
        const strip = new THREE.Mesh(
            new THREE.PlaneGeometry(this.roadWidth, 1.8),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        strip.rotation.x = -Math.PI / 2;
        strip.position.set(0, 0.05, 0);
        this.finishArch.add(strip);

        // Position finish arch at 1500m
        this.finishArch.position.set(0, 0, this.trackLength);
        this.scene.add(this.finishArch);
    }

    // Ultra Luxury 3D Sports Supercar Factory (Ferrari SF90 / Bugatti Chiron inspired)
    buildLuxuryHypercar(bodyColorHex, rimColorHex, glowColorHex, labelText) {
        const car = new THREE.Group();

        // 1. High-Gloss Metallic Paint Material
        const paintMat = new THREE.MeshStandardMaterial({
            color: bodyColorHex,
            roughness: 0.2,
            metalness: 0.85
        });

        const carbonMat = new THREE.MeshStandardMaterial({
            color: 0x0f0f14,
            roughness: 0.4,
            metalness: 0.6
        });

        // 2. Main Sculpted Monocoque Body
        const mainBody = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.42, 3.9), paintMat);
        mainBody.position.y = 0.38;
        mainBody.castShadow = true;
        car.add(mainBody);

        // Sculpted Front Nose & Hood with Aerodynamic Slope
        const hood = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.2, 1.4), paintMat);
        hood.position.set(0, 0.32, 1.45);
        hood.rotation.x = 0.14;
        car.add(hood);

        // Front Carbon Fiber Splitter & Aero Canards
        const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.06, 0.5), carbonMat);
        splitter.position.set(0, 0.16, 2.05);
        car.add(splitter);

        // 3. Luxury Curved Tinted Obsidian Glass Canopy (Cockpit)
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x0a0e17,
            roughness: 0.05,
            metalness: 0.95,
            transparent: true,
            opacity: 0.88
        });
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.38, 1.9), glassMat);
        canopy.position.set(0, 0.74, -0.15);
        car.add(canopy);

        // Roof Scoop
        const roofScoop = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.7), carbonMat);
        roofScoop.position.set(0, 0.96, -0.2);
        car.add(roofScoop);

        // 4. Side-Blade Air Intakes (Mid-Engine Cooling)
        [-1.0, 1.0].forEach(x => {
            const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.9), carbonMat);
            scoop.position.set(x, 0.42, -0.4);
            car.add(scoop);
        });

        // 5. Active Aero GT Rear Wing / Spoiler
        const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.45), carbonMat);
        wing.position.set(0, 1.02, -1.9);
        car.add(wing);

        [-0.65, 0.65].forEach(x => {
            const strut = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.08), carbonMat);
            strut.position.set(x, 0.8, -1.9);
            car.add(strut);
        });

        // 6. Rear Carbon Diffuser with Vertical Aero Fins
        const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.6), carbonMat);
        diffuser.position.set(0, 0.18, -1.85);
        car.add(diffuser);

        // 7. Luxury Quad Exhaust Pipes with Red-Hot Tips
        const exhausts = [];
        [-0.4, -0.18, 0.18, 0.4].forEach(x => {
            const tip = new THREE.Mesh(
                new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8),
                new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 })
            );
            tip.rotation.x = Math.PI / 2;
            tip.position.set(x, 0.34, -1.98);
            car.add(tip);

            // Nitro Flame Cone (revealed when boosting)
            if (x === -0.18 || x === 0.18) {
                const flame = new THREE.Mesh(
                    new THREE.ConeGeometry(0.14, 0.85, 8),
                    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
                );
                flame.rotation.x = -Math.PI / 2;
                flame.position.set(x, 0.34, -2.5);
                flame.visible = false;
                car.add(flame);
                exhausts.push(flame);
            }
        });

        // 8. Front LED Matrix Headlights with DRL Eyebrow Lights
        const hlMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
        [-0.72, 0.72].forEach(x => {
            const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.1), hlMat);
            hl.position.set(x, 0.38, 2.0);
            car.add(hl);
        });

        // 9. Continuous Neon OLED Rear Lightbar (Brake Light)
        const tailMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
        const tailbar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.08), tailMat);
        tailbar.position.set(0, 0.52, -1.96);
        car.add(tailbar);

        // 10. Glowing Neon Underglow Strip
        const underglow = new THREE.Mesh(
            new THREE.PlaneGeometry(2.1, 4.0),
            new THREE.MeshBasicMaterial({ color: glowColorHex, transparent: true, opacity: 0.7 })
        );
        underglow.rotation.x = -Math.PI / 2;
        underglow.position.y = 0.07;
        car.add(underglow);

        // 11. 4 Forged Alloy Wheels with Red Brembo Brake Calipers
        const wheels = [];
        const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 20);
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.7 });
        const rimMat = new THREE.MeshStandardMaterial({ color: rimColorHex, metalness: 0.9, roughness: 0.1 });
        const caliperMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Red Brembo

        const wheelPositions = [
            [-1.02, 0.36, 1.25],
            [1.02, 0.36, 1.25],
            [-1.02, 0.36, -1.25],
            [1.02, 0.36, -1.25]
        ];

        wheelPositions.forEach((pos, idx) => {
            const wGroup = new THREE.Group();

            // Tire Rubber
            const tire = new THREE.Mesh(tireGeo, tireMat);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            wGroup.add(tire);

            // Chrome/Gold 5-Spoke Rim
            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.29, 10), rimMat);
            rim.rotation.z = Math.PI / 2;
            wGroup.add(rim);

            // Brake Caliper
            const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.14), caliperMat);
            caliper.position.set(idx % 2 === 0 ? 0.08 : -0.08, 0.12, 0);
            wGroup.add(caliper);

            wGroup.position.set(pos[0], pos[1], pos[2]);
            car.add(wGroup);
            wheels.push(wGroup);
        });

        return { mesh: car, wheels, exhausts, brakeLight: tailbar };
    }

    initLuxurySupercars() {
        // Build Player 1 (You - Rosso Corsa Luxury GT)
        const p1Built = this.buildLuxuryHypercar(this.p1.colorHex, this.p1.rimHex, this.p1.glowHex, 'P1');
        this.p1.mesh = p1Built.mesh;
        this.p1.wheels = p1Built.wheels;
        this.p1.exhausts = p1Built.exhausts;
        this.p1.brakeLight = p1Built.brakeLight;
        this.p1.mesh.position.set(this.p1.laneX, 0, 0);
        this.scene.add(this.p1.mesh);

        // Build Player 2 (Friend - Cobalt Blue Luxury GT)
        const p2Built = this.buildLuxuryHypercar(this.p2.colorHex, this.p2.rimHex, this.p2.glowHex, 'P2');
        this.p2.mesh = p2Built.mesh;
        this.p2.wheels = p2Built.wheels;
        this.p2.exhausts = p2Built.exhausts;
        this.p2.brakeLight = p2Built.brakeLight;
        this.p2.mesh.position.set(this.p2.laneX, 0, 0);
        this.scene.add(this.p2.mesh);
    }

    startGantryCountdown() {
        this.raceStarted = false;
        this.raceFinished = false;
        this.winner = null;

        const gantry = document.getElementById('gantry-container');
        const text = document.getElementById('gantry-text');
        if (!gantry || !text) return;

        gantry.classList.remove('hidden');
        text.textContent = 'GET READY';

        // Reset lights
        for (let i = 1; i <= 5; i++) {
            const l = document.getElementById(`g-light-${i}`);
            if (l) {
                l.classList.remove('red', 'green');
            }
        }

        // Formula 1 Countdown: 5 Red lights turn on sequentially (800ms each)
        let step = 1;
        const countdownTimer = setInterval(() => {
            if (step <= 5) {
                const l = document.getElementById(`g-light-${step}`);
                if (l) l.classList.add('red');
                if (window.racerAudio) window.racerAudio.playBoostPad();
                step++;
            } else {
                clearInterval(countdownTimer);
                // Lights out & Green GO!
                for (let i = 1; i <= 5; i++) {
                    const l = document.getElementById(`g-light-${i}`);
                    if (l) {
                        l.classList.remove('red');
                        l.classList.add('green');
                    }
                }
                text.textContent = 'LIGHTS OUT & GO! 🏁';
                this.raceStarted = true;
                this.startTime = Date.now();
                if (window.racerAudio) {
                    window.racerAudio.startEngine();
                    window.racerAudio.playNitro();
                }

                // Hide gantry after 1.5s
                setTimeout(() => {
                    gantry.classList.add('hidden');
                }, 1500);
            }
        }, 650);
    }

    initEvents() {
        // Keyboard Controls for Both Players
        window.addEventListener('keydown', (e) => {
            // Player 1: Arrow keys
            if (e.key === 'ArrowLeft') this.input.p1Left = true;
            if (e.key === 'ArrowRight') this.input.p1Right = true;
            if (e.key === 'ArrowUp') this.input.p1Gas = true;
            if (e.key === 'ArrowDown') this.input.p1Brake = true;
            if (e.key === 'Shift' || e.key === 'Enter') this.triggerNitro(this.p1, true);

            // Player 2: WASD
            if (e.key === 'a' || e.key === 'A') this.input.p2Left = true;
            if (e.key === 'd' || e.key === 'D') this.input.p2Right = true;
            if (e.key === 'w' || e.key === 'W') this.input.p2Gas = true;
            if (e.key === 's' || e.key === 'S') this.input.p2Brake = true;
            if (e.key === ' ') this.triggerNitro(this.p2, true);
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft') this.input.p1Left = false;
            if (e.key === 'ArrowRight') this.input.p1Right = false;
            if (e.key === 'ArrowUp') this.input.p1Gas = false;
            if (e.key === 'ArrowDown') this.input.p1Brake = false;
            if (e.key === 'Shift' || e.key === 'Enter') this.triggerNitro(this.p1, false);

            if (e.key === 'a' || e.key === 'A') this.input.p2Left = false;
            if (e.key === 'd' || e.key === 'D') this.input.p2Right = false;
            if (e.key === 'w' || e.key === 'W') this.input.p2Gas = false;
            if (e.key === 's' || e.key === 'S') this.input.p2Brake = false;
            if (e.key === ' ') this.triggerNitro(this.p2, false);
        });

        // Touch buttons for mobile
        const bindTouch = (id, onDown, onUp) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('pointerdown', (e) => { e.preventDefault(); onDown(); });
            el.addEventListener('pointerup', (e) => { e.preventDefault(); onUp(); });
            el.addEventListener('pointerleave', (e) => { e.preventDefault(); onUp(); });
            el.addEventListener('pointercancel', (e) => { e.preventDefault(); onUp(); });
        };

        bindTouch('touch-p1-left', () => { this.input.p1Left = true; }, () => { this.input.p1Left = false; });
        bindTouch('touch-p1-right', () => { this.input.p1Right = true; }, () => { this.input.p1Right = false; });
        bindTouch('touch-p1-gas', () => { this.input.p1Gas = true; }, () => { this.input.p1Gas = false; });
        bindTouch('touch-p1-nitro', () => { this.triggerNitro(this.p1, true); }, () => { this.triggerNitro(this.p1, false); });

        // Mode Switch: 2-Player vs Friend Bot
        document.getElementById('btn-mode-2p').addEventListener('click', () => {
            this.isBotMode = false;
            document.getElementById('btn-mode-2p').classList.add('active');
            document.getElementById('btn-mode-bot').classList.remove('active');
            this.restartRace();
        });

        document.getElementById('btn-mode-bot').addEventListener('click', () => {
            this.isBotMode = true;
            document.getElementById('btn-mode-bot').classList.add('active');
            document.getElementById('btn-mode-2p').classList.remove('active');
            this.restartRace();
        });

        // Camera, Audio, Restart buttons
        document.getElementById('btn-cam').addEventListener('click', () => {
            this.cameraMode = (this.cameraMode + 1) % 3;
        });

        document.getElementById('btn-mute').addEventListener('click', (e) => {
            if (window.racerAudio) {
                window.racerAudio.muted = !window.racerAudio.muted;
                const icon = e.currentTarget.querySelector('i');
                icon.className = window.racerAudio.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
            }
        });

        document.getElementById('btn-restart').addEventListener('click', () => this.restartRace());
        document.getElementById('btn-race-again').addEventListener('click', () => {
            document.getElementById('modal-victory').classList.remove('open');
            this.restartRace();
        });

        // Listen for Partner Moves from socket via parent component
        window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'PARTNER_MOVE') {
                const m = e.data.payload;
                if (m && typeof m.distance === 'number') {
                    this.p2.distance = m.distance;
                    this.p2.laneX = m.laneX;
                    this.p2.speed = m.speed;
                }
            }
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.fov = window.innerWidth < 650 ? 64 : 54;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    triggerNitro(car, active) {
        if (active && car.nitro > 10 && !car.isNitroActive) {
            car.isNitroActive = true;
            if (window.racerAudio) window.racerAudio.playNitro();
            car.exhausts.forEach(f => f.visible = true);
        } else if (!active && car.isNitroActive) {
            car.isNitroActive = false;
            car.exhausts.forEach(f => f.visible = false);
        }
    }

    restartRace() {
        this.raceStarted = false;
        this.raceFinished = false;
        this.winner = null;

        // Reset P1
        this.p1.distance = 0;
        this.p1.speed = 0;
        this.p1.laneX = -2.2;
        this.p1.nitro = 100;
        this.p1.isNitroActive = false;
        this.p1.finishTime = 0;
        this.p1.mesh.position.set(-2.2, 0, 0);
        this.p1.exhausts.forEach(f => f.visible = false);

        // Reset P2
        this.p2.distance = 0;
        this.p2.speed = 0;
        this.p2.laneX = 2.2;
        this.p2.nitro = 100;
        this.p2.isNitroActive = false;
        this.p2.finishTime = 0;
        this.p2.mesh.position.set(2.2, 0, 0);
        this.p2.exhausts.forEach(f => f.visible = false);

        this.startGantryCountdown();
    }

    updatePhysics() {
        if (!this.raceStarted || this.raceFinished) return;

        // Auto-gas enabled for Player 1 on mobile or when pressing Up
        const p1Gas = this.input.p1Gas || window.innerWidth < 650;
        this.updateCarPhysics(this.p1, {
            left: this.input.p1Left,
            right: this.input.p1Right,
            gas: p1Gas,
            brake: this.input.p1Brake
        });

        // Player 2 Controls (Friend)
        if (this.isBotMode) {
            // Intelligent Friend AI Bot
            this.updateBotAI();
        } else {
            // 2nd Human Player (WASD)
            this.updateCarPhysics(this.p2, {
                left: this.input.p2Left,
                right: this.input.p2Right,
                gas: this.input.p2Gas,
                brake: this.input.p2Brake
            });
        }

        // Relative Car Meshes on Infinite Track
        // The track scrolls relative to Player 1 distance
        this.p1.mesh.position.set(this.p1.laneX, 0, 0);
        this.p2.mesh.position.set(this.p2.laneX, 0, this.p2.distance - this.p1.distance);

        // Infinite Road Segment Scrolling
        const totalSpan = this.segmentCount * this.segmentLength;
        this.roadSegments.forEach(seg => {
            const relZ = (seg.userData.initialZ - (this.p1.distance % totalSpan) + totalSpan) % totalSpan;
            seg.position.z = relZ - 15;
        });

        // Finish Arch relative distance
        this.finishArch.position.z = this.trackLength - this.p1.distance;

        // Check if either car crossed the finish line (1500m)
        if (this.p1.distance >= this.trackLength || this.p2.distance >= this.trackLength) {
            this.handleRaceFinish();
        }

        // Broadcast Player 1 sync to parent window for socket transmission
        if (Math.random() < 0.2) {
            window.parent.postMessage({
                type: 'RACE_SYNC',
                payload: {
                    distance: this.p1.distance,
                    laneX: this.p1.laneX,
                    speed: this.p1.speed
                }
            }, '*');
        }
    }

    updateCarPhysics(car, ctrl) {
        const targetMax = car.isNitroActive ? car.nitroMaxSpeed : car.maxSpeed;

        // Gas & Brake
        if (ctrl.gas && !ctrl.brake) {
            car.speed += car.accel;
            if (car.isNitroActive) car.speed += 0.016;
        } else if (ctrl.brake) {
            car.speed -= 0.035;
            if (car.brakeLight) car.brakeLight.material.color.setHex(0xff0000);
        } else {
            car.speed -= car.friction;
            if (car.brakeLight) car.brakeLight.material.color.setHex(0x990022);
        }

        car.speed = Math.max(0, Math.min(car.speed, targetMax));

        // Consume & Refill Nitro
        if (car.isNitroActive) {
            car.nitro -= 0.65;
            if (car.nitro <= 0) this.triggerNitro(car, false);
        } else {
            car.nitro = Math.min(100, car.nitro + 0.14);
        }

        // Steer
        const steerSpeed = 0.12 * (car.speed / 1.0);
        if (ctrl.left) {
            car.laneX -= steerSpeed;
            car.steerAngle = Math.max(-0.24, car.steerAngle - 0.04);
            if (car.speed > 1.2 && Math.random() < 0.04 && window.racerAudio) window.racerAudio.playDrift();
        } else if (ctrl.right) {
            car.laneX += steerSpeed;
            car.steerAngle = Math.min(0.24, car.steerAngle + 0.04);
            if (car.speed > 1.2 && Math.random() < 0.04 && window.racerAudio) window.racerAudio.playDrift();
        } else {
            car.steerAngle *= 0.8;
        }

        // Track boundary clamping
        const limit = this.roadWidth / 2 - 1.2;
        car.laneX = Math.max(-limit, Math.min(limit, car.laneX));

        car.distance += car.speed;
        car.mesh.rotation.y = car.steerAngle;
        car.mesh.rotation.z = -car.steerAngle * 0.35; // body roll

        // Wheels spin
        car.wheels.forEach(w => {
            w.children[0].rotation.x += car.speed * 0.55;
        });

        // Top Speed record
        const kmh = Math.round(car.speed * 135);
        if (kmh > car.topSpeed) car.topSpeed = kmh;
    }

    updateBotAI() {
        // Friend Bot mimics real friend driving with competitive matching
        const gap = this.p2.distance - this.p1.distance;
        let botTargetSpeed = this.p2.maxSpeed;

        if (gap > 35) botTargetSpeed *= 0.9; // Bot slows slightly if far ahead
        if (gap < -25) {
            botTargetSpeed *= 1.25; // Bot accelerates aggressively if trailing
            if (this.p2.nitro > 40 && Math.random() < 0.08) this.triggerNitro(this.p2, true);
        }

        this.p2.speed += (botTargetSpeed - this.p2.speed) * 0.025;
        this.p2.distance += this.p2.speed;

        // Bot smooth lane steering
        this.p2.botTimer--;
        if (this.p2.botTimer <= 0) {
            this.p2.botTimer = 80 + Math.random() * 120;
            // Aim for lane opposite to P1 to avoid direct overlapping
            this.p2.botSteerTarget = this.p1.laneX < 0 ? 2.2 + Math.random() * 2 : -2.2 - Math.random() * 2;
        }
        this.p2.laneX += (this.p2.botSteerTarget - this.p2.laneX) * 0.03;

        // Wheels spin
        this.p2.wheels.forEach(w => {
            w.children[0].rotation.x += this.p2.speed * 0.55;
        });
    }

    updateCamera() {
        const targetX = this.p1.laneX * 0.5;
        const targetY = 3.6;
        const targetZ = this.p1.mesh.position.z - (this.p1.isNitroActive ? 8.6 : 7.2);

        this.camera.position.x += (targetX - this.camera.position.x) * 0.12;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.1;
        this.camera.position.z = targetZ;

        // Look at midway point between P1 and P2 ahead
        const lookAheadZ = Math.max(this.p1.mesh.position.z, this.p2.mesh.position.z) + 16;
        this.camera.lookAt((this.p1.laneX + this.p2.laneX) * 0.3, 1.2, lookAheadZ);
    }

    updateHUD() {
        // Speedometers
        const p1Kmh = Math.round(this.p1.speed * 135);
        const p2Kmh = Math.round(this.p2.speed * 135);

        const p1SpeedEl = document.getElementById('p1-speed');
        const p2SpeedEl = document.getElementById('p2-speed');
        if (p1SpeedEl) p1SpeedEl.textContent = p1Kmh;
        if (p2SpeedEl) p2SpeedEl.textContent = p2Kmh;

        // Engine sound modulation for Player 1
        if (window.racerAudio) {
            window.racerAudio.updateEngine(this.p1.speed / this.p1.maxSpeed);
        }

        // Nitro Bars
        const p1NitroFill = document.getElementById('p1-nitro-fill');
        const p2NitroFill = document.getElementById('p2-nitro-fill');
        if (p1NitroFill) p1NitroFill.style.width = `${Math.round(this.p1.nitro)}%`;
        if (p2NitroFill) p2NitroFill.style.width = `${Math.round(this.p2.nitro)}%`;

        // Elapsed Race Timer
        if (this.raceStarted && !this.raceFinished) {
            const elapsed = (Date.now() - this.startTime) / 1000;
            this.elapsedTime = elapsed;
            const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const secs = (elapsed % 60).toFixed(1).padStart(4, '0');
            const timeEl = document.getElementById('time-display');
            if (timeEl) timeEl.textContent = `${mins}:${secs}`;
        }

        // Track Distance Progress
        const maxDist = Math.max(this.p1.distance, this.p2.distance);
        const distText = document.getElementById('dist-text');
        if (distText) distText.textContent = `${Math.min(this.trackLength, Math.round(maxDist))} / ${this.trackLength}m`;

        // Race Positions & Gap Banner
        const p1PosEl = document.getElementById('p1-pos');
        const p2PosEl = document.getElementById('p2-pos');
        const leaderText = document.getElementById('leader-text');

        const diff = Math.round(this.p1.distance - this.p2.distance);
        if (diff >= 0) {
            if (p1PosEl) p1PosEl.textContent = '1st';
            if (p2PosEl) p2PosEl.textContent = '2nd';
            if (leaderText) leaderText.textContent = `🥇 ${this.p1Name} Leading (+${diff}m)`;
        } else {
            if (p1PosEl) p1PosEl.textContent = '2nd';
            if (p2PosEl) p2PosEl.textContent = '1st';
            if (leaderText) leaderText.textContent = `🥇 ${this.p2Name} Leading (+${Math.abs(diff)}m)`;
        }
    }

    handleRaceFinish() {
        this.raceFinished = true;
        this.p1.isNitroActive = false;
        this.p2.isNitroActive = false;

        if (window.racerAudio) {
            window.racerAudio.stopEngine();
            window.racerAudio.playVictory();
        }

        const p1Won = this.p1.distance >= this.p2.distance;
        const winnerName = p1Won ? this.p1Name : this.p2Name;
        const runnerName = p1Won ? this.p2Name : this.p1Name;

        const mins = Math.floor(this.elapsedTime / 60).toString().padStart(2, '0');
        const secs = (this.elapsedTime % 60).toFixed(1).padStart(4, '0');
        const gapMeters = Math.abs(Math.round(this.p1.distance - this.p2.distance));

        // Populate Victory Celebration Modal
        document.getElementById('winner-title').textContent = `${winnerName} Wins! 🏆`;
        document.getElementById('winner-subtitle').textContent = `Luxury 2-Player Highway Champion!`;
        document.getElementById('res-1st-name').textContent = winnerName;
        document.getElementById('res-1st-time').textContent = `${mins}:${secs}`;
        document.getElementById('res-2nd-name').textContent = runnerName;
        document.getElementById('res-2nd-time').textContent = `+${(gapMeters / 40).toFixed(2)}s`;

        const maxKmh = Math.max(this.p1.topSpeed, this.p2.topSpeed);
        document.getElementById('vstat-speed').textContent = `${maxKmh} KM/H`;
        document.getElementById('vstat-gap').textContent = `+${gapMeters} M`;

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
    window.luxuryDuelRacer = new LuxuryDuelRacer3D();
});
