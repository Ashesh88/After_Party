// Royal 3D Cards - Web Audio API Sound Synthesizer
// Authentic casino table acoustics without external audio dependencies

class CardsAudioEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
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

    // Smooth card glide across felt table
    playCardSlide() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const bufferSize = this.ctx.sampleRate * 0.18;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400, now);
            filter.frequency.linearRampToValueAtTime(800, now + 0.18);
            filter.Q.setValueAtTime(1.5, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.18);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
        } catch (e) {}
    }

    // Crisp card turn / snap
    playCardFlip() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(580, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.09);
        } catch (e) {}
    }

    // Ceramic casino chip clink
    playChipClink() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            [2400, 3200].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.03);

                gain.gain.setValueAtTime(0.1, now + idx * 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.09);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + idx * 0.03);
                osc.stop(now + idx * 0.03 + 0.1);
            });
        } catch (e) {}
    }

    // Blackjack / 21 Sparkling Chime
    playBlackjack() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.08);

                gain.gain.setValueAtTime(0.12, now + i * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + i * 0.08);
                osc.stop(now + i * 0.08 + 0.4);
            });
        } catch (e) {}
    }

    // Win Fanfare
    playWin() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const notes = [
                { f: 440.0, t: 0.0 },   // A4
                { f: 554.37, t: 0.14 }, // C#5
                { f: 659.25, t: 0.28 }, // E5
                { f: 880.0, t: 0.45 }   // A5
            ];

            notes.forEach(n => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, now + n.t);

                gain.gain.setValueAtTime(0.15, now + n.t);
                gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + 0.35);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + n.t);
                osc.stop(now + n.t + 0.4);
            });
        } catch (e) {}
    }

    // Bust / Loss thud
    playBust() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.32);
        } catch (e) {}
    }
}

window.cardsAudio = new CardsAudioEngine();
