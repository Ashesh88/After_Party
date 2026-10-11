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
    // Matches the authentic matte maple/birch board from the uploaded reference photo (media_1791714094275.jpg)
    generateBoardTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');
        const size = 2048;
        const half = size / 2;

        // 1. Natural Authentic Light Brown Wood Plywood Surface (Warm honey/teak tones so white gotis pop with maximum contrast)
        const grad = ctx.createRadialGradient(half, half, 150, half, half, size * 0.72);
        grad.addColorStop(0, '#cda066'); // Warm light brown honey ply center
        grad.addColorStop(0.55, '#be8f53'); // Rich light brown teak tone
        grad.addColorStop(1, '#a8773d'); // Deep light brown outer wood border
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        // Natural fine wood grain fibers (soft diffuse matte texture)
        ctx.fillStyle = 'rgba(70, 38, 10, 0.05)';
        for (let i = 0; i < size; i += 5) {
            ctx.beginPath();
            ctx.ellipse(half + (Math.sin(i * 0.012) * 40), i, size * 0.88, 2.5 + Math.random() * 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Additional subtle vertical wood pores
        ctx.strokeStyle = 'rgba(60, 30, 8, 0.04)';
        ctx.lineWidth = 1.0;
        for (let x = 70; x < size - 70; x += 12) {
            if (Math.random() > 0.45) {
                ctx.beginPath();
                ctx.moveTo(x + (Math.random() - 0.5) * 5, 80);
                ctx.lineTo(x + (Math.random() - 0.5) * 8, size - 80);
                ctx.stroke();
            }
        }

        // 2. Outer Border Inset Line with rounded corners
        const inset = 95;
        ctx.strokeStyle = '#2b1408';
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

        // 3. Center Compass Star Rosette (Exact match to uploaded reference photo)
        // Outer concentric double rings
        ctx.strokeStyle = '#2b1408';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(half, half, 260, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#2b1408';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(half, half, 245, 0, Math.PI * 2);
        ctx.stroke();

        // 8-Pointed Star Points (Alternating Vibrant Red & Dark Wood, radiating outwards)
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            const nextAngle = ((i + 1) * Math.PI * 2) / 8;
            const midAngle = angle + (Math.PI / 8);

            const tipR = 240;
            const baseR = 105;
            const tipX = half + Math.cos(midAngle) * tipR;
            const tipY = half + Math.sin(midAngle) * tipR;

            const b1X = half + Math.cos(angle) * baseR;
            const b1Y = half + Math.sin(angle) * baseR;
            const b2X = half + Math.cos(nextAngle) * baseR;
            const b2Y = half + Math.sin(nextAngle) * baseR;

            // Half triangle 1 (Crimson Red)
            ctx.fillStyle = i % 2 === 0 ? '#bd1e28' : '#2b1408';
            ctx.beginPath();
            ctx.moveTo(half, half);
            ctx.lineTo(b1X, b1Y);
            ctx.lineTo(tipX, tipY);
            ctx.closePath();
            ctx.fill();

            // Half triangle 2 (Dark Wood or Crimson)
            ctx.fillStyle = i % 2 === 0 ? '#8e151c' : '#1e0d05';
            ctx.beginPath();
            ctx.moveTo(half, half);
            ctx.lineTo(tipX, tipY);
            ctx.lineTo(b2X, b2Y);
            ctx.closePath();
            ctx.fill();

            // Fine stroke outline
            ctx.strokeStyle = '#2b1408';
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }

        // Inner circle enclosing center pieces cluster
        ctx.strokeStyle = '#2b1408';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(half, half, 115, 0, Math.PI * 2);
        ctx.stroke();

        // Center Queen Spot
        ctx.fillStyle = '#bd1e28';
        ctx.beginPath();
        ctx.arc(half, half, 50, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#2b1408';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Fine gold inner circle
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(half, half, 38, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(half, half, 12, 0, Math.PI * 2);
        ctx.fill();

        // 4. Baseline Striker Placement Capsules with Large Red Circles
        const drawBaseline = (rotation) => {
            ctx.save();
            ctx.translate(half, half);
            ctx.rotate(rotation);

            const lineY = 630;
            const lineHalfW = 460;
            const circleR = 48;

            // Parallel baseline rails
            ctx.strokeStyle = '#2b1408';
            ctx.lineWidth = 5;

            ctx.beginPath();
            ctx.moveTo(-lineHalfW, lineY - 26);
            ctx.lineTo(lineHalfW, lineY - 26);
            ctx.stroke();

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

            // Large Solid Red End Circles (Matches reference photo)
            [-lineHalfW, lineHalfW].forEach(cx => {
                ctx.fillStyle = '#bd1e28'; // Rich vibrant carrom red
                ctx.beginPath();
                ctx.arc(cx, lineY, circleR, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#2b1408';
                ctx.lineWidth = 5;
                ctx.stroke();

                // Inner fine ring
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(cx, lineY, circleR - 10, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#2b1408';
                ctx.beginPath();
                ctx.arc(cx, lineY, 8, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.restore();
        };

        [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach(angle => drawBaseline(angle));

        // 5. Diagonal Pocket Direction Arrows with Guard Circles
        const drawArrow = (angle) => {
            ctx.save();
            ctx.translate(half, half);
            ctx.rotate(angle);

            ctx.strokeStyle = '#2b1408';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(340, 340);
            ctx.lineTo(740, 740);
            ctx.stroke();

            // Arrow head pointing to pocket
            ctx.fillStyle = '#2b1408';
            ctx.beginPath();
            ctx.moveTo(740, 740);
            ctx.lineTo(685, 736);
            ctx.lineTo(736, 685);
            ctx.closePath();
            ctx.fill();

            // Guard arc loop near arrow origin (matches reference photo)
            ctx.beginPath();
            ctx.arc(360, 360, 38, 0.2 * Math.PI, 1.8 * Math.PI);
            ctx.stroke();

            ctx.restore();
        };

        [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].forEach(angle => drawArrow(angle));

        // 6. Corner Pocket Hole Cutouts:
        const pxPerUnit = size / this.playWidth;
        const pocketPixelR = this.pocketRadius * pxPerUnit;

        this.pocketPositions.forEach(pos => {
            const cx = half + pos.x * pxPerUnit;
            const cy = half + pos.z * pxPerUnit;

            // Recessed dark pocket well
            ctx.fillStyle = '#060403';
            ctx.beginPath();
            ctx.arc(cx, cy, pocketPixelR, 0, Math.PI * 2);
            ctx.fill();

            // Polished brass inner collar ring (matches reference photo corner)
            ctx.strokeStyle = '#c89d42';
            ctx.lineWidth = 8;
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

        // MATTE satin wood finish: high roughness (0.85), ZERO metalness = NO SHINE / NO HARSH GLARE!
        const topMat = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.85,
            metalness: 0.0
        });

        const woodEdgeMat = new THREE.MeshStandardMaterial({
            color: 0xa8773d,
            roughness: 0.8,
            metalness: 0.0
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
