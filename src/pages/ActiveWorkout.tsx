import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { navigate } from '../router';
import { Button, Disclosure, Empty, IconButton, Modal, Stepper, Icon } from '../components/ui';
import { ExerciseDemo } from '../components/ExerciseDemo';
import { exerciseById, GLOSSARY } from '../data/exercises';
import { clock, fmtTs } from '../logic/dates';
import { previousPerformance, sessionDuration, setsDone, setsPlanned, toDisplayWeight, fromDisplayWeight, toDisplayDist, fromDisplayDist, uid } from '../logic/calc';
import { beep, unlockAudio } from '../logic/audio';
import type { Session, SetLog } from '../types';
import { ExercisePicker } from './WorkoutEditor';

type Cur = { entry: number; set: number };

/** Order in which sets are performed. Supersets interleave: A1, B1, A2, B2… */
function sequence(s: Session): Cur[] {
  const out: Cur[] = [];
  let i = 0;
  while (i < s.entries.length) {
    const g = s.entries[i].group;
    let j = i + 1;
    while (g && j < s.entries.length && s.entries[j].group === g) j++;
    const block = s.entries.slice(i, j).map((_, k) => i + k);
    const maxSets = Math.max(...block.map((b) => s.entries[b].sets.length));
    for (let set = 0; set < maxSets; set++) for (const b of block) if (set < s.entries[b].sets.length) out.push({ entry: b, set });
    i = j;
  }
  return out;
}
function nextOpen(s: Session, from: Cur): Cur | null {
  const seq = sequence(s);
  const idx = seq.findIndex((c) => c.entry === from.entry && c.set === from.set);
  const rest = [...seq.slice(idx + 1), ...seq.slice(0, Math.max(0, idx))];
  return rest.find((c) => !s.entries[c.entry].skipped && !s.entries[c.entry].sets[c.set].done) ?? null;
}

