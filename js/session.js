// Session logic: plain functions with no screen code, so they can be tested.
//
// An active session looks like:
// { id, startedAt, notes, exercises: [entry, ...] }
// Each entry (an exercise in the session):
// { entryId, exerciseId, name, group, pattern, tier, loadType, notes, sets: [set, ...] }
// Each set: { id, weight, reps, rir, done }
//   weight = kg on the bar (Weighted), added kg (Bodyweight) or assistance kg (Assisted).

import { londonIso, minutesBetween } from './time.js';

export const LOAD_TYPES = ['Weighted', 'Bodyweight', 'Assisted'];
export const WEIGHT_STEP = 2.5;
export const REPS_STEP = 1;

export function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function newSession(now = new Date()) {
  return { id: uuid(), startedAt: londonIso(now), notes: '', exercises: [] };
}

export function defaultLoadType(exercise) {
  return exercise.bodyweight ? 'Bodyweight' : 'Weighted';
}

export function newSet(values = {}) {
  return {
    id: uuid(),
    weight: values.weight ?? null,
    reps: values.reps ?? null,
    rir: values.rir ?? null,
    done: false
  };
}

export function findEntry(session, exerciseId) {
  return session.exercises.find(e => e.exerciseId === exerciseId) || null;
}

// Adds an exercise. `last` is what lastTimeFor() returned (or null):
// if you've done it before, the load type and first set are copied from last time.
export function addExercise(session, exercise, last = null) {
  const existing = findEntry(session, exercise.id);
  if (existing) return existing;
  const loadType = last?.loadType ?? defaultLoadType(exercise);
  const first = last?.sets?.[0];
  const firstSet = first
    ? newSet({ weight: first.weight, reps: first.reps })
    : newSet({ weight: loadType === 'Bodyweight' ? 0 : null });
  const entry = {
    entryId: uuid(),
    exerciseId: exercise.id,
    name: exercise.name,
    group: exercise.group,
    pattern: exercise.pattern,
    tier: exercise.tier,
    loadType,
    notes: '',
    sets: [firstSet]
  };
  session.exercises.push(entry);
  return entry;
}

// Removes an exercise. Returns { entry, index } so it can be put back (Undo).
export function removeExercise(session, exerciseId) {
  const index = session.exercises.findIndex(e => e.exerciseId === exerciseId);
  if (index === -1) return null;
  const [entry] = session.exercises.splice(index, 1);
  return { entry, index };
}

export function restoreExercise(session, { entry, index }) {
  if (findEntry(session, entry.exerciseId)) return;
  session.exercises.splice(Math.min(index, session.exercises.length), 0, entry);
}

// The catalog's +/✓ button. Returns { added: true, entry } or { added: false, removed }.
export function toggleExercise(session, exercise, last = null) {
  if (findEntry(session, exercise.id)) {
    return { added: false, removed: removeExercise(session, exercise.id) };
  }
  return { added: true, entry: addExercise(session, exercise, last) };
}

// delta: -1 moves up, +1 moves down.
export function moveExercise(session, entryId, delta) {
  const list = session.exercises;
  const from = list.findIndex(e => e.entryId === entryId);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= list.length) return false;
  [list[from], list[to]] = [list[to], list[from]];
  return true;
}

// "Add set" copies the previous set so you only adjust what changed.
export function addSet(entry) {
  const prev = entry.sets[entry.sets.length - 1];
  const set = prev
    ? newSet({ weight: prev.weight, reps: prev.reps, rir: prev.rir })
    : newSet({ weight: entry.loadType === 'Bodyweight' ? 0 : null });
  entry.sets.push(set);
  return set;
}

export function removeSet(entry, setId) {
  entry.sets = entry.sets.filter(s => s.id !== setId);
}

// Switching to Bodyweight resets sets you haven't ticked to 0 kg added load;
// switching away from Bodyweight clears those 0s so you can type the real weight.
export function setLoadType(entry, loadType) {
  if (entry.loadType === loadType) return;
  const wasBodyweight = entry.loadType === 'Bodyweight';
  entry.loadType = loadType;
  for (const s of entry.sets) {
    if (s.done) continue;
    if (loadType === 'Bodyweight') s.weight = 0;
    else if (wasBodyweight && s.weight === 0) s.weight = null;
  }
}

