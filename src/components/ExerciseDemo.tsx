import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Exercise } from '../data/exercises';

type P = [number, number];
interface Spec {
  hip: P; t: number; curve?: number; head?: number;
  th?: number; sh?: number; ankle?: P; kb?: number; foot?: number;
  th2?: number; sh2?: number; ankle2?: P; kb2?: number; foot2?: number;
  ua?: number; fa?: number; wrist?: P; eb?: number;
  ua2?: number; fa2?: number; wrist2?: P; eb2?: number;
}
interface Joints { head: P; sh: P; hip: P; el: P; wr: P; kn: P; an: P; toe: P; el2: P; wr2: P; kn2: P; an2: P; toe2: P; mid: P }
interface Demo { frames: Spec[]; track?: 'wr' | 'hip' | 'an' | 'sh'; trackLabel?: string; view?: 'side' | 'front'; hold?: boolean; equip?: (j: Joints) => ReactNode }

const L = { T: 54, TH: 42, SH: 40, UA: 30, FA: 28, NECK: 15, FOOT: 11 };
const rad = (d: number) => (d * Math.PI) / 180;
const dir = (a: number, len: number, from: P): P => [from[0] + Math.sin(rad(a)) * len, from[1] + Math.cos(rad(a)) * len];
function ik(a: P, target: P, l1: number, l2: number, bend: number): [P, P] {
  const dx = target[0] - a[0], dy = target[1] - a[1];
  let d = Math.hypot(dx, dy);
  const reach = l1 + l2 - 0.01;
  const end: P = d > reach ? [a[0] + (dx / d) * reach, a[1] + (dy / d) * reach] : target;
  d = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(reach, d));
  const alpha = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const phi = Math.atan2(dy, dx);
  return [[a[0] + Math.cos(phi + bend * alpha) * l1, a[1] + Math.sin(phi + bend * alpha) * l1], end];
}
function solve(s: Spec): Joints {
  const hip = s.hip;
  const sh: P = [hip[0] + Math.sin(rad(s.t)) * L.T, hip[1] - Math.cos(rad(s.t)) * L.T];
  const ht = s.t + (s.head ?? 0);
  const head: P = [sh[0] + Math.sin(rad(ht)) * L.NECK, sh[1] - Math.cos(rad(ht)) * L.NECK];
  const leg = (th?: number, shn?: number, ankle?: P, kb = -1): [P, P] => {
    if (ankle) return ik(hip, ankle, L.TH, L.SH, kb);
    const kn = dir(th ?? 0, L.TH, hip); return [kn, dir(shn ?? 0, L.SH, kn)];
  };
  const arm = (ua?: number, fa?: number, wrist?: P, eb = 1): [P, P] => {
    if (wrist) return ik(sh, wrist, L.UA, L.FA, eb);
    const el = dir(ua ?? 0, L.UA, sh); return [el, dir(fa ?? 0, L.FA, el)];
  };
  const [kn, an] = leg(s.th, s.sh, s.ankle, s.kb);
  const [kn2, an2] = s.th2 != null || s.ankle2 ? leg(s.th2, s.sh2, s.ankle2, s.kb2 ?? s.kb) : [kn, an];
  const [el, wr] = arm(s.ua, s.fa, s.wrist, s.eb);
  const [el2, wr2] = s.ua2 != null || s.wrist2 ? arm(s.ua2, s.fa2, s.wrist2, s.eb2 ?? s.eb) : [el, wr];
  const toe = dir(s.foot ?? 90, L.FOOT, an);
  const toe2 = dir(s.foot2 ?? s.foot ?? 90, L.FOOT, an2);
  const c = s.curve ?? 0;
  const mx = (hip[0] + sh[0]) / 2, my = (hip[1] + sh[1]) / 2;
  const nx = -(sh[1] - hip[1]) / L.T, ny = (sh[0] - hip[0]) / L.T;
  return { head, sh, hip, el, wr, kn, an, toe, el2, wr2, kn2, an2, toe2, mid: [mx + nx * c, my + ny * c] };
}
function lerpSpec(a: Spec, b: Spec, t: number): Spec {
  const out: any = {};
  for (const k of Object.keys(a) as (keyof Spec)[]) {
    const va = a[k] as any, vb = (b[k] ?? a[k]) as any;
    out[k] = Array.isArray(va) ? [va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t] : typeof va === 'number' ? va + (vb - va) * t : va;
  }
  return out;
}

