// 3D Chess Board Builder - Natural Wood/Marble with Matte Glare-Free Shading

class ChessBoard3D {
    constructor(scene) {
        this.scene = scene;
        this.squareSize = 1.0;
        this.boardWidth = 8 * this.squareSize;
        this.squares = {}; // Map 'e4' -> { mesh, x, z, col, row }
        this.highlights = [];
        this.checkHighlight = null;
        this.selectedHighlight = null;

        this.initTextures();
        this.createBoard();
        this.createCoordinateLabels();
    }

    initTextures() {
        // Natural Light Maple / Warm Ivory Canvas Texture
        const cWhite = document.createElement('canvas');
        cWhite.width = 512;
        cWhite.height = 512;
        const ctxW = cWhite.getContext('2d');
        ctxW.fillStyle = '#efe5d5';
        ctxW.fillRect(0, 0, 512, 512);
        // Subtle wood grain
        ctxW.strokeStyle = 'rgba(215, 200, 180, 0.4)';
        ctxW.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
            ctxW.beginPath();
            ctxW.moveTo(0, i * 64 + Math.random() * 20);
            ctxW.lineTo(512, i * 64 + Math.random() * 20);
            ctxW.stroke();
        }
        this.whiteTex = new THREE.CanvasTexture(cWhite);

