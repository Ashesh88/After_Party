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
        // Pockets located at 31.2 to sit naturally in the corner pocket bevel
        this.pocketPositions = [
            { x: -31.2, z: -31.2, id: 'top-left' },
            { x: 31.2, z: -31.2, id: 'top-right' },
            { x: -31.2, z: 31.2, id: 'bottom-left' },
            { x: 31.2, z: 31.2, id: 'bottom-right' }
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
    // Matches the authentic warm birch plywood finish from reference photo
    generateBoardTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');
        const size = 2048;
        const half = size / 2;

        // 1. Natural Birch Plywood Texture with warm honey tones (not plain white)
        const grad = ctx.createRadialGradient(half, half, 120, half, half, size * 0.72);
        grad.addColorStop(0, '#eac697'); // Warm honey birch center
        grad.addColorStop(0.55, '#dfb784'); // Medium birch tone
        grad.addColorStop(1, '#cd9e6b'); // Warm amber-golden edge
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        // Natural fine wood grain fibers
        ctx.fillStyle = 'rgba(120, 75, 30, 0.035)';
        for (let i = 0; i < size; i += 6) {
            ctx.beginPath();
            ctx.ellipse(half + (Math.sin(i * 0.015) * 45), i, size * 0.85, 3 + Math.random() * 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Additional vertical wood pores
        ctx.strokeStyle = 'rgba(100, 60, 20, 0.025)';
        ctx.lineWidth = 1.2;
        for (let x = 60; x < size - 60; x += 14) {
            if (Math.random() > 0.4) {
                ctx.beginPath();
                ctx.moveTo(x + (Math.random() - 0.5) * 6, 80);
                ctx.lineTo(x + (Math.random() - 0.5) * 10, size - 80);
                ctx.stroke();
            }
        }

        // 2. Outer Border Inset Frame Line with rounded corners
        const inset = 95;
        ctx.strokeStyle = '#422212';
        ctx.lineWidth = 6;
        ctx.beginPath();
        const rInset = 35;
        const x1 = inset, y1 = inset, x2 = size - inset, y2 = size - inset;
        ctx.moveTo(x1 + rInset, y1);
        ctx.lineTo(x2 - rInset, y1);
        ctx.quadraticCurveTo(x2, y1, x2, y1 + rInset);
        ctx.lineTo(x2, y2 - rInset);
        ctx.quadraticCurveTo(x2, y2, x2 - rInset, y2);
        ctx.lineTo(x1 + rInset, y2);
        ctx.quadraticCurveTo(x1, y2, x1, y2 - rInset);
        ctx.lineTo(x1, y1 + rInset);
        ctx.quadraticCurveTo(x1, y1, x1 + rInset, y1);
        ctx.stroke();

        // 3. Center Circles (Carrom Sunburst & Queen Spot)
        // Outer decorative circle
        ctx.strokeStyle = '#4e2715'; // Dark chocolate wood-stain
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(half, half, 195, 0, Math.PI * 2);
        ctx.stroke();

        // Inner decorative circle
        ctx.strokeStyle = 'rgba(78, 39, 21, 0.65)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(half, half, 185, 0, Math.PI * 2);
        ctx.stroke();

        // Authentic concentric inner ring
        ctx.strokeStyle = '#5a2e19';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(half, half, 115, 0, Math.PI * 2);
        ctx.stroke();

        // Center Queen Spot (Rich crimson wood stain with fine rings)
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(half, half, 58, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#422212';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Concentric Queen groove
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(half, half, 44, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(half, half, 14, 0, Math.PI * 2);
        ctx.fill();

        // 4. Baseline Striker Placement Capsules (Top, Bottom, Left, Right)
        const drawBaseline = (rotation) => {
            ctx.save();
            ctx.translate(half, half);
            ctx.rotate(rotation);

            const lineY = 630;
            const lineHalfW = 460;
            const circleR = 48;

            // Baseline rounded capsule outline (like real carrom board)
            ctx.strokeStyle = '#422212';
            ctx.lineWidth = 5;

            // Top rail of baseline
            ctx.beginPath();
            ctx.moveTo(-lineHalfW, lineY - 26);
            ctx.lineTo(lineHalfW, lineY - 26);
            ctx.stroke();

            // Bottom rail of baseline
            ctx.beginPath();
            ctx.moveTo(-lineHalfW, lineY + 26);
            ctx.lineTo(lineHalfW, lineY + 26);
            ctx.stroke();

            // Outer rounded end caps
            ctx.beginPath();
            ctx.arc(-lineHalfW, lineY, 26, Math.PI * 0.5, Math.PI * 1.5);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(lineHalfW, lineY, 26, -Math.PI * 0.5, Math.PI * 0.5);
            ctx.stroke();

            // Amber/Caramel target circles at both ends
            [-lineHalfW, lineHalfW].forEach(cx => {
                ctx.fillStyle = '#d97724'; // Rich amber wood tone
                ctx.beginPath();
                ctx.arc(cx, lineY, circleR, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#422212';
                ctx.lineWidth = 5;
                ctx.stroke();

                // Inner fine ring
                ctx.strokeStyle = '#fef08a';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(cx, lineY, circleR - 10, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#422212';
                ctx.beginPath();
                ctx.arc(cx, lineY, 8, 0, Math.PI * 2);
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

            ctx.strokeStyle = '#5a2e19';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(320, 320);
            ctx.lineTo(740, 740);
            ctx.stroke();

            // Arrow head pointing to pocket
            ctx.fillStyle = '#5a2e19';
            ctx.beginPath();
            ctx.moveTo(740, 740);
            ctx.lineTo(685, 736);
            ctx.lineTo(736, 685);
            ctx.closePath();
            ctx.fill();

            // Circular decorative guard at arrow base
            ctx.beginPath();
            ctx.arc(320, 320, 16, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].forEach(angle => drawArrow(angle));

        // 6. Corner Pocket Hole Cutouts:
        // EXACT mathematical alignment with 3D pocket positions to eliminate double-circle bug!
        // Scale = size / playWidth = 2048 / 70 = 29.25714 px/unit
        const pxPerUnit = size / this.playWidth;
        const pocketPixelR = this.pocketRadius * pxPerUnit; // ~105.3px

        this.pocketPositions.forEach(pos => {
            const cx = half + pos.x * pxPerUnit;
            const cy = half + pos.z * pxPerUnit;

            // Recessed dark pocket well background
            ctx.fillStyle = '#0a0604';
            ctx.beginPath();
            ctx.arc(cx, cy, pocketPixelR, 0, Math.PI * 2);
            ctx.fill();

            // Inner drop shadow
            const shadowGrad = ctx.createRadialGradient(cx, cy, pocketPixelR * 0.7, cx, cy, pocketPixelR);
            shadowGrad.addColorStop(0, 'rgba(10, 6, 4, 1.0)');
            shadowGrad.addColorStop(1, 'rgba(40, 20, 10, 0.9)');
            ctx.fillStyle = shadowGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, pocketPixelR, 0, Math.PI * 2);
            ctx.fill();

            // Clean dark wood bevel rim (perfectly flush)
            ctx.strokeStyle = '#2a140a';
            ctx.lineWidth = 6;
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
            roughness: 0.38,
            metalness: 0.05
        });

        const woodEdgeMat = new THREE.MeshStandardMaterial({
            color: 0xcd9e6b,
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
        const pocketGeo = new THREE.CylinderGeometry(this.pocketRadius, this.pocketRadius * 0.9, 2.5, 32);
        const pocketMat = new THREE.MeshStandardMaterial({
            color: 0x050302,
            roughness: 0.95,
            metalness: 0.05
        });

        // 4 Dark pocket net wells flush with board cutout (no double-circle artifact)
        this.pocketPositions.forEach(pos => {
            const pocketMesh = new THREE.Mesh(pocketGeo, pocketMat);
            pocketMesh.position.set(pos.x, -1.25, pos.z);
            this.boardGroup.add(pocketMesh);

            // Sleek dark pocket collar (matching dark sheesham wood bevel)
            const collarGeo = new THREE.RingGeometry(this.pocketRadius * 0.98, this.pocketRadius * 1.08, 32);
            const collarMat = new THREE.MeshStandardMaterial({
                color: 0x1b0e07,
                roughness: 0.6,
                metalness: 0.1,
                side: THREE.DoubleSide
            });
            const collar = new THREE.Mesh(collarGeo, collarMat);
            collar.rotation.x = Math.PI / 2;
            collar.position.set(pos.x, 0.02, pos.z);
            this.boardGroup.add(collar);
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
