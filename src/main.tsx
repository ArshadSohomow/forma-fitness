import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { AppProvider } from './store';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AppProvider>
      <App />
    </AppProvider>
  </ErrorBoundary>,
);

// Offline support: cache the app shell so a dropped connection mid-workout doesn't break the app.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
