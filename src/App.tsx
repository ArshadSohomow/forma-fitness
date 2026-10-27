import { useEffect, type ReactElement } from 'react';
import { match, navigate, useRoute } from './router';
import { useApp } from './store';
import { Shell } from './components/Shell';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Workouts } from './pages/Workouts';
import { WorkoutEditor } from './pages/WorkoutEditor';
import { ActiveWorkout } from './pages/ActiveWorkout';
import { SessionDetail } from './pages/SessionDetail';
import { History } from './pages/History';
import { Hiit } from './pages/Hiit';
import { Library } from './pages/Library';
import { ExerciseDetail } from './pages/ExerciseDetail';
import { Nutrition } from './pages/Nutrition';
import { SculpturePage } from './pages/SculpturePage';
import { Review } from './pages/Review';
import { Progress } from './pages/Progress';
import { Profile } from './pages/Profile';
import { PageHeader, Button } from './components/ui';

const TITLES: [string, string][] = [
  ['/workouts', 'Workouts'], ['/workout', 'Workout'], ['/history', 'History'], ['/hiit', 'Interval timer'], ['/library', 'Exercises'],
  ['/nutrition', 'Nutrition'], ['/sculpture', 'My sculpture'], ['/review', 'Weekly review'], ['/progress', 'Progress'], ['/profile', 'Profile'],
];

export function App() {
  const path = useRoute();
  const { state } = useApp();

  useEffect(() => {
    const t = TITLES.find(([p]) => path.startsWith(p))?.[1];
    document.title = t ? `${t} — FORMA` : 'FORMA — sculpt your habits';
  }, [path]);

  useEffect(() => {
    if (!state.profile.onboarded && path !== '/welcome') navigate('/welcome', { replace: true });
  }, [state.profile.onboarded, path]);

  if (!state.profile.onboarded || path === '/welcome') return <Onboarding />;

  let p: Record<string, string> | null;
  if (path === '/workout/active') return <Shell path={path} immersive><ActiveWorkout /></Shell>;
  if (path === '/hiit' && state.hiitRun) return <Shell path={path} immersive><Hiit /></Shell>;

  let page: ReactElement;
  if (path === '/') page = <Dashboard />;
  else if (path === '/workouts') page = <Workouts />;
  else if (path === '/workouts/new') page = <WorkoutEditor />;
  else if ((p = match('/workouts/edit/:id', path))) page = <WorkoutEditor id={p.id} />;
  else if ((p = match('/workouts/copy/:id', path))) page = <WorkoutEditor copyOf={p.id} />;
  else if (path === '/history') page = <History />;
  else if ((p = match('/history/:id', path))) page = <SessionDetail id={p.id} />;
  else if (path === '/hiit') page = <Hiit />;
  else if (path === '/library') page = <Library />;
  else if ((p = match('/library/:id', path))) page = <ExerciseDetail id={p.id} />;
  else if (path === '/nutrition') page = <Nutrition />;
  else if (path === '/sculpture') page = <SculpturePage />;
  else if (path === '/review') page = <Review />;
  else if (path === '/progress') page = <Progress />;
  else if (path === '/profile') page = <Profile />;
  else page = (
    <div>
      <PageHeader title="Page not found" lede="That address doesn’t lead anywhere in FORMA." />
      <Button variant="primary" to="/">Go to Today</Button>
    </div>
  );
  return <Shell path={path}>{page}</Shell>;
}
