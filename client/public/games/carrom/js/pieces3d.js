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
    createPieceTexture(baseColor, accentColor, type) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const half = 256;

        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 512, 512);

        // Concentric carved grooves
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(half, half, 210, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(half, half, 150, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(half, half, 80, 0, Math.PI * 2);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(half, half, 26, 0, Math.PI * 2);
        ctx.fill();

        return new THREE.CanvasTexture(canvas);
    }

    createQueenTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const half = 256;

        ctx.fillStyle = '#b91c1c'; // Royal Crimson Red
        ctx.fillRect(0, 0, 512, 512);

        // Gold royal rings
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.arc(half, half, 215, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(half, half, 140, 0, Math.PI * 2);
        ctx.stroke();

        // 8-Pointed Star of the Queen
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
            const r = i % 2 === 0 ? 80 : 38;
            const a = (i * Math.PI) / 8;
            const x = half + Math.cos(a) * r;
            const y = half + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        return new THREE.CanvasTexture(canvas);
    }

    createStrikerTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const half = 256;

        // Ivory Acrylic with Iridescent Emerald Jewel Core
        const grad = ctx.createRadialGradient(half, half, 30, half, half, 256);
        grad.addColorStop(0, '#10b981'); // Emerald Glow
        grad.addColorStop(0.35, '#064e3b');
        grad.addColorStop(0.7, '#f8fafc'); // Glossy White Rim
        grad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        // Striker outer rings & crosshair ticks
        ctx.strokeStyle = '#047857';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(half, half, 230, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#f59e0b'; // Gold border
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(half, half, 180, 0, Math.PI * 2);
        ctx.stroke();

        // Center crosshair & crystal star
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(half, half, 32, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 6;
        for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI) / 2;
            ctx.beginPath();
            ctx.moveTo(half + Math.cos(a) * 40, half + Math.sin(a) * 40);
            ctx.lineTo(half + Math.cos(a) * 160, half + Math.sin(a) * 160);
            ctx.stroke();
        }

        return new THREE.CanvasTexture(canvas);
    }

    // Spawn 1 piece in 3D scene
    createPieceMesh(type, id) {
        const radius = type === 'striker' ? this.strikerRadius : this.pieceRadius;
        const height = type === 'striker' ? this.strikerHeight : this.pieceHeight;

        const geo = new THREE.CylinderGeometry(radius, radius, height, 32);

        let sideColor = 0xf5eedb;
        let roughness = 0.25;
        let metalness = 0.1;

        if (type === 'black') {
            sideColor = 0x1f1914;
            roughness = 0.35;
        } else if (type === 'queen') {
            sideColor = 0x991b1b;
            roughness = 0.2;
            metalness = 0.2;
        } else if (type === 'striker') {
            sideColor = 0x059669;
            roughness = 0.15;
            metalness = 0.35;
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
