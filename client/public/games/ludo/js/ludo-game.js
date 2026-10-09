// Couples Ludo 3D - Complete Game Controller & Physics Loop
// OrbitControls, 3D Hopping Animations, AI Bot, and Authentic Rules

class LudoGame3D {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.gameMode = 'pass'; // 'pass' (2-player) | 'ai' (vs Bot)
        this.tokenCount = 4; // 2 or 4 tokens per player
        this.currentTurn = 'p1'; // 'p1' (Pink) | 'p2' (Purple)
        this.diceRolled = null;
        this.hasRolled = false;
        this.consecutiveSixes = 0;
        this.isMoving = false;
        this.winner = null;

        // Player Tokens State
        // step: -1 = Yard, 0..50 = Main Track, 51..55 = Home Column, 56 = Finished at Crown
        this.players = {
            p1: {
                id: 'p1',
                name: 'Pink Player 💕',
                colorHex: 0xf43f5e,
                startOffset: 0,
                tokens: [-1, -1, -1, -1],
                meshList: []
            },
            p2: {
                id: 'p2',
                name: 'Purple Player 💜',
                colorHex: 0x8b5cf6,
                startOffset: 26,
                tokens: [-1, -1, -1, -1],
                meshList: []
            }
        };

        // Raycasting for piece selection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.initThree();
        this.initGameEntities();
        this.initEvents();
        this.updateUI();

        // Animation loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initThree() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0c10);

