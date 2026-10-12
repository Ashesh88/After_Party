// Couples 3D Pool - Master Game Controller & Professional 8-Ball Engine
// Direct Felt Tap-To-Aim, Orbit Controls Isolation, Dual Deflection Trajectory Guide,
// Live Miniature Ball Racks HUD, Multiplayer Socket Sync & Air-Glass Floating Chat

class PoolGameApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.clock = new THREE.Clock();

        // Parse URL query parameters
        const params = new URLSearchParams(window.location.search);
        this.mode = params.get('mode') || '2p'; // 'online', 'ai', '2p'
        this.sessionCode = params.get('code') || null;
        this.myRole = params.get('role') || 'p1'; // 'p1' or 'p2'

        const rawP1 = params.get('name') || 'Player 1';
        const rawP2 = params.get('opponent') || 'Player 2';

        this.currentTurn = 'p1'; // 'p1' or 'p2'
        this.playerGroups = { p1: null, p2: null }; // 'solids' (1-7) or 'stripes' (9-15)
        
        if (this.mode === 'online') {
            this.playerNames = {
                p1: this.myRole === 'p1' ? `${rawP1} (You)` : rawP2,
                p2: this.myRole === 'p2' ? `${rawP1} (You)` : rawP2
            };
        } else if (this.mode === 'ai') {
            this.playerNames = {
                p1: rawP1,
                p2: 'Smart AI Bot'
            };
        } else {
            this.playerNames = {
                p1: rawP1,
                p2: rawP2
            };
        }

        this.aimAngle = 0; // Point towards foot rack initially
        this.power = 0.5; // 0.1 to 1.0
        this.isShotActive = false;
        this.cueBallScratch = false;
        this.isBreakShot = true;
        this.isBallInHand = false;
        this.ballInHandValid = true;
        this.pocketedThisShot = [];
        this.cameraViewMode = 'top'; // Default to Top-Down tactical view

        this.initThree();
        this.initEntities();
        this.initEvents();
        this.setCameraView(this.cameraViewMode);
        this.updateHUD();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0c10);

        const isMobile = window.innerWidth < 768;
        this.camera = new THREE.PerspectiveCamera(isMobile ? 54 : 42, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, isMobile ? 9.8 : 7.8, isMobile ? 6.8 : 6.2);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.enableRotate = true;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.rotateSpeed = 0.85;
        this.controls.zoomSpeed = 1.0;
        this.controls.maxPolarAngle = Math.PI / 2.08; // Keep above table surface
        this.controls.minDistance = 2.5;
        this.controls.maxDistance = 16;
        this.controls.target.set(0, 0, 0);
        this.controls.enabled = false; // Disabled by default in cue/top mode

        // Diffused Overhead Lighting (Eye-friendly, matte)
        const ambient = new THREE.AmbientLight(0xfff7ed, 0.65);
        this.scene.add(ambient);

        // Overhead Pendant Light
        const tableLight = new THREE.DirectionalLight(0xfffaed, 0.85);
        tableLight.position.set(0, 10, 0);
        tableLight.castShadow = true;
        tableLight.shadow.mapSize.width = 2048;
        tableLight.shadow.mapSize.height = 2048;
        tableLight.shadow.camera.near = 1;
        tableLight.shadow.camera.far = 15;
        tableLight.shadow.camera.left = -5;
        tableLight.shadow.camera.right = 5;
        tableLight.shadow.camera.top = 3;
        tableLight.shadow.camera.bottom = -3;
        tableLight.shadow.bias = -0.0005;
        this.scene.add(tableLight);

        // Subtle Fill Lights
        const fill1 = new THREE.DirectionalLight(0x38bdf8, 0.25);
        fill1.position.set(-8, 5, 4);
        this.scene.add(fill1);

        const fill2 = new THREE.DirectionalLight(0xf472b6, 0.2);
        fill2.position.set(8, 5, -4);
        this.scene.add(fill2);

        // Floor Shadow Catcher
        const floorGeo = new THREE.PlaneGeometry(40, 40);
        const floorMat = new THREE.ShadowMaterial({ opacity: 0.35 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1.95;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Felt Raycasting Target Plane (Invisible)
        const feltGeo = new THREE.PlaneGeometry(7.2, 3.6);
        const feltMat = new THREE.MeshBasicMaterial({ visible: false });
        this.feltPlane = new THREE.Mesh(feltGeo, feltMat);
        this.feltPlane.rotation.x = -Math.PI / 2;
        this.feltPlane.position.y = 0.10; // Ball radius height
        this.scene.add(this.feltPlane);

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();

        window.addEventListener('resize', () => {
            const isMob = window.innerWidth < 768;
            this.camera.fov = isMob ? 54 : 42;
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.setCameraView(this.cameraViewMode);
        });
    }

    initEntities() {
        this.table = new PoolTable3D(this.scene);
        this.physics = new PoolPhysics(this.table);
        this.ballFactory = new PoolBallFactory();
        this.cue = new PoolCue3D(this.scene);

        // Visual Ball-In-Hand placement ring indicator
        const bihGeo = new THREE.RingGeometry(0.12, 0.17, 32);
        this.bihMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
        this.bihRing = new THREE.Mesh(bihGeo, this.bihMat);
        this.bihRing.rotation.x = -Math.PI / 2;
        this.bihRing.position.set(-1.8, 0.105, 0);
        this.bihRing.visible = false;
        this.scene.add(this.bihRing);

        this.ballsData = [];
        this.ballMeshes = {};

        this.spawnBalls();
    }

    spawnBalls() {
        Object.values(this.ballMeshes).forEach(mesh => this.scene.remove(mesh));
        this.ballMeshes = {};

        this.ballsData = this.ballFactory.createInitialRackedBalls();

        this.ballsData.forEach(b => {
            const mesh = this.ballFactory.createBallMesh(b.number);
            mesh.position.set(b.x, this.ballFactory.radius, b.z);
            this.scene.add(mesh);
            this.ballMeshes[b.number] = mesh;
        });

        this.aimAngle = 0; // Point towards foot rack
        this.updatePower(this.power);
        this.updateAiming();
    }

    initEvents() {
        let isAimingOnTable = false;

        // Direct Felt Tap-To-Aim / Drag-To-Aim on Table
        const handleFeltAim = (e) => {
            if (this.isShotActive) return;
            const cueBall = this.ballsData[0];
            if (!cueBall || cueBall.inPocket) return;

            // Only allow aiming if it's our turn in online/ai mode
            if (this.mode === 'online' && this.currentTurn !== this.myRole) return;
            if (this.mode === 'ai' && this.currentTurn === 'p2') return;

            const rect = this.renderer.domElement.getBoundingClientRect();
            this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.pointer, this.camera);
            const intersects = this.raycaster.intersectObject(this.feltPlane);

            if (intersects.length > 0) {
                const hit = intersects[0].point;
                if (this.isBallInHand) {
                    this.moveCueBallInHand(hit.x, hit.z);
                    return;
                }
                // Vector from Cue Ball to hit point
                const dx = hit.x - cueBall.x;
                const dz = hit.z - cueBall.z;
                if (Math.hypot(dx, dz) > 0.15) {
                    this.aimAngle = Math.atan2(dz, dx);
                    this.updateAiming();
                }
            }
        };

        const btnConfirmBih = document.getElementById('btn-confirm-bih');
        if (btnConfirmBih) {
            btnConfirmBih.addEventListener('click', () => {
                this.confirmBallInHand();
            });
        }

        this.renderer.domElement.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.interactive')) return;
            if (this.cameraViewMode === 'orbit') {
                // In 3D Orbit view: OrbitControls handles rotating, dragging, and orbiting the 3D table!
                this.controls.enabled = true;
                return;
            }
            isAimingOnTable = true;
            this.controls.enabled = false; // Never tumble table while aiming in top/cue mode
            handleFeltAim(e);
        });

        window.addEventListener('pointermove', (e) => {
            if (isAimingOnTable && this.cameraViewMode !== 'orbit') {
                handleFeltAim(e);
            }
        });

        window.addEventListener('pointerup', () => {
            if (isAimingOnTable) {
                isAimingOnTable = false;
            }
            if (this.cameraViewMode === 'orbit') {
                this.controls.enabled = true;
            }
        });

        // Tactile Left Fine-Aim Wheel Dial
        const wheelTrack = document.getElementById('aim-wheel-track');
        let isDraggingWheel = false;
        let lastWheelY = 0;

        if (wheelTrack) {
            const handleWheelMove = (clientY) => {
                const deltaY = clientY - lastWheelY;
                lastWheelY = clientY;
                // Move indicator
                const indicator = wheelTrack.querySelector('.aim-wheel-indicator');
                if (indicator) {
                    const currentTop = 54 + (deltaY * 0.4);
                    indicator.style.transform = `translateY(${Math.max(-40, Math.min(40, deltaY * 2))}px)`;
                    setTimeout(() => { if (indicator) indicator.style.transform = 'none'; }, 100);
                }
                this.aimAngle += deltaY * 0.005;
                this.updateAiming();
            };

            wheelTrack.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                isDraggingWheel = true;
                lastWheelY = e.clientY;
                this.controls.enabled = false;
            });

            window.addEventListener('pointermove', (e) => {
                if (isDraggingWheel) {
                    handleWheelMove(e.clientY);
                }
            });

            window.addEventListener('pointerup', () => {
                isDraggingWheel = false;
            });
        }

        // Shot Power Slider (Bottom HUD)
        const sliderPower = document.getElementById('slider-power');
        if (sliderPower) {
            sliderPower.addEventListener('input', (e) => {
                this.updatePower(parseFloat(e.target.value));
            });
        }

        // Vertical Cue Stick Puller Track (Right Edge)
        const pullerTrack = document.getElementById('cue-puller-track');
        let isDraggingCue = false;

        if (pullerTrack) {
            const handlePull = (clientY) => {
                const rect = pullerTrack.getBoundingClientRect();
                const offsetY = Math.max(0, Math.min(rect.height, clientY - rect.top));
                const ratio = offsetY / rect.height;
                const p = 0.10 + ratio * 0.90;
                this.updatePower(p);
            };

            pullerTrack.addEventListener('pointerdown', (e) => {
                if (this.isShotActive) return;
                isDraggingCue = true;
                if (pullerTrack.setPointerCapture) pullerTrack.setPointerCapture(e.pointerId);
                handlePull(e.clientY);
            });

            pullerTrack.addEventListener('pointermove', (e) => {
                if (isDraggingCue) {
                    handlePull(e.clientY);
                }
            });

            const finishPull = () => {
                if (!isDraggingCue) return;
                isDraggingCue = false;
                // Release-to-shoot mechanic if charged
                if (this.power > 0.18 && !this.isShotActive) {
                    this.takeShot();
                }
            };

            pullerTrack.addEventListener('pointerup', finishPull);
            pullerTrack.addEventListener('pointercancel', finishPull);
        }

        // Shoot Button
        const btnShoot = document.getElementById('btn-shoot');
        if (btnShoot) {
            btnShoot.addEventListener('click', (e) => {
                e.preventDefault();
                this.takeShot();
            });
        }

        // Aim Step Buttons
        document.getElementById('btn-aim-left')?.addEventListener('click', () => {
            this.aimAngle -= 0.03;
            this.updateAiming();
        });
        document.getElementById('btn-aim-right')?.addEventListener('click', () => {
            this.aimAngle += 0.03;
            this.updateAiming();
        });

        // Desktop Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (e.target && e.target.matches('input, textarea')) return;
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                this.takeShot();
            } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.aimAngle -= 0.025;
                this.updateAiming();
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.aimAngle += 0.025;
                this.updateAiming();
            } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
                this.updatePower(this.power + 0.05);
            } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                this.updatePower(this.power - 0.05);
            }
        });

        // Camera View Mode Buttons
        document.getElementById('btn-view-orbit')?.addEventListener('click', () => this.setCameraView('orbit'));
        document.getElementById('btn-view-top')?.addEventListener('click', () => this.setCameraView('top'));
        document.getElementById('btn-view-cue')?.addEventListener('click', () => this.setCameraView('cue'));

        // Game Mode Toggles
        document.getElementById('btn-mode-2p')?.addEventListener('click', () => this.setGameMode('2p'));
        document.getElementById('btn-mode-ai')?.addEventListener('click', () => this.setGameMode('ai'));

        // Audio Toggle
        document.getElementById('btn-mute')?.addEventListener('click', () => {
            const active = window.poolAudio.toggle();
            const icon = document.querySelector('#btn-mute i');
            if (icon) icon.className = active ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
        });

        // Restart / Play Again
        document.getElementById('btn-restart')?.addEventListener('click', () => {
            if (this.mode === 'online' && window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'POOL_LOCAL_REMATCH' }, '*');
            }
            this.restartGame();
        });

        document.getElementById('btn-play-again')?.addEventListener('click', () => {
            document.getElementById('modal-victory')?.classList.remove('open');
            if (this.mode === 'online' && window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'POOL_LOCAL_REMATCH' }, '*');
            }
            this.restartGame();
        });

        // Listen for parent postMessages (Multiplayer Remote Shot, Ball Sync, Chat)
        window.addEventListener('message', (e) => {
            if (!e.data || typeof e.data !== 'object') return;

            if (e.data.type === 'POOL_REMOTE_SHOT') {
                const cueBall = this.ballsData[0];
                if (cueBall) {
                    if (typeof e.data.cueBallX === 'number') cueBall.x = e.data.cueBallX;
                    if (typeof e.data.cueBallZ === 'number') cueBall.z = e.data.cueBallZ;
                }
                this.aimAngle = e.data.aimAngle;
                this.power = e.data.power;
                this.updateAiming();
                this.executePhysicsShot(this.power, this.aimAngle);
            }

            if (e.data.type === 'POOL_REMOTE_SYNC') {
                if (Array.isArray(e.data.ballsData)) {
                    e.data.ballsData.forEach(remoteB => {
                        const localB = this.ballsData.find(b => b.number === remoteB.number);
                        if (localB) {
                            localB.x = remoteB.x;
                            localB.z = remoteB.z;
                            localB.inPocket = remoteB.inPocket;
                            const mesh = this.ballMeshes[localB.number];
                            if (mesh) {
                                mesh.position.x = remoteB.x;
                                mesh.position.z = remoteB.z;
                                if (remoteB.inPocket) {
                                    mesh.visible = false;
                                } else {
                                    mesh.visible = true;
                                    mesh.position.y = this.ballFactory.radius;
                                }
                            }
                        }
                    });
                }
                if (e.data.currentTurn) this.currentTurn = e.data.currentTurn;
                if (e.data.playerGroups) this.playerGroups = e.data.playerGroups;
                this.updateHUD();
                this.updateAiming();
            }

            if (e.data.type === 'POOL_REMATCH') {
                this.restartGame();
            }

            if (e.data.type === 'POOL_TOGGLE_MUTE') {
                if (window.poolAudio) {
                    window.poolAudio.muted = Boolean(e.data.muted);
                }
            }

            if (e.data.type === 'REMOTE_CHAT') {
                const text = e.data.text || e.data.message || '';
                if (text) {
                    this.showChatToast(text, e.data.senderName || 'Opponent');
                    setTimeout(() => {
                        this.appendChatMessage(text, 'remote', e.data.senderName || 'Opponent');
                    }, 2000);
                }
            }
        });

        // Floating Corner Chat Form & Quick Phrases
        const chatForm = document.getElementById('panel-chat-form');
        const chatInput = document.getElementById('panel-chat-input');
        if (chatForm && chatInput) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = chatInput.value.trim();
                if (!text) return;
                chatInput.value = '';
                this.showChatToast(text, 'You');
                setTimeout(() => {
                    this.appendChatMessage(text, 'self');
                }, 2000);
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'GAME_CHAT', text, message: text }, '*');
                }
            });
        }

        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const phrase = btn.getAttribute('data-emoji');
                if (!phrase) return;
                this.showChatToast(phrase, 'You');
                setTimeout(() => {
                    this.appendChatMessage(phrase, 'self');
                }, 2000);
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'GAME_CHAT', text: phrase, message: phrase }, '*');
                }
            });
        });

        // Chat Flyout Open / Close Toggle
        const btnChatToggle = document.getElementById('btn-chat-toggle');
        const floatingChat = document.getElementById('floating-chat');
        const btnCloseChat = document.getElementById('btn-close-chat');
        const unreadDot = document.getElementById('chat-badge-dot');

        if (btnChatToggle && floatingChat) {
            btnChatToggle.addEventListener('click', () => {
                const isClosed = floatingChat.classList.toggle('closed');
                if (!isClosed) {
                    if (unreadDot) unreadDot.classList.remove('active');
                    document.getElementById('panel-chat-input')?.focus();
                }
            });
        }

        if (btnCloseChat && floatingChat) {
            btnCloseChat.addEventListener('click', () => {
                floatingChat.classList.add('closed');
            });
        }
    }

    isOnlyEmoji(str) {
        if (!str) return false;
        return /^(\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]|\s)+$/u.test(str.trim());
    }

    showFloatingReaction(emoji) {
        const el = document.createElement('div');
        el.className = 'floating-reaction';
        el.textContent = emoji;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1300);
    }

    showChatToast(text, sender = '') {
        const toast = document.getElementById('chat-toast-bubble');
        if (!toast) return;
        toast.textContent = sender ? `${sender}: ${text}` : text;
        toast.classList.add('show');
        if (this.chatToastTimer) clearTimeout(this.chatToastTimer);
        this.chatToastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    appendChatMessage(text, senderType = 'self', senderName = '') {
        const container = document.getElementById('panel-chat-messages');
        if (!container) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = `air-msg-item ${senderType}`;
        if (senderType === 'remote' && senderName) {
            msgDiv.textContent = `${senderName}: ${text}`;
        } else {
            msgDiv.textContent = text;
        }

        container.appendChild(msgDiv);

        while (container.children.length > 5) {
            container.removeChild(container.firstElementChild);
        }

        container.scrollTop = container.scrollHeight;

        // If remote message arrived and chat is closed, illuminate unread notification dot
        if (senderType === 'remote') {
            const floatingChat = document.getElementById('floating-chat');
            const unreadDot = document.getElementById('chat-badge-dot');
            if (floatingChat && floatingChat.classList.contains('closed') && unreadDot) {
                unreadDot.classList.add('active');
            }
        }
    }

    setGameMode(mode) {
        this.mode = mode;
        this.playerNames.p2 = mode === 'ai' ? 'Smart AI Bot' : 'Player 2';
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-mode-${mode}`)?.classList.add('active');
        this.restartGame();
    }

    setCameraView(view) {
        this.cameraViewMode = view;
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-view-${view}`)?.classList.add('active');

        const isMob = window.innerWidth < 768;
        const isPortrait = window.innerHeight > window.innerWidth;

        // Reset camera up vector to default +Y initially
        this.camera.up.set(0, 1, 0);

        if (view === 'top') {
            // Direct Top-Down Bird's Eye Tactical View
            this.controls.enabled = false;
            if (isPortrait) {
                // Table length is along X (-3.6 to +3.6) and width along Z (-1.8 to +1.8).
                // On a portrait mobile phone, orient camera up vector along (1, 0, 0)
                // so the table's length runs along the tall phone screen without clipping!
                this.camera.position.set(0, isMob ? 14.5 : 12.0, 0);
                this.camera.up.set(1, 0, 0);
            } else {
                // Landscape / Desktop: Table length (X) aligns horizontally across screen
                this.camera.position.set(0, isMob ? 12.0 : 9.8, 0);
                this.camera.up.set(0, 0, -1);
            }
            this.camera.lookAt(0, 0, 0);
            this.controls.target.set(0, 0, 0);
        } else if (view === 'cue') {
            // Over-the-cue authentic Aim View
            this.controls.enabled = false;
            this.updateCueCamera();
        } else {
            // Free Orbit 3D Perspective View
            this.controls.enabled = true;
            this.camera.up.set(0, 1, 0);
            if (isPortrait) {
                // Diagonal corner 3D perspective angle showing cushions, pocket depths, and rails in rich 3D
                this.camera.position.set(-4.5, 4.4, 4.2);
            } else {
                this.camera.position.set(isMob ? -4.5 : -5.0, isMob ? 3.8 : 3.4, isMob ? 4.0 : 3.6);
            }
            this.camera.lookAt(0, 0, 0);
            this.controls.target.set(0, 0, 0);
        }
        this.controls.update();
    }

    updateCueCamera() {
        const cueBall = this.ballsData[0];
        if (!cueBall || cueBall.inPocket) return;

        const isMob = window.innerWidth < 768;
        // Comfortable, professional distance (not cramped or over-zoomed)
        const camDist = isMob ? 3.4 : 3.0;
        const camHeight = isMob ? 1.7 : 1.45;
        const camX = cueBall.x - Math.cos(this.aimAngle) * camDist;
        const camZ = cueBall.z - Math.sin(this.aimAngle) * camDist;

        this.camera.up.set(0, 1, 0);
        this.camera.position.set(camX, camHeight, camZ);
        const lookX = cueBall.x + Math.cos(this.aimAngle) * 2.8;
        const lookZ = cueBall.z + Math.sin(this.aimAngle) * 2.8;
        this.camera.lookAt(lookX, 0.1, lookZ);
        this.controls.target.set(lookX, 0.1, lookZ);
    }

    updateAiming() {
        const cueBall = this.ballsData[0];
        if (!cueBall || cueBall.inPocket) {
            this.cue.visible = false;
            return;
        }

        const r = this.ballFactory.radius; // 0.10
        const dRadius = r * 2; // 0.20
        const dirX = Math.cos(this.aimAngle);
        const dirZ = Math.sin(this.aimAngle);

        // 1. Raycast for object ball collision
        let closestHit = null;
        let minT = 10.0;

        for (let i = 1; i < this.ballsData.length; i++) {
            const b = this.ballsData[i];
            if (b.inPocket) continue;

            const dx = b.x - cueBall.x;
            const dz = b.z - cueBall.z;
            const proj = dx * dirX + dz * dirZ;
            if (proj <= 0) continue; // Behind cue ball

            const h2 = (dx * dx + dz * dz) - (proj * proj);
            const targetDist2 = dRadius * dRadius;
            if (h2 < targetDist2) {
                const offset = Math.sqrt(Math.max(0, targetDist2 - h2));
                const t = proj - offset;
                if (t > 0 && t < minT) {
                    minT = t;
                    closestHit = {
                        type: 'ball',
                        t,
                        ball: b,
                        impactX: cueBall.x + dirX * t,
                        impactZ: cueBall.z + dirZ * t
                    };
                }
            }
        }

        // 2. Raycast for cushion wall collision
        const halfL = 3.6 - r; // 3.5
        const halfW = 1.8 - r; // 1.7
        let wallT = 10.0;
        let wallBounceX = 0;
        let wallBounceZ = 0;

        if (dirX > 0) {
            const t = (halfL - cueBall.x) / dirX;
            if (t > 0 && t < wallT) {
                wallT = t;
                wallBounceX = -dirX;
                wallBounceZ = dirZ;
            }
        } else if (dirX < 0) {
            const t = (-halfL - cueBall.x) / dirX;
            if (t > 0 && t < wallT) {
                wallT = t;
                wallBounceX = -dirX;
                wallBounceZ = dirZ;
            }
        }

        if (dirZ > 0) {
            const t = (halfW - cueBall.z) / dirZ;
            if (t > 0 && t < wallT) {
                wallT = t;
                wallBounceX = dirX;
                wallBounceZ = -dirZ;
            }
        } else if (dirZ < 0) {
            const t = (-halfW - cueBall.z) / dirZ;
            if (t > 0 && t < wallT) {
                wallT = t;
                wallBounceX = dirX;
                wallBounceZ = -dirZ;
            }
        }

        // 3. Update Cue stick position
        this.cue.update(
            new THREE.Vector3(cueBall.x, r, cueBall.z),
            this.aimAngle,
            this.power
        );

        // 4. Calculate Complete Trajectory & Deflections
        if (closestHit && closestHit.t < wallT) {
            const b = closestHit.ball;
            const impX = closestHit.impactX;
            const impZ = closestHit.impactZ;

            // Normal vector from impact point to target ball center:
            let nx = b.x - impX;
            let nz = b.z - impZ;
            const nLen = Math.hypot(nx, nz) || 1;
            nx /= nLen;
            nz /= nLen;

            // Cue ball deflection: tangential component:
            const dot = dirX * nx + dirZ * nz;
            let defX = dirX - dot * nx;
            let defZ = dirZ - dot * nz;
            const defLen = Math.hypot(defX, defZ);
            if (defLen > 0.001) {
                defX /= defLen;
                defZ /= defLen;
            } else {
                defX = -nz;
                defZ = nx;
            }

            this.cue.setTrajectory(cueBall.x, cueBall.z, r, this.aimAngle, {
                impactX: impX,
                impactZ: impZ,
                hasBallHit: true,
                targetBallX: b.x,
                targetBallZ: b.z,
                targetDirX: nx,
                targetDirZ: nz,
                cueDeflectX: defX,
                cueDeflectZ: defZ
            });
        } else {
            const impX = cueBall.x + dirX * wallT;
            const impZ = cueBall.z + dirZ * wallT;
            this.cue.setTrajectory(cueBall.x, cueBall.z, r, this.aimAngle, {
                impactX: impX,
                impactZ: impZ,
                hasBallHit: false,
                cushionBounceX: wallBounceX,
                cushionBounceZ: wallBounceZ
            });
        }

        if (this.cameraViewMode === 'cue') {
            this.updateCueCamera();
        }
    }

    updatePower(val) {
        this.power = Math.max(0.10, Math.min(1.0, val));
        const pct = Math.round(this.power * 100);

        const slider = document.getElementById('slider-power');
        if (slider) slider.value = this.power.toFixed(2);

        const label = document.getElementById('power-value-label');
        if (label) label.textContent = `${pct}%`;

        const stickPct = document.getElementById('stick-power-pct');
        if (stickPct) stickPct.textContent = `${pct}%`;

        const fill = document.getElementById('cue-puller-fill');
        if (fill) fill.style.height = `${pct}%`;

        const handle = document.getElementById('cue-stick-slider-handle');
        if (handle) {
            const pullPx = ((this.power - 0.10) / 0.90) * 85;
            handle.style.transform = `translateX(-50%) translateY(${pullPx}px)`;
        }

        this.updateAiming();
    }

    takeShot() {
        if (this.isShotActive) return;
        if (this.mode === 'online' && this.currentTurn !== this.myRole) return;
        if (this.mode === 'ai' && this.currentTurn === 'p2') return;

        const cueBall = this.ballsData[0];
        if (!cueBall || cueBall.inPocket) return;

        // Broadcast to multiplayer peer
        if (this.mode === 'online' && window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'POOL_LOCAL_SHOT',
                power: this.power,
                aimAngle: this.aimAngle,
                cueBallX: cueBall.x,
                cueBallZ: cueBall.z
            }, '*');
        }

        this.executePhysicsShot(this.power, this.aimAngle);
    }

    executePhysicsShot(power, aimAngle) {
        if (this.isBallInHand) {
            if (!this.ballInHandValid) {
                this.showStatus('Place cue ball in a legal position first!');
                return;
            }
            this.confirmBallInHand();
        }

        this.isShotActive = true;
        this.shotFrameDelay = 30;
        this.pocketedThisShot = [];
        this.cueBallScratch = false;
        this.cue.visible = false;
        this.physics.resetShotStats();
        document.getElementById('btn-shoot')?.setAttribute('disabled', 'true');

        if (this.shotWatchdogTimer) clearTimeout(this.shotWatchdogTimer);
        this.shotWatchdogTimer = setTimeout(() => {
            if (this.isShotActive) {
                this.ballsData.forEach(b => { b.vx = 0; b.vz = 0; });
                this.onShotComplete();
            }
        }, 7500);

        const cueBall = this.ballsData[0];
        const speed = 4.5 + power * 11.5;
        cueBall.vx = Math.cos(aimAngle) * speed;
        cueBall.vz = Math.sin(aimAngle) * speed;

        if (window.poolAudio) {
            window.poolAudio.playCueHit(power);
        }

        this.cue.strike();
    }

    animate() {
        requestAnimationFrame(this.animate);
        const delta = this.clock.getDelta();

        // 1. Run physical collision simulation
        this.physics.update(this.ballsData, delta);

        // 2. Sync 3D Meshes & Rolling Ball Rotations
        for (let i = 0; i < this.ballsData.length; i++) {
            const b = this.ballsData[i];
            const mesh = this.ballMeshes[b.number];
            if (!mesh) continue;

            if (b.inPocket) {
                if (mesh.position.y > -0.35) {
                    mesh.position.y -= delta * 0.8;
                    mesh.scale.multiplyScalar(0.96);
                } else {
                    mesh.visible = false;
                }
            } else {
                mesh.position.x = b.x;
                mesh.position.z = b.z;
                mesh.position.y = this.ballFactory.radius;

                // Authentic rolling rotation on world axis
                const speed = Math.hypot(b.vx, b.vz);
                if (speed > 0.001) {
                    const distMoved = speed * delta;
                    const rollAngle = distMoved / this.ballFactory.radius;
                    const axis = new THREE.Vector3(b.vz, 0, -b.vx).normalize();
                    mesh.rotateOnWorldAxis(axis, rollAngle);
                }
            }
        }

        // 3. Detect when all balls have come to rest
        if (this.isShotActive) {
            if (this.shotFrameDelay > 0) {
                this.shotFrameDelay--;
            } else if (this.physics.areAllBallsStationary(this.ballsData)) {
                this.onShotComplete();
            }
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onShotComplete() {
        this.isShotActive = false;
        if (this.shotWatchdogTimer) {
            clearTimeout(this.shotWatchdogTimer);
            this.shotWatchdogTimer = null;
        }
        document.getElementById('btn-shoot')?.removeAttribute('disabled');

        const stats = this.physics.shotStats || {
            firstContactBall: null,
            cushionHitAfterContact: false,
            breakRailContacts: new Set(),
            pocketedBalls: [],
            cueBallScratch: false
        };

        const pocketed = stats.pocketedBalls;
        const firstHit = stats.firstContactBall;
        const cueScratch = stats.cueBallScratch || this.ballsData[0].inPocket;
        const cushionHit = stats.cushionHitAfterContact;
        const breakRailCount = stats.breakRailContacts ? stats.breakRailContacts.size : 0;

        const pTurn = this.currentTurn;
        const opponent = pTurn === 'p1' ? 'p2' : 'p1';
        const pGroup = this.playerGroups[pTurn];

        // 1. 8-Ball Pocketed Evaluation
        if (pocketed.includes(8)) {
            if (this.isBreakShot) {
                if (cueScratch) {
                    this.handleVictory(opponent, '8-ball and cue ball pocketed on break!');
                    return;
                } else {
                    // Re-spot the 8-ball at foot spot
                    const eightBall = this.ballsData.find(b => b.number === 8);
                    if (eightBall) {
                        eightBall.inPocket = false;
                        eightBall.x = 1.4;
                        eightBall.z = 0;
                        eightBall.vx = 0;
                        eightBall.vz = 0;
                        const mesh = this.ballMeshes[8];
                        if (mesh) {
                            mesh.visible = true;
                            mesh.scale.set(1, 1, 1);
                            mesh.position.set(1.4, this.ballFactory.radius, 0);
                        }
                    }
                    this.showStatus('8-ball pocketed on break: re-spotted to foot spot.');
                }
            } else {
                // Regular shot: pocketing 8-ball
                const hasRemaining = this.hasRemainingGroupBalls(pGroup);
                if (!pGroup) {
                    this.handleVictory(opponent, '8-ball pocketed prematurely while table was open!');
                    return;
                } else if (hasRemaining) {
                    this.handleVictory(opponent, `8-ball pocketed prematurely while ${pGroup} remain!`);
                    return;
                } else if (cueScratch) {
                    this.handleVictory(opponent, 'Scratch committed while pocketing the 8-ball!');
                    return;
                } else if (firstHit !== 8) {
                    this.handleVictory(opponent, '8-ball pocketed on an illegal shot (wrong ball hit first)!');
                    return;
                } else {
                    // Legal win!
                    this.handleVictory(pTurn, `${this.playerNames[pTurn]} legally pocketed the 8-ball!`);
                    return;
                }
            }
        }

        // 2. Break Shot Evaluation
        if (this.isBreakShot) {
            this.isBreakShot = false;

            if (cueScratch) {
                this.grantBallInHand(opponent, `Break scratch! ${this.playerNames[opponent]} receives Ball in Hand (Open Table).`);
                return;
            }

            const objectBallsPotted = pocketed.filter(n => n >= 1 && n <= 15 && n !== 8);
            const isLegalBreak = objectBallsPotted.length > 0 || breakRailCount >= 4;

            if (!isLegalBreak) {
                this.grantBallInHand(opponent, `Illegal break (fewer than 4 balls contacted rails). ${this.playerNames[opponent]} receives Ball in Hand.`);
                return;
            }

            // Legal break: table remains open
            if (objectBallsPotted.length > 0) {
                this.showStatus(`${this.playerNames[pTurn]} pocketed ball on break! Table remains open.`);
                this.cue.visible = true;
                this.updateAiming();
                this.updateHUD();
                this.broadcastSync();
                return;
            } else {
                this.currentTurn = opponent;
                this.showStatus(`Legal break. ${this.playerNames[opponent]}'s Turn (Open Table).`);
                this.cue.visible = true;
                this.updateAiming();
                this.updateHUD();
                this.broadcastSync();
                if (this.mode === 'ai' && this.currentTurn === 'p2') {
                    setTimeout(() => this.executeAIShot(), 900);
                }
                return;
            }
        }

        // 3. Regular Shot Foul Evaluation
        let foulMsg = null;
        if (cueScratch) {
            foulMsg = 'Scratch (cue ball pocketed)';
        } else if (firstHit === null) {
            foulMsg = 'No contact with any object ball';
        } else if (!pGroup) {
            // Open Table: hitting 8-ball first is a foul
            if (firstHit === 8) {
                foulMsg = 'Hit 8-ball first while table was open';
            }
        } else {
            // Assigned Table
            const hasRest = this.hasRemainingGroupBalls(pGroup);
            if (hasRest) {
                const isSolid = pGroup === 'solids';
                const hitLegal = isSolid ? (firstHit >= 1 && firstHit <= 7) : (firstHit >= 9 && firstHit <= 15);
                if (!hitLegal) {
                    foulMsg = `Wrong target ball first (must hit ${pGroup})`;
                }
            } else {
                // Group cleared: must hit 8-ball first
                if (firstHit !== 8) {
                    foulMsg = 'Must hit the 8-ball first';
                }
            }
        }

        if (!foulMsg) {
            // Rail contact rule: if no ball pocketed, at least one ball must hit a rail after collision
            if (pocketed.length === 0 && !cushionHit) {
                foulMsg = 'No rail contact after ball collision';
            }
        }

        // Handle Foul Result
        if (foulMsg) {
            this.grantBallInHand(opponent, `Foul: ${foulMsg}. ${this.playerNames[opponent]} receives Ball in Hand.`);
            return;
        }

        // 4. Legal Shot: Group Assignment & Turn Continuation
        const legalObjectBallsPotted = pocketed.filter(n => n >= 1 && n <= 15 && n !== 8);

        if (!pGroup) {
            // Table was OPEN
            if (legalObjectBallsPotted.length > 0) {
                const first = legalObjectBallsPotted[0];
                const isSolid = first <= 7;
                this.playerGroups[pTurn] = isSolid ? 'solids' : 'stripes';
                this.playerGroups[opponent] = isSolid ? 'stripes' : 'solids';

                this.showStatus(`${this.playerNames[pTurn]} claimed ${this.playerGroups[pTurn].toUpperCase()}! Shoots again.`);
            } else {
                this.currentTurn = opponent;
                this.showStatus(`${this.playerNames[opponent]}'s Turn (Open Table)`);
            }
        } else {
            // Table was ASSIGNED
            const ownPotted = legalObjectBallsPotted.filter(n => pGroup === 'solids' ? (n >= 1 && n <= 7) : (n >= 9 && n <= 15));
            if (ownPotted.length > 0) {
                this.showStatus(`${this.playerNames[pTurn]} pocketed ${pGroup}! Shoots again.`);
            } else {
                this.currentTurn = opponent;
                this.showStatus(`${this.playerNames[opponent]}'s Turn`);
            }
        }

        this.cue.visible = true;
        this.updateAiming();
        this.updateHUD();
        this.broadcastSync();

        if (this.mode === 'ai' && this.currentTurn === 'p2') {
            setTimeout(() => this.executeAIShot(), 900);
        }
    }

    isLegalCueBallPlacement(x, z) {
        const R = this.ballFactory.radius; // 0.11
        const halfL = this.table.halfL; // 3.6
        const halfW = this.table.halfW; // 1.8
        const cushionMargin = 0.04;

        if (x < -halfL + R + cushionMargin || x > halfL - R - cushionMargin) return false;
        if (z < -halfW + R + cushionMargin || z > halfW - R - cushionMargin) return false;

        for (let i = 0; i < this.table.pockets.length; i++) {
            const p = this.table.pockets[i];
            if (Math.hypot(x - p.x, z - p.z) < p.r + R + 0.05) return false;
        }

        for (let i = 0; i < this.ballsData.length; i++) {
            const b = this.ballsData[i];
            if (b.number === 0 || b.inPocket) continue;
            if (Math.hypot(x - b.x, z - b.z) < (R * 2 + 0.03)) return false;
        }

        return true;
    }

    moveCueBallInHand(x, z) {
        const cueBall = this.ballsData[0];
        const mesh = this.ballMeshes[0];
        if (!cueBall || !mesh) return;

        const isLegal = this.isLegalCueBallPlacement(x, z);
        this.ballInHandValid = isLegal;

        cueBall.x = x;
        cueBall.z = z;
        mesh.position.set(x, this.ballFactory.radius, z);

        if (this.bihRing) {
            this.bihRing.visible = true;
            this.bihRing.position.set(x, 0.105, z);
            this.bihMat.color.setHex(isLegal ? 0x22c55e : 0xef4444);
        }

        const confirmBtn = document.getElementById('btn-confirm-bih');
        if (confirmBtn) {
            confirmBtn.disabled = !isLegal;
            confirmBtn.textContent = isLegal ? 'Place Ball' : 'Invalid Location';
        }
    }

    confirmBallInHand() {
        if (!this.isBallInHand || !this.ballInHandValid) return;
        this.isBallInHand = false;
        if (this.bihRing) this.bihRing.visible = false;
        const bar = document.getElementById('ball-in-hand-bar');
        if (bar) bar.style.display = 'none';

        this.cue.visible = true;
        this.updateAiming();
        this.updateHUD();
        this.showStatus(`${this.playerNames[this.currentTurn]} placed ball. Ready to shoot!`);
    }

    grantBallInHand(playerKey, reasonMsg) {
        this.currentTurn = playerKey;
        this.isBallInHand = true;
        this.ballInHandValid = true;

        const cueBall = this.ballsData[0];
        const mesh = this.ballMeshes[0];
        if (cueBall && mesh) {
            cueBall.inPocket = false;
            cueBall.vx = 0;
            cueBall.vz = 0;
            mesh.visible = true;
            mesh.scale.set(1, 1, 1);

            const testSpots = [
                { x: -1.8, z: 0 },
                { x: -1.4, z: 0.35 },
                { x: -1.4, z: -0.35 },
                { x: -2.2, z: 0.2 },
                { x: 0, z: 0 }
            ];
            let placed = false;
            for (let spot of testSpots) {
                if (this.isLegalCueBallPlacement(spot.x, spot.z)) {
                    cueBall.x = spot.x;
                    cueBall.z = spot.z;
                    mesh.position.set(spot.x, this.ballFactory.radius, spot.z);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                cueBall.x = -1.8;
                cueBall.z = 0;
                mesh.position.set(-1.8, this.ballFactory.radius, 0);
            }
        }

        if (this.bihRing && cueBall) {
            this.bihRing.visible = true;
            this.bihRing.position.set(cueBall.x, 0.105, cueBall.z);
            this.bihMat.color.setHex(0x22c55e);
        }

        const bar = document.getElementById('ball-in-hand-bar');
        if (bar) {
            bar.style.display = 'flex';
            const btn = document.getElementById('btn-confirm-bih');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Place Ball';
            }
        }

        this.cue.visible = false;
        this.showStatus(reasonMsg);
        this.updateHUD();
        this.broadcastSync();

        if (this.mode === 'ai' && this.currentTurn === 'p2') {
            setTimeout(() => this.executeAIBallInHand(), 700);
        }
    }

    executeAIBallInHand() {
        if (!this.isBallInHand || this.currentTurn !== 'p2') return;
        const group = this.playerGroups.p2;
        let targets = this.ballsData.filter(b => {
            if (b.inPocket || b.number === 0) return false;
            if (!group) return b.number !== 8;
            const hasRest = this.hasRemainingGroupBalls(group);
            if (!hasRest) return b.number === 8;
            return group === 'solids' ? b.number <= 7 : b.number >= 9;
        });
        if (targets.length === 0) targets = this.ballsData.filter(b => !b.inPocket && b.number === 8);

        if (targets.length > 0) {
            const target = targets[0];
            const desiredX = Math.max(-3.0, Math.min(3.0, target.x - 0.8));
            const desiredZ = Math.max(-1.4, Math.min(1.4, target.z));
            if (this.isLegalCueBallPlacement(desiredX, desiredZ)) {
                this.moveCueBallInHand(desiredX, desiredZ);
            }
        }
        setTimeout(() => {
            this.confirmBallInHand();
            setTimeout(() => this.executeAIShot(), 600);
        }, 500);
    }

    broadcastSync() {
        if (this.mode === 'online' && window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'POOL_LOCAL_SYNC',
                ballsData: this.ballsData.map(b => ({ number: b.number, x: b.x, z: b.z, inPocket: b.inPocket })),
                currentTurn: this.currentTurn,
                playerGroups: this.playerGroups,
                isBreakShot: this.isBreakShot,
                isBallInHand: this.isBallInHand
            }, '*');
        }
    }

    hasRemainingGroupBalls(group) {
        if (!group) return true;
        return this.ballsData.some(b => {
            if (b.inPocket) return false;
            return group === 'solids' ? (b.number >= 1 && b.number <= 7) : (b.number >= 9 && b.number <= 15);
        });
    }

    executeAIShot() {
        if (this.isShotActive || this.currentTurn !== 'p2') return;

        const cueBall = this.ballsData[0];
        const group = this.playerGroups.p2;

        let targets = this.ballsData.filter(b => {
            if (b.inPocket || b.number === 0) return false;
            if (!group) return b.number !== 8;
            const hasRest = this.hasRemainingGroupBalls(group);
            if (!hasRest) return b.number === 8;
            return group === 'solids' ? (b.number <= 7) : (b.number >= 9 && b.number <= 15);
        });

        if (targets.length === 0) {
            targets = this.ballsData.filter(b => !b.inPocket && b.number === 8);
        }

        if (targets.length > 0) {
            targets.sort((a, b) => Math.hypot(a.x - cueBall.x, a.z - cueBall.z) - Math.hypot(b.x - cueBall.x, b.z - cueBall.z));
            const target = targets[0];

            const angle = Math.atan2(target.z - cueBall.z, target.x - cueBall.x) + (Math.random() - 0.5) * 0.05;
            this.aimAngle = angle;
            this.power = 0.45 + Math.random() * 0.35;
            this.updateAiming();

            setTimeout(() => {
                if (!this.isShotActive && this.currentTurn === 'p2') {
                    this.executePhysicsShot(this.power, this.aimAngle);
                }
            }, 600);
        }
    }

    handleVictory(winnerKey, reason = '') {
        const winnerName = this.playerNames[winnerKey];
        if (window.poolAudio) window.poolAudio.playVictory();

        const titleEl = document.getElementById('victory-title');
        const descEl = document.getElementById('victory-desc');
        if (titleEl) titleEl.textContent = `${winnerName} Wins!`;
        if (descEl) descEl.textContent = reason || 'Masterful 8-Ball execution! Congratulations on winning the match!';

        document.getElementById('modal-victory')?.classList.add('open');
    }

    restartGame() {
        this.currentTurn = 'p1';
        this.playerGroups = { p1: null, p2: null };
        this.isShotActive = false;
        this.cueBallScratch = false;
        this.isBreakShot = true;
        this.isBallInHand = false;
        this.ballInHandValid = true;
        if (this.bihRing) this.bihRing.visible = false;
        const bar = document.getElementById('ball-in-hand-bar');
        if (bar) bar.style.display = 'none';
        this.spawnBalls();
        this.showStatus('New Rack! Player 1 breaks the balls');
        this.updateHUD();
    }

    showStatus(msg) {
        const banner = document.getElementById('status-banner');
        if (banner) banner.textContent = msg;
    }

    updateHUD() {
        const cardP1 = document.getElementById('card-p1');
        const cardP2 = document.getElementById('card-p2');
        const nameP1 = document.getElementById('name-p1');
        const nameP2 = document.getElementById('name-p2');

        if (nameP1) nameP1.textContent = this.playerNames.p1;
        if (nameP2) nameP2.textContent = this.playerNames.p2;

        if (cardP1) cardP1.classList.toggle('active-turn', this.currentTurn === 'p1');
        if (cardP2) cardP2.classList.toggle('active-turn', this.currentTurn === 'p2');

        // Render Miniature Ball Racks for P1 and P2
        this.renderPlayerRack('p1', 'rack-p1', 'badge-p1');
        this.renderPlayerRack('p2', 'rack-p2', 'badge-p2');

        // Enable/Disable Shoot Button according to turn
        const btnShoot = document.getElementById('btn-shoot');
        if (btnShoot) {
            if (this.isShotActive) {
                btnShoot.disabled = true;
            } else if (this.mode === 'online') {
                btnShoot.disabled = (this.currentTurn !== this.myRole);
            } else if (this.mode === 'ai') {
                btnShoot.disabled = (this.currentTurn === 'p2');
            } else {
                btnShoot.disabled = false;
            }
        }
    }

    renderPlayerRack(playerKey, rackElId, badgeElId) {
        const rackEl = document.getElementById(rackElId);
        const badgeEl = document.getElementById(badgeElId);
        if (!rackEl) return;

        const group = this.playerGroups[playerKey];
        if (!group) {
            if (badgeEl) badgeEl.textContent = 'OPEN TABLE';
            rackEl.innerHTML = `<span class="rack-status-text">Pot any solid or stripe to claim</span>`;
            return;
        }

        const ballNums = group === 'solids' ? [1, 2, 3, 4, 5, 6, 7] : [9, 10, 11, 12, 13, 14, 15];
        let pottedCount = 0;

        let html = '';
        ballNums.forEach(num => {
            const ball = this.ballsData.find(b => b.number === num);
            const isPotted = ball ? ball.inPocket : false;
            if (isPotted) pottedCount++;
            html += `<div class="ball-pill-mini ${isPotted ? 'potted' : 'active'}" data-num="${num}">${num}</div>`;
        });

        // 8-ball slot: lit up when all 7 are cleared
        const eightBall = this.ballsData.find(b => b.number === 8);
        const eightPotted = eightBall ? eightBall.inPocket : false;
        const isEightReady = pottedCount === 7;
        html += `<div class="ball-pill-mini ${eightPotted ? 'potted' : (isEightReady ? 'active' : 'locked')}" data-num="8" style="${isEightReady ? 'box-shadow: 0 0 10px #d4af37;' : 'opacity: 0.35;'}" title="8-Ball">8</div>`;

        rackEl.innerHTML = html;

        if (badgeEl) {
            if (isEightReady) {
                badgeEl.textContent = `SINK THE 8-BALL!`;
                badgeEl.style.color = '#facc15';
            } else {
                badgeEl.textContent = `${group.toUpperCase()} (${pottedCount}/7)`;
                badgeEl.style.color = '';
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.poolGame = new PoolGameApp();
});
