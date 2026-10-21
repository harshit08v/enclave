/**
 * ENCLAVE Call Audio Manager
 * Synthesizes gentle, privacy-first calling tones using the Web Audio API.
 * Guarantees zero external network asset dependencies, zero missing audio files,
 * precise volume envelopes, autoplay unlocking, and clean resource destruction.
 */

export interface CallSoundPreferences {
  ringtoneEnabled: boolean;
  ringbackEnabled: boolean;
  vibrationEnabled: boolean;
  volume: number; // 0.0 to 1.0
}

const DEFAULT_PREFERENCES: CallSoundPreferences = {
  ringtoneEnabled: true,
  ringbackEnabled: true,
  vibrationEnabled: true,
  volume: 0.75
};

const PREFS_STORAGE_KEY = 'enclave_call_sound_prefs';

export class CallAudioManager {
  private ctx: AudioContext | null = null;
  private currentLoopTimer: NodeJS.Timeout | null = null;
  private activeNodes: (AudioNode | { stop?: () => void })[] = [];
  private isMuted = false;
  private prefs: CallSoundPreferences = { ...DEFAULT_PREFERENCES };
  private autoplayBlocked = false;

  constructor() {
    this.loadPreferences();
  }

  private loadPreferences() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(PREFS_STORAGE_KEY);
      if (stored) {
        this.prefs = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch {
      this.prefs = { ...DEFAULT_PREFERENCES };
    }
  }

  public getPreferences(): CallSoundPreferences {
    return { ...this.prefs };
  }

