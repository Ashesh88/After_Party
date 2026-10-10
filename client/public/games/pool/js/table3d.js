// Couples 3D Pool - Tournament Billiards Table
// 2:1 regulation proportions, beveled rubber cushions, 6 leather drop pockets, brass hardware

class PoolTable3D {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();

        // Standard Playing Field Dimensions
        this.playLength = 7.2; // X axis (-3.6 to +3.6)
        this.playWidth = 3.6;  // Z axis (-1.8 to +1.8)
        this.halfL = this.playLength / 2; // 3.6
        this.halfW = this.playWidth / 2;  // 1.8

        this.railWidth = 0.45;
        this.railHeight = 0.22;
        this.bedThickness = 0.18;
        this.pocketRadius = 0.25;

        // Pocket Centers [x, z, radius, id]
        this.pockets = [
            { x: -this.halfL + 0.08, z: -this.halfW + 0.08, r: 0.26, id: 'top-left' },
            { x: 0,                 z: -this.halfW - 0.02, r: 0.24, id: 'top-mid' },
            { x: this.halfL - 0.08,  z: -this.halfW + 0.08, r: 0.26, id: 'top-right' },
            { x: -this.halfL + 0.08, z: this.halfW - 0.08,  r: 0.26, id: 'bot-left' },
            { x: 0,                 z: this.halfW + 0.02,  r: 0.24, id: 'bot-mid' },
            { x: this.halfL - 0.08,  z: this.halfW - 0.08,  r: 0.26, id: 'bot-right' }
        ];

