import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { navigate } from '../router';
import { Button, Field, IconButton, NumberInput, PageHeader, Panel, Tag, Modal, Icon } from '../components/ui';
import { exerciseById } from '../data/exercises';
import { clock } from '../logic/dates';
import { uid } from '../logic/calc';
import { beep, unlockAudio } from '../logic/audio';
import type { HiitConfig, Session } from '../types';
import { ExercisePicker } from './WorkoutEditor';
import { ExerciseDemo } from '../components/ExerciseDemo';

interface Phase { kind: 'warmup' | 'work' | 'rest' | 'roundRest' | 'cooldown'; dur: number; ex?: string; round: number; idx: number }
export function buildPhases(c: HiitConfig): Phase[] {
  const out: Phase[] = [];
  if (c.warmup > 0) out.push({ kind: 'warmup', dur: c.warmup, round: 0, idx: 0 });
  for (let r = 0; r < c.rounds; r++) {
    c.exercises.forEach((ex, i) => {
      out.push({ kind: 'work', dur: c.work, ex, round: r + 1, idx: i });
      const lastInRound = i === c.exercises.length - 1, lastRound = r === c.rounds - 1;
      if (!lastInRound && c.rest > 0) out.push({ kind: 'rest', dur: c.rest, ex: c.exercises[i + 1], round: r + 1, idx: i });
      if (lastInRound && !lastRound) { const d = c.roundRest || c.rest; if (d > 0) out.push({ kind: 'roundRest', dur: d, ex: c.exercises[0], round: r + 1, idx: i }); }
    });
  }
  if (c.cooldown > 0) out.push({ kind: 'cooldown', dur: c.cooldown, round: c.rounds, idx: 0 });
  return out;
}
const LOW_SWAP: Record<string, string> = { 'jumping-jack': 'step-up', burpee: 'bodyweight-squat', 'mountain-climber': 'dead-bug', 'high-knees': 'glute-bridge', run: 'brisk-walk' };
const PHASE_LABEL: Record<Phase['kind'], string> = { warmup: 'Warm up', work: 'Work', rest: 'Rest', roundRest: 'Round rest', cooldown: 'Cool down' };

export function intensityOf(c: HiitConfig) {
  const hi = c.exercises.some((e) => exerciseById(e)?.impact === 'high');
  const ratio = c.work / Math.max(1, c.rest);
  if (ratio >= 2 && hi) return { label: 'High intensity', tone: 'amber' as const };
  if (!hi) return { label: 'Low impact', tone: 'sage' as const };
  return { label: 'Moderate', tone: 'neutral' as const };
}

export function Hiit() {
  const { state } = useApp();
  return state.hiitRun ? <HiitRunView /> : <HiitSetup />;
}

function HiitSetup() {
  const { state, update, toast } = useApp();
  const [c, setC] = useState<HiitConfig>(state.hiitPresets[1] ?? state.hiitPresets[0]);
  const [picker, setPicker] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const total = buildPhases(c).reduce((a, p) => a + p.dur, 0);
  const inten = intensityOf(c);
  const num = (k: keyof HiitConfig, label: string, step = 5, min = 0) => (
    <Field label={label}>{(id) => <NumberInput id={id} min={min} step={step} value={c[k] as number} onChange={(v) => setC({ ...c, [k]: Math.max(min, v ?? 0) })} />}</Field>
  );
  const start = () => {
    if (c.exercises.length === 0) { setErr('Add at least one exercise.'); return; }
    if (c.work < 5 || c.rounds < 1) { setErr('Work intervals need to be at least 5 seconds, with at least one round.'); return; }
    unlockAudio();
    update((s) => ({ ...s, hiitRun: { config: c, startedAt: Date.now(), pausedTotal: 0, skipOffset: 0 } }));
  };
  const savePreset = () => {
    const name = c.name.trim() || 'My intervals';
    update((s) => ({ ...s, hiitPresets: [...s.hiitPresets.filter((p) => p.name !== name), { ...c, name }] }));
    toast(`Preset “${name}” saved`);
  };

  return (
    <div>
      <PageHeader backTo={{ to: '/workouts', label: 'Workouts' }} title="Interval timer" lede="Timed work and rest, with sound cues. Pick a preset or set every interval yourself." />
      <div className="stack">
        <Panel title="Presets" id="presets">
          <div className="chips">
            {state.hiitPresets.map((p) => <button key={p.name} className={`chip ${c.name === p.name ? 'on' : ''}`} aria-pressed={c.name === p.name} onClick={() => setC(p)}>{p.name}</button>)}
          </div>
        </Panel>
        <Panel title="Intervals" id="intervals" action={<span className="row"><Tag tone={inten.tone}>{inten.label}</Tag><Tag>{clock(total)} total</Tag></span>}>
          <div className="form-grid">
            {num('warmup', 'Warm-up (s)', 15)}{num('work', 'Work (s)', 5, 5)}{num('rest', 'Rest (s)', 5)}{num('rounds', 'Rounds', 1, 1)}{num('roundRest', 'Rest between rounds (s)', 15)}{num('cooldown', 'Cool-down (s)', 15)}
          </div>
          <div style={{ marginTop: 12 }}><Field label="Name (for saving as a preset)">{(id) => <input id={id} className="input" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />}</Field></div>
        </Panel>
        <Panel title={`Exercises (${c.exercises.length})`} id="hex" action={<Button size="sm" icon="plus" onClick={() => setPicker(true)}>Add</Button>}>
          {err && <p className="field-error" role="alert">{err}</p>}
          {c.exercises.map((e, i) => {
            const ex = exerciseById(e)!;
            return (
              <div key={`${e}-${i}`} className="row-between" style={{ padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 0 }}>
                <span><strong>{ex.name}</strong> {ex.impact === 'high' && <Tag tone="amber">Higher impact</Tag>}</span>
                <span className="row" style={{ gap: 0 }}>
                  <IconButton icon="up" label={`Move ${ex.name} up`} disabled={i === 0} onClick={() => { const a = [...c.exercises]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; setC({ ...c, exercises: a }); }} />
                  <IconButton icon="trash" label={`Remove ${ex.name}`} onClick={() => setC({ ...c, exercises: c.exercises.filter((_, k) => k !== i) })} />
                </span>
              </div>
            );
          })}
          {c.exercises.some((e) => LOW_SWAP[e]) && (
            <Button size="sm" variant="quiet" style={{ marginTop: 12 }} onClick={() => setC({ ...c, exercises: c.exercises.map((e) => LOW_SWAP[e] ?? e), name: `${c.name} (low impact)` })}>Swap to low-impact alternatives</Button>
          )}
        </Panel>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={savePreset}>Save as preset</Button>
          <Button variant="primary" size="lg" icon="play" onClick={start}>Start timer</Button>
        </div>
        <p className="muted small"><Icon name="info" size={16} /> Intervals are demanding. Choose low-impact options if you have joint concerns, and stop if you feel dizzy or unwell.</p>
      </div>
      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={(id) => setC((x) => ({ ...x, exercises: [...x.exercises, id] }))} />
    </div>
  );
}