export const hasReps = set => set.reps != null && set.reps > 0;

export function loggedSetCount(session) {
  return session.exercises.reduce((n, e) => n + e.sets.filter(hasReps).length, 0);
}

// Sets that have reps but weren't ticked done.
export function untickedSetCount(session) {
  return session.exercises.reduce((n, e) => n + e.sets.filter(s => hasReps(s) && !s.done).length, 0);
}

// Turns the active session into a history record. Sets without reps are dropped,
// and exercises left with no sets are dropped too.
export function completeSession(session, { now = new Date(), dropUnticked = false } = {}) {
  const exercises = session.exercises
    .map(e => ({
      ...e,
      notes: (e.notes || '').trim(),
      sets: e.sets.filter(s => hasReps(s) && (!dropUnticked || s.done)).map(s => ({ ...s }))
    }))
    .filter(e => e.sets.length > 0);
  return {
    id: session.id,
    startedAt: session.startedAt,
    endedAt: londonIso(now),
    notes: (session.notes || '').trim(),
    exercises,
    sync: { status: 'pending', error: null, lastAttempt: null, syncedAt: null }
  };
}

// The most recent completed session that included this exercise.
// Returns { date, loadType, sets } or null.
export function lastTimeFor(history, exerciseId) {
  const newestFirst = [...history].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  for (const rec of newestFirst) {
    const entry = rec.exercises.find(e => e.exerciseId === exerciseId);
    if (entry) return { date: rec.startedAt, loadType: entry.loadType, sets: entry.sets };
  }
  return null;
}

export function sessionStats(rec) {
  return {
    exercises: rec.exercises.length,
    sets: rec.exercises.reduce((n, e) => n + e.sets.length, 0),
    minutes: rec.endedAt ? minutesBetween(rec.startedAt, rec.endedAt) : null
  };
}

// The rows sent to the Google Sheet (one Sessions row, many Sets rows).
export function toSheetRows(rec) {
  const sessionDate = rec.startedAt.slice(0, 10);
  const sets = [];
  rec.exercises.forEach((e, i) => {
    e.sets.forEach((s, j) => {
      sets.push({
        set_id: s.id,
        session_id: rec.id,
        session_date: sessionDate,
        exercise_order: i + 1,
        exercise_name: e.name,
        muscle_group: e.group,
        pattern: e.pattern,
        tier: e.tier,
        load_type: e.loadType,
        weight_kg: s.weight ?? (e.loadType === 'Bodyweight' ? 0 : null),
        reps: s.reps,
        rir: s.rir,
        set_number: j + 1,
        exercise_notes: e.notes || ''
      });
    });
  });
  const session = {
    session_id: rec.id,
    started_at: rec.startedAt,
    ended_at: rec.endedAt,
    duration_min: minutesBetween(rec.startedAt, rec.endedAt),
    exercise_count: rec.exercises.length,
    set_count: sets.length,
    notes: rec.notes || ''
  };
  return { session, sets };
}

// ----- Number input helpers -----

// "62,5" and "62.5" both work (some Android keyboards only offer a comma).
export function parseWeight(text) {
  const n = parseFloat(String(text).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export function parseReps(text) {
  const n = parseInt(text, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function stepValue(value, delta) {
  const next = Math.round(((value ?? 0) + delta) * 100) / 100;
  return Math.max(0, next);
}

export function fmtNum(n) {
  return n == null ? '' : String(Math.round(n * 100) / 100);
}

// "60 kg × 8", "BW × 10", "BW+10 kg × 6", "−20 kg × 8", with " @2" for RIR.
export function formatSet(set, loadType) {
  let load;
  if (loadType === 'Bodyweight') load = set.weight ? `BW+${fmtNum(set.weight)} kg` : 'BW';
  else if (loadType === 'Assisted') load = `−${fmtNum(set.weight ?? 0)} kg`;
  else load = `${fmtNum(set.weight ?? 0)} kg`;
  const rir = set.rir != null ? ` @${set.rir}` : '';
  return `${load} × ${set.reps ?? 0}${rir}`;
}
