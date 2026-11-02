// Start-up, screen routing and the service worker.
// Screens are chosen by the part of the URL after "#", e.g. #/sessions.

import { state, loadState, runSync, reloadHistory } from './state.js';
import { toast } from './ui.js';
import { renderHome } from './screens/home.js';
import { renderCatalogScreen } from './screens/catalog.js';
import { renderSessions, renderSessionDetail } from './screens/sessions.js';
import { renderActive } from './screens/active.js';
import { renderSettings } from './screens/settings.js';

const ROUTES = [
  [/^#\/?$/, renderHome],
  [/^#\/catalog$/, renderCatalogScreen],
  [/^#\/sessions$/, renderSessions],
  [/^#\/sessions\/([\w-]+)$/, renderSessionDetail],
  [/^#\/session(?:\/(catalog|live))?$/, renderActive],
  [/^#\/settings$/, renderSettings]
];

const app = document.getElementById('app');
let cleanup = null;
let lastHash = null;

function render() {
  cleanup?.();
  cleanup = null;
  const hash = location.hash || '#/';
  for (const [pattern, screen] of ROUTES) {
    const match = hash.match(pattern);
    if (match) {
      const sameScreen = hash === lastHash;
      lastHash = hash;
      const scrollY = window.scrollY;
      cleanup = screen(app, ...match.slice(1)) || null;
      window.scrollTo(0, sameScreen ? scrollY : 0);
      return;
    }
  }
  location.replace('#/');
}

// After a sync, refresh screens that show sync status (not the live session).
window.addEventListener('gymlog:synced', () => {
  const hash = location.hash || '#/';
  if (hash === '#/' || hash.startsWith('#/sessions')) render();
});

async function start() {
  await loadState();
  // Reopening the app mid-session goes straight back to it.
  if (state.active && (!location.hash || location.hash === '#/')) location.replace('#/session');
  window.addEventListener('hashchange', render);
  render();

  runSync();
  window.addEventListener('online', () => runSync());
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    await reloadHistory();
    runSync();
    registration?.update().catch(() => {});
  });

  registerServiceWorker();
}

let registration = null;

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    registration = await navigator.serviceWorker.register('./sw.js');
  } catch (err) {
    console.warn('Service worker not registered:', err);
    return;
  }
  let updateRequested = false;

  const offerUpdate = worker => {
    toast('Update available', {
      actionLabel: 'Reload',
      duration: 0,
      onAction: () => {
        updateRequested = true;
        worker.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  };

  if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      // Only offer a reload when replacing an older version, not on first install.
      if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
    });
  });

  // The new version takes over once you tap Reload; then load it.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updateRequested) location.reload();
  });
}

start();