function HiitRunView() {
  const { state, update, toast } = useApp();
  const run = state.hiitRun!;
  const c = run.config;
  const phases = buildPhases(c);
  const total = phases.reduce((a, p) => a + p.dur, 0);
  const [, tick] = useState(0);
  const [stopAsk, setStopAsk] = useState(false);
  const [guide, setGuide] = useState<string | null>(null);
  const lastPhase = useRef<number>(-1);
  const lastTick = useRef<number>(-1);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 200); return () => clearInterval(t); }, []);
  useEffect(() => { const on = () => tick((n) => n + 1); document.addEventListener('visibilitychange', on); return () => document.removeEventListener('visibilitychange', on); }, []);

  const now = run.pausedAt ?? Date.now();
  const elapsed = Math.min(total, (now - run.startedAt - run.pausedTotal) / 1000 + run.skipOffset);
  let acc = 0, idx = phases.length - 1;
  for (let i = 0; i < phases.length; i++) { if (elapsed < acc + phases[i].dur) { idx = i; break; } acc += phases[i].dur; }
  const finished = elapsed >= total;
  const ph = phases[idx];
  const left = finished ? 0 : acc + ph.dur - elapsed;
  const ex = ph?.ex ? exerciseById(ph.ex) : null;

  // Audio cues — driven by computed state, so they stay in sync after tab switches.
  useEffect(() => {
    if (!state.profile.sound || run.pausedAt) return;
    if (finished) { if (lastPhase.current !== -2) { lastPhase.current = -2; beep('done'); } return; }
    if (lastPhase.current !== idx) { if (lastPhase.current !== -1) beep(ph.kind === 'work' ? 'go' : 'rest'); lastPhase.current = idx; }
    const sec = Math.ceil(left);
    if (sec <= 3 && sec > 0 && lastTick.current !== idx * 10 + sec) { lastTick.current = idx * 10 + sec; beep('tick'); }
  });
  useEffect(() => { if (finished && !run.finished) update((s) => (s.hiitRun ? { ...s, hiitRun: { ...s.hiitRun, finished: true } } : s)); }, [finished]);

  const setRun = (patch: Partial<typeof run>) => update((s) => (s.hiitRun ? { ...s, hiitRun: { ...s.hiitRun, ...patch } } : s));
  const pause = () => run.pausedAt ? setRun({ pausedAt: undefined, pausedTotal: run.pausedTotal + (Date.now() - run.pausedAt) }) : setRun({ pausedAt: Date.now() });
  const skip = () => setRun({ skipOffset: run.skipOffset + left + 0.01 });
  const close = (save: boolean) => {
    const doneUpTo = idx + (finished || ph?.kind === 'work' ? 1 : 0);
    const workDone = phases.slice(0, doneUpTo).filter((p) => p.kind === 'work').length;
    if (save && workDone > 0) {
      const sess: Session = {
        id: uid(), name: c.name || 'Intervals', kind: 'hiit', startedAt: run.startedAt, endedAt: Date.now(), pausedTotal: run.pausedTotal, status: finished ? 'completed' : 'partial', cursor: { entry: 0, set: 0 },
        hiit: { rounds: c.rounds, work: c.work, rest: c.rest, exercises: c.exercises },
        entries: c.exercises.map((e, i) => ({ itemId: uid(), exerciseId: e, restSec: c.rest, target: { sets: c.rounds, seconds: c.work },
          sets: Array.from({ length: c.rounds }, (_, r) => ({ seconds: c.work, done: phases.findIndex((p) => p.kind === 'work' && p.round === r + 1 && p.idx === i) < doneUpTo })) })),
      };
      update((s) => ({ ...s, hiitRun: null, sessions: [...s.sessions, sess] }));
      toast('Intervals saved to your history');
      navigate(`/history/${sess.id}?summary=1`, { replace: true });
    } else {
      if (save) toast('No work intervals were started, so there was nothing to save.', 'warn');
      update((s) => ({ ...s, hiitRun: null }));
      navigate('/hiit', { replace: true });
    }
  };

  const phaseKind = finished ? 'cooldown' : ph.kind;
  const roundPct = ((elapsed) / total) * 100;
  const nextWork = phases.slice(idx + 1).find((p) => p.kind === 'work');

  return (
    <div className={`hiit phase-${phaseKind}`}>
      <div className="active-top">
        <IconButton icon="close" label="Stop timer" onClick={() => (finished ? close(true) : setStopAsk(true))} />
        <div className="active-title"><strong>{c.name}</strong><span className="num">{clock(elapsed)} of {clock(total)}</span></div>
        <IconButton icon={state.profile.sound ? 'sound' : 'mute'} label={state.profile.sound ? 'Mute sounds' : 'Turn sounds on'} onClick={() => { unlockAudio(); update((s) => ({ ...s, profile: { ...s.profile, sound: !s.profile.sound } })); }} />
      </div>
      <div className="hiit-bar" aria-hidden="true"><div style={{ width: `${roundPct}%` }} /></div>
      <div className="hiit-body" aria-live="polite">
        {finished ? (
          <>
            <p className="hiit-phase">Finished</p>
            <p className="hiit-sub">{c.rounds} rounds · {clock(total)}</p>
            <Button variant="primary" size="xl" onClick={() => close(true)}>Save to history</Button>
            <Button variant="ghost" onClick={() => close(false)}>Close without saving</Button>
          </>
        ) : (
          <>
            <p className="hiit-phase">{PHASE_LABEL[ph.kind]}</p>
            <p className="hiit-clock num" role="timer" aria-label={`${Math.ceil(left)} seconds left`}>{clock(left)}</p>
            {ex && <p className="hiit-ex">{ph.kind === 'work' ? ex.name : `Next: ${ex.name}`}{ex.impact === 'high' && LOW_SWAP[ex.id] && ph.kind === 'work' ? <span className="hiit-sub"> · easier: {exerciseById(LOW_SWAP[ex.id])?.name}</span> : null}</p>}
            {ph.kind === 'work' || ph.kind === 'rest' || ph.kind === 'roundRest' ? <p className="hiit-sub">Round {ph.round} of {c.rounds}</p> : <p className="hiit-sub">{ph.kind === 'warmup' ? 'Gentle movement — march, circle the arms' : 'Slow down, breathe, stretch lightly'}</p>}
            {ph.kind !== 'work' && nextWork && !ex && <p className="hiit-sub">First up: {exerciseById(nextWork.ex!)?.name}</p>}
            {ex && <button className="link-btn small" onClick={() => setGuide(ex.id)}>How to do this</button>}
            {run.pausedAt && <p className="paused-banner">Paused</p>}
          </>
        )}
      </div>
      {!finished && (
        <div className="hiit-controls">
          <Button variant="secondary" size="lg" icon="stop" onClick={() => setStopAsk(true)}>Stop</Button>
          <Button variant="primary" size="lg" icon={run.pausedAt ? 'play' : 'pause'} onClick={pause}>{run.pausedAt ? 'Resume' : 'Pause'}</Button>
          <Button variant="secondary" size="lg" icon="skip" onClick={skip}>Skip</Button>
        </div>
      )}
      <Modal open={stopAsk} onClose={() => setStopAsk(false)} title="Stop the timer?"
        footer={<><Button variant="ghost" onClick={() => { setStopAsk(false); close(false); }}>Discard</Button><Button variant="primary" onClick={() => { setStopAsk(false); close(true); }}>Save what I did</Button></>}>
        <p>Completed work intervals can be saved to your history as a partial session.</p>
      </Modal>
      <Modal open={!!guide} onClose={() => setGuide(null)} title={guide ? exerciseById(guide)!.name : ''} footer={<Button variant="primary" onClick={() => setGuide(null)}>Back to timer</Button>}>
        {guide && <div className="stack"><ExerciseDemo ex={exerciseById(guide)!} figure={state.profile.demoFigure} /><ol className="steps-list">{exerciseById(guide)!.steps.map((s, i) => <li key={i}>{s}</li>)}</ol><p className="muted small">The timer keeps running while this is open.</p></div>}
      </Modal>
    </div>
  );
}
