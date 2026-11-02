// Catalog data and filtering (no screen code).

import { EXERCISES, GROUP_ORDER, BODYWEIGHT_DEFAULTS } from '../data/exercises.js';

export const PATTERNS = ['Push', 'Pull', 'Neutral'];
export const TIERS = [1, 2, 3, 4, 5];

export function slugify(name) {
  return name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Turns the rows in data/exercises.js into objects.
export function buildCatalog(rows = EXERCISES) {
  const bodyweight = new Set(BODYWEIGHT_DEFAULTS);
  return rows.map(([name, group, pattern, tier, equipment, muscles, note]) => ({
    id: slugify(name),
    name, group, pattern, tier, equipment, muscles, note,
    bodyweight: bodyweight.has(name)
  }));
}

export const DEFAULT_FILTERS = { q: '', pattern: 'All', group: 'All', tier: 'All', starred: false };

export function filterCatalog(list, filters, stars = new Set()) {
  const words = filters.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter(ex => {
    if (filters.pattern !== 'All' && ex.pattern !== filters.pattern) return false;
    if (filters.group !== 'All' && ex.group !== filters.group) return false;
    if (filters.tier !== 'All' && ex.tier !== filters.tier) return false;
    if (filters.starred && !stars.has(ex.id)) return false;
    if (words.length) {
      const text = `${ex.name} ${ex.group} ${ex.pattern} ${ex.muscles} ${ex.equipment} ${ex.note}`.toLowerCase();
      if (!words.every(w => text.includes(w))) return false;
    }
    return true;
  });
}

// Groups in GROUP_ORDER, each sorted by tier (M1 first). Empty groups are left out.
export function groupCatalog(list) {
  const groups = [];
  const known = new Set(GROUP_ORDER);
  const extra = [...new Set(list.map(e => e.group))].filter(g => !known.has(g));
  for (const group of [...GROUP_ORDER, ...extra]) {
    const items = list.filter(e => e.group === group).sort((a, b) => a.tier - b.tier);
    if (items.length) groups.push({ group, items, label: groupCountLabel(items) });
  }
  return groups;
}

// "10 · 4 push · 6 pull"
export function groupCountLabel(items) {
  const parts = [String(items.length)];
  for (const p of PATTERNS) {
    const n = items.filter(e => e.pattern === p).length;
    if (n) parts.push(`${n} ${p.toLowerCase()}`);
  }
  return parts.join(' · ');
}
