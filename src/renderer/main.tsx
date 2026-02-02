/** Renderer entry: mount React root with App and global styles. */
console.log('[GalNetOps] Renderer script loading, electron:', typeof window !== 'undefined' ? typeof (window as { electron?: unknown }).electron : 'no window');
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/index.css';

// Ensure every unhandled promise rejection is logged (safety: no silent failures)
window.addEventListener('unhandledrejection', (event) => {
  console.error('[unhandledrejection]', event.reason);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
