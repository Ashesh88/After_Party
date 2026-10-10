// Couples 3D Pool - Precision 3D Cue Stick & Laser Aiming Guide
// Tapered maple cue, pull-back power animation, ghost ball trajectory predictor

class PoolCue3D {
    constructor(scene) {
        this.scene = scene;
        this.cueGroup = new THREE.Group();
        this.angle = 0; // Radians
        this.power = 0.5; // 0.1 to 1.0
        this.visible = true;
        this.isStriking = false;

        this.buildCueMesh();
        this.buildAimingGuide();
        this.scene.add(this.cueGroup);
    }

    buildCueMesh() {
        this.stickGroup = new THREE.Group();

        // 1. Tapered Wooden Shaft (Length = 3.6)
        const shaftGeo = new THREE.CylinderGeometry(0.022, 0.045, 3.6, 20);
        const shaftMat = new THREE.MeshStandardMaterial({
            color: 0xe2ba8a, // Natural Canadian Maple
            roughness: 0.35,
            metalness: 0.05
        });
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.rotation.x = Math.PI / 2;
        shaft.position.z = 1.8; // Extends backward
        this.stickGroup.add(shaft);

        // 2. Leather Grip Butt Wrap (Length = 1.0)
        const gripGeo = new THREE.CylinderGeometry(0.046, 0.049, 1.0, 20);
        const gripMat = new THREE.MeshStandardMaterial({
            color: 0x181a20, // Black embossed leather wrap
            roughness: 0.7,
            metalness: 0.1
        });
        const grip = new THREE.Mesh(gripGeo, gripMat);
        grip.rotation.x = Math.PI / 2;
        grip.position.z = 3.1;
        this.stickGroup.add(grip);

        // 3. Brass Ferrule
        const ferruleGeo = new THREE.CylinderGeometry(0.023, 0.023, 0.04, 16);
        const ferruleMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.85,
            roughness: 0.2
        });
        const ferrule = new THREE.Mesh(ferruleGeo, ferruleMat);
        ferrule.rotation.x = Math.PI / 2;
        ferrule.position.z = 0.02;
        this.stickGroup.add(ferrule);

        // 4. Blue Chalk Tip
        const tipGeo = new THREE.CylinderGeometry(0.021, 0.021, 0.015, 16);
        const tipMat = new THREE.MeshStandardMaterial({
            color: 0x2563eb,
            roughness: 0.95
        });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.rotation.x = Math.PI / 2;
        tip.position.z = -0.005;
        this.stickGroup.add(tip);

        // Slight elevation tilt so stick rests naturally over table rail
        this.stickGroup.rotation.x = 0.06;

        this.cueGroup.add(this.stickGroup);
    }

    buildAimingGuide() {
        // Laser Aiming Guide Line
        const lineGeo = new THREE.BufferGeometry();
        const positions = new Float32Array([0, 0, 0, 0, 0, -4.5]);
        lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const lineMat = new THREE.LineDashedMaterial({
            color: 0x38bdf8,
            dashSize: 0.12,
            gapSize: 0.08,
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });

        this.aimLine = new THREE.Line(lineGeo, lineMat);
        this.aimLine.computeLineDistances();
        this.aimLine.position.y = 0.04;
        this.cueGroup.add(this.aimLine);

        // Ghost Ball Target Indicator (Circle on felt)
        const ghostGeo = new THREE.RingGeometry(0.09, 0.11, 24);
        const ghostMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.65
        });
        this.ghostBall = new THREE.Mesh(ghostGeo, ghostMat);
        this.ghostBall.rotation.x = -Math.PI / 2;
        this.ghostBall.position.set(0, 0.02, -2.5);
        this.cueGroup.add(this.ghostBall);
    }

    update(cueBallPos, aimAngle, power = 0.5) {
        if (!cueBallPos) return;

        this.angle = aimAngle;
        this.power = power;

        // Position cue group at cue ball center
        this.cueGroup.position.set(cueBallPos.x, cueBallPos.y, cueBallPos.z);
        this.cueGroup.rotation.y = aimAngle;

        // Pull back stick based on power (0.15 to 0.7 units)
        if (!this.isStriking) {
            const pullBack = 0.18 + power * 0.52;
            this.stickGroup.position.z = pullBack;
        }

        this.cueGroup.visible = this.visible;
    }

    setGhostTarget(dist) {
        const d = Math.max(0.3, Math.min(dist, 5.0));
        // Update aim line endpoint
        const positions = this.aimLine.geometry.attributes.position.array;
        positions[5] = -d;
        this.aimLine.geometry.attributes.position.needsUpdate = true;
        this.aimLine.computeLineDistances();

        this.ghostBall.position.z = -d;
    }

    strike(onHitCallback) {
        if (this.isStriking) return;
        this.isStriking = true;

        const startZ = this.stickGroup.position.z;
        const targetZ = 0.02; // Tip touches ball
        const startTime = performance.now();
        const duration = 120; // 120ms snap

        const animateStrike = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1.0);

            // Ease in power thrust
            this.stickGroup.position.z = THREE.MathUtils.lerp(startZ, targetZ, progress * progress);

            if (progress < 1.0) {
                requestAnimationFrame(animateStrike);
            } else {
                // Ball struck! Trigger physics
                if (onHitCallback) onHitCallback();

                // Recoil & fade out cue during shot
                setTimeout(() => {
                    this.visible = false;
                    this.isStriking = false;
                    this.stickGroup.position.z = 0.25;
                }, 80);
            }
        };

        requestAnimationFrame(animateStrike);
    }
}
