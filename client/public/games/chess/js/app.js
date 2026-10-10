// Zen Chess 3D - Main Application Controller

class ChessApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.chess = new Chess();
        this.pieceFactory = new ChessPieceFactory();
        this.ai = new ChessAI();
        
        this.gameMode = 'ai'; // 'ai' | 'online' | 'local'
        this.playerColor = 'w'; // In online: 'w' for host, 'b' for joiner
        this.selectedSquare = null;
        this.validMoves = [];
        this.pieceMeshes = {}; // 'e2' -> THREE.Group
        this.capturedPieces = { w: [], b: [] };
        
        // Timers (seconds)
        this.timeControl = 600;
        this.timers = { w: 600, b: 600 };
        this.timerInterval = null;

        // Animation state
        this.animatingPieces = [];

        this.initThree();
        this.initBoard();
        this.initMultiplayer();
        this.initEvents();
        this.setupNewGame();

        // Check for URL invite link: e.g. #room=ZEN-XYZ
        this.checkUrlForRoom();

        // Animation loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initThree() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0c10);

        // Natural 3D Perspective Camera (framed for mobile portrait & desktop)
        const isMobile = window.innerWidth < 768;
        this.camera = new THREE.PerspectiveCamera(isMobile ? 54 : 44, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, isMobile ? 11.0 : 8.2, isMobile ? 9.0 : 7.8);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0; // Natural, balanced exposure
        this.container.appendChild(this.renderer.domElement);

        // OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.15;
        this.controls.minDistance = 3.5;
        this.controls.maxDistance = 18;
        this.controls.target.set(0, 0.35, 0);

        // Soft, Diffused Studio Lighting (No harsh white glare)
        const ambient = new THREE.AmbientLight(0xfdfbf7, 0.95);
        this.scene.add(ambient);

        // Gentle Key Light (Soft warm shadow caster)
        const keyLight = new THREE.DirectionalLight(0xfff5ea, 0.70);
        keyLight.position.set(4, 16, 8);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 30;
        const d = 6.5;
        keyLight.shadow.camera.left = -d;
        keyLight.shadow.camera.right = d;
        keyLight.shadow.camera.top = d;
        keyLight.shadow.camera.bottom = -d;
        keyLight.shadow.bias = -0.0003;
        this.scene.add(keyLight);

        // Soft Back Fill Light (subtle edge definition)
        const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.55);
        fillLight.position.set(-4, 14, -8);
        this.scene.add(fillLight);

        // Seamless Shadow Receiver (Zero color difference or horizon line!)
        const floorGeo = new THREE.PlaneGeometry(80, 80);
        const floorMat = new THREE.ShadowMaterial({
            opacity: 0.45
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.19;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Raycaster for mouse clicks
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        window.addEventListener('resize', () => {
            const isMob = window.innerWidth < 768;
            this.camera.fov = isMob ? 54 : 44;
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initBoard() {
        this.board = new ChessBoard3D(this.scene);
    }

    setupNewGame() {
        this.chess.reset();
        this.selectedSquare = null;
        this.validMoves = [];
        this.capturedPieces = { w: [], b: [] };
        this.board.clearHighlights();
        this.board.setCheckHighlight(null);

        // Clear existing 3D pieces
        Object.values(this.pieceMeshes).forEach(mesh => {
            this.scene.remove(mesh);
        });
        this.pieceMeshes = {};

        // Spawn pieces according to initial board
        const boardState = this.chess.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = boardState[r][c];
                if (piece) {
                    const file = String.fromCharCode('a'.charCodeAt(0) + c);
                    const rank = 8 - r;
                    const sq = `${file}${rank}`;
                    this.spawnPiece(piece.type, piece.color, sq);
                }
            }
        }

        // Reset Timers
        this.timers = { w: this.timeControl, b: this.timeControl };
        this.updateTimerDisplay();
        this.startTimer();

        // Update UI
        this.updateUI();
        this.updateHistoryUI();
        this.updateCapturedUI();

        if (this.gameMode === 'online' && this.playerColor === 'b') {
            this.setCameraView('b');
        } else {
            this.setCameraView('w');
        }
    }

    spawnPiece(type, color, square) {
        const mesh = this.pieceFactory.createPieceMesh(type, color);
        const pos = this.board.getSquarePos(square);
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.userData = { pieceType: type, pieceColor: color, square: square };
        this.scene.add(mesh);
        this.pieceMeshes[square] = mesh;
    }

    initMultiplayer() {
        this.mp = new MultiplayerManager({
            onRoomCreated: (roomCode) => {
                document.getElementById('display-room-code').textContent = roomCode;
                window.location.hash = `room=${roomCode}`;
            },
            onConnected: ({ isHost, myColor }) => {
                this.playerColor = myColor;
                document.getElementById('modal-invite').classList.remove('open');
                this.showStatusNotification(`Connected to match! You are playing ${myColor === 'w' ? 'White' : 'Black'}.`);
                document.getElementById('call-status-label').textContent = 'Ready to Call';
                this.setupNewGame();
            },
            onLocalStream: (stream) => {
                const localVideo = document.getElementById('local-video');
                localVideo.srcObject = stream;
                localVideo.classList.add('active');
            },
            onRemoteStream: (stream) => {
                const remoteVideo = document.getElementById('remote-video');
                remoteVideo.srcObject = stream;
                remoteVideo.classList.add('active');
                document.getElementById('video-placeholder').style.display = 'none';
                const callBtn = document.getElementById('btn-start-call');
                callBtn.classList.remove('btn-call-start');
                callBtn.classList.add('btn-call-active');
                callBtn.innerHTML = '<i class="fa-solid fa-phone-slash"></i>';
            },
            onCallEnded: () => {
                const remoteVideo = document.getElementById('remote-video');
                remoteVideo.srcObject = null;
                remoteVideo.classList.remove('active');
                const localVideo = document.getElementById('local-video');
                localVideo.srcObject = null;
                localVideo.classList.remove('active');
                document.getElementById('video-placeholder').style.display = 'flex';
                document.getElementById('call-status-label').textContent = 'Call Inactive';
                const callBtn = document.getElementById('btn-start-call');
                callBtn.classList.add('btn-call-start');
                callBtn.classList.remove('btn-call-active');
                callBtn.innerHTML = '<i class="fa-solid fa-phone"></i>';
            },
            onRemoteMove: (move) => {
                this.executeMove(move, false);
            },
            onChatMessage: (text, sender) => {
                this.appendChatMessage(text, 'them');
                window.soundSystem.playMessage();
            },
            onEmojiReaction: (emoji, sender) => {
                this.showFloatingReaction(emoji);
                window.soundSystem.playMessage();
            },
            onOpponentResign: () => {
                this.showGameOverModal('Opponent Resigned', 'Congratulations! You won by resignation.');
            },
            onError: (err) => {
                this.showStatusNotification(`Connection Error: ${err.message || 'Room not found'}`);
            }
        });
    }

    checkUrlForRoom() {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#room=')) {
            const roomCode = hash.replace('#room=', '').trim();
            if (roomCode) {
                this.setGameMode('online');
                setTimeout(() => {
                    this.mp.joinRoom(roomCode);
                    this.showStatusNotification(`Joining room: ${roomCode}...`);
                }, 800);
            }
        }
    }

    initEvents() {
        // Click / Touch piece selection
        const onPointerDown = (event) => {
            // Ignore if clicked on UI
            if (event.target.closest('.interactive')) return;

            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);

            for (const hit of intersects) {
                let obj = hit.object;

                // 1. Check if clicked on a valid move target disk
                if (obj.userData && obj.userData.isMoveTarget) {
                    this.handleSquareSelect(obj.userData.targetSquare);
                    return;
                }

                // 2. Traverse up to find piece or square
                let current = obj;
                while (current && current !== this.scene) {
                    if (current.userData && current.userData.square) {
                        this.handleSquareSelect(current.userData.square);
                        return;
                    }
                    current = current.parent;
                }
            }
        };

        window.addEventListener('pointerdown', onPointerDown);

        // Top Game Mode Buttons
        ['ai', 'online', 'local'].forEach(mode => {
            const btn = document.getElementById(`btn-mode-${mode}`);
            if (btn) {
                btn.addEventListener('click', () => this.setGameMode(mode));
            }
        });

        // Navigation Actions
        document.getElementById('btn-open-invite').addEventListener('click', () => {
            this.openInviteModal();
        });

        document.getElementById('btn-close-invite').addEventListener('click', () => {
            document.getElementById('modal-invite').classList.remove('open');
        });

        document.getElementById('btn-copy-link').addEventListener('click', () => {
            const code = document.getElementById('display-room-code').textContent;
            const url = `${window.location.origin}${window.location.pathname}#room=${code}`;
            navigator.clipboard.writeText(url).then(() => {
                this.showStatusNotification('Invite link copied to clipboard!');
            });
        });

        document.getElementById('btn-whatsapp').addEventListener('click', () => {
            const code = document.getElementById('display-room-code').textContent;
            const url = `${window.location.origin}${window.location.pathname}#room=${code}`;
            const msg = encodeURIComponent(`Let's play 3D Chess together! Join my match here: ${url}`);
            window.open(`https://wa.me/?text=${msg}`, '_blank');
        });

        document.getElementById('btn-join-room').addEventListener('click', () => {
            const code = document.getElementById('input-join-code').value.trim();
            if (code) {
                this.setGameMode('online');
                this.mp.joinRoom(code);
                this.showStatusNotification(`Connecting to ${code}...`);
            }
        });

        // New Game Control (Now placed above player profiles)
        document.getElementById('btn-new-game').addEventListener('click', () => this.setupNewGame());

        // Sidebar Minimize / Expand Toggles
        const btnToggleLeft = document.getElementById('btn-toggle-left-sidebar');
        if (btnToggleLeft) {
            btnToggleLeft.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar-left');
                const isMini = sidebar.classList.toggle('is-minimized');
                const icon = document.getElementById('icon-toggle-left');
                if (icon) {
                    icon.className = isMini ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left';
                }
            });
        }

        const btnToggleRight = document.getElementById('btn-toggle-right-sidebar');
        if (btnToggleRight) {
            btnToggleRight.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar-right');
                const isMini = sidebar.classList.toggle('is-minimized');
                const icon = document.getElementById('icon-toggle-right');
                if (icon) {
                    icon.className = isMini ? 'fa-solid fa-chevron-left' : 'fa-solid fa-chevron-right';
                }
            });
        }
        
        // Audio Toggle
        document.getElementById('btn-mute').addEventListener('click', (e) => {
            window.soundSystem.muted = !window.soundSystem.muted;
            const icon = e.currentTarget.querySelector('i');
            icon.className = window.soundSystem.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
        });

        // Time Control Change
        document.getElementById('select-time').addEventListener('change', (e) => {
            this.timeControl = parseInt(e.target.value, 10);
            this.timers = { w: this.timeControl, b: this.timeControl };
            this.updateTimerDisplay();
        });

        // Promotion Buttons
        document.querySelectorAll('.promo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const promo = e.currentTarget.getAttribute('data-promo');
                document.getElementById('modal-promotion').classList.remove('open');
                if (this.pendingPromotion) {
                    this.finalizeMove({
                        from: this.pendingPromotion.from,
                        to: this.pendingPromotion.to,
                        promotion: promo
                    });
                    this.pendingPromotion = null;
                }
            });
        });

        // Video Call Controls
        document.getElementById('btn-start-call').addEventListener('click', async () => {
            if (this.mp.mediaCall || this.mp.localStream) {
                this.mp.endCall();
            } else {
                try {
                    await this.mp.startVideoCall();
                    const callBtn = document.getElementById('btn-start-call');
                    callBtn.classList.remove('btn-call-start');
                    callBtn.classList.add('btn-call-active');
                    callBtn.innerHTML = '<i class="fa-solid fa-phone-slash"></i>';
                } catch (e) {
                    this.showStatusNotification('Invite & connect to a friend first, or grant camera permissions.');
                }
            }
        });

        document.getElementById('btn-toggle-cam').addEventListener('click', (e) => {
            const active = this.mp.toggleCam();
            e.currentTarget.classList.toggle('muted', !active);
        });

        document.getElementById('btn-toggle-mic').addEventListener('click', (e) => {
            const active = this.mp.toggleMic();
            e.currentTarget.classList.toggle('muted', !active);
        });

        // In-Panel Match Chat
        document.getElementById('panel-chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('panel-chat-input');
            const text = input.value.trim();
            if (text) {
                this.appendChatMessage(text, 'me');
                if (this.mp.connected) {
                    this.mp.sendChat(text, 'Player');
                }
                input.value = '';
            }
        });

        // Emojis
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const emoji = btn.getAttribute('data-emoji');
                this.showFloatingReaction(emoji);
                if (this.mp.connected) {
                    this.mp.sendEmoji(emoji);
                }
            });
        });

        // Floating Chat Toggle / Minimizer
        const btnToggleChat = document.getElementById('btn-toggle-chat');
        const floatingChat = document.getElementById('floating-chat');
        if (btnToggleChat && floatingChat) {
            if (window.innerWidth < 768) {
                floatingChat.classList.add('minimized');
                const icon = document.getElementById('chat-toggle-icon');
                if (icon) icon.className = 'fa-solid fa-chevron-up';
            }
            btnToggleChat.addEventListener('click', () => {
                floatingChat.classList.toggle('minimized');
                const isMin = floatingChat.classList.contains('minimized');
                const icon = document.getElementById('chat-toggle-icon');
                if (icon) {
                    icon.className = isMin ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
                }
            });
        }

        // Game Over Buttons
        document.getElementById('btn-gameover-rematch').addEventListener('click', () => {
            document.getElementById('modal-gameover').classList.remove('open');
            this.setupNewGame();
        });
        document.getElementById('btn-close-gameover').addEventListener('click', () => {
            document.getElementById('modal-gameover').classList.remove('open');
        });
    }

    setGameMode(mode) {
        this.gameMode = mode;
        ['ai', 'online', 'local'].forEach(m => {
            const el = document.getElementById(`btn-mode-${m}`);
            if (el) el.classList.toggle('active', m === mode);
        });

        // Update UI panels based on mode
        const aiWrapper = document.getElementById('ai-difficulty-wrapper');
        if (mode === 'ai') {
            if (aiWrapper) aiWrapper.style.display = 'flex';
            document.getElementById('name-black').textContent = 'Chess AI';
            document.getElementById('tag-black').textContent = 'Computer';
            this.playerColor = 'w';
        } else if (mode === 'online') {
            if (aiWrapper) aiWrapper.style.display = 'none';
            document.getElementById('name-black').textContent = 'Remote Friend';
            document.getElementById('tag-black').textContent = 'Online Opponent';
            this.openInviteModal();
        } else {
            // Local
            if (aiWrapper) aiWrapper.style.display = 'none';
            document.getElementById('name-black').textContent = 'Black Player';
            document.getElementById('tag-black').textContent = 'Local Friend';
        }

        this.setupNewGame();
    }

    openInviteModal() {
        const modal = document.getElementById('modal-invite');
        modal.classList.add('open');
        if (!this.mp.myPeerId) {
            this.mp.createRoom();
        } else {
            document.getElementById('display-room-code').textContent = this.mp.myPeerId;
        }
    }

    handleSquareSelect(square) {
        if (this.animatingPieces.length > 0) return; // Wait during move anim
        if (this.chess.game_over()) return;

        // In AI mode, restrict moving when it's AI's turn
        if (this.gameMode === 'ai' && this.chess.turn() !== this.playerColor) return;
        // In Online mode, restrict moving when not your turn or color
        if (this.gameMode === 'online' && this.chess.turn() !== this.playerColor) return;

        // If a piece is already selected, check if clicked square is a valid target
        if (this.selectedSquare) {
            const isTarget = this.validMoves.some(m => m.to === square);
            if (isTarget) {
                const moveData = this.validMoves.find(m => m.to === square);
                
                // Pawn Promotion check
                if (moveData.flags && moveData.flags.includes('p')) {
                    this.pendingPromotion = { from: this.selectedSquare, to: square };
                    document.getElementById('modal-promotion').classList.add('open');
                    return;
                }

                this.finalizeMove({ from: this.selectedSquare, to: square });
                return;
            }
        }

        // Otherwise select piece on square if it's the current player's piece
        const piece = this.chess.get(square);
        if (piece && piece.color === this.chess.turn()) {
            this.selectedSquare = square;
            this.board.highlightSelected(square);

            const legalMoves = this.chess.moves({ square: square, verbose: true });
            this.validMoves = legalMoves;
            this.board.highlightMoves(legalMoves.map(m => m.to));
        } else {
            this.selectedSquare = null;
            this.validMoves = [];
            this.board.clearHighlights();
        }
    }

    finalizeMove(moveObj) {
        this.board.clearHighlights();
        this.selectedSquare = null;
        this.validMoves = [];

        const move = this.chess.move(moveObj);
        if (!move) return;

        // Broadcast move in online match
        if (this.gameMode === 'online' && this.mp.connected) {
            this.mp.sendMove(moveObj);
        }

        this.animateAndApplyMove(move);
    }

    executeMove(moveObj, local = false) {
        const move = this.chess.move(moveObj);
        if (move) {
            this.animateAndApplyMove(move);
        }
    }

    animateAndApplyMove(move) {
        const fromSquare = move.from;
        const toSquare = move.to;
        const movingMesh = this.pieceMeshes[fromSquare];
        delete this.pieceMeshes[fromSquare];

        const targetPos = this.board.getSquarePos(toSquare);

        // Handle Capture
        if (move.captured) {
            const capturedMesh = this.pieceMeshes[toSquare];
            if (capturedMesh) {
                this.scene.remove(capturedMesh);
                delete this.pieceMeshes[toSquare];
            }
            this.capturedPieces[move.color].push(move.captured);
            window.soundSystem.playCapture();
        } else {
            window.soundSystem.playMove();
        }

        // Handle Castling Rook move
        if (move.flags && move.flags.includes('k')) { // Kingside
            const rank = move.color === 'w' ? '1' : '8';
            this.movePieceMeshInstant(`h${rank}`, `f${rank}`);
        } else if (move.flags && move.flags.includes('q')) { // Queenside
            const rank = move.color === 'w' ? '1' : '8';
            this.movePieceMeshInstant(`a${rank}`, `d${rank}`);
        }

        // Handle En Passant
        if (move.flags && move.flags.includes('e')) {
            const capturedSq = `${toSquare[0]}${fromSquare[1]}`;
            const epMesh = this.pieceMeshes[capturedSq];
            if (epMesh) {
                this.scene.remove(epMesh);
                delete this.pieceMeshes[capturedSq];
            }
        }

        // Handle Pawn Promotion mesh replacement
        if (move.promotion) {
            this.scene.remove(movingMesh);
            this.spawnPiece(move.promotion, move.color, toSquare);
        } else if (movingMesh) {
            // Smooth Parabolic Arc Jump Animation
            const startPos = movingMesh.position.clone();
            const endPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
            const duration = 280; // ms
            const startTime = performance.now();

            this.animatingPieces.push({
                mesh: movingMesh,
                start: startPos,
                end: endPos,
                startTime: startTime,
                duration: duration
            });

            this.pieceMeshes[toSquare] = movingMesh;
            movingMesh.userData.square = toSquare;
        }

        // Check or Checkmate sounds
        if (this.chess.in_checkmate()) {
            window.soundSystem.playVictory();
        } else if (this.chess.in_check()) {
            window.soundSystem.playCheck();
        }

        this.updateUI();
        this.updateHistoryUI();
        this.updateCapturedUI();

        // Handle Next Turn (e.g. AI turn trigger)
        this.onTurnChanged();
    }

    movePieceMeshInstant(fromSq, toSq) {
        const mesh = this.pieceMeshes[fromSq];
        if (mesh) {
            delete this.pieceMeshes[fromSq];
            const pos = this.board.getSquarePos(toSq);
            mesh.position.set(pos.x, pos.y, pos.z);
            mesh.userData.square = toSq;
            this.pieceMeshes[toSq] = mesh;
        }
    }

    onTurnChanged() {
        // Highlight in check King
        if (this.chess.in_check()) {
            const kingSq = this.findKingSquare(this.chess.turn());
            this.board.setCheckHighlight(kingSq);
        } else {
            this.board.setCheckHighlight(null);
        }

        // Check Game Over
        if (this.chess.game_over()) {
            this.stopTimer();
            let reason = 'Game Drawn!';
            if (this.chess.in_checkmate()) {
                const winner = this.chess.turn() === 'w' ? 'Black' : 'White';
                reason = `Checkmate! ${winner} wins.`;
            } else if (this.chess.in_stalemate()) {
                reason = 'Draw by Stalemate.';
            } else if (this.chess.in_threefold_repetition()) {
                reason = 'Draw by Threefold Repetition.';
            } else if (this.chess.insufficient_material()) {
                reason = 'Draw by Insufficient Material.';
            }
            this.showGameOverModal('Game Over', reason);
            return;
        }

        // Trigger AI move if single player
        if (this.gameMode === 'ai' && this.chess.turn() === 'b') {
            const diff = document.getElementById('select-difficulty').value;
            setTimeout(() => {
                const aiMove = this.ai.getBestMove(this.chess, diff);
                if (aiMove) {
                    this.executeMove(aiMove, false);
                }
            }, 450);
        }
    }

    findKingSquare(color) {
        const board = this.chess.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p && p.type === 'k' && p.color === color) {
                    return `${String.fromCharCode('a'.charCodeAt(0) + c)}${8 - r}`;
                }
            }
        }
        return null;
    }

    undoMove() {
        if (this.gameMode === 'online') return; // No undo in online multiplayer
        if (this.chess.history().length === 0) return;

        // In AI mode, undo two moves (player and AI)
        if (this.gameMode === 'ai') {
            this.chess.undo();
            this.chess.undo();
        } else {
            this.chess.undo();
        }

        // Reconstruct board meshes
        this.board.clearHighlights();
        this.board.setCheckHighlight(null);
        Object.values(this.pieceMeshes).forEach(m => this.scene.remove(m));
        this.pieceMeshes = {};

        const boardState = this.chess.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = boardState[r][c];
                if (p) {
                    const sq = `${String.fromCharCode('a'.charCodeAt(0) + c)}${8 - r}`;
                    this.spawnPiece(p.type, p.color, sq);
                }
            }
        }

        this.updateUI();
        this.updateHistoryUI();
    }

    // Camera Views (Natural 3D Perspective)
    setCameraView(color) {
        const isMob = window.innerWidth < 768;
        const targetZ = color === 'w' ? (isMob ? 9.0 : 7.8) : (isMob ? -9.0 : -7.8);
        this.camera.position.set(0, isMob ? 11.0 : 8.2, targetZ);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0.35, 0);
    }

    toggleCameraView() {
        const currentZ = this.camera.position.z;
        this.setCameraView(currentZ > 0 ? 'b' : 'w');
    }

    resetCamera() {
        this.setCameraView(this.playerColor);
    }

    // Clocks
    startTimer() {
        this.stopTimer();
        if (this.timeControl === 0) return; // Unlimited

        this.timerInterval = setInterval(() => {
            const turn = this.chess.turn();
            this.timers[turn]--;

            if (this.timers[turn] <= 0) {
                this.timers[turn] = 0;
                this.stopTimer();
                const winner = turn === 'w' ? 'Black' : 'White';
                this.showGameOverModal('Time Out!', `${winner} wins on time.`);
            }

            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const fmt = (s) => {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        };

        const wEl = document.getElementById('timer-white');
        const bEl = document.getElementById('timer-black');
        if (this.timeControl === 0) {
            wEl.textContent = '∞';
            bEl.textContent = '∞';
        } else {
            wEl.textContent = fmt(this.timers.w);
            bEl.textContent = fmt(this.timers.b);
        }
    }

    // UI Updates
    updateUI() {
        const turn = this.chess.turn();
        const turnText = turn === 'w' ? "White's Turn" : "Black's Turn";
        document.getElementById('status-text').textContent = turnText;
        
        document.getElementById('card-white').classList.toggle('active-turn', turn === 'w');
        document.getElementById('card-black').classList.toggle('active-turn', turn === 'b');
    }

    updateHistoryUI() {
        // Move history table removed in favor of live video call and match chat
    }

    updateCapturedUI() {
        const pieceIcons = {
            p: '♙', n: '♘', b: '♗', r: '♖', q: '♕'
        };

        const wBox = document.getElementById('captured-white');
        const bBox = document.getElementById('captured-black');
        if (wBox) wBox.innerHTML = this.capturedPieces.w.map(p => pieceIcons[p] || '').join(' ');
        if (bBox) bBox.innerHTML = this.capturedPieces.b.map(p => pieceIcons[p] || '').join(' ');
    }

    appendChatMessage(text, type) {
        const box = document.getElementById('panel-chat-messages') || document.getElementById('chat-messages');
        if (!box) return;
        const msg = document.createElement('div');
        msg.className = `chat-msg ${type}`;
        msg.textContent = text;
        box.appendChild(msg);
        box.scrollTop = box.scrollHeight;
    }

    showFloatingReaction(emoji) {
        const el = document.createElement('div');
        el.className = 'floating-reaction';
        el.textContent = emoji;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1800);
    }

    showStatusNotification(text) {
        const dot = document.getElementById('status-dot');
        const txt = document.getElementById('status-text');
        txt.textContent = text;
        setTimeout(() => this.updateUI(), 3500);
    }

    showGameOverModal(title, reason) {
        document.getElementById('gameover-title').textContent = title;
        document.getElementById('gameover-reason').textContent = reason;
        document.getElementById('modal-gameover').classList.add('open');
    }

    // Animation Loop
    animate(time) {
        requestAnimationFrame(this.animate);

        // Animate piece movement arcs
        for (let i = this.animatingPieces.length - 1; i >= 0; i--) {
            const item = this.animatingPieces[i];
            const elapsed = time - item.startTime;
            const progress = Math.min(elapsed / item.duration, 1.0);

            // Smooth ease in-out
            const t = 0.5 - 0.5 * Math.cos(progress * Math.PI);

            // Parabolic lift height
            const lift = Math.sin(progress * Math.PI) * 0.8;

            item.mesh.position.x = THREE.MathUtils.lerp(item.start.x, item.end.x, t);
            item.mesh.position.z = THREE.MathUtils.lerp(item.start.z, item.end.z, t);
            item.mesh.position.y = THREE.MathUtils.lerp(item.start.y, item.end.y, t) + lift;

            if (progress >= 1.0) {
                item.mesh.position.copy(item.end);
                this.animatingPieces.splice(i, 1);
            }
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

window.ChessApp = ChessApp;

// Start app once DOM is ready (handles both loading and already complete)
function startZenChess() {
    if (!window.chessApp) {
        window.chessApp = new ChessApp();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startZenChess);
} else {
    startZenChess();
}
