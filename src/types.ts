export type Experience = 'new' | 'beginner' | 'intermediate' | 'advanced' | 'athlete';
export type SculptureStyle = 'masculine' | 'feminine' | 'abstract';
export type SculptureBuild = 'slender' | 'balanced' | 'broad';
export type Measure = 'weight_reps' | 'reps' | 'time' | 'distance' | 'assisted';
export type MealSlot = string; // 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks' | custom

export interface Profile {
  name: string;
  onboarded: boolean;
  experience: Experience;
  goals: string[];
  customGoal: string;
  environment: string;
  equipment: string[];
  daysPerWeek: number;
  sessionMinutes: number;
  preferredDays: number[]; // 0 = Monday … 6 = Sunday
  // Nutrition
  calorieTracking: boolean;
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number | null;
  fatTarget: number | null;
  fibreTarget: number | null;
  nutritionApproach: string;
  dietPrefs: string[];
  exclusions: string;
  bodyWeight: number | null; // stored in kg
  mealSlots: string[];
  // Sculpture
  sculptureStyle: SculptureStyle;
  sculptureBuild: SculptureBuild;
  sculptureDetail: 'full' | 'reduced';
  nutritionEffects: 'off' | 'gentle' | 'standard';
  wrappersEnabled: boolean;
  habitTags: string[]; // user-defined habits they want to cut back on
  reviewCounts: { sessions: boolean; nutrition: boolean; habits: boolean };
  // Preferences
  units: { weight: 'kg' | 'lb'; distance: 'km' | 'mi' };
  theme: 'system' | 'light' | 'dark';
  motion: 'system' | 'reduced';
  textScale: number;
  motivation: boolean;
  confidenceMode: boolean;
  demoFigure: 'masculine' | 'feminine';
  sound: boolean;
  notifications: boolean;
}

export interface WorkoutItem {
  id: string;
  exerciseId: string;
  sets: number;
  reps?: number;
  weight?: number; // kg
  seconds?: number;
  distance?: number; // km
  restSec: number;
  group?: string; // same value = superset / circuit
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  style: string;
  environment: 'gym' | 'home' | 'any';
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  intensity: 'low' | 'moderate' | 'high';
  items: WorkoutItem[];
  builtIn?: boolean;
  createdAt: number;
}

export interface SetLog {
  reps?: number;
  weight?: number; // kg (negative not allowed; assisted stored as assist kg)
  seconds?: number;
  distance?: number; // km
  rpe?: number;
  done: boolean;
}

export interface SessionEntry {
  itemId: string;
  exerciseId: string;
  target: { sets: number; reps?: number; weight?: number; seconds?: number; distance?: number };
  restSec: number;
  group?: string;
  sets: SetLog[];
  skipped?: boolean;
  notes?: string;
}

export interface Session {
  id: string;
  templateId?: string;
  name: string;
  kind: 'workout' | 'hiit' | 'quicklog';
  startedAt: number;
  endedAt?: number;
  pausedTotal: number;
  pausedAt?: number;
  status: 'active' | 'completed' | 'partial';
  entries: SessionEntry[];
  cursor: { entry: number; set: number };
  restEndsAt?: number;
  rpe?: number;
  notes?: string;
  hiit?: { rounds: number; work: number; rest: number; exercises: string[] };
}

export interface Nutrients { kcal: number; protein: number; carbs: number; fat: number; fibre?: number }

export interface FoodEntry {
  id: string;
  date: string; // YYYY-MM-DD local
  meal: MealSlot;
  name: string;
  serving: string;
  qty: number;
  per: Nutrients; // nutrients per one serving
  source: 'reference' | 'manual' | 'meal';
  habitTag?: string;
  createdAt: number;
}

export interface SavedMeal {
  id: string;
  name: string;
  servings: number; // recipe yields this many servings
  items: { name: string; serving: string; qty: number; per: Nutrients; source: FoodEntry['source'] }[];
  createdAt: number;
}

export type WeekOutcome = 'refined' | 'restored' | 'held' | 'weathered';

export interface WeeklyReview {
  weekId: string; // Monday date YYYY-MM-DD
  completedAt: number;
  plannedSessions: number;
  completedSessions: number;
  partialSessions: number;
  setsPlanned: number;
  setsDone: number;
  nutritionDaysTracked: number;
  nutritionDaysMet: number;
  habitsKept: boolean | null;
  habitLogs: number;
  energy: number | null; // 1-5
  recovery: number | null; // 1-5
  outcome: WeekOutcome;
  envDelta: { vitality: number; neglect: number; wrappers: number };
  notes: string;
  nextTarget: number;
  counted: { sessions: boolean; nutrition: boolean; habits: boolean };
}

export interface SculptureState {
  refinement: number; // successful weeks counted
  weathering: number; // 0-3, reversible
  repairs: number;
  lastChange: { kind: WeekOutcome | 'start'; at: number; text: string } | null;
  vitality: number; // environment 0-5
  neglect: number; // 0-3
  wrappers: number; // 0-3, only when user opts in
  milestones: Record<string, number>; // id -> timestamp unlocked
  seenCelebration?: number;
}

export interface Schedule {
  weekly: Record<number, string | null>; // weekday (0=Mon) -> template id
}

export interface HiitConfig {
  name: string;
  warmup: number;
  work: number;
  rest: number;
  rounds: number;
  exercises: string[];
  cooldown: number;
  roundRest: number;
}

export interface HiitRun {
  config: HiitConfig;
  startedAt: number;
  pausedAt?: number;
  pausedTotal: number;
  skipOffset: number; // seconds skipped forward
  finished?: boolean;
}

export interface AppState {
  version: 1;
  profile: Profile;
  templates: WorkoutTemplate[];
  schedule: Schedule;
  sessions: Session[];
  activeSessionId: string | null;
  foods: FoodEntry[];
  meals: SavedMeal[];
  reviews: WeeklyReview[];
  sculpture: SculptureState;
  hiitPresets: HiitConfig[];
  hiitRun: HiitRun | null;
  dismissedTips: string[];
  measurements: { id: string; date: string; weight?: number; waist?: number }[]; // kg, cm
  createdAt: number;
}
