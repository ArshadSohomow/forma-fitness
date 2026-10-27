import { useApp } from '../store';
import { Button, Disclosure, Empty, PageHeader, Panel, Segmented, Tag } from '../components/ui';
import { ExerciseDemo, demoInfo } from '../components/ExerciseDemo';
import { exerciseById, GLOSSARY } from '../data/exercises';
import { computePRs, toDisplayWeight, toDisplayDist, finishedSessions } from '../logic/calc';
import { LineChart } from '../components/Charts';
import { fmtTs } from '../logic/dates';

const DIFF = ['', 'Beginner-friendly', 'Some experience', 'More advanced'];

export function ExerciseDetail({ id }: { id: string }) {
  const { state, update } = useApp();
  const ex = exerciseById(id);
  if (!ex) return <Empty title="Exercise not found" text="It may have been renamed." action={<Button to="/library">Back to library</Button>} />;
  const fig = state.profile.demoFigure;
  const info = demoInfo(ex);
  const wu = state.profile.units.weight, du = state.profile.units.distance;
  const prs = [...computePRs(state.sessions).best.values()].filter((p) => p.exerciseId === id);
  const history = finishedSessions(state).filter((s) => s.entries.some((e) => e.exerciseId === id && e.sets.some((x) => x.done))).reverse();
  const series = history.map((s) => {
    const sets = s.entries.find((e) => e.exerciseId === id)!.sets.filter((x) => x.done);
    const v = ex.measure === 'weight_reps' ? Math.max(...sets.map((x) => x.weight ?? 0)) : ex.measure === 'time' ? Math.max(...sets.map((x) => x.seconds ?? 0)) : ex.measure === 'distance' ? Math.max(...sets.map((x) => x.distance ?? 0)) : Math.max(...sets.map((x) => x.reps ?? 0));
    return { label: fmtTs(s.startedAt, { day: 'numeric', month: 'short' }), value: ex.measure === 'weight_reps' ? toDisplayWeight(v, wu)! : ex.measure === 'distance' ? toDisplayDist(v, du)! : v };
  });
  const unit = ex.measure === 'weight_reps' ? ` ${wu}` : ex.measure === 'time' ? ' s' : ex.measure === 'distance' ? ` ${du}` : ' reps';
  const alts = ex.alternatives.map(exerciseById).filter(Boolean);

  return (
    <div>
      <PageHeader backTo={{ to: '/library', label: 'Exercise library' }} title={ex.name} lede={ex.short} />
      <div className="ex-detail">
        <div className="demo-wrap stack">
          <ExerciseDemo ex={ex} figure={fig} />
          <div className="row-between">
            <div className="legend" aria-label="Legend">
              <span><span className="legend-swatch sw-primary" />Primary muscles</span>
              <span><span className="legend-swatch sw-secondary" />Secondary</span>
              {info.trackLabel && <span><span className="legend-swatch sw-path" />Movement path</span>}
            </div>
            <Segmented label="Demonstration figure" value={fig} onChange={(v) => update((s) => ({ ...s, profile: { ...s.profile, demoFigure: v } }))}
              options={[{ value: 'feminine', label: 'Figure A' }, { value: 'masculine', label: 'Figure B' }]} />
          </div>
          {info.trackLabel && <p className="small muted">{info.trackLabel}.{info.view === 'front' ? ' Shown from the front.' : ' Shown from the side.'}</p>}
          {!info.hold && (
            <div>
              <p className="field-label" style={{ marginBottom: 8 }}>Step by step</p>
              <div className="frames">
                {[0, 1].map((f) => <div key={f}><ExerciseDemo ex={ex} figure={fig} frame={f} compact /><p className="frame-cap">{f === 0 ? 'Start position' : 'End of the movement'}</p></div>)}
              </div>
            </div>
          )}
          <p className="small muted">Demonstrations show the general shape of a movement. Bodies differ, so they can’t guarantee perfect technique for everyone — if something hurts or feels wrong, stop and consider asking a qualified instructor.</p>
        </div>

        <div className="stack">
          <div className="row" style={{ gap: 6 }}>
            <Tag>{DIFF[ex.difficulty]}</Tag>{ex.equipment.map((e) => <Tag key={e} tone="slate">{e}</Tag>)}{ex.impact === 'low' && <Tag tone="sage">Low impact</Tag>}{ex.impact === 'high' && <Tag tone="amber">Higher impact</Tag>}
          </div>
          <Panel>
            <dl className="stack-sm">
              <div><dt className="field-label">Primary muscles</dt><dd style={{ margin: 0 }}>{ex.primary.join(', ')}</dd></div>
              <div><dt className="field-label">Also working</dt><dd style={{ margin: 0 }}>{ex.secondary.join(', ')}</dd></div>
            </dl>
          </Panel>
          {ex.setup && <Panel title="Setting up the equipment" id="setup"><p>{ex.setup}</p></Panel>}
          <Panel title="Starting position" id="start"><p>{ex.start}</p></Panel>
          <Panel title="How to do it" id="how">
            <ol className="steps-list">{ex.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            <p style={{ marginTop: 12 }}><strong>Breathing.</strong> {ex.breathing}</p>
          </Panel>
          <Panel title="Common mistakes" id="mistakes"><ul className="plain-list">{ex.mistakes.map((m, i) => <li key={i}>{m}</li>)}</ul></Panel>
          <div className="notice notice-amber"><strong>Safety.</strong> {ex.safety.join(' ')}</div>
          <div className="grid-2">
            <Panel title="Make it easier" id="easier"><ul className="plain-list">{ex.easier.map((m, i) => <li key={i}>{m}</li>)}</ul></Panel>
            <Panel title="Make it harder" id="harder"><ul className="plain-list">{ex.harder.map((m, i) => <li key={i}>{m}</li>)}</ul></Panel>
          </div>
          {alts.length > 0 && (
            <Panel title="Alternatives" id="alts">
              <div className="row">{alts.map((a) => <Button key={a!.id} size="sm" variant="quiet" to={`/library/${a!.id}`}>{a!.name}</Button>)}</div>
            </Panel>
          )}
          {state.profile.confidenceMode && (
            <Panel title="Gym words, explained" id="gloss">
              {GLOSSARY.slice(0, 6).map((g) => <Disclosure key={g.term} summary={g.term}><p>{g.plain}</p></Disclosure>)}
            </Panel>
          )}
          <Panel title="Your record" id="record">
            {history.length === 0 ? <p className="muted">You haven’t logged this exercise yet. When you do, your best results and trend appear here.</p> : (
              <div className="stack">
                {prs.map((p) => <p key={p.kind}><strong>Best:</strong> {p.kind === 'weight' ? `${toDisplayWeight(p.value, wu)} ${wu} × ${p.reps}` : p.kind === 'reps' ? `${p.value} reps` : p.kind === 'time' ? `${p.value} s` : `${toDisplayDist(p.value, du)} ${du}`} <span className="muted small">({fmtTs(p.at, { day: 'numeric', month: 'short' })})</span></p>)}
                {series.length > 1 && <LineChart title={`${ex.name} best per session`} data={series.slice(-12)} unit={unit} height={140} />}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
