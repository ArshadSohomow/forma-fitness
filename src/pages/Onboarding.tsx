import { useState } from 'react';
import type { Experience, Profile, SculptureBuild, SculptureStyle } from '../types';
import { useApp, seedSample, initialState } from '../store';
import { navigate } from '../router';
import { Sculpture } from '../components/Sculpture';
import { Button, Chips, Field, NumberInput, Toggle, Segmented, Icon } from '../components/ui';
import { DAY_SHORT } from '../logic/dates';
import { suggestTargets, fromDisplayWeight, toDisplayWeight } from '../logic/calc';
import { recommendPlan } from '../logic/recommend';
import { BUILT_IN_TEMPLATES } from '../data/templates';

const EXPERIENCE: { value: Experience; label: string; text: string }[] = [
  { value: 'new', label: 'Completely new', text: 'I haven’t really trained before. Explain things simply.' },
  { value: 'beginner', label: 'Beginner', text: 'I’ve tried a few workouts but I’m still learning the basics.' },
  { value: 'intermediate', label: 'Intermediate', text: 'I train fairly regularly and know most common exercises.' },
  { value: 'advanced', label: 'Advanced', text: 'I’ve trained consistently for years and follow structured programmes.' },
  { value: 'athlete', label: 'Highly experienced / athlete', text: 'I train for performance or competition.' },
];
const GOALS = [
  ['muscle', 'Build muscle'], ['strength', 'Increase strength'], ['cardio', 'Improve cardiovascular fitness'], ['health', 'Improve general health'],
  ['endurance', 'Improve endurance'], ['mobility', 'Mobility & flexibility'], ['fat', 'Lose body fat'], ['gain', 'Gain weight or muscle mass'],
  ['maintain', 'Maintain current fitness'], ['consistency', 'Build consistency'], ['activity', 'Train for an activity'],
].map(([value, label]) => ({ value, label }));
const ENVS = [
  ['gym', 'Commercial gym'], ['homegym', 'Home gym'], ['home', 'Home, no equipment'], ['outdoors', 'Outdoors'], ['mixed', 'A mix of places'],
].map(([value, label]) => ({ value, label }));
const EQUIP = ['Dumbbells', 'Barbell', 'Resistance band', 'Cable machine', 'Bench', 'Pull-up bar', 'Cardio machines', 'Bodyweight', 'Other'].map((v) => ({ value: v, label: v }));
const DIET = ['Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Kosher', 'Gluten-free', 'Dairy-free'].map((v) => ({ value: v, label: v }));
const APPROACH = [
  ['balanced', 'General balanced eating'], ['muscle', 'Supporting muscle growth'], ['strength', 'Supporting strength training'], ['maintain', 'Maintaining weight'],
  ['weight-goal', 'Working towards a weight goal'], ['protein', 'Increasing protein intake'], ['consistency', 'More consistent meals'],
].map(([value, label]) => ({ value, label }));

const STEPS = ['Welcome', 'Experience', 'Goals', 'Where you train', 'Schedule', 'Nutrition', 'Your sculpture', 'Your plan'];

