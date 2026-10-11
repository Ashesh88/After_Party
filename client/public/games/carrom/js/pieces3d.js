// Couples Royal 3D Carrom - High Precision 3D Carrom Pieces & Striker
// Procedural Engraved Wood/Acrylic Textures, Cylinder Geometry & Physical Properties

class CarromPieces3D {
    constructor(scene) {
        this.scene = scene;
        this.pieces = []; // Array of physical piece objects
        this.striker = null;

        this.pieceRadius = 1.45;
        this.pieceHeight = 0.55;
        this.strikerRadius = 1.95;
        this.strikerHeight = 0.70;

        this.init();
    }

    init() {
        this.textures = {
            white: this.createPieceTexture('#faf6ee', '#8c7653', 'white'),
            black: this.createPieceTexture('#201c18', '#63513d', 'black'),
            queen: this.createQueenTexture(),
            striker: this.createStrikerTexture()
        };
    }

    // Canvas procedural textures for piece caps
    createPieceTexture(baseColor, grooveColor, type) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const half = 256;

        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 512, 512);

        // Smooth subtle gradient to give dished 3D curvature
        const grad = ctx.createRadialGradient(half, half, 40, half, half, 250);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.0)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        // Outer concentric carved rim groove
        ctx.strokeStyle = grooveColor;
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(half, half, 205, 0, Math.PI * 2);
        ctx.stroke();

        // Second inner carved groove
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(half, half, 140, 0, Math.PI * 2);
        ctx.stroke();

        // Center shallow dimple
        ctx.fillStyle = grooveColor;
        ctx.beginPath();
        ctx.arc(half, half, 38, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(half, half, 22, 0, Math.PI * 2);
        ctx.fill();

        return new THREE.CanvasTexture(canvas);
    }

    createQueenTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const half = 256;

        // Rich Carrom Crimson Red
        ctx.fillStyle = '#ba1e28';
        ctx.fillRect(0, 0, 512, 512);

        const grad = ctx.createRadialGradient(half, half, 40, half, half, 250);
        grad.addColorStop(0, 'rgba(255, 200, 200, 0.25)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        // Gold carved outer ring
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(half, half, 205, 0, Math.PI * 2);
        ctx.stroke();

        // Inner fine gold ring
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(half, half, 140, 0, Math.PI * 2);
        ctx.stroke();

        // Center gold crest
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(half, half, 44, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ba1e28';
        ctx.beginPath();
        ctx.arc(half, half, 26, 0, Math.PI * 2);
        ctx.fill();

        return new THREE.CanvasTexture(canvas);
    }

    createStrikerTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const half = 256;

        // Ivory white acrylic surface (matches reference photo)
        ctx.fillStyle = '#fcfbf8';
        ctx.fillRect(0, 0, 512, 512);

        const grad = ctx.createRadialGradient(half, half, 50, half, half, 256);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.85, '#f4efe6');
        grad.addColorStop(1, '#dfd5c4');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        // Outer amber/golden rim
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(half, half, 225, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(half, half, 195, 0, Math.PI * 2);
        ctx.stroke();

        // Authentic Endless Knot / Mandala crest in the center (from reference photo)
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 9;
        ctx.lineJoin = 'round';

        // 4 Interlocking rounded loops
        const loopR = 52;
        const offset = 48;
        [
            [-offset, -offset],
            [offset, -offset],
            [-offset, offset],
            [offset, offset]
        ].forEach(([lx, ly]) => {
            ctx.beginPath();
            ctx.arc(half + lx, half + ly, loopR, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Center medallion dot
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(half, half, 22, 0, Math.PI * 2);
        ctx.fill();

        return new THREE.CanvasTexture(canvas);
    }

    // Spawn 1 piece in 3D scene
    createPieceMesh(type, id) {
        const radius = type === 'striker' ? this.strikerRadius : this.pieceRadius;
        const height = type === 'striker' ? this.strikerHeight : this.pieceHeight;

        const geo = new THREE.CylinderGeometry(radius, radius, height, 32);

        let sideColor = 0xf2ede0;
        let roughness = 0.32;
        let metalness = 0.05;

        if (type === 'black') {
            sideColor = 0x1b1612;
            roughness = 0.4;
        } else if (type === 'queen') {
            sideColor = 0x9e1a22;
            roughness = 0.28;
            metalness = 0.1;
        } else if (type === 'striker') {
            sideColor = 0xf0ebe1;
            roughness = 0.2;
            metalness = 0.12;
        }

        const sideMat = new THREE.MeshStandardMaterial({
            color: sideColor,
            roughness: roughness,
            metalness: metalness
        });

        const topMat = new THREE.MeshStandardMaterial({
            map: this.textures[type],
            roughness: roughness,
            metalness: metalness
        });

        const bottomMat = new THREE.MeshStandardMaterial({
            color: sideColor,
            roughness: 0.6
        });

        const materials = [sideMat, topMat, bottomMat];
        const mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return mesh;
    }

    // Set up standard 19-piece circular carrom cluster at board center
    setupInitialRack() {
        // Clear existing pieces
        this.pieces.forEach(p => {
            if (p.mesh) this.scene.remove(p.mesh);
        });
        this.pieces = [];

        if (this.striker && this.striker.mesh) {
            this.scene.remove(this.striker.mesh);
            this.striker = null;
        }

        const r = this.pieceRadius;
        const d = r * 2.02; // Distance between adjacent piece centers

        // 1. Queen at Center (0, 0)
        this.addPiece(0, 0, 'queen', 'queen-1');

        // 2. Inner Ring of 6 pieces around Queen (alternating White & Black)
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const px = Math.cos(angle) * d;
            const pz = Math.sin(angle) * d;
            const type = i % 2 === 0 ? 'white' : 'black';
            this.addPiece(px, pz, type, `inner-${type}-${i}`);
        }

        // 3. Outer Ring of 12 pieces (symmetrically packed hexagonal cluster)
        // 6 corner pieces at distance d * 2
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const px = Math.cos(angle) * (d * 2);
            const pz = Math.sin(angle) * (d * 2);
            const type = i % 2 === 0 ? 'white' : 'black';
            this.addPiece(px, pz, type, `outer-corner-${type}-${i}`);
        }

        // 6 edge midpoints between corners at distance d * sqrt(3)
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6 + (Math.PI / 6);
            const dist = d * Math.sqrt(3);
            const px = Math.cos(angle) * dist;
            const pz = Math.sin(angle) * dist;
            const type = i % 2 === 0 ? 'black' : 'white';
            this.addPiece(px, pz, type, `outer-edge-${type}-${i}`);
        }

        // 4. Create Striker on P1 Baseline (z = 26.0)
        this.createStriker(0, 26.0);
    }

    addPiece(x, z, type, id) {
        const mesh = this.createPieceMesh(type, id);
        mesh.position.set(x, this.pieceHeight / 2, z);
        this.scene.add(mesh);

        const piece = {
            id,
            type,
            mesh,
            x,
            z,
            vx: 0,
            vz: 0,
            radius: this.pieceRadius,
            mass: 1.0,
            isPocketed: false,
            isFalling: false,
            fallProgress: 0,
            points: type === 'white' ? 10 : (type === 'black' ? 5 : 30)
        };

        this.pieces.push(piece);
        return piece;
    }

    createStriker(x, z) {
        const mesh = this.createPieceMesh('striker', 'striker-main');
        mesh.position.set(x, this.strikerHeight / 2, z);
        this.scene.add(mesh);

        this.striker = {
            id: 'striker',
            type: 'striker',
            mesh,
            x,
            z,
            vx: 0,
            vz: 0,
            radius: this.strikerRadius,
            mass: 3.2, // Heavier than standard goti
            isPocketed: false,
            isFalling: false,
            fallProgress: 0
        };

        return this.striker;
    }

    resetStriker(baselineZ = 26.0, posX = 0) {
        if (!this.striker) return;
        this.striker.x = posX;
        this.striker.z = baselineZ;
        this.striker.vx = 0;
        this.striker.vz = 0;
        this.striker.isPocketed = false;
        this.striker.isFalling = false;
        this.striker.fallProgress = 0;

        this.striker.mesh.position.set(posX, this.strikerHeight / 2, baselineZ);
        this.striker.mesh.scale.set(1, 1, 1);
        this.striker.mesh.visible = true;
    }
}

window.CarromPieces3D = CarromPieces3D;
