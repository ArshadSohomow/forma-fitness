let ctx: AudioContext | null = null;

/** Soft sine tones for timer cues. Must be unlocked by a user gesture (we call `unlockAudio` on Start). */
export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!ctx && AC) ctx = new AC();
    if (ctx?.state === 'suspended') ctx.resume();
  } catch { /* audio not available */ }
}

export function beep(kind: 'tick' | 'go' | 'rest' | 'done' = 'tick') {
  if (!ctx) return;
  const freq = { tick: 660, go: 880, rest: 520, done: 740 }[kind];
  const dur = kind === 'tick' ? 0.08 : kind === 'done' ? 0.5 : 0.25;
  const reps = kind === 'done' ? 3 : 1;
  for (let i = 0; i < reps; i++) {
    const t0 = ctx.currentTime + i * 0.22;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  try { navigator.vibrate?.(kind === 'tick' ? 30 : 120); } catch { /* ignore */ }
}
