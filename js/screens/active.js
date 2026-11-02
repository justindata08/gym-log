// The session in progress: "Catalog" tab to pick exercises, "Live session" tab to log sets.
// Every change is saved straight away (saveActive), so the session survives the app being killed.

import { state, saveActive, addToHistory, runSync } from '../state.js';
import {
  LOAD_TYPES, WEIGHT_STEP, REPS_STEP, toggleExercise, restoreExercise, removeExercise,
  moveExercise, addSet, removeSet, setLoadType, lastTimeFor, formatSet, completeSession,
  loggedSetCount, untickedSetCount, parseWeight, parseReps, stepValue, fmtNum, hasReps
} from '../session.js';
import { h, icon, tierBadge, patternLabel, toast, sheet, syncTopbarHeight } from '../ui.js';
import { renderCatalog } from '../catalogView.js';
import { fmtClock, fmtDay } from '../time.js';
import { syncToast } from './sessions.js';

const WEIGHT_LABEL = { Weighted: 'kg', Bodyweight: '+kg', Assisted: 'assist kg' };

export function renderActive(app, tab) {
  const s = state.active;
  if (!s) { location.replace('#/sessions'); return; }
  if (!tab) { location.replace(s.exercises.length ? '#/session/live' : '#/session/catalog'); return; }

  const liveCount = h('span', { class: 'count-badge' });
  const updateCount = () => {
    liveCount.textContent = String(s.exercises.length);
    liveCount.hidden = s.exercises.length === 0;
  };
  updateCount();

  const timer = h('span', { class: 'timer', 'aria-label': 'Elapsed time' });
  const tick = () => { timer.textContent = fmtClock(Date.now() - Date.parse(s.startedAt)); };
  tick();
  const timerId = setInterval(tick, 1000);

  const main = h('main', { class: 'content with-bottombar' });

  app.replaceChildren(
    h('header', { class: 'topbar' },
      h('div', { class: 'appbar' },
        h('a', { class: 'icon-btn', href: '#/', 'aria-label': 'Home' }, icon('back')),
        h('h1', { text: 'Session' }),
        h('div', { class: 'appbar-actions' })
      ),
      h('nav', { class: 'tabs' },
        h('a', { class: `tab ${tab === 'catalog' ? 'is-on' : ''}`, href: '#/session/catalog', text: 'Catalog' }),
        h('a', { class: `tab ${tab === 'live' ? 'is-on' : ''}`, href: '#/session/live' }, 'Live session ', liveCount)
      )
    ),
    main,
    h('footer', { class: 'bottombar' },
      timer,
      h('button', { class: 'btn btn-ghost', text: 'Discard', onclick: discard }),
      h('button', { class: 'btn btn-primary', text: 'Complete', onclick: complete })
    )
  );
  syncTopbarHeight();

  if (tab === 'catalog') {
    const view = renderCatalog(main, {
      mode: 'pick',
      isAdded: id => s.exercises.some(e => e.exerciseId === id),
      onToggleAdd: ex => {
        const result = toggleExercise(s, ex, lastTimeFor(state.history, ex.id));
        saveActive();
        updateCount();
        if (result.added) return;
        // Removing drops any sets logged for it, so offer Undo.
        toast(`Removed ${ex.name}`, {
          actionLabel: 'Undo',
          onAction: () => {
            restoreExercise(s, result.removed);
            saveActive();
            updateCount();
            view.refresh();
          }
        });
      }
    });
  } else {
    renderLive(main, s, updateCount);
  }

  async function discard() {
    const choice = await sheet({
      title: 'Discard this session?',
      message: 'Everything logged in this session will be deleted from the phone. This can’t be undone.',
      actions: [
        { label: 'Discard session', value: 'discard', style: 'danger' },
        { label: 'Keep going', value: null, style: 'ghost' }
      ]
    });
    if (choice !== 'discard') return;
    state.active = null;
    await saveActive();
    toast('Session discarded');
    location.hash = '#/sessions';
  }

  async function complete() {
    const logged = loggedSetCount(s);
    if (!logged) {
      await sheet({
        title: 'Nothing logged yet',
        message: 'Add reps to at least one set to complete the session, or discard it.',
        actions: [{ label: 'OK', value: null, style: 'primary' }]
      });
      return;
    }
    const unticked = untickedSetCount(s);
    const exercises = s.exercises.filter(e => e.sets.some(hasReps)).length;
    const summary = `${exercises} exercise${exercises === 1 ? '' : 's'} · ${logged} set${logged === 1 ? '' : 's'} · ${fmtClock(Date.now() - Date.parse(s.startedAt))}`;
    const actions = unticked
      ? [
        { label: 'Complete — keep all sets', value: 'all', style: 'primary' },
        { label: `Complete — drop ${unticked} unticked`, value: 'ticked', style: 'ghost' },
        { label: 'Cancel', value: null, style: 'ghost' }
      ]
      : [
        { label: 'Complete session', value: 'all', style: 'primary' },
        { label: 'Cancel', value: null, style: 'ghost' }
      ];
    const message = unticked
      ? `${summary}\n${unticked} set${unticked === 1 ? ' has' : 's have'} reps but ${unticked === 1 ? 'isn’t' : 'aren’t'} ticked done.`
      : summary;
    const choice = await sheet({ title: 'Complete session?', message, actions });
    if (!choice) return;

    const rec = completeSession(s, { dropUnticked: choice === 'ticked' });
    if (!rec.exercises.length) {
      toast('No ticked sets to save — nothing completed.');
      return;
    }
    await addToHistory(rec);
    state.active = null;
    await saveActive();
    location.hash = '#/sessions';
    toast('Saved on phone. Syncing…', { duration: 0 });
    syncToast(await runSync());
  }

  return () => clearInterval(timerId);
}

