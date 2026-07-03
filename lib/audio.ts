'use client';

let soundEnabled = false;

// Safely read from localStorage on the client
if (typeof window !== 'undefined') {
  soundEnabled = localStorage.getItem('portfolio_sound') === 'true';
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('portfolio_sound', enabled ? 'true' : 'false');
  }
}

/**
 * Synthesizes a low-latency mechanical click (analogous to an electrical relay click).
 * SFX disabled.
 */
export function playClick(): void {
  // disabled
}

/**
 * Synthesizes a micro data transmission sweep (rising sine frequency).
 * SFX disabled.
 */
export function playSweep(): void {
  // disabled
}
