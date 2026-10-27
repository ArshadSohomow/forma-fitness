import { useEffect, useState } from 'react';

// Hash routing keeps the app working on any static host (Cloudflare Pages included) without rewrite rules.
const current = () => (window.location.hash.replace(/^#/, '') || '/').split('?')[0].split('#')[0];

export function useRoute() {
  const [path, setPath] = useState(current);
  useEffect(() => {
    const on = () => { setPath(current()); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  const url = `#${path}`;
  if (opts.replace) window.history.replaceState(null, '', url);
  else window.location.hash = path;
  if (opts.replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
  window.scrollTo({ top: 0 });
}

export function query(): URLSearchParams {
  const q = window.location.hash.split('?')[1] ?? '';
  return new URLSearchParams(q);
}

export function back(fallback = '/') {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback);
}

export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean), b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}
