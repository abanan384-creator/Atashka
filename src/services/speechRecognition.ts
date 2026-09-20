/**
 * Voice Recognition Service (Web Speech Recognition API)
 * Allows seniors to simply say "Принял" or "Отложи" without needing to tap the screen.
 * Gracefully degrades if microphone is not available or unsupported.
 */

type VoiceCommandHandler = {
  onConfirm: () => void;
  onSnooze: () => void;
};

class SpeechRecognitionService {
  private recognition: any = null;
  private isListening: boolean = false;
  private handler: VoiceCommandHandler | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        try {
          this.recognition = new SpeechRecognitionClass();
          this.recognition.lang = "ru-RU";
          this.recognition.continuous = true;
          this.recognition.interimResults = false;

          this.recognition.onresult = (event: any) => {
            const lastResultIndex = event.results.length - 1;
            const transcript = event.results[lastResultIndex][0].transcript.toLowerCase().trim();

            const words = transcript.toLowerCase().split(/[^а-яёa-z0-9]+/i);
            const hasConfirmWord = words.some((w: string) =>
              ["принял", "приняла", "выпил", "выпила", "да", "готов", "готово"].includes(w)
            );
            const hasSnoozeWord = words.some((w: string) =>
              ["отложи", "отложить", "позже", "напомни", "напомнить", "нет"].includes(w)
            );

            if (hasConfirmWord) {
              this.handler?.onConfirm();
              this.stop();
            } else if (hasSnoozeWord) {
              this.handler?.onSnooze();
              this.stop();
            }
          };

          this.recognition.onend = () => {
            this.isListening = false;
          };

          this.recognition.onerror = () => {
            this.isListening = false;
          };
        } catch {
          this.recognition = null;
        }
      }
    }
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public startListening(handler: VoiceCommandHandler) {
    if (!this.recognition || this.isListening) return;

    this.handler = handler;
    try {
      this.recognition.start();
      this.isListening = true;
    } catch {
      this.isListening = false;
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
      this.isListening = false;
    }
    this.handler = null;
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
