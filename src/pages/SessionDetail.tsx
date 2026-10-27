import { useState } from 'react';
import { useApp, startSession } from '../store';
import { navigate, query } from '../router';
import { Button, Confirm, Empty, NumberInput, PageHeader, Panel, Tag, Icon } from '../components/ui';
import { exerciseById } from '../data/exercises';
import { fmtTs, fmtDuration, fmtTime } from '../logic/dates';
import { computePRs, repsDone, sessionDuration, setsDone, setsPlanned, templateById, toDisplayWeight, fromDisplayWeight, volumeKg, toDisplayDist, fromDisplayDist, round1 } from '../logic/calc';
import { AFTER_WORKOUT, pick } from '../data/messages';
import type { Session } from '../types';

export function SessionDetail({ id }: { id: string }) {
  const { state, update, toast } = useApp();
  const sess = state.sessions.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Session | null>(null);
  const [del, setDel] = useState(false);
  const isSummary = query().get('summary') === '1';
  const wu = state.profile.units.weight, du = state.profile.units.distance;

  if (!sess) return <Empty title="Session not found" text="It may have been deleted." action={<Button to="/history">Back to history</Button>} />;
  if (sess.status === 'active') { navigate('/workout/active', { replace: true }); return null; }

  const prs = computePRs(state.sessions).bySession.get(sess.id) ?? [];
  const prevSame = state.sessions.filter((x) => x.status !== 'active' && x.id !== sess.id && x.templateId && x.templateId === sess.templateId && x.startedAt < sess.startedAt).sort((a, b) => b.startedAt - a.startedAt)[0];
  const s = editing && draft ? draft : sess;
  const vol = volumeKg(s), pvol = prevSame ? volumeKg(prevSame) : null;

  const setDraftSet = (ei: number, si: number, patch: Record<string, unknown>) => setDraft((d) => d && ({ ...d, entries: d.entries.map((e, i) => (i === ei ? { ...e, sets: e.sets.map((x, j) => (j === si ? { ...x, ...patch } : x)) } : e)) }));
  const saveEdit = () => {
    if (!draft) return;
    const done = setsDone(draft) / Math.max(1, setsPlanned(draft));
    update((st) => ({ ...st, sessions: st.sessions.map((x) => (x.id === id ? { ...draft, status: done >= 0.8 ? 'completed' : 'partial' } : x)) }));
    setEditing(false); toast('Log updated');
  };
  const repeat = () => {
    const t = templateById(state, sess.templateId);
    if (!t) { toast('The original workout no longer exists.', 'warn'); return; }
    if (state.activeSessionId) { navigate('/workout/active'); return; }
    update((st) => startSession(st, t)); navigate('/workout/active');
  };

  return (
    <div>
      <PageHeader backTo={{ to: '/history', label: 'History' }} title={isSummary ? 'Workout complete' : sess.name}
        lede={isSummary ? pick(AFTER_WORKOUT, sess.startedAt) : `${fmtTs(sess.startedAt, { weekday: 'long', day: 'numeric', month: 'long' })} at ${fmtTime(sess.startedAt)}`}
        actions={!editing ? <><Button icon="edit" onClick={() => { setDraft(structuredClone(sess)); setEditing(true); }}>Correct log</Button>{sess.templateId && <Button icon="play" onClick={repeat}>Repeat</Button>}{isSummary && <Button variant="primary" to="/">Done</Button>}</> : undefined} />

      <div className="stack">
        <Panel>
          <dl className="kv">
            <div className="kv-item"><dt>Duration</dt><dd className="num">{fmtDuration(sessionDuration(s))}</dd></div>
            <div className="kv-item"><dt>Sets</dt><dd className="num">{setsDone(s)}<span className="muted small"> / {setsPlanned(s)}</span></dd></div>
            <div className="kv-item"><dt>Reps</dt><dd className="num">{repsDone(s)}</dd></div>
            {vol > 0 && <div className="kv-item"><dt>Volume</dt><dd className="num">{Math.round(toDisplayWeight(vol, wu)!)} <span className="small muted">{wu}</span></dd></div>}
          </dl>
          <div className="row" style={{ marginTop: 16 }}>
            <Tag tone={s.status === 'completed' ? 'sage' : 'amber'}>{s.status === 'completed' ? 'Completed' : 'Partly completed'}</Tag>
            {prevSame && pvol != null && vol > 0 && pvol > 0 && (
              <span className="small muted">Compared with {fmtTs(prevSame.startedAt, { day: 'numeric', month: 'short' })}: volume {vol >= pvol ? 'up' : 'down'} {Math.abs(Math.round(((vol - pvol) / pvol) * 100))}%, duration {fmtDuration(sessionDuration(prevSame))} then.</span>
            )}
          </div>
        </Panel>

        {prs.length > 0 && (
          <Panel title="Personal bests" id="pbs">
            <ul className="plain-list">
              {prs.map((pr, i) => {
                const ex = exerciseById(pr.exerciseId);
                return <li key={i}><strong>{ex?.name}</strong> — {pr.kind === 'weight' ? `${toDisplayWeight(pr.value, wu)} ${wu} for ${pr.reps} reps` : pr.kind === 'reps' ? `${pr.value} reps` : pr.kind === 'time' ? `${pr.value} s hold` : `${toDisplayDist(pr.value, du)} ${du}`}</li>;
              })}
            </ul>
          </Panel>
        )}

        {isSummary && !editing && (
          <Panel title="How did that feel?" id="rpe">
            <div className="scale" role="radiogroup" aria-label="Session difficulty">
              {[['1', 'Easy'], ['2', 'Steady'], ['3', 'Hard'], ['4', 'Very hard']].map(([v, l]) => (
                <button key={v} role="radio" aria-checked={sess.rpe === Number(v)} className={sess.rpe === Number(v) ? 'on' : ''}
                  onClick={() => update((st) => ({ ...st, sessions: st.sessions.map((x) => (x.id === id ? { ...x, rpe: Number(v) } : x)) }))}>{l}</button>
              ))}
            </div>
          </Panel>
        )}

        <Panel title="Exercises" id="exs">
          {s.entries.map((e, ei) => {
            const ex = exerciseById(e.exerciseId)!;
            return (
              <div key={e.itemId} style={{ padding: '14px 0', borderTop: ei ? '1px solid var(--line)' : 0 }}>
                <div className="row-between"><a href={`#/library/${ex.id}`} style={{ fontWeight: 600 }}>{ex.name}</a>{e.skipped && <Tag>Skipped</Tag>}</div>
                {!editing ? (
                  <p className="muted small num" style={{ marginTop: 4 }}>
                    {e.sets.filter((x) => x.done).map((x) => [x.reps != null ? `${x.reps}` : '', x.weight ? `× ${toDisplayWeight(x.weight, wu)} ${wu}` : '', x.seconds ? `${x.seconds}s` : '', x.distance ? `${toDisplayDist(x.distance, du)} ${du}` : ''].filter(Boolean).join(' ')).join('  ·  ') || 'No sets logged'}
                  </p>
                ) : (
                  <div className="stack-sm" style={{ marginTop: 8 }}>
                    {e.sets.map((x, si) => (
                      <div key={si} className="row" style={{ gap: 8 }}>
                        <label className="row small" style={{ width: 80 }}><input type="checkbox" checked={x.done} onChange={(ev) => setDraftSet(ei, si, { done: ev.target.checked })} /> Set {si + 1}</label>
                        {x.reps !== undefined && <NumberInput aria-label={`Set ${si + 1} reps`} style={{ width: 80 }} value={x.reps} onChange={(v) => setDraftSet(ei, si, { reps: v })} />}
                        {(ex.measure === 'weight_reps' || ex.measure === 'assisted') && <><NumberInput aria-label={`Set ${si + 1} weight`} style={{ width: 90 }} step={0.5} value={toDisplayWeight(x.weight, wu)} onChange={(v) => setDraftSet(ei, si, { weight: v == null ? undefined : fromDisplayWeight(v, wu) })} /><span className="muted small">{wu}</span></>}
                        {x.seconds !== undefined && ex.measure === 'time' && <><NumberInput aria-label={`Set ${si + 1} seconds`} style={{ width: 80 }} value={x.seconds} onChange={(v) => setDraftSet(ei, si, { seconds: v })} /><span className="muted small">s</span></>}
                        {ex.measure === 'distance' && <><NumberInput aria-label={`Set ${si + 1} distance`} style={{ width: 90 }} step={0.1} value={toDisplayDist(x.distance, du)} onChange={(v) => setDraftSet(ei, si, { distance: v == null ? undefined : fromDisplayDist(v, du) })} /><span className="muted small">{du}</span></>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </Panel>

        {editing ? (
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button variant="primary" icon="check" onClick={saveEdit}>Save changes</Button>
          </div>
        ) : (
          <div className="row-between">
            <Button variant="ghost" icon="trash" onClick={() => setDel(true)}>Delete session</Button>
            {isSummary && <span className="muted small"><Icon name="check" size={16} /> Saved to your history on this device</span>}
          </div>
        )}
      </div>

      <Confirm open={del} onClose={() => setDel(false)} danger title="Delete this session?" confirmLabel="Delete session"
        onConfirm={() => { update((st) => ({ ...st, sessions: st.sessions.filter((x) => x.id !== id) })); toast('Session deleted'); navigate('/history', { replace: true }); }}
        text="It will be removed from your history and weekly totals. Weeks you’ve already reviewed won’t change." />
    </div>
  );
}

export const roundW = round1;
