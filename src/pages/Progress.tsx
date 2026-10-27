import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { Button, Field, NumberInput, PageHeader, Panel, Segmented, IconButton } from '../components/ui';
import { BarChart, LineChart } from '../components/Charts';
import { addDays, fmtDate, today, weekIdOf } from '../logic/dates';
import { computePRs, finishedSessions, sessionDuration, sumNutrients, thisWeekId, toDisplayWeight, uid, volumeKg, fromDisplayWeight, weekStats } from '../logic/calc';
import { EXERCISES, exerciseById } from '../data/exercises';

const RANGES = { '4w': 4, '3m': 13, '6m': 26, '1y': 52 } as const;

export function Progress() {
  const { state, update, toast } = useApp();
  const [range, setRange] = useState<keyof typeof RANGES>('4w');
  const p = state.profile; const wu = p.units.weight;
  const weeks = useMemo(() => Array.from({ length: RANGES[range] }, (_, i) => addDays(thisWeekId(), -7 * (RANGES[range] - 1 - i))), [range]);
  const label = (w: string) => fmtDate(w, { day: 'numeric', month: 'short' });
  const step = Math.ceil(weeks.length / 8);
  const thin = <T extends { label: string }>(arr: T[]) => arr.map((x, i) => ({ ...x, label: i % step === 0 || i === arr.length - 1 ? x.label : '' }));
  const ws = weeks.map((w) => weekStats(state, w));
  const sessions = finishedSessions(state);
  const logged = sessions.filter((s) => s.kind !== 'quicklog' && s.startedAt >= new Date(`${weeks[0]}T00:00:00`).getTime());

  const freq = thin(ws.map((s) => ({ label: label(s.weekId), value: s.completed + s.partial })));
  const durations = logged.slice().reverse().map((s) => ({ label: fmtDate(new Date(s.startedAt).toISOString().slice(0, 10), { day: 'numeric', month: 'short' }), value: Math.round(sessionDuration(s) / 60000) }));
  const vol = thin(ws.map((s) => ({ label: label(s.weekId), value: Math.round(toDisplayWeight(s.sessions.reduce((a, x) => a + volumeKg(x), 0), wu) ?? 0) })));
  const adherence = thin(weeks.map((w) => { const r = state.reviews.find((x) => x.weekId === w); return { label: label(w), value: r ? Math.round(Math.min(1, r.completedSessions / Math.max(1, r.plannedSessions)) * 100) : 0 }; }));
  const protein = thin(weeks.map((w) => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(w, i)).map((d) => state.foods.filter((f) => f.date === d)).filter((l) => l.length);
    return { label: label(w), value: days.length ? Math.round(days.reduce((a, l) => a + sumNutrients(l).protein, 0) / days.length) : 0 };
  }));

  const trained = useMemo(() => [...new Set(sessions.flatMap((s) => s.entries.filter((e) => e.sets.some((x) => x.done)).map((e) => e.exerciseId)))].filter((id) => exerciseById(id)?.measure === 'weight_reps'), [sessions.length]);
  const [exId, setExId] = useState<string>(trained[0] ?? '');
  const strength = sessions.filter((s) => s.entries.some((e) => e.exerciseId === exId && e.sets.some((x) => x.done))).reverse().map((s) => ({
    label: fmtDate(new Date(s.startedAt).toISOString().slice(0, 10), { day: 'numeric', month: 'short' }),
    value: toDisplayWeight(Math.max(...s.entries.filter((e) => e.exerciseId === exId).flatMap((e) => e.sets.filter((x) => x.done).map((x) => x.weight ?? 0))), wu)!,
  }));
  const prs = [...computePRs(state.sessions).best.values()].sort((a, b) => b.at - a.at).slice(0, 6);

  const [mw, setMw] = useState<number | undefined>();
  const [mwaist, setMwaist] = useState<number | undefined>();
  const addMeasure = () => {
    if (mw == null && mwaist == null) { toast('Enter a weight or waist measurement.', 'warn'); return; }
    update((s) => ({ ...s, measurements: [...s.measurements, { id: uid(), date: today(), weight: mw != null ? fromDisplayWeight(mw, wu) : undefined, waist: mwaist }] }));
    setMw(undefined); setMwaist(undefined); toast('Measurement saved');
  };
  const weightSeries = state.measurements.filter((m) => m.weight).map((m) => ({ label: fmtDate(m.date, { day: 'numeric', month: 'short' }), value: toDisplayWeight(m.weight, wu)! }));

  return (
    <div>
      <PageHeader backTo={{ to: '/sculpture', label: 'My sculpture' }} title="Progress" lede="Each measure is shown on its own — sessions, training, goals and nutrition are never blended into one score."
        actions={<Segmented label="Date range" value={range} onChange={setRange} options={[{ value: '4w', label: '4 weeks' }, { value: '3m', label: '3 months' }, { value: '6m', label: '6 months' }, { value: '1y', label: '1 year' }]} />} />
      {sessions.length === 0 ? (
        <div className="empty"><p className="empty-title">No training recorded yet</p><p className="empty-text">Charts appear after your first sessions. Start with something short — it all counts.</p><Button variant="primary" to="/workouts">Choose a workout</Button></div>
      ) : (
        <div className="grid-2">
          <Panel title="Workout frequency" id="freq"><BarChart title="Sessions per week" data={freq} target={p.daysPerWeek} unit=" sessions" /></Panel>
          <Panel title="Goal adherence (sessions)" id="adh"><BarChart title="Percent of planned sessions completed, by reviewed week" data={adherence} target={75} unit="" format={(v) => `${Math.round(v)}%`} /><p className="small muted" style={{ marginTop: 8 }}>From weekly reviews. Unreviewed weeks show as empty.</p></Panel>
          <Panel title="Session duration" id="dur">{durations.length > 0 ? <LineChart title="Minutes per session" data={durations.slice(-20)} unit=" min" /> : <p className="muted">No sessions in this range.</p>}</Panel>
          <Panel title="Training volume" id="vol"><BarChart title={`Weekly volume (reps × weight, ${wu})`} data={vol} unit={` ${wu}`} format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))} /><p className="small muted" style={{ marginTop: 8 }}>Reps × weight for weighted exercises only.</p></Panel>
          <Panel title="Strength progression" id="str">
            {trained.length === 0 ? <p className="muted">Log a weighted exercise to see its trend.</p> : (
              <div className="stack-sm">
                <Field label="Exercise">{(id) => <select id={id} className="input" value={exId} onChange={(e) => setExId(e.target.value)}>{trained.map((t) => <option key={t} value={t}>{exerciseById(t)?.name}</option>)}</select>}</Field>
                {strength.length > 0 && <LineChart title={`Heaviest set, ${exerciseById(exId)?.name}`} data={strength.slice(-16)} unit={` ${wu}`} />}
              </div>
            )}
          </Panel>
          <Panel title="Protein" id="prot"><BarChart title="Average daily protein on tracked days" data={protein} target={p.proteinTarget} unit=" g" /></Panel>
          <Panel title="Recent personal bests" id="pbs">
            {prs.length === 0 ? <p className="muted">Your first logs set a baseline. Improvements on them show up here.</p> : (
              <ul className="plain-list">{prs.map((pr) => <li key={`${pr.exerciseId}${pr.kind}`}><strong>{exerciseById(pr.exerciseId)?.name}</strong> — {pr.kind === 'weight' ? `${toDisplayWeight(pr.value, wu)} ${wu} × ${pr.reps}` : pr.kind === 'time' ? `${pr.value} s` : pr.kind === 'distance' ? `${pr.value.toFixed(2)} km` : `${pr.value} reps`} <span className="muted small">{fmtDate(new Date(pr.at).toISOString().slice(0, 10), { day: 'numeric', month: 'short' })}</span></li>)}</ul>
            )}
          </Panel>
          <Panel title="Body measurements (optional)" id="body">
            <p className="small muted" style={{ marginBottom: 12 }}>Only if you find it helpful. These never affect your sculpture.</p>
            <div className="form-grid" style={{ alignItems: 'end' }}>
              <Field label={`Weight (${wu})`}>{(id) => <NumberInput id={id} step={0.1} value={mw} onChange={setMw} />}</Field>
              <Field label="Waist (cm)">{(id) => <NumberInput id={id} step={0.5} value={mwaist} onChange={setMwaist} />}</Field>
              <Button onClick={addMeasure}>Save</Button>
            </div>
            {weightSeries.length > 1 && <div style={{ marginTop: 16 }}><LineChart title="Body weight" data={weightSeries} unit={` ${wu}`} /></div>}
            {state.measurements.slice(-3).reverse().map((m) => (
              <div key={m.id} className="row-between small" style={{ borderTop: '1px solid var(--line)', paddingTop: 6, marginTop: 6 }}>
                <span>{fmtDate(m.date)}</span><span className="num">{m.weight ? `${toDisplayWeight(m.weight, wu)} ${wu}` : ''}{m.weight && m.waist ? ' · ' : ''}{m.waist ? `${m.waist} cm` : ''}</span>
                <IconButton icon="trash" label="Delete measurement" onClick={() => update((s) => ({ ...s, measurements: s.measurements.filter((x) => x.id !== m.id) }))} />
              </div>
            ))}
          </Panel>
        </div>
      )}
    </div>
  );
}
export const _w = weekIdOf; export const _e = EXERCISES;
