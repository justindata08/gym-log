/**
 * Gym Log — Google Apps Script backend.
 *
 * Paste this into Extensions → Apps Script of your Google Sheet, set SECRET_TOKEN
 * in Project Settings → Script Properties, and deploy as a web app
 * (Execute as: Me, Who has access: Anyone). Full steps are in SETUP.md.
 *
 * The app sends POST requests with a JSON body:
 *   { action: "ping", token }                         → checks the connection
 *   { action: "saveSession", token, session, sets }   → writes one session
 *
 * Saving is idempotent: if the Sessions tab already has the session_id, nothing is
 * written and the reply is still "ok", so the app can safely retry.
 */

const TIME_ZONE = 'Europe/London';
const DATETIME_FORMAT = 'yyyy-mm-dd"T"hh:mm:ss';
const DATE_FORMAT = 'yyyy-mm-dd';

const SESSION_HEADERS = [
  'session_id', 'started_at', 'ended_at', 'duration_min',
  'exercise_count', 'set_count', 'notes', 'synced_at'
];
const SET_HEADERS = [
  'set_id', 'session_id', 'session_date', 'exercise_order', 'exercise_name',
  'muscle_group', 'pattern', 'tier', 'load_type', 'weight_kg', 'reps', 'rir',
  'set_number', 'exercise_notes'
];

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply_({ ok: false, error: 'Request was not valid JSON.' });
  }

  const secret = PropertiesService.getScriptProperties().getProperty('SECRET_TOKEN');
  if (!secret) return reply_({ ok: false, error: 'SECRET_TOKEN is not set in Script Properties.' });
  if (!body || body.token !== secret) return reply_({ ok: false, error: 'Wrong or missing token.' });

  try {
    if (body.action === 'ping') return reply_(withLock_(ping_));
    if (body.action === 'saveSession') return reply_(withLock_(() => saveSession_(body.session, body.sets)));
    return reply_({ ok: false, error: 'Unknown action: ' + body.action });
  } catch (err) {
    return reply_({ ok: false, error: String((err && err.message) || err) });
  }
}

// Opening the web app URL in a browser shows this, which confirms the deployment works.
function doGet() {
  return ContentService.createTextOutput('Gym Log endpoint is running. The app sends data here with POST.');
}

function ping_() {
  const { ss, sessions } = setupSheets_();
  const count = Math.max(0, sessions.getLastRow() - 1);
  return { ok: true, message: 'Connected to "' + ss.getName() + '" (' + count + ' sessions so far).' };
}

function saveSession_(session, sets) {
  if (!session || !session.session_id || !Array.isArray(sets)) {
    throw new Error('Missing session data.');
  }
  const sheets = setupSheets_();

  // Already saved? Then this is a retry: report success, write nothing.
  if (columnValues_(sheets.sessions, 1).has(String(session.session_id))) {
    return { ok: true, duplicate: true, session_id: session.session_id, sets_written: 0 };
  }

  // Sets first. Skip any set_id already present (from an earlier attempt that
  // stopped before the session row was written).
  const existingSetIds = columnValues_(sheets.sets, 1);
  const rows = sets
    .filter(s => !existingSetIds.has(String(s.set_id)))
    .map(s => [
      s.set_id,
      s.session_id,
      toDateOnly_(s.session_date),
      s.exercise_order,
      text_(s.exercise_name),
      text_(s.muscle_group),
      text_(s.pattern),
      s.tier,
      text_(s.load_type),
      number_(s.weight_kg),
      number_(s.reps),
      number_(s.rir),
      s.set_number,
      text_(s.exercise_notes)
    ]);
  if (rows.length) {
    const start = sheets.sets.getLastRow() + 1;
    sheets.sets.getRange(start, 1, rows.length, SET_HEADERS.length).setValues(rows);
    sheets.sets.getRange(start, 3, rows.length, 1).setNumberFormat(DATE_FORMAT);
  }

  // Session row last: its presence means "this session is fully saved".
  const row = [
    session.session_id,
    toDate_(session.started_at),
    toDate_(session.ended_at),
    number_(session.duration_min),
    number_(session.exercise_count),
    number_(session.set_count),
    text_(session.notes),
    new Date()
  ];
  const r = sheets.sessions.getLastRow() + 1;
  sheets.sessions.getRange(r, 1, 1, SESSION_HEADERS.length).setValues([row]);
  sheets.sessions.getRange(r, 2, 1, 2).setNumberFormat(DATETIME_FORMAT);
  sheets.sessions.getRange(r, 8).setNumberFormat(DATETIME_FORMAT);
  SpreadsheetApp.flush();

  return { ok: true, duplicate: false, session_id: session.session_id, sets_written: rows.length };
}

