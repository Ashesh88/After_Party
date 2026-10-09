// High-Definition Staunton 3D Chess Pieces
// Pure Jet Black (Zero Brown) & Crisp Warm Ivory Alabaster with Sharp Sculpted Contours

class ChessPieceFactory {
    constructor() {
        this.initMaterials();
    }

    initMaterials() {
        // Crisp Warm Ivory Alabaster for White
        this.whiteMaterial = new THREE.MeshStandardMaterial({
            color: 0xede6d8,
            roughness: 0.35,
            metalness: 0.02
        });

        // Pure Jet Black (Complete Black, zero brownish tint) with satin edge sheen
        this.blackMaterial = new THREE.MeshStandardMaterial({
            color: 0x101216,
            roughness: 0.28,
            metalness: 0.12
        });
    }

    createPieceMesh(type, color) {
        const mat = color === 'w' ? this.whiteMaterial : this.blackMaterial;
        const group = new THREE.Group();

        let pieceObj;
        switch (type.toLowerCase()) {
            case 'p':
                pieceObj = this.createPawn(mat);
                break;
            case 'r':
                pieceObj = this.createRook(mat);
                break;
            case 'n':
                pieceObj = this.createKnight(mat, color);
                break;
            case 'b':
                pieceObj = this.createBishop(mat);
                break;
            case 'q':
                pieceObj = this.createQueen(mat);
                break;
            case 'k':
                pieceObj = this.createKing(mat);
                break;
            default:
                pieceObj = this.createPawn(mat);
        }

        group.add(pieceObj);

        // Defined Stepped Base Rings
        const baseRing1 = new THREE.Mesh(
            new THREE.TorusGeometry(0.35, 0.025, 16, 40),
            mat
        );
        baseRing1.rotateX(Math.PI / 2);
        baseRing1.position.y = 0.04;
        group.add(baseRing1);

        const baseRing2 = new THREE.Mesh(
            new THREE.TorusGeometry(0.31, 0.018, 16, 40),
            mat
        );
        baseRing2.rotateX(Math.PI / 2);
        baseRing2.position.y = 0.08;
        group.add(baseRing2);

        // Shadows
        group.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        return group;
    }

    createLathePiece(points, material, segments = 40) {
        const geometry = new THREE.LatheGeometry(points, segments);
        return new THREE.Mesh(geometry, material);
    }

    createPawn(mat) {
        // High Definition Curvature for Pawn
        const pts = [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.36, 0),
            new THREE.Vector2(0.36, 0.07),
            new THREE.Vector2(0.31, 0.12),
            new THREE.Vector2(0.24, 0.16),
            new THREE.Vector2(0.20, 0.22),
            new THREE.Vector2(0.16, 0.38),
            new THREE.Vector2(0.13, 0.54),
            new THREE.Vector2(0.21, 0.62),
            new THREE.Vector2(0.21, 0.66),
            new THREE.Vector2(0.17, 0.68),
            new THREE.Vector2(0.10, 0.72)
        ];
        const body = this.createLathePiece(pts, mat);

        // Crisp Head Sphere
        const headGeo = new THREE.SphereGeometry(0.175, 32, 32);
        const head = new THREE.Mesh(headGeo, mat);
        head.position.y = 0.88;

