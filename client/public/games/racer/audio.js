// Web Audio API Synthesizer & Synthwave BGM for 3D Cyberpunk Neon Racer
// 100% procedural Web Audio: Layered engine with RPM & gear shift, turbo whistle, boost whoosh,
// tire screech, barrier scrape sparks, collision impact, F1 countdown beeps, and light synthwave bass loop!

class RacerAudioEngine {
    constructor() {
        this.ctx = null;
        this.sfxMuted = false;
        this.musicMuted = false;
        
        // Engine sound layers
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineGain = null;
        this.engineFilter = null;
        this.isEngineRunning = false;
        this.currentGear = 1;
        this.gearRpm = 0.2;
        
        // Continuous tire screech oscillator & gain
        this.skidOsc = null;
        this.skidGain = null;
        this.isSkidding = false;
        
        // Synthwave procedural music loop
        this.bgmTimer = null;
        this.bgmStep = 0;
        this.bgmPlaying = false;
        
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
            if (!this.musicMuted && !this.bgmPlaying) {
                this.startBGM();
            }
            window.removeEventListener('pointerdown', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
        };

        window.addEventListener('pointerdown', unlockAudio, { passive: true });
        window.addEventListener('keydown', unlockAudio, { passive: true });
        window.addEventListener('touchstart', unlockAudio, { passive: true });
    }

