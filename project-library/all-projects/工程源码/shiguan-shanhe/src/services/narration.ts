export interface NarrationEvents {
  onStart: () => void;
  onEnd: () => void;
  onError: () => void;
}

export interface Narrator {
  readonly supported: boolean;
  speak(text: string, events: NarrationEvents): void;
  stop(): void;
}

export class BrowserNarrator implements Narrator {
  get supported(): boolean {
    return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  speak(text: string, events: NarrationEvents): void {
    if (!this.supported) {
      events.onError();
      return;
    }

    this.stop();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.86;
    utterance.pitch = 0.94;
    const chineseVoice = window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith("zh"));
    if (chineseVoice) utterance.voice = chineseVoice;
    utterance.onstart = events.onStart;
    utterance.onend = events.onEnd;
    utterance.onerror = events.onError;
    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (this.supported) window.speechSynthesis.cancel();
  }
}
