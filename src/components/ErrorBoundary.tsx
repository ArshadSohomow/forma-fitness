import { Component, type ReactNode } from 'react';
import { STORAGE_KEY } from '../store';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('FORMA error', error); }
  render() {
    if (!this.state.error) return this.props.children;
    const download = () => {
      const raw = (() => { try { return localStorage.getItem(STORAGE_KEY) ?? '{}'; } catch { return '{}'; } })();
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([raw], { type: 'application/json' })); a.download = 'forma-backup.json'; a.click();
    };
    return (
      <div style={{ maxWidth: 560, margin: '10vh auto', padding: 24 }}>
        <h1 className="page-title">Something went wrong on this screen</h1>
        <p className="page-lede" style={{ margin: '12px 0 24px' }}>Your saved data is safe in this browser. Go back to Today, or download a backup first if you’d like.</p>
        <div className="row">
          <button className="btn btn-primary btn-md" onClick={() => { this.setState({ error: null }); window.location.hash = '/'; }}>Go to Today</button>
          <button className="btn btn-secondary btn-md" onClick={download}>Download backup</button>
        </div>
      </div>
    );
  }
}
