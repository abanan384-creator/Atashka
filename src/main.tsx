import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register PWA Service Worker for offline shell and notifications
if (typeof window !== 'undefined') {
  // Purge any old broken cache
  if ('caches' in window) {
    window.caches.keys().then((keys) => {
      keys.forEach((key) => {
        if (key === 'sma-cache-v1') {
          window.caches.delete(key);
        }
      });
    });
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch(() => {});
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