// ----- Live session tab -----

function renderLive(main, s, updateCount) {
  const rerender = () => { renderLive(main, s, updateCount); updateCount(); };

  if (!s.exercises.length) {
    main.replaceChildren(
      h('div', { class: 'empty' },
        h('p', { text: 'No exercises yet.' }),
        h('a', { class: 'btn btn-primary btn-lg', href: '#/session/catalog', text: 'Add from the catalog' })
      ),
      sessionNotes(s)
    );
    return;
  }

  main.replaceChildren(
    ...s.exercises.map((entry, i) => exerciseCard(s, entry, i, rerender)),
    h('a', { class: 'btn btn-ghost btn-block', href: '#/session/catalog', text: '+ Add more exercises' }),
    sessionNotes(s)
  );
}

function sessionNotes(s) {
  const area = h('textarea', {
    class: 'notes', rows: 2, placeholder: 'Session notes (optional)',
    oninput: () => { s.notes = area.value; saveActive(); }
  });
  area.value = s.notes || '';
  return h('label', { class: 'notes-wrap' }, h('span', { class: 'label', text: 'Session notes' }), area);
}

function exerciseCard(s, entry, index, rerender) {
  const ex = state.byId.get(entry.exerciseId);
  const last = lastTimeFor(state.history, entry.exerciseId);
  const isFirst = index === 0;
  const isLast = index === s.exercises.length - 1;

  const move = delta => { if (moveExercise(s, entry.entryId, delta)) { saveActive(); rerender(); } };

  const remove = async () => {
    const hasData = entry.sets.some(hasReps) || entry.notes;
    if (hasData) {
      const ok = await sheet({
        title: `Remove ${entry.name}?`,
        message: 'Its sets in this session will be deleted.',
        actions: [
          { label: 'Remove', value: true, style: 'danger' },
          { label: 'Cancel', value: null, style: 'ghost' }
        ]
      });
      if (!ok) return;
    }
    removeExercise(s, entry.exerciseId);
    saveActive();
    rerender();
  };

  const loadSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Load type' },
    LOAD_TYPES.map(type => h('button', {
      class: `seg-btn ${entry.loadType === type ? 'is-on' : ''}`,
      'aria-pressed': String(entry.loadType === type),
      text: type,
      onclick: () => { setLoadType(entry, type); saveActive(); rerender(); }
    }))
  );

  const notes = h('textarea', {
    class: 'notes', rows: 1, placeholder: 'Exercise notes (optional)',
    oninput: () => { entry.notes = notes.value; saveActive(); }
  });
  notes.value = entry.notes || '';

  return h('section', { class: 'card' },
    h('div', { class: 'card-head' },
      h('span', { class: 'card-order', text: String(index + 1) }),
      tierBadge(entry.tier),
      h('div', { class: 'card-title' },
        h('div', { class: 'row-name', text: entry.name }),
        h('div', { class: 'row-meta' }, patternLabel(entry.pattern), h('span', { text: ex?.equipment || entry.group }))
      ),
      h('div', { class: 'card-tools' },
        h('button', { class: 'icon-btn sm', 'aria-label': 'Move up', disabled: isFirst, onclick: () => move(-1) }, icon('up')),
        h('button', { class: 'icon-btn sm', 'aria-label': 'Move down', disabled: isLast, onclick: () => move(1) }, icon('down')),
        h('button', { class: 'icon-btn sm', 'aria-label': `Remove ${entry.name}`, onclick: remove }, icon('close'))
      )
    ),
    loadSeg,
    last ? h('div', { class: 'last-time' },
      h('span', { class: 'label', text: `Last time · ${fmtDay(last.date)}` }),
      h('span', { text: last.sets.map(x => formatSet(x, last.loadType)).join('  ·  ') })
    ) : h('div', { class: 'last-time is-empty', text: 'First time logging this one.' }),
    h('div', { class: 'set-grid set-head' },
      h('span', { text: 'Set' }),
      h('span', { text: WEIGHT_LABEL[entry.loadType] }),
      h('span', { text: 'Reps' }),
      h('span', { text: 'RIR' }),
      h('span')
    ),
    entry.sets.map((set, i) => setRow(entry, set, i, rerender)),
    h('button', {
      class: 'btn btn-ghost btn-block add-set',
      text: '+ Add set',
      onclick: () => { addSet(entry); saveActive(); rerender(); }
    }),
    notes
  );
}