        // Pure Deep Black Canvas Texture for Dark Cubes (Zero Grey)
        const cBlack = document.createElement('canvas');
        cBlack.width = 512;
        cBlack.height = 512;
        const ctxB = cBlack.getContext('2d');
        ctxB.fillStyle = '#14161a';
        ctxB.fillRect(0, 0, 512, 512);
        ctxB.strokeStyle = 'rgba(40, 45, 55, 0.4)';
        ctxB.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
            ctxB.beginPath();
            ctxB.moveTo(0, i * 64 + Math.random() * 20);
            ctxB.lineTo(512, i * 64 + Math.random() * 20);
            ctxB.stroke();
        }
        this.blackTex = new THREE.CanvasTexture(cBlack);

        // Zero metalness, high roughness = No harsh white glare / hotspot reflections!
        this.whiteSquareMat = new THREE.MeshStandardMaterial({
            map: this.whiteTex,
            roughness: 0.58,
            metalness: 0.0
        });

        this.blackSquareMat = new THREE.MeshStandardMaterial({
            map: this.blackTex,
            roughness: 0.50,
            metalness: 0.05
        });

        // Pure Obsidian Black Frame Border (Zero Brown)
        this.borderMat = new THREE.MeshStandardMaterial({
            color: 0x0c0e12,
            roughness: 0.38,
            metalness: 0.1
        });

        // Sleek Dark Gunmetal Trim Inlay (Zero Brown)
        this.trimMat = new THREE.MeshStandardMaterial({
            color: 0x1a1e24,
            roughness: 0.28,
            metalness: 0.35
        });

        // Soft Green Move Target Marker
        this.validMoveMat = new THREE.MeshBasicMaterial({
            color: 0x10b981,
            transparent: true,
            opacity: 0.65
        });

        // Selected Tile Marker
        this.selectedMat = new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            transparent: true,
            opacity: 0.60
        });

        // Check Alert Marker
        this.checkMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            transparent: true,
            opacity: 0.70
        });
    }

    createBoard() {
        this.boardGroup = new THREE.Group();

        // 1. Board Frame / Pedestal
        const baseGeo = new THREE.BoxGeometry(9.6, 0.35, 9.6);
        const baseMesh = new THREE.Mesh(baseGeo, this.borderMat);
        baseMesh.position.y = -0.18;
        baseMesh.receiveShadow = true;
        this.boardGroup.add(baseMesh);

        // 2. Beveled Inner Border Trim
        const trimOuter = new THREE.BoxGeometry(8.24, 0.02, 8.24);
        const trimMesh = new THREE.Mesh(trimOuter, this.trimMat);
        trimMesh.position.y = 0.005;
        this.boardGroup.add(trimMesh);

        // 3. 64 Checkered Square Tiles
        const sqGeo = new THREE.BoxGeometry(this.squareSize, 0.06, this.squareSize);

        for (let r = 0; r < 8; r++) { // rows 0..7 => rank 8..1
            for (let c = 0; c < 8; c++) { // cols 0..7 => files a..h
                const isLight = (r + c) % 2 === 0;
                const mat = isLight ? this.whiteSquareMat : this.blackSquareMat;
                const sqMesh = new THREE.Mesh(sqGeo, mat);

                const x = (c - 3.5) * this.squareSize;
                const z = (r - 3.5) * this.squareSize;
                sqMesh.position.set(x, 0.03, z);
                sqMesh.receiveShadow = true;

                const file = String.fromCharCode('a'.charCodeAt(0) + c);
                const rank = 8 - r;
                const squareName = `${file}${rank}`;

                sqMesh.userData = {
                    isSquare: true,
                    square: squareName,
                    col: c,
                    row: r
                };

                this.boardGroup.add(sqMesh);
                this.squares[squareName] = {
                    mesh: sqMesh,
                    x: x,
                    z: z,
                    col: c,
                    row: r
                };
            }
        }

        this.scene.add(this.boardGroup);
    }

    createCoordinateLabels() {
        const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

        files.forEach((f, i) => {
            const x = (i - 3.5) * this.squareSize;
            this.addTextSprite(f, x, 0.05, 4.35);
            this.addTextSprite(f, x, 0.05, -4.35);
        });

        ranks.forEach((rn, i) => {
            const z = (3.5 - i) * this.squareSize;
            this.addTextSprite(rn, -4.35, 0.05, z);
            this.addTextSprite(rn, 4.35, 0.05, z);
        });
    }

    addTextSprite(text, x, y, z) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '600 64px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 64, 64);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85 });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(0.40, 0.40, 1);
        sprite.position.set(x, y, z);
        this.boardGroup.add(sprite);
    }

    getSquarePos(squareName) {
        if (!this.squares[squareName]) return null;
        return {
            x: this.squares[squareName].x,
            y: 0.06,
            z: this.squares[squareName].z
        };
    }

    clearHighlights() {
        this.highlights.forEach(h => this.scene.remove(h));
        this.highlights = [];

        if (this.selectedHighlight) {
            this.scene.remove(this.selectedHighlight);
            this.selectedHighlight = null;
        }
    }

    highlightSelected(squareName) {
        if (this.selectedHighlight) {
            this.scene.remove(this.selectedHighlight);
            this.selectedHighlight = null;
        }

        const pos = this.getSquarePos(squareName);
        if (!pos) return;

        const geo = new THREE.RingGeometry(0.32, 0.46, 32);
        geo.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geo, this.selectedMat);
        mesh.position.set(pos.x, pos.y + 0.015, pos.z);
        this.scene.add(mesh);
        this.selectedHighlight = mesh;
    }

    highlightMoves(moves) {
        moves.forEach(sq => {
            const pos = this.getSquarePos(sq);
            if (!pos) return;

            const geo = new THREE.CylinderGeometry(0.24, 0.24, 0.02, 28);
            const mesh = new THREE.Mesh(geo, this.validMoveMat);
            mesh.position.set(pos.x, pos.y + 0.02, pos.z);
            mesh.userData = { isMoveTarget: true, targetSquare: sq };
            this.scene.add(mesh);
            this.highlights.push(mesh);
        });
    }

    setCheckHighlight(kingSquare) {
        if (this.checkHighlight) {
            this.scene.remove(this.checkHighlight);
            this.checkHighlight = null;
        }

        if (!kingSquare) return;

        const pos = this.getSquarePos(kingSquare);
        if (!pos) return;

        const geo = new THREE.RingGeometry(0.20, 0.48, 32);
        geo.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geo, this.checkMat);
        mesh.position.set(pos.x, pos.y + 0.025, pos.z);
        this.scene.add(mesh);
        this.checkHighlight = mesh;
    }
}

window.ChessBoard3D = ChessBoard3D;
