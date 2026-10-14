import { useCallback, useEffect, useRef } from 'react';

export function useTimerAlarm() {
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => () => { void audio.current?.close().catch(() => {}); }, []);

  const prepare = useCallback(() => {
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume().catch(() => {});
    } catch {
      // Visual completion remains available when browser audio is unsupported.
    }
  }, []);

  const ring = useCallback(() => {
    const context = audio.current;
    if (!context || context.state !== 'running') return;
    for (let index = 0; index < 3; index += 1) {
      const start = context.currentTime + index * 0.4;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.26);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
  }, []);

  return { prepare, ring };
}
