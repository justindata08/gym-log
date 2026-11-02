// The catalog list with its sticky search + filter chips.
// Used by the Catalog screen (browse) and the session's Catalog tab (pick).

import { state, saveStars } from './state.js';
import { filterCatalog, groupCatalog, PATTERNS, TIERS } from './catalog.js';
import { GROUP_ORDER } from '../data/exercises.js';
import { h, icon, tierBadge, patternLabel } from './ui.js';

// opts.mode: 'browse' or 'pick'
// opts.isAdded(id), opts.onToggleAdd(exercise) – only for 'pick'
export function renderCatalog(container, opts = { mode: 'browse' }) {
  const f = state.filters;
  const list = h('div', { class: 'catalog' });

  const chip = (label, active, onclick, extraClass = '') =>
    h('button', { class: `chip ${extraClass} ${active ? 'is-on' : ''}`, 'aria-pressed': String(active), text: label, onclick });

  const chipRow = (items, key) => h('div', { class: 'chip-row' },
    items.map(([value, label]) => chip(label, f[key] === value, () => { f[key] = value; refresh(); }))
  );

  const search = h('input', {
    class: 'search', type: 'search', placeholder: 'Search exercises, muscles, equipment',
    value: f.q, 'aria-label': 'Search',
    oninput: () => { f.q = search.value; renderList(); }
  });

  const filterBar = h('div', { class: 'filterbar' });

  function renderFilters() {
    filterBar.replaceChildren(
      search,
      h('div', { class: 'chip-row' },
        [['All', 'All'], ...PATTERNS.map(p => [p, p])].map(([value, label]) =>
          chip(label, f.pattern === value, () => { f.pattern = value; refresh(); })),
        h('span', { class: 'chip-sep' }),
        chip('★ Starred', f.starred, () => { f.starred = !f.starred; refresh(); }, 'chip-star')
      ),
      chipRow([['All', 'All groups'], ...GROUP_ORDER.map(g => [g, g])], 'group'),
      chipRow([['All', 'All priorities'], ...TIERS.map(t => [t, `M${t}`])], 'tier')
    );
  }

  function renderList() {
    const groups = groupCatalog(filterCatalog(state.catalog, f, state.stars));
    if (!groups.length) {
      list.replaceChildren(h('p', { class: 'empty', text: 'No exercises match these filters.' }));
      return;
    }
    list.replaceChildren(...groups.map(g => h('section', { class: 'group' },
      h('div', { class: 'group-head' },
        h('h2', { text: g.group }),
        h('span', { class: 'group-count', text: g.label })
      ),
      h('ul', { class: 'rows' }, g.items.map(ex => exerciseRow(ex)))
    )));
  }

  function exerciseRow(ex) {
    const starred = state.stars.has(ex.id);
    const added = opts.mode === 'pick' && opts.isAdded(ex.id);
    const starBtn = h('button', {
      class: `star ${starred ? 'is-on' : ''}`,
      'aria-label': starred ? `Unstar ${ex.name}` : `Star ${ex.name}`,
      'aria-pressed': String(starred),
      text: starred ? '★' : '☆',
      onclick: e => {
        e.stopPropagation();
        if (state.stars.has(ex.id)) state.stars.delete(ex.id); else state.stars.add(ex.id);
        saveStars();
        renderList();
      }
    });
    const addBtn = opts.mode === 'pick' ? h('button', {
      class: `add-btn ${added ? 'is-on' : ''}`,
      'aria-label': added ? `Remove ${ex.name} from session` : `Add ${ex.name} to session`,
      'aria-pressed': String(added),
      onclick: e => { e.stopPropagation(); toggle(); }
    }, icon(added ? 'check' : 'plus')) : null;

    const toggle = () => { opts.onToggleAdd(ex); renderList(); };

    return h('li', {
      class: `row ${added ? 'is-added' : ''} ${opts.mode === 'pick' ? 'is-pickable' : ''}`,
      onclick: opts.mode === 'pick' ? toggle : null
    },
      tierBadge(ex.tier),
      h('div', { class: 'row-main' },
        h('div', { class: 'row-name', text: ex.name }),
        h('div', { class: 'row-meta' }, patternLabel(ex.pattern), h('span', { text: ex.muscles })),
        h('div', { class: 'row-equip', text: ex.equipment }),
        h('div', { class: 'row-note', text: ex.note })
      ),
      h('div', { class: 'row-actions' }, starBtn, addBtn)
    );
  }

  function refresh() {
    renderFilters();
    renderList();
  }

  refresh();
  container.append(filterBar, list);
  return { refresh: renderList };
}
