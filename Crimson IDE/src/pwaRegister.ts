/**
 * Safe Service Worker Registration
 * Registers the offline PWA service worker with graceful error handling
 * for restricted environments (sandboxed iframes, private browsing).
 */

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Delay registration until window is loaded to not block primary rendering
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Check for updates periodically
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New content available; please refresh.');
              }
            });
          }
        });
      })
      .catch((err) => {
        // Sandboxed iframes without allow-same-origin or specific flags may block SW
        console.warn('[PWA] Service worker registration notice:', err?.message || err);
      });
  });
}
