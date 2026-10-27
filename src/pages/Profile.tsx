import { useEffect, useRef, useState } from 'react';
import { useApp, initialState, seedSample, STORAGE_KEY } from '../store';
import { navigate } from '../router';
import { Button, Chips, Confirm, Field, NumberInput, PageHeader, Panel, Segmented, Toggle } from '../components/ui';
import type { Experience, Profile as P, SculptureStyle, SculptureBuild } from '../types';
import { DAY_SHORT, today } from '../logic/dates';
import { fromDisplayWeight, toDisplayWeight, suggestTargets } from '../logic/calc';

const EXP: { value: Experience; label: string }[] = [{ value: 'new', label: 'Completely new' }, { value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }, { value: 'athlete', label: 'Athlete' }];
const GOALS = [['muscle', 'Build muscle'], ['strength', 'Strength'], ['cardio', 'Cardio fitness'], ['health', 'General health'], ['endurance', 'Endurance'], ['mobility', 'Mobility'], ['fat', 'Lose body fat'], ['gain', 'Gain mass'], ['maintain', 'Maintain'], ['consistency', 'Consistency'], ['activity', 'An activity']].map(([value, label]) => ({ value, label }));
const EQUIP = ['Dumbbells', 'Barbell', 'Resistance band', 'Cable machine', 'Bench', 'Pull-up bar', 'Cardio machines', 'Bodyweight', 'Other'].map((v) => ({ value: v, label: v }));
const DIET = ['Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Kosher', 'Gluten-free', 'Dairy-free'].map((v) => ({ value: v, label: v }));

