// Couples Royal 3D Carrom - High Precision 2D/3D Hybrid Physics Engine
// Accurate circle-circle impulse resolution, powder surface friction, cushion bounce & pocket capture

class CarromPhysics {
    constructor(board, piecesManager) {
        this.board = board;
        this.piecesManager = piecesManager;

        // Physics Constants
        this.friction = 0.984; // Smooth carrom powder gliding friction
        this.restitution = 0.90; // Piece-to-piece elastic bounce coefficient
        this.cushionRestitution = 0.85; // Wooden bumper rebound elasticity
        this.minVelocity = 0.05; // Velocity cutoff to prevent jitter

        // Boundaries (board play surface is -35 to +35)
        this.boundX = this.board.playWidth / 2; // 35.0
        this.boundZ = this.board.playHeight / 2; // 35.0

        // Callbacks
        this.onPiecePocketed = null;
        this.onAllStopped = null;

        this.hasMovementOccurred = false;
        this.wasMoving = false;
    }

    // Step physics forward by deltaTime
    step(dt = 1 / 60) {
        const allObjects = [];
        if (this.piecesManager.striker && !this.piecesManager.striker.isPocketed) {
            allObjects.push(this.piecesManager.striker);
        }
        this.piecesManager.pieces.forEach(p => {
            if (!p.isPocketed) allObjects.push(p);
        });

        let isAnyMoving = false;

        // 1. Position update & friction
        allObjects.forEach(obj => {
            if (obj.isFalling) {
                // Falling into pocket animation
                obj.fallProgress += dt * 3.5;
                if (obj.mesh) {
                    obj.mesh.position.y -= dt * 6.0;
                    const s = Math.max(0.01, 1 - obj.fallProgress * 0.7);
                    obj.mesh.scale.set(s, s, s);
                }
                if (obj.fallProgress >= 1.0) {
                    obj.isFalling = false;
                    obj.isPocketed = true;
                    if (obj.mesh) obj.mesh.visible = false;
                    if (this.onPiecePocketed) {
                        this.onPiecePocketed(obj);
                    }
                }
                isAnyMoving = true;
                return;
            }

            const speed = Math.hypot(obj.vx, obj.vz);
            if (speed > 0) {
                obj.x += obj.vx;
                obj.z += obj.vz;

                // Powder deceleration
                obj.vx *= this.friction;
                obj.vz *= this.friction;

                if (speed < this.minVelocity) {
                    obj.vx = 0;
                    obj.vz = 0;
                } else {
                    isAnyMoving = true;
                }
            }

            // Sync 3D mesh position
            if (obj.mesh) {
                obj.mesh.position.x = obj.x;
                obj.mesh.position.z = obj.z;
            }
        });

        // 2. Cushion bounce against hardwood frame rails
        allObjects.forEach(obj => {
            if (obj.isFalling || obj.isPocketed) return;

            const r = obj.radius;

            // X-bounds bounce (Left/Right)
            if (obj.x - r < -this.boundX) {
                obj.x = -this.boundX + r;
                obj.vx = -obj.vx * this.cushionRestitution;
                if (Math.abs(obj.vx) > 0.1 && window.CarromAudio) {
                    window.CarromAudio.playCushionBounce(Math.abs(obj.vx) / 3);
                }
            } else if (obj.x + r > this.boundX) {
                obj.x = this.boundX - r;
                obj.vx = -obj.vx * this.cushionRestitution;
                if (Math.abs(obj.vx) > 0.1 && window.CarromAudio) {
                    window.CarromAudio.playCushionBounce(Math.abs(obj.vx) / 3);
                }
            }

            // Z-bounds bounce (Top/Bottom)
            if (obj.z - r < -this.boundZ) {
                obj.z = -this.boundZ + r;
                obj.vz = -obj.vz * this.cushionRestitution;
                if (Math.abs(obj.vz) > 0.1 && window.CarromAudio) {
                    window.CarromAudio.playCushionBounce(Math.abs(obj.vz) / 3);
                }
            } else if (obj.z + r > this.boundZ) {
                obj.z = this.boundZ - r;
                obj.vz = -obj.vz * this.cushionRestitution;
                if (Math.abs(obj.vz) > 0.1 && window.CarromAudio) {
                    window.CarromAudio.playCushionBounce(Math.abs(obj.vz) / 3);
                }
            }
        });

        // 3. Circle-to-Circle Elastic Collisions (Multiple iterations for dense clusters)
        const iterations = 3;
        for (let iter = 0; iter < iterations; iter++) {
            for (let i = 0; i < allObjects.length; i++) {
                const a = allObjects[i];
                if (a.isFalling || a.isPocketed) continue;

                for (let j = i + 1; j < allObjects.length; j++) {
                    const b = allObjects[j];
                    if (b.isFalling || b.isPocketed) continue;

                    const dx = b.x - a.x;
                    const dz = b.z - a.z;
                    const dist = Math.hypot(dx, dz);
                    const minDist = a.radius + b.radius;

                    if (dist < minDist && dist > 0.0001) {
                        const nx = dx / dist;
                        const nz = dz / dist;

                        // Positional relaxation (separate overlapping circles)
                        const overlap = minDist - dist;
                        const totalMass = a.mass + b.mass;
                        const moveA = overlap * (b.mass / totalMass);
                        const moveB = overlap * (a.mass / totalMass);

                        a.x -= nx * moveA;
                        a.z -= nz * moveA;
                        b.x += nx * moveB;
                        b.z += nz * moveB;

                        // Velocity exchange along collision normal
                        const rvx = b.vx - a.vx;
                        const rvz = b.vz - a.vz;
                        const velAlongNormal = rvx * nx + rvz * nz;

                        if (velAlongNormal < 0) {
                            const impulse = (-(1 + this.restitution) * velAlongNormal) / (1 / a.mass + 1 / b.mass);
                            const ix = impulse * nx;
                            const iz = impulse * nz;

                            a.vx -= ix / a.mass;
                            a.vz -= iz / a.mass;
                            b.vx += ix / b.mass;
                            b.vz += iz / b.mass;

                            const relSpeed = Math.abs(velAlongNormal);
                            if (relSpeed > 0.08 && window.CarromAudio) {
                                window.CarromAudio.playWoodClack(Math.min(1.0, relSpeed / 2.5));
                            }
                        }
                    }
                }
            }
        }

        // 4. Pocket Capture Detection
        allObjects.forEach(obj => {
            if (obj.isFalling || obj.isPocketed) return;

            this.board.pocketPositions.forEach(pocket => {
                const distToPocket = Math.hypot(obj.x - pocket.x, obj.z - pocket.z);
                // Piece enters pocket threshold
                if (distToPocket < this.board.pocketRadius * 0.92) {
                    obj.isFalling = true;
                    obj.fallProgress = 0;
                    obj.vx = (pocket.x - obj.x) * 0.15;
                    obj.vz = (pocket.z - obj.z) * 0.15;

                    if (window.CarromAudio) {
                        if (obj.type === 'queen') {
                            window.CarromAudio.playQueenChime();
                        } else {
                            window.CarromAudio.playPocketDrop();
                        }
                    }
                }
            });
        });

        // 5. Track whether pieces have come to rest
        if (isAnyMoving) {
            this.wasMoving = true;
            this.hasMovementOccurred = true;
        } else if (this.wasMoving) {
            this.wasMoving = false;
            if (this.onAllStopped) {
                this.onAllStopped();
            }
        }
    }

    // Check if table is currently in motion
    isTableBusy() {
        if (this.wasMoving) return true;
        if (this.piecesManager.striker) {
            if (this.piecesManager.striker.isFalling) return true;
            if (Math.hypot(this.piecesManager.striker.vx, this.piecesManager.striker.vz) > 0.01) return true;
        }
        for (const p of this.piecesManager.pieces) {
            if (p.isFalling) return true;
            if (Math.hypot(p.vx, p.vz) > 0.01) return true;
        }
        return false;
    }
}

window.CarromPhysics = CarromPhysics;
