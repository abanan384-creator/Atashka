/**
 * Audio guidance service using ElevenLabs AI Voice (via Supabase Edge Function `medication-voice`)
 * with graceful fallback to Web Speech API & tactile Web Audio API sound effects.
 * Provides calm, clear vocal prompts and tactile feedback for elderly users.
 * Offline-first and respectful of user's sound preferences.
 */

const SUPABASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  "https://znsjrujhsadiywsimywf.supabase.co";

const SUPABASE_ANON_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) || "";

const VOICE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/medication-voice`;

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

  // ElevenLabs playback & caching state
  private currentAudio: HTMLAudioElement | null = null;
  private audioCache: Map<string, string> = new Map();
  private pendingRequests: Map<string, Promise<string>> = new Map();
  private playId: number = 0;

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
    if (!val) {
      this.stop();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public stop(): void {
    this.playId++;
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // audio element pause fallback
      }
      this.currentAudio = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // synth cancel fallback
      }
    }
    this.onSpeakingCallback?.(false);
  }

  // Tactical click / touch sound
  public playClick() {
    if (!this.enabled || typeof window === "undefined") return;
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
   * Fetch ElevenLabs audio from deployed Supabase Edge Function `medication-voice`
   */
  private async getAudioUrl(text: string): Promise<string> {
    const trimmed = text.trim();
    if (this.audioCache.has(trimmed)) {
      return this.audioCache.get(trimmed)!;
    }

    if (this.pendingRequests.has(trimmed)) {
      return this.pendingRequests.get(trimmed)!;
    }

    const fetchPromise = (async () => {
      try {
        const res = await fetch(VOICE_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(SUPABASE_ANON_KEY ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
          },
          body: JSON.stringify({ text: trimmed }),
        });

        if (!res.ok) {
          throw new Error(`Voice Edge Function returned HTTP ${res.status}`);
        }

        const blob = await res.blob();
        if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
          const objectUrl = URL.createObjectURL(blob);
          this.audioCache.set(trimmed, objectUrl);
          return objectUrl;
        }
        throw new Error("URL.createObjectURL not supported");
      } finally {
        this.pendingRequests.delete(trimmed);
      }
    })();

    this.pendingRequests.set(trimmed, fetchPromise);
    return fetchPromise;
  }

  /**
   * Play ElevenLabs audio element with lifecycle callbacks
   */
  private playAudioElement(audioUrl: string, expectedPlayId: number): Promise<void> {
    return new Promise((resolve) => {
      if (typeof Audio === "undefined" || this.playId !== expectedPlayId || !this.enabled) {
        resolve();
        return;
      }

      try {
        const audio = new Audio(audioUrl);
        this.currentAudio = audio;
        let finished = false;

        const cleanup = () => {
          if (!finished) {
            finished = true;
            this.onSpeakingCallback?.(false);
            if (this.currentAudio === audio) {
              this.currentAudio = null;
            }
            resolve();
          }
        };

        audio.onplay = () => {
          if (this.playId === expectedPlayId) {
            this.onSpeakingCallback?.(true);
          }
        };

        audio.onended = cleanup;
        audio.onerror = () => {
          cleanup();
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("[AudioService] HTMLAudio play() prevented by browser policy:", err);
            cleanup();
          });
        }
      } catch (e) {
        console.warn("[AudioService] Error initializing Audio element:", e);
        resolve();
      }
    });
  }

  /**
   * Web Speech API fallback when ElevenLabs or network is unavailable
   */
  private speakWebSpeech(text: string, expectedPlayId: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.enabled || !this.synth || this.playId !== expectedPlayId) {
        resolve();
        return;
      }

      try {
        if (this.synth.paused) {
          this.synth.resume();
        }
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ru-RU";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
          if (this.playId === expectedPlayId) {
            this.onSpeakingCallback?.(true);
          }
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

  /**
   * Spoken voice guidance in Russian.
   * Priority: ElevenLabs AI voice (via Supabase Edge Function `medication-voice`) -> Web Speech API fallback.
   */
  public async speak(text: string): Promise<void> {
    if (!this.enabled || !text || !text.trim()) {
      return;
    }

    // Immediately stop prior speech so the new announcement plays without overlap
    this.stop();
    const currentPlayId = ++this.playId;

    try {
      const audioUrl = await this.getAudioUrl(text);

      // Verify utterance wasn't cancelled or superseded while downloading audio
      if (this.playId !== currentPlayId || !this.enabled) {
        return;
      }

      await this.playAudioElement(audioUrl, currentPlayId);
    } catch (err) {
      console.warn("[AudioService] ElevenLabs TTS unavailable, falling back to Web Speech:", err);
      if (this.playId === currentPlayId && this.enabled) {
        await this.speakWebSpeech(text, currentPlayId);
      }
    }
  }
}

export const audioService = new AudioService();
