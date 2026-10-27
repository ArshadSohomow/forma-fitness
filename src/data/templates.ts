import type { HiitConfig, WorkoutTemplate, WorkoutItem } from '../types';

let n = 0;
const it = (exerciseId: string, sets: number, o: Partial<WorkoutItem> = {}): WorkoutItem => ({
  id: `b${++n}`, exerciseId, sets, restSec: 90, ...o,
});
const T = (t: Omit<WorkoutTemplate, 'builtIn' | 'createdAt'>): WorkoutTemplate => ({ ...t, builtIn: true, createdAt: 0 });

export const BUILT_IN_TEMPLATES: WorkoutTemplate[] = [
  T({ id: 'tpl-home-start', name: 'Home foundations', style: 'Bodyweight · Beginner-friendly', environment: 'home', level: 'beginner', intensity: 'low',
    description: 'A gentle full-body routine with no equipment. A good first session.',
    items: [it('bodyweight-squat', 3, { reps: 10, restSec: 60 }), it('incline-push-up', 3, { reps: 8, restSec: 60 }), it('glute-bridge', 3, { reps: 12, restSec: 45 }), it('band-row', 3, { reps: 12, restSec: 60 }), it('plank', 2, { seconds: 20, restSec: 45 })] }),
  T({ id: 'tpl-gym-fullbody', name: 'Gym full body A', style: 'Full body · Strength', environment: 'gym', level: 'beginner', intensity: 'moderate',
    description: 'Machines and dumbbells covering every major movement. Simple to follow in a busy gym.',
    items: [it('goblet-squat', 3, { reps: 10, weight: 12 }), it('dumbbell-bench-press', 3, { reps: 10, weight: 10 }), it('lat-pulldown', 3, { reps: 10, weight: 35 }), it('romanian-deadlift', 3, { reps: 10, weight: 12 }), it('plank', 2, { seconds: 30, restSec: 60 })] }),
  T({ id: 'tpl-upper', name: 'Upper body', style: 'Upper/lower split · Hypertrophy', environment: 'gym', level: 'intermediate', intensity: 'moderate',
    description: 'Press and pull pairings for chest, back, shoulders and arms.',
    items: [it('bench-press', 4, { reps: 8, weight: 40, restSec: 120 }), it('seated-cable-row', 3, { reps: 10, weight: 40 }), it('shoulder-press', 3, { reps: 10, weight: 12 }), it('lat-pulldown', 3, { reps: 10, weight: 40 }), it('bicep-curl', 2, { reps: 12, weight: 8, restSec: 60, group: 'ss1' }), it('tricep-pushdown', 2, { reps: 12, weight: 15, restSec: 60, group: 'ss1' })] }),
  T({ id: 'tpl-lower', name: 'Lower body', style: 'Upper/lower split · Strength', environment: 'gym', level: 'intermediate', intensity: 'moderate',
    description: 'Squat, hinge and single-leg work, finished with core.',
    items: [it('back-squat', 4, { reps: 6, weight: 50, restSec: 150 }), it('romanian-deadlift', 3, { reps: 8, weight: 40, restSec: 120 }), it('leg-press', 3, { reps: 10, weight: 80 }), it('lunge', 2, { reps: 10, restSec: 60 }), it('dead-bug', 2, { reps: 10, restSec: 45 })] }),
  T({ id: 'tpl-push', name: 'Push', style: 'Push/pull/legs', environment: 'gym', level: 'intermediate', intensity: 'moderate',
    description: 'Chest, shoulders and triceps.',
    items: [it('bench-press', 4, { reps: 8, weight: 40, restSec: 120 }), it('shoulder-press', 3, { reps: 10, weight: 12 }), it('push-up', 2, { reps: 12, restSec: 60 }), it('tricep-pushdown', 3, { reps: 12, weight: 15, restSec: 60 })] }),
  T({ id: 'tpl-pull', name: 'Pull', style: 'Push/pull/legs', environment: 'gym', level: 'intermediate', intensity: 'moderate',
    description: 'Back and biceps.',
    items: [it('deadlift', 3, { reps: 5, weight: 60, restSec: 150 }), it('lat-pulldown', 3, { reps: 10, weight: 40 }), it('seated-cable-row', 3, { reps: 10, weight: 40 }), it('bicep-curl', 3, { reps: 12, weight: 8, restSec: 60 })] }),
  T({ id: 'tpl-dumbbell', name: 'Dumbbell-only full body', style: 'Dumbbells · Home or gym', environment: 'any', level: 'all', intensity: 'moderate',
    description: 'Everything you need with a pair of dumbbells and a bench.',
    items: [it('goblet-squat', 3, { reps: 12, weight: 12 }), it('dumbbell-bench-press', 3, { reps: 10, weight: 10 }), it('dumbbell-row', 3, { reps: 10, weight: 12 }), it('romanian-deadlift', 3, { reps: 10, weight: 12 }), it('shoulder-press', 2, { reps: 10, weight: 8 })] }),
  T({ id: 'tpl-mobility', name: 'Mobility reset', style: 'Mobility · Low impact', environment: 'home', level: 'all', intensity: 'low',
    description: 'Fifteen calm minutes to loosen up — good for recovery days.',
    items: [it('cat-cow', 2, { reps: 8, restSec: 20 }), it('hip-flexor-stretch', 2, { seconds: 40, restSec: 20 }), it('glute-bridge', 2, { reps: 12, restSec: 30 }), it('dead-bug', 2, { reps: 8, restSec: 30 })] }),
  T({ id: 'tpl-core', name: 'Core in 12', style: 'Core · Low impact', environment: 'any', level: 'beginner', intensity: 'low',
    description: 'Short and steady core work.',
    items: [it('dead-bug', 3, { reps: 10, restSec: 30 }), it('plank', 3, { seconds: 30, restSec: 30 }), it('side-plank', 2, { seconds: 20, restSec: 30 }), it('glute-bridge', 2, { reps: 15, restSec: 30 })] }),
  T({ id: 'tpl-return', name: 'Welcome back', style: 'Re-entry · Low impact', environment: 'any', level: 'all', intensity: 'low',
    description: 'A manageable session for returning after a break. Lighter than usual, on purpose.',
    items: [it('bodyweight-squat', 2, { reps: 10, restSec: 60 }), it('incline-push-up', 2, { reps: 8, restSec: 60 }), it('glute-bridge', 2, { reps: 10, restSec: 45 }), it('brisk-walk', 1, { distance: 1.5, restSec: 0 })] }),
  T({ id: 'tpl-walk', name: 'Easy cardio', style: 'Cardio · Low impact', environment: 'any', level: 'all', intensity: 'low',
    description: 'A brisk walk you can record by distance and time.',
    items: [it('brisk-walk', 1, { distance: 3, restSec: 0 })] }),
];

export const HIIT_PRESETS: HiitConfig[] = [
  { name: 'Tabata', warmup: 60, work: 20, rest: 10, rounds: 8, exercises: ['jumping-jack', 'mountain-climber'], cooldown: 60, roundRest: 0 },
  { name: 'Beginner 30/30', warmup: 120, work: 30, rest: 30, rounds: 3, exercises: ['bodyweight-squat', 'high-knees', 'incline-push-up', 'glute-bridge'], cooldown: 120, roundRest: 60 },
  { name: 'Classic 40/20', warmup: 120, work: 40, rest: 20, rounds: 3, exercises: ['burpee', 'bodyweight-squat', 'mountain-climber', 'push-up', 'jumping-jack'], cooldown: 120, roundRest: 60 },
  { name: 'Low-impact 30/30', warmup: 120, work: 30, rest: 30, rounds: 3, exercises: ['bodyweight-squat', 'glute-bridge', 'incline-push-up', 'dead-bug'], cooldown: 120, roundRest: 45 },
];