// ---------- Equipment ----------
const plate = (p: P, r = 20) => <g className="eq"><circle cx={p[0]} cy={p[1]} r={r} /><circle cx={p[0]} cy={p[1]} r={3} className="eq-hub" /></g>;
const dumbbell = (p: P) => <g className="eq"><rect x={p[0] - 7} y={p[1] - 4} width={14} height={8} rx={2} /></g>;
const bench = (x1: number, x2: number, top: number) => <g className="eq"><rect x={x1} y={top} width={x2 - x1} height={7} rx={2} /><rect x={x1 + 8} y={top + 7} width={5} height={180 - top - 7} /><rect x={x2 - 13} y={top + 7} width={5} height={180 - top - 7} /></g>;
const cable = (from: P, to: P) => <g><line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} className="cable" /><circle cx={from[0]} cy={from[1]} r={4} className="eq" /></g>;
const box = (x: number, w: number, top: number) => <rect className="eq" x={x} y={top} width={w} height={180 - top} rx={2} />;

const stand = (o: Partial<Spec> = {}): Spec => ({ hip: [120, 98], t: 2, ankle: [120, 180], ...o });

export const DEMOS: Record<string, Demo> = {
  squat: { track: 'hip', trackLabel: 'Hips travel down and back', frames: [stand({ ua: 88, fa: 90 }), { hip: [100, 138], t: 38, ankle: [120, 180], ua: 80, fa: 86 }] },
  goblet: { track: 'hip', trackLabel: 'Hips travel down and back', frames: [stand({ ua: 18, fa: 165 }), { hip: [100, 138], t: 30, ankle: [120, 180], ua: 26, fa: 168 }], equip: (j) => dumbbell(j.wr) },
  backsquat: { track: 'hip', trackLabel: 'Hips travel down and back', frames: [stand({ t: 4, ua: -35, fa: 150 }), { hip: [98, 136], t: 40, ankle: [120, 180], ua: -10, fa: 175 }], equip: (j) => plate([j.sh[0] - 2, j.sh[1] - 3], 18) },
  legpress: {
    track: 'an', trackLabel: 'Feet press the platform away', frames: [{ hip: [96, 146], t: -48, ankle: [172, 112], kb: -1, foot: 160, ua: 20, fa: 20 }, { hip: [96, 146], t: -48, ankle: [144, 114], kb: -1, foot: 160, ua: 20, fa: 20 }],
    equip: (j) => <g><polygon className="eq" points="60,170 112,152 84,96 70,100 96,148 56,162" /><line className="eq-line" x1={j.an[0] + 14} y1={j.an[1] - 26} x2={j.an[0] + 2} y2={j.an[1] + 22} /></g>,
  },
  deadlift: { track: 'wr', trackLabel: 'Bar travels straight up, close to the legs', frames: [{ hip: [83, 128], t: 60, ankle: [120, 180], wrist: [124, 158] }, { hip: [118, 98], t: 0, ankle: [120, 180], wrist: [121, 103] }], equip: (j) => plate(j.wr, 22) },
  rdl: { track: 'hip', trackLabel: 'Hips push back, weight stays close', frames: [{ hip: [118, 98], t: 0, ankle: [120, 180], wrist: [121, 104] }, { hip: [100, 100], t: 75, ankle: [120, 180], wrist: [142, 142] }], equip: (j) => dumbbell(j.wr) },
  bench: { track: 'wr', trackLabel: 'Bar lowers to the lower chest and presses up', frames: [{ hip: [140, 118], t: -90, head: 0, ankle: [176, 180], kb: 1, wrist: [88, 62], eb: -1 }, { hip: [140, 118], t: -90, head: 0, ankle: [176, 180], kb: 1, wrist: [92, 104], eb: -1 }], equip: (j) => <g>{bench(58, 152, 124)}{plate(j.wr, 16)}</g> },
  pushup: { track: 'sh', trackLabel: 'Body lowers as one straight line', frames: [{ hip: [124, 140], t: 65, ankle: [50, 170], foot: 40, wrist: [173, 177], eb: -1 }, { hip: [131, 160], t: 81, ankle: [50, 170], foot: 40, wrist: [173, 177], eb: -1 }] },
  inclinepushup: { track: 'sh', trackLabel: 'Chest lowers towards the edge', frames: [{ hip: [125, 123], t: 53, ankle: [60, 172], foot: 40, wrist: [180, 138], eb: -1 }, { hip: [132, 140], t: 66, ankle: [60, 172], foot: 40, wrist: [180, 138], eb: -1 }], equip: () => box(168, 38, 142) },
  press: { track: 'wr', trackLabel: 'Weights press straight overhead', frames: [{ hip: [112, 140], t: 0, ankle: [150, 180], ua: 25, fa: 172 }, { hip: [112, 140], t: 0, ankle: [150, 180], ua: 172, fa: 178 }], equip: (j) => <g>{bench(92, 132, 146)}<rect className="eq" x={92} y={72} width={6} height={74} rx={2} />{dumbbell(j.wr)}</g> },
  pulldown: { track: 'wr', trackLabel: 'Elbows drive down, bar comes to upper chest', frames: [{ hip: [118, 142], t: -8, ankle: [150, 180], wrist: [128, 32], eb: 1 }, { hip: [118, 142], t: -8, ankle: [150, 180], wrist: [124, 86], eb: 1 }], equip: (j) => <g>{bench(98, 138, 148)}<rect className="eq" x={136} y={112} width={20} height={6} rx={3} />{cable([128, 8], j.wr)}<rect className="eq" x={118} y={j.wr[1] - 2} width={24} height={4} rx={2} /></g> },
  cablerow: { track: 'wr', trackLabel: 'Handle pulls to the lower ribs', frames: [{ hip: [92, 160], t: 20, ankle: [150, 166], kb: -1, foot: 160, wrist: [166, 120], eb: 1 }, { hip: [92, 160], t: -5, ankle: [150, 166], kb: -1, foot: 160, wrist: [112, 130], eb: 1 }], equip: (j) => <g><rect className="eq" x={66} y={166} width={48} height={14} rx={2} /><rect className="eq" x={158} y={140} width={6} height={40} />{cable([214, 150], j.wr)}<rect className="eq" x={206} y={20} width={16} height={160} rx={2} /></g> },
  dbrow: { track: 'wr', trackLabel: 'Elbow drives back towards the hip', frames: [{ hip: [104, 104], t: 80, ankle: [100, 180], ankle2: [126, 180], wrist: [158, 152], eb: 1, wrist2: [176, 126], eb2: 1 }, { hip: [104, 104], t: 80, ankle: [100, 180], ankle2: [126, 180], wrist: [138, 112], eb: 1, wrist2: [176, 126], eb2: 1 }], equip: (j) => <g>{bench(150, 214, 128)}{dumbbell(j.wr)}</g> },
  pullup: { track: 'sh', trackLabel: 'Chest rises towards the bar', frames: [{ hip: [120, 134], t: 0, th: 8, sh: -30, wrist: [122, 24], eb: -1 }, { hip: [120, 100], t: 0, th: 8, sh: -30, wrist: [122, 24], eb: -1 }], equip: () => <g><line className="eq-line" x1={70} y1={22} x2={180} y2={22} /><rect className="eq" x={66} y={18} width={6} height={162} /><rect className="eq" x={178} y={18} width={6} height={162} /></g> },
  bandrow: { track: 'wr', trackLabel: 'Elbows pull back past the ribs', frames: [{ hip: [110, 98], t: 0, ankle: [102, 180], ankle2: [126, 180], wrist: [164, 68], eb: 1 }, { hip: [110, 98], t: -3, ankle: [102, 180], ankle2: [126, 180], wrist: [120, 84], eb: 1 }], equip: (j) => <g><rect className="eq" x={224} y={0} width={8} height={180} /><line className="band" x1={224} y1={66} x2={j.wr[0]} y2={j.wr[1]} /></g> },
  curl: { track: 'wr', trackLabel: 'Forearm rotates up; elbow stays put', frames: [stand({ ua: 2, fa: 2 }), stand({ ua: 10, fa: 150 })], equip: (j) => dumbbell(j.wr) },
  pushdown: { track: 'wr', trackLabel: 'Hands press down; upper arms still', frames: [{ hip: [112, 98], t: 10, ankle: [114, 180], ua: 6, fa: 118 }, { hip: [112, 98], t: 10, ankle: [114, 180], ua: 4, fa: 6 }], equip: (j) => <g><rect className="eq" x={150} y={0} width={20} height={180} rx={2} />{cable([150, 12], j.wr)}</g> },
  lunge: { track: 'hip', trackLabel: 'Hips lower straight down', frames: [stand({ ankle2: [120, 180], foot2: 90, ua: 12, fa: 40 }), { hip: [116, 132], t: 4, ankle: [142, 180], ankle2: [80, 176], foot2: 50, kb2: -1, ua: 12, fa: 40 }] },
  stepup: { track: 'hip', trackLabel: 'Drive up through the top foot', frames: [{ hip: [116, 100], t: 8, ankle: [152, 146], ankle2: [112, 180], kb2: -1, ua: 20, fa: 40, ua2: -20, fa2: 10 }, { hip: [150, 66], t: 2, ankle: [152, 146], ankle2: [160, 144], kb2: -1, ua: -10, fa: 10, ua2: 15, fa2: 40 }], equip: () => box(136, 52, 148) },
  bridge: { track: 'hip', trackLabel: 'Hips lift until shoulders, hips and knees line up', frames: [{ hip: [112, 168], t: -95, head: -5, ankle: [152, 178], kb: 1, ua: 82, fa: 90 }, { hip: [114, 142], t: -116, head: 20, ankle: [152, 178], kb: 1, ua: 70, fa: 88 }], equip: () => <rect className="eq-mat" x={30} y={178} width={180} height={3} rx={1} /> },
  plank: { hold: true, frames: [{ hip: [130, 159], t: 78, ankle: [50, 171], foot: 40, ua: 0, fa: 90 }, { hip: [130, 157], t: 78, ankle: [50, 171], foot: 40, ua: 0, fa: 90 }], equip: () => <rect className="eq-mat" x={30} y={178} width={190} height={3} rx={1} /> },
  sideplank: { hold: true, view: 'front', frames: [{ hip: [118, 146], t: 66, ankle: [44, 176], foot: 60, ua: 0, fa: 90, ua2: 180, fa2: 180 }, { hip: [118, 144], t: 66, ankle: [44, 176], foot: 60, ua: 0, fa: 90, ua2: 178, fa2: 180 }], equip: () => <rect className="eq-mat" x={30} y={178} width={190} height={3} rx={1} /> },
  deadbug: { track: 'wr', trackLabel: 'Opposite arm and leg lower slowly', frames: [{ hip: [140, 170], t: -90, head: 0, th: 178, sh: 90, th2: 178, sh2: 90, ua: 180, fa: 180, ua2: 180, fa2: 180, foot: 180 }, { hip: [140, 170], t: -90, head: 0, th: 178, sh: 90, th2: 98, sh2: 94, ua: -100, fa: -100, ua2: 180, fa2: 180, foot: 180 }], equip: () => <rect className="eq-mat" x={40} y={178} width={180} height={3} rx={1} /> },
  climber: { frames: [{ hip: [124, 140], t: 65, ankle: [112, 160], kb: -1, ankle2: [50, 170], foot: 60, wrist: [173, 177], eb: -1 }, { hip: [124, 140], t: 65, ankle: [50, 170], kb: -1, ankle2: [112, 160], foot: 60, wrist: [173, 177], eb: -1 }] },
  jack: { track: 'wr', view: 'front', trackLabel: 'Arms sweep overhead as feet jump apart', frames: [{ hip: [120, 98], t: 0, ankle: [112, 180], ankle2: [128, 180], kb: 1, kb2: -1, foot: 90, foot2: -90, ua: 14, fa: 10, ua2: -14, fa2: -10 }, { hip: [120, 94], t: 0, ankle: [92, 180], ankle2: [148, 180], kb: 1, kb2: -1, foot: 90, foot2: -90, ua: 160, fa: 172, ua2: -160, fa2: -172 }] },
  highknees: { frames: [{ hip: [120, 98], t: 2, th: 85, sh: 0, th2: 0, sh2: 0, ua: -35, fa: 60, ua2: 35, fa2: 110 }, { hip: [120, 98], t: 2, th: 0, sh: 0, th2: 85, sh2: 0, ua: 35, fa: 110, ua2: -35, fa2: 60 }] },
  burpee: {
    frames: [
      { hip: [120, 98], t: 2, ankle: [120, 180], ankle2: [120, 180], foot: 90, wrist: [122, 104], eb: 1 },
      { hip: [110, 150], t: 60, ankle: [120, 180], ankle2: [120, 180], foot: 90, wrist: [152, 178], eb: -1 },
      { hip: [106, 140], t: 66, ankle: [36, 170], ankle2: [36, 170], foot: 40, wrist: [152, 178], eb: -1 },
      { hip: [110, 150], t: 60, ankle: [120, 180], ankle2: [120, 180], foot: 90, wrist: [152, 178], eb: -1 },
    ],
  },
  walk: { frames: [{ hip: [120, 99], t: 3, th: 20, sh: 2, th2: -18, sh2: -8, ua: -18, fa: -6, ua2: 20, fa2: 40 }, { hip: [120, 99], t: 3, th: -18, sh: -8, th2: 20, sh2: 2, ua: 20, fa: 40, ua2: -18, fa2: -6 }] },
  run: { frames: [{ hip: [120, 92], t: 10, th: 40, sh: 8, th2: -28, sh2: -85, ua: -40, fa: 50, ua2: 50, fa2: 130 }, { hip: [120, 92], t: 10, th: -28, sh: -85, th2: 40, sh2: 8, ua: 50, fa: 130, ua2: -40, fa2: 50 }] },
  catcow: { trackLabel: 'Spine rounds up, then gently arches', frames: [{ hip: [80, 122], t: 90, curve: 9, head: -40, th: 0, sh: -75, ua: 0, fa: 0, foot: -80 }, { hip: [80, 122], t: 90, curve: -10, head: 50, th: 0, sh: -75, ua: 0, fa: 0, foot: -80 }], equip: () => <rect className="eq-mat" x={20} y={178} width={190} height={3} rx={1} /> },
  hipflexor: { hold: true, frames: [{ hip: [116, 128], t: -3, ankle: [150, 180], kb: -1, th2: -18, sh2: -86, foot2: -100, ua: 6, fa: 4 }, { hip: [124, 130], t: -6, ankle: [150, 180], kb: -1, th2: -26, sh2: -88, foot2: -100, ua: 6, fa: 4 }], equip: () => <rect className="eq-mat" x={30} y={178} width={180} height={3} rx={1} /> },
};

