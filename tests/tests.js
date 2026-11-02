// Tests for the core logic. Run them by opening tests/test.html in a browser,
// or with Node: node tests/run-node.mjs
// `codeGsSource` is the text of apps-script/Code.gs (the runner loads it).

import {
  newSession, addExercise, toggleExercise, removeExercise, restoreExercise, moveExercise,
  addSet, removeSet, setLoadType, completeSession, lastTimeFor, toSheetRows,
  defaultLoadType, untickedSetCount, parseWeight, stepValue, formatSet
} from '../js/session.js';
import { buildCatalog, filterCatalog, groupCatalog, groupCountLabel } from '../js/catalog.js';
import { londonIso } from '../js/time.js';
import { syncPending, sendSession, ping } from '../js/sync.js';
import { buildCsv } from '../js/csv.js';
import { loadFakeAppsScript } from './fake-apps-script.js';

export async function runTests(codeGsSource, report = console.log) {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, ok: true }); report(`✓ ${name}`); }
    catch (err) { results.push({ name, ok: false, error: err }); report(`✗ ${name}\n    ${err.message}`); }
  };
  const eq = (actual, expected, msg = '') => {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
  };
  const ok = (value, msg) => { if (!value) throw new Error(msg || 'expected truthy'); };

  const catalog = buildCatalog();
  const ex = name => catalog.find(e => e.name.startsWith(name));
  const settings = { url: 'https://script.google.com/macros/s/fake/exec', token: 'test-token' };

  // Builds a completed session with one exercise and the given [weight, reps] sets.
  const completed = (exName, sets, startedAt) => {
    const s = newSession(new Date(startedAt));
    const entry = addExercise(s, ex(exName));
    entry.sets = [];
    for (const [weight, reps] of sets) {
      const set = addSet(entry);
      Object.assign(set, { weight, reps, done: true });
    }
    return completeSession(s, { now: new Date(Date.parse(startedAt) + 45 * 60000) });
  };

  // In-memory stand-in for IndexedDB.
  const memoryRepo = (records, repoSettings = settings) => {
    const store = new Map(records.map(r => [r.id, structuredClone(r)]));
    return {
      store,
      listSessions: async () => [...store.values()].map(r => structuredClone(r)),
      saveSession: async r => { store.set(r.id, structuredClone(r)); },
      getSettings: async () => repoSettings
    };
  };

  // ----- Catalog -----

  await test('catalog: every exercise has a unique id', () => {
    eq(new Set(catalog.map(e => e.id)).size, catalog.length);
  });

  await test('catalog: groups follow display order and sort by tier', () => {
    const groups = groupCatalog(catalog);
    eq(groups.map(g => g.group), ['Back', 'Chest', 'Shoulders', 'Arms', 'Quads & knees', 'Glutes & hamstrings', 'Hips', 'Calves & shins', 'Core']);
    for (const g of groups) {
      const tiers = g.items.map(e => e.tier);
      eq(tiers, [...tiers].sort((a, b) => a - b), `${g.group} tiers`);
    }
  });

  await test('catalog: group count label', () => {
    const chest = catalog.filter(e => e.group === 'Chest');
    eq(groupCountLabel(chest), '7 · 7 push');
    const shoulders = catalog.filter(e => e.group === 'Shoulders');
    eq(groupCountLabel(shoulders), '10 · 6 push · 4 pull');
  });

  await test('catalog: filters combine (pattern, tier, search, starred)', () => {
    const f = { q: '', pattern: 'Pull', group: 'All', tier: 1, starred: false };
    eq(filterCatalog(catalog, f).map(e => e.name).length, 5);
    eq(filterCatalog(catalog, { ...f, pattern: 'All', tier: 'All', q: 'rear delt' }).length > 0, true);
    const stars = new Set([ex('Face pull').id]);
    eq(filterCatalog(catalog, { q: '', pattern: 'All', group: 'All', tier: 'All', starred: true }, stars).map(e => e.name), ['Face pull']);
  });

  // ----- Load-type defaults -----

  await test('load type: bodyweight exercises default to Bodyweight', () => {
    for (const name of ['Pull-up', 'Push-up', 'Dead bug', 'Plank', 'Inverted row', 'Hanging knee', 'Nordic curl', 'Copenhagen', 'Single-leg glute bridge', 'Tibialis raise']) {
      eq(defaultLoadType(ex(name)), 'Bodyweight', name);
    }
  });

  await test('load type: everything else defaults to Weighted', () => {
    for (const name of ['Lat pulldown', 'Romanian deadlift', 'Leg press', 'Cable crunch']) {
      eq(defaultLoadType(ex(name)), 'Weighted', name);
    }
  });

  await test('load type: bodyweight starts at 0 kg, weighted starts empty', () => {
    const s = newSession();
    eq(addExercise(s, ex('Pull-up')).sets[0].weight, 0);
    eq(addExercise(s, ex('Leg press')).sets[0].weight, null);
  });

  await test('load type: last time’s load type and first set are reused', () => {
    const s = newSession();
    const last = { loadType: 'Assisted', sets: [{ weight: 20, reps: 8 }] };
    const entry = addExercise(s, ex('Pull-up'), last);
    eq(entry.loadType, 'Assisted');
    eq([entry.sets[0].weight, entry.sets[0].reps], [20, 8]);
  });

  await test('load type: switching resets unticked sets sensibly', () => {
    const s = newSession();
    const entry = addExercise(s, ex('Leg press'));
    entry.sets[0].weight = 100;
    addSet(entry).done = true;
    setLoadType(entry, 'Bodyweight');
    eq(entry.sets.map(x => x.weight), [0, 100], 'to Bodyweight');
    setLoadType(entry, 'Assisted');
    eq(entry.sets.map(x => x.weight), [null, 100], 'away from Bodyweight');
  });

  // ----- Adding and removing exercises -----

  await test('exercises: add, toggle off, toggle on, no duplicates', () => {
    const s = newSession();
    toggleExercise(s, ex('Leg press'));
    toggleExercise(s, ex('Face pull'));
    addExercise(s, ex('Leg press'));
    eq(s.exercises.map(e => e.name), ['Leg press', 'Face pull']);
    const r = toggleExercise(s, ex('Leg press'));
    eq(r.added, false);
    eq(s.exercises.map(e => e.name), ['Face pull']);
    toggleExercise(s, ex('Leg press'));
    eq(s.exercises.map(e => e.name), ['Face pull', 'Leg press']);
  });

  await test('exercises: undo puts it back in the same place with its sets', () => {
    const s = newSession();
    addExercise(s, ex('Leg press'));
    const mid = addExercise(s, ex('Face pull'));
    addExercise(s, ex('Dead bug'));
    mid.sets[0].reps = 12;
    const removed = removeExercise(s, ex('Face pull').id);
    restoreExercise(s, removed);
    eq(s.exercises.map(e => e.name), ['Leg press', 'Face pull', 'Dead bug']);
    eq(s.exercises[1].sets[0].reps, 12);
  });

  await test('exercises: reorder up and down, stops at the ends', () => {
    const s = newSession();
    const a = addExercise(s, ex('Leg press'));
    const b = addExercise(s, ex('Face pull'));
    eq(moveExercise(s, a.entryId, -1), false);
    eq(moveExercise(s, b.entryId, -1), true);
    eq(s.exercises.map(e => e.name), ['Face pull', 'Leg press']);
    eq(moveExercise(s, a.entryId, 1), false);
  });

  // ----- Sets -----

  await test('sets: "Add set" copies the previous set’s values, not its tick', () => {
    const s = newSession();
    const entry = addExercise(s, ex('Leg press'));
    Object.assign(entry.sets[0], { weight: 120, reps: 10, rir: 2, done: true });
    const copy = addSet(entry);
    eq([copy.weight, copy.reps, copy.rir, copy.done], [120, 10, 2, false]);
    ok(copy.id !== entry.sets[0].id, 'new set needs its own id');
  });

  await test('sets: delete removes only that set', () => {
    const s = newSession();
    const entry = addExercise(s, ex('Leg press'));
    const second = addSet(entry);
    addSet(entry);
    removeSet(entry, second.id);
    eq(entry.sets.length, 2);
    ok(!entry.sets.some(x => x.id === second.id));
  });

  await test('sets: steppers and comma decimals', () => {
    eq(stepValue(null, 2.5), 2.5);
    eq(stepValue(60, -2.5), 57.5);
    eq(stepValue(1, -2.5), 0);
    eq(parseWeight('62,5'), 62.5);
    eq(parseWeight(''), null);
  });

  await test('sets: display format per load type', () => {
    eq(formatSet({ weight: 60, reps: 8, rir: 2 }, 'Weighted'), '60 kg × 8 @2');
    eq(formatSet({ weight: 0, reps: 10, rir: null }, 'Bodyweight'), 'BW × 10');
    eq(formatSet({ weight: 10, reps: 6, rir: null }, 'Bodyweight'), 'BW+10 kg × 6');
    eq(formatSet({ weight: 20, reps: 8, rir: null }, 'Assisted'), '−20 kg × 8');
  });

  // ----- Completing -----

  await test('complete: drops empty sets and empty exercises; can drop unticked', () => {
    const s = newSession(new Date('2026-11-02T18:00:00Z'));
    const a = addExercise(s, ex('Leg press'));
    Object.assign(a.sets[0], { weight: 100, reps: 10, done: true });
    addSet(a).done = false;               // has reps, unticked
    addSet(a).reps = null;                // no reps → dropped
    addExercise(s, ex('Face pull'));      // nothing logged → dropped
    eq(untickedSetCount(s), 1);
    const keepAll = completeSession(s, { now: new Date('2026-11-02T18:50:00Z') });
    eq(keepAll.exercises.map(e => e.sets.length), [2]);
    const ticked = completeSession(s, { dropUnticked: true });
    eq(ticked.exercises.map(e => e.sets.length), [1]);
    eq(keepAll.sync.status, 'pending');
  });

  await test('last time: finds the most recent session with that exercise', () => {
    const older = completed('Leg press', [[100, 10]], '2026-10-01T18:00:00Z');
    const newer = completed('Leg press', [[110, 8], [110, 8]], '2026-10-20T18:00:00Z');
    const other = completed('Face pull', [[20, 15]], '2026-10-25T18:00:00Z');
    const last = lastTimeFor([older, other, newer], ex('Leg press').id);
    eq(last.sets.map(s => s.weight), [110, 110]);
    eq(lastTimeFor([other], ex('Leg press').id), null);
  });

  // ----- Times and Sheet rows -----

  await test('time: UK offsets for winter and summer (BST)', () => {
    eq(londonIso(new Date('2026-01-15T12:00:00Z')), '2026-01-15T12:00:00+00:00');
    eq(londonIso(new Date('2026-07-01T12:00:00Z')), '2026-07-01T13:00:00+01:00');
    eq(londonIso(new Date('2026-07-01T23:30:00Z')), '2026-07-02T00:30:00+01:00');
  });

  await test('sheet rows: session and set columns are filled correctly', () => {
    const rec = completed('Pull-up', [[0, 8], [5, 6]], '2026-07-01T17:00:00Z');
    rec.exercises[0].notes = 'felt good';
    const { session, sets } = toSheetRows(rec);
    eq(session.duration_min, 45);
    eq(session.started_at, '2026-07-01T18:00:00+01:00');
    eq([session.exercise_count, session.set_count], [1, 2]);
    eq(sets[1], {
      set_id: rec.exercises[0].sets[1].id, session_id: rec.id, session_date: '2026-07-01',
      exercise_order: 1, exercise_name: 'Pull-up / chin-up', muscle_group: 'Back', pattern: 'Pull',
      tier: 1, load_type: 'Bodyweight', weight_kg: 5, reps: 6, rir: null, set_number: 2,
      exercise_notes: 'felt good'
    });
  });

  await test('csv: one line per set plus header, quotes commas', () => {
    const rec = completed('Leg press', [[100, 10], [100, 9]], '2026-10-01T18:00:00Z');
    rec.notes = 'tired, short session';
    const lines = buildCsv([rec]).trim().split('\r\n');
    eq(lines.length, 3);
    ok(lines[1].includes('"tired, short session"'));
  });

  // ----- Sync against the real Code.gs (fake spreadsheet) -----

  await test('script: rejects a wrong token', async () => {
    const fake = loadFakeAppsScript(codeGsSource);
    let message = '';
    try { await ping({ ...settings, token: 'nope' }, fake.fetchFn); } catch (err) { message = err.message; }
    eq(message, 'Wrong or missing token.');
  });

  await test('script: ping creates both tabs with headers and sets UK time zone', async () => {
    const fake = loadFakeAppsScript(codeGsSource);
    const res = await ping(settings, fake.fetchFn);
    ok(res.ok);
    eq(fake.sheets.get('Sessions').rows[0], ['session_id', 'started_at', 'ended_at', 'duration_min', 'exercise_count', 'set_count', 'notes', 'synced_at']);
    eq(fake.sheets.get('Sets').rows[0].length, 14);
    eq(fake.timeZone, 'Europe/London');
  });

  await test('idempotent: sending the same session twice → one copy in the Sheet', async () => {
    const fake = loadFakeAppsScript(codeGsSource);
    const rec = completed('Leg press', [[100, 10], [100, 9], [100, 8]], '2026-10-01T18:00:00Z');
    const first = await sendSession(settings, rec, fake.fetchFn);
    const second = await sendSession(settings, rec, fake.fetchFn);
    eq([first.duplicate, second.duplicate], [false, true]);
    eq(fake.rows('Sessions').length, 1);
    eq(fake.rows('Sets').length, 3);
  });

  await test('idempotent: half-written session (sets only) is completed without duplicate sets', async () => {
    const fake = loadFakeAppsScript(codeGsSource);
    const rec = completed('Leg press', [[100, 10], [100, 9]], '2026-10-01T18:00:00Z');
    await sendSession(settings, rec, fake.fetchFn);
    fake.sheets.get('Sessions').rows.pop(); // pretend the session row never got written
    await sendSession(settings, rec, fake.fetchFn);
    eq(fake.rows('Sessions').length, 1);
    eq(fake.rows('Sets').length, 2);
  });

  await test('script: text that looks like a formula is stored as text', async () => {
    const fake = loadFakeAppsScript(codeGsSource);
    const rec = completed('Leg press', [[100, 10]], '2026-10-01T18:00:00Z');
    rec.exercises[0].notes = '=1+1';
    await sendSession(settings, rec, fake.fetchFn);
    eq(fake.rows('Sets')[0][13], "'=1+1");
  });

  await test('outbox: offline keeps sessions as "Saved on phone", nothing sent', async () => {
    const fake = loadFakeAppsScript(codeGsSource);
    const repo = memoryRepo([completed('Leg press', [[100, 10]], '2026-10-01T18:00:00Z')]);
    const res = await syncPending(repo, { fetchFn: fake.fetchFn, isOnline: () => false });
    eq(res, { synced: 0, failed: 0, waiting: 1 });
    eq([...repo.store.values()][0].sync.status, 'pending');
    eq(fake.requests, 0);
  });

  await test('outbox: failure is kept as "Failed" and the retry succeeds', async () => {
    const fake = loadFakeAppsScript(codeGsSource);
    const repo = memoryRepo([
      completed('Leg press', [[100, 10]], '2026-10-01T18:00:00Z'),
      completed('Face pull', [[20, 15]], '2026-10-03T18:00:00Z')
    ]);
    const broken = async () => { throw new TypeError('Failed to fetch'); };
    const first = await syncPending(repo, { fetchFn: broken, isOnline: () => true });
    eq(first, { synced: 0, failed: 2, waiting: 0 });
    const failed = [...repo.store.values()][0].sync;
    eq(failed.status, 'failed');
    ok(failed.error.includes('Network error'), failed.error);

    const second = await syncPending(repo, { fetchFn: fake.fetchFn, isOnline: () => true });
    eq(second, { synced: 2, failed: 0, waiting: 0 });
    ok([...repo.store.values()].every(r => r.sync.status === 'synced'));
    eq(fake.rows('Sessions').length, 2);

    const third = await syncPending(repo, { fetchFn: fake.fetchFn, isOnline: () => true });
    eq(third, { synced: 0, failed: 0, waiting: 0 }, 'synced sessions are not resent');
  });

  await test('outbox: reply lost after the Sheet saved it → retry marks it synced, no duplicate', async () => {
    const fake = loadFakeAppsScript(codeGsSource);
    const repo = memoryRepo([completed('Leg press', [[100, 10], [100, 9]], '2026-10-01T18:00:00Z')]);
    const loseReply = async (url, init) => { await fake.fetchFn(url, init); throw new TypeError('connection reset'); };
    await syncPending(repo, { fetchFn: loseReply, isOnline: () => true });
    eq([...repo.store.values()][0].sync.status, 'failed');
    await syncPending(repo, { fetchFn: fake.fetchFn, isOnline: () => true });
    eq([...repo.store.values()][0].sync.status, 'synced');
    eq(fake.rows('Sessions').length, 1);
    eq(fake.rows('Sets').length, 2);
  });

  await test('outbox: not set up yet → waits with a helpful message', async () => {
    const repo = memoryRepo([completed('Leg press', [[100, 10]], '2026-10-01T18:00:00Z')], { url: '', token: '' });
    const res = await syncPending(repo, { fetchFn: () => { throw new Error('should not fetch'); }, isOnline: () => true });
    eq(res.waiting, 1);
    ok([...repo.store.values()][0].sync.error.includes('Settings'));
  });

  await test('outbox: a non-JSON reply (e.g. Google sign-in page) gives a clear error', async () => {
    const htmlFetch = async () => ({ ok: true, status: 200, text: async () => '<!doctype html><title>Sign in</title>' });
    let message = '';
    try { await ping(settings, htmlFetch); } catch (err) { message = err.message; }
    ok(message.includes('access is "Anyone"'), message);
  });

  const failed = results.filter(r => !r.ok).length;
  report(`\n${results.length - failed} passed, ${failed} failed`);
  return { passed: results.length - failed, failed, results };
}
