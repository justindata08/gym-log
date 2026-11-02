// Runs the real apps-script/Code.gs against a fake in-memory spreadsheet,
// and gives back a fetch() that talks to it. Used by the tests only.

export function loadFakeAppsScript(source, { token = 'test-token' } = {}) {
  const sheets = new Map();
  let timeZone = 'Etc/GMT';

  function makeRange(rows, row, col, numRows = 1, numCols = 1) {
    const range = {
      getValues: () => Array.from({ length: numRows }, (_, i) =>
        Array.from({ length: numCols }, (_, j) => rows[row - 1 + i]?.[col - 1 + j] ?? '')),
      setValues: values => {
        values.forEach((r, i) => r.forEach((v, j) => {
          rows[row - 1 + i] ??= [];
          rows[row - 1 + i][col - 1 + j] = v;
        }));
        return proxy;
      }
    };
    // Formatting calls (setNumberFormat, setFontWeight…) do nothing here.
    const proxy = new Proxy(range, { get: (t, k) => t[k] ?? (() => proxy) });
    return proxy;
  }

  function makeSheet(name) {
    const rows = [];
    return {
      name, rows,
      getLastRow: () => rows.length,
      getRange: (r, c, nr, nc) => makeRange(rows, r, c, nr, nc),
      setFrozenRows() {},
      deleteRow: r => rows.splice(r - 1, 1)
    };
  }

  const spreadsheet = {
    getName: () => 'Fake Gym Log',
    getSheetByName: name => sheets.get(name) || null,
    insertSheet: name => { const s = makeSheet(name); sheets.set(name, s); return s; },
    getSpreadsheetTimeZone: () => timeZone,
    setSpreadsheetTimeZone: tz => { timeZone = tz; }
  };

  const globals = {
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet, flush() {} },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k === 'SECRET_TOKEN' ? token : null) }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: content => ({ getContent: () => content, setMimeType() { return this; } })
    },
    Utilities: {
      parseDate: ymd => new Date(`${ymd}T00:00:00Z`),
      getUuid: () => crypto.randomUUID()
    },
    Logger: { log() {} }
  };

  const script = new Function(...Object.keys(globals), `${source}\nreturn { doPost, doGet };`)(...Object.values(globals));

  let requests = 0;
  // Behaves like fetch() against the deployed web app.
  async function fetchFn(url, init) {
    requests++;
    const out = script.doPost({ postData: { contents: init.body, type: 'text/plain' } });
    const text = out.getContent();
    return { ok: true, status: 200, text: async () => text };
  }

  return {
    fetchFn,
    sheets,
    rows: name => (sheets.get(name)?.rows || []).slice(1),
    get requests() { return requests; },
    get timeZone() { return timeZone; }
  };
}
