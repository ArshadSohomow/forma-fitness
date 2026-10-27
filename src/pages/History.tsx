import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { query } from '../router';
import { Button, Empty, Field, Modal, NumberInput, PageHeader, Tag } from '../components/ui';
import { EXERCISES, exerciseById } from '../data/exercises';
import { fmtDuration, fmtTs, today } from '../logic/dates';
import { finishedSessions, sessionDuration, setsDone, uid, fromDisplayWeight, fromDisplayDist } from '../logic/calc';
import type { Session } from '../types';

export function History() {
  const { state } = useApp();
  const [log, setLog] = useState(false);
  useEffect(() => { if (query().get('log') === '1') setLog(true); }, []);
  const list = finishedSessions(state);
  const groups = new Map<string, Session[]>();
  list.forEach((s) => { const k = fmtTs(s.startedAt, { month: 'long', year: 'numeric' }); groups.set(k, [...(groups.get(k) ?? []), s]); });

  return (
    <div>
      <PageHeader backTo={{ to: '/workouts', label: 'Workouts' }} title="History" lede="Every session you’ve recorded, newest first."
        actions={<Button variant="primary" icon="plus" onClick={() => setLog(true)}>Log a completed exercise</Button>} />
      {list.length === 0 && <Empty title="No sessions yet" text="When you finish a workout it appears here, with every set you logged." action={<Button variant="primary" to="/workouts">Choose a workout</Button>} />}
      {[...groups].map(([month, items]) => (
        <section key={month} style={{ marginBottom: 32 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>{month}</h2>
          {items.map((s) => (
            <a key={s.id} href={`#/history/${s.id}`} className="history-row">
              <span>
                <span className="history-name">{s.name}</span><br />
                <span className="muted small">{fmtTs(s.startedAt)} · {fmtDuration(sessionDuration(s))} · {setsDone(s)} sets</span>
              </span>
              <Tag tone={s.status === 'completed' ? 'sage' : 'amber'}>{s.status === 'completed' ? 'Completed' : 'Partial'}</Tag>
            </a>
          ))}
        </section>
      ))}
      <QuickLog open={log} onClose={() => setLog(false)} />
    </div>
  );
}

function QuickLog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, update, toast } = useApp();
  const [exId, setExId] = useState('push-up');
  const [date, setDate] = useState(today());
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState<number | undefined>(10);
  const [weight, setWeight] = useState<number | undefined>();
  const [secs, setSecs] = useState<number | undefined>(30);
  const [dist, setDist] = useState<number | undefined>(2);
  const [mins, setMins] = useState<number | undefined>(20);
  const [err, setErr] = useState<string | null>(null);
  const ex = exerciseById(exId)!;
  const wu = state.profile.units.weight, du = state.profile.units.distance;

  const save = () => {
    if (date > today()) { setErr('The date can’t be in the future.'); return; }
    if (sets < 1) { setErr('Add at least one set.'); return; }
    setErr(null);
    const startedAt = new Date(`${date}T${date === today() ? new Date().toTimeString().slice(0, 5) : '12:00'}:00`).getTime();
    const one = { reps: ex.measure === 'time' || ex.measure === 'distance' ? undefined : reps, weight: weight != null ? fromDisplayWeight(weight, wu) : undefined,
      seconds: ex.measure === 'time' ? secs : ex.measure === 'distance' && mins ? mins * 60 : undefined, distance: ex.measure === 'distance' && dist ? fromDisplayDist(dist, du) : undefined, done: true };
    const s: Session = {
      id: uid(), name: ex.name, kind: 'quicklog', startedAt, endedAt: startedAt + (ex.measure === 'distance' && mins ? mins * 60000 : sets * 120000), pausedTotal: 0, status: 'completed', cursor: { entry: 0, set: 0 },
      entries: [{ itemId: uid(), exerciseId: ex.id, restSec: 0, target: { sets }, sets: Array.from({ length: ex.measure === 'distance' ? 1 : sets }, () => ({ ...one })) }],
    };
    update((st) => ({ ...st, sessions: [...st.sessions, s] }));
    toast(`${ex.name} logged`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Log a completed exercise" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save to history</Button></>}>
      <div className="stack">
        <p className="muted small">For training you did without the app — a run, a class, a few sets at home.</p>
        <div className="form-grid">
          <Field label="Exercise">{(id) => <select id={id} className="input" value={exId} onChange={(e) => setExId(e.target.value)}>{EXERCISES.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>}</Field>
          <Field label="Date" error={err}>{(id, d) => <input id={id} aria-describedby={d} type="date" className="input" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
        </div>
        <div className="form-grid">
          {ex.measure !== 'distance' && <Field label="Sets">{(id) => <NumberInput id={id} min={1} value={sets} onChange={(v) => setSets(v ?? 1)} />}</Field>}
          {(ex.measure === 'reps' || ex.measure === 'weight_reps' || ex.measure === 'assisted') && <Field label="Reps per set">{(id) => <NumberInput id={id} value={reps} onChange={setReps} />}</Field>}
          {(ex.measure === 'weight_reps' || ex.measure === 'assisted') && <Field label={`${ex.measure === 'assisted' ? 'Assistance' : 'Weight'} (${wu})`}>{(id) => <NumberInput id={id} step={0.5} value={weight} onChange={setWeight} />}</Field>}
          {ex.measure === 'time' && <Field label="Seconds per set">{(id) => <NumberInput id={id} value={secs} onChange={setSecs} />}</Field>}
          {ex.measure === 'distance' && <><Field label={`Distance (${du})`}>{(id) => <NumberInput id={id} step={0.1} value={dist} onChange={setDist} />}</Field><Field label="Minutes">{(id) => <NumberInput id={id} value={mins} onChange={setMins} />}</Field></>}
        </div>
      </div>
    </Modal>
  );
}