// ---------- Muscle mapping ----------
type Seg = 'torso' | 'upper' | 'fore' | 'thigh' | 'shin' | 'glute' | 'delt';
const SEG_FOR: Record<string, Seg[]> = {
  Chest: ['torso'], 'Upper back': ['torso'], Lats: ['torso'], 'Lower back': ['torso'], Core: ['torso'], 'Heart & lungs': ['torso'],
  Shoulders: ['delt'], Biceps: ['upper'], Triceps: ['upper'], Forearms: ['fore'], Glutes: ['glute'], Quadriceps: ['thigh'], Hamstrings: ['thigh'],
  'Hip flexors': ['thigh'], Calves: ['shin'],
};

function Figure({ j, ex, figure }: { j: Joints; ex: Exercise; figure: 'masculine' | 'feminine' }) {
  const prim = new Set(ex.primary.flatMap((m) => SEG_FOR[m] ?? []));
  const sec = new Set(ex.secondary.flatMap((m) => SEG_FOR[m] ?? []));
  const cls = (s: Seg) => (prim.has(s) ? 'm-primary' : sec.has(s) ? 'm-secondary' : '');
  const line = (a: P, b: P, w: number, c: string, extra = '') => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={w} className={`limb ${c} ${extra}`} />;
  const fem = figure === 'feminine';
  return (
    <g strokeLinecap="round">
      {/* far limbs */}
      <g className="far">
        {line(j.sh, j.el2, 7.5, cls('upper'))}{line(j.el2, j.wr2, 6.5, cls('fore'))}
        {line(j.hip, j.kn2, 10.5, cls('thigh'))}{line(j.kn2, j.an2, 8.5, cls('shin'))}{line(j.an2, j.toe2, 5, '')}
      </g>
      {/* torso */}
      <path d={`M${j.hip[0]},${j.hip[1]} Q${j.mid[0]},${j.mid[1]} ${j.sh[0]},${j.sh[1]}`} strokeWidth={fem ? 16 : 18} fill="none" className={`limb ${cls('torso')}`} />
      <circle cx={j.hip[0]} cy={j.hip[1]} r={fem ? 10 : 9} className={`limb-fill ${cls('glute')}`} />
      <circle cx={j.sh[0]} cy={j.sh[1]} r={fem ? 7.5 : 8.5} className={`limb-fill ${cls('delt')}`} />
      {/* head */}
      {fem && <circle cx={j.head[0] - (j.head[0] - j.sh[0]) * 0.15 - 7} cy={j.head[1] - 6} r={5} className="limb-fill" />}
      <circle cx={j.head[0]} cy={j.head[1]} r={9.5} className="limb-fill head" />
      {/* near limbs */}
      {line(j.hip, j.kn, 11, cls('thigh'))}{line(j.kn, j.an, 9, cls('shin'))}{line(j.an, j.toe, 5.5, '')}
      {line(j.sh, j.el, 8, cls('upper'))}{line(j.el, j.wr, 7, cls('fore'))}
      <g className="joints">{[j.kn, j.el, j.an, j.hip, j.sh].map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={1.8} />)}</g>
    </g>
  );
}

