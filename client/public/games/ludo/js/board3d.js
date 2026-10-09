// Couples Ludo 3D - Three.js 3D Board Renderer
// High-detail beveled board, 3D star safe zones, neon yards, victory crown

class LudoBoard3D {
    constructor(scene) {
        this.scene = scene;
        this.tileSize = 0.52;
        this.boardGroup = new THREE.Group();
        this.tileMeshes = [];
        this.highlightRings = [];

        this.initTrackMapping();
        this.buildBoard();
        this.scene.add(this.boardGroup);
    }

    initTrackMapping() {
        // Standard 52-step perimeter track
        this.trackCoords = [
            [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
            [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
            [0, 7],
            [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
            [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
            [7, 14],
            [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
            [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
            [14, 7],
            [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
            [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
            [7, 0], [6, 0]
        ];

        // Safe indices on track (⭐)
        this.safeIndices = [0, 8, 13, 21, 26, 34, 39, 47];

        // Player 1 (Pink) Home Column -> Crown
        this.p1HomeCoords = [
            [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [7, 7]
        ];

        // Player 2 (Purple) Home Column -> Crown
        this.p2HomeCoords = [
            [7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8], [7, 7]
        ];

        // Yard Base Spawn Slots (4 tokens per yard)
        this.p1YardSlots = [
            [2, 2], [2, 3], [3, 2], [3, 3]
        ];
        this.p2YardSlots = [
            [11, 11], [11, 12], [12, 11], [12, 12]
        ];
    }

    gridToWorld(r, c, elevation = 0.08) {
        const x = (c - 7) * this.tileSize;
        const z = (r - 7) * this.tileSize;
        return new THREE.Vector3(x, elevation, z);
    }

    buildBoard() {
        // 1. Luxury Obsidian Beveled Board Base Pedestal
        const baseWidth = 15 * this.tileSize + 0.9;
        const baseGeo = new THREE.BoxGeometry(baseWidth, 0.4, baseWidth);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x0c0e14,
            roughness: 0.25,
            metalness: 0.35
        });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = -0.2;
        baseMesh.receiveShadow = true;
        this.boardGroup.add(baseMesh);

        // 2. Metallic Rose-Gold Outer Frame Edge
        const frameGeo = new THREE.BoxGeometry(baseWidth + 0.12, 0.08, baseWidth + 0.12);
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0xd946ef,
            roughness: 0.15,
            metalness: 0.8
        });
        const frameMesh = new THREE.Mesh(frameGeo, frameMat);
        frameMesh.position.y = 0.02;
        this.boardGroup.add(frameMesh);

        // 3. Build 15x15 Grid Cells
        const cellGeo = new THREE.BoxGeometry(this.tileSize * 0.94, 0.06, this.tileSize * 0.94);

        // Materials
        const neutralMat = new THREE.MeshStandardMaterial({
            color: 0x181c24,
            roughness: 0.35,
            metalness: 0.15
        });
        const pinkMat = new THREE.MeshStandardMaterial({
            color: 0xf43f5e,
            roughness: 0.2,
            metalness: 0.2,
            emissive: 0xf43f5e,
            emissiveIntensity: 0.15
        });
        const purpleMat = new THREE.MeshStandardMaterial({
            color: 0x8b5cf6,
            roughness: 0.2,
            metalness: 0.2,
            emissive: 0x8b5cf6,
            emissiveIntensity: 0.15
        });
        const greenMat = new THREE.MeshStandardMaterial({
            color: 0x10b981,
            roughness: 0.3,
            metalness: 0.15
        });
        const yellowMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            roughness: 0.3,
            metalness: 0.15
        });

        // 4 Large Home Bases (Yards)
        this.buildYard(0, 0, 0xf43f5e, 'Pink Heart Yard 💕', this.p1YardSlots); // Top-left P1
        this.buildYard(9, 9, 0x8b5cf6, 'Royal Amethyst 💜', this.p2YardSlots); // Bottom-right P2
        this.buildYard(0, 9, 0x10b981, 'Emerald Oasis 🌿', []); // Top-right Decor
        this.buildYard(9, 0, 0xf59e0b, 'Sunlit Gold ☀️', []); // Bottom-left Decor

        // Build Track Cells
        for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
                // Skip yards and center
                if ((r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8)) continue;
                if (r >= 6 && r <= 8 && c >= 6 && c <= 8) continue; // Center crown

                let mat = neutralMat;

                // Pink start & home column
                if ((r === 6 && c === 1) || (r === 7 && c >= 1 && c <= 5)) {
                    mat = pinkMat;
                }
                // Purple start & home column
                if ((r === 8 && c === 13) || (r === 7 && c >= 9 && c <= 13)) {
                    mat = purpleMat;
                }
                // Green decor column
                if ((r === 1 && c === 8) || (c === 7 && r >= 1 && r <= 5)) {
                    mat = greenMat;
                }
                // Yellow decor column
                if ((r === 13 && c === 6) || (c === 7 && r >= 9 && r <= 13)) {
                    mat = yellowMat;
                }

                const tile = new THREE.Mesh(cellGeo, mat);
                const pos = this.gridToWorld(r, c, 0.03);
                tile.position.copy(pos);
                tile.receiveShadow = true;
                this.boardGroup.add(tile);

                // Add 3D Star on Safe Squares ⭐
                if (this.isSafeSquare(r, c)) {
                    this.add3DStar(tile.position.x, 0.07, tile.position.z);
                }
            }
        }

        // 4. Center Victory Crown Pedestal
        this.buildCenterVictoryPlatform();
    }

    isSafeSquare(r, c) {
        return this.safeIndices.some(idx => {
            const coord = this.trackCoords[idx];
            return coord[0] === r && coord[1] === c;
        });
    }

    buildYard(startR, startC, colorHex, label, slots) {
        const yardWidth = 6 * this.tileSize;
        const yardGeo = new THREE.BoxGeometry(yardWidth * 0.96, 0.08, yardWidth * 0.96);
        const yardMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.25,
            metalness: 0.3,
            emissive: colorHex,
            emissiveIntensity: 0.12
        });
        const yardMesh = new THREE.Mesh(yardGeo, yardMat);

