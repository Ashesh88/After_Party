// Web Audio API Sound Synthesizer for 3D Neon Racer
// No external MP3 downloads required - 100% reliable, zero latency!

class RacerAudioEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.engineOsc = null;
        this.engineGain = null;
        this.isEngineRunning = false;
        this.init();
    }

    init() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const unlockAudio = () => {
            if (!this.ctx) {
                this.ctx = new AudioContext();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            window.removeEventListener('pointerdown', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };

        window.addEventListener('pointerdown', unlockAudio, { passive: true });
        window.addEventListener('keydown', unlockAudio, { passive: true });
    }

    ensureContext() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx && !this.muted;
    }

    startEngine() {
        if (!this.ensureContext() || this.isEngineRunning) return;
        try {
            this.engineOsc = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();

            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(65, this.ctx.currentTime);

            // Filter for engine body
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(320, this.ctx.currentTime);

            this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

            this.engineOsc.connect(filter);
            filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc.start();
            this.isEngineRunning = true;
        } catch (e) {
            console.warn('Engine audio error:', e);
        }
    }

    updateEngine(speedRatio) {
        if (!this.isEngineRunning || !this.engineOsc || this.muted) return;
        try {
            // Speed ratio: 0.0 to 1.5
            const baseFreq = 70 + speedRatio * 180;
            this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.08);
            const targetGain = this.muted ? 0 : 0.03 + Math.min(speedRatio * 0.04, 0.08);
            this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
        } catch (e) {}
    }

    stopEngine() {
        if (this.engineOsc) {
            try {
                this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
                setTimeout(() => {
                    if (this.engineOsc) {
                        this.engineOsc.stop();
                        this.engineOsc.disconnect();
                        this.engineOsc = null;
                    }
                    this.isEngineRunning = false;
                }, 100);
            } catch (e) {
                this.isEngineRunning = false;
            }
        }
    }

    playNitro() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            // White noise burst with resonance sweep
            const bufferSize = this.ctx.sampleRate * 0.6;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const whiteNoise = this.ctx.createBufferSource();
            whiteNoise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(2400, now + 0.3);
            filter.Q.setValueAtTime(3.0, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

            whiteNoise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            whiteNoise.start(now);
        } catch (e) {}
    }

    playDrift() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.linearRampToValueAtTime(360, now + 0.15);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.2);
        } catch (e) {}
    }

    playBoostPad() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.05);

                gain.gain.setValueAtTime(0.12, now + idx * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + idx * 0.05);
                osc.stop(now + idx * 0.05 + 0.2);
            });
        } catch (e) {}
    }

    playCollision() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.25);
        } catch (e) {}
    }

    playVictory() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const notes = [
                { f: 523.25, t: 0.0 },   // C5
                { f: 659.25, t: 0.15 },  // E5
                { f: 783.99, t: 0.3 },   // G5
                { f: 1046.5, t: 0.45 },  // C6
                { f: 880.0,  t: 0.7 },   // A5
                { f: 1046.5, t: 0.95 }   // C6
            ];

            notes.forEach(n => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, now + n.t);

                gain.gain.setValueAtTime(0.15, now + n.t);
                gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + 0.4);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + n.t);
                osc.stop(now + n.t + 0.45);
            });
        } catch (e) {}
    }
}

window.racerAudio = new RacerAudioEngine();
