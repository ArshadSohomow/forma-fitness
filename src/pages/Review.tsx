import { useMemo, useState } from 'react';
import { useApp, applyReview } from '../store';
import { navigate, query } from '../router';
import { Button, PageHeader, Panel, Tag, Toggle, NumberInput, Field, Meter, Icon } from '../components/ui';
import { MySculpture } from '../components/MySculpture';
import { addDays, DAY_SHORT, fmtDate, today, weekLabel } from '../logic/dates';
import { decideOutcome, OUTCOME_COPY, thisWeekId, weekStats } from '../logic/calc';

export function Review() {
  const { state, update } = useApp();
  const p = state.profile;
  const requested = query().get('week');
  const wk = requested ?? (state.reviews.some((r) => r.weekId === addDays(thisWeekId(), -7)) || state.createdAt >= new Date(`${thisWeekId()}T00:00:00`).getTime() ? thisWeekId() : addDays(thisWeekId(), -7));
  const st = weekStats(state, wk);
  const existing = state.reviews.find((r) => r.weekId === wk);
  const [step, setStep] = useState(existing ? 3 : 0);
  const [habitsKept, setHabitsKept] = useState<boolean | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [recovery, setRecovery] = useState<number | null>(null);
  const [counted, setCounted] = useState(p.reviewCounts);
  const [plannedBreak, setPlannedBreak] = useState(false);
  const [reduced, setReduced] = useState<number | null>(null);
  const [planned, setPlanned] = useState(st.planned);
  const [nextTarget, setNextTarget] = useState(p.daysPerWeek);
  const [notes, setNotes] = useState('');
  const isCurrent = wk === thisWeekId();
  const daysLeft = isCurrent ? 6 - Math.round((new Date(`${today()}T00:00:00`).getTime() - new Date(`${wk}T00:00:00`).getTime()) / 86400000) : 0;

  const decision = useMemo(() => decideOutcome({ planned, completed: st.completed, partial: st.partial, tracked: st.tracked, met: st.met, habitsKept, habitLogs: st.habitLogs, counted, plannedBreak, reducedTarget: reduced, firstWeek: state.createdAt >= new Date(`${wk}T00:00:00`).getTime() }, state.sculpture, p),
    [planned, st, habitsKept, counted, plannedBreak, reduced, state.sculpture, p]);

  const complete = () => {
    update((s) => {
      const withCounts = { ...s, profile: { ...s.profile, reviewCounts: counted } };
      return applyReview(withCounts, {
        weekId: wk, plannedSessions: planned, completedSessions: st.completed, partialSessions: st.partial, setsPlanned: st.setsPlanned, setsDone: st.setsDone,
        nutritionDaysTracked: st.tracked, nutritionDaysMet: st.met, habitsKept: counted.habits ? habitsKept : null, habitLogs: st.habitLogs, energy, recovery, notes, nextTarget, counted,
      }, { plannedBreak, reducedTarget: reduced });
    });
    setStep(3);
    window.scrollTo({ top: 0 });
  };

  const prevReview = state.reviews.filter((r) => r.weekId < wk).slice(-1)[0];
  const sessionPct = Math.round(Math.min(1, (st.completed + st.partial * 0.5) / Math.max(1, planned)) * 100);
  const setPct = st.setsPlanned ? Math.round((st.setsDone / st.setsPlanned) * 100) : null;

  if (step === 3) {
    const r = state.reviews.find((x) => x.weekId === wk);
    if (!r) return null;
    const copy = OUTCOME_COPY[r.outcome];
    return (
      <div>
        <PageHeader backTo={{ to: '/sculpture', label: 'My sculpture' }} title={copy.title} lede={`Week of ${weekLabel(wk)}`} />
        <div className="outcome">
          <div className="sc-frame" style={{ position: 'static' }}><MySculpture celebrate={r.outcome === 'refined' || r.outcome === 'restored' ? r.outcome : null} /></div>
          <div className="stack">
            <p style={{ fontSize: '1.125rem' }}>{copy.text}</p>
            <Panel>
              <dl className="kv">
                <div className="kv-item"><dt>Sessions</dt><dd className="num">{r.completedSessions}/{r.plannedSessions}</dd></div>
                {r.setsPlanned > 0 && <div className="kv-item"><dt>Sets</dt><dd className="num">{Math.round((r.setsDone / r.setsPlanned) * 100)}%</dd></div>}
                {r.nutritionDaysTracked > 0 && <div className="kv-item"><dt>Nutrition days met</dt><dd className="num">{r.nutritionDaysMet}/{r.nutritionDaysTracked}</dd></div>}
              </dl>
              {(r.envDelta.vitality > 0 || r.envDelta.neglect !== 0 || r.envDelta.wrappers !== 0) && (
                <p className="small muted" style={{ marginTop: 12 }}>
                  {r.envDelta.vitality > 0 && 'The garden grew a little. '}{r.envDelta.neglect > 0 && 'A few leaves fell around the plinth. '}{r.envDelta.neglect < 0 && 'Fallen leaves were swept away. '}{r.envDelta.wrappers > 0 && 'A wrapper appeared, reflecting the habit you’re tracking. '}{r.envDelta.wrappers < 0 && 'A wrapper was cleared. '}
                </p>
              )}
            </Panel>
            {r.outcome === 'weathered' && (
              <div className="notice notice-amber">
                <strong>A practical way back:</strong> next week, aim for {Math.max(1, Math.ceil(r.plannedSessions / 2))} {Math.ceil(r.plannedSessions / 2) === 1 ? 'session' : 'sessions'}. Meeting a smaller target restores the stone. The <a href="#/workouts/edit/tpl-return">“Welcome back”</a> session is a good start.
              </div>
            )}
            <p className="muted small">Next week’s target: {r.nextTarget} {r.nextTarget === 1 ? 'session' : 'sessions'}.</p>
            <div className="row"><Button variant="primary" to="/">Back to today</Button><Button variant="ghost" to="/sculpture">See the sculpture</Button></div>
          </div>
        </div>
      </div>
    );
  }

  const Scale = ({ value, set, label }: { value: number | null; set: (n: number | null) => void; label: string }) => (
    <div><p className="field-label" style={{ marginBottom: 8 }}>{label}</p>
      <div className="scale" role="radiogroup" aria-label={label}>
        {['Low', '', 'OK', '', 'Great'].map((l, i) => <button key={i} role="radio" aria-checked={value === i + 1} className={value === i + 1 ? 'on' : ''} onClick={() => set(value === i + 1 ? null : i + 1)} aria-label={`${i + 1} of 5${l ? `, ${l}` : ''}`}>{i + 1}</button>)}
      </div></div>
  );

  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader backTo={{ to: '/', label: 'Today' }} title="Weekly review" lede={`${weekLabel(wk)}${isCurrent && daysLeft > 0 ? ` · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left in this week` : ''}`} />
      <div className="review-steps" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} className={i <= step ? 'on' : ''} />)}</div>
      <p className="muted small" style={{ marginBottom: 16 }}>Step {step + 1} of 3</p>

      {isCurrent && daysLeft > 1 && step === 0 && <div className="notice" style={{ marginBottom: 16 }}>Reviews usually happen at the end of the week. You can review now, but sessions after this won’t count towards this week’s result.</div>}

      {step === 0 && (
        <div className="stack">
          <Panel title="Training: planned and done" id="train">
            <div className="week-strip" style={{ marginBottom: 20 }}>
              {st.perDay.map((d, i) => {
                const done = d.sessions.some((x) => x.status === 'completed'), part = !done && d.sessions.length > 0;
                return <div key={d.date} className="day" aria-label={`${DAY_SHORT[i]}: ${done ? 'completed' : part ? 'partial' : 'none'}`}><span>{DAY_SHORT[i]}</span><span className={`day-dot ${done ? 'done' : part ? 'partial' : state.schedule.weekly[i] ? 'planned' : ''}`} /></div>;
              })}
            </div>
            <Meter label="Sessions" value={st.completed + st.partial * 0.5} max={planned} detail={`${st.completed} completed${st.partial ? ` + ${st.partial} partial` : ''} of ${planned} planned · ${sessionPct}%`} />
            {setPct != null && <Meter label="Sets completed" tone="slate" value={st.setsDone} max={st.setsPlanned} detail={`${st.setsDone} of ${st.setsPlanned} · ${setPct}%`} />}
            {prevReview && <p className="small muted" style={{ marginTop: 12 }}>The week before: {prevReview.completedSessions} of {prevReview.plannedSessions} sessions.</p>}
            <div style={{ marginTop: 16, maxWidth: 260 }}>
              <Field label="Sessions you planned this week" hint="Correct this if your plan changed during the week.">{(id, h) => <NumberInput id={id} aria-describedby={h} min={0} value={planned} onChange={(v) => setPlanned(Math.max(0, v ?? 0))} />}</Field>
            </div>
          </Panel>
          <div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="primary" onClick={() => setStep(1)}>Continue</Button></div>
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <Panel title="Nutrition" id="nutr">
            {st.tracked === 0 ? <p className="muted">No food logged this week — that’s fine. Nutrition won’t count towards this week’s result.</p> : (
              <>
                <Meter label="Days targets were met" value={st.met} max={st.tracked} detail={`${st.met} of ${st.tracked} tracked days`} />
                <p className="small muted" style={{ marginTop: 8 }}>A day counts as met when protein reaches 90% of your target{p.calorieTracking ? ' and calories are within 15% of your target' : ''}. Days you didn’t log aren’t counted against you.</p>
              </>
            )}
          </Panel>
          <Panel title="Habits and how you feel" id="hab">
            <div className="stack">
              <div>
                <p className="field-label" style={{ marginBottom: 8 }}>Did you keep up the habits you wanted to this week?</p>
                <div className="scale" role="radiogroup" aria-label="Habits kept">
                  {[['Yes', true], ['Not really', false], ['Skip', null]].map(([l, v]) => <button key={String(l)} role="radio" aria-checked={habitsKept === v} className={habitsKept === v ? 'on' : ''} onClick={() => setHabitsKept(v as boolean | null)}>{l as string}</button>)}
                </div>
              </div>
              <Scale label="Energy this week" value={energy} set={setEnergy} />
              <Scale label="Recovery and sleep" value={recovery} set={setRecovery} />
              <Field label="Notes for yourself (optional)">{(id) => <textarea id={id} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
            </div>
          </Panel>
          <div className="row-between"><Button variant="ghost" onClick={() => setStep(0)}>Back</Button><Button variant="primary" onClick={() => setStep(2)}>Continue</Button></div>
        </div>
      )}

      {step === 2 && (
        <div className="stack">
          <Panel title="What counts towards your sculpture" id="counts">
            <Toggle label="Sessions" hint="Completed sessions against your plan (75% or more)." checked={counted.sessions} onChange={(v) => setCounted({ ...counted, sessions: v })} />
            <Toggle label="Nutrition" hint="Targets met on at least 60% of tracked days (needs 3+ tracked days)." checked={counted.nutrition} onChange={(v) => setCounted({ ...counted, nutrition: v })} />
            <Toggle label="Habits" hint="Your own answer to the habits question." checked={counted.habits} onChange={(v) => setCounted({ ...counted, habits: v })} />
            <hr className="divider" />
            <Toggle label="This was a planned break" hint="Holiday, illness or a deliberate rest week. Nothing weathers." checked={plannedBreak} onChange={setPlannedBreak} />
            <Toggle label="I set myself a reduced target this week" hint="Meeting a smaller target still restores the stone." checked={reduced != null} onChange={(v) => setReduced(v ? Math.max(1, Math.ceil(planned / 2)) : null)} />
            {reduced != null && <div style={{ maxWidth: 220, marginTop: 8 }}><Field label="Reduced target (sessions)">{(id) => <NumberInput id={id} min={1} value={reduced} onChange={(v) => setReduced(Math.max(1, v ?? 1))} />}</Field></div>}
          </Panel>

          <Panel title="Result" id="res">
            <ul className="plain-list" style={{ marginBottom: 12 }}>
              {decision.checks.map((c) => <li key={c.label}><strong>{c.label}:</strong> {c.pass == null ? '—' : c.pass ? <Tag tone="sage">Met</Tag> : <Tag tone="amber">Not met</Tag>} <span className="small muted">{c.detail}</span></li>)}
              {decision.checks.length === 0 && <li className="muted">Nothing is selected to count. Choose at least one goal above.</li>}
            </ul>
            <p><strong>{OUTCOME_COPY[decision.outcome].title}.</strong> {OUTCOME_COPY[decision.outcome].text}</p>
          </Panel>

          <Panel title="Next week" id="next">
            {decision.sessionRatio < 0.5 && !plannedBreak && <p className="notice notice-amber" style={{ marginBottom: 12 }}>If {planned} sessions felt like a stretch, a smaller target you can hit is more useful than a bigger one you can’t. You can always raise it again.</p>}
            <div className="row">
              {[Math.max(1, nextTarget - 1), nextTarget, nextTarget + 1].filter((v, i, a) => a.indexOf(v) === i).map((v) => (
                <button key={v} className={`chip ${nextTarget === v ? 'on' : ''}`} aria-pressed={nextTarget === v} onClick={() => setNextTarget(v)}>{v} {v === 1 ? 'session' : 'sessions'}{v === p.daysPerWeek ? ' (same)' : ''}</button>
              ))}
            </div>
          </Panel>

          <div className="row-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button variant="primary" size="lg" icon="check" onClick={complete} disabled={decision.checks.length === 0 && !plannedBreak}>Complete review</Button>
          </div>
          <p className="muted small"><Icon name="info" size={16} /> Each week can be reviewed once, so the sculpture never changes twice for the same week.</p>
        </div>
      )}
    </div>
  );
}

export const _fmt = fmtDate;
export const _nav = navigate;
