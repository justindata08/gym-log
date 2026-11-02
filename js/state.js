// App state held in memory, and saving it to IndexedDB.

import * as db from './db.js';
import { buildCatalog, DEFAULT_FILTERS } from './catalog.js';
import { syncPending } from './sync.js';

const catalog = buildCatalog();

export const state = {
  catalog,                                      // all exercises
  byId: new Map(catalog.map(e => [e.id, e])),
  stars: new Set(),                             // starred exercise ids
  filters: { ...DEFAULT_FILTERS },              // catalog search + chips (not saved)
  active: null,                                 // session in progress, or null
  history: [],                                  // completed sessions, newest first
  settings: { url: '', token: '' }
};

export async function loadState() {
  const [stars, active, settings, history] = await Promise.all([
    db.get('kv', 'stars'),
    db.get('kv', 'active'),
    db.get('kv', 'settings'),
    db.getAll('sessions')
  ]);
  state.stars = new Set(stars || []);
  state.active = active || null;
  state.settings = { url: '', token: '', ...(settings || {}) };
  state.history = sortNewestFirst(history);
}

const sortNewestFirst = list => [...list].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

// Called after every change to the active session, so nothing is lost if the app is killed.
export function saveActive() {
  return state.active ? db.put('kv', state.active, 'active') : db.del('kv', 'active');
}

export function saveStars() {
  return db.put('kv', [...state.stars], 'stars');
}

export function saveSettings() {
  return db.put('kv', state.settings, 'settings');
}

export async function addToHistory(rec) {
  await db.put('sessions', rec);
  await reloadHistory();
}

export async function reloadHistory() {
  state.history = sortNewestFirst(await db.getAll('sessions'));
}

// What sync.js needs to read and write the outbox.
export const repo = {
  listSessions: () => db.getAll('sessions'),
  saveSession: rec => db.put('sessions', rec),
  getSettings: async () => state.settings
};

// Runs a sync, then tells the screens to refresh.
export async function runSync(opts = {}) {
  const result = await syncPending(repo, opts);
  await reloadHistory();
  window.dispatchEvent(new CustomEvent('gymlog:synced', { detail: result }));
  return result;
}
