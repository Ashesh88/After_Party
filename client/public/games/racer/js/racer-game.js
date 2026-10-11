// Couples 3D Turbo Racer - Next-Gen Cyberpunk Luxury Duel (Version 2.0)
// High-Octane 1v1 Street Race: P1 (You - Hot Pink) vs P2 (Friend - Electric Cyan)
// Complete Upgrade: Procedural Supercars, Slip-Angle Drift Physics, Dynamic Chase Cam,
// Holographic Gates, Starfield City Skyline, Spark & Smoke Particles, Snapshot Buffer Interpolation!

class LuxuryDuelRacer3D {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.isBotMode = false;

        // Read query params for names
        const params = new URLSearchParams(window.location.search);
        this.p1Name = params.get('p1') || 'You';
        this.p2Name = params.get('p2') || 'Friend';

        // Track & Race Configuration
        this.trackLength = 4000; // 4000m grand sprint to checkered finish arch
        this.roadWidth = 14;
        this.segmentCount = 55;
        this.segmentLength = 12;
        this.raceStarted = false;
        this.raceFinished = false;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.winner = null;

        // Track Themes: 0 = Dark Mode (Cyber Night), 1 = Light Mode (Cyber Daylight)
        this.currentTheme = 0;
        this.themeNames = ['Cyber Dark Mode', 'Cyber Light Mode'];

        // Quality Preset: 0 = Low, 1 = Medium, 2 = High (Auto adapts if FPS < 35)
        this.qualityLevel = 2; // High default
        this.fpsCounter = 60;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.autoQualityEnabled = true;

        // Camera views: 0 = Dynamic Chase (lag & pull back), 1 = Close Action, 2 = Hood / Cockpit
        this.cameraViewMode = 0;

        // Multiplayer Snapshot Buffer for Partner (smooth 100ms render past)
        this.partnerSnapshots = [];
        this.partnerLastPacketTime = performance.now();
        this.lastLeader = null; // Track overtaking toast

        // Player 1 (You - Metallic Hot Pink Supercar)
        this.p1 = {
            id: 'p1',
            name: this.p1Name,
            colorHex: 0xf43f5e, // Hot Pink Clearcoat
            glowHex: 0xec4899,
            rimHex: 0xfbbf24, // Forged Gold
            pos: new THREE.Vector3(-2.2, 0, 0),
            speed: 0,
            maxSpeed: 1.55, // ~210 km/h
            nitroMaxSpeed: 2.25, // ~305 km/h
            accel: 0.0125, // Snappy throttle response on GAS
            friction: 0.0036, // Smooth coasting when GAS is released
            steerAngle: 0,
            laneX: -2.2,
            distance: 0,
            nitro: 100,
            isNitroActive: false,
            isDrifting: false,
            slipAngle: 0,
            topSpeed: 0,
            finishTime: 0,
            mesh: null,
            frontWheels: [],
            rearWheels: [],
            exhausts: [],
            brakeLight: null,
            headlights: []
        };

        // Player 2 (Friend - Metallic Electric Cyan Supercar)
        this.p2 = {
            id: 'p2',
            name: this.p2Name,
            colorHex: 0x06b6d4, // Electric Cyan
            glowHex: 0x38bdf8,
            rimHex: 0xe2e8f0, // Polished Chrome
            pos: new THREE.Vector3(2.2, 0, 0),
            speed: 0,
            maxSpeed: 1.52,
            nitroMaxSpeed: 2.22,
            accel: 0.0095,
            friction: 0.0032,
            steerAngle: 0,
            laneX: 2.2,
            distance: 0,
            nitro: 100,
            isNitroActive: false,
            isDrifting: false,
            slipAngle: 0,
            topSpeed: 0,
            finishTime: 0,
            mesh: null,
            frontWheels: [],
            rearWheels: [],
            exhausts: [],
            brakeLight: null,
            headlights: [],
            botSteerTarget: 2.2,
            botTimer: 0,
            nameTagMesh: null
        };

        // Input States
        this.input = {
            p1Left: false,
            p1Right: false,
            p1Gas: false,
            p1Brake: false,
            p1Nitro: false,
            p1Drift: false,
            p2Left: false,
            p2Right: false,
            p2Gas: false,
            p2Brake: false,
            p2Nitro: false
        };

        // Gyro Tilt Steering
        this.tiltSteeringActive = false;
        this.deviceGamma = 0;

        this.roadSegments = [];
        this.hologramGates = [];
        this.sparkParticles = [];
        this.tireSmokeParticles = [];

        this.initThree();
        this.initTrack();
        this.initHologramGates();
        this.initLuxurySupercars();
        this.initFinishLine();
        this.initParticleSystems();
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

    // 1. SCENE, CAMERA, LIGHTING & VOLUMETRICS
    initThree() {
        this.scene = new THREE.Scene();
        this.applyThemeFogAndSky();

        this.camera = new THREE.PerspectiveCamera(
            window.innerWidth < 650 ? 66 : 56,
            window.innerWidth / window.innerHeight,
            0.1,
            650
        );
        this.camera.position.set(0, 3.8, -8);

        this.renderer = new THREE.WebGLRenderer({
            antialias: this.qualityLevel > 0,
            powerPreference: 'high-performance',
            stencil: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.qualityLevel === 2 ? 2 : 1.2));
        this.renderer.shadowMap.enabled = this.qualityLevel === 2;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting: Cyber ambient + directional moonlight
        this.hemiLight = new THREE.HemisphereLight(0x38bdf8, 0xec4899, 0.55);
        this.scene.add(this.hemiLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
        this.dirLight.position.set(20, 35, -20);
        if (this.qualityLevel === 2) {
            this.dirLight.castShadow = true;
            this.dirLight.shadow.mapSize.width = 1024;
            this.dirLight.shadow.mapSize.height = 1024;
        }
        this.scene.add(this.dirLight);

        this.buildHorizon();
    }

    applyThemeFogAndSky() {
        if (this.currentTheme === 0) {
            // Dark Mode: Deep Midnight Cyberpunk Night
            this.scene.fog = new THREE.FogExp2(0x0a091a, 0.0075);
            if (this.renderer) this.renderer.setClearColor(0x0a091a);
            if (this.hemiLight) {
                this.hemiLight.color.setHex(0x38bdf8);
                this.hemiLight.groundColor.setHex(0xec4899);
                this.hemiLight.intensity = 0.55;
            }
            if (this.dirLight) {
                this.dirLight.color.setHex(0xffffff);
                this.dirLight.intensity = 0.9;
            }
            document.body.classList.remove('theme-light');
        } else {
            // Light Mode: Vibrant Cyber Daylight / Dawn Highway
            this.scene.fog = new THREE.FogExp2(0xbae6fd, 0.0048);
            if (this.renderer) this.renderer.setClearColor(0xbae6fd);
            if (this.hemiLight) {
                this.hemiLight.color.setHex(0xffffff);
                this.hemiLight.groundColor.setHex(0x94a3b8);
                this.hemiLight.intensity = 0.95;
            }
            if (this.dirLight) {
                this.dirLight.color.setHex(0xfff7ed);
                this.dirLight.intensity = 1.35;
            }
            document.body.classList.add('theme-light');
        }
    }

    buildHorizon() {
        if (this.horizonGroup) this.scene.remove(this.horizonGroup);
        this.horizonGroup = new THREE.Group();

        const isLight = this.currentTheme === 1;

        if (!isLight) {
            // 1. Deep Celestial Starfield (550 glittering stars for night)
            const starGeo = new THREE.BufferGeometry();
            const starCoords = [];
            for (let i = 0; i < 550; i++) {
                starCoords.push(
                    (Math.random() - 0.5) * 450,
                    15 + Math.random() * 110,
                    160 + Math.random() * 200
                );
            }
            starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
            const starMat = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.9,
                transparent: true,
                opacity: 0.85
            });
            this.horizonGroup.add(new THREE.Points(starGeo, starMat));

            // 2. Giant Glowing Moon / Cyber Orb
            const moonGeo = new THREE.SphereGeometry(14, 24, 24);
            const moonMat = new THREE.MeshBasicMaterial({ color: 0xfdf4ff });
            const moon = new THREE.Mesh(moonGeo, moonMat);
            moon.position.set(45, 65, 310);
            this.horizonGroup.add(moon);
        } else {
            // Light Theme: Brilliant Golden Sun & Soft High-Altitude Clouds
            const sunGeo = new THREE.SphereGeometry(18, 28, 28);
            const sunMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
            const sun = new THREE.Mesh(sunGeo, sunMat);
            sun.position.set(45, 65, 310);
            this.horizonGroup.add(sun);

            // Sun Halo Flare
            const haloGeo = new THREE.RingGeometry(18.5, 27, 32);
            const haloMat = new THREE.MeshBasicMaterial({
                color: 0xfef08a,
                transparent: true,
                opacity: 0.45,
                side: THREE.DoubleSide
            });
            const halo = new THREE.Mesh(haloGeo, haloMat);
            halo.position.set(45, 65, 308);
            this.horizonGroup.add(halo);
        }

