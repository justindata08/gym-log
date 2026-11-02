# Gym Log

A personal workout log that installs on an Android phone, works offline at the gym, and saves completed sessions to a Google Sheet.

- **App**: a Progressive Web App written in plain HTML, CSS and JavaScript. There is no framework and no build step. It's hosted on GitHub Pages.
- **Storage**: IndexedDB on the phone. Everything is saved as you type.
- **Backend**: a Google Apps Script bound to the Sheet ([`apps-script/Code.gs`](apps-script/Code.gs)). Writes are idempotent, so sending the same session twice never duplicates rows.

**Setting it up?** Follow [SETUP.md](SETUP.md).

## Files

```
index.html               page shell
styles.css               all styling (colours are CSS variables at the top)
manifest.webmanifest     app name, icons, colours for "Install app"
sw.js                    offline cache — bump CACHE_VERSION on every release
icons/                   app icons (192, 512, maskable 512)
data/exercises.js        the exercise library + which ones default to Bodyweight
js/app.js                start-up, screen routing, update toast
js/state.js              in-memory state + saving to IndexedDB
js/db.js                 tiny IndexedDB wrapper
js/session.js            session logic (add/remove/reorder, sets, completing, Sheet rows)
js/catalog.js            catalog filtering, grouping and counts
js/catalogView.js        the catalog list + filter chips (used on two screens)
js/sync.js               outbox: sending sessions to Apps Script, retries
js/time.js               UK-time timestamps and formatting
js/csv.js                CSV export
js/ui.js                 small DOM helpers, toast, confirmation sheet
js/screens/*.js          one file per screen
apps-script/Code.gs      the Google Apps Script backend
tests/                   tests (see below)
```

## Common tweaks

- **Add or edit exercises:** edit [`data/exercises.js`](data/exercises.js). Exercise names identify stars and "Last time" history, so renaming an exercise starts its history fresh.
- **Change which exercises start as Bodyweight:** edit `BODYWEIGHT_DEFAULTS` in the same file.
- **Change the weight step (2.5 kg) or reps step:** edit `WEIGHT_STEP` and `REPS_STEP` in [`js/session.js`](js/session.js).
- **Change colours:** edit the variables at the top of [`styles.css`](styles.css). There's one block for light mode and one for dark.
- **After any change:** bump `CACHE_VERSION` in [`sw.js`](sw.js), then upload. See SETUP.md, "Releasing a change".

## Running it on a computer

Serve the folder with any static web server. For example, with Python:

```bash
python -m http.server 8080
```

Then open http://localhost:8080. The service worker caches files aggressively. While you're editing, use Chrome DevTools: open **Application → Service workers** and tick **Update on reload**.

## Tests

The tests cover:

- the catalog's filters and group counts;
- load-type defaults;
- adding, removing, undoing and reordering exercises;
- set copying;
- completing a session;
- UK time offsets;
- CSV export;
- the outbox: offline, failure then retry, and a lost reply;
- idempotent sync.

The sync tests run the real `Code.gs` against an in-memory fake spreadsheet.

- **In a browser:** serve the folder as above, then open http://localhost:8080/tests/test.html.
- **With Node:**

  ```bash
  node tests/run-node.mjs
  ```

To check the deployed script against your real Sheet, run `selfTest` from the Apps Script editor.
