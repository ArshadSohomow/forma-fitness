import type { AppState, FoodEntry, Nutrients, Profile, Session, SetLog, WeekOutcome, SculptureState, WorkoutTemplate } from '../types';
import { BUILT_IN_TEMPLATES } from '../data/templates';
import { exerciseById } from '../data/exercises';
import { addDays, weekDays, weekIdOfTs, ymd } from './dates';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ---------- Units ----------
export const KG_PER_LB = 0.45359237;
export const toDisplayWeight = (kg: number | undefined, unit: Profile['units']['weight']) =>
  kg == null ? undefined : unit === 'kg' ? round1(kg) : round1(kg / KG_PER_LB);
export const fromDisplayWeight = (v: number, unit: Profile['units']['weight']) => (unit === 'kg' ? v : v * KG_PER_LB);
export const toDisplayDist = (km: number | undefined, unit: Profile['units']['distance']) =>
  km == null ? undefined : unit === 'km' ? round2(km) : round2(km / 1.609344);
export const fromDisplayDist = (v: number, unit: Profile['units']['distance']) => (unit === 'km' ? v : v * 1.609344);
export const round1 = (n: number) => Math.round(n * 10) / 10;
export const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- Templates ----------
export const allTemplates = (s: AppState): WorkoutTemplate[] => [...s.templates, ...BUILT_IN_TEMPLATES];
export const templateById = (s: AppState, id?: string | null) => (id ? allTemplates(s).find((t) => t.id === id) : undefined);
export function estimateMinutes(t: Pick<WorkoutTemplate, 'items'>) {
  let sec = 0;
  for (const i of t.items) {
    const ex = exerciseById(i.exerciseId);
    const work = i.seconds ?? (i.distance ? i.distance * 600 : (i.reps ?? 10) * 4 + 15);
    sec += i.sets * work + Math.max(0, i.sets - 1) * i.restSec + 60;
    if (ex?.measure === 'distance' && i.distance) sec = sec - i.sets * work + i.distance * 600;
  }
  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}

// ---------- Sessions ----------
export const sessionDuration = (s: Session) => {
  const end = s.endedAt ?? Date.now();
  const paused = s.pausedTotal + (s.pausedAt ? end - s.pausedAt : 0);
  return Math.max(0, end - s.startedAt - paused);
};
export const finishedSessions = (s: AppState) => s.sessions.filter((x) => x.status !== 'active').sort((a, b) => b.startedAt - a.startedAt);
export const setsDone = (x: Session) => x.entries.reduce((a, e) => a + e.sets.filter((st) => st.done).length, 0);
export const setsPlanned = (x: Session) => x.entries.reduce((a, e) => a + e.target.sets, 0);
export const repsDone = (x: Session) => x.entries.reduce((a, e) => a + e.sets.filter((st) => st.done).reduce((b, st) => b + (st.reps ?? 0), 0), 0);
export const volumeKg = (x: Session) => x.entries.reduce((a, e) => a + e.sets.filter((st) => st.done).reduce((b, st) => b + (st.reps ?? 0) * (st.weight ?? 0), 0), 0);

// ---------- Personal records ----------
export interface PR { exerciseId: string; kind: 'weight' | 'reps' | 'time' | 'distance'; value: number; reps?: number; at: number; sessionId: string }

function bestOf(sets: SetLog[], measure: string) {
  const done = sets.filter((s) => s.done);
  const out: { kind: PR['kind']; value: number; reps?: number }[] = [];
  if (measure === 'weight_reps') {
    const w = done.filter((s) => (s.reps ?? 0) > 0).reduce<SetLog | null>((b, s) => (!b || (s.weight ?? 0) > (b.weight ?? 0) ? s : b), null);
    if (w && (w.weight ?? 0) > 0) out.push({ kind: 'weight', value: w.weight!, reps: w.reps });
  }
  if (measure === 'reps' || measure === 'assisted' || measure === 'weight_reps') {
    const r = Math.max(0, ...done.map((s) => s.reps ?? 0));
    if (r > 0 && measure !== 'weight_reps') out.push({ kind: 'reps', value: r });
  }
  if (measure === 'time') { const t = Math.max(0, ...done.map((s) => s.seconds ?? 0)); if (t > 0) out.push({ kind: 'time', value: t }); }
  if (measure === 'distance') { const d = Math.max(0, ...done.map((s) => s.distance ?? 0)); if (d > 0) out.push({ kind: 'distance', value: d }); }
  return out;
}