        this.buildTable();
        this.scene.add(this.group);
    }

    createFeltTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Eye-friendly Deep Tournament Emerald Felt (No harsh neon, zero glare)
        const FELT_GREEN = '#0d5c3a';
        ctx.fillStyle = FELT_GREEN;
        ctx.fillRect(0, 0, 2048, 1024);

        // Soft subtle cloth nap texture
        ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
        for (let i = 0; i < 400; i++) {
            const rx = Math.random() * 2048;
            const ry = Math.random() * 1024;
            const rw = Math.random() * 80 + 20;
            ctx.fillRect(rx, ry, rw, 1.5);
        }

        // Head String (Line behind which cue ball breaks): at X = 1/4 length = 512px
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(512, 60);
        ctx.lineTo(512, 1024 - 60);
        ctx.stroke();

        // Head Spot
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(512, 512, 6, 0, Math.PI * 2);
        ctx.fill();

        // Center Spot
        ctx.beginPath();
        ctx.arc(1024, 512, 5, 0, Math.PI * 2);
        ctx.fill();

        // Foot Spot (Rack Spot): at X = 3/4 length = 1536px
        ctx.beginPath();
        ctx.arc(1536, 512, 7, 0, Math.PI * 2);
        ctx.fill();

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 8;
        return texture;
    }

    buildTable() {
        // 1. Bed Felt Slate Surface
        const feltGeo = new THREE.BoxGeometry(this.playLength, this.bedThickness, this.playWidth);
        const feltMat = new THREE.MeshStandardMaterial({
            map: this.createFeltTexture(),
            roughness: 0.90, // Soft matte cloth finish, zero specular blowout
            metalness: 0.0
        });

        const bedMesh = new THREE.Mesh(feltGeo, feltMat);
        bedMesh.position.y = -this.bedThickness / 2;
        bedMesh.receiveShadow = true;
        this.group.add(bedMesh);

        // 2. Pocket Drop Recesses (Dark holes inside bed)
        const pocketHoleMat = new THREE.MeshStandardMaterial({
            color: 0x05070a,
            roughness: 0.8,
            metalness: 0.1
        });

        this.pockets.forEach(p => {
            const holeGeo = new THREE.CylinderGeometry(p.r, p.r * 0.85, 0.25, 24);
            const hole = new THREE.Mesh(holeGeo, pocketHoleMat);
            hole.position.set(p.x, -0.1, p.z);
            this.group.add(hole);

            // Brass Pocket Rim Ring
            const rimGeo = new THREE.TorusGeometry(p.r, 0.02, 12, 24);
            const rimMat = new THREE.MeshStandardMaterial({
                color: 0xd4af37,
                roughness: 0.25,
                metalness: 0.85
            });
            const rim = new THREE.Mesh(rimGeo, rimMat);
            rim.rotation.x = Math.PI / 2;
            rim.position.set(p.x, 0.01, p.z);
            this.group.add(rim);
        });

        // 3. Wood Rails & Cushions
        this.buildRailsAndCushions();

        // 4. Outer Walnut Frame & Apron
        this.buildOuterCabinet();

        // 5. Heavy Sculpted Table Legs
        this.buildTableLegs();
    }

    buildRailsAndCushions() {
        const woodMat = new THREE.MeshStandardMaterial({
            color: 0x1a0f0a, // Rich dark polished mahogany
            roughness: 0.25,
            metalness: 0.15
        });

        const cushionMat = new THREE.MeshStandardMaterial({
            color: 0x0a462b, // Dark rubber cushion felt
            roughness: 0.85,
            metalness: 0.0
        });

        const brassMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            roughness: 0.2,
            metalness: 0.88
        });

        const hL = this.halfL;
        const hW = this.halfW;
        const cThick = 0.08;
        const cHeight = 0.14;

        // Long Rails (Top & Bottom, each split into 2 halves by the center pocket)
        const longRailLength = hL - 0.42; // ~3.18
        const longRailGeo = new THREE.BoxGeometry(longRailLength, this.railHeight, this.railWidth);

        // Rail 1: Top-Left
        const rTL = new THREE.Mesh(longRailGeo, woodMat);
        rTL.position.set(-hL / 2, this.railHeight / 2 - 0.02, -hW - this.railWidth / 2);
        this.group.add(rTL);

        // Rail 2: Top-Right
        const rTR = new THREE.Mesh(longRailGeo, woodMat);
        rTR.position.set(hL / 2, this.railHeight / 2 - 0.02, -hW - this.railWidth / 2);
        this.group.add(rTR);

        // Rail 3: Bottom-Left
        const rBL = new THREE.Mesh(longRailGeo, woodMat);
        rBL.position.set(-hL / 2, this.railHeight / 2 - 0.02, hW + this.railWidth / 2);
        this.group.add(rBL);

        // Rail 4: Bottom-Right
        const rBR = new THREE.Mesh(longRailGeo, woodMat);
        rBR.position.set(hL / 2, this.railHeight / 2 - 0.02, hW + this.railWidth / 2);
        this.group.add(rBR);

        // Short Rails (Head / Left & Foot / Right)
        const shortRailLength = this.playWidth - 0.42; // ~3.18
        const shortRailGeo = new THREE.BoxGeometry(this.railWidth, this.railHeight, shortRailLength);

        // Rail 5: Head (Left)
        const rHead = new THREE.Mesh(shortRailGeo, woodMat);
        rHead.position.set(-hL - this.railWidth / 2, this.railHeight / 2 - 0.02, 0);
        this.group.add(rHead);

        // Rail 6: Foot (Right)
        const rFoot = new THREE.Mesh(shortRailGeo, woodMat);
        rFoot.position.set(hL + this.railWidth / 2, this.railHeight / 2 - 0.02, 0);
        this.group.add(rFoot);

        // 6 Rubber Cushions Facing Playing Field
        const cLongGeo = new THREE.BoxGeometry(longRailLength, cHeight, cThick);
        const cShortGeo = new THREE.BoxGeometry(cThick, cHeight, shortRailLength);

        // Cushions
        const c1 = new THREE.Mesh(cLongGeo, cushionMat);
        c1.position.set(-hL / 2, cHeight / 2, -hW - cThick / 2);
        this.group.add(c1);

        const c2 = new THREE.Mesh(cLongGeo, cushionMat);
        c2.position.set(hL / 2, cHeight / 2, -hW - cThick / 2);
        this.group.add(c2);

        const c3 = new THREE.Mesh(cLongGeo, cushionMat);
        c3.position.set(-hL / 2, cHeight / 2, hW + cThick / 2);
        this.group.add(c3);

        const c4 = new THREE.Mesh(cLongGeo, cushionMat);
        c4.position.set(hL / 2, cHeight / 2, hW + cThick / 2);
        this.group.add(c4);

        const cHead = new THREE.Mesh(cShortGeo, cushionMat);
        cHead.position.set(-hL - cThick / 2, cHeight / 2, 0);
        this.group.add(cHead);

        const cFoot = new THREE.Mesh(cShortGeo, cushionMat);
        cFoot.position.set(hL + cThick / 2, cHeight / 2, 0);
        this.group.add(cFoot);

        // 4 Corner Brass Caps
        const cornerCapGeo = new THREE.BoxGeometry(this.railWidth + 0.04, this.railHeight + 0.02, this.railWidth + 0.04);
        [
            [-hL - this.railWidth / 2, -hW - this.railWidth / 2],
            [hL + this.railWidth / 2, -hW - this.railWidth / 2],
            [-hL - this.railWidth / 2, hW + this.railWidth / 2],
            [hL + this.railWidth / 2, hW + this.railWidth / 2]
        ].forEach(([cx, cz]) => {
            const cap = new THREE.Mesh(cornerCapGeo, brassMat);
            cap.position.set(cx, this.railHeight / 2 - 0.01, cz);
            this.group.add(cap);
        });

        // 2 Side Brass Pocket Plates
        const midCapGeo = new THREE.BoxGeometry(0.38, this.railHeight + 0.02, this.railWidth + 0.02);
        [
            [0, -hW - this.railWidth / 2],
            [0, hW + this.railWidth / 2]
        ].forEach(([mx, mz]) => {
            const cap = new THREE.Mesh(midCapGeo, brassMat);
            cap.position.set(mx, this.railHeight / 2 - 0.01, mz);
            this.group.add(cap);
        });

        // Diamond Sights (Inlay pearl dots along rails for aiming)
        const sightGeo = new THREE.SphereGeometry(0.02, 12, 12);
        const sightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });

        // Add 3 sights per section
        [-2.4, -1.8, -1.2, 1.2, 1.8, 2.4].forEach(x => {
            const sTop = new THREE.Mesh(sightGeo, sightMat);
            sTop.position.set(x, this.railHeight - 0.01, -hW - this.railWidth * 0.6);
            this.group.add(sTop);

            const sBot = new THREE.Mesh(sightGeo, sightMat);
            sBot.position.set(x, this.railHeight - 0.01, hW + this.railWidth * 0.6);
            this.group.add(sBot);
        });
    }

    buildOuterCabinet() {
        const apronMat = new THREE.MeshStandardMaterial({
            color: 0x120a06, // Deep dark walnut
            roughness: 0.35,
            metalness: 0.1
        });

        const totalL = this.playLength + this.railWidth * 2;
        const totalW = this.playWidth + this.railWidth * 2;
        const apronGeo = new THREE.BoxGeometry(totalL, 0.45, totalW);
        const apron = new THREE.Mesh(apronGeo, apronMat);
        apron.position.y = -0.32;
        apron.castShadow = true;
        this.group.add(apron);

        // Gold Trim Line around bottom of table apron
        const goldTrimGeo = new THREE.BoxGeometry(totalL + 0.04, 0.03, totalW + 0.04);
        const goldTrimMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            roughness: 0.15,
            metalness: 0.85
        });
        const trim = new THREE.Mesh(goldTrimGeo, goldTrimMat);
        trim.position.y = -0.52;
        this.group.add(trim);
    }

    buildTableLegs() {
        const legMat = new THREE.MeshStandardMaterial({
            color: 0x100805,
            roughness: 0.3,
            metalness: 0.15
        });

        const goldRingMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            roughness: 0.2,
            metalness: 0.85
        });

        const legH = 1.35;
        const legR = 0.22;

        const legPositions = [
            [-this.halfL + 0.4, -this.halfW + 0.3],
            [this.halfL - 0.4, -this.halfW + 0.3],
            [-this.halfL + 0.4, this.halfW - 0.3],
            [this.halfL - 0.4, this.halfW - 0.3]
        ];

        legPositions.forEach(([lx, lz]) => {
            const legGroup = new THREE.Group();
            legGroup.position.set(lx, -0.55 - legH / 2, lz);

            // Fluted cylinder leg
            const legGeo = new THREE.CylinderGeometry(legR * 0.85, legR, legH, 20);
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.castShadow = true;
            legGroup.add(leg);

            // Gold Ring collar
            const collarGeo = new THREE.CylinderGeometry(legR + 0.03, legR + 0.03, 0.06, 20);
            const collar = new THREE.Mesh(collarGeo, goldRingMat);
            collar.position.y = -legH / 2 + 0.06;
            legGroup.add(collar);

            this.group.add(legGroup);
        });
    }
}