  public updatePreferences(newPrefs: Partial<CallSoundPreferences>) {
    this.prefs = { ...this.prefs, ...newPrefs };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(this.prefs));
      } catch {}
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        this.autoplayBlocked = true;
      });
    }

    return this.ctx;
  }

  public async unlockAudio(): Promise<boolean> {
    const ctx = this.getAudioContext();
    if (!ctx) return false;
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      this.autoplayBlocked = false;
      return true;
    } catch {
      this.autoplayBlocked = true;
      return false;
    }
  }

  public isAutoplayBlocked(): boolean {
    if (!this.ctx) return false;
    return this.ctx.state === 'suspended' || this.autoplayBlocked;
  }

  /**
   * Plays the incoming ringtone loop:
   * Repeating gentle, harmonic bell chimes (E5 & B5 -> G#5 & E6) with exponential decay.
   */
  public playIncomingRingtone(): void {
    this.stopAll();
    if (!this.prefs.ringtoneEnabled || this.isMuted) return;

    const playCycle = () => {
      const ctx = this.getAudioContext();
      if (!ctx || ctx.state === 'suspended') {
        this.autoplayBlocked = true;
      }

      if (ctx && ctx.state === 'running') {
        const now = ctx.currentTime;
        const vol = Math.max(0.01, Math.min(1.0, this.prefs.volume));

        // Master gain for this chime
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(vol * 0.45, now);
        masterGain.connect(ctx.destination);

        // Chime Note 1: E5 (659.25Hz) + subtle octave E6
        this.createBellNote(ctx, masterGain, 659.25, now, 0.4);
        this.createBellNote(ctx, masterGain, 987.77, now + 0.08, 0.5);

        // Chime Note 2 (secondary harmony after 280ms)
        this.createBellNote(ctx, masterGain, 830.61, now + 0.28, 0.4);
        this.createBellNote(ctx, masterGain, 1318.51, now + 0.36, 0.6);
      }

      // Haptic vibration on mobile where available
      if (this.prefs.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([300, 200, 300]);
        } catch {}
      }

      // Schedule next repeat after 2.6 seconds
      this.currentLoopTimer = setTimeout(playCycle, 2600);
    };

    playCycle();
  }

  /**
   * Plays the outgoing ringback tone loop:
   * Standard soft dual-frequency tone (440Hz + 480Hz) at 1.4s on, 2.6s silence.
   */
  public playOutgoingRingback(): void {
    this.stopAll();
    if (!this.prefs.ringbackEnabled || this.isMuted) return;

    const playCycle = () => {
      const ctx = this.getAudioContext();
      if (!ctx || ctx.state === 'suspended') {
        this.autoplayBlocked = true;
      }

      if (ctx && ctx.state === 'running') {
        const now = ctx.currentTime;
        const vol = Math.max(0.01, Math.min(1.0, this.prefs.volume));

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.0001, now);
        // Soft ramp up
        gainNode.gain.exponentialRampToValueAtTime(vol * 0.18, now + 0.08);
        // Hold
        gainNode.gain.setValueAtTime(vol * 0.18, now + 1.25);
        // Soft ramp down
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
        gainNode.connect(ctx.destination);

        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc1.connect(gainNode);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);
        osc2.connect(gainNode);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.45);
        osc2.stop(now + 1.45);

        this.activeNodes.push(osc1, osc2, gainNode);
      }

      this.currentLoopTimer = setTimeout(playCycle, 4000);
    };

    playCycle();
  }

  /**
   * Short, pleasant ascending chime when call connects (C5 -> G5).
   */
  public playCallConnected(): void {
    this.stopAll();
    const ctx = this.getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const vol = Math.max(0.01, Math.min(1.0, this.prefs.volume)) * 0.35;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.connect(ctx.destination);

    this.createBellNote(ctx, gain, 523.25, now, 0.2); // C5
    this.createBellNote(ctx, gain, 783.99, now + 0.14, 0.4); // G5
  }

  /**
   * Gentle descending tone when call ends (G4 -> E4).
   */
  public playCallEnded(): void {
    this.stopAll();
    const ctx = this.getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const vol = Math.max(0.01, Math.min(1.0, this.prefs.volume)) * 0.35;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.connect(ctx.destination);

    this.createBellNote(ctx, gain, 659.25, now, 0.16); // E5
    this.createBellNote(ctx, gain, 440.0, now + 0.14, 0.35); // A4
  }

  /**
   * Fast busy/declined tone (3 short pulses at 480Hz).
   */
  public playBusyTone(): void {
    this.stopAll();
    const ctx = this.getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const vol = Math.max(0.01, Math.min(1.0, this.prefs.volume)) * 0.25;

    for (let i = 0; i < 3; i++) {
      const start = now + i * 0.22;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.02);
      gain.gain.setValueAtTime(vol, start + 0.1);
      gain.gain.linearRampToValueAtTime(0.0001, start + 0.12);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, start);
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + 0.13);
      this.activeNodes.push(osc, gain);
    }
  }

  /**
   * Helper to synthesize an organic bell-like note with exponential decay.
   */
  private createBellNote(
    ctx: AudioContext,
    output: AudioNode,
    freq: number,
    startTime: number,
    duration: number
  ) {
    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(0.4, startTime + 0.015);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    noteGain.connect(output);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.connect(noteGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);

    this.activeNodes.push(osc, noteGain);
  }

  /**
   * Preview incoming ringtone (for Settings modal preview button).
   */
  public previewRingtone(): void {
    this.stopAll();
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => this.playIncomingRingtone());
    } else {
      this.playIncomingRingtone();
      // Auto-stop preview after 4 seconds
      setTimeout(() => this.stopAll(), 4000);
    }
  }

  /**
   * Stops all running oscillators, loop timers, and vibrations immediately.
   */
  public stopAll(): void {
    if (this.currentLoopTimer) {
      clearTimeout(this.currentLoopTimer);
      this.currentLoopTimer = null;
    }

    for (const node of this.activeNodes) {
      try {
        if ('stop' in node && typeof node.stop === 'function') {
          node.stop();
        }
        if ('disconnect' in node && typeof (node as AudioNode).disconnect === 'function') {
          (node as AudioNode).disconnect();
        }
      } catch {}
    }
    this.activeNodes = [];

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  }

  /**
   * Complete destruction of audio context and all active timers.
   */
  public destroy(): void {
    this.stopAll();
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
  }
}

// Global singleton instance for easy app-wide reuse
let callAudioInstance: CallAudioManager | null = null;

export function getCallAudioManager(): CallAudioManager {
  if (!callAudioInstance) {
    callAudioInstance = new CallAudioManager();
  }
  return callAudioInstance;
}