/** Personal records in chronological order; returns current best per exercise+kind and the PRs set by each session. */
export function computePRs(sessions: Session[]) {
  const best = new Map<string, PR>();
  const bySession = new Map<string, PR[]>();
  const ordered = sessions.filter((s) => s.status !== 'active').sort((a, b) => a.startedAt - b.startedAt);
  for (const s of ordered) {
    for (const e of s.entries) {
      const ex = exerciseById(e.exerciseId);
      if (!ex) continue;
      for (const b of bestOf(e.sets, ex.measure)) {
        const key = `${e.exerciseId}:${b.kind}`;
        const prev = best.get(key);
        if (!prev || b.value > prev.value) {
          const pr: PR = { exerciseId: e.exerciseId, kind: b.kind, value: b.value, reps: b.reps, at: s.startedAt, sessionId: s.id };
          if (prev) bySession.set(s.id, [...(bySession.get(s.id) ?? []), pr]); // first-ever log is a baseline, not a PB
          best.set(key, pr);
        }
      }
    }
  }
  return { best, bySession };
}

/** Last completed performance for an exercise before a given time */
export function previousPerformance(sessions: Session[], exerciseId: string, before: number) {
  const prev = sessions
    .filter((s) => s.status !== 'active' && s.startedAt < before && s.entries.some((e) => e.exerciseId === exerciseId && e.sets.some((x) => x.done)))
    .sort((a, b) => b.startedAt - a.startedAt)[0];
  if (!prev) return null;
  const e = prev.entries.find((x) => x.exerciseId === exerciseId)!;
  return { at: prev.startedAt, sets: e.sets.filter((x) => x.done) };
}

// ---------- Nutrition ----------
export const entryTotals = (e: Pick<FoodEntry, 'per' | 'qty'>): Nutrients => ({
  kcal: e.per.kcal * e.qty, protein: e.per.protein * e.qty, carbs: e.per.carbs * e.qty, fat: e.per.fat * e.qty, fibre: (e.per.fibre ?? 0) * e.qty,
});
export function sumNutrients(list: Pick<FoodEntry, 'per' | 'qty'>[]): Nutrients {
  return list.reduce<Nutrients>((a, e) => {
    const t = entryTotals(e);
    return { kcal: a.kcal + t.kcal, protein: a.protein + t.protein, carbs: a.carbs + t.carbs, fat: a.fat + t.fat, fibre: (a.fibre ?? 0) + (t.fibre ?? 0) };
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 });
}
export const dayFoods = (s: AppState, date: string) => s.foods.filter((f) => f.date === date);
/** A day "meets" nutrition goals when protein ≥ 90% of target and, if calories are tracked, intake is within ±15% of target. */
export function dayMeetsTargets(p: Profile, t: Nutrients) {
  const protein = t.protein >= p.proteinTarget * 0.9;
  const kcal = !p.calorieTracking || (t.kcal >= p.calorieTarget * 0.85 && t.kcal <= p.calorieTarget * 1.15);
  return protein && kcal;
}

/** Suggested targets — clearly an estimate (Mifflin–St Jeor not used: we only know weight, so we use conservative per-kg ranges). */
export function suggestTargets(weightKg: number | null, approach: string) {
  const w = weightKg ?? 70;
  const proteinPerKg = approach === 'muscle' || approach === 'strength' || approach === 'protein' ? 1.6 : 1.2;
  const kcalPerKg = approach === 'muscle' ? 35 : approach === 'weight-goal' ? 28 : 31;
  return { calories: Math.round((w * kcalPerKg) / 50) * 50, protein: Math.round((w * proteinPerKg) / 5) * 5 };
}

// ---------- Weekly stats ----------
export function plannedForWeek(s: AppState) {
  const sched = Object.values(s.schedule.weekly).filter(Boolean).length;
  return Math.max(1, sched || s.profile.daysPerWeek);
}

