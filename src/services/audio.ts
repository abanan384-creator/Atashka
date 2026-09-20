/**
 * Audio guidance service using Web Speech API & Web Audio API
 * Provides calm, clear AI vocal prompts and tactile audio feedback for elderly users.
 * Offline-first and respectful of user's sound preferences.
 */

export interface VoiceService {
  speak(text: string): Promise<void>;
  stop(): void;
  playAlarm(): void;
  playChime(type?: "alarm" | "reminder" | "confirm" | "snooze"): void;
  playClick(): void;
  setEnabled(val: boolean): void;
  isEnabled(): boolean;
}

class AudioService implements VoiceService {
  private synth: SpeechSynthesis | null = null;
  private audioCtx: AudioContext | null = null;
  private enabled: boolean = true;
  private voices: SpeechSynthesisVoice[] = [];
  private onSpeakingCallback: ((speaking: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (!val && this.synth) {
      this.synth.cancel();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
    this.onSpeakingCallback?.(false);
  }

  // Tactical click / touch sound
  public playClick() {
    if (!this.enabled || typeof window === "undefined") return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx || this.audioCtx.state === "suspended") {
        this.audioCtx = new AudioCtxClass();
      }

      const now = this.audioCtx.currentTime;
      this.playTone(650, now, 0.05, "sine");
    } catch {
      // AudioContext fallback
    }
  }

  // Alarm clock sound & gentle feedback tones
  public playChime(type: "alarm" | "reminder" | "confirm" | "snooze" = "alarm") {
    if (!this.enabled || typeof window === "undefined") return;

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx || this.audioCtx.state === "suspended") {
        this.audioCtx = new AudioCtxClass();
      }

      const now = this.audioCtx.currentTime;

      if (type === "alarm" || type === "reminder") {
        // Classic digital alarm clock sound: rhythmic double-beeps
        const beepDuration = 0.075;
        const bursts = [0, 0.32, 0.64, 0.96];
        bursts.forEach((burstStart) => {
          this.playTone(850, now + burstStart, beepDuration, "triangle");
          this.playTone(850, now + burstStart + 0.11, beepDuration, "triangle");
        });
      } else if (type === "confirm") {
        // Uplifting major triad
        this.playTone(523.25, now, 0.2, "triangle");
        this.playTone(659.25, now + 0.15, 0.2, "triangle");
        this.playTone(783.99, now + 0.3, 0.45, "triangle");
      } else {
        // Calming gentle tone
        this.playTone(440, now, 0.25, "sine");
        this.playTone(392, now + 0.2, 0.4, "sine");
      }
    } catch {
      // AudioContext policy fallback
    }
  }

  public playAlarm() {
    this.playChime("alarm");
  }

  private playTone(freq: number, start: number, duration: number, type: OscillatorType) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(start);
    osc.stop(start + duration);
  }

  public setSpeakingListener(cb: (speaking: boolean) => void) {
    this.onSpeakingCallback = cb;
  }

  /**
   * AI voice accompaniment in Russian for button clicks and screen transitions
   */
  public speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.enabled || !this.synth) {
        resolve();
        return;
      }

      try {
        if (this.synth.paused) {
          this.synth.resume();
        }
        this.synth.cancel(); // Stop prior utterance immediately so new button speaks instantly

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ru-RU";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
          this.onSpeakingCallback?.(true);
        };
        utterance.onend = () => {
          this.onSpeakingCallback?.(false);
          resolve();
        };
        utterance.onerror = () => {
          this.onSpeakingCallback?.(false);
          resolve();
        };

        const available = this.voices.length > 0 ? this.voices : this.synth.getVoices();
        const ruVoice = available.find(
          (v) => v.lang.startsWith("ru") || v.lang === "ru_RU" || v.lang.toLowerCase().includes("russian")
        );
        if (ruVoice) {
          utterance.voice = ruVoice;
        }

        this.synth.speak(utterance);
      } catch {
        this.onSpeakingCallback?.(false);
        resolve();
      }
    });
  }
}

export const audioService = new AudioService();
