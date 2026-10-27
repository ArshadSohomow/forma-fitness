import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { Button, PageHeader, Panel, Tag, Toggle, Icon } from '../components/ui';
import { MySculpture } from '../components/MySculpture';
import { Sculpture } from '../components/Sculpture';
import { MILESTONES, nextStage, OUTCOME_COPY, stageIndex, STAGES, thisWeekId } from '../logic/calc';
import { fmtTs, weekLabel } from '../logic/dates';

const PREVIEWS = [
  { key: 'mine', label: 'Mine' },
  ...STAGES.map((s, i) => ({ key: `s${i}`, label: s.name })),
  { key: 'weathered', label: 'Weathered' },
  { key: 'repaired', label: 'Repaired' },
];

export function SculpturePage() {
  const { state, update } = useApp();
  const sc = state.sculpture; const p = state.profile;
  const stage = stageIndex(sc.refinement);
  const nxt = nextStage(sc.refinement);
  const [preview, setPreview] = useState('mine');
  const celebrate = sc.lastChange && (sc.lastChange.kind === 'refined' || sc.lastChange.kind === 'restored') && (sc.seenCelebration ?? 0) < sc.lastChange.at ? sc.lastChange.kind : null;
  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => update((s) => ({ ...s, sculpture: { ...s.sculpture, seenCelebration: Date.now() } })), 2600);
    return () => clearTimeout(t);
  }, [celebrate]);

  const ov = preview === 'mine' ? undefined
    : preview === 'weathered' ? { stage: Math.max(2, stage), weathering: 3, repaired: false, neglect: 2, vitality: 0 }
    : preview === 'repaired' ? { stage: Math.max(2, stage), weathering: 0, repaired: true, neglect: 0 }
    : { stage: Number(preview.slice(1)), weathering: 0, vitality: Number(preview.slice(1)), neglect: 0, repaired: false };
  const reviews = [...state.reviews].reverse();
  const reviewedThisWeek = state.reviews.some((r) => r.weekId === thisWeekId());

  return (
    <div>
      <PageHeader title="My sculpture" lede="A symbol of your habits — shaped by the goals you set and the weeks you show up for. It isn’t a picture of your body, and it never predicts one." />
      <div className="sc-page">
        <div className="sc-frame">
          <MySculpture celebrate={preview === 'mine' ? celebrate : null} override={ov} />
          {preview !== 'mine' && <p className="notice" style={{ borderRadius: 0, border: 0, textAlign: 'center' }}>Preview only — your sculpture hasn’t changed.</p>}
        </div>

        <div className="stack">
          <div>
            <p className="muted small">Stage {stage + 1} of {STAGES.length}</p>
            <h2 className="sc-title">{STAGES[stage].name}</h2>
            <p className="page-lede">{STAGES[stage].note}</p>
            <div className="stage-track" style={{ marginTop: 16 }} aria-hidden="true">{STAGES.map((_, i) => <div key={i} className={i <= stage ? 'on' : ''} />)}</div>
            <p className="small muted" style={{ marginTop: 8 }}>{nxt ? `${nxt.at - sc.refinement} more successful ${nxt.at - sc.refinement === 1 ? 'week' : 'weeks'} until “${nxt.name}”.` : 'Fully revealed. Keep it polished with steady weeks.'}</p>
          </div>

          <Panel title="Current condition" id="cond">
            <ul className="plain-list">
              <li>{sc.weathering === 0 ? 'The surface is clean.' : `Light weathering (${sc.weathering} of 3). One steady week — even at a reduced target — restores a level.`}</li>
              {sc.repairs > 0 && <li>Mended {sc.repairs} {sc.repairs === 1 ? 'time' : 'times'}. The gold seam marks a week you came back.</li>}
              {p.nutritionEffects !== 'off' ? (
                <li>{sc.vitality === 0 ? 'The garden is bare for now — consistent eating weeks bring sunlight and greenery.' : `The garden is ${['', 'beginning to grow', 'growing', 'green and warm', 'flourishing', 'in full bloom'][sc.vitality]}.`}{sc.neglect > 0 && ' A few fallen leaves — they clear as your routine settles.'}</li>
              ) : <li>Nutrition effects are off; the garden grows with successful training weeks.</li>}
              {p.wrappersEnabled && sc.wrappers > 0 && <li>A few wrappers near the base reflect a habit you chose to track. They clear after quieter weeks.</li>}
            </ul>
            <div className="row" style={{ marginTop: 16 }}>
              {!reviewedThisWeek && <Button variant="primary" icon="review" to="/review">Review this week</Button>}
              <Button variant="ghost" to="/profile#sculpture">Sculpture settings</Button>
            </div>
          </Panel>

          <Panel title="See every state" id="previews">
            <p className="small muted" style={{ marginBottom: 12 }}>Preview how the sculpture looks at each stage, and how weathering and repair appear.</p>
            <div className="preview-strip">
              {PREVIEWS.map((pv) => (
                <button key={pv.key} className={preview === pv.key ? 'on' : ''} aria-pressed={preview === pv.key} onClick={() => setPreview(pv.key)}>
                  {pv.key === 'mine' ? <MySculpture /> : (
                    <Sculpture style={p.sculptureStyle} build={p.sculptureBuild} detail="reduced" numeral={false} label="" milestones={{}}
                      stage={pv.key.startsWith('s') ? Number(pv.key.slice(1)) : Math.max(2, stage)} weathering={pv.key === 'weathered' ? 3 : 0} repaired={pv.key === 'repaired'}
                      vitality={pv.key.startsWith('s') ? Number(pv.key.slice(1)) : 0} neglect={pv.key === 'weathered' ? 2 : 0} wrappers={0} />
                  )}
                  {pv.label}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Milestones" id="ms">
            <div className="plaques">
              {MILESTONES.map((m) => {
                const at = sc.milestones[m.id];
                return (
                  <div key={m.id} className={`plaque ${at ? '' : 'locked'}`}>
                    <p className="plaque-title">{m.title}</p>
                    <p className="plaque-text">{at ? `${m.reward} · ${fmtTs(at, { day: 'numeric', month: 'short', year: 'numeric' })}` : m.reward}</p>
                    {!at && <span className="sr-only">Not yet reached</span>}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Weekly changes" id="tl">
            {reviews.length === 0 ? <p className="muted">After your first weekly review, each week’s change is recorded here.</p> : (
              <ul className="timeline">
                {reviews.map((r) => (
                  <li key={r.weekId}>
                    <span className="muted small">{weekLabel(r.weekId)}</span>
                    <span><Tag tone={r.outcome === 'weathered' ? 'amber' : r.outcome === 'held' ? 'neutral' : 'sage'}>{OUTCOME_COPY[r.outcome].title}</Tag> <span className="small">{r.completedSessions} of {r.plannedSessions} sessions{r.nutritionDaysTracked ? ` · nutrition met ${r.nutritionDaysMet}/${r.nutritionDaysTracked} days` : ''}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="How it works" id="how">
            <div className="stack-sm small">
              <p>At the end of each week you compare what you planned with what you did, using only the goals you choose to count.</p>
              <p><strong>Met your goals:</strong> the chisel takes another pass. <strong>Partly there or a reduced target met:</strong> everything holds, and any weathering is repaired. <strong>A difficult week:</strong> a little dust or a fine crack appears — never more than three levels, and progress you’ve made is never removed.</p>
              <p>Nutrition only affects the surrounding garden, based on patterns across several days. No single meal changes anything.</p>
              <Toggle label="Show motivational messages" checked={p.motivation} onChange={(v) => update((s) => ({ ...s, profile: { ...s.profile, motivation: v } }))} />
            </div>
          </Panel>
          <p className="muted small"><Icon name="info" size={16} /> The sculpture is a symbolic record of habits and consistency. It does not represent body composition, fat loss, muscle growth or health.</p>
        </div>
      </div>
    </div>
  );
}
