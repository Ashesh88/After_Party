// Couples 3D Pool - Web Audio Synthesizer
// Zero external mp3 dependencies, instant latency-free realistic acoustics

class PoolAudio {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Cue stick hitting cue ball (chalky thwack)
    playCueHit(power = 1.0) {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const p = Math.max(0.1, Math.min(1.0, power));

        // Noise burst for leather chalk tip impact
        const bufferSize = this.ctx.sampleRate * 0.04;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1400, now);
        noiseFilter.Q.setValueAtTime(3.0, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4 * p, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);

        // Resonant wood body pop
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280 + p * 80, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);

        oscGain.gain.setValueAtTime(0.6 * p, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
    }

    // Ball-to-ball solid phenolic resin clack
    playBallClack(relativeVelocity = 1.0) {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const v = Math.max(0.05, Math.min(1.0, relativeVelocity));

        // High frequency crisp resin snap
        const osc1 = this.ctx.createOscillator();
        const oscGain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(2600 + Math.random() * 200, now);
        osc1.frequency.exponentialRampToValueAtTime(800, now + 0.025);

        oscGain1.gain.setValueAtTime(0.55 * v, now);
        oscGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

        osc1.connect(oscGain1);
        oscGain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.03);

        // Core solid body tone
        const osc2 = this.ctx.createOscillator();
        const oscGain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1100 + Math.random() * 100, now);
        osc2.frequency.exponentialRampToValueAtTime(350, now + 0.035);

        oscGain2.gain.setValueAtTime(0.35 * v, now);
        oscGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        osc2.connect(oscGain2);
        oscGain2.connect(this.ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.04);
    }

    // Cushion rubber bumper rebound
    playCushionHit(velocity = 0.5) {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const v = Math.max(0.1, Math.min(1.0, velocity));

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.08);

        gain.gain.setValueAtTime(0.4 * v, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
    }

    // Pocket drop (rattle drop into leather drop pocket)
    playPocketDrop() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        // Low heavy thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);

        gain.gain.setValueAtTime(0.55, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);

        // Leather net rattle
        setTimeout(() => {
            if (!this.ctx) return;
            const t = this.ctx.currentTime;
            const click = this.ctx.createOscillator();
            const clickGain = this.ctx.createGain();
            click.type = 'triangle';
            click.frequency.setValueAtTime(320, t);
            click.frequency.exponentialRampToValueAtTime(150, t + 0.06);

            clickGain.gain.setValueAtTime(0.25, t);
            clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

            click.connect(clickGain);
            clickGain.connect(this.ctx.destination);
            click.start(t);
            click.stop(t + 0.07);
        }, 50);
    }

    // Victory celebration fanfare
    playVictory() {
        if (!this.enabled) return;
        this.init();
        const notes = [392, 523.25, 659.25, 783.99, 1046.5]; // G4, C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const start = this.ctx.currentTime + idx * 0.11;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.28, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(start);
            osc.stop(start + 0.48);
        });
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

window.poolAudio = new PoolAudio();
