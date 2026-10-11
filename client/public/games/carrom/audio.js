// Couples Royal 3D Carrom - High Precision Web Audio Synthesizer
// 100% zero external audio asset dependencies, instantaneous realistic wood physics acoustics

class CarromAudio {
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

    // Striker flick release (smooth nail / finger snap against acrylic striker)
    playStrikerFlick(power = 1.0) {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const p = Math.max(0.1, Math.min(1.0, power));

        // Noise snap for fingernail release
        const bufferSize = this.ctx.sampleRate * 0.035;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(2200, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.45 * p, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);

        // Resonant wood flick pop
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(340 + p * 120, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.05);

        oscGain.gain.setValueAtTime(0.5 * p, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    // Wooden carrom piece clack (piece-to-piece crisp lacquer impact)
    playWoodClack(relativeVelocity = 1.0) {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const v = Math.max(0.08, Math.min(1.0, relativeVelocity));

        // High frequency bright wooden clack
        const osc1 = this.ctx.createOscillator();
        const oscGain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(3200 + Math.random() * 400, now);
        osc1.frequency.exponentialRampToValueAtTime(900, now + 0.02);

        oscGain1.gain.setValueAtTime(0.6 * v, now);
        oscGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

        osc1.connect(oscGain1);
        oscGain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.025);

        // Core resonant wooden timber tone
        const osc2 = this.ctx.createOscillator();
        const oscGain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1250 + Math.random() * 150, now);
        osc2.frequency.exponentialRampToValueAtTime(380, now + 0.03);

        oscGain2.gain.setValueAtTime(0.4 * v, now);
        oscGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc2.connect(oscGain2);
        oscGain2.connect(this.ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.035);
    }

    // Wooden cushion / frame border bounce
    playCushionBounce(relativeVelocity = 1.0) {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const v = Math.max(0.08, Math.min(1.0, relativeVelocity));

        // Low heavy solid wood frame bumper thud
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260 + v * 40, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

        oscGain.gain.setValueAtTime(0.55 * v, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    // Carrom piece dropping into corner pocket net
    playPocketDrop() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        // Soft hollow cloth/leather net drop sound
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.12);

        oscGain.gain.setValueAtTime(0.65, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
    }

    // Queen Pocketed / Crown Reward Chime
    playQueenChime() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = now + idx * 0.07;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0.35, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(noteStart);
            osc.stop(noteStart + 0.4);
        });
    }

    // Victory celebration melody
    playVictory() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const chord = [523.25, 659.25, 783.99, 1046.50]; // C Major Triumph

        chord.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.06);

            gain.gain.setValueAtTime(0.3, now + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.06);
            osc.stop(now + 1.2);
        });
    }
}

window.CarromAudio = new CarromAudio();