        const centerR = startR + 2.5;
        const centerC = startC + 2.5;
        const pos = this.gridToWorld(centerR, centerC, 0.04);
        yardMesh.position.copy(pos);
        yardMesh.receiveShadow = true;
        this.boardGroup.add(yardMesh);

        // Inner white/frosted nest plate
        const plateGeo = new THREE.CylinderGeometry(yardWidth * 0.36, yardWidth * 0.36, 0.04, 32);
        const plateMat = new THREE.MeshStandardMaterial({
            color: 0x0a0c10,
            roughness: 0.2,
            metalness: 0.5
        });
        const plateMesh = new THREE.Mesh(plateGeo, plateMat);
        plateMesh.position.set(pos.x, 0.085, pos.z);
        this.boardGroup.add(plateMesh);

        // Glowing outer border ring for Yard
        const ringGeo = new THREE.RingGeometry(yardWidth * 0.34, yardWidth * 0.37, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            side: THREE.DoubleSide
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.set(pos.x, 0.11, pos.z);
        this.boardGroup.add(ringMesh);

        // 4 Recessed token nest circles in yard
        slots.forEach(slot => {
            const slotPos = this.gridToWorld(slot[0], slot[1], 0.11);
            const slotGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.02, 16);
            const slotMat = new THREE.MeshStandardMaterial({
                color: colorHex,
                roughness: 0.2,
                metalness: 0.4
            });
            const slotMesh = new THREE.Mesh(slotGeo, slotMat);
            slotMesh.position.copy(slotPos);
            this.boardGroup.add(slotMesh);
        });
    }

    add3DStar(x, y, z) {
        // Embossed 5-pointed star token
        const shape = new THREE.Shape();
        const points = 5;
        const outerR = 0.12;
        const innerR = 0.055;

        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) shape.moveTo(px, py);
            else shape.lineTo(px, py);
        }
        shape.closePath();

        const extrudeSettings = {
            depth: 0.025,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 1,
            bevelSize: 0.01,
            bevelThickness: 0.01
        };

        const starGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const starMat = new THREE.MeshStandardMaterial({
            color: 0xfbbf24,
            metalness: 0.85,
            roughness: 0.2,
            emissive: 0xd97706,
            emissiveIntensity: 0.3
        });
        const starMesh = new THREE.Mesh(starGeo, starMat);
        starMesh.rotation.x = -Math.PI / 2;
        starMesh.position.set(x, y, z);
        this.boardGroup.add(starMesh);
    }

    buildCenterVictoryPlatform() {
        const centerWidth = 3 * this.tileSize;
        
        // 1. Center tiered pyramid base
        const pGeo = new THREE.CylinderGeometry(centerWidth * 0.48, centerWidth * 0.58, 0.14, 4);
        const pMat = new THREE.MeshStandardMaterial({
            color: 0x12151e,
            roughness: 0.2,
            metalness: 0.4
        });
        const pyramid = new THREE.Mesh(pGeo, pMat);
        pyramid.position.set(0, 0.08, 0);
        pyramid.rotation.y = Math.PI / 4;
        this.boardGroup.add(pyramid);

        // 2. Center Gold Victory Crown 👑
        const crownGroup = new THREE.Group();
        const crownMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            metalness: 0.9,
            roughness: 0.18,
            emissive: 0xd97706,
            emissiveIntensity: 0.35
        });

        // Crown circlet base
        const ringGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.06, 16);
        const ring = new THREE.Mesh(ringGeo, crownMat);
        ring.position.y = 0.18;
        crownGroup.add(ring);

        // Crown spikes
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            const spikeGeo = new THREE.ConeGeometry(0.04, 0.12, 4);
            const spike = new THREE.Mesh(spikeGeo, crownMat);
            spike.position.x = Math.cos(angle) * 0.16;
            spike.position.z = Math.sin(angle) * 0.16;
            spike.position.y = 0.25;
            crownGroup.add(spike);

            // Jewels on crown tips
            const jewelGeo = new THREE.SphereGeometry(0.02, 8, 8);
            const jewelMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
            const jewel = new THREE.Mesh(jewelGeo, jewelMat);
            jewel.position.set(spike.position.x, 0.32, spike.position.z);
            crownGroup.add(jewel);
        }

        crownGroup.position.y = 0.05;
        this.boardGroup.add(crownGroup);
    }
}

window.LudoBoard3D = LudoBoard3D;
