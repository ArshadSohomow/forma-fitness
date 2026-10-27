export const GENERAL = [
  'Small efforts, repeated, become extraordinary.',
  "You don't need a perfect week. You need a consistent one.",
  "Today's effort is part of a much longer story.",
  'Consistency is built one session at a time.',
  'Your plan should support your life, not compete with it.',
  'A sustainable routine is more valuable than a perfect week.',
];
export const RETURNING = [
  "Progress isn't always linear. Returning is progress too.",
  'Welcome back. Start lighter than you think — the habit matters more than the load.',
];
export const NEW_USER = [
  'Learn the movement first. Add complexity when you\'re ready.',
  'Every sculpture begins as rough stone.',
];
export const ON_TRACK = [
  'The chisel is moving. Keep the rhythm.',
  'Steady weeks like this are what reveal the form.',
];
export const TIPS = [
  { id: 'tip-sleep', text: 'Recovery happens between sessions. Sleep is part of your training.' },
  { id: 'tip-overload', text: 'Progressive overload can be one more rep, a slower lowering, or better control — not only more weight.' },
  { id: 'tip-protein', text: 'Spreading protein across meals is often easier than fitting it all into one.' },
  { id: 'tip-warmup', text: 'A few lighter warm-up sets prepare your joints and rehearse the movement.' },
  { id: 'tip-habit', text: 'Attach training to something you already do — after work, before breakfast — to make it automatic.' },
];
export const AFTER_WORKOUT = [
  'Session recorded. That is one more deliberate action.',
  'Well done. The work is in the book.',
  'Another layer of marble cleared.',
];

export function pick<T>(arr: T[], seed: number) {
  return arr[Math.abs(seed) % arr.length];
}