function prefersReduced() {
  return document.documentElement.dataset.motion === 'reduced' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function ExerciseDemo({ ex, figure, playing: playingProp = true, compact, frame }: { ex: Exercise; figure: 'masculine' | 'feminine'; playing?: boolean; compact?: boolean; frame?: number }) {
  const demo = DEMOS[ex.demo] ?? DEMOS.squat;
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(playingProp && !prefersReduced());
  const raf = useRef(0);
  useEffect(() => {
    if (!playing || frame != null) return;
    const seg = demo.hold ? 2400 : 1400, holdMs = demo.hold ? 0 : 450;
    const n = demo.frames.length;
    const total = (seg + holdMs) * n;
    const start = performance.now() - t * total;
    const tick = (now: number) => { setT((((now - start) % total) + total) % total / total); raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, demo, frame]);

  const spec = useMemo(() => {
    if (frame != null) return demo.frames[Math.min(frame, demo.frames.length - 1)];
    const n = demo.frames.length;
    const seg = demo.hold ? 2400 : 1400, holdMs = demo.hold ? 0 : 450;
    const pos = Math.max(0, Math.min(0.9999, t)) * n; const i = Math.floor(pos) % n; const local = (pos - Math.floor(pos)) * (seg + holdMs);
    const k = local < holdMs ? 0 : (local - holdMs) / seg;
    const e = 0.5 - Math.cos(Math.PI * k) / 2;
    return lerpSpec(demo.frames[i], demo.frames[(i + 1) % n], e);
  }, [t, demo, frame]);
  const j = solve(spec);
  const a = demo.track ? solve(demo.frames[0])[demo.track] : null;
  const b = demo.track ? solve(demo.frames[1])[demo.track] : null;

  return (
    <div className={`demo ${compact ? 'demo-compact' : ''}`}>
      <svg viewBox="0 0 240 200" role="img" aria-label={`Animated demonstration of ${ex.name}${demo.trackLabel ? `. ${demo.trackLabel}.` : ''}`}>
        <defs>
          <marker id={`arrow-${ex.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="arrow-head" />
          </marker>
        </defs>
        <line x1="0" y1="181" x2="240" y2="181" className="ground" />
        {demo.equip?.(j)}
        {a && b && frame == null && (
          <path d={`M${a[0]},${a[1]} L${b[0]},${b[1]}`} className="motion-path" markerEnd={`url(#arrow-${ex.id})`} markerStart={`url(#arrow-${ex.id})`} />
        )}
        <Figure j={j} ex={ex} figure={figure} />
      </svg>
      {!compact && frame == null && (
        <button type="button" className="demo-toggle" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing}>
          {playing ? 'Pause animation' : 'Play animation'}
        </button>
      )}
    </div>
  );
}

export function demoInfo(ex: Exercise) { const d = DEMOS[ex.demo]; return { trackLabel: d?.trackLabel, hold: d?.hold, view: d?.view ?? 'side', frames: d?.frames.length ?? 2 }; }