        const group = new THREE.Group();
        group.add(body);
        group.add(head);
        return group;
    }

    createRook(mat) {
        // High Definition Castle Tower Profile
        const pts = [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.38, 0),
            new THREE.Vector2(0.38, 0.08),
            new THREE.Vector2(0.33, 0.14),
            new THREE.Vector2(0.26, 0.20),
            new THREE.Vector2(0.23, 0.28),
            new THREE.Vector2(0.22, 0.65),
            new THREE.Vector2(0.27, 0.82),
            new THREE.Vector2(0.33, 0.90),
            new THREE.Vector2(0.34, 1.10),
            new THREE.Vector2(0.25, 1.10),
            new THREE.Vector2(0.25, 0.96)
        ];
        const body = this.createLathePiece(pts, mat);
        const group = new THREE.Group();
        group.add(body);

        // 4 Sharp Castle Crenellations (Parapets)
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const bGeo = new THREE.BoxGeometry(0.13, 0.16, 0.13);
            const bMesh = new THREE.Mesh(bGeo, mat);
            bMesh.position.x = Math.cos(angle) * 0.28;
            bMesh.position.z = Math.sin(angle) * 0.28;
            bMesh.position.y = 1.15;
            group.add(bMesh);
        }

        return group;
    }

    createKnight(mat, color) {
        // High Definition Sculpted Staunton Horse Knight
        const pts = [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.38, 0),
            new THREE.Vector2(0.38, 0.08),
            new THREE.Vector2(0.33, 0.14),
            new THREE.Vector2(0.27, 0.20),
            new THREE.Vector2(0.23, 0.32),
            new THREE.Vector2(0, 0.32)
        ];
        const base = this.createLathePiece(pts, mat);

        const headGroup = new THREE.Group();

        // Strong Muscular Arched Neck
        const neckGeo = new THREE.CylinderGeometry(0.17, 0.26, 0.60, 24);
        neckGeo.rotateZ(0.28);
        neckGeo.scale(1, 1, 0.68);
        const neck = new THREE.Mesh(neckGeo, mat);
        neck.position.set(0.04, 0.58, 0);
        headGroup.add(neck);

        // Defined Horse Snout & Jaw
        const snoutGeo = new THREE.ConeGeometry(0.19, 0.48, 24);
        snoutGeo.rotateZ(-Math.PI / 2.35);
        snoutGeo.scale(0.85, 1, 0.65);
        const snout = new THREE.Mesh(snoutGeo, mat);
        snout.position.set(0.24, 0.78, 0);
        headGroup.add(snout);

        // Jawbone Contour
        const jawGeo = new THREE.SphereGeometry(0.14, 16, 16);
        jawGeo.scale(1.2, 0.9, 0.65);
        const jaw = new THREE.Mesh(jawGeo, mat);
        jaw.position.set(0.12, 0.70, 0);
        headGroup.add(jaw);

        // Defined Crest Mane along back of neck
        const maneGeo = new THREE.BoxGeometry(0.08, 0.54, 0.13);
        maneGeo.rotateZ(0.32);
        const mane = new THREE.Mesh(maneGeo, mat);
        mane.position.set(-0.11, 0.68, 0);
        headGroup.add(mane);

        // Alert Pricked Ears
        const earGeo = new THREE.ConeGeometry(0.055, 0.18, 14);
        const ear1 = new THREE.Mesh(earGeo, mat);
        ear1.position.set(0.02, 1.00, 0.08);
        ear1.rotation.set(0.12, 0, -0.22);
        const ear2 = new THREE.Mesh(earGeo, mat);
        ear2.position.set(0.02, 1.00, -0.08);
        ear2.rotation.set(-0.12, 0, -0.22);
        headGroup.add(ear1, ear2);

        // Point knight toward opponent
        headGroup.rotation.y = color === 'w' ? -Math.PI / 2 : Math.PI / 2;

        const group = new THREE.Group();
        group.add(base);
        group.add(headGroup);
        return group;
    }

    createBishop(mat) {
        // High Definition Staunton Bishop with Slender Waist & Mitre Head
        const pts = [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.38, 0),
            new THREE.Vector2(0.38, 0.08),
            new THREE.Vector2(0.33, 0.14),
            new THREE.Vector2(0.26, 0.20),
            new THREE.Vector2(0.20, 0.32),
            new THREE.Vector2(0.16, 0.55),
            new THREE.Vector2(0.23, 0.74),
            new THREE.Vector2(0.23, 0.78),
            new THREE.Vector2(0.19, 0.82),
            new THREE.Vector2(0.11, 0.86)
        ];
        const body = this.createLathePiece(pts, mat);

        // Tapered Mitre Head (Smooth, clean Staunton profile)
        const mitreGeo = new THREE.SphereGeometry(0.20, 28, 28);
        mitreGeo.scale(0.85, 1.48, 0.85);
        const mitre = new THREE.Mesh(mitreGeo, mat);
        mitre.position.y = 1.08;

        // Top Ball Finial
        const ballGeo = new THREE.SphereGeometry(0.065, 20, 20);
        const ball = new THREE.Mesh(ballGeo, mat);
        ball.position.y = 1.38;

        const group = new THREE.Group();
        group.add(body);
        group.add(mitre);
        group.add(ball);
        return group;
    }

    createQueen(mat) {
        // High Definition Staunton Queen with Scalloped Crown
        const pts = [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.42, 0),
            new THREE.Vector2(0.42, 0.09),
            new THREE.Vector2(0.35, 0.16),
            new THREE.Vector2(0.28, 0.22),
            new THREE.Vector2(0.22, 0.35),
            new THREE.Vector2(0.18, 0.68),
            new THREE.Vector2(0.27, 0.95),
            new THREE.Vector2(0.27, 1.00),
            new THREE.Vector2(0.22, 1.05),
            new THREE.Vector2(0.15, 1.08)
        ];
        const body = this.createLathePiece(pts, mat);

        // Flared Coronet Rim
        const crownPts = [
            new THREE.Vector2(0.15, 1.08),
            new THREE.Vector2(0.31, 1.30),
            new THREE.Vector2(0.27, 1.32),
            new THREE.Vector2(0.18, 1.25),
            new THREE.Vector2(0, 1.20)
        ];
        const crown = this.createLathePiece(crownPts, mat);

        // Small spherical crenels on coronet rim
        const crownTips = new THREE.Group();
        const petals = 8;
        for (let i = 0; i < petals; i++) {
            const angle = (i / petals) * Math.PI * 2;
            const pGeo = new THREE.SphereGeometry(0.035, 14, 14);
            const pMesh = new THREE.Mesh(pGeo, mat);
            pMesh.position.set(Math.cos(angle) * 0.29, 1.32, Math.sin(angle) * 0.29);
            crownTips.add(pMesh);
        }

        // Center Ball
        const centerPearlGeo = new THREE.SphereGeometry(0.08, 20, 20);
        const centerPearl = new THREE.Mesh(centerPearlGeo, mat);
        centerPearl.position.y = 1.32;

        const group = new THREE.Group();
        group.add(body);
        group.add(crown);
        group.add(crownTips);
        group.add(centerPearl);
        return group;
    }

    createKing(mat) {
        // High Definition Staunton King with Sculpted Maltese Cross
        const pts = [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.44, 0),
            new THREE.Vector2(0.44, 0.09),
            new THREE.Vector2(0.37, 0.16),
            new THREE.Vector2(0.29, 0.24),
            new THREE.Vector2(0.24, 0.38),
            new THREE.Vector2(0.20, 0.76),
            new THREE.Vector2(0.30, 1.10),
            new THREE.Vector2(0.30, 1.15),
            new THREE.Vector2(0.25, 1.20),
            new THREE.Vector2(0.16, 1.24)
        ];
        const body = this.createLathePiece(pts, mat);

        // Regal Crown Arch
        const crownGeo = new THREE.SphereGeometry(0.26, 28, 28);
        crownGeo.scale(1, 0.82, 1);
        const crown = new THREE.Mesh(crownGeo, mat);
        crown.position.y = 1.38;

        // Sharply Defined Maltese Cross Finial
        const crossGroup = new THREE.Group();
        const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.26, 0.065), mat);
        const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.065, 0.065), mat);
        vBar.position.y = 1.66;
        hBar.position.y = 1.70;
        crossGroup.add(vBar, hBar);

        const group = new THREE.Group();
        group.add(body);
        group.add(crown);
        group.add(crossGroup);
        return group;
    }
}

window.ChessPieceFactory = ChessPieceFactory;
