import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { query } from '../router';
import { Button, Field, IconButton, Meter, Modal, NumberInput, PageHeader, Panel, Ring, Segmented, Tag, Confirm, Empty, Icon } from '../components/ui';
import { FOODS, FOOD_SOURCE_NOTE, type RefFood } from '../data/foods';
import { addDays, fmtDate, today } from '../logic/dates';
import { dayFoods, entryTotals, sumNutrients, uid } from '../logic/calc';
import type { FoodEntry, Nutrients, SavedMeal } from '../types';

const r = Math.round;
const matchesDiet = (f: RefFood, prefs: string[]) => {
  if (prefs.includes('Vegan')) return f.tags.includes('vegan');
  if (prefs.includes('Vegetarian')) return f.tags.includes('vegetarian') || f.tags.includes('vegan');
  if (prefs.includes('Pescatarian')) return f.tags.some((t) => ['vegan', 'vegetarian', 'pescatarian'].includes(t));
  return true;
};

export function Nutrition() {
  const { state, update, toast } = useApp();
  const p = state.profile;
  const [date, setDate] = useState(today());
  const [adding, setAdding] = useState<string | null>(null);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [delMeal, setDelMeal] = useState<SavedMeal | null>(null);
  useEffect(() => { if (query().get('add') === '1') setAdding(defaultSlot(p.mealSlots)); }, []);
  const foods = dayFoods(state, date);
  const t = sumNutrients(foods);

  const removeEntry = (e: FoodEntry) => {
    update((s) => ({ ...s, foods: s.foods.filter((x) => x.id !== e.id) }));
    toast(`Removed ${e.name}`, 'ok', { label: 'Undo', run: () => update((s) => ({ ...s, foods: [...s.foods, e] })) });
  };
  const logMeal = (m: SavedMeal, slot: string, servings = 1) => {
    const entries: FoodEntry[] = m.items.map((it) => ({ id: uid(), date, meal: slot, name: it.name, serving: it.serving, qty: (it.qty * servings) / m.servings, per: it.per, source: it.source === 'manual' ? 'manual' : 'reference', createdAt: Date.now() }));
    update((s) => ({ ...s, foods: [...s.foods, ...entries] }));
    toast(`Logged ${m.name}`);
  };

  return (
    <div>
      <PageHeader title="Nutrition" lede={p.calorieTracking ? 'Calories, protein and meals for the day, measured against your own targets.' : 'Protein and meals for the day. Calorie tracking is off.'}
        actions={<div className="date-nav">
          <IconButton icon="chevronL" label="Previous day" onClick={() => setDate(addDays(date, -1))} />
          <strong>{date === today() ? 'Today' : fmtDate(date)}</strong>
          <IconButton icon="chevronR" label="Next day" onClick={() => setDate(addDays(date, 1))} disabled={date >= today()} />
          {date !== today() && <Button size="sm" variant="ghost" onClick={() => setDate(today())}>Today</Button>}
        </div>} />

      <div className="stack">
        <Panel>
          <div className="nut-top">
            <Ring value={t.protein / Math.max(1, p.proteinTarget)} size={132} stroke={9} label={`Protein ${r(t.protein)} of ${p.proteinTarget} grams`}>
              <div><div className="protein-big num">{r(t.protein)}<span className="small muted">g</span></div><div className="small muted">protein of {p.proteinTarget}</div></div>
            </Ring>
            <div>
              {p.calorieTracking && <Meter label="Calories" tone="slate" value={t.kcal} max={p.calorieTarget} detail={`${r(t.kcal)} of ${p.calorieTarget} kcal · ${t.kcal <= p.calorieTarget ? `${r(p.calorieTarget - t.kcal)} remaining` : `${r(t.kcal - p.calorieTarget)} over`}`} />}
              <Meter label="Carbohydrates" tone="taupe" value={t.carbs} max={p.carbTarget ?? 0} showOver={!!p.carbTarget} detail={`${r(t.carbs)}${p.carbTarget ? ` of ${p.carbTarget}` : ''} g`} />
              <Meter label="Fat" tone="taupe" value={t.fat} max={p.fatTarget ?? 0} showOver={!!p.fatTarget} detail={`${r(t.fat)}${p.fatTarget ? ` of ${p.fatTarget}` : ''} g`} />
              <Meter label="Fibre" tone="taupe" value={t.fibre ?? 0} max={p.fibreTarget ?? 0} showOver={!!p.fibreTarget} detail={`${r(t.fibre ?? 0)}${p.fibreTarget ? ` of ${p.fibreTarget}` : ''} g`} />
            </div>
          </div>
        </Panel>

        <Panel>
          {p.mealSlots.map((slot) => {
            const items = foods.filter((f) => f.meal === slot);
            const mt = sumNutrients(items);
            return (
              <section key={slot} className="meal-block" aria-labelledby={`m-${slot}`}>
                <div className="meal-head">
                  <h2 className="meal-name" id={`m-${slot}`}>{slot}</h2>
                  <span className="row" style={{ gap: 8 }}>
                    {items.length > 0 && <span className="muted small num">{p.calorieTracking ? `${r(mt.kcal)} kcal · ` : ''}{r(mt.protein)} g protein</span>}
                    <Button size="sm" variant="quiet" icon="plus" onClick={() => setAdding(slot)} aria-label={`Add food to ${slot}`}>Add</Button>
                  </span>
                </div>
                {items.length === 0 && <p className="muted small" style={{ padding: '10px 0' }}>Nothing logged.</p>}
                {items.map((f) => {
                  const ft = entryTotals(f);
                  return (
                    <div key={f.id} className="food-row">
                      <div>
                        <div className="food-name">{f.name}</div>
                        <div className="food-meta">{f.qty !== 1 ? `${+f.qty.toFixed(2)} × ` : ''}{f.serving} · {f.source === 'manual' ? 'entered by you' : f.source === 'meal' ? 'saved meal' : '≈ typical values'}{f.habitTag ? ` · ${f.habitTag}` : ''}</div>
                      </div>
                      <div className="food-nums num">{p.calorieTracking && <>{r(ft.kcal)} kcal<br /></>}<span className="muted">{r(ft.protein)} g P</span></div>
                      <div className="row" style={{ gap: 0 }}>
                        <IconButton icon="edit" label={`Edit ${f.name}`} onClick={() => setEditing(f)} />
                        <IconButton icon="trash" label={`Remove ${f.name}`} onClick={() => removeEntry(f)} />
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </Panel>

        <Panel title="Saved meals & recipes" id="meals">
          {state.meals.length === 0 ? <p className="muted">Save a meal you eat often and log it in one tap. Use “Build a meal” when adding food.</p> : state.meals.map((m) => {
            const per = sumNutrients(m.items);
            return (
              <div key={m.id} className="food-row">
                <div><div className="food-name">{m.name}</div><div className="food-meta num">{m.servings > 1 ? `Makes ${m.servings} servings · per serving ` : ''}{r(per.kcal / m.servings)} kcal · {r(per.protein / m.servings)} g protein</div></div>
                <Button size="sm" variant="quiet" onClick={() => logMeal(m, defaultSlot(p.mealSlots))}>Log 1 serving</Button>
                <IconButton icon="trash" label={`Delete ${m.name}`} onClick={() => setDelMeal(m)} />
              </div>
            );
          })}
        </Panel>
        <p className="muted small"><Icon name="info" size={16} /> {FOOD_SOURCE_NOTE} Targets are estimates, not medical or dietetic advice.</p>
      </div>

      <AddFood open={!!adding} slot={adding ?? 'Snacks'} date={date} onClose={() => setAdding(null)} onLogMeal={logMeal} />
      <EditEntry entry={editing} onClose={() => setEditing(null)} />
      <Confirm open={!!delMeal} onClose={() => setDelMeal(null)} danger title="Delete saved meal?" confirmLabel="Delete" text="Entries you’ve already logged stay in your diary."
        onConfirm={() => delMeal && update((s) => ({ ...s, meals: s.meals.filter((x) => x.id !== delMeal.id) }))} />
    </div>
  );
}

function defaultSlot(slots: string[]) {
  const h = new Date().getHours();
  const want = h < 11 ? 'Breakfast' : h < 15 ? 'Lunch' : h < 21 ? 'Dinner' : 'Snacks';
  return slots.includes(want) ? want : slots[0];
}

type Tab = 'search' | 'recent' | 'meals' | 'manual' | 'build';

function AddFood({ open, slot: slot0, date, onClose, onLogMeal }: { open: boolean; slot: string; date: string; onClose: () => void; onLogMeal: (m: SavedMeal, slot: string, servings?: number) => void }) {
  const { state, update, toast } = useApp();
  const p = state.profile;
  const [tab, setTab] = useState<Tab>('search');
  const [slot, setSlot] = useState(slot0);
  const [q, setQ] = useState('');
  const [prefsOnly, setPrefsOnly] = useState(true);
  const [pick, setPick] = useState<{ name: string; serving: string; per: Nutrients; source: FoodEntry['source'] } | null>(null);
  const [qty, setQty] = useState(1);
  const [habit, setHabit] = useState('');
  const [manual, setManual] = useState({ name: '', serving: '1 portion', kcal: undefined as number | undefined, protein: undefined as number | undefined, carbs: undefined as number | undefined, fat: undefined as number | undefined, fibre: undefined as number | undefined });
  const [mErr, setMErr] = useState<string | null>(null);
  const [build, setBuild] = useState<SavedMeal['items']>([]);
  const [buildName, setBuildName] = useState('');
  const [buildServ, setBuildServ] = useState(1);
  useEffect(() => { if (open) { setSlot(slot0); setPick(null); setQty(1); setQ(''); setHabit(''); } }, [open, slot0]);

  const results = useMemo(() => FOODS.filter((f) => (!q || f.name.toLowerCase().includes(q.toLowerCase())) && (!prefsOnly || matchesDiet(f, p.dietPrefs))).slice(0, 40), [q, prefsOnly, p.dietPrefs]);
  const recent = useMemo(() => {
    const seen = new Set<string>(); const out: FoodEntry[] = [];
    [...state.foods].sort((a, b) => b.createdAt - a.createdAt).forEach((f) => { if (!seen.has(f.name)) { seen.add(f.name); out.push(f); } });
    return out.slice(0, 20);
  }, [state.foods]);

  const addToDay = () => {
    if (!pick) return;
    if (!(qty > 0)) { toast('Enter a quantity above zero.', 'warn'); return; }
    if (tab === 'build') { setBuild((b) => [...b, { ...pick, qty }]); setPick(null); setQty(1); return; }
    const e: FoodEntry = { id: uid(), date, meal: slot, name: pick.name, serving: pick.serving, qty, per: pick.per, source: pick.source, habitTag: habit || undefined, createdAt: Date.now() };
    update((s) => ({ ...s, foods: [...s.foods, e] }));
    toast(`Added ${pick.name} to ${slot}`);
    setPick(null); setQty(1); setHabit('');
  };
  const manualPick = () => {
    if (!manual.name.trim()) { setMErr('Give the food a name.'); return; }
    if (manual.protein == null || (p.calorieTracking && manual.kcal == null)) { setMErr(p.calorieTracking ? 'Enter at least calories and protein — use 0 if none.' : 'Enter protein — use 0 if none.'); return; }
    setMErr(null);
    setPick({ name: manual.name.trim(), serving: manual.serving || '1 portion', source: 'manual', per: { kcal: manual.kcal ?? 0, protein: manual.protein ?? 0, carbs: manual.carbs ?? 0, fat: manual.fat ?? 0, fibre: manual.fibre ?? 0 } });
  };
  const saveBuild = (logToo: boolean) => {
    if (!buildName.trim() || build.length === 0) { toast('Name the meal and add at least one item.', 'warn'); return; }
    const m: SavedMeal = { id: uid(), name: buildName.trim(), servings: Math.max(1, buildServ), items: build, createdAt: Date.now() };
    update((s) => ({ ...s, meals: [m, ...s.meals] }));
    if (logToo) onLogMeal(m, slot); else toast(`Saved “${m.name}”`);
    setBuild([]); setBuildName(''); setBuildServ(1);
  };

  return (
    <Modal open={open} onClose={onClose} wide title={`Add to ${slot}`} footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <div className="stack">
        <div className="row-between">
          <Segmented label="How to add" value={tab} onChange={(v) => { setTab(v); setPick(null); }} options={[{ value: 'search', label: 'Search' }, { value: 'recent', label: 'Recent' }, { value: 'meals', label: 'Saved meals' }, { value: 'manual', label: 'Enter manually' }, { value: 'build', label: 'Build a meal' }]} />
          <Field label="Meal">{(id) => <select id={id} className="input" style={{ minHeight: 40 }} value={slot} onChange={(e) => setSlot(e.target.value)}>{p.mealSlots.map((m) => <option key={m}>{m}</option>)}</select>}</Field>
        </div>

        {(tab === 'search' || tab === 'build') && !pick && (
          <div>
            <Field label={tab === 'build' ? 'Find ingredients' : 'Search foods'}>{(id) => <input id={id} type="search" className="input" placeholder="e.g. oats, chicken, lentils" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />}</Field>
            {p.dietPrefs.length > 0 && <label className="row small" style={{ marginTop: 8 }}><input type="checkbox" checked={prefsOnly} onChange={(e) => setPrefsOnly(e.target.checked)} /> Only show foods matching {p.dietPrefs.join(', ').toLowerCase()}</label>}
            <div className="search-results" role="list">
              {results.map((f) => (
                <button key={f.name} role="listitem" onClick={() => setPick({ name: f.name, serving: f.serving, per: f.per, source: 'reference' })}>
                  <span><strong>{f.name}</strong><br /><span className="muted small">{f.serving}</span></span>
                  <span className="muted small num" style={{ textAlign: 'right' }}>≈ {f.per.kcal} kcal<br />{f.per.protein} g P</span>
                </button>
              ))}
              {results.length === 0 && <p className="muted" style={{ padding: 16 }}>Not in the reference list. <button className="link-btn" onClick={() => { setTab('manual'); setManual((m) => ({ ...m, name: q })); }}>Enter it manually</button></p>}
            </div>
          </div>
        )}

        {tab === 'recent' && !pick && (
          recent.length === 0 ? <Empty title="Nothing recent yet" text="Foods you log appear here for quick re-use." /> :
            <div className="search-results" role="list">{recent.map((f) => (
              <button key={f.id} role="listitem" onClick={() => setPick({ name: f.name, serving: f.serving, per: f.per, source: f.source })}>
                <span><strong>{f.name}</strong><br /><span className="muted small">{f.serving}</span></span><span className="muted small num">{r(f.per.kcal)} kcal · {r(f.per.protein)} g P</span>
              </button>))}
            </div>
        )}

        {tab === 'meals' && (state.meals.length === 0 ? <Empty title="No saved meals" text="Use “Build a meal” to combine foods you often eat together." /> :
          <div className="search-results" role="list">{state.meals.map((m) => {
            const n = sumNutrients(m.items);
            return <button key={m.id} role="listitem" onClick={() => onLogMeal(m, slot)}><span><strong>{m.name}</strong><br /><span className="muted small">{m.items.length} items{m.servings > 1 ? ` · 1 of ${m.servings} servings` : ''}</span></span><span className="muted small num">{r(n.kcal / m.servings)} kcal · {r(n.protein / m.servings)} g P</span></button>;
          })}</div>)}

        {tab === 'manual' && !pick && (
          <div className="stack-sm">
            <div className="form-grid">
              <Field label="Food name" error={mErr}>{(id, d) => <input id={id} aria-describedby={d} className="input" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />}</Field>
              <Field label="Serving">{(id) => <input id={id} className="input" value={manual.serving} onChange={(e) => setManual({ ...manual, serving: e.target.value })} />}</Field>
            </div>
            <div className="form-grid">
              {(['kcal', 'protein', 'carbs', 'fat', 'fibre'] as const).map((k) => (
                <Field key={k} label={k === 'kcal' ? 'Calories (kcal)' : `${k[0].toUpperCase()}${k.slice(1)} (g)`}>{(id) => <NumberInput id={id} step={k === 'kcal' ? 10 : 1} value={manual[k]} onChange={(v) => setManual({ ...manual, [k]: v })} />}</Field>
              ))}
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="primary" onClick={manualPick}>Continue</Button></div>
          </div>
        )}

        {pick && (
          <div className="panel" style={{ background: 'var(--surface-2)' }}>
            <div className="row-between"><strong>{pick.name}</strong><button className="link-btn small" onClick={() => setPick(null)}>Change</button></div>
            <p className="muted small">{pick.serving} · {pick.source === 'manual' ? 'values entered by you' : 'approximate typical values'}</p>
            <div className="form-grid" style={{ marginTop: 12, alignItems: 'end' }}>
              <Field label="Servings">{(id) => <NumberInput id={id} step={0.25} min={0} value={qty} onChange={(v) => setQty(v ?? 0)} />}</Field>
              <div className="num small">{p.calorieTracking && <>{r(pick.per.kcal * qty)} kcal · </>}{r(pick.per.protein * qty)} g protein · {r(pick.per.carbs * qty)} g carbs · {r(pick.per.fat * qty)} g fat</div>
            </div>
            {tab !== 'build' && p.wrappersEnabled && p.habitTags.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Field label="Part of a habit you’re working on? (optional)" hint="Only you decide what counts. Used for the optional garden effect, never to judge a food.">{(id) => (
                  <select id={id} className="input" value={habit} onChange={(e) => setHabit(e.target.value)}>
                    <option value="">No</option>{p.habitTags.map((h) => <option key={h}>{h}</option>)}
                  </select>)}</Field>
              </div>
            )}
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}><Button variant="primary" icon="plus" onClick={addToDay}>{tab === 'build' ? 'Add to meal' : `Add to ${slot}`}</Button></div>
          </div>
        )}

        {tab === 'build' && (
          <div className="panel">
            <h3 className="panel-title" style={{ marginBottom: 8 }}>Meal builder</h3>
            {build.length === 0 ? <p className="muted small">Search above and add ingredients. Save it to log in one tap next time.</p> :
              build.map((b, i) => (
                <div key={i} className="food-row"><div><div className="food-name">{b.name}</div><div className="food-meta">{b.qty} × {b.serving}</div></div>
                  <div className="food-nums num">{r(b.per.kcal * b.qty)} kcal</div><IconButton icon="trash" label={`Remove ${b.name}`} onClick={() => setBuild(build.filter((_, k) => k !== i))} /></div>
              ))}
            {build.length > 0 && (
              <>
                <p className="small num" style={{ margin: '10px 0' }}>Total: {r(sumNutrients(build).kcal)} kcal · {r(sumNutrients(build).protein)} g protein{buildServ > 1 ? ` — per serving ${r(sumNutrients(build).kcal / buildServ)} kcal, ${r(sumNutrients(build).protein / buildServ)} g protein` : ''}</p>
                <div className="form-grid">
                  <Field label="Meal name">{(id) => <input id={id} className="input" value={buildName} onChange={(e) => setBuildName(e.target.value)} placeholder="e.g. Chicken rice bowl" />}</Field>
                  <Field label="Number of servings it makes">{(id) => <NumberInput id={id} min={1} value={buildServ} onChange={(v) => setBuildServ(v ?? 1)} />}</Field>
                </div>
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}><Button onClick={() => saveBuild(false)}>Save meal</Button><Button variant="primary" onClick={() => saveBuild(true)}>Save and log 1 serving</Button></div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function EditEntry({ entry, onClose }: { entry: FoodEntry | null; onClose: () => void }) {
  const { state, update, toast } = useApp();
  const [d, setD] = useState<FoodEntry | null>(entry);
  useEffect(() => setD(entry), [entry]);
  if (!entry || !d) return null;
  const save = () => {
    if (!(d.qty > 0)) { toast('Quantity must be above zero. To remove the entry, use the bin icon.', 'warn'); return; }
    update((s) => ({ ...s, foods: s.foods.map((f) => (f.id === d.id ? { ...d, source: d.source === 'reference' && JSON.stringify(d.per) !== JSON.stringify(entry.per) ? 'manual' : d.source } : f)) }));
    toast('Entry updated'); onClose();
  };
  return (
    <Modal open={!!entry} onClose={onClose} title={`Edit ${entry.name}`} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save changes</Button></>}>
      <div className="stack">
        <div className="form-grid">
          <Field label="Servings" hint={entry.serving}>{(id, h) => <NumberInput id={id} aria-describedby={h} step={0.25} value={d.qty} onChange={(v) => setD({ ...d, qty: v ?? 0 })} />}</Field>
          <Field label="Meal">{(id) => <select id={id} className="input" value={d.meal} onChange={(e) => setD({ ...d, meal: e.target.value })}>{state.profile.mealSlots.map((m) => <option key={m}>{m}</option>)}</select>}</Field>
        </div>
        <p className="field-label">Values per serving</p>
        <div className="form-grid">
          {(['kcal', 'protein', 'carbs', 'fat'] as const).map((k) => (
            <Field key={k} label={k === 'kcal' ? 'kcal' : `${k} (g)`}>{(id) => <NumberInput id={id} value={d.per[k]} onChange={(v) => setD({ ...d, per: { ...d.per, [k]: v ?? 0 } })} />}</Field>
          ))}
        </div>
        <p className="muted small">If you change the values, the entry is marked as entered by you.</p>
        <Tag>{r(entryTotals(d).kcal)} kcal · {r(entryTotals(d).protein)} g protein in total</Tag>
      </div>
    </Modal>
  );
}