export function Onboarding() {
  const { state, update, toast } = useApp();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>({ ...state.profile });
  const [nameError, setNameError] = useState<string | null>(null);
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));
  const plan = recommendPlan(p);

  const next = () => {
    if (step === 0 && !p.name.trim()) { setNameError('Add a name (or nickname) so we know what to call you.'); return; }
    setNameError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0 });
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    update((s) => ({
      ...s,
      profile: { ...p, name: p.name.trim(), onboarded: true, daysPerWeek: p.preferredDays.length || p.daysPerWeek },
      schedule: { weekly: plan.schedule },
      sculpture: { ...s.sculpture, lastChange: { kind: 'start', at: Date.now(), text: 'Your block of marble has arrived.' } },
    }));
    toast('Your plan is ready. Everything can be changed later in Profile.');
    navigate('/', { replace: true });
  };

  const sample = () => {
    update((s) => seedSample(initialState(), p.name.trim() || 'Alex'));
    toast('Sample data loaded — seven weeks of history to explore. Reset it any time in Profile.', 'info');
    navigate('/', { replace: true });
  };

  const skippable = step >= 2 && step <= 6;
  const unit = p.units.weight;

  return (
    <div className="onb">
      <aside className="onb-art" aria-hidden="true">
        <Sculpture style={p.sculptureStyle} build={p.sculptureBuild} stage={Math.min(5, Math.floor(step * 0.75))} weathering={0} repaired={false}
          vitality={Math.max(0, step - 2)} neglect={0} wrappers={0} milestones={{}} label="" numeral={false} />
      </aside>
      <main className="onb-main" id="main">
        <div className="onb-progress" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          {STEPS.map((_, i) => <span key={i} className={i <= step ? 'on' : ''} />)}
        </div>
        <p className="onb-step">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>

        {step === 0 && (
          <>
            <h1 className="onb-title">Every sculpture begins as rough stone.</h1>
            <p className="onb-lede">FORMA keeps track of your training and food, and turns your consistency into a marble figure that is slowly revealed over weeks and months. A few questions and you’re ready — about two minutes.</p>
            <div className="stack">
              <Field label="What should we call you?" error={nameError}>
                {(id, d) => <input id={id} aria-describedby={d} className="input" autoComplete="given-name" value={p.name} onChange={(e) => set({ name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && next()} />}
              </Field>
              <div className="notice">
                <strong>This is a demo.</strong> Your data is saved in this browser only — it isn’t sent to a server and won’t sync between devices yet. You can export it any time.
              </div>
              <p className="muted small">Just looking around? <button className="link-btn" onClick={sample}>Explore with sample data</button> — seven weeks of example history, so you can see the sculpture part-way through.</p>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="onb-title">How much training experience do you have?</h1>
            <p className="onb-lede">This shapes the explanations and starting suggestions. You can change it at any time.</p>
            <div className="choice-list" role="radiogroup" aria-label="Experience level">
              {EXPERIENCE.map((e) => (
                <button key={e.value} type="button" role="radio" aria-checked={p.experience === e.value} className={`choice ${p.experience === e.value ? 'on' : ''}`}
                  onClick={() => set({ experience: e.value, confidenceMode: e.value === 'new' || e.value === 'beginner' })}>
                  <span className="choice-radio" aria-hidden="true" />
                  <span><span className="choice-title">{e.label}</span><br /><span className="choice-text">{e.text}</span></span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="onb-title">What would you like to work towards?</h1>
            <p className="onb-lede">Choose as many as you like.</p>
            <div className="stack">
              <Chips multi label="Goals" options={GOALS} value={p.goals} onChange={(v: string[]) => set({ goals: v })} />
              <Field label="Something else? (optional)">
                {(id) => <input id={id} className="input" placeholder="e.g. Hike Snowdon in June" value={p.customGoal} onChange={(e) => set({ customGoal: e.target.value })} />}
              </Field>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="onb-title">Where will you usually train?</h1>
            <p className="onb-lede">We’ll only suggest exercises you can actually do with what you have.</p>
            <div className="stack">
              <Chips label="Training environment" options={ENVS} value={p.environment} onChange={(v: string) => set({ environment: v, equipment: v === 'home' || v === 'outdoors' ? ['Bodyweight'] : v === 'gym' ? ['Dumbbells', 'Barbell', 'Cable machine', 'Bench', 'Pull-up bar', 'Cardio machines', 'Bodyweight'] : p.equipment })} />
              <h2 className="panel-title" style={{ marginTop: 24 }}>Equipment available</h2>
              <Chips multi label="Equipment" options={EQUIP} value={p.equipment} onChange={(v: string[]) => set({ equipment: v })} />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="onb-title">When does training fit your week?</h1>
            <p className="onb-lede">Pick days that are realistic, not ideal. Two good sessions beat five planned ones that don’t happen.</p>
            <div className="stack">
              <div>
                <p className="field-label" id="days-l">Training days</p>
                <div className="chips" role="group" aria-labelledby="days-l" style={{ marginTop: 8 }}>
                  {DAY_SHORT.map((d, i) => {
                    const on = p.preferredDays.includes(i);
                    return <button key={d} type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => set({ preferredDays: on ? p.preferredDays.filter((x) => x !== i) : [...p.preferredDays, i].sort() })}>{d}</button>;
                  })}
                </div>
                <p className="field-hint" style={{ marginTop: 8 }}>{p.preferredDays.length} {p.preferredDays.length === 1 ? 'session' : 'sessions'} a week</p>
              </div>
              <div>
                <p className="field-label">Typical session length</p>
                <div style={{ marginTop: 8 }}><Segmented label="Session length" value={String(p.sessionMinutes)} onChange={(v) => set({ sessionMinutes: Number(v) })}
                  options={['20', '30', '45', '60', '75'].map((v) => ({ value: v, label: `${v} min` }))} /></div>
              </div>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h1 className="onb-title">Nutrition, if you’d like it.</h1>
            <p className="onb-lede">Tracking food is optional. Many people focus on protein alone — you can switch calorie tracking off entirely.</p>
            <div className="stack">
              <Chips label="Nutrition approach" options={APPROACH} value={p.nutritionApproach} onChange={(v: string) => set({ nutritionApproach: v })} />
              <Toggle label="Track calories" hint="Turn off to focus on protein and meals only." checked={p.calorieTracking} onChange={(v) => set({ calorieTracking: v })} />
              <div className="form-grid">
                <Field label={`Body weight (${unit}, optional)`} hint="Only used to suggest starting targets.">
                  {(id, d) => <NumberInput id={id} aria-describedby={d} value={toDisplayWeight(p.bodyWeight ?? undefined, unit)} onChange={(v) => set({ bodyWeight: v == null ? null : fromDisplayWeight(v, unit) })} />}
                </Field>
                {p.calorieTracking && (
                  <Field label="Daily calories (kcal)">{(id) => <NumberInput id={id} value={p.calorieTarget} step={50} onChange={(v) => set({ calorieTarget: v ?? 0 })} />}</Field>
                )}
                <Field label="Daily protein (g)">{(id) => <NumberInput id={id} value={p.proteinTarget} step={5} onChange={(v) => set({ proteinTarget: v ?? 0 })} />}</Field>
              </div>
              <div className="row">
                <Button size="sm" variant="quiet" icon="bolt" onClick={() => { const s = suggestTargets(p.bodyWeight, p.nutritionApproach); set({ calorieTarget: s.calories, proteinTarget: s.protein }); }}>Suggest starting targets</Button>
              </div>
              <p className="notice">Suggestions are rough estimates from body weight and your chosen approach, not personalised dietary advice. If you are pregnant, managing a medical condition, have a history of disordered eating, or are under 18, please speak to a GP or registered dietitian before setting targets.</p>
              <Field label="Dietary preferences (optional)">{() => <Chips multi label="Dietary preferences" options={DIET} value={p.dietPrefs} onChange={(v: string[]) => set({ dietPrefs: v })} />}</Field>
              <Field label="Allergies or foods you avoid (optional)">{(id) => <input id={id} className="input" placeholder="e.g. peanuts, shellfish" value={p.exclusions} onChange={(e) => set({ exclusions: e.target.value })} />}</Field>
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <h1 className="onb-title">Choose the figure in your marble.</h1>
            <p className="onb-lede">It represents your habits, not a body to aim for. Every figure starts as a rough block and is revealed the same way.</p>
            <div className="stack">
              <div className="style-pick" role="radiogroup" aria-label="Sculpture figure">
                {(['feminine', 'masculine', 'abstract'] as SculptureStyle[]).map((st) => (
                  <button key={st} type="button" role="radio" aria-checked={p.sculptureStyle === st} className={p.sculptureStyle === st ? 'on' : ''} onClick={() => set({ sculptureStyle: st })}>
                    <Sculpture style={st} build={p.sculptureBuild} stage={4} weathering={0} repaired={false} vitality={0} neglect={0} wrappers={0} milestones={{}} label="" numeral={false} detail="reduced" />
                    {st === 'feminine' ? 'Feminine' : st === 'masculine' ? 'Masculine' : 'Abstract'}
                  </button>
                ))}
              </div>
              <div>
                <p className="field-label">Silhouette</p>
                <div style={{ marginTop: 8 }}><Segmented label="Silhouette" value={p.sculptureBuild} onChange={(v: SculptureBuild) => set({ sculptureBuild: v })}
                  options={[{ value: 'slender', label: 'Slender' }, { value: 'balanced', label: 'Balanced' }, { value: 'broad', label: 'Broad' }]} /></div>
              </div>
              <div>
                <p className="field-label">Visual detail</p>
                <div style={{ marginTop: 8 }}><Segmented label="Visual detail" value={p.sculptureDetail} onChange={(v: 'full' | 'reduced') => set({ sculptureDetail: v })}
                  options={[{ value: 'full', label: 'Full texture & effects' }, { value: 'reduced', label: 'Simple (faster)' }]} /></div>
              </div>
              <Toggle label="Let nutrition patterns shape the garden" hint="Based on broad weekly patterns only — never a single meal. You can turn this off later." checked={p.nutritionEffects !== 'off'} onChange={(v) => set({ nutritionEffects: v ? 'gentle' : 'off' })} />
            </div>
          </>
        )}

        {step === 7 && (
          <>
            <h1 className="onb-title">Here’s a starting point, {p.name.trim() || 'friend'}.</h1>
            <p className="onb-lede">{plan.reason}</p>
            <div className="stack">
              {DAY_SHORT.map((d, i) => {
                const tid = plan.schedule[i];
                const t = BUILT_IN_TEMPLATES.find((x) => x.id === tid);
                return (
                  <div key={d} className="row-between" style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }}>
                    <span style={{ width: 48, fontWeight: 600 }}>{d}</span>
                    <span style={{ flex: 1 }} className={t ? '' : 'muted'}>{t ? t.name : 'Rest or free choice'}</span>
                    {t && <span className="muted small">{t.style}</span>}
                  </div>
                );
              })}
              <p className="muted small">Nothing is locked in. You can swap workouts, build your own, or change days from the Workouts page.</p>
            </div>
          </>
        )}

        <div className="onb-foot">
          <div className="row">
            {step > 0 && <Button variant="ghost" icon="chevronL" onClick={prev}>Back</Button>}
            {skippable && <Button variant="ghost" onClick={next}>Skip for now</Button>}
          </div>
          {step < STEPS.length - 1
            ? <Button variant="primary" size="lg" onClick={next}>Continue <Icon name="chevronR" size={18} /></Button>
            : <Button variant="primary" size="lg" onClick={finish}>Start with this plan</Button>}
        </div>
      </main>
    </div>
  );
}
