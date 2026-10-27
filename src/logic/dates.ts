const pad = (n: number) => String(n).padStart(2, '0');

export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
export const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
/** 0 = Monday … 6 = Sunday */
export const weekday = (s: string) => (parseYmd(s).getDay() + 6) % 7;
export const weekIdOf = (s: string) => addDays(s, -weekday(s));
export const weekIdOfTs = (ts: number) => weekIdOf(ymd(new Date(ts)));
export const weekDays = (weekId: string) => Array.from({ length: 7 }, (_, i) => addDays(weekId, i));
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const fmtDate = (s: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  parseYmd(s).toLocaleDateString('en-GB', opts);
export const fmtTs = (ts: number, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(ts).toLocaleDateString('en-GB', opts);
export const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export function fmtDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h) return `${h}h ${pad(m)}m`;
  if (m >= 10) return `${m} min`;
  return `${m}:${pad(sec)}`;
}
export function clock(sec: number) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}
export const weekLabel = (weekId: string) => `${fmtDate(weekId, { day: 'numeric', month: 'short' })} – ${fmtDate(addDays(weekId, 6), { day: 'numeric', month: 'short' })}`;
