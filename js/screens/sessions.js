// Sessions list and the read-only view of one past session.

import { state, saveActive, runSync } from '../state.js';
import { newSession, sessionStats, formatSet } from '../session.js';
import { h, appBar, syncPill, tierBadge, toast } from '../ui.js';
import { fmtDay, fmtTime, fmtMinutes } from '../time.js';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export async function retrySync(rec) {
  toast('Syncing…', { duration: 0 });
  const result = await runSync({ onlyId: rec?.id ?? null });
  syncToast(result);
}

export function syncToast({ synced, failed, waiting }) {
  if (failed) toast(`Sync failed for ${failed} session${failed === 1 ? '' : 's'}. Tap “Failed” to see why.`);
  else if (synced) toast(`Synced to Google Sheets ✓`);
  else if (waiting) toast('Saved on phone. Will sync when online and set up.');
  else document.querySelector('.toast')?.remove();
}

export function startOrResume() {
  if (!state.active) {
    state.active = newSession();
    saveActive();
    location.hash = '#/session/catalog';
  } else {
    location.hash = '#/session';
  }
}

export function renderSessions(app) {
  const list = state.history;
  app.replaceChildren(
    h('header', { class: 'topbar' }, appBar({ title: 'Sessions', back: '#/' })),
    h('main', { class: 'content' },
      h('button', {
        class: 'btn btn-primary btn-lg btn-block',
        text: state.active ? 'Resume session in progress' : 'Start new session',
        onclick: startOrResume
      }),
      list.length
        ? h('ul', { class: 'rows session-list' }, list.map(rec => {
          const st = sessionStats(rec);
          return h('li', { class: 'row session-row', onclick: () => { location.hash = `#/sessions/${rec.id}`; } },
            h('div', { class: 'row-main' },
              h('div', { class: 'row-name', text: `${fmtDay(rec.startedAt)} · ${fmtTime(rec.startedAt)}` }),
              h('div', { class: 'row-equip', text: `${fmtMinutes(st.minutes)} · ${plural(st.exercises, 'exercise')} · ${plural(st.sets, 'set')}` })
            ),
            syncPill(rec, retrySync)
          );
        }))
        : h('p', { class: 'empty', text: 'No sessions yet. Start one and it will appear here.' })
    )
  );
}

export function renderSessionDetail(app, id) {
  const rec = state.history.find(r => r.id === id);
  if (!rec) { location.replace('#/sessions'); return; }
  const st = sessionStats(rec);
  const sync = rec.sync || {};

  app.replaceChildren(
    h('header', { class: 'topbar' }, appBar({ title: fmtDay(rec.startedAt), back: '#/sessions' })),
    h('main', { class: 'content' },
      h('div', { class: 'detail-head' },
        h('div', { class: 'detail-meta', text: `${fmtTime(rec.startedAt)}–${fmtTime(rec.endedAt)} · ${fmtMinutes(st.minutes)} · ${plural(st.exercises, 'exercise')} · ${plural(st.sets, 'set')}` }),
        h('div', { class: 'detail-sync' },
          syncPill(rec, retrySync),
          sync.error && sync.status !== 'synced'
            ? h('span', { class: sync.status === 'failed' ? 'sync-error' : 'hint', text: sync.error })
            : null
        )
      ),
      rec.notes ? h('p', { class: 'detail-notes', text: rec.notes }) : null,
      rec.exercises.map((e, i) => h('section', { class: 'card' },
        h('div', { class: 'card-head' },
          h('span', { class: 'card-order', text: String(i + 1) }),
          tierBadge(e.tier),
          h('div', { class: 'card-title' },
            h('div', { class: 'row-name', text: e.name }),
            h('div', { class: 'row-equip', text: e.loadType })
          )
        ),
        h('ol', { class: 'done-sets' }, e.sets.map(s => h('li', { text: formatSet(s, e.loadType) }))),
        e.notes ? h('p', { class: 'row-note', text: e.notes }) : null
      ))
    )
  );
}
