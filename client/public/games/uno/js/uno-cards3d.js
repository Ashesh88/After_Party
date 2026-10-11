// 3D UNO Party - Three.js Card Mesh & Procedural Texture Engine
// Generates high-fidelity authentic UNO card textures and interactive 3D meshes

class UnoCardTextureFactory {
    constructor() {
        this.cache = new Map();
        this.backTexture = null;
    }

    // Colors matching official palette
    getColorHex(colorName) {
        switch (colorName) {
            case 'red': return '#dc2626';
            case 'blue': return '#2563eb';
            case 'green': return '#059669';
            case 'yellow': return '#eab308';
            default: return '#18181b';
        }
    }

    // Shared Uno back texture
    getBackTexture() {
        if (this.backTexture) return this.backTexture;

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');

        // Dark matte black card base
        ctx.fillStyle = '#0f172a';
        this.roundRect(ctx, 0, 0, 512, 768, 36);
        ctx.fill();

        // White border line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 14;
        this.roundRect(ctx, 16, 16, 480, 736, 28);
        ctx.stroke();

        // Red central ellipse tilted at -30 deg
        ctx.save();
        ctx.translate(256, 384);
        ctx.rotate(-32 * Math.PI / 180);

        // Gold outer ring glow
        ctx.beginPath();
        ctx.ellipse(0, 0, 205, 125, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();

        // Inner Red oval
        ctx.beginPath();
        ctx.ellipse(0, 0, 190, 110, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();

        // White & Gold "UNO" text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'italic 900 130px "Arial Black", Impact, sans-serif';

        // 3D Shadow
        ctx.fillStyle = '#1e293b';
        ctx.fillText('UNO', 8, 8);

        // Yellow bevel
        ctx.fillStyle = '#fde047';
        ctx.fillText('UNO', 4, 4);

        // Crisp White top layer
        ctx.fillStyle = '#ffffff';
        ctx.fillText('UNO', 0, 0);

        ctx.restore();

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 4;
        this.backTexture = texture;
        return texture;
    }

    // Front texture for any card
    getFrontTexture(card) {
        const cacheKey = `${card.color}_${card.value}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');

        const baseColor = this.getColorHex(card.color);

        // Card body background
        ctx.fillStyle = baseColor;
        this.roundRect(ctx, 0, 0, 512, 768, 36);
        ctx.fill();

        // Outer white card border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 16;
        this.roundRect(ctx, 18, 18, 476, 732, 26);
        ctx.stroke();

        if (card.isWild()) {
            this.drawWildCenter(ctx, card);
        } else {
            this.drawStandardCenter(ctx, card, baseColor);
        }

        // Draw mini corner symbols (top-left & bottom-right)
        this.drawCornerSymbols(ctx, card);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 4;
        this.cache.set(cacheKey, texture);
        return texture;
    }

    drawStandardCenter(ctx, card, baseColor) {
        // Tilted white center oval
        ctx.save();
        ctx.translate(256, 384);
        ctx.rotate(-28 * Math.PI / 180);

        ctx.beginPath();
        ctx.ellipse(0, 0, 185, 120, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Symbol or number inside
        ctx.fillStyle = baseColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (card.value === 'skip') {
            this.drawSkipIcon(ctx, 0, 0, 68, baseColor);
        } else if (card.value === 'reverse') {
            this.drawReverseIcon(ctx, 0, 0, 72, baseColor);
        } else if (card.value === 'draw2') {
            ctx.font = 'italic 900 115px "Arial Black", Impact, sans-serif';
            ctx.fillText('+2', 0, 6);
        } else {
            // Number 0-9
            ctx.font = 'italic 900 155px "Arial Black", Impact, sans-serif';
            // Subtle 3D shadow under number
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillText(card.value, 4, 8);

            ctx.fillStyle = baseColor;
            ctx.fillText(card.value, 0, 4);

            // Underline for 6 and 9
            if (card.value === '6' || card.value === '9') {
                ctx.fillRect(-45, 78, 90, 12);
            }
        }

        ctx.restore();
    }

    drawWildCenter(ctx, card) {
        ctx.save();
        ctx.translate(256, 384);
        ctx.rotate(-28 * Math.PI / 180);

        // 4-quadrant segmented color wheel in center
        const r = 160;
        const ry = 105;
        const colors = ['#dc2626', '#2563eb', '#059669', '#eab308'];

        // Red quadrant
        ctx.beginPath();
        ctx.ellipse(0, 0, r, ry, 0, -Math.PI, -Math.PI / 2);
        ctx.lineTo(0, 0);
        ctx.fillStyle = colors[0];
        ctx.fill();

        // Blue quadrant
        ctx.beginPath();
        ctx.ellipse(0, 0, r, ry, 0, -Math.PI / 2, 0);
        ctx.lineTo(0, 0);
        ctx.fillStyle = colors[1];
        ctx.fill();

        // Green quadrant
        ctx.beginPath();
        ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI / 2);
        ctx.lineTo(0, 0);
        ctx.fillStyle = colors[2];
        ctx.fill();

        // Yellow quadrant
        ctx.beginPath();
        ctx.ellipse(0, 0, r, ry, 0, Math.PI / 2, Math.PI);
        ctx.lineTo(0, 0);
        ctx.fillStyle = colors[3];
        ctx.fill();

        // Outer white border
        ctx.beginPath();
        ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 10;
        ctx.stroke();

        ctx.restore();

        // Center label (+4 or WILD)
        ctx.save();
        ctx.translate(256, 384);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (card.value === 'wild4') {
            ctx.font = 'italic 900 120px "Arial Black", Impact, sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.fillText('+4', 6, 8);
            ctx.fillStyle = '#ffffff';
            ctx.fillText('+4', 0, 0);
        } else {
            ctx.font = 'italic 900 78px "Arial Black", Impact, sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.fillText('WILD', 4, 6);
            ctx.fillStyle = '#ffffff';
            ctx.fillText('WILD', 0, 0);
        }
        ctx.restore();
    }

    drawCornerSymbols(ctx, card) {
        const drawCorner = (x, y, angle) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (card.value === 'skip') {
                this.drawSkipIcon(ctx, 0, 0, 24, '#ffffff');
            } else if (card.value === 'reverse') {
                this.drawReverseIcon(ctx, 0, 0, 24, '#ffffff');
            } else if (card.value === 'draw2') {
                ctx.font = 'italic 900 48px "Arial Black", Impact, sans-serif';
                ctx.fillText('+2', 0, 0);
            } else if (card.value === 'wild4') {
                ctx.font = 'italic 900 44px "Arial Black", Impact, sans-serif';
                ctx.fillText('+4', 0, 0);
            } else if (card.value === 'wild') {
                ctx.font = 'italic 900 32px "Arial Black", Impact, sans-serif';
                ctx.fillText('W', 0, 0);
            } else {
                ctx.font = 'italic 900 60px "Arial Black", Impact, sans-serif';
                ctx.fillText(card.value, 0, 0);
                if (card.value === '6' || card.value === '9') {
                    ctx.fillRect(-18, 28, 36, 5);
                }
            }
            ctx.restore();
        };

        // Top-left
        drawCorner(65, 80, 0);
        // Bottom-right (inverted 180 deg)
        drawCorner(447, 688, Math.PI);
    }

    drawSkipIcon(ctx, cx, cy, radius, color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = radius * 0.32;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        const offset = radius * 0.707;
        ctx.moveTo(cx - offset, cy - offset);
        ctx.lineTo(cx + offset, cy + offset);
        ctx.stroke();
        ctx.restore();
    }

    drawReverseIcon(ctx, cx, cy, radius, color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = radius * 0.28;

        // Top arc curved right
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.75, -Math.PI * 0.8, -Math.PI * 0.1);
        ctx.stroke();
        // Top arrow head
        ctx.beginPath();
        ctx.moveTo(cx + radius * 0.8, cy - radius * 0.2);
        ctx.lineTo(cx + radius * 0.6, cy - radius * 0.5);
        ctx.lineTo(cx + radius * 0.3, cy - radius * 0.1);
        ctx.fill();

        // Bottom arc curved left
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.75, Math.PI * 0.2, Math.PI * 0.9);
        ctx.stroke();
        // Bottom arrow head
        ctx.beginPath();
        ctx.moveTo(cx - radius * 0.8, cy + radius * 0.2);
        ctx.lineTo(cx - radius * 0.6, cy + radius * 0.5);
        ctx.lineTo(cx - radius * 0.3, cy + radius * 0.1);
        ctx.fill();

        ctx.restore();
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // Create complete 3D Mesh for a Card
    createCardMesh(card) {
        const geom = new THREE.BoxGeometry(1.4, 2.1, 0.02);

        const edgeMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.4,
            metalness: 0.1
        });

        const frontTex = this.getFrontTexture(card);
        const backTex = this.getBackTexture();

        const frontMat = new THREE.MeshStandardMaterial({
            map: frontTex,
            roughness: 0.3,
            metalness: 0.08
        });

        const backMat = new THREE.MeshStandardMaterial({
            map: backTex,
            roughness: 0.3,
            metalness: 0.08
        });

        // Box materials: +X, -X, +Y, -Y, +Z (front), -Z (back)
        const materials = [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat];

        const mesh = new THREE.Mesh(geom, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { card, isCardMesh: true };

        return mesh;
    }
}

window.UnoCardTextureFactory = UnoCardTextureFactory;
