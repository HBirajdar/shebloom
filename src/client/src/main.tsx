// TODO: Initialize Sentry for frontend error tracking (npm install @sentry/react)
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/index.css';

// ─── Service Worker registration ─────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[VedaClue SW] registered, scope:', reg.scope);
        // Check for updates every 60 seconds
        setInterval(() => reg.update(), 60_000);
      })
      .catch(err => console.warn('[VedaClue SW] registration failed:', err));
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 2, refetchOnWindowFocus: false },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster position="top-center" toastOptions={{
          duration: 3000,
          style: { borderRadius: '12px', background: '#333', color: '#fff' },
        }} />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
