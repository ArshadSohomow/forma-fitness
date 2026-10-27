import { useEffect, useId, useRef, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';
import { navigate } from '../router';
import { useApp } from '../store';

// ---------- Icons (inline, stroke-based) ----------
const paths: Record<string, string> = {
  home: 'M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z',
  workouts: 'M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12',
  library: 'M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10',
  nutrition: 'M12 21c-4.5 0-7-3.5-7-8 0-3.5 2.5-6 5-6 1 0 1.5.5 2 .5s1-.5 2-.5c2.5 0 5 2.5 5 6 0 4.5-2.5 8-7 8zM12 7c0-2 1-4 3-4',
  sculpture: 'M12 3a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM8.5 21l1-7-2-3.5L12 9l4.5 1.5-2 3.5 1 7M6 21h12',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6',
  plus: 'M12 5v14M5 12h14', check: 'M5 12.5l4.5 4.5L19 7.5', close: 'M6 6l12 12M18 6L6 18',
  chevronR: 'M9 6l6 6-6 6', chevronL: 'M15 6l-6 6 6 6', chevronD: 'M6 9l6 6 6-6', chevronU: 'M6 15l6-6 6 6',
  play: 'M7 5l12 7-12 7z', pause: 'M8 5v14M16 5v14', skip: 'M6 5l9 7-9 7zM18 5v14', stop: 'M6 6h12v12H6z',
  timer: 'M12 8v5l3 2M9 2h6M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4', copy: 'M8 8h11v11H8zM5 16V5h11', up: 'M12 19V5M6 11l6-6 6 6', down: 'M12 5v14M6 13l6 6 6-6',
  info: 'M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', sound: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  mute: 'M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6', calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4', sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z', history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 3', flag: 'M5 21V4h11l-2 4 2 4H5',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01', review: 'M4 4h16v16H4zM8 9h8M8 13h5M8 17h3', download: 'M12 4v12M6 11l6 6 6-6M4 20h16',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', leaf: 'M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l7-7',
};
export function Icon({ name, size = 20, label }: { name: keyof typeof paths | string; size?: number; label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label} className="icon">
      <path d={paths[name] ?? ''} />
    </svg>
  );
}

// ---------- Buttons ----------
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet'; size?: 'sm' | 'md' | 'lg' | 'xl'; icon?: string; to?: string; block?: boolean };
export function Button({ variant = 'secondary', size = 'md', icon, to, block, className = '', children, onClick, type = 'button', ...rest }: BtnProps) {
  return (
    <button type={type} className={`btn btn-${variant} btn-${size} ${block ? 'btn-block' : ''} ${className}`}
      onClick={(e) => { onClick?.(e); if (to && !e.defaultPrevented) navigate(to); }} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : size === 'xl' ? 26 : 18} />}
      {children && <span>{children}</span>}
    </button>
  );
}
export function IconButton({ icon, label, onClick, size = 20, className = '', ...rest }: { icon: string; label: string; onClick?: () => void; size?: number; className?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`icon-btn ${className}`} onClick={onClick} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={size} />
    </button>
  );
}

