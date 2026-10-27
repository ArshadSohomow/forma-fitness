import { useState } from 'react';
import { useApp, startSession } from '../store';
import { navigate } from '../router';
import { Button, PageHeader, Panel, Segmented, Tag, Confirm, Icon } from '../components/ui';
import { allTemplates, estimateMinutes, templateById } from '../logic/calc';
import { exerciseById } from '../data/exercises';
import { DAY_LONG, DAY_SHORT } from '../logic/dates';
import type { WorkoutTemplate } from '../types';

const LEVEL: Record<string, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', all: 'All levels' };
const INTENSITY: Record<string, string> = { low: 'Low intensity', moderate: 'Moderate', high: 'High intensity' };

export function TemplateCard({ t, onStart }: { t: WorkoutTemplate; onStart: () => void }) {
  const names = t.items.map((i) => exerciseById(i.exerciseId)?.name).filter(Boolean);
  return (
    <article className="tpl-card">
      <h3 className="tpl-name">{t.name}</h3>
      <div className="tpl-meta">
        <Tag>{estimateMinutes(t)} min</Tag><Tag>{LEVEL[t.level]}</Tag><Tag tone={t.intensity === 'high' ? 'amber' : 'neutral'}>{INTENSITY[t.intensity]}</Tag>
        <Tag tone="slate">{t.environment === 'gym' ? 'Gym' : t.environment === 'home' ? 'Home' : 'Home or gym'}</Tag>
      </div>
      {t.description && <p className="small">{t.description}</p>}
      <p className="tpl-ex">{names.slice(0, 5).join(', ')}{names.length > 5 ? ` +${names.length - 5} more` : ''}</p>
      <div className="tpl-actions">
        <Button variant="primary" size="sm" icon="play" onClick={onStart}>Start</Button>
        {t.builtIn
          ? <Button size="sm" variant="ghost" icon="copy" to={`/workouts/copy/${t.id}`}>Customise</Button>
          : <Button size="sm" variant="ghost" icon="edit" to={`/workouts/edit/${t.id}`}>Edit</Button>}
      </div>
    </article>
  );
}

export function Workouts() {
  const { state, update } = useApp();
  const [filter, setFilter] = useState<'all' | 'gym' | 'home' | 'mine'>('all');
  const [confirmSwitch, setConfirmSwitch] = useState<string | null>(null);
  const templates = allTemplates(state).filter((t) => filter === 'all' || (filter === 'mine' ? !t.builtIn : t.environment === filter || t.environment === 'any'));

  const doStart = (id: string) => {
    const t = templateById(state, id)!;
    update((s) => {
      // If something is active, mark it partial before switching (user confirmed).
      const sessions = s.sessions.map((x) => (x.id === s.activeSessionId ? { ...x, status: 'partial' as const, endedAt: Date.now() } : x));
      return startSession({ ...s, sessions, activeSessionId: null }, t);
    });
    navigate('/workout/active');
  };
  const start = (id: string) => (state.activeSessionId ? setConfirmSwitch(id) : doStart(id));

  const setDay = (day: number, tid: string) => update((s) => ({ ...s, schedule: { weekly: { ...s.schedule.weekly, [day]: tid || null } } }));
  const scheduled = Object.values(state.schedule.weekly).filter(Boolean).length;

  return (
    <div>
      <PageHeader title="Workouts" lede="Choose a session, build your own, or set which days you train."
        actions={<><Button icon="timer" to="/hiit">Interval timer</Button><Button icon="history" to="/history">History</Button><Button variant="primary" icon="plus" to="/workouts/new">New workout</Button></>} />

      <Panel title="Weekly schedule" id="sched" action={<span className="muted small">{scheduled} {scheduled === 1 ? 'session' : 'sessions'} a week</span>}>
        <div className="stack-sm">
          {DAY_LONG.map((d, i) => (
            <div key={d} className="row-between" style={{ gap: 12 }}>
              <label htmlFor={`day-${i}`} style={{ width: 96, fontWeight: 600 }}><span aria-hidden="true">{DAY_SHORT[i]}</span><span className="sr-only">{d}</span></label>
              <select id={`day-${i}`} className="input" style={{ flex: 1, maxWidth: 420 }} value={state.schedule.weekly[i] ?? ''} onChange={(e) => setDay(i, e.target.value)}>
                <option value="">Rest day</option>
                {allTemplates(state).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          ))}
        </div>
        <p className="field-hint" style={{ marginTop: 12 }}>Your weekly session target follows this schedule. Changes save automatically.</p>
      </Panel>

      <div className="row-between" style={{ margin: '40px 0 16px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Sessions</h2>
        <Segmented label="Filter workouts" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }, { value: 'mine', label: 'Mine' }]} />
      </div>
      {filter === 'mine' && templates.length === 0 && (
        <div className="empty"><p className="empty-title">No workouts of your own yet</p><p className="empty-text">Build one from scratch, or open any session below and choose “Customise” to start from a copy.</p><Button variant="primary" icon="plus" to="/workouts/new">New workout</Button></div>
      )}
      <div className="grid-3">{templates.map((t) => <TemplateCard key={t.id} t={t} onStart={() => start(t.id)} />)}</div>
      <p className="muted small" style={{ marginTop: 24 }}><Icon name="info" size={16} /> Recommended sessions are general starting points, not individual coaching. Adjust anything that doesn’t suit you.</p>

      <Confirm open={!!confirmSwitch} onClose={() => setConfirmSwitch(null)} onConfirm={() => confirmSwitch && doStart(confirmSwitch)}
        title="Start a different workout?" confirmLabel="Save progress and switch"
        text="You have a workout in progress. Everything logged so far will be saved as a partial session." />
    </div>
  );
}
