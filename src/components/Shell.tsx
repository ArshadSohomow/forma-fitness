import type { ReactNode } from 'react';
import { Icon, Toasts } from './ui';
import { useApp } from '../store';

const NAV = [
  { to: '/', label: 'Today', icon: 'home', match: (p: string) => p === '/' },
  { to: '/workouts', label: 'Workouts', icon: 'workouts', match: (p: string) => p.startsWith('/workout') || p.startsWith('/history') || p.startsWith('/hiit') },
  { to: '/library', label: 'Exercises', icon: 'library', match: (p: string) => p.startsWith('/library') },
  { to: '/nutrition', label: 'Nutrition', icon: 'nutrition', match: (p: string) => p.startsWith('/nutrition') },
  { to: '/sculpture', label: 'Sculpture', icon: 'sculpture', match: (p: string) => p.startsWith('/sculpture') || p.startsWith('/review') || p.startsWith('/progress') },
  { to: '/profile', label: 'Profile', icon: 'profile', match: (p: string) => p.startsWith('/profile') },
];

export function Shell({ path, children, immersive }: { path: string; children: ReactNode; immersive?: boolean }) {
  const { state } = useApp();
  const active = state.activeSessionId ? state.sessions.find((s) => s.id === state.activeSessionId) : null;
  return (
    <div className={`shell ${immersive ? 'immersive' : ''}`}>
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      {!immersive && (
        <nav className="rail" aria-label="Main">
          <a className="brand" href="#/" aria-label="FORMA home">
            <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="M6 28h20M9 28V12a7 7 0 0 1 14 0v16" fill="none" stroke="currentColor" strokeWidth="1.6" /><circle cx="16" cy="13" r="2.6" fill="currentColor" /><path d="M13.5 26l1-7.5h3l1 7.5" fill="currentColor" /></svg>
            <span className="brand-word">Forma</span>
          </a>
          <ul>
            {NAV.map((n) => {
              const on = n.match(path);
              return (
                <li key={n.to}>
                  <a href={`#${n.to}`} className={`nav-link ${on ? 'on' : ''}`} aria-current={on ? 'page' : undefined}>
                    <Icon name={n.icon} size={22} /><span>{n.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      <main id="main" tabIndex={-1} className="main">
        {active && !immersive && (
          <a className="resume-bar" href="#/workout/active">
            <span className="pulse" aria-hidden="true" /> {active.name} is in progress — <strong>Resume</strong>
          </a>
        )}
        {state.hiitRun && !state.hiitRun.finished && !immersive && !path.startsWith('/hiit') && (
          <a className="resume-bar" href="#/hiit"><span className="pulse" aria-hidden="true" /> Interval timer is running — <strong>Return</strong></a>
        )}
        {children}
      </main>
      <Toasts />
    </div>
  );
}