// ---------- Layout ----------
export function PageHeader({ title, lede, actions, backTo }: { title: ReactNode; lede?: ReactNode; actions?: ReactNode; backTo?: { to: string; label: string } }) {
  return (
    <header className="page-header">
      {backTo && <a className="back-link" href={`#${backTo.to}`}><Icon name="chevronL" size={16} />{backTo.label}</a>}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{title}</h1>
          {lede && <p className="page-lede">{lede}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </header>
  );
}
export function Panel({ title, children, action, className = '', as: As = 'section', id }: { title?: ReactNode; children: ReactNode; action?: ReactNode; className?: string; as?: 'section' | 'div' | 'article'; id?: string }) {
  return (
    <As className={`panel ${className}`} aria-labelledby={title && id ? `${id}-h` : undefined}>
      {(title || action) && (
        <div className="panel-head">
          {title && <h2 className="panel-title" id={id ? `${id}-h` : undefined}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </As>
  );
}
export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      <p className="empty-text">{text}</p>
      {action}
    </div>
  );
}

// ---------- Progress ----------
export function Meter({ value, max, label, tone = 'sage', detail, showOver = true }: { value: number; max: number; label: string; tone?: 'sage' | 'slate' | 'amber' | 'taupe'; detail?: string; showOver?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = showOver && max > 0 && value > max;
  return (
    <div className="meter">
      <div className="meter-row">
        <span className="meter-label">{label}</span>
        <span className="meter-value num">{detail ?? `${Math.round(value)} / ${Math.round(max)}`}</span>
      </div>
      {max > 0 && <div className={`meter-track tone-${over ? 'amber' : tone}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={Math.round(max)} aria-valuenow={Math.round(value)}>
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>}
    </div>
  );
}
export function Ring({ value, size = 64, stroke = 5, label, children }: { value: number; size?: number; stroke?: number; label: string; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-fill" strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - v)} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring-inner">{children}</div>
    </div>
  );
}

// ---------- Forms ----------
export function Field({ label, hint, error, children, id }: { label: string; hint?: ReactNode; error?: string | null; children: (id: string, describedBy?: string) => ReactNode; id?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  const hid = hint ? `${fid}-hint` : undefined;
  const eid = error ? `${fid}-err` : undefined;
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={fid} className="field-label">{label}</label>
      {children(fid, [hid, eid].filter(Boolean).join(' ') || undefined)}
      {hint && <p className="field-hint" id={hid}>{hint}</p>}
      {error && <p className="field-error" id={eid} role="alert">{error}</p>}
    </div>
  );
}
export function NumberInput({ value, onChange, step = 1, min = 0, max, ...rest }: { value: number | undefined | null; onChange: (v: number | undefined) => void; step?: number; min?: number; max?: number } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input type="number" inputMode="decimal" className="input num" value={value ?? ''} step={step} min={min} max={max}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} {...rest} />
  );
}
export function Stepper({ value, onChange, step = 1, min = 0, label, unit, decimals = 0 }: { value: number | undefined; onChange: (v: number) => void; step?: number; min?: number; label: string; unit?: string; decimals?: number }) {
  const v = value ?? 0;
  const set = (n: number) => onChange(Math.max(min, Math.round(n * 10 ** decimals) / 10 ** decimals));
  const id = useId();
  return (
    <div className="stepper">
      <label htmlFor={id} className="stepper-label">{label}{unit ? <span className="unit"> ({unit})</span> : null}</label>
      <div className="stepper-row">
        <button type="button" className="stepper-btn" aria-label={`Decrease ${label}`} onClick={() => set(v - step)}>−</button>
        <input id={id} type="number" inputMode="decimal" className="stepper-input num" value={value ?? ''} step={step} min={min}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(min, Number(e.target.value)))} />
        <button type="button" className="stepper-btn" aria-label={`Increase ${label}`} onClick={() => set(v + step)}>+</button>
      </div>
    </div>
  );
}
export function Chips<T extends string>({ options, value, onChange, multi = false, label, name }: { options: { value: T; label: string; hint?: string }[]; value: T[] | T; onChange: (v: any) => void; multi?: boolean; label: string; name?: string }) {
  const sel = Array.isArray(value) ? value : [value];
  return (
    <fieldset className="chips">
      <legend className="sr-only">{label}</legend>
      {options.map((o) => {
        const on = sel.includes(o.value);
        return (
          <label key={o.value} className={`chip ${on ? 'on' : ''}`}>
            <input type={multi ? 'checkbox' : 'radio'} name={name ?? label} checked={on} className="sr-only"
              onChange={() => multi ? onChange(on ? sel.filter((x) => x !== o.value) : [...sel, o.value]) : onChange(o.value)} />
            {on && multi && <Icon name="check" size={14} />}
            <span>{o.label}</span>
            {o.hint && <span className="chip-hint">{o.hint}</span>}
          </label>
        );
      })}
    </fieldset>
  );
}
export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="toggle-row">
      <div>
        <label htmlFor={id} className="toggle-label">{label}</label>
        {hint && <p className="field-hint">{hint}</p>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
        <span className="switch-knob" />
      </button>
    </div>
  );
}
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} onClose={onClose} onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-labelledby="modal-title">
      {open && (
        <div className="modal-inner">
          <div className="modal-head">
            <h2 id="modal-title" className="modal-title">{title}</h2>
            <IconButton icon="close" label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
export function Confirm({ open, onClose, onConfirm, title, text, confirmLabel, danger }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; text: ReactNode; confirmLabel: string; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button></>}>
      <p>{text}</p>
    </Modal>
  );
}

// ---------- Toasts ----------
export function Toasts() {
  const { toasts, dismissToast, saveError } = useApp();
  return (
    <div className="toasts" aria-live="polite" role="status">
      {saveError && <div className="toast tone-error">Changes couldn’t be saved in this browser (storage is full or blocked). Export your data from Profile to keep a copy.</div>}
      {toasts.map((t) => (
        <div key={t.id} className={`toast tone-${t.tone}`}>
          <span>{t.text}</span>
          {t.action && <button className="toast-action" onClick={() => { t.action!.run(); dismissToast(t.id); }}>{t.action.label}</button>}
          <button className="toast-close" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

export function Disclosure({ summary, children, defaultOpen }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="disclosure" open={defaultOpen}>
      <summary><span>{summary}</span><Icon name="chevronD" size={16} /></summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'sage' | 'amber' | 'terra' | 'slate' }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}
