import { useMemo, useState } from 'react';
import { useApp, startSession } from '../store';
import { navigate } from '../router';
import { Button, Field, IconButton, Modal, NumberInput, PageHeader, Panel, Confirm, Tag } from '../components/ui';
import { EXERCISES, exerciseById } from '../data/exercises';
import { estimateMinutes, templateById, uid, toDisplayWeight, fromDisplayWeight, toDisplayDist, fromDisplayDist } from '../logic/calc';
import type { WorkoutItem, WorkoutTemplate } from '../types';

export function WorkoutEditor({ id, copyOf }: { id?: string; copyOf?: string }) {
  const { state, update, toast } = useApp();
  const existing = templateById(state, id ?? copyOf);
  const readOnly = !!existing?.builtIn && !!id;
  const [t, setT] = useState<WorkoutTemplate>(() => existing
    ? { ...existing, id: copyOf ? uid() : existing.id, name: copyOf ? `${existing.name} (my version)` : existing.name, builtIn: false, items: existing.items.map((i) => ({ ...i, id: copyOf ? uid() : i.id })) }
    : { id: uid(), name: '', description: '', style: 'Custom', environment: 'any', level: 'all', intensity: 'moderate', items: [], createdAt: Date.now() });
  const [picker, setPicker] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; items?: string }>({});
  const [confirmDel, setConfirmDel] = useState(false);
  const wu = state.profile.units.weight, du = state.profile.units.distance;

  const setItem = (i: number, patch: Partial<WorkoutItem>) => setT((x) => ({ ...x, items: x.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) }));
  const move = (i: number, d: number) => setT((x) => { const items = [...x.items]; const j = i + d; if (j < 0 || j >= items.length) return x; [items[i], items[j]] = [items[j], items[i]]; return { ...x, items }; });
  const remove = (i: number) => setT((x) => ({ ...x, items: x.items.filter((_, k) => k !== i) }));
  const add = (exId: string) => {
    const ex = exerciseById(exId)!;
    const item: WorkoutItem = { id: uid(), exerciseId: exId, sets: 3, restSec: ex.type === 'cardio' ? 30 : 90,
      reps: ex.measure === 'reps' || ex.measure === 'weight_reps' || ex.measure === 'assisted' ? 10 : undefined,
      seconds: ex.measure === 'time' ? 30 : undefined, distance: ex.measure === 'distance' ? 2 : undefined, weight: ex.measure === 'weight_reps' ? 10 : undefined };
    if (ex.measure === 'distance') item.sets = 1;
    setT((x) => ({ ...x, items: [...x.items, item] }));
    toast(`${ex.name} added`);
  };
  const toggleGroup = (i: number) => setT((x) => {
    const items = [...x.items];
    const a = items[i], b = items[i + 1];
    if (!b) return x;
    if (a.group && a.group === b.group) { items[i + 1] = { ...b, group: undefined }; if (!items.some((it, k) => k !== i && it.group === a.group)) items[i] = { ...a, group: undefined }; }
    else { const g = a.group ?? uid(); items[i] = { ...a, group: g }; items[i + 1] = { ...b, group: g }; }
    return { ...x, items };
  });

  const validate = () => {
    const e: typeof errors = {};
    if (!t.name.trim()) e.name = 'Give the workout a name.';
    if (t.items.length === 0) e.items = 'Add at least one exercise.';
    if (t.items.some((i) => i.sets < 1)) e.items = 'Each exercise needs at least one set.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const save = (thenStart = false) => {
    if (!validate()) return;
    const clean = { ...t, name: t.name.trim(), builtIn: false };
    update((s) => {
      const exists = s.templates.some((x) => x.id === clean.id);
      const next = { ...s, templates: exists ? s.templates.map((x) => (x.id === clean.id ? clean : x)) : [clean, ...s.templates] };
      return thenStart ? startSession(next, clean) : next;
    });
    toast(`Saved “${clean.name}”`);
    navigate(thenStart ? '/workout/active' : '/workouts');
  };
  const del = () => {
    update((s) => ({ ...s, templates: s.templates.filter((x) => x.id !== t.id), schedule: { weekly: Object.fromEntries(Object.entries(s.schedule.weekly).map(([k, v]) => [k, v === t.id ? null : v])) } }));
    toast('Workout deleted. Past sessions are kept in your history.');
    navigate('/workouts');
  };

  if (readOnly && existing) {
    return (
      <div>
        <PageHeader backTo={{ to: '/workouts', label: 'Workouts' }} title={existing.name} lede={existing.description}
          actions={<><Button icon="copy" to={`/workouts/copy/${existing.id}`}>Customise a copy</Button><Button variant="primary" icon="play" onClick={() => { update((s) => startSession(s, existing)); navigate('/workout/active'); }}>Start</Button></>} />
        <Panel>
          {existing.items.map((i, k) => {
            const ex = exerciseById(i.exerciseId)!;
            return (
              <div key={i.id} className="row-between" style={{ padding: '12px 0', borderTop: k ? '1px solid var(--line)' : 0 }}>
                <a href={`#/library/${ex.id}`} style={{ fontWeight: 600 }}>{ex.name}</a>
                <span className="muted num">{i.sets} × {i.reps ? `${i.reps} reps` : i.seconds ? `${i.seconds}s` : i.distance ? `${toDisplayDist(i.distance, du)} ${du}` : ''}{i.weight ? ` @ ${toDisplayWeight(i.weight, wu)} ${wu}` : ''} · rest {i.restSec}s</span>
              </div>
            );
          })}
        </Panel>
      </div>
    );
  }

  return (
    <div>
      <PageHeader backTo={{ to: '/workouts', label: 'Workouts' }} title={id ? 'Edit workout' : 'New workout'} lede={`About ${t.items.length ? estimateMinutes(t) : 0} minutes · ${t.items.length} exercises`} />
      <div className="stack">
        <Panel>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <Field label="Name" error={errors.name}>{(fid, d) => <input id={fid} aria-describedby={d} className="input" value={t.name} placeholder="e.g. Tuesday home session" onChange={(e) => setT({ ...t, name: e.target.value })} />}</Field>
            <Field label="Where">{(fid) => (
              <select id={fid} className="input" value={t.environment} onChange={(e) => setT({ ...t, environment: e.target.value as WorkoutTemplate['environment'] })}>
                <option value="any">Home or gym</option><option value="gym">Gym</option><option value="home">Home</option>
              </select>)}</Field>
            <Field label="Intensity">{(fid) => (
              <select id={fid} className="input" value={t.intensity} onChange={(e) => setT({ ...t, intensity: e.target.value as WorkoutTemplate['intensity'] })}>
                <option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option>
              </select>)}</Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="Description (optional)">{(fid) => <input id={fid} className="input" value={t.description} onChange={(e) => setT({ ...t, description: e.target.value })} />}</Field>
          </div>
        </Panel>

        <section aria-labelledby="ex-h">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h2 className="panel-title" id="ex-h">Exercises</h2>
            <Button icon="plus" onClick={() => setPicker(true)}>Add exercise</Button>
          </div>
          {errors.items && <p className="field-error" role="alert" style={{ marginBottom: 8 }}>{errors.items}</p>}
          {t.items.length === 0 && <div className="empty"><p className="empty-title">No exercises yet</p><p className="empty-text">Add exercises from the library. You can reorder them and pair them into supersets.</p><Button variant="primary" icon="plus" onClick={() => setPicker(true)}>Add exercise</Button></div>}
          {t.items.map((it, i) => {
            const ex = exerciseById(it.exerciseId)!;
            const grouped = !!it.group;
            const pairedNext = it.group && t.items[i + 1]?.group === it.group;
            return (
              <div key={it.id}>
                <div className={`item-row ${grouped ? 'grouped' : ''}`}>
                  <div className="item-order">
                    <IconButton icon="up" label={`Move ${ex.name} up`} onClick={() => move(i, -1)} disabled={i === 0} />
                    <IconButton icon="down" label={`Move ${ex.name} down`} onClick={() => move(i, 1)} disabled={i === t.items.length - 1} />
                  </div>
                  <div>
                    <div className="row" style={{ gap: 8 }}><strong>{ex.name}</strong>{grouped && <Tag tone="slate">Superset</Tag>}</div>
                    <div className="item-fields">
                      <Field label="Sets">{(fid) => <NumberInput id={fid} min={1} value={it.sets} onChange={(v) => setItem(i, { sets: Math.max(1, v ?? 1) })} />}</Field>
                      {(ex.measure === 'reps' || ex.measure === 'weight_reps' || ex.measure === 'assisted') && <Field label="Reps">{(fid) => <NumberInput id={fid} value={it.reps} onChange={(v) => setItem(i, { reps: v })} />}</Field>}
                      {ex.measure === 'weight_reps' && <Field label={`Weight (${wu})`}>{(fid) => <NumberInput id={fid} step={0.5} value={toDisplayWeight(it.weight, wu)} onChange={(v) => setItem(i, { weight: v == null ? undefined : fromDisplayWeight(v, wu) })} />}</Field>}
                      {ex.measure === 'time' && <Field label="Seconds">{(fid) => <NumberInput id={fid} value={it.seconds} onChange={(v) => setItem(i, { seconds: v })} />}</Field>}
                      {ex.measure === 'distance' && <Field label={`Distance (${du})`}>{(fid) => <NumberInput id={fid} step={0.1} value={toDisplayDist(it.distance, du)} onChange={(v) => setItem(i, { distance: v == null ? undefined : fromDisplayDist(v, du) })} />}</Field>}
                      <Field label="Rest (s)">{(fid) => <NumberInput id={fid} step={15} value={it.restSec} onChange={(v) => setItem(i, { restSec: v ?? 0 })} />}</Field>
                    </div>
                  </div>
                  <IconButton icon="trash" label={`Remove ${ex.name}`} onClick={() => remove(i)} />
                </div>
                {i < t.items.length - 1 && (
                  <div style={{ textAlign: 'center', margin: '4px 0' }}>
                    <button className="link-btn small" onClick={() => toggleGroup(i)}>{pairedNext ? 'Unlink superset' : 'Pair with next as superset'}</button>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <div className="row-between" style={{ marginTop: 12 }}>
          <div>{id && <Button variant="ghost" icon="trash" onClick={() => setConfirmDel(true)}>Delete workout</Button>}</div>
          <div className="row">
            <Button variant="ghost" onClick={() => navigate('/workouts')}>Cancel</Button>
            <Button onClick={() => save(false)}>Save</Button>
            <Button variant="primary" icon="play" onClick={() => save(true)}>Save and start</Button>
          </div>
        </div>
      </div>

      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={add} />
      <Confirm open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={del} danger title="Delete this workout?" confirmLabel="Delete workout"
        text="The template will be removed and unscheduled. Sessions you’ve already completed stay in your history." />
    </div>
  );
}

export function ExercisePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const { state } = useApp();
  const [q, setQ] = useState('');
  const eq = state.profile.equipment;
  const [onlyMine, setOnlyMine] = useState(true);
  const list = useMemo(() => EXERCISES.filter((e) =>
    (!q || `${e.name} ${e.primary.join(' ')} ${e.pattern}`.toLowerCase().includes(q.toLowerCase())) &&
    (!onlyMine || e.equipment.some((x) => x === 'Bodyweight' || x === 'Mat' || eq.includes(x) || (x === 'Machine' && eq.includes('Cable machine'))))), [q, onlyMine, eq]);
  return (
    <Modal open={open} onClose={onClose} title="Add exercise" footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <div className="stack-sm">
        <Field label="Search">{(id) => <input id={id} className="input" type="search" placeholder="Name or muscle, e.g. glutes" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />}</Field>
        <label className="row small"><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> Only show exercises for my equipment</label>
        <div className="search-results" role="list">
          {list.map((e) => (
            <button key={e.id} role="listitem" onClick={() => onPick(e.id)}>
              <span><strong>{e.name}</strong><br /><span className="muted small">{e.primary.join(', ')} · {e.equipment.join(', ')}</span></span>
              <span className="muted small">Add</span>
            </button>
          ))}
          {list.length === 0 && <p className="muted" style={{ padding: 16 }}>No matches. Try another word, or show all equipment.</p>}
        </div>
      </div>
    </Modal>
  );
}
