// 3D UNO Party - Web Audio Synthesizer
// Pure procedural Web Audio API acoustics for card dealing, action cards, wild shifts, and Uno calls

class UnoAudioEngine {
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

    setMuted(m) {
        this.muted = !!m;
    }

    // Smooth card glide / draw from deck
    playCardDraw() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.16);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1600, now);
            filter.frequency.exponentialRampToValueAtTime(750, now + 0.16);
            filter.Q.setValueAtTime(1.8, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.16);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
        } catch (e) {}
    }

    // Crisp card snap / play onto discard pile
    playCardPlay() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.08);

            // Subtle paper friction noise
            const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.06), this.ctx.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseData.length; i++) {
                noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
            }
            const noiseSrc = this.ctx.createBufferSource();
            noiseSrc.buffer = noiseBuffer;
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.06, now);
            noiseGain.gain.linearRampToValueAtTime(0.001, now + 0.06);
            noiseSrc.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noiseSrc.start(now);
        } catch (e) {}
    }

    // Skip card buzzer / zip effect
    playSkip() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(540, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.18);
        } catch (e) {}
    }

    // Reverse card twin tone loop
    playReverse() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            [440, 659].forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.08);
                osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + i * 0.08 + 0.12);

                gain.gain.setValueAtTime(0.12, now + i * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + i * 0.08);
                osc.stop(now + i * 0.08 + 0.12);
            });
        } catch (e) {}
    }

    // Draw Two (+2) / Draw Four (+4) rapid impact
    playDrawAttack(count = 2) {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            for (let i = 0; i < count; i++) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                const startTime = now + i * 0.09;
                osc.frequency.setValueAtTime(260 + i * 40, startTime);
                osc.frequency.exponentialRampToValueAtTime(110, startTime + 0.08);

                gain.gain.setValueAtTime(0.1, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + 0.08);
            }
        } catch (e) {}
    }

    // Wild Card color change shimmer
    playWildChime() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const chords = [523.25, 659.25, 783.99, 1046.50]; // C E G C
            chords.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                const startTime = now + idx * 0.06;
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0.09, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + 0.22);
            });
        } catch (e) {}
    }

    // Dramatic "UNO!" alert sound
    playUnoCall() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            // Fanfare chords
            const notes = [587.33, 739.99, 880.00, 1174.66]; // D F# A D
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                const startTime = now + i * 0.04;
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0.16, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + 0.35);
            });
        } catch (e) {}
    }

    // Warning / penalty buzz
    playPenalty() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.setValueAtTime(110, now + 0.1);

            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.25);
        } catch (e) {}
    }

    // Victory celebration fanfare
    playVictory() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const melody = [
                { f: 523.25, d: 0.12 }, // C5
                { f: 659.25, d: 0.12 }, // E5
                { f: 783.99, d: 0.12 }, // G5
                { f: 1046.50, d: 0.35 } // C6
            ];

            let offset = 0;
            melody.forEach((note) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(note.f, now + offset);

                gain.gain.setValueAtTime(0.16, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, now + offset + note.d);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + offset);
                osc.stop(now + offset + note.d);

                offset += note.d * 0.85;
            });
        } catch (e) {}
    }
}

window.unoAudio = new UnoAudioEngine();
