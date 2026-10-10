// Cosmic 3D Bowling - Web Audio API Synthesizer Engine
class BowlingAudioEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.rollOsc = null;
        this.rollGain = null;
        this.init();
    }

    init() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const unlock = () => {
            if (!this.ctx) this.ctx = new AudioContext();
            if (this.ctx.state === 'suspended') this.ctx.resume();
            window.removeEventListener('pointerdown', unlock);
        };
        window.addEventListener('pointerdown', unlock, { passive: true });
    }

    ensureContext() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx && !this.muted;
    }

    startRollSound() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            this.rollOsc = this.ctx.createOscillator();
            this.rollGain = this.ctx.createGain();

            this.rollOsc.type = 'triangle';
            this.rollOsc.frequency.setValueAtTime(65, now);
            this.rollOsc.frequency.linearRampToValueAtTime(110, now + 1.2);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(220, now);

            this.rollGain.gain.setValueAtTime(0.01, now);
            this.rollGain.gain.linearRampToValueAtTime(0.12, now + 0.5);

            this.rollOsc.connect(filter);
            filter.connect(this.rollGain);
            this.rollGain.connect(this.ctx.destination);

            this.rollOsc.start(now);
        } catch (e) {}
    }

    stopRollSound() {
        if (this.rollGain) {
            try {
                this.rollGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
                setTimeout(() => {
                    if (this.rollOsc) {
                        this.rollOsc.stop();
                        this.rollOsc.disconnect();
                        this.rollOsc = null;
                    }
                }, 100);
            } catch (e) {}
        }
    }

    // Explosive wooden pin crash & multiple pin scatter
    playPinCrash(count = 10) {
        this.stopRollSound();
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            // Primary heavy impact
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.35);

            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.36);

            // High frequency wood clatter burst
            for (let i = 0; i < Math.min(count, 8); i++) {
                const pOsc = this.ctx.createOscillator();
                const pGain = this.ctx.createGain();
                pOsc.type = 'triangle';
                const f = 600 + Math.random() * 800;
                const delay = 0.02 + i * 0.04;
                pOsc.frequency.setValueAtTime(f, now + delay);
                pOsc.frequency.exponentialRampToValueAtTime(200, now + delay + 0.12);

                pGain.gain.setValueAtTime(0.18, now + delay);
                pGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);

                pOsc.connect(pGain);
                pGain.connect(this.ctx.destination);
                pOsc.start(now + delay);
                pOsc.stop(now + delay + 0.14);
            }
        } catch (e) {}
    }

    playGutter() {
        this.stopRollSound();
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.4);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.42);
        } catch (e) {}
    }

    playStrikeFanfare() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                gain.gain.setValueAtTime(0.16, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.45);
            });
        } catch (e) {}
    }
}

window.bowlingAudio = new BowlingAudioEngine();
