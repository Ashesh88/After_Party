// Couples Royal 3D Carrom - High Fidelity 3D Board Builder
// Premium English Birch Plywood Surface, Sheesham Frame, Net Pockets & Procedural Canvas Texture

class CarromBoard3D {
    constructor(scene) {
        this.scene = scene;
        this.boardGroup = new THREE.Group();

        // Dimensions in 3D units
        this.playWidth = 70; // -35 to +35
        this.playHeight = 70;
        this.frameThickness = 4.5;
        this.frameHeight = 2.4;
        this.pocketRadius = 3.6;
        this.pocketPositions = [
            { x: -31.5, z: -31.5, id: 'top-left' },
            { x: 31.5, z: -31.5, id: 'top-right' },
            { x: -31.5, z: 31.5, id: 'bottom-left' },
            { x: 31.5, z: 31.5, id: 'bottom-right' }
        ];

        this.init();
    }

    init() {
        this.createPlayingSurface();
        this.createWoodenFrame();
        this.createCornerPockets();
        this.createCornerBrackets();
        this.scene.add(this.boardGroup);
    }

    // Generate high resolution 2048x2048 procedural canvas texture for the carrom board face
    generateBoardTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');
        const size = 2048;
        const half = size / 2;

        // 1. Natural Wood Ply Background with Grain
        const grad = ctx.createRadialGradient(half, half, 100, half, half, size * 0.7);
        grad.addColorStop(0, '#f9edd7');
        grad.addColorStop(0.6, '#f3dfc1');
        grad.addColorStop(1, '#e6caa2');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        // Faint organic wood grain streaks
        ctx.fillStyle = 'rgba(160, 110, 60, 0.04)';
        for (let i = 0; i < size; i += 8) {
            ctx.beginPath();
            ctx.ellipse(half + (Math.sin(i * 0.02) * 50), i, size * 0.8, 4 + Math.random() * 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Outer Border Inset Frame Line
        const inset = 75;
        ctx.strokeStyle = '#1e140d';
        ctx.lineWidth = 6;
        ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2);

        // 3. Center Circles (Carrom Sunburst & Queen Spot)
        // Outer decorative ring
        ctx.strokeStyle = '#991b1b'; // Crimson Red
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(half, half, 185, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#1e140d';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(half, half, 195, 0, Math.PI * 2);
        ctx.stroke();

        // Decorative 12 petals mandala
        ctx.strokeStyle = 'rgba(153, 27, 27, 0.4)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI * 2) / 12;
            const px = half + Math.cos(angle) * 110;
            const py = half + Math.sin(angle) * 110;
            ctx.beginPath();
            ctx.arc(px, py, 75, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Inner solid Queen Spot
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(half, half, 60, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#facc15'; // Gold accent ring
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(half, half, 15, 0, Math.PI * 2);
        ctx.fill();

        // 4. Baseline Striker Placement Zones (Top, Bottom, Left, Right)
        const drawBaseline = (rotation) => {
            ctx.save();
            ctx.translate(half, half);
            ctx.rotate(rotation);

            const lineY = 640;
            const lineHalfW = 460;
            const circleR = 48;

            // Double line for baseline
            ctx.strokeStyle = '#1e140d';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(-lineHalfW, lineY - 26);
            ctx.lineTo(lineHalfW, lineY - 26);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(-lineHalfW, lineY + 26);
            ctx.lineTo(lineHalfW, lineY + 26);
            ctx.stroke();

            // Red circles at both ends of baseline
            [-lineHalfW, lineHalfW].forEach(cx => {
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.arc(cx, lineY, circleR, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#1e140d';
                ctx.lineWidth = 5;
                ctx.stroke();

                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.arc(cx, lineY, 14, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.restore();
        };

        [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach(angle => drawBaseline(angle));

        // 5. Diagonal Pocket Direction Arrows
        const drawArrow = (angle) => {
            ctx.save();
            ctx.translate(half, half);
            ctx.rotate(angle);

            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(340, 340);
            ctx.lineTo(760, 760);
            ctx.stroke();

            // Arrow head pointing to pocket
            ctx.fillStyle = '#991b1b';
            ctx.beginPath();
            ctx.moveTo(760, 760);
            ctx.lineTo(700, 755);
            ctx.lineTo(755, 700);
            ctx.closePath();
            ctx.fill();

            // Circular decorative guard at arrow base
            ctx.beginPath();
            ctx.arc(340, 340, 18, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].forEach(angle => drawArrow(angle));

        // 6. Corner Pocket Hole cutouts indicator (dark rings)
        const pocketOffset = 875;
        ctx.fillStyle = '#0f0804';
        [
            [-pocketOffset, -pocketOffset],
            [pocketOffset, -pocketOffset],
            [-pocketOffset, pocketOffset],
            [pocketOffset, pocketOffset]
        ].forEach(([px, py]) => {
            ctx.beginPath();
            ctx.arc(half + px, half + py, 88, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#382013';
            ctx.lineWidth = 10;
            ctx.stroke();
        });

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 16;
        texture.needsUpdate = true;
        return texture;
    }

    createPlayingSurface() {
        const boardGeo = new THREE.BoxGeometry(this.playWidth, 1.2, this.playHeight);
        const texture = this.generateBoardTexture();

        const topMat = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.28,
            metalness: 0.08
        });

        const woodEdgeMat = new THREE.MeshStandardMaterial({
            color: 0xd4b58e,
            roughness: 0.5
        });

        const materials = [
            woodEdgeMat, woodEdgeMat,
            topMat, woodEdgeMat,
            woodEdgeMat, woodEdgeMat
        ];

        this.surfaceMesh = new THREE.Mesh(boardGeo, materials);
        this.surfaceMesh.position.y = -0.6;
        this.surfaceMesh.receiveShadow = true;
        this.boardGroup.add(this.surfaceMesh);
    }

    createWoodenFrame() {
        // High luxury dark Sheesham / Rosewood border rails
        const frameColor = 0x241108;
        const frameMat = new THREE.MeshStandardMaterial({
            color: frameColor,
            roughness: 0.35,
            metalness: 0.15
        });

        const totalWidth = this.playWidth + this.frameThickness * 2;
        const totalHeight = this.playHeight + this.frameThickness * 2;
        const h = this.frameHeight;
        const t = this.frameThickness;

        // North & South rails
        const railTopGeo = new THREE.BoxGeometry(totalWidth, h, t);
        const railTop = new THREE.Mesh(railTopGeo, frameMat);
        railTop.position.set(0, h / 2 - 0.6, -(this.playHeight / 2 + t / 2));
        railTop.castShadow = true;
        railTop.receiveShadow = true;
        this.boardGroup.add(railTop);

        const railBottom = new THREE.Mesh(railTopGeo, frameMat);
        railBottom.position.set(0, h / 2 - 0.6, (this.playHeight / 2 + t / 2));
        railBottom.castShadow = true;
        railBottom.receiveShadow = true;
        this.boardGroup.add(railBottom);

        // East & West rails
        const railSideGeo = new THREE.BoxGeometry(t, h, this.playHeight);
        const railLeft = new THREE.Mesh(railSideGeo, frameMat);
        railLeft.position.set(-(this.playWidth / 2 + t / 2), h / 2 - 0.6, 0);
        railLeft.castShadow = true;
        railLeft.receiveShadow = true;
        this.boardGroup.add(railLeft);

        const railRight = new THREE.Mesh(railSideGeo, frameMat);
        railRight.position.set((this.playWidth / 2 + t / 2), h / 2 - 0.6, 0);
        railRight.castShadow = true;
        railRight.receiveShadow = true;
        this.boardGroup.add(railRight);

        // Dark base underneath
        const baseGeo = new THREE.BoxGeometry(totalWidth + 1, 1.0, totalHeight + 1);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x140a04, roughness: 0.7 });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = -1.5;
        this.boardGroup.add(baseMesh);
    }

    createCornerPockets() {
        const pocketGeo = new THREE.CylinderGeometry(this.pocketRadius, this.pocketRadius * 0.85, 2.5, 32);
        const pocketMat = new THREE.MeshStandardMaterial({
            color: 0x050302,
            roughness: 0.9,
            metalness: 0.1
        });

        // 4 Dark pocket net wells
        this.pocketPositions.forEach(pos => {
            const pocketMesh = new THREE.Mesh(pocketGeo, pocketMat);
            pocketMesh.position.set(pos.x, -1.2, pos.z);
            this.boardGroup.add(pocketMesh);

            // Metallic brass rim around each pocket
            const rimGeo = new THREE.TorusGeometry(this.pocketRadius, 0.35, 16, 32);
            const rimMat = new THREE.MeshStandardMaterial({
                color: 0xc89d42,
                metalness: 0.85,
                roughness: 0.25
            });
            const rim = new THREE.Mesh(rimGeo, rimMat);
            rim.rotation.x = Math.PI / 2;
            rim.position.set(pos.x, 0.05, pos.z);
            this.boardGroup.add(rim);
        });
    }

    createCornerBrackets() {
        // Brass decorative reinforcement corner braces on wooden edges
        const bracketGeo = new THREE.BoxGeometry(this.frameThickness + 1.2, 0.6, this.frameThickness + 1.2);
        const bracketMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.8,
            roughness: 0.2
        });

        const halfTotal = this.playWidth / 2 + this.frameThickness / 2;
        [
            [-halfTotal, -halfTotal],
            [halfTotal, -halfTotal],
            [-halfTotal, halfTotal],
            [halfTotal, halfTotal]
        ].forEach(([cx, cz]) => {
            const bracket = new THREE.Mesh(bracketGeo, bracketMat);
            bracket.position.set(cx, this.frameHeight - 0.7, cz);
            this.boardGroup.add(bracket);
        });
    }
}

window.CarromBoard3D = CarromBoard3D;