export function weekStats(s: AppState, weekId: string) {
  const days = weekDays(weekId);
  const end = addDays(weekId, 7);
  const inWeek = s.sessions.filter((x) => x.status !== 'active' && ymd(new Date(x.startedAt)) >= weekId && ymd(new Date(x.startedAt)) < end);
  const completed = inWeek.filter((x) => x.status === 'completed').length;
  const partial = inWeek.filter((x) => x.status === 'partial').length;
  const sPlanned = inWeek.reduce((a, x) => a + setsPlanned(x), 0);
  const sDone = inWeek.reduce((a, x) => a + setsDone(x), 0);
  let tracked = 0, met = 0;
  const perDay = days.map((d) => {
    const list = s.foods.filter((f) => f.date === d);
    const totals = sumNutrients(list);
    const ok = list.length > 0 && dayMeetsTargets(s.profile, totals);
    if (list.length) { tracked++; if (ok) met++; }
    return { date: d, totals, tracked: list.length > 0, met: ok, sessions: inWeek.filter((x) => ymd(new Date(x.startedAt)) === d) };
  });
  const habitLogs = s.foods.filter((f) => f.habitTag && f.date >= weekId && f.date < end).length;
  const review = s.reviews.find((r) => r.weekId === weekId);
  const planned = review?.plannedSessions ?? plannedForWeek(s);
  return { weekId, planned, completed, partial, setsPlanned: sPlanned, setsDone: sDone, tracked, met, perDay, habitLogs, sessions: inWeek, review };
}

// ---------- Sculpture ----------
export const STAGES = [
  { at: 0, name: 'Rough block', note: 'The form is still hidden in the stone.' },
  { at: 1, name: 'First cuts', note: 'The outline of a head has begun to appear.' },
  { at: 3, name: 'Emerging form', note: 'Shoulders and torso are breaking free of the block.' },
  { at: 6, name: 'Figure revealed', note: 'The whole figure stands clear, still bearing tool marks.' },
  { at: 10, name: 'Refined', note: 'Surfaces are smoothed and contours defined.' },
  { at: 16, name: 'Polished', note: 'A finished, luminous form on a dressed plinth.' },
];
export const stageIndex = (refinement: number) => STAGES.reduce((acc, st, i) => (refinement >= st.at ? i : acc), 0);
export const nextStage = (refinement: number) => STAGES[stageIndex(refinement) + 1];

export interface OutcomeInput {
  planned: number; completed: number; partial: number; tracked: number; met: number; habitsKept: boolean | null; habitLogs: number;
  counted: { sessions: boolean; nutrition: boolean; habits: boolean }; plannedBreak: boolean; reducedTarget: number | null;
  firstWeek?: boolean; // the week the user joined never weathers
}

/**
 * Decide the week's outcome. Measurements are kept separate; they are never blended into a single score.
 * - Full success on every counted goal → refined (and repairs one level of weathering if present).
 * - Reaching at least half, or meeting a self-set reduced target → held / restored (repairs weathering).
 * - A planned break → held, no weathering.
 * - Otherwise → weathered by one level (max 3). Refinement is never removed.
 */
export function decideOutcome(i: OutcomeInput, sc: SculptureState, p: Profile) {
  const sessionRatio = i.planned > 0 ? Math.min(1, (i.completed + 0.5 * i.partial) / i.planned) : 1;
  const nutritionRatio = i.tracked >= 3 ? i.met / i.tracked : null;
  const checks: { label: string; pass: boolean | null; detail: string }[] = [];
  if (i.counted.sessions) checks.push({ label: 'Sessions', pass: sessionRatio >= 0.75, detail: `${i.completed} of ${i.planned} completed${i.partial ? ` (+${i.partial} partial)` : ''}` });
  if (i.counted.nutrition) checks.push({ label: 'Nutrition', pass: nutritionRatio == null ? null : nutritionRatio >= 0.6, detail: nutritionRatio == null ? 'Fewer than 3 days tracked — not counted this week' : `Targets met on ${i.met} of ${i.tracked} tracked days` });
  if (i.counted.habits) checks.push({ label: 'Habits', pass: i.habitsKept, detail: i.habitsKept == null ? 'Not answered — not counted' : i.habitsKept ? 'You kept the habits you chose' : 'Habits slipped this week' });

  const scored = checks.filter((c) => c.pass !== null);
  const allPass = scored.length > 0 && scored.every((c) => c.pass);
  const reducedMet = i.reducedTarget != null && i.completed + i.partial >= i.reducedTarget;
  const halfway = sessionRatio >= 0.5;

  let outcome: WeekOutcome;
  let refine = 0, weather = 0;
  if (i.plannedBreak) { outcome = sc.weathering > 0 ? 'restored' : 'held'; weather = sc.weathering > 0 ? -1 : 0; }
  else if (allPass) { refine = 1; weather = sc.weathering > 0 ? -1 : 0; outcome = sc.weathering > 0 ? 'restored' : 'refined'; }
  else if (halfway || reducedMet) { weather = sc.weathering > 0 ? -1 : 0; outcome = sc.weathering > 0 ? 'restored' : 'held'; }
  else if (i.firstWeek) { outcome = 'held'; }
  else { weather = sc.weathering < 3 ? 1 : 0; outcome = 'weathered'; }

  // Environment: only broad, multi-day nutrition patterns, and only if the user wants these effects.
  const env = { vitality: 0, neglect: 0, wrappers: 0 };
  if (p.nutritionEffects !== 'off') {
    const hi = p.nutritionEffects === 'gentle' ? 0.5 : 0.6;
    const lo = p.nutritionEffects === 'gentle' ? 0.2 : 0.35;
    if (nutritionRatio != null && nutritionRatio >= hi) { env.vitality = sc.vitality < 5 ? 1 : 0; env.neglect = sc.neglect > 0 ? -1 : 0; }
    else if (nutritionRatio != null && nutritionRatio < lo) { env.neglect = sc.neglect < 3 ? 1 : 0; }
    else if (outcome === 'refined' && sc.neglect > 0) env.neglect = -1;
    if (p.wrappersEnabled) {
      const lim = p.nutritionEffects === 'gentle' ? 6 : 4;
      if (i.habitLogs >= lim) env.wrappers = sc.wrappers < 3 ? 1 : 0;
      else if (i.habitLogs <= 1 && sc.wrappers > 0) env.wrappers = -1;
    }
  }
  if (outcome === 'refined' && p.nutritionEffects === 'off' && sc.vitality < 5) env.vitality = 1; // training-only users still see the garden grow

  return { outcome, refine, weather, env, checks, sessionRatio, nutritionRatio };
}

