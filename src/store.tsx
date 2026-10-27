import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState, Profile, Session, WorkoutTemplate, WeeklyReview, FoodEntry } from './types';
import { HIIT_PRESETS, BUILT_IN_TEMPLATES } from './data/templates';
import { FOODS } from './data/foods';
import { checkMilestones, decideOutcome, MILESTONES, uid, weekStats, OUTCOME_COPY } from './logic/calc';
import { addDays, weekIdOfTs, ymd, today, parseYmd } from './logic/dates';

export const STORAGE_KEY = 'forma:v1';

export const defaultProfile = (): Profile => ({
  name: '', onboarded: false, experience: 'beginner', goals: [], customGoal: '', environment: 'mixed', equipment: ['Bodyweight'],
  daysPerWeek: 3, sessionMinutes: 45, preferredDays: [0, 2, 4],
  calorieTracking: true, calorieTarget: 2200, proteinTarget: 120, carbTarget: null, fatTarget: null, fibreTarget: null,
  nutritionApproach: 'balanced', dietPrefs: [], exclusions: '', bodyWeight: null, mealSlots: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'],
  sculptureStyle: 'abstract', sculptureBuild: 'balanced', sculptureDetail: 'full', nutritionEffects: 'gentle', wrappersEnabled: false, habitTags: [],
  reviewCounts: { sessions: true, nutrition: true, habits: false },
  units: { weight: 'kg', distance: 'km' }, theme: 'system', motion: 'system', textScale: 1, motivation: true, confidenceMode: false,
  demoFigure: 'feminine', sound: true, notifications: false,
});

export const initialState = (): AppState => ({
  version: 1, profile: defaultProfile(), templates: [], schedule: { weekly: {} }, sessions: [], activeSessionId: null,
  foods: [], meals: [], reviews: [],
  sculpture: { refinement: 0, weathering: 0, repairs: 0, lastChange: null, vitality: 0, neglect: 0, wrappers: 0, milestones: {} },
  hiitPresets: HIIT_PRESETS, hiitRun: null, dismissedTips: [], measurements: [], createdAt: Date.now(),
});

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as AppState;
    const base = initialState();
    return { ...base, ...parsed, profile: { ...base.profile, ...parsed.profile }, sculpture: { ...base.sculpture, ...parsed.sculpture } };
  } catch {
    return initialState();
  }
}

export interface Toast { id: string; text: string; tone: 'ok' | 'warn' | 'error' | 'info'; action?: { label: string; run: () => void } }

interface Ctx {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  toast: (text: string, tone?: Toast['tone'], action?: Toast['action']) => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  saveError: boolean;
}
const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saveError, setSaveError] = useState(false);
  const first = useRef(true);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok', action?: Toast['action']) => {
    const id = uid();
    setToasts((t) => [...t.slice(-2), { id, text, tone, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 7000 : 3800);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState((prev) => {
      let next = fn(prev);
      const fresh = checkMilestones(next);
      if (fresh.length) {
        const ms = { ...next.sculpture.milestones };
        fresh.forEach((id) => (ms[id] = Date.now()));
        next = { ...next, sculpture: { ...next.sculpture, milestones: ms } };
        const names = fresh.map((id) => MILESTONES.find((m) => m.id === id)?.title).filter(Boolean).join(', ');
        setTimeout(() => toast(`Milestone reached: ${names}`, 'info'), 50);
      }
      return next;
    });
  }, [toast]);

  // Persist every change. If storage fails (private mode, quota), say so — never pretend it saved.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (saveError) setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [state]);

  // Theme, motion and text size
  useEffect(() => {
    const root = document.documentElement;
    const p = state.profile;
    if (p.theme === 'system') delete root.dataset.theme; else root.dataset.theme = p.theme;
    if (p.motion === 'reduced') root.dataset.motion = 'reduced'; else delete root.dataset.motion;
    root.style.setProperty('--text-scale', String(p.textScale));
  }, [state.profile.theme, state.profile.motion, state.profile.textScale]);

  const value = useMemo(() => ({ state, update, toast, toasts, dismissToast, saveError }), [state, update, toast, toasts, dismissToast, saveError]);
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}

