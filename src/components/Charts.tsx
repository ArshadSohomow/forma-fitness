import { useId } from 'react';

export interface Point { label: string; value: number; note?: string }

// Simple, accessible charts: values are labelled directly, a hidden table mirrors the data,
// and nothing relies on colour alone.
export function BarChart({ data, unit = '', height = 160, target, title, format = (v: number) => String(Math.round(v)) }: { data: Point[]; unit?: string; height?: number; target?: number; title: string; format?: (v: number) => string }) {
  const id = useId();
  const max = Math.max(1, target ?? 0, ...data.map((d) => d.value)) * 1.12;
  const w = 100 / Math.max(1, data.length);
  return (
    <figure className="chart" aria-labelledby={`${id}-cap`}>
      <figcaption id={`${id}-cap`} className="sr-only">{title}</figcaption>
      <svg viewBox={`0 0 100 ${height / 3}`} preserveAspectRatio="none" className="chart-svg" aria-hidden="true" style={{ height }}>
        {target != null && <line x1="0" x2="100" y1={(height / 3) * (1 - target / max)} y2={(height / 3) * (1 - target / max)} className="chart-target" vectorEffect="non-scaling-stroke" />}
        {data.map((d, i) => {
          const h = (height / 3) * (d.value / max);
          return <rect key={i} x={i * w + w * 0.2} width={w * 0.6} y={height / 3 - h} height={Math.max(h, d.value > 0 ? 0.6 : 0)} className={`chart-bar ${target != null && d.value >= target ? 'met' : ''}`} rx="0.6" />;
        })}
      </svg>
      <div className="chart-labels" aria-hidden="true">
        {data.map((d, i) => <div key={i} className="chart-label"><span className="num chart-val">{d.value ? format(d.value) : '–'}</span><span>{d.label}</span></div>)}
      </div>
      {target != null && <p className="chart-legend"><span className="legend-dash" /> Target {format(target)}{unit}</p>}
      <table className="sr-only"><caption>{title}</caption><tbody>{data.map((d, i) => <tr key={i}><th>{d.label}</th><td>{format(d.value)}{unit}</td></tr>)}</tbody></table>
    </figure>
  );
}

export function LineChart({ data, unit = '', height = 160, title, format = (v: number) => String(Math.round(v * 10) / 10) }: { data: Point[]; unit?: string; height?: number; title: string; format?: (v: number) => string }) {
  const id = useId();
  if (data.length === 0) return null;
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const pad = (max - min) * 0.15 || Math.max(1, max * 0.1);
  const lo = min - pad, hi = max + pad;
  const W = 300, H = 100;
  const x = (i: number) => (data.length === 1 ? W / 2 : 8 + (i * (W - 16)) / (data.length - 1));
  const y = (v: number) => H - 8 - ((v - lo) / (hi - lo)) * (H - 20);
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  return (
    <figure className="chart" aria-labelledby={`${id}-cap`}>
      <figcaption id={`${id}-cap`} className="sr-only">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" style={{ height }} aria-hidden="true">
        <path d={path} className="chart-line" fill="none" />
        {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.value)} r="3" className="chart-dot" />)}
        <text x={x(0)} y={y(data[0].value) - 7} className="chart-text" textAnchor="start">{format(data[0].value)}</text>
        {data.length > 1 && <text x={x(data.length - 1)} y={y(data[data.length - 1].value) - 7} className="chart-text" textAnchor="end">{format(data[data.length - 1].value)}{unit}</text>}
      </svg>
      <div className="chart-axis" aria-hidden="true"><span>{data[0].label}</span>{data.length > 1 && <span>{data[data.length - 1].label}</span>}</div>
      <table className="sr-only"><caption>{title}</caption><tbody>{data.map((d, i) => <tr key={i}><th>{d.label}</th><td>{format(d.value)}{unit}</td></tr>)}</tbody></table>
    </figure>
  );
}
