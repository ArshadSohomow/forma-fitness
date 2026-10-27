import { useId, useMemo, type ReactNode } from 'react';
import type { SculptureBuild, SculptureStyle } from '../types';

export interface SculptureProps {
  style: SculptureStyle;
  build: SculptureBuild;
  stage: number; // 0–5
  weathering: number; // 0–3
  repaired: boolean;
  vitality: number; // 0–5
  neglect: number; // 0–3
  wrappers: number; // 0–3
  milestones: Record<string, number>;
  detail?: 'full' | 'reduced';
  celebrate?: 'refined' | 'restored' | null;
  label: string;
  className?: string;
  numeral?: boolean;
}

// Deterministic pseudo-random so the stone looks the same on every render.
function rng(seed: number) { let a = seed; return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; }; }

function jagged(x1: number, y1: number, x2: number, y2: number, steps: number, amp: number, seed: number) {
  const r = rng(seed); const pts: string[] = [];
  for (let i = 1; i < steps; i++) {
    const t = i / steps; const nx = -(y2 - y1), ny = x2 - x1; const len = Math.hypot(nx, ny) || 1;
    const off = (r() - 0.5) * 2 * amp;
    pts.push(`${(x1 + (x2 - x1) * t + (nx / len) * off).toFixed(1)},${(y1 + (y2 - y1) * t + (ny / len) * off).toFixed(1)}`);
  }
  return pts;
}

