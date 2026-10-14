import { useEffect, useState } from 'react';

/** Keep classroom work in this tab; unavailable/corrupt storage never blocks a tool. */
export function useSessionState<T>(key: string, fallback: T, validate: (value: unknown) => value is T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null');
      return validate(saved) ? saved : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The tool remains usable when browser storage is disabled or full.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
