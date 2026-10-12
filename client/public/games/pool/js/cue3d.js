// Professional 3D Pool Cue & Advanced Trajectory Predictor
// Renders Cue stick, Ghost Ball, Target Ball trajectory path, and Cue Ball deflection path

class PoolCue3D {
    constructor(scene) {
        this.scene = scene;
        this.cueGroup = new THREE.Group();
        this.guidelineGroup = new THREE.Group();
        this.angle = 0; // Radians
        this.power = 0.5; // 0.1 to 1.0
        this._visible = true;
        this.isStriking = false;

        this.buildCueMesh();
        this.buildAimingGuides();

        this.scene.add(this.cueGroup);
        this.scene.add(this.guidelineGroup);
    }

    get visible() {
        return this._visible;
    }

    set visible(val) {
        this._visible = Boolean(val);
        if (this.cueGroup) this.cueGroup.visible = this._visible;
        if (this.guidelineGroup) this.guidelineGroup.visible = this._visible;
    }

    reset() {
        this.isStriking = false;
        if (this.stickGroup) this.stickGroup.position.z = 0.25;
        this.visible = true;
    }

    buildCueMesh() {
        this.stickGroup = new THREE.Group();

        // 1. Tapered Canadian Hardwood Shaft (Length = 3.6, thin tip at -Z, thick butt at +Z)
        const shaftGeo = new THREE.CylinderGeometry(0.045, 0.022, 3.6, 32);
        const shaftMat = new THREE.MeshStandardMaterial({
            color: 0xdfb889,
            roughness: 0.35,
            metalness: 0.05
        });
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.rotation.x = Math.PI / 2;
        shaft.position.z = 1.8; // Extends backwards from cue ball
        this.stickGroup.add(shaft);

        // 2. Premium Embossed Leather Grip & Inlay Butt (Length = 1.1)
        const gripGeo = new THREE.CylinderGeometry(0.049, 0.046, 1.1, 32);
        const gripMat = new THREE.MeshStandardMaterial({
            color: 0x1c1e24,
            roughness: 0.75,
            metalness: 0.15
        });
        const grip = new THREE.Mesh(gripGeo, gripMat);
        grip.rotation.x = Math.PI / 2;
        grip.position.z = 3.05;
        this.stickGroup.add(grip);

        // 2b. Polished Rosewood Butt Cap (Length = 0.15)
        const buttCapGeo = new THREE.CylinderGeometry(0.049, 0.048, 0.15, 32);
        const buttCapMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            roughness: 0.25,
            metalness: 0.8
        });
        const buttCap = new THREE.Mesh(buttCapGeo, buttCapMat);
        buttCap.rotation.x = Math.PI / 2;
        buttCap.position.z = 3.65;
        this.stickGroup.add(buttCap);

        // 3. Polished Brass Ferrule (Length = 0.04, at tip)
        const ferruleGeo = new THREE.CylinderGeometry(0.023, 0.022, 0.04, 24);
        const ferruleMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.85,
            roughness: 0.2
        });
        const ferrule = new THREE.Mesh(ferruleGeo, ferruleMat);
        ferrule.rotation.x = Math.PI / 2;
        ferrule.position.z = 0.02;
        this.stickGroup.add(ferrule);

        // 4. Master Blue Chalk Tip (Length = 0.016, touching cue ball)
        const tipGeo = new THREE.CylinderGeometry(0.021, 0.021, 0.016, 24);
        const tipMat = new THREE.MeshStandardMaterial({
            color: 0x2563eb,
            roughness: 0.95
        });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.rotation.x = Math.PI / 2;
        tip.position.z = -0.005;
        this.stickGroup.add(tip);

        // Natural elevation tilt so stick hovers cleanly over table rails
        this.stickGroup.rotation.x = 0.065;

        this.cueGroup.add(this.stickGroup);
    }

    buildAimingGuides() {
        // 1. Primary Cue Ball Line (White Dotted)
        const cueLineGeo = new THREE.BufferGeometry();
        cueLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 0, 0]), 3));
        const cueLineMat = new THREE.LineDashedMaterial({
            color: 0xffffff,
            dashSize: 0.08,
            gapSize: 0.06,
            linewidth: 2,
            transparent: true,
            opacity: 0.95,
            depthTest: false
        });
        this.cueAimLine = new THREE.Line(cueLineGeo, cueLineMat);
        this.cueAimLine.renderOrder = 999;
        this.guidelineGroup.add(this.cueAimLine);

        // 2. Ghost Ball Impact Ring & Sphere
        const ghostRingGeo = new THREE.RingGeometry(0.10, 0.12, 32);
        const ghostRingMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
            depthTest: false
        });
        this.ghostRing = new THREE.Mesh(ghostRingGeo, ghostRingMat);
        this.ghostRing.rotation.x = -Math.PI / 2;
        this.ghostRing.renderOrder = 999;
        this.guidelineGroup.add(this.ghostRing);

        const ghostSphereGeo = new THREE.SphereGeometry(0.108, 16, 16);
        const ghostSphereMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: true,
            opacity: 0.25,
            depthTest: false
        });
        this.ghostSphere = new THREE.Mesh(ghostSphereGeo, ghostSphereMat);
        this.ghostSphere.renderOrder = 999;
        this.guidelineGroup.add(this.ghostSphere);

        // 3. Target Ball Trajectory Path (Yellow/Cyan Glowing Line)
        const targetLineGeo = new THREE.BufferGeometry();
        targetLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 0, 0]), 3));
        const targetLineMat = new THREE.LineBasicMaterial({
            color: 0xfacc15, // Bright Gold Arrow line
            linewidth: 3,
            transparent: true,
            opacity: 0.95,
            depthTest: false
        });
        this.targetPathLine = new THREE.Line(targetLineGeo, targetLineMat);
        this.targetPathLine.renderOrder = 999;
        this.guidelineGroup.add(this.targetPathLine);

        // 4. Cue Ball Deflection Path (Soft Blue Tangent Line)
        const deflectLineGeo = new THREE.BufferGeometry();
        deflectLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 0, 0]), 3));
        const deflectLineMat = new THREE.LineDashedMaterial({
            color: 0x38bdf8,
            dashSize: 0.06,
            gapSize: 0.05,
            linewidth: 2,
            transparent: true,
            opacity: 0.8,
            depthTest: false
        });
        this.deflectPathLine = new THREE.Line(deflectLineGeo, deflectLineMat);
        this.deflectPathLine.renderOrder = 999;
        this.guidelineGroup.add(this.deflectPathLine);
    }

    update(cueBallPos, aimAngle, power = 0.5) {
        if (!cueBallPos) return;

        this.angle = aimAngle;
        this.power = power;

        // Position cue stick group at cue ball
        this.cueGroup.position.set(cueBallPos.x, cueBallPos.y, cueBallPos.z);
        this.cueGroup.rotation.y = -aimAngle - Math.PI / 2;

        // Pull back stick smoothly based on power (0.22 to 0.72)
        if (!this.isStriking) {
            const pullBack = 0.20 + power * 0.52;
            this.stickGroup.position.z = pullBack;
        }

        this.cueGroup.visible = this.visible;
        this.guidelineGroup.visible = this.visible;
    }

    setTrajectory(cueX, cueZ, ballY, aimAngle, hitInfo) {
        if (!this.visible) {
            this.guidelineGroup.visible = false;
            return;
        }
        this.guidelineGroup.visible = true;

        const yOffset = ballY + 0.01;

        // 1. Primary Line: from Cue Ball to Impact Point
        const endX = hitInfo.impactX;
        const endZ = hitInfo.impactZ;

        const cuePositions = new Float32Array([
            cueX, yOffset, cueZ,
            endX, yOffset, endZ
        ]);
        this.cueAimLine.geometry.setAttribute('position', new THREE.BufferAttribute(cuePositions, 3));
        this.cueAimLine.computeLineDistances();

        // Position Ghost Ball at Impact Point
        this.ghostRing.position.set(endX, yOffset + 0.005, endZ);
        this.ghostSphere.position.set(endX, ballY, endZ);
        this.ghostRing.visible = true;
        this.ghostSphere.visible = true;

        if (hitInfo.hasBallHit) {
            // 2. Target Ball Path: starts at target ball center, shoots along normal
            const tbX = hitInfo.targetBallX;
            const tbZ = hitInfo.targetBallZ;
            const targetLen = 2.0; // 2 meters projection
            const targetEndX = tbX + hitInfo.targetDirX * targetLen;
            const targetEndZ = tbZ + hitInfo.targetDirZ * targetLen;

            const targetPositions = new Float32Array([
                tbX, yOffset, tbZ,
                targetEndX, yOffset, targetEndZ
            ]);
            this.targetPathLine.geometry.setAttribute('position', new THREE.BufferAttribute(targetPositions, 3));
            this.targetPathLine.visible = true;

            // 3. Cue Ball Deflection Line: starts at ghost ball, deflects along tangent
            const deflectLen = 1.0;
            const deflectEndX = endX + hitInfo.cueDeflectX * deflectLen;
            const deflectEndZ = endZ + hitInfo.cueDeflectZ * deflectLen;

            const deflectPositions = new Float32Array([
                endX, yOffset, endZ,
                deflectEndX, yOffset, deflectEndZ
            ]);
            this.deflectPathLine.geometry.setAttribute('position', new THREE.BufferAttribute(deflectPositions, 3));
            this.deflectPathLine.computeLineDistances();
            this.deflectPathLine.visible = true;
        } else {
            // No ball hit (cushion impact)
            this.targetPathLine.visible = false;

            // Show cushion bounce trajectory
            if (hitInfo.cushionBounceX !== undefined) {
                const bounceLen = 1.2;
                const bEndX = endX + hitInfo.cushionBounceX * bounceLen;
                const bEndZ = endZ + hitInfo.cushionBounceZ * bounceLen;
                const bPositions = new Float32Array([
                    endX, yOffset, endZ,
                    bEndX, yOffset, bEndZ
                ]);
                this.deflectPathLine.geometry.setAttribute('position', new THREE.BufferAttribute(bPositions, 3));
                this.deflectPathLine.computeLineDistances();
                this.deflectPathLine.visible = true;
            } else {
                this.deflectPathLine.visible = false;
            }
        }
    }

    strike(onHitCallback) {
        if (this.isStriking) return;
        this.isStriking = true;

        // Hide guideline during shot
        this.guidelineGroup.visible = false;

        const startZ = this.stickGroup.position.z;
        const targetZ = 0.02; // Tip touches ball
        const startTime = performance.now();
        const duration = 85; // 85ms quick snap

        let hitCalled = false;

        const animateStrike = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1.0);

            // Fast acceleration forward
            this.stickGroup.position.z = THREE.MathUtils.lerp(startZ, targetZ, progress * progress);

            if (progress >= 1.0 && !hitCalled) {
                hitCalled = true;
                this.isStriking = false;
                this.stickGroup.position.z = 0.25;
                this.visible = false;
                if (onHitCallback) onHitCallback();
            } else if (progress < 1.0) {
                requestAnimationFrame(animateStrike);
            }
        };

        requestAnimationFrame(animateStrike);
    }
}