const BLOCKS = [
  { top: 30, left: 76, right: 244 },
  { top: 82, left: 80, right: 240 },
  { top: 196, left: 88, right: 232 },
  { top: 352, left: 106, right: 214 },
  { top: 402, left: 118, right: 202 },
];
function blockPath(stage: number) {
  const b = BLOCKS[stage]; if (!b) return null;
  const base = 424;
  const pts = [
    `${b.left},${base}`, ...jagged(b.left, base, b.left + 4, b.top + 14, 6, 5, 11 + stage),
    `${b.left + 6},${b.top + 10}`, ...jagged(b.left + 6, b.top + 10, b.right - 6, b.top + 4, 12, 9, 29 + stage),
    `${b.right - 4},${b.top + 12}`, ...jagged(b.right - 4, b.top + 12, b.right, base, 6, 5, 47 + stage), `${b.right},${base}`,
  ];
  return `M${pts.join(' L')} Z`;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

function Figure({ style, t = '' }: { style: SculptureStyle; t?: string }) {
  const m = `${t} matrix(-1 0 0 1 320 0)`;
  if (style === 'abstract') {
    return (
      <>
        <ellipse cx="161" cy="80" rx="19" ry="27" transform={`${t} rotate(-8 161 80)`} />
        <path transform={t} d="M151,102 C153,108 167,108 169,102 L171,118 L149,118 Z" />
        <path transform={t} d="M160,112 C198,114 210,178 202,248 C196,318 182,378 174,424 L146,424 C140,378 126,318 120,248 C112,178 122,114 160,112 Z" />
      </>
    );
  }
  if (style === 'feminine') {
    const arm = 'M121,126 C108,134 104,160 106,188 C107,212 106,238 110,262 C112,272 121,272 122,262 C123,238 124,212 126,192 C128,170 130,150 133,136 Z';
    const leg = 'M120,256 C113,296 123,332 129,352 C133,372 131,400 129,424 L152,424 C152,400 154,372 154,352 C158,318 160,292 160,264 Z';
    return (
      <>
        <ellipse transform={t} cx="160" cy="56" rx="13" ry="10" />
        <ellipse transform={t} cx="160" cy="77" rx="18" ry="23" />
        <path transform={t} d="M152,94 L168,94 L171,116 L149,116 Z" />
        <path transform={t} d="M118,124 C136,113 184,113 202,124 C206,150 200,176 192,196 C188,212 190,224 200,244 C206,256 205,262 203,268 L117,268 C115,262 114,256 120,244 C130,224 132,212 128,196 C120,176 114,150 118,124 Z" />
        <path transform={t} d={arm} /><path d={arm} transform={m} />
        <ellipse transform={t} cx="116" cy="270" rx="7" ry="10" /><ellipse transform={t} cx="204" cy="270" rx="7" ry="10" />
        <path transform={t} d={leg} /><path d={leg} transform={m} />
      </>
    );
  }
  const arm = 'M110,124 C96,132 92,160 94,190 C95,214 96,240 100,266 C102,276 112,276 113,266 C114,240 116,214 118,192 C120,170 122,150 125,136 Z';
  const leg = 'M121,250 C116,290 124,330 130,352 C134,372 130,400 128,424 L152,424 C152,400 154,372 154,352 C158,320 160,290 160,262 Z';
  return (
    <>
      <ellipse transform={t} cx="160" cy="74" rx="19" ry="24" />
      <path transform={t} d="M150,92 L170,92 L174,114 L146,114 Z" />
      <path transform={t} d="M107,122 C130,108 190,108 213,122 C219,150 208,180 198,206 C194,224 196,240 201,258 L119,258 C124,240 126,224 122,206 C112,180 101,150 107,122 Z" />
      <path transform={t} d={arm} /><path d={arm} transform={m} />
      <ellipse transform={t} cx="106" cy="275" rx="8" ry="11" /><ellipse transform={t} cx="214" cy="275" rx="8" ry="11" />
      <path transform={t} d={leg} /><path d={leg} transform={m} />
    </>
  );
}

function Contours({ style }: { style: SculptureStyle }) {
  if (style === 'abstract') return <path d="M160,130 C182,170 186,230 176,290 C170,330 166,380 162,420" />;
  if (style === 'feminine') return (
    <g>
      <path d="M134,126 Q147,131 157,125" /><path d="M186,126 Q173,131 163,125" />
      <path d="M140,160 Q150,176 160,172 Q170,176 180,160" />
      <path d="M160,200 L160,236" /><path d="M136,350 Q141,356 148,350" /><path d="M172,350 Q179,356 184,350" />
    </g>
  );
  return (
    <g>
      <path d="M126,148 Q144,164 158,150" /><path d="M194,148 Q176,164 162,150" />
      <path d="M160,160 L160,240" /><path d="M146,186 L174,186" /><path d="M147,210 L173,210" />
      <path d="M138,350 Q142,357 149,350" /><path d="M171,350 Q178,357 182,350" />
    </g>
  );
}

const STAGE_ROUGH = [4.5, 4, 3, 2, 0.8, 0];
const STAGE_MATTE = [0.28, 0.24, 0.18, 0.12, 0.05, 0];

export function Sculpture(p: SculptureProps) {
  const uid = useId().replace(/[:«»]/g, '');
  const id = (n: string) => `${n}-${uid}`;
  const stage = Math.max(0, Math.min(5, p.stage));
  const full = p.detail !== 'reduced';
  const ms = p.milestones;
  const build = p.build === 'slender' ? 0.92 : p.build === 'broad' ? 1.08 : 1;
  const figT = `translate(160 0) scale(${build} 1) translate(-160 0)`;
  const block = blockPath(stage);

  const dust = useMemo(() => {
    const r = rng(91); const out: ReactNode[] = [];
    const n = p.weathering * 26 + p.neglect * 10;
    for (let i = 0; i < n; i++) {
      const onPlinth = r() < 0.55;
      const x = onPlinth ? 92 + r() * 136 : 112 + r() * 96;
      const y = onPlinth ? 424 + r() * 54 : 130 + r() * 290;
      out.push(<circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={(0.5 + r() * 1.2).toFixed(2)} />);
    }
    return out;
  }, [p.weathering, p.neglect]);

  const leaves = useMemo(() => {
    const r = rng(17); const out: ReactNode[] = [];
    const n = p.neglect * 4 + (p.weathering >= 3 ? 3 : 0);
    for (let i = 0; i < n; i++) {
      const x = 40 + r() * 240; if (x > 92 && x < 228) continue;
      const y = 488 + r() * 22; const rot = r() * 360;
      out.push(<path key={i} d="M0,0 C3,-4 9,-4 12,0 C9,4 3,4 0,0 Z" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)})`} />);
    }
    return out;
  }, [p.neglect, p.weathering]);

  const grass = useMemo(() => {
    const r = rng(5); const out: ReactNode[] = [];
    const n = Math.min(26, p.vitality * 5 + (stage >= 3 ? 3 : 0));
    for (let i = 0; i < n; i++) {
      let x = 18 + r() * 284; if (x > 86 && x < 234) x = r() < 0.5 ? 30 + r() * 50 : 240 + r() * 50;
      const h = 8 + r() * 10; const y = 486 + r() * 8;
      out.push(<path key={i} className="tuft" style={{ animationDelay: `${(r() * 3).toFixed(2)}s` }} d={`M${x},${y} q-2,-${h * 0.6} -4,-${h} M${x},${y} q1,-${h * 0.7} 2,-${h * 1.1} M${x},${y} q3,-${h * 0.5} 6,-${h * 0.8}`} />);
    }
    return out;
  }, [p.vitality, stage]);

  const sun = 0.04 + p.vitality * 0.035 + stage * 0.012 - p.neglect * 0.012;

  return (
    <svg viewBox="0 0 320 520" className={`sculpture ${p.className ?? ''} ${p.celebrate ? `celebrate celebrate-${p.celebrate}` : ''}`} role="img" aria-label={p.label}>
      <defs>
        <linearGradient id={id('marble')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--marble-hi)" />
          <stop offset="0.55" stopColor="var(--marble)" />
          <stop offset="1" stopColor="var(--marble-lo)" />
        </linearGradient>
        <linearGradient id={id('stone')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--stone-hi)" />
          <stop offset="1" stopColor="var(--stone-lo)" />
        </linearGradient>
        <radialGradient id={id('light')} cx="0.32" cy="0.18" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity={0.55 + stage * 0.04} />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.8" stopColor="#3a3833" stopOpacity="0.10" />
          <stop offset="1" stopColor="#3a3833" stopOpacity="0.22" />
        </radialGradient>
        <linearGradient id={id('beam')} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="var(--sunbeam)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--sunbeam)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id('niche')} cx="0.5" cy="0.3" r="0.8">
          <stop offset="0" stopColor="var(--niche-hi)" />
          <stop offset="1" stopColor="var(--niche-lo)" />
        </radialGradient>
        {full && (
          <>
            <filter id={id('veins')} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="turbulence" baseFrequency="0.011 0.019" numOctaves="3" seed="8" result="n" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.46  0 0 0 0 0.45  0 0 0 0 0.43  -2.6 0 0 0 0.5" result="v" />
              <feComposite in="v" in2="SourceGraphic" operator="in" result="vc" />
              <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="vc" /></feMerge>
            </filter>
            <filter id={id('rough')} x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="2" result="t" />
              <feDisplacementMap in="SourceGraphic" in2="t" scale={STAGE_ROUGH[stage]} />
            </filter>
            <filter id={id('grain')} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="4" result="g" />
              <feColorMatrix in="g" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.33  0 0 0 0 0.3  0 0 0 -1.2 0.75" result="gc" />
              <feComposite in="gc" in2="SourceGraphic" operator="in" result="gi" />
              <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="gi" /></feMerge>
            </filter>
          </>
        )}
        <clipPath id={id('fig')}><Figure style={p.style} t={figT} /></clipPath>
      </defs>

      {/* Niche */}
      <rect x="0" y="0" width="320" height="520" fill="var(--niche-wall)" />
      <path d="M40,488 L40,150 A120,120 0 0 1 280,150 L280,488 Z" fill={`url(#${id('niche')})`} />
      <path d="M40,488 L40,150 A120,120 0 0 1 280,150 L280,488" fill="none" stroke="var(--niche-edge)" strokeWidth="1.2" />

      {/* Sunlight */}
      <path className="sunbeam" d="M60,0 L170,0 L300,488 L120,488 Z" fill={`url(#${id('beam')})`} opacity={Math.max(0.02, sun)} />

      {/* Ivy (milestone) */}
      {ms['habit-season'] && (
        <g className="ivy" fill="none" stroke="var(--leaf)" strokeWidth="1.2">
          <path d="M42,488 C48,420 36,360 50,300 C58,262 46,220 60,190" />
          {[[47, 450], [42, 400], [50, 340], [52, 280], [55, 220]].map(([x, y], i) => (
            <path key={i} d={`M${x},${y} c6,-6 14,-4 12,4 c-6,4 -10,2 -12,-4z`} fill="var(--leaf)" opacity="0.8" />
          ))}
        </g>
      )}

      {/* Floor */}
      <rect x="0" y="488" width="320" height="32" fill="var(--floor)" />
      <line x1="0" y1="488" x2="320" y2="488" stroke="var(--niche-edge)" strokeWidth="1" />
      {grass.length > 0 && <g className="grass" stroke="var(--grass)" strokeWidth="1.3" fill="none" strokeLinecap="round">{grass}</g>}

      {/* Olive tree (milestone) */}
      {ms['first-month'] && (
        <g className="olive" transform="translate(262 418)">
          <path d="M-10,70 L10,70 L7,48 L-7,48 Z" fill="var(--pot)" />
          <path d="M0,48 C-2,30 4,18 0,0" stroke="var(--trunk)" strokeWidth="2.4" fill="none" />
          {[[-12, 4], [10, -2], [-6, -12], [8, 14], [-14, 18], [2, -18], [14, 6]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="7" ry="2.6" transform={`rotate(${i * 37} ${x} ${y})`} fill="var(--leaf)" />
          ))}
        </g>
      )}
      {(ms['programme'] || p.vitality >= 4) && (
        <g transform="translate(58 452)">
          <path d="M-12,36 L12,36 L9,18 L-9,18 Z" fill="var(--pot)" />
          {[-6, 0, 6].map((x, i) => <g key={i}><path d={`M${x},18 C${x},10 ${x + 1},6 ${x},${-2 - i * 3}`} stroke="var(--leaf)" strokeWidth="1.2" fill="none" />{(ms['programme'] || p.vitality >= 5) && <circle cx={x} cy={-3 - i * 3} r="2.6" fill="var(--blossom)" />}</g>)}
        </g>
      )}

      {/* Plinth */}
      <g className="plinth">
        <rect x="96" y="434" width="128" height="54" fill={`url(#${id('stone')})`} />
        <rect x="88" y="424" width="144" height="12" fill="var(--stone-hi)" />
        <rect x="90" y="484" width="140" height="6" fill="var(--stone-lo)" />
        {ms['w25'] && <line x1="96" y1="446" x2="224" y2="446" stroke="var(--stone-line)" strokeWidth="1" />}
        {p.numeral !== false && (
          <text x="160" y="470" textAnchor="middle" className="plinth-text" fill={ms['w100'] ? 'var(--gilt)' : 'var(--stone-ink)'}>{ROMAN[stage]}</text>
        )}
        {ms['first-week'] && (
          <g fill="none" stroke="var(--leaf)" strokeWidth="1.1" transform="translate(160 476)">
            <path d="M-26,0 C-18,-6 -10,-6 -4,-2" /><path d="M26,0 C18,-6 10,-6 4,-2" />
            {[-22, -16, -10].map((x) => <ellipse key={x} cx={x} cy={-3 - (x + 26) * 0.12} rx="3" ry="1.4" fill="var(--leaf)" stroke="none" transform={`rotate(-25 ${x} -3)`} />)}
            {[22, 16, 10].map((x) => <ellipse key={x} cx={x} cy={-3 - (26 - x) * 0.12} rx="3" ry="1.4" fill="var(--leaf)" stroke="none" transform={`rotate(25 ${x} -3)`} />)}
          </g>
        )}
        {p.weathering >= 3 && <path d="M232,424 L224,424 L229,433 L232,431 Z" fill="var(--niche-lo)" />}
      </g>

      {/* Figure */}
      <g className="figure" filter={full ? `url(#${id('rough')})` : undefined}>
        <g transform={figT} fill={`url(#${id('marble')})`} filter={full ? `url(#${id('veins')})` : undefined}>
          <Figure style={p.style} />
        </g>
        <g clipPath={`url(#${id('fig')})`}>
          <rect x="60" y="20" width="200" height="420" fill={`url(#${id('light')})`} />
          <rect x="60" y="20" width="200" height="420" fill="var(--matte)" opacity={STAGE_MATTE[stage] + p.weathering * 0.06} />
          {stage >= 3 && (
            <g transform={figT} fill="none" stroke="var(--contour)" strokeWidth="1.1" strokeLinecap="round" opacity={stage === 3 ? 0.35 : 0.5}>
              <Contours style={p.style} />
            </g>
          )}
          {(stage >= 5 || (ms['first-pb'] && stage >= 3)) && (
            <g fill="none" stroke="#fff" strokeLinecap="round" className="sheen" opacity={stage >= 5 ? 0.75 : 0.45}>
              <path d="M140,70 Q146,58 156,56" strokeWidth="2.4" />
              <path d="M126,140 Q132,128 146,124" strokeWidth="2" />
              <path d="M128,300 Q132,330 136,350" strokeWidth="1.6" />
            </g>
          )}
        </g>
      </g>

      {/* Tool marks: short chisel hatches just above the remaining stone */}
      {stage >= 1 && stage <= 3 && (
        <g stroke="var(--stone-line)" strokeWidth="0.7" opacity="0.45" clipPath={`url(#${id('fig')})`} strokeLinecap="round">
          {Array.from({ length: 9 }, (_, i) => {
            const y = (BLOCKS[stage]?.top ?? 400) - 6 - (i % 3) * 9 - Math.floor(i / 3) * 3;
            const x = 128 + (i * 23) % 64;
            return <line key={i} x1={x} y1={y} x2={x + 7} y2={y - 4} />;
          })}
        </g>
      )}

      {/* Rough block */}
      {block && (
        <g className="block">
          <path d={block} fill={`url(#${id('stone')})`} filter={full ? `url(#${id('grain')})` : undefined} />
          <path d={block} fill="none" stroke="var(--stone-line)" strokeWidth="1" />
          {Array.from({ length: 5 }, (_, i) => {
            const b = BLOCKS[stage]; const y = b.top + 26 + i * ((424 - b.top - 30) / 5);
            return <path key={i} d={`M${b.left + 10},${y} l${18 + i * 5},${3 - i} m10,6 l${12 + i * 3},-2`} stroke="var(--stone-line)" strokeWidth="0.8" fill="none" opacity="0.7" />;
          })}
        </g>
      )}

      {/* Weathering: crack, dust */}
      {p.weathering >= 2 && (
        <path d={stage >= 3 ? 'M196,132 L189,150 L193,160 L185,178 L188,190' : 'M210,240 L200,262 L206,276 L196,300'} stroke="var(--crack)" strokeWidth="1.3" fill="none" className="crack" />
      )}
      {p.repaired && p.weathering === 0 && (
        <path d={stage >= 3 ? 'M196,132 L189,150 L193,160 L185,178 L188,190' : 'M210,240 L200,262 L206,276 L196,300'} stroke="var(--gilt)" strokeWidth="1.4" fill="none" className="seam" />
      )}
      {(p.weathering > 0 || p.neglect > 0) && <g fill="var(--dust)" opacity={0.35 + p.weathering * 0.12}>{dust}</g>}
      {leaves.length > 0 && <g fill="var(--fallen)" opacity="0.85">{leaves}</g>}

      {/* Wrappers — only shown when the user opted in */}
      {p.wrappers > 0 && (
        <g className="wrappers">
          {[[70, 500, -12], [236, 496, 18], [104, 506, 32]].slice(0, p.wrappers).map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
              <path d="M0,0 l3,-2 l2,2 l12,-1 l2,-2 l3,2 l-1,6 l-3,1 l-14,1 l-3,-2 z" fill="var(--wrapper)" stroke="var(--wrapper-edge)" strokeWidth="0.6" />
            </g>
          ))}
        </g>
      )}

      {/* Celebration: chips fall from where the chisel worked */}
      {p.celebrate && full && (
        <g className="chips" fill="var(--stone-hi)">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M0,0 l4,-1 l2,3 l-3,3 l-4,-2 z" style={{ ['--dx' as string]: `${(i - 6) * 9}px`, ['--dy' as string]: `${50 + (i % 4) * 20}px`, animationDelay: `${i * 0.06}s` }}
              transform={`translate(${148 + (i % 6) * 5} ${(BLOCKS[Math.max(0, stage - 1)]?.top ?? 380) + 6})`} />
          ))}
        </g>
      )}
    </svg>
  );
}