// ----- Helpers -----

// Only one request writes at a time, so two quick retries can't both add rows.
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// Creates the Sessions and Sets tabs (with headers) if they're missing.
function setupSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSpreadsheetTimeZone() !== TIME_ZONE) ss.setSpreadsheetTimeZone(TIME_ZONE);
  return {
    ss: ss,
    sessions: getOrCreateSheet_(ss, 'Sessions', SESSION_HEADERS),
    sets: getOrCreateSheet_(ss, 'Sets', SET_HEADERS)
  };
}

function getOrCreateSheet_(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// All values in one column (below the header) as a Set of strings.
function columnValues_(sheet, column) {
  const last = sheet.getLastRow();
  if (last < 2) return new Set();
  return new Set(sheet.getRange(2, column, last - 1, 1).getValues().map(r => String(r[0])));
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// "2026-11-02T18:05:00+00:00" → a real date-time (shown in UK time).
function toDate_(iso) {
  return iso ? new Date(iso) : '';
}

// "2026-11-02" → a real date.
function toDateOnly_(ymd) {
  return ymd ? Utilities.parseDate(ymd, TIME_ZONE, 'yyyy-MM-dd') : '';
}

function number_(v) {
  return v === null || v === undefined || v === '' ? '' : Number(v);
}

// Stops text like "=..." or "-felt good" being treated as a formula.
function text_(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// ----- One-off setup: run this from the Apps Script editor (select createSecretToken, press Run) -----
// Makes a long random token, saves it as SECRET_TOKEN and prints it in the log
// so you can copy it into the app. Running it again replaces the old token.
function createSecretToken() {
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('SECRET_TOKEN', token);
  Logger.log('Your secret token (copy it into the app\'s Settings): %s', token);
}

// ----- Manual check: run this from the Apps Script editor (select selfTest, press Run) -----
// Saves the same test session twice, checks only one copy exists, then deletes it.
function selfTest() {
  const id = 'selftest-' + Utilities.getUuid();
  const now = new Date().toISOString();
  const session = {
    session_id: id, started_at: now, ended_at: now, duration_min: 0,
    exercise_count: 1, set_count: 2, notes: 'self test'
  };
  const sets = [1, 2].map(n => ({
    set_id: id + '-' + n, session_id: id, session_date: now.slice(0, 10), exercise_order: 1,
    exercise_name: 'Self test', muscle_group: 'Core', pattern: 'Neutral', tier: 5,
    load_type: 'Bodyweight', weight_kg: 0, reps: 10, rir: null, set_number: n, exercise_notes: ''
  }));

  const first = withLock_(() => saveSession_(session, sets));
  const second = withLock_(() => saveSession_(session, sets));
  const sheets = setupSheets_();
  const sessionRows = deleteRowsWhere_(sheets.sessions, 1, v => v === id);
  const setRows = deleteRowsWhere_(sheets.sets, 2, v => v === id);

  const passed = !first.duplicate && second.duplicate && sessionRows === 1 && setRows === 2;
  Logger.log('First save: %s', JSON.stringify(first));
  Logger.log('Second save: %s', JSON.stringify(second));
  Logger.log('Rows found: %s session, %s sets (expected 1 and 2). Test rows removed.', sessionRows, setRows);
  if (!passed) throw new Error('Self test FAILED — see the log above.');
  Logger.log('Self test PASSED.');
}

function deleteRowsWhere_(sheet, column, test) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const values = sheet.getRange(2, column, last - 1, 1).getValues();
  let deleted = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    if (test(String(values[i][0]))) { sheet.deleteRow(i + 2); deleted++; }
  }
  return deleted;
}
