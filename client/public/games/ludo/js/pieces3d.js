// Couples Ludo 3D - Sculpted Luxury Pawn Tokens
// High-gloss lacquer finish, heart emblems, and selection aura

class LudoPieceFactory {
    constructor() {
        this.cache = {};
    }

    createTokenMesh(colorHex, playerId, tokenIndex) {
        const group = new THREE.Group();

        // High gloss lacquer luxury material
        const mat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.18,
            metalness: 0.35,
            emissive: colorHex,
            emissiveIntensity: 0.18
        });

        const goldRingMat = new THREE.MeshStandardMaterial({
            color: 0xfbbf24,
            metalness: 0.85,
            roughness: 0.2
        });

        // 1. Base pedestal disc
        const baseGeo = new THREE.CylinderGeometry(0.15, 0.17, 0.08, 24);
        const base = new THREE.Mesh(baseGeo, mat);
        base.position.y = 0.04;
        base.castShadow = true;
        group.add(base);

        // 2. Gold trim collar ring
        const ringGeo = new THREE.TorusGeometry(0.14, 0.02, 12, 24);
        const ring = new THREE.Mesh(ringGeo, goldRingMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.08;
        group.add(ring);

        // 3. Elegant swept waist
        const waistGeo = new THREE.CylinderGeometry(0.09, 0.13, 0.18, 24);
        const waist = new THREE.Mesh(waistGeo, mat);
        waist.position.y = 0.17;
        waist.castShadow = true;
        group.add(waist);

        // 4. Upper collar
        const neckGeo = new THREE.CylinderGeometry(0.11, 0.08, 0.05, 20);
        const neck = new THREE.Mesh(neckGeo, goldRingMat);
        neck.position.y = 0.27;
        group.add(neck);

        // 5. Spherical crown head
        const headGeo = new THREE.SphereGeometry(0.11, 24, 24);
        const head = new THREE.Mesh(headGeo, mat);
        head.position.y = 0.36;
        head.castShadow = true;
        group.add(head);

        // 6. Cute decorative heart gem on top 💕
        const gemGeo = new THREE.SphereGeometry(0.035, 12, 12);
        const gemMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const gem = new THREE.Mesh(gemGeo, gemMat);
        gem.position.y = 0.48;
        group.add(gem);

        // 7. Interactive selection aura ring (hidden by default)
        const auraGeo = new THREE.RingGeometry(0.20, 0.26, 32);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0x10b981,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        aura.rotation.x = -Math.PI / 2;
        aura.position.y = 0.01;
        aura.visible = false;
        group.add(aura);

        // Store reference & metadata
        group.userData = {
            playerId: playerId,
            tokenIndex: tokenIndex,
            aura: aura,
            isLudoToken: true
        };

        return group;
    }
}

window.LudoPieceFactory = LudoPieceFactory;
