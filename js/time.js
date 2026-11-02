// Date and time helpers. Everything is shown and stored in UK time.

export const TIME_ZONE = 'Europe/London';

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23'
});

// ISO 8601 timestamp in UK time with its offset, e.g. "2026-07-01T13:00:00+01:00".
export function londonIso(date = new Date()) {
  const p = {};
  for (const { type, value } of partsFormatter.formatToParts(date)) p[type] = value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const wholeSeconds = Math.floor(date.getTime() / 1000) * 1000;
  const offsetMin = Math.round((asUtc - wholeSeconds) / 60000);
  const sign = offsetMin < 0 ? '-' : '+';
  const abs = Math.abs(offsetMin);
  const pad = n => String(n).padStart(2, '0');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short'
});
const dayYearFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
});
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

// "Mon 2 Nov" (adds the year if it isn't this year).
export function fmtDay(iso) {
  const d = new Date(iso);
  const sameYear = iso.slice(0, 4) === londonIso().slice(0, 4);
  return (sameYear ? dayFormatter : dayYearFormatter).format(d).replace(',', '');
}

// "18:05"
export function fmtTime(iso) {
  return timeFormatter.format(new Date(iso));
}

// Stopwatch style: "12:34" or "1:02:03".
export function fmtClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = n => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// "52 min" or "1 h 05 min".
export function fmtMinutes(min) {
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}

export function minutesBetween(startIso, endIso) {
  return Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60000);
}
