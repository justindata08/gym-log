import { state, saveSettings, runSync } from '../state.js';
import { ping } from '../sync.js';
import { buildCsv } from '../csv.js';
import { h, appBar, download, toast } from '../ui.js';
import { londonIso } from '../time.js';
import { syncToast } from './sessions.js';

export function renderSettings(app) {
  const url = h('input', {
    type: 'url', inputmode: 'url', autocomplete: 'off', spellcheck: 'false',
    placeholder: 'https://script.google.com/macros/s/…/exec',
    onchange: save
  });
  url.value = state.settings.url;

  const token = h('input', {
    type: 'password', autocomplete: 'off', spellcheck: 'false',
    placeholder: 'Paste your secret token', onchange: save
  });
  token.value = state.settings.token;

  const showToken = h('button', {
    class: 'btn btn-ghost', type: 'button', text: 'Show',
    onclick: () => {
      token.type = token.type === 'password' ? 'text' : 'password';
      showToken.textContent = token.type === 'password' ? 'Show' : 'Hide';
    }
  });

  const result = h('p', { class: 'test-result', role: 'status' });
  const waiting = state.history.filter(r => r.sync?.status !== 'synced').length;
  const version = h('span', { text: '…' });
  getVersion().then(v => { version.textContent = v; });

  function save() {
    state.settings = { url: url.value.trim(), token: token.value.trim() };
    saveSettings();
  }

  async function test() {
    save();
    result.className = 'test-result';
    result.textContent = 'Testing…';
    try {
      const res = await ping(state.settings);
      result.className = 'test-result is-ok';
      result.textContent = `✓ ${res.message || 'Connected.'}`;
    } catch (err) {
      result.className = 'test-result is-bad';
      result.textContent = `✗ ${err.message}`;
    }
  }

  async function syncNow() {
    save();
    toast('Syncing…', { duration: 0 });
    syncToast(await runSync());
  }

  function exportCsv() {
    if (!state.history.length) { toast('No sessions to export yet.'); return; }
    download(`gym-log-${londonIso().slice(0, 10)}.csv`, buildCsv(state.history));
  }

  app.replaceChildren(
    h('header', { class: 'topbar' }, appBar({ title: 'Settings', back: '#/' })),
    h('main', { class: 'content settings' },
      h('section', { class: 'card' },
        h('h2', { class: 'card-h', text: 'Google Sheets sync' }),
        h('label', { class: 'field' }, h('span', { class: 'label', text: 'Apps Script web app URL' }), url),
        h('label', { class: 'field' }, h('span', { class: 'label', text: 'Secret token' }),
          h('div', { class: 'field-row' }, token, showToken)),
        h('p', { class: 'hint', text: 'Both are saved only on this phone. See SETUP.md for where to find them.' }),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn btn-primary', text: 'Test connection', onclick: test }),
          h('button', { class: 'btn btn-ghost', text: waiting ? `Sync now (${waiting})` : 'Sync now', onclick: syncNow })
        ),
        result
      ),
      h('section', { class: 'card' },
        h('h2', { class: 'card-h', text: 'Backup' }),
        h('p', { class: 'hint', text: 'Download every session on this phone as a CSV file (one row per set).' }),
        h('button', { class: 'btn btn-ghost btn-block', text: 'Export all data as CSV', onclick: exportCsv })
      ),
      h('p', { class: 'hint center' }, 'App version: ', version)
    )
  );
}

// Asks the service worker which cache version is running.
function getVersion() {
  const sw = navigator.serviceWorker?.controller;
  if (!sw) return Promise.resolve('not installed (no offline cache yet)');
  return new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = e => resolve(e.data);
    sw.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
    setTimeout(() => resolve('unknown'), 1000);
  });
}
