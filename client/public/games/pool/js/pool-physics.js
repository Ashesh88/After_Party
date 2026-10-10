// Couples 3D Pool - Rigid-Body Billiards Physics Engine
// Multi-substep continuous collision detection, elastic impulse response, pocket gravity

class PoolPhysics {
    constructor(table) {
        this.table = table;
        this.substeps = 8;
        this.rollingFriction = 0.988;
        this.cushionRestitution = 0.82;
        this.ballRestitution = 0.94;
        this.minVelocity = 0.015;

        this.halfL = table.halfL; // 3.6
        this.halfW = table.halfW; // 1.8
        this.ballRadius = 0.11;
        this.pockets = table.pockets;
    }

    update(balls, delta) {
        const dt = Math.min(delta, 0.033) / this.substeps;

        for (let s = 0; s < this.substeps; s++) {
            // 1. Move and check pockets
            for (let i = 0; i < balls.length; i++) {
                const b = balls[i];
                if (b.inPocket) continue;

                b.x += b.vx * dt;
                b.z += b.vz * dt;

                // Rolling friction decay
                b.vx *= Math.pow(this.rollingFriction, dt * 60);
                b.vz *= Math.pow(this.rollingFriction, dt * 60);

                if (Math.hypot(b.vx, b.vz) < this.minVelocity) {
                    b.vx = 0;
                    b.vz = 0;
                }

                // Check pocket suction
                this.checkPockets(b);
            }

            // 2. Ball-to-cushion collisions
            for (let i = 0; i < balls.length; i++) {
                const b = balls[i];
                if (b.inPocket) continue;
                this.checkCushions(b);
            }

            // 3. Ball-to-ball collisions
            for (let i = 0; i < balls.length; i++) {
                for (let j = i + 1; j < balls.length; j++) {
                    const b1 = balls[i];
                    const b2 = balls[j];
                    if (b1.inPocket || b2.inPocket) continue;
                    this.resolveBallCollision(b1, b2);
                }
            }
        }
    }

    checkPockets(ball) {
        for (let i = 0; i < this.pockets.length; i++) {
            const p = this.pockets[i];
            const dx = ball.x - p.x;
            const dz = ball.z - p.z;
            const dist = Math.hypot(dx, dz);

            if (dist < p.r) {
                // Ball entered pocket mouth!
                ball.inPocket = true;
                ball.pocketTime = performance.now();
                ball.vx = 0;
                ball.vz = 0;
                if (window.poolAudio) window.poolAudio.playPocketDrop();
                return;
            }
        }
    }

    checkCushions(ball) {
        const R = this.ballRadius;
        const minX = -this.halfL + R;
        const maxX = this.halfL - R;
        const minZ = -this.halfW + R;
        const maxZ = this.halfW - R;

        // Skip cushion check if ball is close to a pocket opening
        for (let i = 0; i < this.pockets.length; i++) {
            const p = this.pockets[i];
            if (Math.hypot(ball.x - p.x, ball.z - p.z) < p.r * 1.35) {
                return;
            }
        }

        // Left Head Rail
        if (ball.x < minX && ball.vx < 0) {
            ball.x = minX;
            ball.vx = -ball.vx * this.cushionRestitution;
            if (window.poolAudio) window.poolAudio.playCushionHit(Math.abs(ball.vx));
        }
        // Right Foot Rail
        else if (ball.x > maxX && ball.vx > 0) {
            ball.x = maxX;
            ball.vx = -ball.vx * this.cushionRestitution;
            if (window.poolAudio) window.poolAudio.playCushionHit(Math.abs(ball.vx));
        }

        // Top Long Rail
        if (ball.z < minZ && ball.vz < 0) {
            ball.z = minZ;
            ball.vz = -ball.vz * this.cushionRestitution;
            if (window.poolAudio) window.poolAudio.playCushionHit(Math.abs(ball.vz));
        }
        // Bottom Long Rail
        else if (ball.z > maxZ && ball.vz > 0) {
            ball.z = maxZ;
            ball.vz = -ball.vz * this.cushionRestitution;
            if (window.poolAudio) window.poolAudio.playCushionHit(Math.abs(ball.vz));
        }
    }

    resolveBallCollision(b1, b2) {
        const dx = b2.x - b1.x;
        const dz = b2.z - b1.z;
        const dist = Math.hypot(dx, dz);
        const minDist = this.ballRadius * 2;

        if (dist < minDist && dist > 0.0001) {
            const nx = dx / dist;
            const nz = dz / dist;

            // Separate overlapping balls
            const overlap = (minDist - dist) * 0.5;
            b1.x -= nx * overlap;
            b1.z -= nz * overlap;
            b2.x += nx * overlap;
            b2.z += nz * overlap;

            // Normal relative velocity
            const kx = b1.vx - b2.vx;
            const kz = b1.vz - b2.vz;
            const vn = kx * nx + kz * nz;

            // Only bounce if balls are moving toward each other
            if (vn > 0) {
                const impulse = (1 + this.ballRestitution) * 0.5 * vn;
                b1.vx -= impulse * nx;
                b1.vz -= impulse * nz;
                b2.vx += impulse * nx;
                b2.vz += impulse * nz;

                if (window.poolAudio) {
                    window.poolAudio.playBallClack(vn / 6.0);
                }
            }
        }
    }

    areAllBallsStationary(balls) {
        for (let i = 0; i < balls.length; i++) {
            const b = balls[i];
            if (!b.inPocket && (Math.abs(b.vx) > 0 || Math.abs(b.vz) > 0)) {
                return false;
            }
        }
        return true;
    }
}
