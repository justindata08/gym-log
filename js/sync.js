// Sending completed sessions to the Google Apps Script.
//
// Every completed session sits in the "sessions" store with a sync status:
//   pending – saved on the phone, not sent yet (e.g. offline)
//   failed  – a send was tried and didn't work (error message kept)
//   synced  – the Sheet has it
// syncPending() retries everything that isn't synced. The script ignores session IDs
// it already has, so sending the same session twice never creates duplicates.

import { toSheetRows } from './session.js';
import { londonIso } from './time.js';

const TIMEOUT_MS = 30000;

// POSTs JSON as text/plain. A "simple" request like this skips the CORS preflight,
// which Apps Script can't answer. Apps Script replies with a redirect to
// googleusercontent.com, which fetch follows; that response is readable.
export async function postToScript(settings, payload, fetchFn = fetch) {
  if (!settings.url) throw new Error('No Apps Script URL in Settings.');
  if (!settings.token) throw new Error('No secret token in Settings.');
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller && setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetchFn(settings.url.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...payload, token: settings.token.trim() }),
      redirect: 'follow',
      signal: controller?.signal
    });
  } catch (err) {
    throw new Error(err?.name === 'AbortError' ? 'Timed out talking to Google.' : 'Network error — no connection to Google.');
  } finally {
    if (timer) clearTimeout(timer);
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Script didn't reply with JSON (HTTP ${res.status}). Check the URL ends in /exec and access is "Anyone".`);
  }
  if (!data.ok) throw new Error(data.error || 'The script reported an error.');
  return data;
}

export function ping(settings, fetchFn = fetch) {
  return postToScript(settings, { action: 'ping' }, fetchFn);
}

export function sendSession(settings, rec, fetchFn = fetch) {
  const { session, sets } = toSheetRows(rec);
  return postToScript(settings, { action: 'saveSession', session, sets }, fetchFn);
}

let running = null;

// repo: { listSessions(), saveSession(rec), getSettings() }
// Returns { synced, failed, waiting } counts.
export function syncPending(repo, opts = {}) {
  // If a sync is already running, wait for it rather than sending twice at once.
  if (!running) running = doSync(repo, opts).finally(() => { running = null; });
  return running;
}

async function doSync(repo, { fetchFn = fetch, isOnline = defaultIsOnline, onlyId = null } = {}) {
  const settings = await repo.getSettings();
  const all = await repo.listSessions();
  const todo = all
    .filter(r => r.sync?.status !== 'synced' && (!onlyId || r.id === onlyId))
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  const result = { synced: 0, failed: 0, waiting: 0 };

  for (const rec of todo) {
    if (!settings.url || !settings.token) {
      rec.sync = { ...rec.sync, status: 'pending', error: 'Add the Apps Script URL and token in Settings.' };
      await repo.saveSession(rec);
      result.waiting++;
      continue;
    }
    if (!isOnline()) {
      if (rec.sync.status !== 'failed') rec.sync = { ...rec.sync, status: 'pending', error: null };
      await repo.saveSession(rec);
      result.waiting++;
      continue;
    }
    const attempt = londonIso();
    try {
      await sendSession(settings, rec, fetchFn);
      rec.sync = { status: 'synced', error: null, lastAttempt: attempt, syncedAt: londonIso() };
      result.synced++;
    } catch (err) {
      rec.sync = { ...rec.sync, status: 'failed', error: err.message, lastAttempt: attempt };
      result.failed++;
    }
    await repo.saveSession(rec);
  }
  return result;
}

function defaultIsOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}