function setRow(entry, set, i, rerender) {
  const row = h('div', { class: `set-grid set-row ${set.done ? 'is-done' : ''}` });

  const doneBtn = h('button', {
    class: 'set-done',
    'aria-label': set.done ? `Set ${i + 1} done — tap to untick` : `Tick set ${i + 1} done`,
    'aria-pressed': String(set.done),
    onclick: () => {
      set.done = !set.done;
      saveActive();
      rerender();
    }
  }, set.done ? icon('check') : String(i + 1));

  const weight = stepper({
    value: set.weight,
    step: WEIGHT_STEP,
    inputmode: 'decimal',
    label: `Set ${i + 1} ${WEIGHT_LABEL[entry.loadType]}`,
    parse: parseWeight,
    onChange: v => { set.weight = v; saveActive(); }
  });

  const reps = stepper({
    value: set.reps,
    step: REPS_STEP,
    inputmode: 'numeric',
    label: `Set ${i + 1} reps`,
    parse: parseReps,
    onChange: v => { set.reps = v; saveActive(); }
  });

  const rir = h('select', {
    class: 'rir', 'aria-label': `Set ${i + 1} reps in reserve`,
    onchange: () => { set.rir = rir.value === '' ? null : Number(rir.value); saveActive(); }
  },
    h('option', { value: '', text: '–' }),
    [0, 1, 2, 3, 4, 5].map(n => h('option', { value: String(n), text: String(n) }))
  );
  rir.value = set.rir == null ? '' : String(set.rir);

  const del = h('button', {
    class: 'icon-btn sm set-del', 'aria-label': `Delete set ${i + 1}`,
    onclick: () => { removeSet(entry, set.id); saveActive(); rerender(); }
  }, icon('trash'));

  row.append(doneBtn, weight, reps, rir, del);
  return row;
}

// A number box with − and + buttons either side.
function stepper({ value, step, inputmode, label, parse, onChange }) {
  const input = h('input', {
    class: 'num', type: 'text', inputmode, 'aria-label': label, autocomplete: 'off',
    enterkeyhint: 'done',
    oninput: () => onChange(parse(input.value)),
    onfocus: () => input.select()
  });
  input.value = fmtNum(value);
  const bump = delta => {
    const next = stepValue(parse(input.value), delta);
    input.value = fmtNum(next);
    onChange(next);
  };
  return h('div', { class: 'stepper' },
    h('button', { class: 'step', 'aria-label': `Decrease ${label}`, tabindex: '-1', onclick: () => bump(-step) }, icon('minus')),
    input,
    h('button', { class: 'step', 'aria-label': `Increase ${label}`, tabindex: '-1', onclick: () => bump(step) }, icon('plus'))
  );
}
