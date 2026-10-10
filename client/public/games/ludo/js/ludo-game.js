// Authentic Classic 3D Ludo - Complete Game Engine
// Matching the iconic Red, Green, Yellow, Blue board with 3D pawns, 3D dice, and AI

class ClassicLudo3D {
    constructor() {
        this.container = document.getElementById('canvas-container');
        
        // Parse URL params for mode and names
        const params = new URLSearchParams(window.location.search);
        const urlMode = params.get('mode');
        this.sessionCode = params.get('code') || null;
        this.myRole = params.get('role') || 'red'; // 'red' (Host) or 'yellow' (Guest)
        this.isMatchStarted = params.get('started') === '1' || urlMode !== 'online';

        const rawP1 = params.get('name') || params.get('p1') || 'You';
        const rawP2 = params.get('opponent') || params.get('p2') || 'Friend';

        if (urlMode === 'online') {
            this.gameMode = 'online';
            if (this.myRole === 'red') {
                this.p1Name = `${rawP1} (You)`;
                this.p2Name = rawP2;
            } else {
                this.p1Name = rawP2;
                this.p2Name = `${rawP1} (You)`;
            }
        } else if (urlMode === '4p' || urlMode === 'friends') {
            this.gameMode = '4p';
            this.p1Name = rawP1;
            this.p2Name = rawP2;
        } else if (urlMode === 'ai') {
            this.gameMode = 'ai';
            this.p1Name = rawP1;
            this.p2Name = 'Computer Bot';
        } else {
            this.gameMode = '2p';
            this.p1Name = rawP1;
            this.p2Name = rawP2;
        }

        this.tokenCount = 4; // 2 or 4 tokens per player
        this.activePlayerIds = (this.gameMode === '4p') ? ['red', 'green', 'yellow', 'blue'] : ['red', 'yellow'];
        this.currentTurnIdx = 0;
        this.diceRolled = null;
        this.hasRolled = false;
        this.consecutiveSixes = 0;
        this.isMoving = false;
        this.winner = null;

        // Player Definitions - Deep, rich, eye-friendly tones
        this.playerConfigs = {
            red: {
                id: 'red',
                name: `${this.p1Name} 🔴`,
                colorHex: 0xb91c1c, // Deep Crimson
                startOffset: 0,
                homeColKey: 'red',
                yardKey: 'red',
                tokens: [-1, -1, -1, -1],
                meshList: []
            },
            green: {
                id: 'green',
                name: 'Green Player 🟢',
                colorHex: 0x15803d, // Deep Emerald
                startOffset: 13,
                homeColKey: 'green',
                yardKey: 'green',
                tokens: [-1, -1, -1, -1],
                meshList: []
            },
            yellow: {
                id: 'yellow',
                name: (this.gameMode === 'ai') ? 'Computer Bot 🤖' : `${this.p2Name} 🟡`,
                colorHex: 0xb45309, // Deep Amber Gold
                startOffset: 26,
                homeColKey: 'yellow',
                yardKey: 'yellow',
                tokens: [-1, -1, -1, -1],
                meshList: []
            },
            blue: {
                id: 'blue',
                name: 'Blue Player 🔵',
                colorHex: 0x1d4ed8, // Deep Royal Blue
                startOffset: 39,
                homeColKey: 'blue',
                yardKey: 'blue',
                tokens: [-1, -1, -1, -1],
                meshList: []
            }
        };

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.initThree();
        this.initEntities();
        this.initEvents();
        this.updateUI();

        if (this.gameMode === 'online') {
            const modeToggle = document.querySelector('.mode-toggle');
            if (modeToggle) modeToggle.style.display = 'none';
            const selectTokens = document.getElementById('select-tokens');
            if (selectTokens) selectTokens.style.display = 'none';
        }

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0c10);

        // Responsive Camera: perfectly framed for mobile portrait & desktop
        const isMobile = window.innerWidth < 650;
        const initialFov = isMobile ? 54 : 40;
        this.camera = new THREE.PerspectiveCamera(initialFov, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, isMobile ? 12.8 : 10.5, isMobile ? 5.2 : 6.2);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.95; // Soft natural exposure, zero eye strain
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.25;
        this.controls.minDistance = 4;
        this.controls.maxDistance = 16;
        this.controls.target.set(0, isMobile ? 0.35 : 0.1, 0);