export function Profile() {
  const { state, update, toast } = useApp();
  const p = state.profile;
  const set = (patch: Partial<P>) => update((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSample, setConfirmSample] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (location.hash.includes('#sculpture')) document.getElementById('sculpture')?.scrollIntoView(); }, []);
  const wu = p.units.weight;

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `forma-export-${today()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Export downloaded');
  };
  const importData = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (data?.version !== 1 || !data.profile) throw new Error('bad');
      update(() => ({ ...initialState(), ...data }));
      toast('Data imported');
    } catch { toast('That file isn’t a FORMA export. Nothing was changed.', 'error'); }
  };

  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader title="Profile & settings" lede="Change anything here without losing your workout history. Changes save as you make them." />
      <div className="stack">
        <Panel title="You" id="you">
          <div className="form-grid">
            <Field label="Name">{(id) => <input id={id} className="input" value={p.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
            <Field label="Experience">{(id) => <select id={id} className="input" value={p.experience} onChange={(e) => set({ experience: e.target.value as Experience })}>{EXP.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>}</Field>
          </div>
          <div style={{ marginTop: 16 }}><p className="field-label" style={{ marginBottom: 8 }}>Goals</p><Chips multi label="Goals" options={GOALS} value={p.goals} onChange={(v: string[]) => set({ goals: v })} /></div>
          <div style={{ marginTop: 12 }}><Field label="Personal goal">{(id) => <input id={id} className="input" value={p.customGoal} onChange={(e) => set({ customGoal: e.target.value })} />}</Field></div>
        </Panel>

        <Panel title="Training" id="training">
          <p className="field-label" style={{ marginBottom: 8 }}>Equipment you have</p>
          <Chips multi label="Equipment" options={EQUIP} value={p.equipment} onChange={(v: string[]) => set({ equipment: v })} />
          <div className="form-grid" style={{ marginTop: 16 }}>
            <Field label="Sessions per week (target)">{(id) => <NumberInput id={id} min={1} max={7} value={p.daysPerWeek} onChange={(v) => set({ daysPerWeek: Math.min(7, Math.max(1, v ?? 1)) })} />}</Field>
            <Field label="Typical session (minutes)">{(id) => <NumberInput id={id} step={5} value={p.sessionMinutes} onChange={(v) => set({ sessionMinutes: v ?? 30 })} />}</Field>
          </div>
          <p className="field-hint" style={{ marginTop: 8 }}>Which days you train is set on the <a href="#/workouts">Workouts</a> page.</p>
          <div style={{ marginTop: 8 }}>
            <Toggle label="Gym confidence mode" hint="Plain-language explanations and gym terms explained during workouts." checked={p.confidenceMode} onChange={(v) => set({ confidenceMode: v })} />
          </div>
        </Panel>

        <Panel title="Nutrition" id="nutrition">
          <Toggle label="Track calories" hint="Turn off to focus on protein and meals." checked={p.calorieTracking} onChange={(v) => set({ calorieTracking: v })} />
          <div className="form-grid" style={{ marginTop: 12 }}>
            {p.calorieTracking && <Field label="Calories (kcal)">{(id) => <NumberInput id={id} step={50} value={p.calorieTarget} onChange={(v) => set({ calorieTarget: v ?? 0 })} />}</Field>}
            <Field label="Protein (g)">{(id) => <NumberInput id={id} step={5} value={p.proteinTarget} onChange={(v) => set({ proteinTarget: v ?? 0 })} />}</Field>
            <Field label="Carbs (g, optional)">{(id) => <NumberInput id={id} step={5} value={p.carbTarget} onChange={(v) => set({ carbTarget: v ?? null })} />}</Field>
            <Field label="Fat (g, optional)">{(id) => <NumberInput id={id} step={5} value={p.fatTarget} onChange={(v) => set({ fatTarget: v ?? null })} />}</Field>
            <Field label="Fibre (g, optional)">{(id) => <NumberInput id={id} value={p.fibreTarget} onChange={(v) => set({ fibreTarget: v ?? null })} />}</Field>
            <Field label={`Body weight (${wu}, optional)`}>{(id) => <NumberInput id={id} step={0.1} value={toDisplayWeight(p.bodyWeight ?? undefined, wu)} onChange={(v) => set({ bodyWeight: v == null ? null : fromDisplayWeight(v, wu) })} />}</Field>
          </div>
          <Button size="sm" variant="quiet" style={{ marginTop: 12 }} onClick={() => { const s = suggestTargets(p.bodyWeight, p.nutritionApproach); set({ calorieTarget: s.calories, proteinTarget: s.protein }); toast('Suggested targets applied — they are estimates, adjust freely.'); }}>Suggest targets from body weight</Button>
          <div style={{ marginTop: 16 }}><p className="field-label" style={{ marginBottom: 8 }}>Dietary preferences</p><Chips multi label="Dietary preferences" options={DIET} value={p.dietPrefs} onChange={(v: string[]) => set({ dietPrefs: v })} /></div>
          <div style={{ marginTop: 12 }}><Field label="Allergies or foods you avoid">{(id) => <input id={id} className="input" value={p.exclusions} onChange={(e) => set({ exclusions: e.target.value })} />}</Field></div>
          <div style={{ marginTop: 16 }}>
            <p className="field-label">Meal categories</p>
            <div className="chips" style={{ marginTop: 8 }}>{p.mealSlots.map((m) => <span key={m} className="chip">{m}{p.mealSlots.length > 1 && <button className="link-btn" aria-label={`Remove ${m}`} onClick={() => set({ mealSlots: p.mealSlots.filter((x) => x !== m) })}>×</button>}</span>)}</div>
            <div className="row" style={{ marginTop: 8 }}><input className="input" style={{ maxWidth: 240 }} aria-label="New meal category" placeholder="e.g. Pre-workout" value={newSlot} onChange={(e) => setNewSlot(e.target.value)} /><Button size="sm" onClick={() => { if (newSlot.trim() && !p.mealSlots.includes(newSlot.trim())) { set({ mealSlots: [...p.mealSlots, newSlot.trim()] }); setNewSlot(''); } }}>Add</Button></div>
          </div>
          <p className="notice" style={{ marginTop: 16 }}>Targets are general estimates, not medical or dietetic advice. Speak to a GP or registered dietitian if you have specific health needs.</p>
        </Panel>

        <Panel title="Sculpture" id="sculpture">
          <div className="stack">
            <div><p className="field-label" style={{ marginBottom: 8 }}>Figure</p><Segmented label="Figure" value={p.sculptureStyle} onChange={(v: SculptureStyle) => set({ sculptureStyle: v })} options={[{ value: 'feminine', label: 'Feminine' }, { value: 'masculine', label: 'Masculine' }, { value: 'abstract', label: 'Abstract' }]} /></div>
            <div><p className="field-label" style={{ marginBottom: 8 }}>Silhouette</p><Segmented label="Silhouette" value={p.sculptureBuild} onChange={(v: SculptureBuild) => set({ sculptureBuild: v })} options={[{ value: 'slender', label: 'Slender' }, { value: 'balanced', label: 'Balanced' }, { value: 'broad', label: 'Broad' }]} /></div>
            <div><p className="field-label" style={{ marginBottom: 8 }}>Visual detail</p><Segmented label="Visual detail" value={p.sculptureDetail} onChange={(v: 'full' | 'reduced') => set({ sculptureDetail: v })} options={[{ value: 'full', label: 'Full' }, { value: 'reduced', label: 'Simple' }]} /></div>
            <div><p className="field-label" style={{ marginBottom: 8 }}>Nutrition effects on the garden</p><Segmented label="Nutrition effects" value={p.nutritionEffects} onChange={(v: P['nutritionEffects']) => set({ nutritionEffects: v })} options={[{ value: 'off', label: 'Off' }, { value: 'gentle', label: 'Gentle' }, { value: 'standard', label: 'Standard' }]} />
              <p className="field-hint" style={{ marginTop: 6 }}>Gentle needs a stronger pattern before anything changes. Effects are based on weekly patterns, never a single meal.</p></div>
            <Toggle label="Show wrappers for habits I choose" hint="Optional. Wrappers only appear when you tag entries with a habit you’ve named below, repeatedly within a week. No food triggers them on its own." checked={p.wrappersEnabled} onChange={(v) => set({ wrappersEnabled: v })} />
            {p.wrappersEnabled && (
              <div>
                <p className="field-label">Habits I’m working on</p>
                <div className="chips" style={{ marginTop: 8 }}>{p.habitTags.map((h) => <span key={h} className="chip">{h}<button className="link-btn" aria-label={`Remove ${h}`} onClick={() => set({ habitTags: p.habitTags.filter((x) => x !== h) })}>×</button></span>)}</div>
                <div className="row" style={{ marginTop: 8 }}><input className="input" style={{ maxWidth: 280 }} aria-label="New habit" placeholder="e.g. Late-night snacking" value={newTag} onChange={(e) => setNewTag(e.target.value)} /><Button size="sm" onClick={() => { if (newTag.trim()) { set({ habitTags: [...new Set([...p.habitTags, newTag.trim()])] }); setNewTag(''); } }}>Add</Button></div>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Display & accessibility" id="display">
          <div className="stack">
            <div><p className="field-label" style={{ marginBottom: 8 }}>Theme</p><Segmented label="Theme" value={p.theme} onChange={(v: P['theme']) => set({ theme: v })} options={[{ value: 'system', label: 'Match device' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} /></div>
            <div><p className="field-label" style={{ marginBottom: 8 }}>Text size</p><Segmented label="Text size" value={String(p.textScale)} onChange={(v) => set({ textScale: Number(v) })} options={[{ value: '1', label: 'Standard' }, { value: '1.15', label: 'Large' }, { value: '1.3', label: 'Larger' }]} /></div>
            <div className="form-grid">
              <div><p className="field-label" style={{ marginBottom: 8 }}>Weight units</p><Segmented label="Weight units" value={p.units.weight} onChange={(v: 'kg' | 'lb') => set({ units: { ...p.units, weight: v } })} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} /></div>
              <div><p className="field-label" style={{ marginBottom: 8 }}>Distance units</p><Segmented label="Distance units" value={p.units.distance} onChange={(v: 'km' | 'mi') => set({ units: { ...p.units, distance: v } })} options={[{ value: 'km', label: 'km' }, { value: 'mi', label: 'miles' }]} /></div>
            </div>
            <Toggle label="Reduce motion" hint="Stops animations, including the sculpture and exercise demos. Your device setting is respected automatically." checked={p.motion === 'reduced'} onChange={(v) => set({ motion: v ? 'reduced' : 'system' })} />
            <Toggle label="Timer sounds" checked={p.sound} onChange={(v) => set({ sound: v })} />
            <Toggle label="Motivational messages and tips" checked={p.motivation} onChange={(v) => set({ motivation: v })} />
            <Toggle label="Reminders" hint="Not available in this demo — reminders need an account and notification service. The setting is saved for later." checked={p.notifications} onChange={(v) => set({ notifications: v })} />
          </div>
        </Panel>

        <Panel title="Your data" id="data">
          <div className="stack-sm">
            <p className="small">Everything is stored in this browser on this device ({Math.round((localStorage.getItem(STORAGE_KEY)?.length ?? 0) / 1024)} KB). Nothing is sent to a server. Clearing your browser data will remove it, so export a copy now and then.</p>
            <div className="row" style={{ marginTop: 8 }}>
              <Button icon="download" onClick={exportData}>Export my data</Button>
              <Button onClick={() => fileRef.current?.click()}>Import a backup</Button>
              <input ref={fileRef} type="file" accept="application/json" className="sr-only" aria-label="Import backup file" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
            </div>
            <hr className="divider" />
            <div className="row">
              <Button variant="ghost" onClick={() => setConfirmSample(true)}>Load sample data</Button>
              <Button variant="danger" onClick={() => setConfirmReset(true)}>Delete all my data</Button>
            </div>
          </div>
        </Panel>
        <p className="muted small">FORMA demo · data stays on this device · not medical advice</p>
      </div>

      <Confirm open={confirmReset} onClose={() => setConfirmReset(false)} danger title="Delete all your data?" confirmLabel="Delete everything"
        text="Your profile, workouts, history, food log and sculpture will be permanently removed from this browser. Export first if you might want it back."
        onConfirm={() => { try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } update(() => initialState()); navigate('/welcome', { replace: true }); }} />
      <Confirm open={confirmSample} onClose={() => setConfirmSample(false)} title="Replace with sample data?" confirmLabel="Load sample data"
        text="Seven weeks of example history will replace what’s here now. Export first if you want to keep your current data."
        onConfirm={() => { update(() => seedSample(initialState(), p.name || 'Alex')); toast('Sample data loaded', 'info'); navigate('/'); }} />
    </div>
  );
}
export const _d = DAY_SHORT;
