import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { query } from '../router';
import { Button, Field, PageHeader, Tag, Disclosure } from '../components/ui';
import { ExerciseDemo } from '../components/ExerciseDemo';
import { EQUIPMENT, EXERCISES, GLOSSARY, MUSCLES, PATTERNS } from '../data/exercises';

const DIFF = ['', 'Beginner-friendly', 'Some experience', 'More advanced'];
const TYPES = [['strength', 'Strength'], ['bodyweight', 'Bodyweight'], ['cardio', 'Cardio'], ['core', 'Core'], ['mobility', 'Mobility']];
const GOALS = [['strength', 'Strength'], ['muscle', 'Muscle'], ['cardio', 'Cardio'], ['endurance', 'Endurance'], ['mobility', 'Mobility'], ['health', 'General health']];

export function Library() {
  const { state } = useApp();
  const init = query();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equip, setEquip] = useState('');
  const [env, setEnv] = useState('');
  const [type, setType] = useState('');
  const [level, setLevel] = useState(init.get('level') ?? '');
  const [pattern, setPattern] = useState('');
  const [time, setTime] = useState('');
  const [goal, setGoal] = useState('');
  const list = useMemo(() => EXERCISES.filter((e) =>
    (!q || `${e.name} ${e.short} ${e.primary.join(' ')}`.toLowerCase().includes(q.toLowerCase())) &&
    (!muscle || e.primary.includes(muscle) || e.secondary.includes(muscle)) && (!equip || e.equipment.includes(equip)) &&
    (!env || e.environments.includes(env as any)) && (!type || e.type === type) && (!level || e.difficulty === Number(level)) &&
    (!pattern || e.pattern === pattern) && (!time || e.minutes <= Number(time)) && (!goal || e.goals.includes(goal))), [q, muscle, equip, env, type, level, pattern, time, goal]);
  const active = [muscle, equip, env, type, level, pattern, time, goal].filter(Boolean).length;
  const clear = () => { setMuscle(''); setEquip(''); setEnv(''); setType(''); setLevel(''); setPattern(''); setTime(''); setGoal(''); setQ(''); };
  const sel = (label: string, v: string, set: (v: string) => void, opts: (string | string[])[]) => (
    <Field label={label}>{(id) => (
      <select id={id} className="input" value={v} onChange={(e) => set(e.target.value)}>
        <option value="">Any</option>
        {opts.map((o) => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>)}
      </select>)}</Field>
  );

  return (
    <div>
      <PageHeader title="Exercise library" lede="Learn any movement privately, at your own pace. Each guide shows the movement, the muscles involved and how to make it easier or harder." />
      <div className="lib-tools">
        <Field label="Search">{(id) => <input id={id} type="search" className="input" placeholder="e.g. squat, back, band" value={q} onChange={(e) => setQ(e.target.value)} />}</Field>
        {sel('Muscle group', muscle, setMuscle, MUSCLES)}
        {sel('Equipment', equip, setEquip, EQUIPMENT)}
        {sel('Difficulty', level, setLevel, [['1', DIFF[1]], ['2', DIFF[2]], ['3', DIFF[3]]])}
      </div>
      <Disclosure summary={`More filters${active > 0 ? ` (${active} active)` : ''}`}>
        <div className="lib-tools" style={{ marginBottom: 0 }}>
          {sel('Where', env, setEnv, [['gym', 'Gym'], ['home', 'Home'], ['outdoors', 'Outdoors']])}
          {sel('Type', type, setType, TYPES)}
          {sel('Movement', pattern, setPattern, PATTERNS)}
          {sel('Time available', time, setTime, [['5', '5 minutes or less'], ['10', '10 minutes or less'], ['15', '15 minutes or less']])}
          {sel('Goal', goal, setGoal, GOALS)}
        </div>
      </Disclosure>
      <div className="row-between" style={{ margin: '20px 0 16px' }}>
        <p className="muted small" aria-live="polite">{list.length} {list.length === 1 ? 'exercise' : 'exercises'}</p>
        {(active > 0 || q) && <Button size="sm" variant="ghost" onClick={clear}>Clear filters</Button>}
      </div>
      {list.length === 0 && <div className="empty"><p className="empty-title">Nothing matches those filters</p><p className="empty-text">Try removing a filter or searching for a muscle instead.</p><Button onClick={clear}>Clear filters</Button></div>}
      <div className="grid-3">
        {list.map((e) => (
          <a key={e.id} href={`#/library/${e.id}`} className="ex-card">
            <ExerciseDemo ex={e} figure={state.profile.demoFigure} compact frame={0} />
            <div className="ex-card-body">
              <span className="ex-card-name">{e.name}</span>
              <span className="muted small">{e.primary.join(', ')}</span>
              <span className="row" style={{ gap: 6 }}><Tag>{DIFF[e.difficulty]}</Tag><Tag tone="slate">{e.equipment.filter((x) => x !== 'Mat')[0]}</Tag></span>
            </div>
          </a>
        ))}
      </div>

      <section style={{ marginTop: 56 }} aria-labelledby="gloss-h">
        <h2 className="section-title" id="gloss-h">Gym words, in plain English</h2>
        <div style={{ maxWidth: 720 }}>
          {GLOSSARY.map((g) => <Disclosure key={g.term} summary={g.term}><p>{g.plain}</p></Disclosure>)}
        </div>
      </section>
    </div>
  );
}
