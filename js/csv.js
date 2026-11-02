// "Export all data as CSV": one row per set, with the session columns alongside.

import { toSheetRows } from './session.js';

const COLUMNS = [
  'set_id', 'session_id', 'session_date', 'exercise_order', 'exercise_name', 'muscle_group',
  'pattern', 'tier', 'load_type', 'weight_kg', 'reps', 'rir', 'set_number', 'exercise_notes',
  'started_at', 'ended_at', 'duration_min', 'session_notes', 'sync_status'
];

function cell(value) {
  if (value == null) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(history) {
  const lines = [COLUMNS.join(',')];
  const oldestFirst = [...history].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  for (const rec of oldestFirst) {
    const { session, sets } = toSheetRows(rec);
    for (const s of sets) {
      const row = {
        ...s,
        started_at: session.started_at,
        ended_at: session.ended_at,
        duration_min: session.duration_min,
        session_notes: session.notes,
        sync_status: rec.sync?.status
      };
      lines.push(COLUMNS.map(c => cell(row[c])).join(','));
    }
  }
  return lines.join('\r\n') + '\r\n';
}