        // Soft, Eye-Friendly Diffused Lighting (Zero harsh white glare)
        const ambient = new THREE.AmbientLight(0xfff5ea, 0.65);
        this.scene.add(ambient);

        const keyLight = new THREE.DirectionalLight(0xfff8ee, 0.55);
        keyLight.position.set(4, 15, 6);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.bias = -0.0004;
        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.35);
        fillLight.position.set(-5, 10, -5);
        this.scene.add(fillLight);

        // Floor Shadow Catcher
        const floorGeo = new THREE.PlaneGeometry(50, 50);
        const floorMat = new THREE.ShadowMaterial({ opacity: 0.35 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.32;
        floor.receiveShadow = true;
        this.scene.add(floor);

        window.addEventListener('resize', () => {
            const isMob = window.innerWidth < 650;
            this.camera.fov = isMob ? 54 : 40;
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initEntities() {
        this.board = new LudoBoard3D(this.scene);
        this.dice = new LudoDice3D(this.scene);
        this.pieceFactory = new LudoPieceFactory();
        this.spawnTokens();
    }

    spawnTokens() {
        // Clear all existing pawns
        Object.values(this.playerConfigs).forEach(p => {
            p.meshList.forEach(m => this.scene.remove(m));
            p.meshList = [];
        });

        // Spawn pawns for active players
        this.activePlayerIds.forEach(pId => {
            const p = this.playerConfigs[pId];
            for (let i = 0; i < this.tokenCount; i++) {
                const mesh = this.pieceFactory.createTokenMesh(p.colorHex, pId, i);
                const slot = this.board.yardSlots[p.yardKey][i];
                const worldPos = this.board.gridToWorld(slot[0], slot[1], 0.14);
                mesh.position.copy(worldPos);
                this.scene.add(mesh);
                p.meshList.push(mesh);
            }
        });
    }

    getStepWorldPos(playerId, step, tokenIndex) {
        const p = this.playerConfigs[playerId];

        if (step === -1) {
            // Inside Yard Base
            const slot = this.board.yardSlots[p.yardKey][tokenIndex];
            return this.board.gridToWorld(slot[0], slot[1], 0.14);
        }

        if (step >= 0 && step <= 50) {
            // Main 52-step Track
            const trackIdx = (p.startOffset + step) % 52;
            const coord = this.board.trackCoords[trackIdx];
            return this.board.gridToWorld(coord[0], coord[1], 0.14);
        }

        if (step >= 51 && step <= 55) {
            // Home Column
            const homeList = this.board.homeColumns[p.homeColKey];
            const coord = homeList[step - 51];
            return this.board.gridToWorld(coord[0], coord[1], 0.14);
        }

        if (step >= 56) {
            // Center Crown Destination 👑
            const angle = (tokenIndex * Math.PI * 2) / 4 + Math.PI / 4;
            const r = 0.28;
            return new THREE.Vector3(Math.cos(angle) * r, 0.24, Math.sin(angle) * r);
        }

        return new THREE.Vector3(0, 0, 0);
    }

    getTrackIndex(playerId, step) {
        if (step < 0 || step > 50) return -1;
        const p = this.playerConfigs[playerId];
        return (p.startOffset + step) % 52;
    }

    initEvents() {
        // Roll Dice Button
        document.getElementById('btn-roll-dice').addEventListener('click', () => {
            this.handleRollClick();
        });

        // 3D Canvas Raycasting Click
        this.renderer.domElement.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.interactive')) return;

            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);

            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            for (const hit of intersects) {
                // Click on 3D Dice directly
                if (hit.object === this.dice.mesh || hit.object.parent === this.dice.mesh) {
                    this.handleRollClick();
                    return;
                }

                // Click on playable Pawn
                let obj = hit.object;
                while (obj && obj !== this.scene) {
                    if (obj.userData && obj.userData.isLudoToken) {
                        const { playerId, tokenIndex } = obj.userData;
                        const currentPId = this.activePlayerIds[this.currentTurnIdx];
                        if (playerId === currentPId && this.hasRolled && !this.isMoving) {
                            if (this.canTokenMove(playerId, tokenIndex, this.diceRolled)) {
                                this.userSelectToken(playerId, tokenIndex);
                                return;
                            }
                        }
                    }
                    obj = obj.parent;
                }
            }
        });

        // Game Mode Switching (2P, 4P, AI)
        ['2p', '4p', 'ai'].forEach(mode => {
            const btn = document.getElementById(`btn-mode-${mode}`);
            if (btn) {
                btn.addEventListener('click', () => this.setGameMode(mode));
            }
        });

        // Token Count Selector (2 vs 4 pawns)
        document.getElementById('select-tokens').addEventListener('change', (e) => {
            this.tokenCount = parseInt(e.target.value, 10);
            this.resetGame();
        });

        // Audio Mute
        document.getElementById('btn-mute').addEventListener('click', (e) => {
            if (window.ludoAudio) {
                window.ludoAudio.muted = !window.ludoAudio.muted;
                const icon = e.currentTarget.querySelector('i');
                icon.className = window.ludoAudio.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
            }
        });

        // New Game / Reset
        document.getElementById('btn-restart').addEventListener('click', () => {
            if (this.gameMode === 'online' && window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'LUDO_LOCAL_RESTART', sessionCode: this.sessionCode }, '*');
            }
            this.resetGame();
        });
        document.getElementById('btn-play-again').addEventListener('click', () => {
            document.getElementById('modal-victory').classList.remove('open');
            if (this.gameMode === 'online' && window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'LUDO_LOCAL_RESTART', sessionCode: this.sessionCode }, '*');
            }
            this.resetGame();
        });

        // Listen for postMessage from parent React component
        window.addEventListener('message', (e) => {
            if (!e.data || typeof e.data !== 'object') return;

            if (e.data.type === 'LUDO_REMOTE_ROLL') {
                const { roll } = e.data;
                if (this.dice.isRolling || this.isMoving) return;
                this.hasRolled = true;
                this.diceRolled = roll;
                const btnRoll = document.getElementById('btn-roll-dice');
                if (btnRoll) btnRoll.disabled = true;

                this.dice.roll(roll, (val) => {
                    this.onDiceRollComplete(val);
                });
            }

            if (e.data.type === 'LUDO_REMOTE_MOVE') {
                const { playerId, tokenIndex, roll } = e.data;
                this.diceRolled = roll;
                this.executeTokenMove(playerId, tokenIndex);
            }

            if (e.data.type === 'LUDO_START_MATCH') {
                this.isMatchStarted = true;
                this.updateUI();
                const firstPId = this.activePlayerIds[0];
                const isMyTurn = (firstPId === this.myRole);
                const btnRoll = document.getElementById('btn-roll-dice');
                if (btnRoll) btnRoll.disabled = !isMyTurn;
                this.showStatus(isMyTurn ? 'Match Started! Your turn to roll 🎲' : `Match Started! ${this.playerConfigs[firstPId].name}'s turn to roll 🎲`);
            }

            if (e.data.type === 'LUDO_REMATCH') {
                this.resetGame();
            }

            if (e.data.type === 'LUDO_TOGGLE_MUTE') {
                if (window.ludoAudio) {
                    window.ludoAudio.muted = Boolean(e.data.muted);
                    const icon = document.querySelector('#btn-mute i');
                    if (icon) icon.className = window.ludoAudio.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
                }
            }

            if (e.data.type === 'SET_MODE') {
                const modeMap = { couple: '2p', friends: '4p', ai: 'ai', '2p': '2p', '4p': '4p' };
                if (modeMap[e.data.mode]) this.setGameMode(modeMap[e.data.mode]);
            }
            if (e.data.type === 'SET_NAMES') {
                if (e.data.p1) {
                    this.p1Name = e.data.p1;
                    this.playerConfigs.red.name = `${this.p1Name} 🔴`;
                }
                if (e.data.p2) {
                    this.p2Name = e.data.p2;
                    if (this.gameMode !== 'ai') this.playerConfigs.yellow.name = `${this.p2Name} 🟡`;
                }
                this.updateUI();
            }
        });
    }

    setGameMode(mode) {
        this.gameMode = mode;
        ['2p', '4p', 'ai'].forEach(m => {
            const el = document.getElementById(`btn-mode-${m}`);
            if (el) el.classList.toggle('active', m === mode);
        });

        if (mode === '4p') {
            this.activePlayerIds = ['red', 'green', 'yellow', 'blue'];
            this.playerConfigs.yellow.name = (this.p2Name && this.p2Name !== 'Partner') ? `${this.p2Name} 🟡` : 'Yellow Player 🟡';
        } else {
            // 2P or AI: Red vs Yellow (opposite sides)
            this.activePlayerIds = ['red', 'yellow'];
            this.playerConfigs.yellow.name = (mode === 'ai') ? 'Computer Bot 🤖' : `${this.p2Name} 🟡`;
        }

        this.resetGame();
    }

    userSelectToken(playerId, tokenIndex) {
        if (this.gameMode === 'online') {
            if (playerId !== this.myRole) return;
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'LUDO_LOCAL_MOVE',
                    sessionCode: this.sessionCode,
                    playerId: playerId,
                    tokenIndex: tokenIndex,
                    roll: this.diceRolled
                }, '*');
            }
        }
        this.executeTokenMove(playerId, tokenIndex);
    }

    handleRollClick() {
        if (this.dice.isRolling || this.hasRolled || this.isMoving || this.winner) return;

        if (this.gameMode === 'online') {
            if (!this.isMatchStarted) {
                this.showStatus('Waiting for friend to accept challenge... ⏳');
                return;
            }
            const activePId = this.activePlayerIds[this.currentTurnIdx];
            if (activePId !== this.myRole) {
                this.showStatus(`Not your turn! Waiting for ${this.playerConfigs[activePId].name} to roll...`);
                return;
            }
        }

        const rollValue = Math.floor(Math.random() * 6) + 1;
        this.hasRolled = true;
        this.diceRolled = rollValue;
        const btnRoll = document.getElementById('btn-roll-dice');
        if (btnRoll) btnRoll.disabled = true;

        if (this.gameMode === 'online' && window.parent && window.parent !== window) {
            const activePId = this.activePlayerIds[this.currentTurnIdx];
            window.parent.postMessage({
                type: 'LUDO_LOCAL_ROLL',
                sessionCode: this.sessionCode,
                playerId: activePId,
                roll: rollValue
            }, '*');
        }

        this.dice.roll(rollValue, (val) => {
            this.onDiceRollComplete(val);
        });
    }

    onDiceRollComplete(val) {
        if (val === 6) {
            this.consecutiveSixes++;
            if (this.consecutiveSixes >= 3) {
                this.consecutiveSixes = 0;
                this.showStatus('Three 6s in a row! Penalty skips turn.');
                this.endTurn(false);
                return;
            }
        } else {
            this.consecutiveSixes = 0;
        }

        const currentPId = this.activePlayerIds[this.currentTurnIdx];
        const legalIndices = [];
        for (let i = 0; i < this.tokenCount; i++) {
            if (this.canTokenMove(currentPId, i, val)) {
                legalIndices.push(i);
            }
        }

        if (legalIndices.length === 0) {
            this.showStatus(`Rolled ${val}! No legal moves.`);
            setTimeout(() => this.endTurn(false), 900);
            return;
        }

        this.highlightTokens(currentPId, legalIndices);

        // AI Move Logic
        if (this.gameMode === 'ai' && currentPId === 'yellow') {
            setTimeout(() => {
                const bestToken = this.chooseAiToken(legalIndices, val);
                this.executeTokenMove('yellow', bestToken);
            }, 600);
        } else if (this.gameMode === 'online') {
            if (currentPId === this.myRole) {
                if (legalIndices.length === 1) {
                    setTimeout(() => {
                        this.userSelectToken(currentPId, legalIndices[0]);
                    }, 450);
                } else {
                    this.showStatus(`Rolled ${val}! Select a highlighted pawn.`);
                }
            } else {
                this.showStatus(`Opponent rolled ${val}! Waiting for them to move... ⏳`);
            }
        } else if (legalIndices.length === 1) {
            // Auto-move single legal pawn
            setTimeout(() => {
                this.executeTokenMove(currentPId, legalIndices[0]);
            }, 450);
        } else {
            this.showStatus(`Rolled ${val}! Select a highlighted pawn.`);
        }
    }

    canTokenMove(playerId, tokenIndex, roll) {
        const curStep = this.playerConfigs[playerId].tokens[tokenIndex];

        // Yard token: needs a 6 to open
        if (curStep === -1) {
            return roll === 6;
        }

        // Already at Crown
        if (curStep >= 56) return false;

        // Must land exactly on Crown 56
        if (curStep + roll > 56) return false;

        return true;
    }

    highlightTokens(playerId, tokenIndices) {
        this.clearHighlights();
        tokenIndices.forEach(idx => {
            const mesh = this.playerConfigs[playerId].meshList[idx];
            if (mesh && mesh.userData.aura) {
                mesh.userData.aura.visible = true;
            }
        });
    }

    clearHighlights() {
        Object.values(this.playerConfigs).forEach(p => {
            p.meshList.forEach(m => {
                if (m && m.userData.aura) m.userData.aura.visible = false;
            });
        });
    }

    executeTokenMove(playerId, tokenIndex) {
        if (this.isMoving) return;
        this.isMoving = true;
        this.clearHighlights();

        const curStep = this.playerConfigs[playerId].tokens[tokenIndex];
        const roll = this.diceRolled;
        const mesh = this.playerConfigs[playerId].meshList[tokenIndex];

        // 1. Moving OUT of Yard onto Start Square
        if (curStep === -1) {
            this.playerConfigs[playerId].tokens[tokenIndex] = 0;
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
                    this.playerConfigs[playerId].tokens[tokenIndex] = targetStep;
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
        const duration = 150; // ms
        const startTime = performance.now();
        const hopHeight = 0.32;

        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1.0);

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
        const finalStep = this.playerConfigs[playerId].tokens[tokenIndex];

        // 1. Victory Check
        const allFinished = this.playerConfigs[playerId].tokens.slice(0, this.tokenCount).every(s => s === 56);
        if (allFinished) {
            this.handleVictory(playerId);
            return;
        }

        // 2. Capture Opponent Check
        let captured = false;
        if (finalStep >= 0 && finalStep <= 50) {
            const trackIdx = this.getTrackIndex(playerId, finalStep);
            const isSafe = this.board.safeIndices.includes(trackIdx);

            if (!isSafe) {
                // Check all other active opponents
                this.activePlayerIds.forEach(oppId => {
                    if (oppId === playerId) return;
                    for (let oIdx = 0; oIdx < this.tokenCount; oIdx++) {
                        const oppStep = this.playerConfigs[oppId].tokens[oIdx];
                        if (oppStep >= 0 && oppStep <= 50) {
                            if (this.getTrackIndex(oppId, oppStep) === trackIdx) {
                                // CAPTURE! Send opponent back to base
                                captured = true;
                                this.playerConfigs[oppId].tokens[oIdx] = -1;
                                const oppMesh = this.playerConfigs[oppId].meshList[oIdx];
                                const yardPos = this.getStepWorldPos(oppId, -1, oIdx);

                                if (window.ludoAudio) window.ludoAudio.playCapture();
                                this.showStatus(`💥 ${this.playerConfigs[playerId].name} captured ${this.playerConfigs[oppId].name}! Bonus Turn!`);

                                this.animateHopTo(oppMesh, yardPos, () => {});
                                break;
                            }
                        }
                    }
                });
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
            const currentPId = this.activePlayerIds[this.currentTurnIdx];
            this.showStatus(`🎉 Bonus Turn for ${this.playerConfigs[currentPId].name}!`);
        } else {
            this.currentTurnIdx = (this.currentTurnIdx + 1) % this.activePlayerIds.length;
            const nextPId = this.activePlayerIds[this.currentTurnIdx];
            this.showStatus(`${this.playerConfigs[nextPId].name}'s Turn`);
        }

        this.updateUI();

        // Online mode turn status and button gating
        if (this.gameMode === 'online') {
            const activePId = this.activePlayerIds[this.currentTurnIdx];
            const isMyTurn = (activePId === this.myRole) && this.isMatchStarted;
            const btnRoll = document.getElementById('btn-roll-dice');
            if (btnRoll) btnRoll.disabled = !isMyTurn;

            if (!this.isMatchStarted) {
                this.showStatus('Waiting for friend to accept challenge... ⏳');
            } else if (isMyTurn) {
                this.showStatus('Your turn! Roll the 3D dice 🎲');
            } else {
                this.showStatus(`Waiting for ${this.playerConfigs[activePId].name} to roll... ⏳`);
            }
            return;
        }

        // AI trigger
        const activePId = this.activePlayerIds[this.currentTurnIdx];
        if (this.gameMode === 'ai' && activePId === 'yellow' && !this.winner) {
            setTimeout(() => {
                this.handleRollClick();
            }, 750);
        }
    }

    chooseAiToken(legalIndices, roll) {
        // AI move selection priority
        // 1. Move to Crown 56
        for (const idx of legalIndices) {
            if (this.playerConfigs.yellow.tokens[idx] + roll === 56) return idx;
        }

        // 2. Capture opponent
        for (const idx of legalIndices) {
            const step = this.playerConfigs.yellow.tokens[idx];
            if (step >= 0 && step <= 50) {
                const targetTrack = this.getTrackIndex('yellow', step + roll);
                if (!this.board.safeIndices.includes(targetTrack)) {
                    for (const oppId of this.activePlayerIds) {
                        if (oppId === 'yellow') return;
                        for (let o = 0; o < this.tokenCount; o++) {
                            const oppStep = this.playerConfigs[oppId].tokens[o];
                            if (this.getTrackIndex(oppId, oppStep) === targetTrack) {
                                return idx;
                            }
                        }
                    }
                }
            }
        }

        // 3. Open pawn from yard on 6
        if (roll === 6) {
            const yardToken = legalIndices.find(idx => this.playerConfigs.yellow.tokens[idx] === -1);
            if (yardToken !== undefined) return yardToken;
        }

        // 4. Advance closest pawn
        return legalIndices[0];
    }

    handleVictory(playerId) {
        this.winner = this.playerConfigs[playerId].name;
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
        this.currentTurnIdx = 0;

        Object.values(this.playerConfigs).forEach(p => {
            p.tokens = [-1, -1, -1, -1];
        });

        this.spawnTokens();
        this.dice.setFaceUp(6);
        this.clearHighlights();

        const firstPId = this.activePlayerIds[0];
        if (this.gameMode === 'online') {
            const isMyTurn = (firstPId === this.myRole) && this.isMatchStarted;
            const btnRoll = document.getElementById('btn-roll-dice');
            if (btnRoll) btnRoll.disabled = !isMyTurn;
            if (!this.isMatchStarted) {
                this.showStatus('Waiting for friend to accept challenge... ⏳');
            } else {
                this.showStatus(isMyTurn ? 'New Game! Your turn to roll 🎲' : `New Game! ${this.playerConfigs[firstPId].name} rolls first.`);
            }
        } else {
            this.showStatus(`New Game! ${this.playerConfigs[firstPId].name} rolls first.`);
        }
        this.updateUI();
    }

    showStatus(text) {
        const el = document.getElementById('status-banner');
        if (el) el.textContent = text;
    }

    updateUI() {
        const activePId = this.activePlayerIds[this.currentTurnIdx];
        const container = document.getElementById('players-bar');
        if (!container) return;

        container.innerHTML = '';
        this.activePlayerIds.forEach(pId => {
            const p = this.playerConfigs[pId];
            const isTurn = pId === activePId;
            const finishedCount = p.tokens.slice(0, this.tokenCount).filter(s => s === 56).length;

            const card = document.createElement('div');
            card.className = `player-hud-card ${pId} ${isTurn ? 'active-turn' : ''}`;
            card.innerHTML = `
                <div class="player-indicator" style="background: #${p.colorHex.toString(16).padStart(6, '0')};"></div>
                <div class="player-info">
                    <span class="player-name">${p.name}</span>
                    <span class="player-score">${finishedCount}/${this.tokenCount} Home</span>
                </div>
            `;
            container.appendChild(card);
        });
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.ludoGame = new ClassicLudo3D();
});
