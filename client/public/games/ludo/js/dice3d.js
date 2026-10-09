// Couples Ludo 3D - Interactive 3D Rolling Dice
// Physics-inspired tumbling animation, dynamic canvas textures, and audio sync

class LudoDice3D {
    constructor(scene) {
        this.scene = scene;
        this.size = 0.55;
        this.mesh = null;
        this.isRolling = false;
        this.value = 1;

        this.buildDice();
    }

    createFaceTexture(pipCount) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Background: Glossy Ivory White with subtle gradient
        const grad = ctx.createLinearGradient(0, 0, 256, 256);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, '#f1f5f9');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);

        // Rounded border trim
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, 242, 242);

        // Draw pip dots (indented romantic jewel dots)
        const dotColor = (pipCount === 1) ? '#e11d48' : '#0f172a'; // Big red/pink center pip for 1!
        ctx.fillStyle = dotColor;

        const drawDot = (cx, cy, r = 24) => {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            // Specular shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = dotColor;
        };

        const c = 128;
        const q1 = 68;
        const q3 = 188;

        if (pipCount === 1) {
            drawDot(c, c, 34); // Big center dot
        } else if (pipCount === 2) {
            drawDot(q1, q1);
            drawDot(q3, q3);
        } else if (pipCount === 3) {
            drawDot(q1, q1);
            drawDot(c, c);
            drawDot(q3, q3);
        } else if (pipCount === 4) {
            drawDot(q1, q1);
            drawDot(q3, q1);
            drawDot(q1, q3);
            drawDot(q3, q3);
        } else if (pipCount === 5) {
            drawDot(q1, q1);
            drawDot(q3, q1);
            drawDot(c, c);
            drawDot(q1, q3);
            drawDot(q3, q3);
        } else if (pipCount === 6) {
            drawDot(q1, q1);
            drawDot(q3, q1);
            drawDot(q1, c);
            drawDot(q3, c);
            drawDot(q1, q3);
            drawDot(q3, q3);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 4;
        return texture;
    }

    buildDice() {
        // Order of BoxGeometry faces: +X (0), -X (1), +Y (2), -Y (3), +Z (4), -Z (5)
        // Standard opposite faces sum to 7:
        // +X: 1, -X: 6
        // +Y: 2, -Y: 5
        // +Z: 3, -Z: 4
        const materials = [
            new THREE.MeshStandardMaterial({ map: this.createFaceTexture(1), roughness: 0.15, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ map: this.createFaceTexture(6), roughness: 0.15, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ map: this.createFaceTexture(2), roughness: 0.15, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ map: this.createFaceTexture(5), roughness: 0.15, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ map: this.createFaceTexture(3), roughness: 0.15, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ map: this.createFaceTexture(4), roughness: 0.15, metalness: 0.1 }),
        ];

        const geo = new THREE.BoxGeometry(this.size, this.size, this.size);
        this.mesh = new THREE.Mesh(geo, materials);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Default rest position (rest outside board on side tray, never overlaps pawns!)
        this.restPos = new THREE.Vector3(4.35, 0.30, 0);
        this.mesh.position.copy(this.restPos);
        this.setFaceUp(6); // Default show 6

        this.scene.add(this.mesh);
    }

    setFaceUp(val) {
        this.value = val;
        // Rotations to bring target face to point directly upward (+Y)
        const rotMap = {
            1: { x: 0, y: 0, z: -Math.PI / 2 },
            6: { x: 0, y: 0, z: Math.PI / 2 },
            2: { x: 0, y: 0, z: 0 },
            5: { x: Math.PI, y: 0, z: 0 },
            3: { x: Math.PI / 2, y: 0, z: 0 },
            4: { x: -Math.PI / 2, y: 0, z: 0 }
        };
        const target = rotMap[val] || { x: 0, y: 0, z: 0 };
        this.mesh.rotation.set(target.x, target.y, target.z);
    }

    roll(targetValue, onComplete) {
        if (this.isRolling) return;
        this.isRolling = true;
        this.value = targetValue;

        if (window.ludoAudio) window.ludoAudio.playDiceShake();

        const startPos = this.mesh.position.clone();
        const peakHeight = 2.4;
        const duration = 750; // ms
        const startTime = performance.now();

        // Target rotation for face up + wild extra spins
        const rotMap = {
            1: { x: 0, y: 0, z: -Math.PI / 2 },
            6: { x: 0, y: 0, z: Math.PI / 2 },
            2: { x: 0, y: 0, z: 0 },
            5: { x: Math.PI, y: 0, z: 0 },
            3: { x: Math.PI / 2, y: 0, z: 0 },
            4: { x: -Math.PI / 2, y: 0, z: 0 }
        };
        const baseRot = rotMap[targetValue];

        const extraRotX = (Math.floor(Math.random() * 2) + 2) * Math.PI * 2;
        const extraRotY = (Math.floor(Math.random() * 2) + 2) * Math.PI * 2;
        const extraRotZ = (Math.floor(Math.random() * 2) + 2) * Math.PI * 2;

        const targetRotX = baseRot.x + extraRotX;
        const targetRotY = baseRot.y + extraRotY;
        const targetRotZ = baseRot.z + extraRotZ;

        const startRot = this.mesh.rotation.clone();

        const animateRoll = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1.0);

            // Parabolic arc for Y
            const arcY = Math.sin(progress * Math.PI) * peakHeight;
            this.mesh.position.y = startPos.y + arcY;

            // Ease out spin
            const t = 1 - Math.pow(1 - progress, 3);
            this.mesh.rotation.x = THREE.MathUtils.lerp(startRot.x, targetRotX, t);
            this.mesh.rotation.y = THREE.MathUtils.lerp(startRot.y, targetRotY, t);
            this.mesh.rotation.z = THREE.MathUtils.lerp(startRot.z, targetRotZ, t);

            if (progress < 1.0) {
                requestAnimationFrame(animateRoll);
            } else {
                this.isRolling = false;
                this.mesh.position.copy(this.restPos);
                this.setFaceUp(targetValue);
                if (window.ludoAudio) window.ludoAudio.playDiceLand();
                if (targetValue === 6 && window.ludoAudio) window.ludoAudio.playRollSix();
                if (onComplete) onComplete(targetValue);
            }
        };

        requestAnimationFrame(animateRoll);
    }
}

window.LudoDice3D = LudoDice3D;
