// Small DOM helpers shared by every screen.

// h('button', { class: 'btn', onclick: fn }, 'Label') creates an element.
// Props starting with "on" become event listeners; `text` sets textContent;
// `dataset` and `style` objects are copied; false/null props are skipped.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key in el && typeof value !== 'string') el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

// The bar at the top of each screen. `back` is a link (e.g. '#/'), `actions` extra buttons.
export function appBar({ title, back = null, actions = [] }) {
  return h('div', { class: 'appbar' },
    back ? h('a', { class: 'icon-btn', href: back, 'aria-label': 'Back' }, icon('back')) : null,
    h('h1', { text: title }),
    h('div', { class: 'appbar-actions' }, actions)
  );
}

// Keeps the sticky filter bar just under the top bar.
export function syncTopbarHeight() {
  const bar = document.querySelector('.topbar');
  document.documentElement.style.setProperty('--topbar-h', `${bar ? bar.offsetHeight : 0}px`);
}

export function tierBadge(tier) {
  return h('span', { class: `tier tier-${tier}`, text: `M${tier}`, title: `Priority M${tier}` });
}

export function patternLabel(pattern) {
  return h('span', { class: `pattern pattern-${pattern.toLowerCase()}`, text: pattern });
}

const ICONS = {
  back: 'M15 5l-7 7 7 7',
  gear: 'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 13a7.5 7.5 0 000-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 00-1.7-1L15 3.5h-4l-.4 2.5a7.4 7.4 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 000 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 001.7 1l.4 2.5h4l.4-2.5a7.4 7.4 0 001.7-1l2.4 1 2-3.4z',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13'
};

export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', ICONS[name]);
  svg.append(path);
  return svg;
}

// ----- Toast (small message at the bottom) -----

let toastTimer = null;

export function toast(message, { actionLabel = null, onAction = null, duration = 4000 } = {}) {
  document.querySelector('.toast')?.remove();
  clearTimeout(toastTimer);
  const el = h('div', { class: 'toast', role: 'status' },
    h('span', { text: message }),
    actionLabel ? h('button', {
      class: 'toast-action',
      text: actionLabel,
      onclick: () => { el.remove(); onAction?.(); }
    }) : null
  );
  document.body.append(el);
  if (duration) toastTimer = setTimeout(() => el.remove(), duration);
  return el;
}

// ----- Confirmation sheet (replaces alert/confirm) -----

// actions: [{ label, value, style: 'primary' | 'danger' | 'ghost' }]
// Resolves with the chosen action's value, or null if dismissed.
export function sheet({ title, message = '', actions }) {
  return new Promise(resolve => {
    const close = value => {
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const onKey = e => { if (e.key === 'Escape') close(null); };
    const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('h2', { text: title }),
      message ? h('p', { class: 'sheet-msg', text: message }) : null,
      h('div', { class: 'sheet-actions' },
        actions.map(a => h('button', {
          class: `btn btn-lg btn-${a.style || 'ghost'}`,
          text: a.label,
          onclick: () => close(a.value)
        }))
      )
    );
    const backdrop = h('div', { class: 'sheet-backdrop', onclick: e => { if (e.target === backdrop) close(null); } }, panel);
    document.addEventListener('keydown', onKey);
    document.body.append(backdrop);
    panel.querySelector('button')?.focus();
  });
}

export function download(filename, text, mime = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function syncPill(rec, onRetry) {
  const status = rec.sync?.status || 'pending';
  const label = { pending: 'Saved on phone', synced: 'Synced', failed: 'Failed · retry' }[status];
  if (status === 'synced') return h('span', { class: 'pill pill-synced', text: label });
  return h('button', {
    class: `pill pill-${status}`,
    text: label,
    title: rec.sync?.error || 'Tap to sync now',
    onclick: e => { e.stopPropagation(); onRetry(rec); }
  });
}
