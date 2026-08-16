class SoundEffects {
  private ctx: AudioContext | null = null;
  muted = false;

  private initCtx() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser environment.", e);
    }
  }

  /**
   * Play a bright, positive double chime for correct answers
   */
  playCorrect() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5
    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);
  }

  /**
   * Play a harsh, low buzzer sound for wrong guesses/strikes
   */
  playWrong() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(130.81, now); // C3
    osc1.frequency.linearRampToValueAtTime(100.00, now + 0.25);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);
  }

  /**
   * Play a positive sci-fi rising sweep for draft clicks
   */
  playSelect() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Play a futuristic falling sweep for skips or cancels
   */
  playSkip() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Play an upbeat triumphant fanfare for round/game victories
   */
  playVictory() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C4, E4, G4, C5, E5

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.06, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  }

  /**
   * Play a dramatic bass drop or showdown rumble sound
   */
  playShowdown() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 1.2);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.2);
  }

  /**
   * Play a fast chiptune click flutter representing card spinning
   */
  playCardSpin() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(300 + i * 120, now + i * 0.04);
      gain.gain.setValueAtTime(0.04, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.04);
    }
  }

  /**
   * Play different audio cues based on the rarity of decrypted character card
   */
  playReveal(rarity: "Common" | "Rare" | "Epic" | "Legendary") {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (rarity === "Legendary") {
      // Golden grand Major chord fanfare
      const notes = [440.00, 554.37, 659.25, 880.00, 1109.73]; // A Major Chord
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.03);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.3, now + idx * 0.03 + 0.5);
        gain.gain.setValueAtTime(0.08, now + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.7);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.03);
        osc.stop(now + idx * 0.03 + 0.7);
      });
    } else if (rarity === "Epic") {
      // Sparkling cosmic triangle sweep
      const notes = [392.00, 493.88, 587.33, 783.99]; // G Major
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.06, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.45);
      });
    } else if (rarity === "Rare") {
      // Brighter rising double tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      // Common: Clean click sound
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }
}

export const sfx = new SoundEffects();

// Auto-unlock AudioContext on first user interaction (browser autoplay policy)
if (typeof window !== "undefined") {
  const unlock = () => {
    sfx.playSelect(); // Plays a quiet confirmation sound on first interaction
    window.removeEventListener("click", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("click", unlock);
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock);
}

export function playSound(name: string) {
  if (sfx.muted) return;
  switch (name) {
    case "click":
      sfx.playSelect();
      break;
    case "success":
      sfx.playCorrect();
      break;
    case "error":
      sfx.playWrong();
      break;
    case "victory":
      sfx.playVictory();
      break;
    case "skip":
      sfx.playSkip();
      break;
    default:
      sfx.playSelect();
  }
}

export function stopMusic() {
  // No ambient background music loop is currently playing; retained for API parity.
}

export function toggleMute(muted: boolean) {
  sfx.muted = muted;
}