export function ActiveWorkout() {
  const { state, update, toast } = useApp();
  const sess = state.sessions.find((x) => x.id === state.activeSessionId);
  const [, force] = useState(0);
  const [guide, setGuide] = useState(false);
  const [leave, setLeave] = useState(false);
  const [finishAsk, setFinishAsk] = useState(false);
  const [picker, setPicker] = useState(false);
  const restWarned = useRef<number | null>(null);
  const p = state.profile;
  const wu = p.units.weight, du = p.units.distance;

  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 500); return () => clearInterval(t); }, []);
  useEffect(() => { unlockAudio(); }, []);
  // Rest finished cue
  useEffect(() => {
    if (!sess?.restEndsAt || sess.pausedAt) return;
    const left = sess.restEndsAt - Date.now();
    if (left <= 0 && restWarned.current !== sess.restEndsAt) { restWarned.current = sess.restEndsAt; if (p.sound) beep('go'); }
  });

  if (!sess) {
    return (
      <div className="active"><div className="active-body">
        <Empty title="No workout in progress" text="Start a session from your plan or the workouts list." action={<Button variant="primary" to="/workouts">Choose a workout</Button>} />
      </div></div>
    );
  }

  const mut = (fn: (s: Session) => Session) => update((st) => ({ ...st, sessions: st.sessions.map((x) => (x.id === sess.id ? fn(x) : x)) }));
  const cur = sess.cursor;
  const entry = sess.entries[cur.entry];
  const ex = exerciseById(entry.exerciseId)!;
  const set = entry.sets[cur.set] ?? entry.sets[0];
  const prev = previousPerformance(state.sessions, entry.exerciseId, sess.startedAt);
  const total = setsPlanned(sess), done = setsDone(sess);
  const paused = !!sess.pausedAt;
  const restLeft = sess.restEndsAt ? Math.max(0, (sess.restEndsAt - (sess.pausedAt ?? Date.now())) / 1000) : 0;
  const resting = !!sess.restEndsAt && restLeft > 0;
  const upNext = nextOpen(sess, cur);
  const nextEx = upNext ? exerciseById(sess.entries[upNext.entry].exerciseId) : null;

  const setField = (patch: Partial<SetLog>) => mut((s) => ({ ...s, entries: s.entries.map((e, i) => (i === cur.entry ? { ...e, sets: e.sets.map((x, j) => (j === cur.set ? { ...x, ...patch } : x)) } : e)) }));

  const completeSet = () => {
    unlockAudio();
    mut((s) => {
      const entries = s.entries.map((e, i) => (i === cur.entry ? { ...e, sets: e.sets.map((x, j) => (j === cur.set ? { ...x, done: true } : x)) } : e));
      const ns = { ...s, entries };
      const nxt = nextOpen(ns, cur);
      // Rest after a set, unless the next set is the partner in a superset.
      const inSuperset = nxt && entry.group && s.entries[nxt.entry].group === entry.group && nxt.entry !== cur.entry;
      const rest = !nxt || inSuperset ? undefined : Date.now() + entry.restSec * 1000;
      return { ...ns, cursor: nxt ?? s.cursor, restEndsAt: rest && entry.restSec > 0 ? rest : undefined };
    });
    if (!upNext || (upNext.entry === cur.entry && upNext.set === cur.set)) setFinishAsk(true);
  };
  const jump = (c: Cur) => mut((s) => ({ ...s, cursor: c, restEndsAt: undefined }));
  const skipExercise = () => mut((s) => {
    const entries = s.entries.map((e, i) => (i === cur.entry ? { ...e, skipped: true } : e));
    const ns = { ...s, entries };
    return { ...ns, cursor: nextOpen(ns, cur) ?? s.cursor, restEndsAt: undefined };
  });
  const togglePause = () => mut((s) => {
    if (s.pausedAt) {
      const d = Date.now() - s.pausedAt;
      return { ...s, pausedAt: undefined, pausedTotal: s.pausedTotal + d, restEndsAt: s.restEndsAt ? s.restEndsAt + d : undefined };
    }
    return { ...s, pausedAt: Date.now() };
  });
  const addSet = () => mut((s) => ({ ...s, entries: s.entries.map((e, i) => (i === cur.entry ? { ...e, target: { ...e.target, sets: e.target.sets + 1 }, sets: [...e.sets, { ...e.sets[e.sets.length - 1], done: false }] } : e)) }));
  const addExercise = (id: string) => {
    const x = exerciseById(id)!;
    mut((s) => ({ ...s, entries: [...s.entries, { itemId: uid(), exerciseId: id, restSec: 90, target: { sets: 3, reps: 10 }, sets: Array.from({ length: x.measure === 'distance' ? 1 : 3 }, () => ({ reps: x.measure === 'time' || x.measure === 'distance' ? undefined : 10, seconds: x.measure === 'time' ? 30 : undefined, distance: x.measure === 'distance' ? 2 : undefined, done: false })) }] }));
    toast(`${x.name} added to this session`);
  };

  const finish = () => {
    const d = setsDone(sess);
    if (d === 0) { setFinishAsk(false); setLeave(true); return; }
    const status = d / Math.max(1, setsPlanned(sess)) >= 0.8 ? 'completed' : 'partial';
    const id = sess.id;
    update((st) => ({ ...st, activeSessionId: null, sessions: st.sessions.map((x) => (x.id === id ? { ...x, status, endedAt: x.pausedAt ?? Date.now(), pausedAt: undefined, restEndsAt: undefined } : x)) }));
    navigate(`/history/${id}?summary=1`, { replace: true });
  };
  const discard = () => {
    update((st) => ({ ...st, activeSessionId: null, sessions: st.sessions.filter((x) => x.id !== sess.id) }));
    toast('Workout discarded');
    navigate('/workouts', { replace: true });
  };

  const isTime = ex.measure === 'time', isDist = ex.measure === 'distance', hasWeight = ex.measure === 'weight_reps', assisted = ex.measure === 'assisted';
  const targetText = [entry.target.reps && `${entry.target.reps} reps`, entry.target.seconds && `${entry.target.seconds} seconds`, entry.target.distance && `${toDisplayDist(entry.target.distance, du)} ${du}`, entry.target.weight && `${toDisplayWeight(entry.target.weight, wu)} ${wu}`].filter(Boolean).join(' at ');

  return (
    <div className="active">
      <div className="active-top">
        <IconButton icon="close" label="Leave workout" onClick={() => setLeave(true)} />
        <div className="active-title">
          <strong>{sess.name}</strong>
          <span className="num">{clock(sessionDuration(sess) / 1000)} elapsed · {done} of {total} sets</span>
        </div>
        <IconButton icon={paused ? 'play' : 'pause'} label={paused ? 'Resume workout' : 'Pause workout'} onClick={togglePause} />
        <Button size="sm" variant="primary" onClick={() => setFinishAsk(true)}>Finish</Button>
      </div>
      <div className="active-progress" aria-hidden="true"><div style={{ width: `${(done / Math.max(1, total)) * 100}%` }} /></div>

      <div className="active-body">
        {paused && <div className="paused-banner" role="status">Paused — the clock and rest timer are stopped.</div>}

        <div className="ex-head">
          <div>
            <p className="muted small">Exercise {cur.entry + 1} of {sess.entries.length}{entry.group ? ' · superset' : ''}</p>
            <h1 className="ex-name">{ex.name}</h1>
            <p className="set-label">Set {cur.set + 1} of {entry.sets.length}</p>
          </div>
          <Button size="sm" variant="quiet" icon="info" onClick={() => setGuide(true)}>How to</Button>
        </div>
        {targetText && <p className="target-line">Target: {targetText}</p>}
        {prev && (
          <p className="prev-line">Last time ({fmtTs(prev.at, { day: 'numeric', month: 'short' })}): {prev.sets.map((x) => [x.reps != null && `${x.reps}`, x.weight ? `× ${toDisplayWeight(x.weight, wu)}${wu}` : '', x.seconds ? `${x.seconds}s` : '', x.distance ? `${toDisplayDist(x.distance, du)}${du}` : ''].filter(Boolean).join(' ')).join(', ')}</p>
        )}

        <div className="set-dots" role="group" aria-label="Sets">
          {entry.sets.map((x, j) => (
            <button key={j} className={`set-dot ${x.done ? 'done' : ''} ${j === cur.set ? 'current' : ''}`} aria-current={j === cur.set ? 'step' : undefined}
              aria-label={`Set ${j + 1}${x.done ? ', done' : ''}`} onClick={() => jump({ entry: cur.entry, set: j })}>
              {x.done ? <Icon name="check" size={16} /> : j + 1}
            </button>
          ))}
          <button className="set-dot" onClick={addSet} aria-label="Add a set">+</button>
        </div>

        {resting && !paused ? (
          <section className="rest" aria-live="polite">
            <p className="muted">Rest</p>
            <p className="rest-time num" role="timer">{clock(restLeft)}</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Button variant="quiet" onClick={() => mut((s) => ({ ...s, restEndsAt: (s.restEndsAt ?? Date.now()) + 30000 }))}>+30 s</Button>
              <Button variant="primary" onClick={() => mut((s) => ({ ...s, restEndsAt: undefined }))}>Skip rest</Button>
            </div>
            {p.confidenceMode && <p className="field-hint" style={{ marginTop: 12 }}>Resting lets your muscles recover enough to do the next set well.</p>}
          </section>
        ) : (
          <section aria-label="Log this set" className="stack">
            <div className="log-grid">
              {(ex.measure === 'reps' || hasWeight || assisted) && <Stepper label="Reps" value={set.reps} onChange={(v) => setField({ reps: v })} />}
              {hasWeight && <Stepper label="Weight" unit={wu} step={wu === 'kg' ? 2.5 : 5} decimals={1} value={toDisplayWeight(set.weight, wu)} onChange={(v) => setField({ weight: fromDisplayWeight(v, wu) })} />}
              {assisted && <Stepper label="Assistance" unit={wu} step={wu === 'kg' ? 2.5 : 5} decimals={1} value={toDisplayWeight(set.weight, wu)} onChange={(v) => setField({ weight: fromDisplayWeight(v, wu) })} />}
              {isTime && <Stepper label="Seconds" step={5} value={set.seconds} onChange={(v) => setField({ seconds: v })} />}
              {isDist && <Stepper label="Distance" unit={du} step={0.1} decimals={2} value={toDisplayDist(set.distance, du)} onChange={(v) => setField({ distance: fromDisplayDist(v, du) })} />}
              {isDist && <Stepper label="Minutes" step={1} value={set.seconds ? Math.round(set.seconds / 60) : undefined} onChange={(v) => setField({ seconds: v * 60 })} />}
            </div>
            {assisted && <p className="field-hint">Using an assisted machine or band? Record the assistance — less assistance over time is progress. Leave at 0 for unassisted.</p>}
            {isTime && <HoldTimer seconds={set.seconds ?? 30} sound={p.sound} onDone={(secs) => setField({ seconds: secs })} />}
            <Disclosure summary="How hard was it? (optional)">
              <p className="field-hint" style={{ marginBottom: 8 }}>RPE: 1 is very easy, 10 means you couldn’t do another rep.</p>
              <div className="scale" role="radiogroup" aria-label="Effort (RPE)">
                {[5, 6, 7, 8, 9, 10].map((n) => <button key={n} role="radio" aria-checked={set.rpe === n} className={set.rpe === n ? 'on' : ''} onClick={() => setField({ rpe: set.rpe === n ? undefined : n })}>{n}</button>)}
              </div>
            </Disclosure>
            <Button variant="primary" size="xl" block icon="check" onClick={completeSet} disabled={paused}>{set.done ? 'Update set' : 'Complete set'}</Button>
          </section>
        )}

        {nextEx && upNext && (
          <div className="next-up"><span><span className="muted">Next:</span> <strong>{nextEx.name}</strong> · set {upNext.set + 1}</span>
            {resting && <button className="link-btn small" onClick={() => setGuide(true)}>Preview</button>}</div>
        )}

        <div className="active-controls">
          <Button variant="quiet" icon="skip" onClick={skipExercise}>Skip exercise</Button>
          <Button variant="quiet" icon="plus" onClick={() => setPicker(true)}>Add exercise</Button>
          <Button variant="quiet" icon={paused ? 'play' : 'pause'} onClick={togglePause}>{paused ? 'Resume' : 'Pause'}</Button>
        </div>

        <details className="disclosure">
          <summary><span>All exercises in this session</span><Icon name="chevronD" size={16} /></summary>
          <div className="disclosure-body">
            {sess.entries.map((e, i) => {
              const x = exerciseById(e.exerciseId)!;
              const d = e.sets.filter((s) => s.done).length;
              return (
                <button key={e.itemId} className="history-row" style={{ width: '100%', background: 'none', border: 0, borderTop: '1px solid var(--line)', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => { const firstOpen = e.sets.findIndex((s) => !s.done); mut((s) => ({ ...s, cursor: { entry: i, set: Math.max(0, firstOpen) }, restEndsAt: undefined, entries: s.entries.map((en, k) => (k === i ? { ...en, skipped: false } : en)) })); }}>
                  <span><span className="history-name">{x.name}</span>{e.skipped && <span className="muted small"> · skipped</span>}</span>
                  <span className="muted small num">{d}/{e.sets.length}</span>
                </button>
              );
            })}
          </div>
        </details>
        <p className="muted small" style={{ textAlign: 'center' }}>Progress saves automatically on this device, even if you close the page.</p>
      </div>

      <Modal open={guide} onClose={() => setGuide(false)} title={ex.name} wide footer={<Button variant="primary" onClick={() => setGuide(false)}>Back to my set</Button>}>
        <div className="stack">
          <ExerciseDemo ex={ex} figure={p.demoFigure} />
          <p>{ex.short}</p>
          <ol className="steps-list">{ex.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          <p><strong>Breathing.</strong> {ex.breathing}</p>
          <div className="notice notice-amber"><strong>Safety.</strong> {ex.safety.join(' ')}</div>
          {p.confidenceMode && (
            <Disclosure summary="Gym words, explained">
              <dl className="stack-sm">{GLOSSARY.slice(0, 5).map((g) => <div key={g.term}><dt style={{ fontWeight: 600 }}>{g.term}</dt><dd style={{ margin: 0 }}>{g.plain}</dd></div>)}</dl>
            </Disclosure>
          )}
          <a href={`#/library/${ex.id}`} className="small muted" onClick={(e) => { e.preventDefault(); setGuide(false); }}>Your set and timer are kept while this is open.</a>
        </div>
      </Modal>

      <Modal open={leave} onClose={() => setLeave(false)} title="Leave this workout?"
        footer={<>
          <Button variant="ghost" onClick={() => { setLeave(false); discard(); }}>Discard workout</Button>
          {done > 0 && <Button onClick={() => { setLeave(false); finish(); }}>Finish and save</Button>}
          <Button variant="primary" onClick={() => { setLeave(false); navigate('/'); }}>Keep it for later</Button>
        </>}>
        <p>{done > 0 ? `You’ve logged ${done} ${done === 1 ? 'set' : 'sets'}. You can keep this workout open and return to it, save it now, or discard it.` : 'Nothing has been logged yet. Keep it open to come back to, or discard it.'}</p>
        <p className="muted small" style={{ marginTop: 8 }}>Discarding can’t be undone.</p>
      </Modal>

      <Modal open={finishAsk} onClose={() => setFinishAsk(false)} title={done >= total ? 'All sets done' : 'Finish workout?'}
        footer={<><Button variant="ghost" onClick={() => setFinishAsk(false)}>Keep going</Button><Button variant="primary" onClick={() => { setFinishAsk(false); finish(); }}>Finish and see summary</Button></>}>
        <p>{done >= total ? 'Nicely done. Finish to see your summary.' : `${total - done} planned ${total - done === 1 ? 'set hasn’t' : 'sets haven’t'} been logged. That’s fine — ${done / Math.max(1, total) >= 0.8 ? 'this still counts as a completed session.' : 'it will be saved as a partial session, which still counts towards your week.'}`}</p>
      </Modal>

      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={addExercise} />
    </div>
  );
}

function HoldTimer({ seconds, onDone, sound }: { seconds: number; onDone: (s: number) => void; sound: boolean }) {
  const [start, setStart] = useState<number | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { if (!start) return; const t = setInterval(() => tick((n) => n + 1), 200); return () => clearInterval(t); }, [start]);
  const elapsed = start ? (Date.now() - start) / 1000 : 0;
  const left = seconds - elapsed;
  useEffect(() => { if (start && left <= 0) { if (sound) beep('done'); onDone(seconds); setStart(null); } });
  return (
    <div className="row" style={{ justifyContent: 'center' }}>
      {start ? (
        <><span className="num" style={{ fontSize: '2.4rem', fontWeight: 600 }} role="timer">{clock(left)}</span>
          <Button variant="quiet" onClick={() => { onDone(Math.round(elapsed)); setStart(null); }}>Stop at {Math.round(elapsed)}s</Button></>
      ) : <Button variant="secondary" icon="timer" onClick={() => { unlockAudio(); setStart(Date.now()); }}>Start {seconds}s hold timer</Button>}
    </div>
  );
}
