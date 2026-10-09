// Web Audio API Ringtone & Call Audio Synthesizer
// Zero external file dependencies - pure procedural audio synthesis

class SoundService {
  private audioCtx: AudioContext | null = null;
  private ringInterval: any = null;
  private isPlaying = false;

  private initContext() {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  // Play romantic incoming marimba chime (like WhatsApp/iPhone sweet ring)
  playIncomingRingtone() {
    this.stop();
    this.isPlaying = true;

    const playChimeSequence = () => {
      if (!this.isPlaying) return;
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Romantic melodic notes: F#5, A5, C#6, E6, C#6
      const notes = [
        { f: 739.99, t: 0.0, d: 0.22 },  // F#5
        { f: 880.00, t: 0.16, d: 0.22 }, // A5
        { f: 1108.73, t: 0.32, d: 0.25 }, // C#6
        { f: 1318.51, t: 0.48, d: 0.35 }, // E6
        { f: 1108.73, t: 0.85, d: 0.25 }, // C#6
        { f: 1318.51, t: 1.05, d: 0.45 }, // E6
      ];

      notes.forEach(({ f, t, d }) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + t);

          gain.gain.setValueAtTime(0, now + t);
          gain.gain.linearRampToValueAtTime(0.28, now + t + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + t);
          osc.stop(now + t + d);
        } catch {}
      });
    };

    playChimeSequence();
    this.ringInterval = setInterval(playChimeSequence, 2300);
  }

  // Outgoing ringtone ("tuuut... tuuut...")
  playOutgoingTone() {
    this.stop();
    this.isPlaying = true;

    const playBeep = () => {
      if (!this.isPlaying) return;
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now); // 440 Hz soft dial pulse

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.06);
        gain.gain.setValueAtTime(0.12, now + 0.9);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.1);
      } catch {}
    };

    playBeep();
    this.ringInterval = setInterval(playBeep, 2800);
  }

  // Short romantic chime on call connect
  playConnectTone() {
    this.stop();
    const ctx = this.initContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [880, 1318.51].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.12);
        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.25);
      });
    } catch {}
  }

  // Play subtle, sweet message popup sound (like cute iMessage/WhatsApp pop)
  playMessageTone() {
    const ctx = this.initContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  // Stop all active audio
  stop() {
    this.isPlaying = false;
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }
}

export const soundService = new SoundService();