        // 3. Skyline Silhouettes
        const darkColors = [0x0c0b20, 0x12112e, 0x19183d];
        const lightColors = [0x38bdf8, 0x0284c7, 0x0369a1]; // Bright cyber glass architecture
        const buildingColors = isLight ? lightColors : darkColors;

        for (let i = 0; i < 42; i++) {
            const h = 25 + Math.random() * 65;
            const w = 12 + Math.random() * 22;
            const d = 10;
            const b = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, d),
                new THREE.MeshBasicMaterial({
                    color: buildingColors[i % buildingColors.length],
                    transparent: isLight,
                    opacity: isLight ? 0.85 : 1.0
                })
            );
            const x = (Math.random() - 0.5) * 380;
            b.position.set(x, h / 2 - 2, 240);
            this.horizonGroup.add(b);

            // Lit Cyan / Pink Window Dot Arrays
            if (i % 3 === 0) {
                const winPlane = new THREE.Mesh(
                    new THREE.PlaneGeometry(w * 0.7, h * 0.6),
                    new THREE.MeshBasicMaterial({
                        color: isLight ? 0xffffff : (i % 2 === 0 ? 0x06b6d4 : 0xec4899),
                        transparent: true,
                        opacity: isLight ? 0.6 : 0.35
                    })
                );
                winPlane.position.set(x, h / 2, 234);
                this.horizonGroup.add(winPlane);
            }
        }

        this.scene.add(this.horizonGroup);
    }

    // 2. ROAD, NEON BARRIERS, BILLBOARDS & LIGHT POLES
    initTrack() {
        this.trackGroup = new THREE.Group();
        this.scene.add(this.trackGroup);

        // Wet Reflective Asphalt Material (high metalness + low roughness)
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x111119,
            roughness: 0.28,
            metalness: 0.65
        });

        const curbMatL = new THREE.MeshBasicMaterial({ color: 0xec4899 });
        const curbMatR = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
        const centerLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        for (let i = 0; i < this.segmentCount; i++) {
            const z = i * this.segmentLength;
            const seg = new THREE.Group();

            // Wet Asphalt Track Mesh
            const asphalt = new THREE.Mesh(
                new THREE.PlaneGeometry(this.roadWidth, this.segmentLength),
                roadMat
            );
            asphalt.rotation.x = -Math.PI / 2;
            asphalt.receiveShadow = true;
            seg.add(asphalt);

            // Alternating Glowing Neon Edge Barriers (Hot Pink / Electric Cyan)
            const isAlt = i % 2 === 0;
            const leftColor = isAlt ? 0xec4899 : 0x06b6d4;
            const rightColor = isAlt ? 0x06b6d4 : 0xec4899;

            const curbL = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.45, this.segmentLength),
                new THREE.MeshBasicMaterial({ color: leftColor })
            );
            curbL.position.set(-this.roadWidth / 2 - 0.2, 0.22, 0);
            seg.add(curbL);

            const curbR = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.45, this.segmentLength),
                new THREE.MeshBasicMaterial({ color: rightColor })
            );
            curbR.position.set(this.roadWidth / 2 + 0.2, 0.22, 0);
            seg.add(curbR);

            // Center Dash Line
            const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 5.0), centerLineMat);
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(0, 0.02, 0);
            seg.add(dash);

            // Checkered Starting Grid
            if (i === 1) {
                const gridPlane = this.createStartingGridTexture();
                gridPlane.position.set(0, 0.03, 0);
                seg.add(gridPlane);
            }

            // Light Poles & Billboards every few segments
            if (i % 7 === 0) {
                const pole = this.createStreetLamp(i % 14 === 0 ? 0xec4899 : 0x06b6d4);
                pole.position.set(-this.roadWidth / 2 - 0.9, 0, 0);
                seg.add(pole);
            }

            if (i % 11 === 0) {
                const billboard = this.createNeonBillboard(i % 2 === 0);
                billboard.position.set(this.roadWidth / 2 + 3.8, 0, 0);
                seg.add(billboard);
            }

            seg.position.set(0, 0, z);
            seg.userData = { initialZ: z };
            this.trackGroup.add(seg);
            this.roadSegments.push(seg);
        }
    }

    createStartingGridTexture() {
        const group = new THREE.Group();
        const lineGeo = new THREE.PlaneGeometry(this.roadWidth - 1, 1.4);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.rotation.x = -Math.PI / 2;
        group.add(line);

        [-2.2, 2.2].forEach((x, idx) => {
            const box = new THREE.Mesh(
                new THREE.PlaneGeometry(2.6, 4.2),
                new THREE.MeshBasicMaterial({
                    color: idx === 0 ? 0xec4899 : 0x06b6d4,
                    transparent: true,
                    opacity: 0.45
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
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.2 });
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 7.0, 8), poleMat);
        pole.position.y = 3.5;
        lamp.add(pole);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.12), poleMat);
        arm.position.set(0.9, 6.9, 0);
        lamp.add(arm);

        const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.28, 8, 8),
            new THREE.MeshBasicMaterial({ color: lightHex })
        );
        bulb.position.set(1.8, 6.8, 0);
        lamp.add(bulb);

        return lamp;
    }

    createNeonBillboard(isPink) {
        const board = new THREE.Group();
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.18, 9, 8),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
        );
        post.position.y = 4.5;
        board.add(post);

        const screen = new THREE.Mesh(
            new THREE.BoxGeometry(5.5, 3.2, 0.25),
            new THREE.MeshBasicMaterial({ color: isPink ? 0xec4899 : 0x06b6d4 })
        );
        screen.position.set(0, 8.2, 0);
        board.add(screen);

        return board;
    }

    // 3. HOLOGRAPHIC CHECKPOINT RINGS THAT PULSE & FLASH
    initHologramGates() {
        this.gateDistances = [800, 1600, 2400, 3200];
        this.gateDistances.forEach((dist, idx) => {
            const gate = new THREE.Group();
            const ringGeo = new THREE.TorusGeometry(8.5, 0.22, 12, 36, Math.PI);
            const ringMat = new THREE.MeshBasicMaterial({
                color: idx % 2 === 0 ? 0xec4899 : 0x06b6d4,
                transparent: true,
                opacity: 0.85
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.y = 0.5;
            gate.add(ring);

            gate.position.set(0, 0, dist);
            gate.userData = { targetDistance: dist, passed: false, ringMesh: ring };
            this.scene.add(gate);
            this.hologramGates.push(gate);
        });
    }

    // 4. PROCEDURAL HIGH-END LUXURY SUPERCARS
    buildLuxuryHypercar(bodyColorHex, rimColorHex, glowColorHex, labelText) {
        const car = new THREE.Group();

        // High-Gloss Clearcoat Metallic Paint
        const paintMat = new THREE.MeshStandardMaterial({
            color: bodyColorHex,
            roughness: 0.16,
            metalness: 0.88
        });

        const carbonMat = new THREE.MeshStandardMaterial({
            color: 0x0b0b10,
            roughness: 0.35,
            metalness: 0.7
        });

        // 1. Sleek Aerodynamic Wedge Monocoque Body
        const mainBody = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.42, 3.9), paintMat);
        mainBody.position.y = 0.4;
        mainBody.castShadow = true;
        car.add(mainBody);

        // Sloped Nose / Hood
        const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 1.45), paintMat);
        hood.position.set(0, 0.35, 1.48);
        hood.rotation.x = 0.14;
        car.add(hood);

        // Front Splitter & Carbon Canards
        const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.55), carbonMat);
        splitter.position.set(0, 0.18, 2.1);
        car.add(splitter);

        // 2. Obsidian Curved Glass Cockpit Canopy
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x070913,
            roughness: 0.05,
            metalness: 0.95,
            transparent: true,
            opacity: 0.88
        });
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.38, 1.95), glassMat);
        canopy.position.set(0, 0.76, -0.15);
        car.add(canopy);

        // Roof Air Intake Scoop
        const roofScoop = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.75), carbonMat);
        roofScoop.position.set(0, 0.98, -0.2);
        car.add(roofScoop);

        // 3. Side Aero Skirts
        [-1.02, 1.02].forEach(x => {
            const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 3.4), carbonMat);
            skirt.position.set(x, 0.22, 0);
            car.add(skirt);
        });

        // 4. GT Rear Spoiler Wing with Downforce Struts
        const wing = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.06, 0.48), carbonMat);
        wing.position.set(0, 1.05, -1.92);
        car.add(wing);

        [-0.65, 0.65].forEach(x => {
            const strut = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.08), carbonMat);
            strut.position.set(x, 0.84, -1.92);
            car.add(strut);
        });

        // 5. Rear Carbon Diffuser & Quad Exhausts
        const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.14, 0.65), carbonMat);
        diffuser.position.set(0, 0.2, -1.88);
        car.add(diffuser);

        const exhausts = [];
        [-0.4, -0.18, 0.18, 0.4].forEach(x => {
            const tip = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.08, 0.22, 8),
                new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.95 })
            );
            tip.rotation.x = Math.PI / 2;
            tip.position.set(x, 0.36, -2.0);
            car.add(tip);

            // High-Octane Nitro Flame (Dual Cones)
            if (x === -0.18 || x === 0.18) {
                const flame = new THREE.Mesh(
                    new THREE.ConeGeometry(0.16, 1.1, 8),
                    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
                );
                flame.rotation.x = -Math.PI / 2;
                flame.position.set(x, 0.36, -2.65);
                flame.visible = false;
                car.add(flame);
                exhausts.push(flame);
            }
        });

        // 6. LED Matrix Headlights & Underglow
        const headlights = [];
        [-0.74, 0.74].forEach(x => {
            const hl = new THREE.Mesh(
                new THREE.BoxGeometry(0.36, 0.08, 0.1),
                new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
            );
            hl.position.set(x, 0.4, 2.02);
            car.add(hl);
            headlights.push(hl);
        });

        // Continuous Rear OLED Brake Lightbar
        const tailbar = new THREE.Mesh(
            new THREE.BoxGeometry(1.75, 0.09, 0.08),
            new THREE.MeshBasicMaterial({ color: 0xff0044 })
        );
        tailbar.position.set(0, 0.54, -1.98);
        car.add(tailbar);

        // Pulsing Neon Underglow Strip
        const underglow = new THREE.Mesh(
            new THREE.PlaneGeometry(2.15, 4.1),
            new THREE.MeshBasicMaterial({ color: glowColorHex, transparent: true, opacity: 0.75 })
        );
        underglow.rotation.x = -Math.PI / 2;
        underglow.position.y = 0.08;
        car.add(underglow);

        // 7. Forged Alloy Wheels with Front Visual Steering
        const frontWheels = [];
        const rearWheels = [];
        const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 18);
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.7 });
        const rimMat = new THREE.MeshStandardMaterial({ color: rimColorHex, metalness: 0.9, roughness: 0.1 });
        const caliperMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

        const wheelDefs = [
            { x: -1.04, y: 0.38, z: 1.25, isFront: true },
            { x: 1.04, y: 0.38, z: 1.25, isFront: true },
            { x: -1.04, y: 0.38, z: -1.25, isFront: false },
            { x: 1.04, y: 0.38, z: -1.25, isFront: false }
        ];

        wheelDefs.forEach((wDef, idx) => {
            const wGroup = new THREE.Group();
            const tire = new THREE.Mesh(tireGeo, tireMat);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            wGroup.add(tire);

            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.29, 10), rimMat);
            rim.rotation.z = Math.PI / 2;
            wGroup.add(rim);

            const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.14), caliperMat);
            caliper.position.set(idx % 2 === 0 ? 0.08 : -0.08, 0.12, 0);
            wGroup.add(caliper);

            wGroup.position.set(wDef.x, wDef.y, wDef.z);
            car.add(wGroup);

            if (wDef.isFront) frontWheels.push(wGroup);
            else rearWheels.push(wGroup);
        });

        return { mesh: car, frontWheels, rearWheels, exhausts, brakeLight: tailbar, headlights };
    }

    initLuxurySupercars() {
        // Build Player 1 (You - Hot Pink)
        const p1B = this.buildLuxuryHypercar(this.p1.colorHex, this.p1.rimHex, this.p1.glowHex, 'P1');
        this.p1.mesh = p1B.mesh;
        this.p1.frontWheels = p1B.frontWheels;
        this.p1.rearWheels = p1B.rearWheels;
        this.p1.exhausts = p1B.exhausts;
        this.p1.brakeLight = p1B.brakeLight;
        this.p1.headlights = p1B.headlights;
        this.p1.mesh.position.set(this.p1.laneX, 0, 0);
        this.scene.add(this.p1.mesh);

        // Build Player 2 (Friend - Electric Cyan)
        const p2B = this.buildLuxuryHypercar(this.p2.colorHex, this.p2.rimHex, this.p2.glowHex, 'P2');
        this.p2.mesh = p2B.mesh;
        this.p2.frontWheels = p2B.frontWheels;
        this.p2.rearWheels = p2B.rearWheels;
        this.p2.exhausts = p2B.exhausts;
        this.p2.brakeLight = p2B.brakeLight;
        this.p2.headlights = p2B.headlights;
        this.p2.mesh.position.set(this.p2.laneX, 0, 0);
        this.scene.add(this.p2.mesh);

        // Floating Name Tag above Partner's car
        this.createPartnerNameTag();
    }

    createPartnerNameTag() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(6, 182, 212, 0.85)';
        ctx.roundRect(10, 10, 236, 44, 12);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.p2Name, 128, 40);

        const tex = new THREE.CanvasTexture(canvas);
        const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
        tag.scale.set(3.2, 0.8, 1);
        tag.position.y = 2.4;
        this.p2.mesh.add(tag);
        this.p2.nameTagMesh = tag;
    }

    initFinishLine() {
        this.finishArch = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 });

        [-this.roadWidth / 2 - 0.4, this.roadWidth / 2 + 0.4].forEach(x => {
            const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8.0, 0.6), mat);
            p.position.set(x, 4.0, 0);
            this.finishArch.add(p);
        });

        const beam = new THREE.Mesh(new THREE.BoxGeometry(this.roadWidth + 1.4, 1.5, 0.6), mat);
        beam.position.set(0, 7.5, 0);
        this.finishArch.add(beam);

        // Neon Finish Sign
        const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(8.5, 1.0),
            new THREE.MeshBasicMaterial({ color: 0xf59e0b })
        );
        sign.position.set(0, 7.5, -0.32);
        this.finishArch.add(sign);

        const strip = new THREE.Mesh(
            new THREE.PlaneGeometry(this.roadWidth, 2.0),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        strip.rotation.x = -Math.PI / 2;
        strip.position.set(0, 0.05, 0);
        this.finishArch.add(strip);

        this.finishArch.position.set(0, 0, this.trackLength);
        this.scene.add(this.finishArch);
    }

    // 5. PARTICLE SYSTEMS: SPARKS & TIRE SMOKE
    initParticleSystems() {
        this.sparkPool = [];
        const sparkGeo = new THREE.SphereGeometry(0.08, 4, 4);
        const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

        for (let i = 0; i < 40; i++) {
            const p = new THREE.Mesh(sparkGeo, sparkMat);
            p.visible = false;
            this.scene.add(p);
            this.sparkPool.push({ mesh: p, life: 0, vx: 0, vy: 0, vz: 0 });
        }

        // Tire Smoke Particles Pool for Drift
        this.smokePool = [];
        const smokeGeo = new THREE.SphereGeometry(0.24, 6, 6);
        const smokeMat = new THREE.MeshBasicMaterial({
            color: 0xe2e8f0,
            transparent: true,
            opacity: 0.65
        });

        for (let i = 0; i < 45; i++) {
            const sm = new THREE.Mesh(smokeGeo, smokeMat.clone());
            sm.visible = false;
            this.scene.add(sm);
            this.smokePool.push({ mesh: sm, life: 0, maxLife: 30, vx: 0, vy: 0, vz: 0 });
        }
    }

    spawnSparks(x, y, z) {
        for (let i = 0; i < 5; i++) {
            const sp = this.sparkPool.find(p => p.life <= 0);
            if (!sp) break;
            sp.life = 25;
            sp.mesh.position.set(x, y, z);
            sp.mesh.visible = true;
            sp.vx = (Math.random() - 0.5) * 0.4;
            sp.vy = 0.15 + Math.random() * 0.25;
            sp.vz = -0.2 - Math.random() * 0.3;
        }
    }

    spawnTireSmoke(x, y, z) {
        for (let i = 0; i < 2; i++) {
            const sm = this.smokePool.find(p => p.life <= 0);
            if (!sm) break;
            sm.life = 28;
            sm.maxLife = 28;
            sm.mesh.scale.setScalar(0.7 + Math.random() * 0.5);
            sm.mesh.position.set(x + (Math.random() - 0.5) * 0.5, y + 0.15, z - 1.2);
            sm.mesh.material.opacity = 0.6;
            sm.mesh.visible = true;
            sm.vx = (Math.random() - 0.5) * 0.15;
            sm.vy = 0.05 + Math.random() * 0.08;
            sm.vz = -0.15 - Math.random() * 0.2;
        }
    }

    updateParticles() {
        this.sparkPool.forEach(p => {
            if (p.life > 0) {
                p.life--;
                p.mesh.position.x += p.vx;
                p.mesh.position.y += p.vy;
                p.mesh.position.z += p.vz;
                p.vy -= 0.015; // Gravity
                if (p.life <= 0) p.mesh.visible = false;
            }
        });

        this.smokePool.forEach(p => {
            if (p.life > 0) {
                p.life--;
                p.mesh.position.x += p.vx;
                p.mesh.position.y += p.vy;
                p.mesh.position.z += p.vz;
                p.mesh.scale.multiplyScalar(1.035); // Expand as smoke dissipates
                p.mesh.material.opacity = (p.life / p.maxLife) * 0.55;
                if (p.life <= 0) p.mesh.visible = false;
            }
        });
    }

    // 6. F1 5-LIGHT COUNTDOWN GANTRY
    startGantryCountdown() {
        this.raceStarted = false;
        this.raceFinished = false;
        this.winner = null;

        const gantry = document.getElementById('gantry-container');
        const text = document.getElementById('gantry-text');
        if (!gantry || !text) return;

        gantry.classList.remove('hidden');
        text.textContent = 'READY';

        for (let i = 1; i <= 5; i++) {
            const l = document.getElementById(`g-light-${i}`);
            if (l) l.classList.remove('red', 'green');
        }

        let step = 1;
        const countdownTimer = setInterval(() => {
            if (step <= 5) {
                const l = document.getElementById(`g-light-${step}`);
                if (l) l.classList.add('red');
                if (window.racerAudio) window.racerAudio.playCountdownBeep(false);
                step++;
            } else {
                clearInterval(countdownTimer);
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
                    window.racerAudio.playCountdownBeep(true);
                    window.racerAudio.startEngine();
                    window.racerAudio.startBGM();
                }

                setTimeout(() => {
                    gantry.classList.add('hidden');
                }, 1400);
            }
        }, 650);
    }

    // 7. CONTROLS, TOUCH, TILT & BUTTON LISTENERS
    initEvents() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.input.p1Left = true;
            if (e.key === 'ArrowRight') this.input.p1Right = true;
            if (e.key === 'ArrowUp') this.input.p1Gas = true;
            if (e.key === 'ArrowDown') this.input.p1Brake = true;
            if (e.key === 'Shift' || e.key === 'Enter') this.triggerNitro(this.p1, true);
            if (e.key === 'x' || e.key === 'X' || e.key === 'Control') this.input.p1Drift = true;

            // Camera toggle hotkey 'C'
            if (e.key === 'c' || e.key === 'C') {
                this.toggleCameraView();
            }

            // Player 2 controls (WASD)
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
            if (e.key === 'x' || e.key === 'X' || e.key === 'Control') this.input.p1Drift = false;

            if (e.key === 'a' || e.key === 'A') this.input.p2Left = false;
            if (e.key === 'd' || e.key === 'D') this.input.p2Right = false;
            if (e.key === 'w' || e.key === 'W') this.input.p2Gas = false;
            if (e.key === 's' || e.key === 'S') this.input.p2Brake = false;
            if (e.key === ' ') this.triggerNitro(this.p2, false);
        });

        // Reliable Touch & Pointer Handlers (Works on mobile touch, tablets and desktop clicks)
        const bindTouch = (id, onDown, onUp) => {
            const el = document.getElementById(id);
            if (!el) return;

            let isPressed = false;
            const press = (e) => {
                if (e && e.cancelable) e.preventDefault();
                if (isPressed) return;
                isPressed = true;
                el.classList.add('active');
                onDown();
            };
            const release = (e) => {
                if (e && e.cancelable) e.preventDefault();
                if (!isPressed) return;
                isPressed = false;
                el.classList.remove('active');
                onUp();
            };

            // Pointer Events (Unified standard for touch, stylus, and mouse)
            el.addEventListener('pointerdown', press, { passive: false });
            window.addEventListener('pointerup', release);
            window.addEventListener('pointercancel', release);

            // Touch fallback for older WebKit / mobile browsers
            el.addEventListener('touchstart', press, { passive: false });
            el.addEventListener('touchend', release, { passive: false });
            el.addEventListener('touchcancel', release, { passive: false });

            // Mouse fallback
            el.addEventListener('mousedown', press);
            window.addEventListener('mouseup', release);
        };

        bindTouch('touch-p1-left', () => { this.input.p1Left = true; }, () => { this.input.p1Left = false; });
        bindTouch('touch-p1-right', () => { this.input.p1Right = true; }, () => { this.input.p1Right = false; });
        bindTouch('touch-p1-gas', () => { this.input.p1Gas = true; }, () => { this.input.p1Gas = false; });
        bindTouch('touch-p1-nitro', () => { this.triggerNitro(this.p1, true); }, () => { this.triggerNitro(this.p1, false); });
        bindTouch('touch-p1-drift', () => {
            this.input.p1Drift = true;
            if (window.racerAudio) window.racerAudio.playDrift();
        }, () => {
            this.input.p1Drift = false;
        });

        // Utility Buttons
        const btn2p = document.getElementById('btn-mode-2p');
        const btnBot = document.getElementById('btn-mode-bot');
        if (btn2p) {
            btn2p.addEventListener('click', () => {
                this.isBotMode = false;
                btn2p.classList.add('active');
                if (btnBot) btnBot.classList.remove('active');
                this.restartRace();
            });
        }
        if (btnBot) {
            btnBot.addEventListener('click', () => {
                this.isBotMode = true;
                btnBot.classList.add('active');
                if (btn2p) btn2p.classList.remove('active');
                this.restartRace();
            });
        }

        // Camera toggle
        const btnCam = document.getElementById('btn-cam');
        if (btnCam) btnCam.addEventListener('click', () => this.toggleCameraView());

        // Theme toggle (Dark Mode vs Light Mode)
        const btnTheme = document.getElementById('btn-theme');
        if (btnTheme) {
            btnTheme.addEventListener('click', () => {
                this.currentTheme = this.currentTheme === 0 ? 1 : 0;
                const icon = document.getElementById('theme-icon');
                if (icon) {
                    icon.className = this.currentTheme === 0 ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
                }
                this.applyThemeFogAndSky();
                this.buildHorizon();
                this.showToast(`Theme: ${this.themeNames[this.currentTheme]}`, this.currentTheme === 0 ? '🌙' : '☀️');
                // Broadcast theme to partner
                window.parent.postMessage({
                    type: 'RACER_EVENT',
                    payload: { event: 'THEME_SYNC', theme: this.currentTheme }
                }, '*');
            });
        }

        // Audio toggles
        const btnSfx = document.getElementById('btn-sfx');
        if (btnSfx) {
            btnSfx.addEventListener('click', (e) => {
                if (window.racerAudio) {
                    const active = window.racerAudio.toggleSFX();
                    const icon = e.currentTarget.querySelector('i');
                    if (icon) icon.className = active ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
                }
            });
        }

        const btnMusic = document.getElementById('btn-music');
        if (btnMusic) {
            btnMusic.addEventListener('click', (e) => {
                if (window.racerAudio) {
                    const active = window.racerAudio.toggleMusic();
                    e.currentTarget.classList.toggle('active', active);
                }
            });
        }

        // Quality selector
        const btnQuality = document.getElementById('btn-quality');
        if (btnQuality) {
            btnQuality.addEventListener('click', () => {
                this.qualityLevel = (this.qualityLevel + 1) % 3;
                this.autoQualityEnabled = false;
                const qNames = ['LOW', 'MED', 'HIGH'];
                const badge = document.getElementById('quality-badge');
                if (badge) badge.textContent = qNames[this.qualityLevel];
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.qualityLevel === 2 ? 2 : 1.0));
                this.showToast(`Graphics: ${qNames[this.qualityLevel]}`);
            });
        }

        // Gyro Tilt Steering
        const btnTilt = document.getElementById('btn-tilt');
        if (btnTilt) {
            btnTilt.addEventListener('click', () => {
                this.tiltSteeringActive = !this.tiltSteeringActive;
                btnTilt.classList.toggle('active', this.tiltSteeringActive);
                if (this.tiltSteeringActive) {
                    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                        DeviceOrientationEvent.requestPermission().then(resp => {
                            if (resp === 'granted') this.listenTilt();
                        }).catch(() => {});
                    } else {
                        this.listenTilt();
                    }
                    this.showToast('Gyro Tilt Steering: ON');
                } else {
                    this.showToast('Gyro Tilt Steering: OFF');
                }
            });
        }

        const btnRestart = document.getElementById('btn-restart');
        if (btnRestart) btnRestart.addEventListener('click', () => this.restartRace());

        const btnRaceAgain = document.getElementById('btn-race-again');
        if (btnRaceAgain) {
            btnRaceAgain.addEventListener('click', () => {
                const modal = document.getElementById('modal-victory');
                if (modal) modal.classList.remove('open');
                this.restartRace();
            });
        }

        const btnBackArcade = document.getElementById('btn-back-arcade');
        if (btnBackArcade) {
            btnBackArcade.addEventListener('click', () => {
                window.parent.postMessage({ type: 'BACK_TO_ARCADE' }, '*');
            });
        }

        // Socket Events Relay from Parent
        window.addEventListener('message', (e) => {
            if (!e.data) return;
            if (e.data.type === 'PARTNER_MOVE') {
                const m = e.data.payload;
                if (m && typeof m.distance === 'number') {
                    // Push to snapshot buffer for interpolation
                    this.partnerSnapshots.push({
                        time: performance.now(),
                        distance: m.distance,
                        laneX: m.laneX,
                        speed: m.speed || 0,
                        isNitro: !!m.isNitroActive
                    });
                    if (this.partnerSnapshots.length > 20) this.partnerSnapshots.shift();
                    this.partnerLastPacketTime = performance.now();
                }
            } else if (e.data.type === 'RACER_EVENT') {
                const payload = e.data.payload;
                if (payload && payload.event === 'THEME_SYNC' && typeof payload.theme === 'number') {
                    this.currentTheme = payload.theme;
                    const icon = document.getElementById('theme-icon');
                    if (icon) {
                        icon.className = this.currentTheme === 0 ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
                    }
                    this.applyThemeFogAndSky();
                    this.buildHorizon();
                    this.showToast(`Theme: ${this.themeNames[this.currentTheme]}`, this.currentTheme === 0 ? '🌙' : '☀️');
                }
            } else if (e.data.type === 'RACER_PONG') {
                const roundtrip = Math.round(performance.now() - e.data.time);
                const pingText = document.getElementById('ping-text');
                if (pingText) pingText.textContent = `${roundtrip}ms`;
                const pingPill = document.getElementById('ping-display');
                if (pingPill) pingPill.classList.toggle('lagging', roundtrip > 150);
            }
        });

        // Periodic Ping Check to Parent
        setInterval(() => {
            window.parent.postMessage({ type: 'RACER_PING', time: performance.now() }, '*');
        }, 2000);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.fov = window.innerWidth < 650 ? 66 : 56;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    listenTilt() {
        window.addEventListener('deviceorientation', (e) => {
            if (!this.tiltSteeringActive) return;
            // Gamma: -90 to +90 tilt
            this.deviceGamma = e.gamma || 0;
            if (this.deviceGamma < -8) {
                this.input.p1Left = true;
                this.input.p1Right = false;
            } else if (this.deviceGamma > 8) {
                this.input.p1Right = true;
                this.input.p1Left = false;
            } else {
                this.input.p1Left = false;
                this.input.p1Right = false;
            }
        });
    }

    toggleCameraView() {
        this.cameraViewMode = (this.cameraViewMode + 1) % 3;
        const labels = ['Dynamic Chase', 'Close Action', 'Hood / Cockpit'];
        this.showToast(`Camera: ${labels[this.cameraViewMode]}`);
    }

    showToast(message, icon = '⚡') {
        const container = document.getElementById('toast-container');
        const msgEl = document.getElementById('toast-msg');
        const iconEl = document.getElementById('toast-icon');
        if (!container || !msgEl) return;
        msgEl.textContent = message;
        if (iconEl) iconEl.textContent = icon;
        container.classList.add('show');
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            container.classList.remove('show');
        }, 1800);
    }

    triggerNitro(car, active) {
        if (active && car.nitro > 12 && !car.isNitroActive) {
            car.isNitroActive = true;
            if (window.racerAudio) window.racerAudio.playNitro();
            car.exhausts.forEach(f => f.visible = true);
            // Speed Lines & Chromatic Flash FX
            const speedLines = document.getElementById('speed-lines');
            if (speedLines) speedLines.classList.add('active');
            // Haptic vibration
            if (navigator.vibrate) navigator.vibrate(80);
        } else if (!active && car.isNitroActive) {
            car.isNitroActive = false;
            car.exhausts.forEach(f => f.visible = false);
            const speedLines = document.getElementById('speed-lines');
            if (speedLines) speedLines.classList.remove('active');
        }
    }

    restartRace() {
        this.raceStarted = false;
        this.raceFinished = false;
        this.winner = null;

        this.p1.distance = 0;
        this.p1.speed = 0;
        this.p1.laneX = -2.2;
        this.p1.nitro = 100;
        this.p1.isNitroActive = false;
        this.p1.finishTime = 0;
        this.p1.mesh.position.set(-2.2, 0, 0);
        this.p1.exhausts.forEach(f => f.visible = false);

        this.p2.distance = 0;
        this.p2.speed = 0;
        this.p2.laneX = 2.2;
        this.p2.nitro = 100;
        this.p2.isNitroActive = false;
        this.p2.finishTime = 0;
        this.p2.mesh.position.set(2.2, 0, 0);
        this.p2.exhausts.forEach(f => f.visible = false);

        this.hologramGates.forEach(g => g.userData.passed = false);
        this.startGantryCountdown();
    }

    // 8. CONTROLLABLE DRIFT, SLIP ANGLE & ACCELERATION PHYSICS
    updateCarPhysics(car, ctrl) {
        const targetMax = car.isNitroActive ? car.nitroMaxSpeed : car.maxSpeed;

        if (ctrl.gas) {
            car.speed = Math.min(targetMax, car.speed + car.accel);
            if (car.brakeLight) car.brakeLight.material.color.setHex(0xff0044);
        } else if (ctrl.brake) {
            car.speed = Math.max(0, car.speed - car.friction * 4.5);
            if (car.brakeLight) car.brakeLight.material.color.setHex(0xff3366);
        } else {
            car.speed = Math.max(0, car.speed - car.friction);
            if (car.brakeLight) car.brakeLight.material.color.setHex(0x990022);
        }

        // Nitro Drain & Refill
        if (car.isNitroActive) {
            car.nitro -= 0.65;
            if (car.nitro <= 0) this.triggerNitro(car, false);
        } else {
            car.nitro = Math.min(100, car.nitro + 0.14);
        }

        // Steering & Lane Changing: Responsive steering with drift multiplier
        const driftInputActive = !!(ctrl.drift || this.input.p1Drift);
        car.isDrifting = driftInputActive && car.speed > 0.15;
        const driftFactor = car.isDrifting ? 1.6 : 1.0;

        // Base steer speed allows snappy lane changes even when accelerating from low speed
        const steerSpeed = (0.24 + Math.min(0.12, car.speed * 0.1)) * driftFactor;

        if (ctrl.left) {
            car.laneX -= steerSpeed;
            car.steerAngle = Math.max(-0.45, car.steerAngle - (car.isDrifting ? 0.1 : 0.08));
        } else if (ctrl.right) {
            car.laneX += steerSpeed;
            car.steerAngle = Math.min(0.45, car.steerAngle + (car.isDrifting ? 0.1 : 0.08));
        } else if (car.isDrifting) {
            // If drifting without steering, initiate subtle fishtail / momentum slide
            if (Math.abs(car.steerAngle) < 0.08) {
                car.steerAngle = (car.laneX <= 0 ? 0.18 : -0.18);
            }
        } else {
            // Auto counter-steer assist to center
            car.steerAngle *= 0.68;
        }

        // Drift SFX & Smoke Generation
        if (car.isDrifting && car.mesh) {
            this.spawnTireSmoke(car.mesh.position.x, car.mesh.position.y, car.mesh.position.z);
            if (Math.random() < 0.35 && window.racerAudio) {
                window.racerAudio.playDrift();
            }
        }

        // Guard-Rail Sliding (Bounces slightly & spawns sparks instead of dead stop)
        const limit = this.roadWidth / 2 - 1.35;
        if (car.laneX < -limit) {
            car.laneX = -limit;
            car.speed *= 0.985;
            this.spawnSparks(car.laneX - 0.4, 0.4, car.mesh.position.z);
            if (window.racerAudio && Math.random() < 0.15) window.racerAudio.playBarrierScrape();
        } else if (car.laneX > limit) {
            car.laneX = limit;
            car.speed *= 0.985;
            this.spawnSparks(car.laneX + 0.4, 0.4, car.mesh.position.z);
            if (window.racerAudio && Math.random() < 0.15) window.racerAudio.playBarrierScrape();
        }

        car.distance += car.speed;

        // Visual Steering on Front Wheels
        car.frontWheels.forEach(w => {
            w.rotation.y = car.steerAngle * 1.35;
        });

        // Dynamic Body Roll, Drift Slip Angle & Suspension Pitch
        const slipYaw = car.isDrifting ? car.steerAngle * 1.6 : car.steerAngle;
        car.mesh.rotation.y = slipYaw;
        car.mesh.rotation.z = -car.steerAngle * (car.isDrifting ? 0.65 : 0.48); // Aggressive lean while drifting
        car.mesh.rotation.x = ctrl.gas ? -0.025 : (ctrl.brake ? 0.03 : 0); // Squat on accel, dive on brake

        // Wheels Rotation
        const rollDelta = car.speed * 0.55;
        car.frontWheels.forEach(w => { w.children[0].rotation.x += rollDelta; });
        car.rearWheels.forEach(w => { w.children[0].rotation.x += rollDelta; });

        // Record Top Speed
        const kmh = Math.round(car.speed * 135);
        if (kmh > car.topSpeed) car.topSpeed = kmh;
    }

    // 9. MULTIPLAYER SNAPSHOT INTERPOLATION FOR PARTNER (Smooth & Lag-Free)
    interpolatePartnerCar() {
        if (this.partnerSnapshots.length === 0) return;
        const now = performance.now();
        const renderTime = now - 100; // 100ms interpolation buffer

        // Find surrounding snapshots
        let s0 = this.partnerSnapshots[0];
        let s1 = this.partnerSnapshots[this.partnerSnapshots.length - 1];

        for (let i = 0; i < this.partnerSnapshots.length - 1; i++) {
            if (this.partnerSnapshots[i].time <= renderTime && this.partnerSnapshots[i + 1].time >= renderTime) {
                s0 = this.partnerSnapshots[i];
                s1 = this.partnerSnapshots[i + 1];
                break;
            }
        }

        const span = s1.time - s0.time;
        const ratio = span > 0 ? Math.max(0, Math.min(1, (renderTime - s0.time) / span)) : 1;

        // Smoothly lerp distance, laneX and speed
        const targetDist = s0.distance + (s1.distance - s0.distance) * ratio;
        const targetX = s0.laneX + (s1.laneX - s0.laneX) * ratio;

        this.p2.distance += (targetDist - this.p2.distance) * 0.25;
        this.p2.laneX += (targetX - this.p2.laneX) * 0.25;
        this.p2.speed = s1.speed;
        this.p2.isNitroActive = s1.isNitro;

        // Nitro exhausts on partner car
        this.p2.exhausts.forEach(f => f.visible = this.p2.isNitroActive);

        // Wheels spin
        const roll = this.p2.speed * 0.55;
        this.p2.frontWheels.forEach(w => { w.children[0].rotation.x += roll; });
        this.p2.rearWheels.forEach(w => { w.children[0].rotation.x += roll; });
    }

    updateBotAI() {
        const gap = this.p2.distance - this.p1.distance;
        let targetSpd = this.p2.maxSpeed;

        if (gap > 35) targetSpd *= 0.9;
        if (gap < -25) {
            targetSpd *= 1.25;
            if (this.p2.nitro > 35 && Math.random() < 0.08) this.triggerNitro(this.p2, true);
        }

        this.p2.speed += (targetSpd - this.p2.speed) * 0.025;
        this.p2.distance += this.p2.speed;

        this.p2.botTimer--;
        if (this.p2.botTimer <= 0) {
            this.p2.botTimer = 80 + Math.random() * 120;
            this.p2.botSteerTarget = this.p1.laneX < 0 ? 2.2 + Math.random() * 1.8 : -2.2 - Math.random() * 1.8;
        }
        this.p2.laneX += (this.p2.botSteerTarget - this.p2.laneX) * 0.035;

        const roll = this.p2.speed * 0.55;
        this.p2.frontWheels.forEach(w => { w.children[0].rotation.x += roll; });
        this.p2.rearWheels.forEach(w => { w.children[0].rotation.x += roll; });
    }

    // 10. DYNAMIC CHASE CAMERA (Lag behind with lerp, pull back at high speed)
    updateCamera() {
        if (!this.p1.mesh || !this.p2.mesh) return;

        let targetX = this.p1.laneX * 0.5;
        let targetY = 3.6;
        let targetZ = this.p1.mesh.position.z - 7.5;

        if (this.cameraViewMode === 0) {
            // Dynamic Chase: Pull back on boost, swing outward while steering
            const speedPullBack = (this.p1.speed / this.p1.maxSpeed) * 1.6;
            targetZ = this.p1.mesh.position.z - (7.2 + speedPullBack + (this.p1.isNitroActive ? 2.0 : 0));
            targetY = 3.5 + (this.p1.isNitroActive ? 0.35 : 0);
            targetX = this.p1.laneX * 0.65;
        } else if (this.cameraViewMode === 1) {
            // Close Action View
            targetZ = this.p1.mesh.position.z - 5.5;
            targetY = 2.8;
            targetX = this.p1.laneX * 0.8;
        } else if (this.cameraViewMode === 2) {
            // Hood / Bumper View
            targetZ = this.p1.mesh.position.z + 0.6;
            targetY = 1.35;
            targetX = this.p1.laneX;
        }

        this.camera.position.x += (targetX - this.camera.position.x) * 0.14;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.12;
        this.camera.position.z = targetZ;

        const lookAheadZ = Math.max(this.p1.mesh.position.z, this.p2.mesh.position.z) + 18;
        this.camera.lookAt((this.p1.laneX + this.p2.laneX) * 0.25, 1.3, lookAheadZ);
    }

    // 11. HOLOGRAPHIC GATE PULSING & CHECKPOINT PASSES
    updateHolograms() {
        this.hologramGates.forEach(g => {
            const targetZ = g.userData.targetDistance;
            // Place relative to P1 distance
            g.position.z = targetZ - this.p1.distance;

            // Pulsing rotate effect
            if (g.userData.ringMesh) {
                g.userData.ringMesh.rotation.z += 0.015;
            }

            // Flash gate when local car passes through
            if (!g.userData.passed && this.p1.distance >= targetZ) {
                g.userData.passed = true;
                if (g.userData.ringMesh) {
                    g.userData.ringMesh.material.color.setHex(0xffffff);
                    setTimeout(() => {
                        if (g.userData.ringMesh) g.userData.ringMesh.material.color.setHex(0xec4899);
                    }, 350);
                }
                this.showToast(`Checkpoint ${Math.round(targetZ)}m!`, '🏁');
                if (window.racerAudio) window.racerAudio.playBoostPad();
            }
        });
    }

    // 12. TELEMETRY, OVERTAKE ALERTS & HUD UPDATES
    updateHUD() {
        const p1Kmh = Math.round(this.p1.speed * 135);
        const p2Kmh = Math.round(this.p2.speed * 135);

        const p1Spd = document.getElementById('p1-speed');
        const p2Spd = document.getElementById('p2-speed');
        if (p1Spd) p1Spd.textContent = p1Kmh;
        if (p2Spd) p2Spd.textContent = p2Kmh;

        // Gear Indicator
        if (window.racerAudio) {
            const p1Gear = document.getElementById('p1-gear');
            if (p1Gear) p1Gear.textContent = window.racerAudio.currentGear || 1;
            window.racerAudio.updateEngine(this.p1.speed / this.p1.maxSpeed, this.p1.isNitroActive);
        }

        // Arc Speedometer Fill
        const p1Arc = document.getElementById('p1-arc-fill');
        const p2Arc = document.getElementById('p2-arc-fill');
        if (p1Arc) p1Arc.style.width = `${Math.min(100, Math.round((p1Kmh / 280) * 100))}%`;
        if (p2Arc) p2Arc.style.width = `${Math.min(100, Math.round((p2Kmh / 280) * 100))}%`;

        // Nitro Fill
        const p1Nitro = document.getElementById('p1-nitro-fill');
        const p2Nitro = document.getElementById('p2-nitro-fill');
        if (p1Nitro) p1Nitro.style.width = `${Math.round(this.p1.nitro)}%`;
        if (p2Nitro) p2Nitro.style.width = `${Math.round(this.p2.nitro)}%`;

        const p1NitroPct = document.getElementById('p1-nitro-pct');
        const p2NitroPct = document.getElementById('p2-nitro-pct');
        if (p1NitroPct) p1NitroPct.textContent = `${Math.round(this.p1.nitro)}%`;
        if (p2NitroPct) p2NitroPct.textContent = `${Math.round(this.p2.nitro)}%`;

        // Race Timer
        if (this.raceStarted && !this.raceFinished) {
            const elapsed = (Date.now() - this.startTime) / 1000;
            this.elapsedTime = elapsed;
            const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const secs = (elapsed % 60).toFixed(1).padStart(4, '0');
            const timeEl = document.getElementById('time-display');
            if (timeEl) timeEl.textContent = `${mins}:${secs}`;
        }

        // Mini-Map Pins
        const maxDist = Math.max(this.p1.distance, this.p2.distance);
        const distText = document.getElementById('dist-text');
        if (distText) distText.textContent = `${Math.min(this.trackLength, Math.round(maxDist))} / ${this.trackLength}m`;

        const p1Pct = Math.min(100, Math.max(0, (this.p1.distance / this.trackLength) * 100));
        const p2Pct = Math.min(100, Math.max(0, (this.p2.distance / this.trackLength) * 100));
        const pinP1 = document.getElementById('pin-p1');
        const pinP2 = document.getElementById('pin-p2');
        if (pinP1) pinP1.style.left = `${p1Pct}%`;
        if (pinP2) pinP2.style.left = `${p2Pct}%`;

        // Overtake Detection & Toast Alerts
        const diff = Math.round(this.p1.distance - this.p2.distance);
        const currentLeader = diff >= 0 ? 'P1' : 'P2';

        if (this.lastLeader && this.lastLeader !== currentLeader && this.raceStarted && !this.raceFinished) {
            if (currentLeader === 'P1') {
                this.showToast('You overtook your partner! 🔥', '🥇');
            } else {
                this.showToast('Partner overtook you! ⚡', '💨');
            }
        }
        this.lastLeader = currentLeader;

        const p1Pos = document.getElementById('p1-pos');
        const p2Pos = document.getElementById('p2-pos');
        const leaderText = document.getElementById('leader-text');

        if (diff >= 0) {
            if (p1Pos) p1Pos.textContent = '1st';
            if (p2Pos) p2Pos.textContent = '2nd';
            if (leaderText) leaderText.textContent = `🥇 ${this.p1Name} Leading (+${diff}m)`;
        } else {
            if (p1Pos) p1Pos.textContent = '2nd';
            if (p2Pos) p2Pos.textContent = '1st';
            if (leaderText) leaderText.textContent = `🥇 ${this.p2Name} Leading (+${Math.abs(diff)}m)`;
        }
    }

    // 13. SLOW-MOTION PHOTO FINISH & CELEBRATION
    handleRaceFinish() {
        this.raceFinished = true;
        this.p1.isNitroActive = false;
        this.p2.isNitroActive = false;

        // Trigger Slow-Mo Banner for 2 seconds before celebration
        const slowmo = document.getElementById('slowmo-banner');
        if (slowmo) slowmo.classList.add('active');

        setTimeout(() => {
            if (slowmo) slowmo.classList.remove('active');
            this.showVictoryModal();
        }, 1800);
    }

    showVictoryModal() {
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

        const wTitle = document.getElementById('winner-title');
        const wSub = document.getElementById('winner-subtitle');
        if (wTitle) wTitle.textContent = `${winnerName} Wins! 🏆`;
        if (wSub) wSub.textContent = `Cyber Highway Duel Champion!`;

        const r1Name = document.getElementById('res-1st-name');
        const r1Time = document.getElementById('res-1st-time');
        const r2Name = document.getElementById('res-2nd-name');
        const r2Time = document.getElementById('res-2nd-time');
        if (r1Name) r1Name.textContent = winnerName;
        if (r1Time) r1Time.textContent = `${mins}:${secs}`;
        if (r2Name) r2Name.textContent = runnerName;
        if (r2Time) r2Time.textContent = `+${(gapMeters / 40).toFixed(2)}s`;

        const maxKmh = Math.max(this.p1.topSpeed, this.p2.topSpeed);
        const vSpeed = document.getElementById('vstat-speed');
        const vGap = document.getElementById('vstat-gap');
        if (vSpeed) vSpeed.textContent = `${maxKmh} KM/H`;
        if (vGap) vGap.textContent = `+${gapMeters} M`;

        // Couple Stakes Line
        const stakesLines = [
            '🍕 Loser buys dinner tonight! 💕',
            '☕ Loser makes breakfast in bed tomorrow! ✨',
            '🎬 Winner picks the movie tonight! 🍿',
            '💆 Loser gives a 10-minute massage! 💆‍♂️'
        ];
        const stakesPill = document.getElementById('couple-stakes');
        if (stakesPill) {
            stakesPill.textContent = stakesLines[Math.floor(Math.random() * stakesLines.length)];
        }

        const modal = document.getElementById('modal-victory');
        if (modal) modal.classList.add('open');

        // Confetti burst
        this.launchConfetti();
    }

    launchConfetti() {
        const cCanvas = document.getElementById('confetti-canvas');
        if (!cCanvas) return;
        cCanvas.width = window.innerWidth;
        cCanvas.height = window.innerHeight;
        const ctx = cCanvas.getContext('2d');
        const particles = [];
        const colors = ['#ec4899', '#06b6d4', '#f59e0b', '#38bdf8', '#a855f7'];

        for (let i = 0; i < 90; i++) {
            particles.push({
                x: window.innerWidth * 0.5,
                y: window.innerHeight * 0.4,
                vx: (Math.random() - 0.5) * 14,
                vy: (Math.random() - 0.8) * 15,
                size: 6 + Math.random() * 8,
                color: colors[i % colors.length],
                rot: Math.random() * Math.PI,
                dRot: (Math.random() - 0.5) * 0.2
            });
        }

        let frames = 0;
        const drawConfetti = () => {
            frames++;
            ctx.clearRect(0, 0, cCanvas.width, cCanvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.35; // Gravity
                p.rot += p.dRot;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
                ctx.restore();
            });
            if (frames < 140) requestAnimationFrame(drawConfetti);
            else ctx.clearRect(0, 0, cCanvas.width, cCanvas.height);
        };
        drawConfetti();
    }

    // 14. GAME LOOP WITH AUTO QUALITY MONITOR
    animate(currentTime) {
        requestAnimationFrame(this.animate);

        // Auto Quality FPS Monitor
        this.frameCount++;
        if (currentTime - this.lastFrameTime >= 1000) {
            this.fpsCounter = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = currentTime;

            if (this.autoQualityEnabled && this.fpsCounter < 35 && this.qualityLevel > 0) {
                // Auto drop quality to guarantee smooth 60 FPS
                this.qualityLevel--;
                this.renderer.setPixelRatio(1.0);
                this.renderer.shadowMap.enabled = false;
                const badge = document.getElementById('quality-badge');
                if (badge) badge.textContent = ['LOW', 'MED', 'HIGH'][this.qualityLevel];
            }
        }

        // Physics Updates
        if (this.raceStarted && !this.raceFinished) {
            // Gas Throttle: Holding GAS (or Up Arrow / W) accelerates; releasing coasts
            this.updateCarPhysics(this.p1, {
                left: this.input.p1Left,
                right: this.input.p1Right,
                gas: this.input.p1Gas,
                brake: this.input.p1Brake,
                drift: this.input.p1Drift
            });

            if (this.isBotMode) {
                this.updateBotAI();
            } else {
                // Interpolate Partner Car with Snapshot Buffer
                this.interpolatePartnerCar();
            }

            // Cross Finish Check
            if (this.p1.distance >= this.trackLength || this.p2.distance >= this.trackLength) {
                this.handleRaceFinish();
            }

            // Sync Broadcast to Partner (every 3 frames)
            if (Math.random() < 0.3) {
                window.parent.postMessage({
                    type: 'RACE_SYNC',
                    payload: {
                        distance: this.p1.distance,
                        laneX: this.p1.laneX,
                        speed: this.p1.speed,
                        isNitroActive: this.p1.isNitroActive
                    }
                }, '*');
            }
        }

        // Relative Mesh Placements on Infinite Track
        if (this.p1.mesh) {
            this.p1.mesh.position.set(this.p1.laneX, 0, 0);
        }
        if (this.p2.mesh) {
            this.p2.mesh.position.set(this.p2.laneX, 0, this.p2.distance - this.p1.distance);
        }

        // Infinite Road Segment Scrolling
        const totalSpan = this.segmentCount * this.segmentLength;
        this.roadSegments.forEach(seg => {
            const relZ = (seg.userData.initialZ - (this.p1.distance % totalSpan) + totalSpan) % totalSpan;
            seg.position.z = relZ - 15;
        });

        // Finish Arch Relative Distance
        if (this.finishArch) {
            this.finishArch.position.z = this.trackLength - this.p1.distance;
        }

        this.updateHolograms();
        this.updateParticles();
        this.updateCamera();
        this.updateHUD();

        this.renderer.render(this.scene, this.camera);
    }
}

function initGame() {
    if (!window.luxuryDuelRacer) {
        window.luxuryDuelRacer = new LuxuryDuelRacer3D();
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