// ---------- Actions (pure state transforms) ----------
export function sessionFromTemplate(t: WorkoutTemplate): Session {
  return {
    id: uid(), templateId: t.id, name: t.name, kind: 'workout', startedAt: Date.now(), pausedTotal: 0, status: 'active',
    cursor: { entry: 0, set: 0 },
    entries: t.items.map((i) => ({
      itemId: i.id, exerciseId: i.exerciseId, restSec: i.restSec, group: i.group,
      target: { sets: i.sets, reps: i.reps, weight: i.weight, seconds: i.seconds, distance: i.distance },
      sets: Array.from({ length: i.sets }, () => ({ reps: i.reps, weight: i.weight, seconds: i.seconds, distance: i.distance, done: false })),
    })),
  };
}

export const startSession = (s: AppState, t: WorkoutTemplate): AppState => {
  const sess = sessionFromTemplate(t);
  return { ...s, sessions: [...s.sessions, sess], activeSessionId: sess.id };
};

export function applyReview(s: AppState, r: Omit<WeeklyReview, 'outcome' | 'envDelta' | 'completedAt'>, extra: { plannedBreak: boolean; reducedTarget: number | null }): AppState {
  // Idempotent: a week can only be processed once.
  if (s.reviews.some((x) => x.weekId === r.weekId)) return s;
  const d = decideOutcome({
    planned: r.plannedSessions, completed: r.completedSessions, partial: r.partialSessions, tracked: r.nutritionDaysTracked, met: r.nutritionDaysMet,
    habitsKept: r.habitsKept, habitLogs: r.habitLogs, counted: r.counted, plannedBreak: extra.plannedBreak, reducedTarget: extra.reducedTarget,
    firstWeek: s.createdAt >= parseYmd(r.weekId).getTime(),
  }, s.sculpture, s.profile);
  const sc = s.sculpture;
  const review: WeeklyReview = { ...r, outcome: d.outcome, envDelta: d.env, completedAt: Date.now() };
  return {
    ...s,
    reviews: [...s.reviews, review].sort((a, b) => a.weekId.localeCompare(b.weekId)),
    profile: { ...s.profile, daysPerWeek: r.nextTarget },
    sculpture: {
      ...sc,
      refinement: sc.refinement + d.refine,
      weathering: Math.max(0, Math.min(3, sc.weathering + d.weather)),
      repairs: sc.repairs + (d.outcome === 'restored' ? 1 : 0),
      vitality: Math.max(0, Math.min(5, sc.vitality + d.env.vitality)),
      neglect: Math.max(0, Math.min(3, sc.neglect + d.env.neglect)),
      wrappers: Math.max(0, Math.min(3, sc.wrappers + d.env.wrappers)),
      lastChange: { kind: d.outcome, at: Date.now(), text: OUTCOME_COPY[d.outcome].title },
    },
  };
}