        // Camera: natural 3D isometric perspective
        this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 9.5, 7.5);

        // WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.container.appendChild(this.renderer.domElement);

        // OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.2;
        this.controls.minDistance = 4;
        this.controls.maxDistance = 16;
        this.controls.target.set(0, 0.2, 0);

        // Lighting: Warm Luxury Studio
        const ambient = new THREE.AmbientLight(0xfff5ea, 0.9);
        this.scene.add(ambient);

        const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
        keyLight.position.set(5, 14, 7);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.bias = -0.0004;
        this.scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight(0xc084fc, 0.45);
        rimLight.position.set(-6, 10, -6);
        this.scene.add(rimLight);

        // Soft floor shadow receiver
        const floorGeo = new THREE.PlaneGeometry(50, 50);
        const floorMat = new THREE.ShadowMaterial({ opacity: 0.4 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.41;
        floor.receiveShadow = true;
        this.scene.add(floor);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initGameEntities() {
        // 1. 3D Board
        this.board = new LudoBoard3D(this.scene);

        // 2. 3D Dice
        this.dice = new LudoDice3D(this.scene);

        // 3. 3D Pawn Pieces Factory
        this.pieceFactory = new LudoPieceFactory();
        this.spawnAllTokens();
    }

    spawnAllTokens() {
        // Clear previous meshes
        ['p1', 'p2'].forEach(pId => {
            this.players[pId].meshList.forEach(m => this.scene.remove(m));
            this.players[pId].meshList = [];
        });

        // Spawn P1 (Pink) Tokens
        for (let i = 0; i < this.tokenCount; i++) {
            const mesh = this.pieceFactory.createTokenMesh(this.players.p1.colorHex, 'p1', i);
            const yardSlot = this.board.p1YardSlots[i];
            const worldPos = this.board.gridToWorld(yardSlot[0], yardSlot[1], 0.12);
            mesh.position.copy(worldPos);
            this.scene.add(mesh);
            this.players.p1.meshList.push(mesh);
        }

        // Spawn P2 (Purple) Tokens
        for (let i = 0; i < this.tokenCount; i++) {
            const mesh = this.pieceFactory.createTokenMesh(this.players.p2.colorHex, 'p2', i);
            const yardSlot = this.board.p2YardSlots[i];
            const worldPos = this.board.gridToWorld(yardSlot[0], yardSlot[1], 0.12);
            mesh.position.copy(worldPos);
            this.scene.add(mesh);
            this.players.p2.meshList.push(mesh);
        }
    }

    getStepWorldPos(playerId, step, tokenIndex) {
        if (step === -1) {
            // In Yard Base
            const slots = playerId === 'p1' ? this.board.p1YardSlots : this.board.p2YardSlots;
            const s = slots[tokenIndex];
            return this.board.gridToWorld(s[0], s[1], 0.12);
        }

        if (step >= 0 && step <= 50) {
            // Main Perimeter Track
            const offset = this.players[playerId].startOffset;
            const trackIdx = (offset + step) % 52;
            const coord = this.board.trackCoords[trackIdx];
            return this.board.gridToWorld(coord[0], coord[1], 0.08);
        }

        if (step >= 51 && step <= 55) {
            // Home Column
            const homeCoords = playerId === 'p1' ? this.board.p1HomeCoords : this.board.p2HomeCoords;
            const coord = homeCoords[step - 51];
            return this.board.gridToWorld(coord[0], coord[1], 0.08);
        }

        if (step >= 56) {
            // Center Victory Crown 👑
            const angle = (tokenIndex * Math.PI * 2) / 4;
            const r = 0.28;
            return new THREE.Vector3(Math.cos(angle) * r, 0.22, Math.sin(angle) * r);
        }

        return new THREE.Vector3(0, 0, 0);
    }

    getTrackIndex(playerId, step) {
        if (step < 0 || step > 50) return -1;
        const offset = this.players[playerId].startOffset;
        return (offset + step) % 52;
    }

    initEvents() {
        // Click to Roll Dice (HUD button)
        document.getElementById('btn-roll-dice').addEventListener('click', () => {
            this.handleRollClick();
        });

        // 3D Canvas Click Handler
        this.renderer.domElement.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.interactive')) return;

            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);

            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            for (const hit of intersects) {
                // Click on 3D Dice to roll
                if (hit.object === this.dice.mesh || hit.object.parent === this.dice.mesh) {
                    this.handleRollClick();
                    return;
                }

                // Click on playable Token
                let obj = hit.object;
                while (obj && obj !== this.scene) {
                    if (obj.userData && obj.userData.isLudoToken) {
                        const { playerId, tokenIndex } = obj.userData;
                        if (playerId === this.currentTurn && this.hasRolled && !this.isMoving) {
                            if (this.canTokenMove(playerId, tokenIndex, this.diceRolled)) {
                                this.executeTokenMove(playerId, tokenIndex);
                                return;
                            }
                        }
                    }
                    obj = obj.parent;
                }
            }
        });

        // Mode Switching
        document.getElementById('btn-mode-pass').addEventListener('click', () => {
            this.setGameMode('pass');
        });
        document.getElementById('btn-mode-ai').addEventListener('click', () => {
            this.setGameMode('ai');
        });

        // Token Count Selector (2 vs 4 tokens)
        document.getElementById('select-tokens').addEventListener('change', (e) => {
            this.tokenCount = parseInt(e.target.value, 10);
            this.resetGame();
        });

        // Audio Mute Toggle
        document.getElementById('btn-mute').addEventListener('click', (e) => {
            if (window.ludoAudio) {
                window.ludoAudio.muted = !window.ludoAudio.muted;
                const icon = e.currentTarget.querySelector('i');
                icon.className = window.ludoAudio.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
            }
        });

        // Restart / New Game
        document.getElementById('btn-restart').addEventListener('click', () => {
            this.resetGame();
        });
        document.getElementById('btn-play-again').addEventListener('click', () => {
            document.getElementById('modal-victory').classList.remove('open');
            this.resetGame();
        });
    }

    setGameMode(mode) {
        this.gameMode = mode;
        document.getElementById('btn-mode-pass').classList.toggle('active', mode === 'pass');
        document.getElementById('btn-mode-ai').classList.toggle('active', mode === 'ai');
        this.players.p2.name = (mode === 'ai') ? 'Romantic AI Bot 🤖' : 'Purple Player 💜';
        this.resetGame();
    }

    handleRollClick() {
        if (this.dice.isRolling || this.hasRolled || this.isMoving || this.winner) return;

        // Roll 1 to 6
        const rollValue = Math.floor(Math.random() * 6) + 1;
        this.hasRolled = true;
        this.diceRolled = rollValue;
        document.getElementById('btn-roll-dice').disabled = true;

        this.dice.roll(rollValue, (val) => {
            this.onDiceRollComplete(val);
        });
    }

    onDiceRollComplete(val) {
        if (val === 6) {
            this.consecutiveSixes++;
            if (this.consecutiveSixes >= 3) {
                this.consecutiveSixes = 0;
                this.showStatus('Three 6s! Penalty skips turn.');
                this.endTurn(false);
                return;
            }
        } else {
            this.consecutiveSixes = 0;
        }

        // Check legal moves
        const legalIndices = [];
        for (let i = 0; i < this.tokenCount; i++) {
            if (this.canTokenMove(this.currentTurn, i, val)) {
                legalIndices.push(i);
            }
        }

        if (legalIndices.length === 0) {
            this.showStatus(`Rolled ${val}! No valid moves available.`);
            setTimeout(() => this.endTurn(false), 900);
            return;
        }

        // Highlight selectable tokens
        this.highlightTokens(this.currentTurn, legalIndices);

        // If only 1 move available and pass mode, or if AI turn
        if (this.gameMode === 'ai' && this.currentTurn === 'p2') {
            setTimeout(() => {
                const bestToken = this.chooseAiToken(legalIndices, val);
                this.executeTokenMove('p2', bestToken);
            }, 650);
        } else if (legalIndices.length === 1) {
            // Auto-move single legal piece for smooth gameplay
            setTimeout(() => {
                this.executeTokenMove(this.currentTurn, legalIndices[0]);
            }, 500);
        } else {
            this.showStatus(`Rolled ${val}! Tap a glowing token to move.`);
        }
    }

    canTokenMove(playerId, tokenIndex, roll) {
        const curStep = this.players[playerId].tokens[tokenIndex];

        // Yard token: needs a 6 to open
        if (curStep === -1) {
            return roll === 6;
        }

        // Already at Crown
        if (curStep >= 56) return false;

        // Check if move exceeds Crown (exact roll required for 56)
        if (curStep + roll > 56) return false;

        return true;
    }

    highlightTokens(playerId, tokenIndices) {
        this.clearHighlights();
        tokenIndices.forEach(idx => {
            const mesh = this.players[playerId].meshList[idx];
            if (mesh && mesh.userData.aura) {
                mesh.userData.aura.visible = true;
            }
        });
    }

    clearHighlights() {
        ['p1', 'p2'].forEach(pId => {
            this.players[pId].meshList.forEach(m => {
                if (m && m.userData.aura) m.userData.aura.visible = false;
            });
        });
    }

    executeTokenMove(playerId, tokenIndex) {
        if (this.isMoving) return;
        this.isMoving = true;
        this.clearHighlights();

        const curStep = this.players[playerId].tokens[tokenIndex];
        const roll = this.diceRolled;
        const mesh = this.players[playerId].meshList[tokenIndex];

        // 1. Moving OUT of Yard onto Start Square
        if (curStep === -1) {
            this.players[playerId].tokens[tokenIndex] = 0;
            const targetPos = this.getStepWorldPos(playerId, 0, tokenIndex);
            this.animateHopTo(mesh, targetPos, () => {
                if (window.ludoAudio) window.ludoAudio.playTokenStep();
                this.checkCaptureOrWin(playerId, tokenIndex, roll === 6);
            });
            return;
        }

        // 2. Hopping step-by-step along the track
        const targetStep = curStep + roll;
        let stepCount = 0;

        const hopNextStep = () => {
            stepCount++;
            const intermediateStep = curStep + stepCount;
            const nextWorldPos = this.getStepWorldPos(playerId, intermediateStep, tokenIndex);

            this.animateHopTo(mesh, nextWorldPos, () => {
                if (window.ludoAudio) window.ludoAudio.playTokenStep();

                if (intermediateStep < targetStep) {
                    hopNextStep();
                } else {
                    // Reached final destination
                    this.players[playerId].tokens[tokenIndex] = targetStep;
                    const bonusTurn = (roll === 6) || (targetStep === 56);
                    if (targetStep === 56 && window.ludoAudio) window.ludoAudio.playEnterHome();
                    this.checkCaptureOrWin(playerId, tokenIndex, bonusTurn);
                }
            });
        };

        hopNextStep();
    }

    animateHopTo(mesh, targetPos, onComplete) {
        const startPos = mesh.position.clone();
        const duration = 160; // ms per hop
        const startTime = performance.now();
        const hopHeight = 0.35;

        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1.0);

            // Parabolic lift
            const lift = Math.sin(progress * Math.PI) * hopHeight;

            mesh.position.x = THREE.MathUtils.lerp(startPos.x, targetPos.x, progress);
            mesh.position.z = THREE.MathUtils.lerp(startPos.z, targetPos.z, progress);
            mesh.position.y = THREE.MathUtils.lerp(startPos.y, targetPos.y, progress) + lift;

            if (progress < 1.0) {
                requestAnimationFrame(animate);
            } else {
                mesh.position.copy(targetPos);
                if (onComplete) onComplete();
            }
        };

        requestAnimationFrame(animate);
    }

    checkCaptureOrWin(playerId, tokenIndex, hasBonusTurn) {
        const finalStep = this.players[playerId].tokens[tokenIndex];

        // 1. Check Win Condition
        const allFinished = this.players[playerId].tokens.slice(0, this.tokenCount).every(s => s === 56);
        if (allFinished) {
            this.handleVictory(playerId);
            return;
        }

        // 2. Check Capturing Opponent Token
        let captured = false;
        if (finalStep >= 0 && finalStep <= 50) {
            const trackIdx = this.getTrackIndex(playerId, finalStep);
            const isSafe = this.board.safeIndices.includes(trackIdx);

            if (!isSafe) {
                const opponentId = (playerId === 'p1') ? 'p2' : 'p1';
                for (let oIdx = 0; oIdx < this.tokenCount; oIdx++) {
                    const oppStep = this.players[opponentId].tokens[oIdx];
                    if (oppStep >= 0 && oppStep <= 50) {
                        const oppTrackIdx = this.getTrackIndex(opponentId, oppStep);
                        if (oppTrackIdx === trackIdx) {
                            // CAPTURE!
                            captured = true;
                            this.players[opponentId].tokens[oIdx] = -1; // Send back to base!
                            const oppMesh = this.players[opponentId].meshList[oIdx];
                            const yardPos = this.getStepWorldPos(opponentId, -1, oIdx);

                            if (window.ludoAudio) window.ludoAudio.playCapture();
                            this.showStatus(`💥 ${this.players[playerId].name} captured ${this.players[opponentId].name}'s token! Bonus Turn!`);

                            this.animateHopTo(oppMesh, yardPos, () => {});
                            break;
                        }
                    }
                }
            }
        }

        const grantBonus = hasBonusTurn || captured;
        this.isMoving = false;
        this.endTurn(grantBonus);
    }

    endTurn(grantBonus) {
        this.clearHighlights();
        this.hasRolled = false;
        this.diceRolled = null;
        document.getElementById('btn-roll-dice').disabled = false;

        if (this.winner) return;

        if (grantBonus) {
            this.showStatus(`🎉 Bonus Turn for ${this.players[this.currentTurn].name}!`);
        } else {
            this.currentTurn = (this.currentTurn === 'p1') ? 'p2' : 'p1';
            this.showStatus(`${this.players[this.currentTurn].name}'s Turn`);
        }

        this.updateUI();

        // AI Turn Trigger
        if (this.gameMode === 'ai' && this.currentTurn === 'p2' && !this.winner) {
            setTimeout(() => {
                this.handleRollClick();
            }, 800);
        }
    }

    chooseAiToken(legalIndices, roll) {
        // AI Evaluation:
        // 1. Move to Crown (step 56)
        for (const idx of legalIndices) {
            if (this.players.p2.tokens[idx] + roll === 56) return idx;
        }

        // 2. Capture opponent token
        for (const idx of legalIndices) {
            const step = this.players.p2.tokens[idx];
            if (step >= 0 && step <= 50) {
                const targetTrack = this.getTrackIndex('p2', step + roll);
                if (!this.board.safeIndices.includes(targetTrack)) {
                    for (let p1Idx = 0; p1Idx < this.tokenCount; p1Idx++) {
                        const p1Step = this.players.p1.tokens[p1Idx];
                        if (this.getTrackIndex('p1', p1Step) === targetTrack) {
                            return idx; // Prioritize capture!
                        }
                    }
                }
            }
        }

        // 3. Open token from yard on 6
        if (roll === 6) {
            const yardToken = legalIndices.find(idx => this.players.p2.tokens[idx] === -1);
            if (yardToken !== undefined) return yardToken;
        }

        // 4. Advance closest token to home
        return legalIndices[0];
    }

    handleVictory(playerId) {
        this.winner = this.players[playerId].name;
        this.isMoving = false;
        if (window.ludoAudio) window.ludoAudio.playVictory();

        document.getElementById('victory-title').textContent = `${this.winner} Wins! 👑`;
        document.getElementById('modal-victory').classList.add('open');
    }

    resetGame() {
        this.winner = null;
        this.isMoving = false;
        this.hasRolled = false;
        this.diceRolled = null;
        this.consecutiveSixes = 0;
        this.currentTurn = 'p1';

        this.players.p1.tokens = [-1, -1, -1, -1];
        this.players.p2.tokens = [-1, -1, -1, -1];

        this.spawnAllTokens();
        this.dice.setFaceUp(6);
        this.clearHighlights();
        this.showStatus('New Match Started! Pink Player rolls first.');
        this.updateUI();
    }

    showStatus(text) {
        const el = document.getElementById('status-banner');
        if (el) el.textContent = text;
    }

    updateUI() {
        const isP1 = this.currentTurn === 'p1';
        document.getElementById('card-p1').classList.toggle('active-turn', isP1);
        document.getElementById('card-p2').classList.toggle('active-turn', !isP1);

        // Tokens Finished count
        const p1Done = this.players.p1.tokens.slice(0, this.tokenCount).filter(s => s === 56).length;
        const p2Done = this.players.p2.tokens.slice(0, this.tokenCount).filter(s => s === 56).length;

        document.getElementById('score-p1').textContent = `${p1Done}/${this.tokenCount} Home`;
        document.getElementById('score-p2').textContent = `${p2Done}/${this.tokenCount} Home`;
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Bootstrap once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    window.ludoGame = new LudoGame3D();
});
