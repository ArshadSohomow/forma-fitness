import type { AppState, Profile } from '../types';
import { daysSinceLastSession, finishedSessions, computePRs } from './calc';
import { exerciseById } from '../data/exercises';

/** Rule-based starting plan. Transparent and editable; never replaces an existing plan silently. */
export function recommendPlan(p: Profile): { schedule: Record<number, string | null>; reason: string } {
  const days = p.preferredDays.length ? p.preferredDays : [0, 2, 4];
  const gym = p.environment === 'gym' || (p.environment === 'mixed' && p.equipment.some((e) => ['Cable machine', 'Barbell'].includes(e)));
  const dumbbells = p.equipment.includes('Dumbbells');
  const beginner = p.experience === 'new' || p.experience === 'beginner';
  const short = p.sessionMinutes <= 20;
  const cardio = p.goals.includes('cardio') || p.goals.includes('endurance');
  const mobility = p.goals.includes('mobility');
  let rotation: string[]; let reason: string;
  if (short) { rotation = ['tpl-core', 'tpl-mobility']; reason = 'Short sessions suit focused core and mobility work — easy to fit into busy days.'; }
  else if (!gym && !dumbbells) { rotation = ['tpl-home-start']; reason = 'A no-equipment full-body routine, so you can start at home today. Repeat it and add reps as it gets easier.'; }
  else if (!gym && dumbbells) { rotation = ['tpl-dumbbell']; reason = 'A dumbbell-only full-body session that covers every major movement.'; }
  else if (beginner || days.length <= 3) { rotation = ['tpl-gym-fullbody']; reason = 'Full-body sessions a few times a week are a reliable, well-supported way to build strength while you learn the movements.'; }
  else if (days.length >= 5) { rotation = ['tpl-push', 'tpl-pull', 'tpl-lower']; reason = 'With five or more days, a push/pull/legs rotation spreads the work out.'; }
  else { rotation = ['tpl-upper', 'tpl-lower']; reason = 'An upper/lower split alternates so each area gets time to recover.'; }
  if (cardio && days.length >= 3 && rotation.length === 1) rotation = [...rotation, rotation[0], 'tpl-walk'];
  if (mobility && days.length >= 4) rotation = [...rotation, 'tpl-mobility'];
  const schedule: Record<number, string | null> = {};
  days.forEach((d, i) => (schedule[d] = rotation[i % rotation.length]));
  return { schedule, reason };
}

export interface Suggestion { id: string; text: string; detail: string }

/** Gentle, explained progression suggestions the user can accept or ignore. */
export function progressionSuggestions(s: AppState): Suggestion[] {
  const out: Suggestion[] = [];
  const done = finishedSessions(s);
  const gap = daysSinceLastSession(s);
  if (gap != null && gap >= 14) out.push({ id: 'return', text: 'Ease back in with “Welcome back”', detail: `It’s been ${gap} days. A lighter session rebuilds the habit without leaving you sore.` });
  // Same exercise hit target reps on all sets in the last two sessions → suggest a small increase.
  const byEx = new Map<string, { allHit: boolean; at: number }[]>();
  for (const sess of done.slice(0, 12)) for (const e of sess.entries) {
    if (!e.target.reps) continue;
    const hit = e.sets.length > 0 && e.sets.every((x) => x.done && (x.reps ?? 0) >= (e.target.reps ?? 0));
    byEx.set(e.exerciseId, [...(byEx.get(e.exerciseId) ?? []), { allHit: hit, at: sess.startedAt }]);
  }
  for (const [id, list] of byEx) {
    if (list.length >= 2 && list[0].allHit && list[1].allHit) {
      const ex = exerciseById(id);
      if (!ex) continue;
      out.push({ id: `prog-${id}`, text: `Consider progressing ${ex.name.toLowerCase()}`,
        detail: ex.measure === 'weight_reps' ? 'You’ve completed every set at your target twice in a row. If your technique felt solid, try about 2.5% more weight, or one more rep per set.' : 'You’ve hit your target reps twice in a row. Try one or two more reps, or a harder variation, when it feels right.' });
    }
    if (out.length >= 3) break;
  }
  if (computePRs(s.sessions).bySession.size === 0 && done.length >= 6) out.push({ id: 'pb', text: 'Progress is more than personal bests', detail: 'Consistency, smoother technique and better recovery all count. You’re showing up — that is the foundation.' });
  return out;
}