// ---------- Sample data, for exploring the demo ----------
export function seedSample(base: AppState, name = 'Alex'): AppState {
  let s: AppState = {
    ...initialState(),
    profile: {
      ...base.profile, name, onboarded: true, experience: 'beginner', goals: ['strength', 'consistency'], environment: 'mixed',
      equipment: ['Bodyweight', 'Dumbbells', 'Bench', 'Cable machine', 'Machine', 'Barbell'], daysPerWeek: 3, preferredDays: [0, 2, 4],
      calorieTarget: 1850, proteinTarget: 120, habitTags: ['Late-night snacking'],
    },
    schedule: { weekly: { 0: 'tpl-gym-fullbody', 2: 'tpl-home-start', 4: 'tpl-gym-fullbody' } },
  };
  const rnd = mulberry(7);
  const thisWeek = weekIdOfTs(Date.now());
  const weeks = 7;
  const tpls = BUILT_IN_TEMPLATES;
  for (let w = weeks; w >= 1; w--) {
    const wk = addDays(thisWeek, -7 * w);
    const skipWeek = w === 4; // one quieter week, to show weathering & restoration
    const days = skipWeek ? [1] : [0, 2, 4];
    days.forEach((d, idx) => {
      const date = addDays(wk, d);
      const t = tpls[d === 2 ? 0 : 1];
      const prog = (weeks - w) * 0.6;
      const start = new Date(`${date}T18:${String(10 + idx).padStart(2, '0')}:00`).getTime();
      const sess: Session = {
        id: uid(), templateId: t.id, name: t.name, kind: 'workout', startedAt: start, endedAt: start + (38 + Math.round(rnd() * 14)) * 60000,
        pausedTotal: 0, status: skipWeek ? 'partial' : 'completed', cursor: { entry: 0, set: 0 }, rpe: 6 + Math.round(rnd() * 2),
        entries: t.items.map((i, k) => ({
          itemId: i.id, exerciseId: i.exerciseId, restSec: i.restSec, group: i.group,
          target: { sets: i.sets, reps: i.reps, weight: i.weight, seconds: i.seconds, distance: i.distance },
          sets: Array.from({ length: i.sets }, (_, j) => ({
            reps: i.reps != null ? i.reps + (rnd() > 0.7 ? 1 : 0) : undefined,
            weight: i.weight != null ? Math.round((i.weight + prog * 2) * 2) / 2 : undefined,
            seconds: i.seconds != null ? i.seconds + Math.round(prog * 3) : undefined,
            distance: i.distance, done: !(skipWeek && (k > 2 || j > 1)),
          })),
        })),
      };
      s.sessions.push(sess);
    });
    // Food logs: most days tracked
    for (let d = 0; d < 7; d++) {
      const date = addDays(wk, d);
      if (rnd() < 0.2) continue;
      const pickF = (n: string) => FOODS.find((f) => f.name.startsWith(n))!;
      const add = (meal: string, n: string, qty = 1, habit?: string) => {
        const f = pickF(n);
        s.foods.push({ id: uid(), date, meal, name: f.name, serving: f.serving, qty, per: f.per, source: 'reference', createdAt: Date.now(), habitTag: habit } as FoodEntry);
      };
      add('Breakfast', 'Porridge oats, made with semi', 1); add('Breakfast', 'Banana');
      add('Lunch', rnd() > 0.5 ? 'Chicken wrap' : 'Falafel wrap'); add('Lunch', 'Greek yoghurt, 0%');
      add('Dinner', rnd() > 0.5 ? 'Salmon fillet' : 'Chicken breast', 1); add('Dinner', 'Basmati rice', 1.2); add('Dinner', 'Broccoli', 1.5);
      add('Snacks', 'Whey protein', 1); add('Snacks', 'Almonds', 1);
      if (skipWeek && d > 3) add('Snacks', 'Crisps', 1, 'Late-night snacking');
    }
    const st = weekStats(s, wk);
    s = applyReview(s, {
      weekId: wk, plannedSessions: 3, completedSessions: st.completed, partialSessions: st.partial, setsPlanned: st.setsPlanned, setsDone: st.setsDone,
      nutritionDaysTracked: st.tracked, nutritionDaysMet: st.met, habitsKept: !skipWeek, habitLogs: st.habitLogs, energy: skipWeek ? 2 : 4, recovery: 3,
      notes: '', nextTarget: 3, counted: s.profile.reviewCounts,
    }, { plannedBreak: false, reducedTarget: null });
  }
  // Today: a breakfast logged
  s.foods.push({ id: uid(), date: today(), meal: 'Breakfast', name: FOODS[1].name, serving: FOODS[1].serving, qty: 1, per: FOODS[1].per, source: 'reference', createdAt: Date.now() });
  const ms: Record<string, number> = {};
  checkMilestones(s).forEach((id) => (ms[id] = Date.now()));
  s.sculpture = { ...s.sculpture, milestones: ms, seenCelebration: Date.now() };
  s.createdAt = parseYmd(addDays(thisWeek, -7 * weeks)).getTime();
  return s;
}

function mulberry(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const nowYmd = () => ymd(new Date());
