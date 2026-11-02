import { state } from '../state.js';
import { h, appBar, icon } from '../ui.js';
import { fmtClock } from '../time.js';

export function renderHome(app) {
  const s = state.active;
  const waiting = state.history.filter(r => r.sync?.status !== 'synced').length;
  const notSetUp = !state.settings.url || !state.settings.token;

  const timer = h('span', { class: 'resume-time' });
  const tick = () => { if (s) timer.textContent = fmtClock(Date.now() - Date.parse(s.startedAt)); };
  tick();
  const id = s ? setInterval(tick, 1000) : null;

  app.replaceChildren(
    h('header', { class: 'topbar' },
      appBar({
        title: 'Gym Log',
        actions: [h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': 'Settings' }, icon('gear'))]
      })
    ),
    h('main', { class: 'content home' },
      s ? h('a', { class: 'resume', href: '#/session' },
        h('div', {},
          h('div', { class: 'resume-title', text: 'Resume session' }),
          h('div', { class: 'resume-meta' }, timer, ` · ${s.exercises.length} exercise${s.exercises.length === 1 ? '' : 's'}`)
        ),
        h('span', { class: 'resume-go', text: '›' })
      ) : null,
      h('a', { class: 'tile', href: '#/catalog' },
        h('span', { class: 'tile-title', text: 'Catalog' }),
        h('span', { class: 'tile-sub', text: `${state.catalog.length} exercises · ${state.stars.size} starred` })
      ),
      h('a', { class: 'tile', href: '#/sessions' },
        h('span', { class: 'tile-title', text: 'Sessions' }),
        h('span', { class: 'tile-sub', text: `${state.history.length} logged` + (waiting ? ` · ${waiting} waiting to sync` : '') })
      ),
      notSetUp ? h('a', { class: 'notice', href: '#/settings' },
        'Sync isn’t set up yet. Sessions are saved on this phone. Tap to add your Apps Script URL and token.'
      ) : null
    )
  );
  return () => clearInterval(id);
}
