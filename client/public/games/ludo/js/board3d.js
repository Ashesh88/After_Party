// Authentic Classic Ludo Board 3D
// Exact replica of the iconic Ludo board with Red, Green, Yellow, Blue quadrants,
// white rounded yard bases with 4 circular pawn sockets, stars, and center triangles.

class LudoBoard3D {
    constructor(scene) {
        this.scene = scene;
        this.boardSize = 7.5; // World units
        this.tileSize = this.boardSize / 15; // 0.5 per tile
        this.boardGroup = new THREE.Group();

        this.initTrackMapping();
        this.buildBoard();
        this.scene.add(this.boardGroup);
    }

    initTrackMapping() {
        // Standard 52 perimeter steps clockwise starting from Red Start (13, 6)
        this.trackCoords = [
            [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
            [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
            [7, 0],
            [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
            [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
            [0, 7],
            [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
            [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
            [7, 14],
            [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
            [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
            [14, 7], [14, 6]
        ];

        // Safe track indices: 4 Starts + 4 Stars
        this.safeIndices = [0, 8, 13, 21, 26, 34, 39, 47];

        // Home Columns (5 steps to center)
        this.homeColumns = {
            red: [ [13, 7], [12, 7], [11, 7], [10, 7], [9, 7] ],
            green: [ [7, 1], [7, 2], [7, 3], [7, 4], [7, 5] ],
            yellow: [ [1, 7], [2, 7], [3, 7], [4, 7], [5, 7] ],
            blue: [ [7, 13], [7, 12], [7, 11], [7, 10], [7, 9] ]
        };

        // Yard Pawn Nest Slots (row, col floating)
        this.yardSlots = {
            green: [ [1.8, 1.8], [1.8, 4.2], [4.2, 1.8], [4.2, 4.2] ],
            yellow: [ [1.8, 10.8], [1.8, 13.2], [4.2, 10.8], [4.2, 13.2] ],
            red: [ [10.8, 1.8], [10.8, 4.2], [13.2, 1.8], [13.2, 4.2] ],
            blue: [ [10.8, 10.8], [10.8, 13.2], [13.2, 10.8], [13.2, 13.2] ]
        };
    }

    gridToWorld(r, c, y = 0.08) {
        const x = (c - 7) * this.tileSize;
        const z = (r - 7) * this.tileSize;
        return new THREE.Vector3(x, y, z);
    }

    createBoardTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');
        const W = 2048 / 15; // Width per cell = ~136.53px

        // Darker, rich, eye-friendly tones (comfortably dark, zero eye strain)
        const GREEN = '#15803d';  // Deep Forest Green
        const YELLOW = '#b45309'; // Deep Amber Gold / Warm Mustard
        const RED = '#b91c1c';    // Deep Crimson Red
        const BLUE = '#1d4ed8';   // Deep Royal Blue
        const WHITE = '#cbd5e1';  // Soft matte slate cream (no blinding white glare)
        const BLACK = '#0f172a';

        // 1. Fill entire background with soft matte base
        ctx.fillStyle = WHITE;
        ctx.fillRect(0, 0, 2048, 2048);

        // 2. Draw 4 Solid Colored Yard Quadrants (6x6 cells each)
        // Green (Top-Left: 0..6, 0..6)
        ctx.fillStyle = GREEN;
        ctx.fillRect(0, 0, 6 * W, 6 * W);

        // Yellow (Top-Right: 9..15, 0..6)
        ctx.fillStyle = YELLOW;
        ctx.fillRect(9 * W, 0, 6 * W, 6 * W);

        // Red (Bottom-Left: 0..6, 9..15)
        ctx.fillStyle = RED;
        ctx.fillRect(0, 9 * W, 6 * W, 6 * W);

        // Blue (Bottom-Right: 9..15, 9..15)
        ctx.fillStyle = BLUE;
        ctx.fillRect(9 * W, 9 * W, 6 * W, 6 * W);

        // 3. Draw Large Soft Rounded Boxes inside the 4 Yards with 4 Colored Circles
        const drawYardBase = (startX, startY, color) => {
            const pad = 36;
            const size = 6 * W - pad * 2;
            const radius = 54;
            const x = startX + pad;
            const y = startY + pad;

            // Soft matte rounded box
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.roundRect(x, y, size, size, radius);
            ctx.fill();

            // 4 Circles for Pawns
            const cR = 48; // circle radius
            const cx1 = x + size * 0.28;
            const cx2 = x + size * 0.72;
            const cy1 = y + size * 0.28;
            const cy2 = y + size * 0.72;

            ctx.fillStyle = color;
            [ [cx1, cy1], [cx2, cy1], [cx1, cy2], [cx2, cy2] ].forEach(([cx, cy]) => {
                ctx.beginPath();
                ctx.arc(cx, cy, cR, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        drawYardBase(0, 0, GREEN); // Green Yard
        drawYardBase(9 * W, 0, YELLOW); // Yellow Yard
        drawYardBase(0, 9 * W, RED); // Red Yard
        drawYardBase(9 * W, 9 * W, BLUE); // Blue Yard

        // 4. Center 3x3 Triangles (meeting at center: 7.5*W, 7.5*W)
        const cX = 7.5 * W;
        const cY = 7.5 * W;

        // Top triangle (Yellow)
        ctx.fillStyle = YELLOW;
        ctx.beginPath();
        ctx.moveTo(6 * W, 6 * W);
        ctx.lineTo(9 * W, 6 * W);
        ctx.lineTo(cX, cY);
        ctx.closePath();
        ctx.fill();

        // Left triangle (Green)
        ctx.fillStyle = GREEN;
        ctx.beginPath();
        ctx.moveTo(6 * W, 6 * W);
        ctx.lineTo(6 * W, 9 * W);
        ctx.lineTo(cX, cY);
        ctx.closePath();
        ctx.fill();

        // Bottom triangle (Red)
        ctx.fillStyle = RED;
        ctx.beginPath();
        ctx.moveTo(6 * W, 9 * W);
        ctx.lineTo(9 * W, 9 * W);
        ctx.lineTo(cX, cY);
        ctx.closePath();
        ctx.fill();

        // Right triangle (Blue)
        ctx.fillStyle = BLUE;
        ctx.beginPath();
        ctx.moveTo(9 * W, 6 * W);
        ctx.lineTo(9 * W, 9 * W);
        ctx.lineTo(cX, cY);
        ctx.closePath();
        ctx.fill();

        // 5. Draw Colored Home Tracks
        // Green Home Track: row 7, cols 1..5
        ctx.fillStyle = GREEN;
        for (let c = 1; c <= 5; c++) {
            ctx.fillRect(c * W, 7 * W, W, W);
        }
        // Green Start: row 6, col 1
        ctx.fillRect(1 * W, 6 * W, W, W);

        // Yellow Home Track: col 7, rows 1..5
        ctx.fillStyle = YELLOW;
        for (let r = 1; r <= 5; r++) {
            ctx.fillRect(7 * W, r * W, W, W);
        }
        // Yellow Start: col 8, row 1
        ctx.fillRect(8 * W, 1 * W, W, W);

        // Blue Home Track: row 7, cols 9..13
        ctx.fillStyle = BLUE;
        for (let c = 9; c <= 13; c++) {
            ctx.fillRect(c * W, 7 * W, W, W);
        }
        // Blue Start: row 8, col 13
        ctx.fillRect(13 * W, 8 * W, W, W);

        // Red Home Track: col 7, rows 9..13
        ctx.fillStyle = RED;
        for (let r = 9; r <= 13; r++) {
            ctx.fillRect(7 * W, r * W, W, W);
        }
        // Red Start: col 6, row 13
        ctx.fillRect(6 * W, 13 * W, W, W);

        // 6. Draw Grid Lines on Tracks
        ctx.strokeStyle = BLACK;
        ctx.lineWidth = 4;

        // Top arm lines
        for (let r = 0; r <= 6; r++) {
            for (let c = 6; c <= 8; c++) {
                ctx.strokeRect(c * W, r * W, W, W);
            }
        }
        // Bottom arm lines
        for (let r = 9; r <= 15; r++) {
            for (let c = 6; c <= 8; c++) {
                ctx.strokeRect(c * W, r * W, W, W);
            }
        }
        // Left arm lines
        for (let r = 6; r <= 8; r++) {
            for (let c = 0; c <= 6; c++) {
                ctx.strokeRect(c * W, r * W, W, W);
            }
        }
        // Right arm lines
        for (let r = 6; r <= 8; r++) {
            for (let c = 9; c <= 15; c++) {
                ctx.strokeRect(c * W, r * W, W, W);
            }
        }

        // Center Triangle diagonal borders
        ctx.beginPath();
        ctx.moveTo(6 * W, 6 * W); ctx.lineTo(9 * W, 9 * W);
        ctx.moveTo(9 * W, 6 * W); ctx.lineTo(6 * W, 9 * W);
        ctx.stroke();

        // 7. Draw the 4 Outlined Stars ⭐ exactly as in image
        const drawStar = (gridR, gridC) => {
            const cx = gridC * W + W / 2;
            const cy = gridR * W + W / 2;
            const outerR = W * 0.38;
            const innerR = W * 0.17;
            const points = 5;

            ctx.save();
            ctx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const r = i % 2 === 0 ? outerR : innerR;
                const angle = (i * Math.PI) / points - Math.PI / 2;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = WHITE;
            ctx.fill();
            ctx.strokeStyle = BLACK;
            ctx.lineWidth = 4.5;
            ctx.stroke();
            ctx.restore();
        };

        drawStar(8, 2);  // Left arm star
        drawStar(2, 6);  // Top arm star
        drawStar(6, 12); // Right arm star
        drawStar(12, 8); // Bottom arm star

        // 8. Draw Entry Arrows (v, >, ^, <) exactly as in image
        const drawArrow = (gridR, gridC, color, direction) => {
            const cx = gridC * W + W / 2;
            const cy = gridR * W + W / 2;
            const sz = W * 0.28;

            ctx.save();
            ctx.translate(cx, cy);
            if (direction === 'down') ctx.rotate(Math.PI);
            if (direction === 'right') ctx.rotate(Math.PI / 2);
            if (direction === 'left') ctx.rotate(-Math.PI / 2);

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, -sz * 1.1);
            ctx.lineTo(sz, sz * 0.8);
            ctx.lineTo(0, sz * 0.2);
            ctx.lineTo(-sz, sz * 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        };

        drawArrow(0, 7, YELLOW, 'down');  // Yellow top arrow
        drawArrow(7, 0, GREEN, 'right');   // Green left arrow
        drawArrow(7, 14, BLUE, 'left');    // Blue right arrow
        drawArrow(14, 7, RED, 'up');       // Red bottom arrow

        // Outer Board Perimeter Border
        ctx.strokeStyle = BLACK;
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, 2040, 2040);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 8;
        return texture;
    }

    buildBoard() {
        // 1. Beveled Board Mesh with Canvas Texture
        const boardGeo = new THREE.BoxGeometry(this.boardSize, 0.22, this.boardSize);
        const topTexture = this.createBoardTexture();

        const woodMat = new THREE.MeshStandardMaterial({
            color: 0x111319,
            roughness: 0.3,
            metalness: 0.2
        });

        const topMat = new THREE.MeshStandardMaterial({
            map: topTexture,
            roughness: 0.92, // Soft matte finish - completely eliminates blinding white glare
            metalness: 0.0
        });

        // Box materials: +X, -X, +Y (top), -Y, +Z, -Z
        const materials = [woodMat, woodMat, topMat, woodMat, woodMat, woodMat];

        const boardMesh = new THREE.Mesh(boardGeo, materials);
        boardMesh.position.y = 0;
        boardMesh.receiveShadow = true;
        this.boardGroup.add(boardMesh);

        // 2. Beveled Outer Slate Pedestal Border
        const pedestalGeo = new THREE.BoxGeometry(this.boardSize + 0.5, 0.3, this.boardSize + 0.5);
        const pedestalMat = new THREE.MeshStandardMaterial({
            color: 0x08090d,
            roughness: 0.35,
            metalness: 0.3
        });
        const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
        pedestalMesh.position.y = -0.15;
        pedestalMesh.receiveShadow = true;
        this.boardGroup.add(pedestalMesh);

        // 3. Gold Trim Ring around the Pedestal
        const trimGeo = new THREE.BoxGeometry(this.boardSize + 0.55, 0.04, this.boardSize + 0.55);
        const trimMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            roughness: 0.15,
            metalness: 0.85
        });
        const trimMesh = new THREE.Mesh(trimGeo, trimMat);
        trimMesh.position.y = -0.01;
        this.boardGroup.add(trimMesh);

        // 4. Center 3D Golden Crown on the Center Meeting Point 👑
        this.buildCenterCrown();
    }

    buildCenterCrown() {
        const crownGroup = new THREE.Group();
        const crownMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            metalness: 0.9,
            roughness: 0.15,
            emissive: 0xd97706,
            emissiveIntensity: 0.25
        });

        // Circlet base
        const ringGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.06, 20);
        const ring = new THREE.Mesh(ringGeo, crownMat);
        ring.position.y = 0.14;
        crownGroup.add(ring);

        // 4 crown spikes in the 4 directions
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI * 2) / 4 + Math.PI / 4;
            const spikeGeo = new THREE.ConeGeometry(0.045, 0.14, 4);
            const spike = new THREE.Mesh(spikeGeo, crownMat);
            spike.position.x = Math.cos(angle) * 0.16;
            spike.position.z = Math.sin(angle) * 0.16;
            spike.position.y = 0.22;
            crownGroup.add(spike);
        }

        crownGroup.position.set(0, 0, 0);
        this.boardGroup.add(crownGroup);
    }
}

window.LudoBoard3D = LudoBoard3D;
