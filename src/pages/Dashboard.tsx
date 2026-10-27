import { useMemo, useState } from 'react';
import { useApp, startSession } from '../store';
import { navigate } from '../router';
import { Button, Icon, Meter, Panel, Ring, Tag, IconButton } from '../components/ui';
import { MySculpture } from '../components/MySculpture';
import { addDays, DAY_SHORT, fmtDate, today, weekday, weekDays, fmtDuration, parseYmd } from '../logic/dates';
import { daysSinceLastSession, dayFoods, estimateMinutes, finishedSessions, nextStage, OUTCOME_COPY, sessionDuration, stageIndex, STAGES, sumNutrients, templateById, thisWeekId, weekStats } from '../logic/calc';
import { GENERAL, NEW_USER, ON_TRACK, RETURNING, TIPS, pick } from '../data/messages';
import { progressionSuggestions } from '../logic/recommend';

export function Dashboard() {
  const { state, update } = useApp();
  const p = state.profile;
  const d = today();
  const wk = thisWeekId();
  const stats = weekStats(state, wk);
  const tid = state.schedule.weekly[weekday(d)];
  const planned = templateById(state, tid);
  const doneToday = stats.perDay.find((x) => x.date === d)?.sessions ?? [];
  const sc = state.sculpture;
  const stage = stageIndex(sc.refinement);
  const nxt = nextStage(sc.refinement);
  const totals = sumNutrients(dayFoods(state, d));
  const gap = daysSinceLastSession(state);
  const sessions = finishedSessions(state);
  const lastWeek = addDays(wk, -7);
  const lastWeekUnreviewed = !state.reviews.some((r) => r.weekId === lastWeek) && state.createdAt < parseYmd(wk).getTime();
  const reviewThisWeek = weekday(d) >= 5 && !state.reviews.some((r) => r.weekId === wk);
  const suggestions = progressionSuggestions(state).filter((s) => !state.dismissedTips.includes(s.id));
  const tip = p.motivation ? TIPS.find((t) => !state.dismissedTips.includes(t.id)) : undefined;

  const message = useMemo(() => {
    const seed = new Date().getDate();
    if (sessions.length === 0) return pick(NEW_USER, seed);
    if (gap != null && gap >= 10) return pick(RETURNING, seed);
    if (stats.completed >= Math.ceil(stats.planned / 2)) return pick(ON_TRACK, seed);
    return pick(GENERAL, seed);
  }, [sessions.length, gap, stats.completed, stats.planned]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const [showAll, setShowAll] = useState(false);

  const start = (templateId: string) => {
    const t = templateById(state, templateId);
    if (!t) return;
    if (state.activeSessionId) { navigate('/workout/active'); return; }
    update((s) => startSession(s, t));
    navigate('/workout/active');
  };
  const dismiss = (id: string) => update((s) => ({ ...s, dismissedTips: [...s.dismissedTips, id] }));

  const sessionPct = Math.min(1, (stats.completed + stats.partial * 0.5) / stats.planned);

  return (
    <div className="dash">
      <header className="dash-greeting">
        <div>
          <p className="dash-date">{fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="dash-hello">{greet}, {p.name}.</h1>
          {p.motivation && <p className="dash-quote">{message}</p>}
        </div>
      </header>

      {/* Sculpture: the principal visual */}
      <aside className="niche-card" aria-labelledby="sc-h">
        <a href="#/sculpture" aria-label="Open my sculpture"><MySculpture /></a>
        <div className="niche-meta">
          <div className="row-between">
            <h2 className="niche-stage" id="sc-h">{STAGES[stage].name}</h2>
            {sc.weathering > 0 ? <Tag tone="amber">Weathered</Tag> : sc.repairs > 0 && sc.lastChange?.kind === 'restored' ? <Tag tone="sage">Restored</Tag> : null}
          </div>
          <p className="niche-note">{sc.lastChange && sc.lastChange.kind !== 'start' ? `${OUTCOME_COPY[sc.lastChange.kind].title}. ` : ''}{sc.weathering > 0 ? 'One steady week will clean it.' : STAGES[stage].note}</p>
          {nxt && <div style={{ marginTop: 14 }}><Meter label={`Towards “${nxt.name}”`} value={sc.refinement - STAGES[stage].at} max={nxt.at - STAGES[stage].at} detail={`${nxt.at - sc.refinement} successful ${nxt.at - sc.refinement === 1 ? 'week' : 'weeks'} to go`} /></div>}
          <Button variant="ghost" size="sm" to="/sculpture" className="mt" style={{ marginTop: 12, paddingLeft: 0 }}>View the full sculpture <Icon name="chevronR" size={16} /></Button>
        </div>
      </aside>

      <div className="stack">
        {(lastWeekUnreviewed || reviewThisWeek) && (
          <div className="notice notice-sage row-between">
            <span><strong>{lastWeekUnreviewed ? 'Last week is ready to review.' : 'Your week is nearly done.'}</strong> See what you planned against what you did, and let the sculpture respond.</span>
            <Button size="sm" variant="primary" to={`/review${lastWeekUnreviewed ? `?week=${lastWeek}` : ''}`}>Review week</Button>
          </div>
        )}

        {/* Today's plan */}
        <Panel className="today-card" id="today" title={undefined}>
          {doneToday.length > 0 ? (
            <div className="stack-sm">
              <p className="muted small">Today</p>
              <p className="today-name">{doneToday[0].name} — done.</p>
              <p className="today-meta">{fmtDuration(sessionDuration(doneToday[0]))} · {doneToday[0].status === 'partial' ? 'Partly completed — still counts.' : 'Nicely done.'}</p>
              <div className="row" style={{ marginTop: 12 }}>
                <Button variant="secondary" to={`/history/${doneToday[0].id}`}>See summary</Button>
                <Button variant="ghost" to="/workouts">Train again</Button>
              </div>
            </div>
          ) : planned ? (
            <div className="stack-sm">
              <p className="muted small">Planned for today</p>
              <p className="today-name">{planned.name}</p>
              <p className="today-meta">About {estimateMinutes(planned)} minutes · {planned.items.length} exercises · {planned.style}</p>
              <div className="row" style={{ marginTop: 16 }}>
                <Button variant="primary" size="xl" icon="play" onClick={() => start(planned.id)}>{state.activeSessionId ? 'Resume workout' : 'Start workout'}</Button>
                <Button variant="ghost" to={`/workouts/edit/${planned.id}`}>{planned.builtIn ? 'View exercises' : 'Edit'}</Button>
              </div>
            </div>
          ) : (
            <div className="stack-sm">
              <p className="muted small">Nothing planned today</p>
              <p className="today-name">A free day. Rest counts too.</p>
              <p className="today-meta">If you’d like to move, here are a few easy options.</p>
              <div className="quick" style={{ marginTop: 12 }}>
                <a href="#/workouts/new"><Icon name="plus" /> Build a workout</a>
                <button onClick={() => start('tpl-home-start')}><Icon name="home" /> Home workout</button>
                <a href="#/hiit"><Icon name="timer" /> Quick HIIT</a>
                <a href="#/library?level=1"><Icon name="library" /> Beginner exercises</a>
              </div>
            </div>
          )}
        </Panel>

        {/* Week overview */}
        <Panel title="This week" id="week" action={<a href="#/progress" className="small muted">Progress</a>}>
          <div className="week-strip" aria-label="Sessions this week">
            {weekDays(wk).map((day, i) => {
              const info = stats.perDay[i];
              const done = info.sessions.some((x) => x.status === 'completed');
              const part = !done && info.sessions.length > 0;
              const plan = !!state.schedule.weekly[i];
              const state_ = done ? 'completed' : part ? 'partly completed' : plan ? 'planned' : 'rest';
              return (
                <div key={day} className={`day ${day === d ? 'today' : ''}`} aria-label={`${DAY_SHORT[i]}: ${state_}`}>
                  <span>{DAY_SHORT[i]}</span>
                  <span className={`day-dot ${done ? 'done' : part ? 'partial' : plan ? 'planned' : ''}`} aria-hidden="true" />
                </div>
              );
            })}
          </div>
          <div className="row" style={{ marginTop: 20, gap: 24, alignItems: 'center' }}>
            <Ring value={sessionPct} label={`${stats.completed} of ${stats.planned} sessions`} size={72}><span className="num">{stats.completed}/{stats.planned}</span></Ring>
            <div className="stack-sm" style={{ flex: 1, minWidth: 180 }}>
              <p><strong>{stats.completed} of {stats.planned}</strong> planned sessions done{stats.partial ? `, plus ${stats.partial} partial` : ''}.</p>
              {state.profile.reviewCounts.nutrition && <p className="muted small">Nutrition targets met on {stats.met} of {stats.tracked} tracked {stats.tracked === 1 ? 'day' : 'days'}.</p>}
            </div>
          </div>
        </Panel>

        {/* Nutrition */}
        <Panel title="Today’s nutrition" id="nut" action={<Button size="sm" variant="quiet" icon="plus" to="/nutrition?add=1">Log a meal</Button>}>
          {p.calorieTracking && <Meter label="Calories" value={totals.kcal} max={p.calorieTarget} tone="slate" detail={`${Math.round(totals.kcal)} of ${p.calorieTarget} kcal`} />}
          <Meter label="Protein" value={totals.protein} max={p.proteinTarget} detail={`${Math.round(totals.protein)} of ${p.proteinTarget} g`} />
          {showAll && <>
            <Meter label="Carbohydrates" value={totals.carbs} max={p.carbTarget ?? 0} tone="taupe" detail={`${Math.round(totals.carbs)} g`} showOver={!!p.carbTarget} />
            <Meter label="Fat" value={totals.fat} max={p.fatTarget ?? 0} tone="taupe" detail={`${Math.round(totals.fat)} g`} showOver={!!p.fatTarget} />
          </>}
          <button className="link-btn small" style={{ marginTop: 12 }} onClick={() => setShowAll((v) => !v)}>{showAll ? 'Hide carbs and fat' : 'Show carbs and fat'}</button>
        </Panel>

        {/* Quick actions */}
        <section aria-labelledby="qa-h">
          <h2 className="panel-title" id="qa-h" style={{ marginBottom: 10 }}>Quick actions</h2>
          <div className="quick">
            <a href="#/workouts"><Icon name="play" /> Start a workout</a>
            <a href="#/nutrition?add=1"><Icon name="nutrition" /> Log a meal</a>
            <a href="#/history?log=1"><Icon name="check" /> Log an exercise</a>
            <a href="#/progress"><Icon name="chart" /> Weekly progress</a>
            <a href="#/library"><Icon name="library" /> Exercise library</a>
            <a href="#/hiit"><Icon name="timer" /> Interval timer</a>
          </div>
        </section>

        {suggestions.slice(0, 2).map((s) => (
          <div key={s.id} className="tip">
            <Icon name="leaf" />
            <p><strong>{s.text}.</strong> {s.detail}{s.id === 'return' && <> <button className="link-btn" onClick={() => start('tpl-return')}>Start it</button></>}</p>
            <IconButton icon="close" label="Dismiss suggestion" onClick={() => dismiss(s.id)} />
          </div>
        ))}
        {tip && (
          <div className="tip">
            <Icon name="info" />
            <p>{tip.text}</p>
            <IconButton icon="close" label="Dismiss tip" onClick={() => dismiss(tip.id)} />
          </div>
        )}
      </div>
    </div>
  );
}
