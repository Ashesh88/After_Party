// Royal 3D Cards - Three.js WebGL Casino Card Engine
// Realistic 3D card physics, animated deal/flip, chip stacks, and Blackjack / 21 duel

class Royal3DCardsGame {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.is2PlayerMode = false;

        // Parse query params for names
        const params = new URLSearchParams(window.location.search);
        this.p1Name = params.get('p1') || 'You';
        this.p2Name = params.get('p2') || 'Dealer';

        // Bankroll & Bet
        this.bankroll = 1000;
        this.currentBet = 25;
        this.currentRoundBet = 25;

        // Hands State
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.playerCardMeshes = [];
        this.dealerCardMeshes = [];

        // Game Round State
        this.roundState = 'betting'; // 'betting' | 'player_turn' | 'dealer_turn' | 'finished'
        this.isDealing = false;

        this.initThree();
        this.initTable();
        this.initEvents();
        this.initCardShoe();
        this.updateHUD();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x060b09, 0.015);

        this.camera = new THREE.PerspectiveCamera(
            window.innerWidth < 650 ? 56 : 46,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        this.camera.position.set(0, 7.8, 6.2);
        this.camera.lookAt(0, 0, -0.6);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x060b09);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Warm Luxury Casino Table Lighting
        const ambient = new THREE.AmbientLight(0xfff1d6, 0.6);
        this.scene.add(ambient);

        const tableSpot = new THREE.SpotLight(0xffffff, 1.2);
        tableSpot.position.set(0, 10, 2);
        tableSpot.angle = Math.PI / 3;
        tableSpot.penumbra = 0.5;
        tableSpot.castShadow = true;
        tableSpot.shadow.mapSize.width = 1024;
        tableSpot.shadow.mapSize.height = 1024;
        this.scene.add(tableSpot);
    }

    initTable() {
        this.tableGroup = new THREE.Group();

        // 1. Emerald Velvet Felt Playing Surface
        const feltGeo = new THREE.CylinderGeometry(6.5, 6.5, 0.4, 48, 1, false, 0, Math.PI);
        const feltMat = new THREE.MeshStandardMaterial({
            color: 0x064e3b, // Deep Emerald Casino Felt
            roughness: 0.8,
            metalness: 0.05
        });
        const felt = new THREE.Mesh(feltGeo, feltMat);
        felt.rotation.y = -Math.PI / 2;
        felt.receiveShadow = true;
        this.tableGroup.add(felt);

        // 2. Polished Mahogany Wooden Armrest Trim
        const rimGeo = new THREE.TorusGeometry(6.65, 0.35, 16, 48, Math.PI);
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0x3e180c, // Rich Mahogany
            roughness: 0.3,
            metalness: 0.2
        });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.rotation.z = Math.PI;
        rim.position.y = 0.15;
        rim.castShadow = true;
        this.tableGroup.add(rim);

        // 3. Brass Inlay Arc
        const brassGeo = new THREE.RingGeometry(4.2, 4.28, 48, 1, 0, Math.PI);
        const brassMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
        const brass = new THREE.Mesh(brassGeo, brassMat);
        brass.rotation.x = -Math.PI / 2;
        brass.rotation.z = -Math.PI / 2;
        brass.position.y = 0.21;
        this.tableGroup.add(brass);

        this.scene.add(this.tableGroup);
    }

    initCardShoe() {
        // Acrylic Card Shoe at Top Right
        const shoeGroup = new THREE.Group();
        const acrylicMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            metalness: 0.8,
            roughness: 0.2
        });
        const shoeBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 2.8), acrylicMat);
        shoeBase.position.set(4.2, 0.6, -2.6);
        shoeBase.rotation.y = -Math.PI / 5;
        shoeGroup.add(shoeBase);

        this.shoePosition = new THREE.Vector3(3.8, 1.1, -2.2);
        this.scene.add(shoeGroup);
    }

    // Canvas-generated crisp card textures (No external image downloads required!)
    createCardTextures(rank, suit) {
        // Front Face Canvas
        const fCanvas = document.createElement('canvas');
        fCanvas.width = 256;
        fCanvas.height = 360;
        const fCtx = fCanvas.getContext('2d');

        // Crisp white card base with rounded border
        fCtx.fillStyle = '#ffffff';
        fCtx.fillRect(0, 0, 256, 360);

        // Subtle textured border
        fCtx.strokeStyle = '#e2e8f0';
        fCtx.lineWidth = 6;
        fCtx.strokeRect(6, 6, 244, 348);

        const isRed = suit === '♥' || suit === '♦';
        const color = isRed ? '#dc2626' : '#0f172a';

        // Draw Corner Ranks & Suits
        fCtx.fillStyle = color;
        fCtx.font = 'bold 36px -apple-system, sans-serif';
        fCtx.textAlign = 'center';

        // Top-left
        fCtx.fillText(rank, 32, 48);
        fCtx.font = '30px serif';
        fCtx.fillText(suit, 32, 82);

        // Bottom-right (inverted)
        fCtx.save();
        fCtx.translate(224, 312);
        fCtx.rotate(Math.PI);
        fCtx.font = 'bold 36px -apple-system, sans-serif';
        fCtx.fillText(rank, 0, 0);
        fCtx.font = '30px serif';
        fCtx.fillText(suit, 0, 34);
        fCtx.restore();

        // Center Suit / Emblem
        fCtx.font = '84px serif';
        fCtx.fillText(suit, 128, 200);

        const frontTex = new THREE.CanvasTexture(fCanvas);
        frontTex.anisotropy = 4;

        // Back Face Canvas (Royal Gold & Navy Lattice)
        const bCanvas = document.createElement('canvas');
        bCanvas.width = 256;
        bCanvas.height = 360;
        const bCtx = bCanvas.getContext('2d');

        bCtx.fillStyle = '#0f172a'; // Deep Navy
        bCtx.fillRect(0, 0, 256, 360);

        // Gold Filigree Border
        bCtx.strokeStyle = '#d97706';
        bCtx.lineWidth = 10;
        bCtx.strokeRect(10, 10, 236, 340);

        bCtx.strokeStyle = '#f59e0b';
        bCtx.lineWidth = 3;
        bCtx.strokeRect(18, 18, 220, 324);

        // Center Royal Crown Emblem
        bCtx.fillStyle = '#f59e0b';
        bCtx.font = '64px serif';
        bCtx.textAlign = 'center';
        bCtx.fillText('👑', 128, 195);

        const backTex = new THREE.CanvasTexture(bCanvas);
        backTex.anisotropy = 4;

        return { frontTex, backTex };
    }

    createCardMesh(cardData, faceUp = true) {
        const { frontTex, backTex } = this.createCardTextures(cardData.rank, cardData.suit);

        // Card Geometry (1.35 width x 1.9 height x 0.02 depth)
        const geo = new THREE.BoxGeometry(1.35, 1.9, 0.02);

        const edgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
        const frontMat = new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.3 });
        const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.3 });

        // Materials array: [right, left, top, bottom, front (+z), back (-z)]
        const mats = [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat];

        const mesh = new THREE.Mesh(geo, mats);
        mesh.castShadow = true;
        mesh.userData = { cardData, isFaceUp: faceUp };

        // Position & Rotation: by default, lay flat on table
        mesh.rotation.x = -Math.PI / 2;
        if (!faceUp) {
            mesh.rotation.x = Math.PI / 2; // Show back
        }

        return mesh;
    }

    buildFreshDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const values = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'J': 10, 'Q': 10, 'K': 10, 'A': 11
        };

        const deck = [];
        suits.forEach(suit => {
            ranks.forEach(rank => {
                deck.push({ rank, suit, value: values[rank] });
            });
        });

        // Fisher-Yates shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        this.deck = deck;
    }

    calcHandScore(hand) {
        let total = 0;
        let aces = 0;

        hand.forEach(c => {
            total += c.value;
            if (c.rank === 'A') aces++;
        });

        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return total;
    }

    dealCardAnimated(target, faceUp, slotIdx, callback) {
        if (this.deck.length === 0) this.buildFreshDeck();
        const cardData = this.deck.pop();

        target.push(cardData);

        const cardMesh = this.createCardMesh(cardData, faceUp);
        cardMesh.position.copy(this.shoePosition);
        this.scene.add(cardMesh);

        if (target === this.playerHand) {
            this.playerCardMeshes.push(cardMesh);
        } else {
            this.dealerCardMeshes.push(cardMesh);
        }

        // Target spot on the felt
        const isPlayer = target === this.playerHand;
        const targetZ = isPlayer ? 1.5 : -1.8;
        const targetX = -1.2 + slotIdx * 1.5;
        const targetY = 0.22 + slotIdx * 0.01;

        if (window.cardsAudio) window.cardsAudio.playCardSlide();

        // 3D Deal Animation
        const startPos = this.shoePosition.clone();
        const endPos = new THREE.Vector3(targetX, targetY, targetZ);
        const startTime = Date.now();
        const duration = 380;

        const animateDeal = () => {
            const now = Date.now();
            const p = Math.min(1, (now - startTime) / duration);
            const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic

            // Arc in 3D
            cardMesh.position.lerpVectors(startPos, endPos, ease);
            cardMesh.position.y += Math.sin(p * Math.PI) * 0.6; // height arc

            if (p < 1) {
                requestAnimationFrame(animateDeal);
            } else {
                cardMesh.position.copy(endPos);
                if (window.cardsAudio) window.cardsAudio.playCardFlip();
                if (callback) callback();
            }
        };

        requestAnimationFrame(animateDeal);
    }

    flipCardMesh(mesh, callback) {
        const startRot = mesh.rotation.x;
        const targetRot = -Math.PI / 2;
        const startTime = Date.now();
        const duration = 280;

        if (window.cardsAudio) window.cardsAudio.playCardFlip();

        const animateFlip = () => {
            const now = Date.now();
            const p = Math.min(1, (now - startTime) / duration);
            mesh.rotation.x = THREE.MathUtils.lerp(startRot, targetRot, p);
            mesh.position.y += Math.sin(p * Math.PI) * 0.3;

            if (p < 1) {
                requestAnimationFrame(animateFlip);
            } else {
                mesh.rotation.x = targetRot;
                mesh.userData.isFaceUp = true;
                if (callback) callback();
            }
        };

        requestAnimationFrame(animateFlip);
    }

    startDealRound() {
        if (this.isDealing || this.roundState === 'player_turn') return;

        // Deduct bet
        if (this.bankroll < this.currentBet) {
            this.setAnnouncer("Not enough chips! Tap chips to select a smaller bet.");
            return;
        }

        this.bankroll -= this.currentBet;
        this.currentRoundBet = this.currentBet;
        this.updateHUD();

        this.isDealing = true;
        this.roundState = 'dealing';

        // Clear previous meshes
        this.clearTableMeshes();

        this.playerHand = [];
        this.dealerHand = [];
        this.buildFreshDeck();

        if (window.cardsAudio) window.cardsAudio.playChipClink();
        this.setAnnouncer("Dealing 3D Cards...");

        // Deal Sequence: Player 1 -> Dealer 1 -> Player 2 -> Dealer 2 (hole card)
        this.dealCardAnimated(this.playerHand, true, 0, () => {
            this.dealCardAnimated(this.dealerHand, true, 0, () => {
                this.dealCardAnimated(this.playerHand, true, 1, () => {
                    this.dealCardAnimated(this.dealerHand, false, 1, () => {
                        this.isDealing = false;
                        this.checkInitialDeal();
                    });
                });
            });
        });
    }

    checkInitialDeal() {
        const pScore = this.calcHandScore(this.playerHand);
        const dScore = this.calcHandScore([this.dealerHand[0]]); // visible card only

        this.updateHUD(pScore, dScore);

        // Check for immediate Player Blackjack (21)
        if (pScore === 21) {
            this.handlePlayerBlackjack();
            return;
        }

        // Enable Player Turn buttons: Hit, Stand, Double
        this.roundState = 'player_turn';
        this.showTurnButtons(true);
        this.setAnnouncer("Your Turn - Hit (+Card) or Stand?");
    }

    handlePlayerHit() {
        if (this.roundState !== 'player_turn' || this.isDealing) return;
        this.isDealing = true;

        const slot = this.playerHand.length;
        this.dealCardAnimated(this.playerHand, true, slot, () => {
            this.isDealing = false;
            const pScore = this.calcHandScore(this.playerHand);
            this.updateHUD(pScore);

            if (pScore > 21) {
                this.handlePlayerBust();
            } else if (pScore === 21) {
                this.handlePlayerStand(); // Auto stand on 21
            }
        });
    }

    handlePlayerDouble() {
        if (this.roundState !== 'player_turn' || this.isDealing) return;
        if (this.bankroll < this.currentRoundBet) {
            this.setAnnouncer("Not enough bankroll to double down!");
            return;
        }

        this.bankroll -= this.currentRoundBet;
        this.currentRoundBet *= 2;
        this.updateHUD();

        this.isDealing = true;
        const slot = this.playerHand.length;
        this.dealCardAnimated(this.playerHand, true, slot, () => {
            this.isDealing = false;
            const pScore = this.calcHandScore(this.playerHand);
            this.updateHUD(pScore);

            if (pScore > 21) {
                this.handlePlayerBust();
            } else {
                this.handlePlayerStand();
            }
        });
    }

    handlePlayerStand() {
        if (this.roundState !== 'player_turn' || this.isDealing) return;
        this.roundState = 'dealer_turn';
        this.showTurnButtons(false);
        this.setAnnouncer("Dealer's Turn...");

        // Reveal Dealer's hole card
        const holeMesh = this.dealerCardMeshes[1];
        if (holeMesh && !holeMesh.userData.isFaceUp) {
            this.flipCardMesh(holeMesh, () => {
                this.playDealerTurn();
            });
        } else {
            this.playDealerTurn();
        }
    }

    playDealerTurn() {
        const pScore = this.calcHandScore(this.playerHand);
        let dScore = this.calcHandScore(this.dealerHand);
        this.updateHUD(pScore, dScore);

        // Dealer must hit until 17 or higher
        const dealerStep = () => {
            dScore = this.calcHandScore(this.dealerHand);
            this.updateHUD(pScore, dScore);

            if (dScore < 17) {
                const slot = this.dealerHand.length;
                this.dealCardAnimated(this.dealerHand, true, slot, () => {
                    setTimeout(dealerStep, 450);
                });
            } else {
                this.determineWinner(pScore, dScore);
            }
        };

        setTimeout(dealerStep, 500);
    }

    determineWinner(pScore, dScore) {
        this.roundState = 'finished';

        if (dScore > 21) {
            // Dealer Bust!
            const winAmount = this.currentRoundBet * 2;
            this.bankroll += winAmount;
            this.updateHUD(pScore, dScore);
            this.showResultModal("Dealer Busted! 🏆", `Dealer has ${dScore}. You won +$${this.currentRoundBet}!`, true);
        } else if (pScore > dScore) {
            // Player Higher Score!
            const winAmount = this.currentRoundBet * 2;
            this.bankroll += winAmount;
            this.updateHUD(pScore, dScore);
            this.showResultModal("You Win! 🏆", `You have ${pScore} vs Dealer's ${dScore}! Won +$${this.currentRoundBet}!`, true);
        } else if (pScore < dScore) {
            // Dealer Higher Score!
            this.updateHUD(pScore, dScore);
            this.showResultModal("Dealer Wins! 💥", `Dealer's ${dScore} beats your ${pScore}. Better luck next hand!`, false);
        } else {
            // Push / Tie!
            this.bankroll += this.currentRoundBet; // Refund bet
            this.updateHUD(pScore, dScore);
            this.showResultModal("Push! (Tie) 🤝", `Both hands have ${pScore}. Bet refunded!`, null);
        }
    }

    handlePlayerBlackjack() {
        this.roundState = 'finished';
        const winAmount = Math.floor(this.currentRoundBet * 2.5); // 3:2 payout
        this.bankroll += winAmount;
        this.updateHUD(21);
        if (window.cardsAudio) window.cardsAudio.playBlackjack();
        this.showResultModal("BLACKJACK! 21 🔥", `Natural 21! Won +$${Math.floor(this.currentRoundBet * 1.5)}!`, true);
    }

    handlePlayerBust() {
        this.roundState = 'finished';
        this.showTurnButtons(false);
        const pScore = this.calcHandScore(this.playerHand);
        if (window.cardsAudio) window.cardsAudio.playBust();
        this.showResultModal("Busted! Over 21 💥", `Hand total is ${pScore}. You lost $${this.currentRoundBet}.`, false);
    }

    showResultModal(title, subtitle, isWin) {
        if (isWin === true && window.cardsAudio) window.cardsAudio.playWin();
        if (isWin === false && window.cardsAudio) window.cardsAudio.playBust();

        const modal = document.getElementById('modal-result');
        const tEl = document.getElementById('result-title');
        const sEl = document.getElementById('result-subtitle');
        const iEl = document.getElementById('result-icon');

        if (tEl) tEl.textContent = title;
        if (sEl) sEl.textContent = subtitle;
        if (iEl) iEl.textContent = isWin === true ? '👑' : (isWin === false ? '💥' : '🤝');

        if (modal) modal.classList.add('open');
    }

    clearTableMeshes() {
        this.playerCardMeshes.forEach(m => this.scene.remove(m));
        this.dealerCardMeshes.forEach(m => this.scene.remove(m));
        this.playerCardMeshes = [];
        this.dealerCardMeshes = [];
    }

    showTurnButtons(show) {
        const dealBtn = document.getElementById('btn-deal');
        const hitBtn = document.getElementById('btn-hit');
        const standBtn = document.getElementById('btn-stand');
        const doubleBtn = document.getElementById('btn-double');

        if (show) {
            if (dealBtn) dealBtn.classList.add('hidden');
            if (hitBtn) hitBtn.classList.remove('hidden');
            if (standBtn) standBtn.classList.remove('hidden');
            if (doubleBtn) doubleBtn.classList.remove('hidden');
        } else {
            if (dealBtn) dealBtn.classList.remove('hidden');
            if (hitBtn) hitBtn.classList.add('hidden');
            if (standBtn) standBtn.classList.add('hidden');
            if (doubleBtn) doubleBtn.classList.add('hidden');
        }
    }

    setAnnouncer(text) {
        const el = document.getElementById('match-announcer');
        if (el) el.textContent = text;
    }

    updateHUD(playerScore = null, dealerScore = null) {
        const bEl = document.getElementById('bankroll-val');
        if (bEl) bEl.textContent = `$${this.bankroll}`;

        const betEl = document.getElementById('current-bet-val');
        if (betEl) betEl.textContent = `$${this.currentBet}`;

        const pScoreEl = document.getElementById('player-score-val');
        if (pScoreEl) {
            pScoreEl.textContent = playerScore !== null ? playerScore : this.calcHandScore(this.playerHand);
        }

        const dScoreEl = document.getElementById('dealer-score-val');
        if (dScoreEl) {
            dScoreEl.textContent = dealerScore !== null ? dealerScore : (
                this.dealerHand.length > 0 && this.roundState === 'player_turn'
                    ? this.dealerHand[0].value
                    : this.calcHandScore(this.dealerHand)
            );
        }
    }

    initEvents() {
        // Chip Betting Selector Buttons
        document.querySelectorAll('.chip-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.roundState === 'player_turn') return;
                document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentBet = parseInt(btn.getAttribute('data-value'), 10);
                if (window.cardsAudio) window.cardsAudio.playChipClink();
                this.updateHUD();
            });
        });

        // Game Action Buttons
        document.getElementById('btn-deal').addEventListener('click', () => this.startDealRound());
        document.getElementById('btn-hit').addEventListener('click', () => this.handlePlayerHit());
        document.getElementById('btn-stand').addEventListener('click', () => this.handlePlayerStand());
        document.getElementById('btn-double').addEventListener('click', () => this.handlePlayerDouble());

        // Next Hand / Modal Button
        document.getElementById('btn-next-hand').addEventListener('click', () => {
            document.getElementById('modal-result').classList.remove('open');
            this.clearTableMeshes();
            this.playerHand = [];
            this.dealerHand = [];
            this.showTurnButtons(false);
            this.updateHUD(0, 0);
            this.setAnnouncer("Place your bet & tap Deal Cards!");
        });

        // Audio Mute
        document.getElementById('btn-mute').addEventListener('click', (e) => {
            if (window.cardsAudio) {
                window.cardsAudio.muted = !window.cardsAudio.muted;
                const icon = e.currentTarget.querySelector('i');
                icon.className = window.cardsAudio.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
            }
        });

        // New Game Reset
        document.getElementById('btn-new-round').addEventListener('click', () => {
            this.bankroll = 1000;
            this.clearTableMeshes();
            this.playerHand = [];
            this.dealerHand = [];
            this.showTurnButtons(false);
            this.updateHUD(0, 0);
            this.setAnnouncer("New Game Started! Place your bet.");
        });

        // Mode switch
        document.getElementById('btn-mode-dealer').addEventListener('click', () => {
            this.is2PlayerMode = false;
            document.getElementById('btn-mode-dealer').classList.add('active');
            document.getElementById('btn-mode-2p').classList.remove('active');
            document.getElementById('dealer-label').textContent = 'Dealer';
        });

        document.getElementById('btn-mode-2p').addEventListener('click', () => {
            this.is2PlayerMode = true;
            document.getElementById('btn-mode-2p').classList.add('active');
            document.getElementById('btn-mode-dealer').classList.remove('active');
            document.getElementById('dealer-label').textContent = this.p2Name || 'Friend';
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.fov = window.innerWidth < 650 ? 56 : 46;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.royalCards = new Royal3DCardsGame();
});