export const OUTCOME_COPY: Record<WeekOutcome, { title: string; text: string }> = {
  refined: { title: 'A little more revealed', text: 'You met the goals you chose. The chisel took another careful pass.' },
  restored: { title: 'Restored', text: 'You came back to your routine, and the weathered area has been cleaned and repaired.' },
  held: { title: 'Holding steady', text: 'Not every week is a big one. Everything you have built is intact.' },
  weathered: { title: 'A little weathering', text: 'A quieter week left some dust on the stone. Nothing is lost — one steady week will restore it.' },
};

// ---------- Milestones ----------
export const MILESTONES: { id: string; title: string; reward: string }[] = [
  { id: 'first-workout', title: 'First session', reward: 'A first chisel mark, engraved on the plaque.' },
  { id: 'first-week', title: 'A consistent week', reward: 'A sprig of laurel on the plinth.' },
  { id: 'first-month', title: 'First month of training', reward: 'An olive tree planted beside the sculpture.' },
  { id: 'w25', title: '25 sessions', reward: 'A carved band around the plinth.' },
  { id: 'w100', title: '100 sessions', reward: 'A gilded inscription on the plinth.' },
  { id: 'first-pb', title: 'A personal best', reward: 'A brighter highlight across the marble.' },
  { id: 'comeback', title: 'Returned after a break', reward: 'A gold seam where the stone was mended.' },
  { id: 'habit-season', title: 'A season of habit', reward: 'Ivy climbing the niche wall.' },
  { id: 'programme', title: 'Programme completed', reward: 'A second planter of flowers.' },
];

export function checkMilestones(s: AppState): string[] {
  const have = s.sculpture.milestones;
  const done = finishedSessions(s);
  const out: string[] = [];
  const add = (id: string, cond: boolean) => { if (cond && !have[id]) out.push(id); };
  add('first-workout', done.length >= 1);
  add('first-week', s.reviews.some((r) => r.outcome === 'refined' || r.outcome === 'restored'));
  add('first-month', s.reviews.filter((r) => r.outcome === 'refined' || r.outcome === 'restored').length >= 4);
  add('w25', done.length >= 25);
  add('w100', done.length >= 100);
  add('first-pb', computePRs(s.sessions).bySession.size > 0);
  const asc = [...done].sort((a, b) => a.startedAt - b.startedAt);
  add('comeback', asc.some((x, i) => i > 0 && x.startedAt - asc[i - 1].startedAt >= 14 * 86400000));
  add('habit-season', s.reviews.filter((r) => r.habitsKept).length >= 12);
  const counts = new Map<string, number>();
  done.forEach((x) => x.templateId && counts.set(x.templateId, (counts.get(x.templateId) ?? 0) + 1));
  add('programme', [...counts.values()].some((c) => c >= 12));
  return out;
}

export function daysSinceLastSession(s: AppState) {
  const last = finishedSessions(s)[0];
  return last ? Math.floor((Date.now() - last.startedAt) / 86400000) : null;
}
export const thisWeekId = () => weekIdOfTs(Date.now());