    ensureContext() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx && !this.sfxMuted;
    }

    startEngine() {
        if (!this.ensureContext() || this.isEngineRunning) return;
        try {
            const now = this.ctx.currentTime;
            
            // Sub-harmonic rumble (low sawtooth)
            this.engineOsc1 = this.ctx.createOscillator();
            this.engineOsc1.type = 'sawtooth';
            this.engineOsc1.frequency.setValueAtTime(45, now);

            // Throaty twin-turbo overtone (triangle)
            this.engineOsc2 = this.ctx.createOscillator();
            this.engineOsc2.type = 'triangle';
            this.engineOsc2.frequency.setValueAtTime(90, now);

            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.setValueAtTime(360, now);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.045, now);

            this.engineOsc1.connect(this.engineFilter);
            this.engineOsc2.connect(this.engineFilter);
            this.engineFilter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc1.start(now);
            this.engineOsc2.start(now);
            this.isEngineRunning = true;
        } catch (e) {
            console.warn('Engine audio error:', e);
        }
    }

    // Realistic RPM and Gear Simulation
    updateEngine(speedRatio, isNitro = false) {
        if (!this.isEngineRunning || !this.engineOsc1 || this.sfxMuted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;

            // Compute gear (1st to 6th) and simulated engine RPM (0.1 to 1.0)
            const scaledSpeed = Math.max(0, Math.min(1.4, speedRatio));
            let gear = 1;
            let rpm = 0.2;

            if (scaledSpeed < 0.2) {
                gear = 1;
                rpm = 0.2 + (scaledSpeed / 0.2) * 0.7;
            } else if (scaledSpeed < 0.45) {
                gear = 2;
                rpm = 0.35 + ((scaledSpeed - 0.2) / 0.25) * 0.6;
            } else if (scaledSpeed < 0.72) {
                gear = 3;
                rpm = 0.4 + ((scaledSpeed - 0.45) / 0.27) * 0.58;
            } else if (scaledSpeed < 1.0) {
                gear = 4;
                rpm = 0.45 + ((scaledSpeed - 0.72) / 0.28) * 0.53;
            } else if (scaledSpeed < 1.25) {
                gear = 5;
                rpm = 0.5 + ((scaledSpeed - 1.0) / 0.25) * 0.48;
            } else {
                gear = 6;
                rpm = 0.6 + ((scaledSpeed - 1.25) / 0.25) * 0.4;
            }

            if (isNitro) rpm = Math.min(1.15, rpm * 1.2);
            this.currentGear = gear;
            this.gearRpm = rpm;

            const baseFreq = 48 + rpm * 140;
            this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
            this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.01, now, 0.05);

            // Filter opens up as RPM climbs
            const filterFreq = 280 + rpm * 800;
            this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.06);

            const targetGain = 0.035 + rpm * 0.055;
            this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
        } catch (e) {}
    }

    stopEngine() {
        if (this.engineGain && this.ctx) {
            try {
                this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
                setTimeout(() => {
                    if (this.engineOsc1) {
                        try { this.engineOsc1.stop(); this.engineOsc1.disconnect(); } catch (e) {}
                        this.engineOsc1 = null;
                    }
                    if (this.engineOsc2) {
                        try { this.engineOsc2.stop(); this.engineOsc2.disconnect(); } catch (e) {}
                        this.engineOsc2 = null;
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
            
            // 1. High Velocity Noise Burst (Whoosh)
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.8);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.35));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(600, now);
            filter.frequency.exponentialRampToValueAtTime(3200, now + 0.35);
            filter.Q.setValueAtTime(3.5, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.24, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.75);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);

            // 2. High-Pitched Turbocharger Whistle (Sine sweep)
            const whistle = this.ctx.createOscillator();
            const whistleGain = this.ctx.createGain();
            whistle.type = 'sine';
            whistle.frequency.setValueAtTime(1400, now);
            whistle.frequency.exponentialRampToValueAtTime(3800, now + 0.45);

            whistleGain.gain.setValueAtTime(0.06, now);
            whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            whistle.connect(whistleGain);
            whistleGain.connect(this.ctx.destination);
            whistle.start(now);
            whistle.stop(now + 0.55);
        } catch (e) {}
    }

    playDrift() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            
            // Modulated Screech Sound
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(480 + Math.random() * 60, now);
            osc.frequency.linearRampToValueAtTime(390, now + 0.18);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1200, now);
            filter.Q.setValueAtTime(5.0, now);

            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.2);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.22);
        } catch (e) {}
    }

    playBarrierScrape() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            // Metal grating scratch
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(900 + Math.random() * 300, now);
            osc.frequency.linearRampToValueAtTime(500, now + 0.12);

            gain.gain.setValueAtTime(0.07, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.16);
        } catch (e) {}
    }

    playCollision() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(35, now + 0.28);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.32);
        } catch (e) {}
    }

    playCountdownBeep(isGo = false) {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            const freq = isGo ? 987.77 : 440; // B5 for GO!, A4 for red lights
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.6 : 0.25));

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + (isGo ? 0.65 : 0.28));
        } catch (e) {}
    }

    playVictory() {
        if (!this.ensureContext()) return;
        try {
            const now = this.ctx.currentTime;
            const notes = [
                { f: 523.25, t: 0.0 },   // C5
                { f: 659.25, t: 0.14 },  // E5
                { f: 783.99, t: 0.28 },  // G5
                { f: 1046.5, t: 0.42 },  // C6
                { f: 880.0,  t: 0.65 },  // A5
                { f: 1046.5, t: 0.90 }   // C6
            ];

            notes.forEach(n => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, now + n.t);

                gain.gain.setValueAtTime(0.18, now + n.t);
                gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + 0.45);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + n.t);
                osc.stop(now + n.t + 0.5);
            });
        } catch (e) {}
    }

    // Procedural Synthwave BGM Loop (Deep driving bass + neon arp chord)
    startBGM() {
        if (this.musicMuted || this.bgmPlaying || !this.ctx) return;
        this.bgmPlaying = true;
        this.bgmStep = 0;

        // 120 BPM Synthwave 16-step bassline progression
        // Notes: F1, F1, Ab1, Bb1, C2
        const bassNotes = [
            43.65, 43.65, 43.65, 51.91, 43.65, 43.65, 58.27, 65.41,
            43.65, 43.65, 43.65, 51.91, 58.27, 51.91, 43.65, 38.89
        ];

        const stepTime = 130; // ~115 BPM 16th notes
        this.bgmTimer = setInterval(() => {
            if (this.musicMuted || !this.ctx || this.ctx.state !== 'running') return;
            try {
                const now = this.ctx.currentTime;
                const note = bassNotes[this.bgmStep % bassNotes.length];
                
                // Bass synth pluck
                const osc = this.ctx.createOscillator();
                const filter = this.ctx.createBiquadFilter();
                const gain = this.ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(note, now);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(420, now);
                filter.frequency.exponentialRampToValueAtTime(140, now + 0.11);

                gain.gain.setValueAtTime(0.045, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.13);

                // High synth sparkle on every 4th step
                if (this.bgmStep % 4 === 0) {
                    const arpOsc = this.ctx.createOscillator();
                    const arpGain = this.ctx.createGain();
                    arpOsc.type = 'sine';
                    arpOsc.frequency.setValueAtTime(698.46, now); // F5
                    arpGain.gain.setValueAtTime(0.02, now);
                    arpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                    arpOsc.connect(arpGain);
                    arpGain.connect(this.ctx.destination);
                    arpOsc.start(now);
                    arpOsc.stop(now + 0.2);
                }

                this.bgmStep++;
            } catch (e) {}
        }, stepTime);
    }

    stopBGM() {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
        this.bgmPlaying = false;
    }

    toggleSFX() {
        this.sfxMuted = !this.sfxMuted;
        if (this.sfxMuted) {
            this.stopEngine();
        } else if (this.isEngineRunning) {
            this.startEngine();
        }
        return !this.sfxMuted;
    }

    toggleMusic() {
        this.musicMuted = !this.musicMuted;
        if (this.musicMuted) {
            this.stopBGM();
        } else {
            this.startBGM();
        }
        return !this.musicMuted;
    }
}

window.racerAudio = new RacerAudioEngine();
