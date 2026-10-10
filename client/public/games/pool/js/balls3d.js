// Couples 3D Pool - 16 Regulation Billiard Balls
// High-gloss phenolic resin, authentic numbered solids & stripes canvas textures

class PoolBallFactory {
    constructor() {
        this.radius = 0.11;
        this.ballColors = {
            1: '#eab308',  // Yellow
            2: '#2563eb',  // Blue
            3: '#dc2626',  // Red
            4: '#7c3aed',  // Purple
            5: '#ea580c',  // Orange
            6: '#16a34a',  // Green
            7: '#881337',  // Maroon
            8: '#0f172a',  // Black (8-Ball)
            9: '#eab308',  // Striped Yellow
            10: '#2563eb', // Striped Blue
            11: '#dc2626', // Striped Red
            12: '#7c3aed', // Striped Purple
            13: '#ea580c', // Striped Orange
            14: '#16a34a', // Striped Green
            15: '#881337'  // Striped Maroon
        };
    }

    createBallTexture(number) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        if (number === 0) {
            // Cue Ball: Pure glossy ivory with tiny red aim dot
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, 512, 256);
            ctx.fillStyle = '#e11d48';
            ctx.beginPath();
            ctx.arc(256, 128, 9, 0, Math.PI * 2);
            ctx.fill();
        } else if (number === 8) {
            // Eight-Ball: Solid Black with white circle & 8
            ctx.fillStyle = '#0a0d14';
            ctx.fillRect(0, 0, 512, 256);
            this.drawNumberBadge(ctx, 128, 128, '8');
            this.drawNumberBadge(ctx, 384, 128, '8');
        } else if (number >= 1 && number <= 7) {
            // Solids: Full colored body with white circle & number
            const color = this.ballColors[number];
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 512, 256);
            this.drawNumberBadge(ctx, 128, 128, String(number));
            this.drawNumberBadge(ctx, 384, 128, String(number));
        } else {
            // Stripes (9-15): White base with wide colored equator stripe
            const color = this.ballColors[number];
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, 512, 256);

            // Equator stripe (centered horizontally across Y)
            ctx.fillStyle = color;
            ctx.fillRect(0, 56, 512, 144);

            this.drawNumberBadge(ctx, 128, 128, String(number), true);
            this.drawNumberBadge(ctx, 384, 128, String(number), true);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 4;
        return texture;
    }

    drawNumberBadge(ctx, cx, cy, text, isStripe = false) {
        // White circle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 38, 0, Math.PI * 2);
        ctx.fill();

        // Thin outer badge ring
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Black Number
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, cx, cy + 2);

        // Underline for 6 and 9 to avoid ambiguity
        if (text === '6' || text === '9') {
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#0f172a';
            ctx.beginPath();
            ctx.moveTo(cx - 14, cy + 22);
            ctx.lineTo(cx + 14, cy + 22);
            ctx.stroke();
        }
    }

    createBallMesh(number) {
        const geo = new THREE.SphereGeometry(this.radius, 32, 32);
        const mat = new THREE.MeshStandardMaterial({
            map: this.createBallTexture(number),
            roughness: 0.16, // High-gloss resin sheen
            metalness: 0.05
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { number, inPocket: false };
        return mesh;
    }

    // Standard 15-ball triangular rack + cue ball placement
    createInitialRackedBalls() {
        const balls = [];
        const R = this.radius;
        const D = R * 2 + 0.002; // Diameter + tiny gap to prevent initial overlap
        const rowOffset = D * Math.sqrt(3) / 2; // ~0.19

        // 1. Cue Ball placed behind head string at X = -1.8
        balls.push({
            number: 0,
            x: -1.8,
            z: 0,
            vx: 0,
            vz: 0,
            inPocket: false,
            pocketTime: 0
        });

        // 2. Racked 15 balls in 5 rows starting from Foot Spot at X = 1.4
        // Regulation arrangement: 8-ball in center of 3rd row, one solid and one stripe at back corners
        const rackOrder = [
            1,                  // Row 0 (Apex)
            9, 2,               // Row 1
            3, 8, 10,           // Row 2 (8-ball in center!)
            11, 4, 12, 5,       // Row 3
            6, 13, 7, 14, 15    // Row 4
        ];

        let idx = 0;
        const startX = 1.4;

        for (let row = 0; row < 5; row++) {
            const rx = startX + row * rowOffset;
            const startZ = -(row * D) / 2;

            for (let col = 0; col <= row; col++) {
                const rz = startZ + col * D;
                const num = rackOrder[idx++];

                balls.push({
                    number: num,
                    x: rx,
                    z: rz,
                    vx: 0,
                    vz: 0,
                    inPocket: false,
                    pocketTime: 0
                });
            }
        }

        return balls;
    }
}
