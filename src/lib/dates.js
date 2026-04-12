export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const WEEKDAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse a YYYY-MM-DD string as a local date (avoids UTC timezone shift). */
export function parseLocal(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fmtShort(d) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Returns the Monday of the week containing dateStr. */
export function getMondayOf(ds) {
  const d = parseLocal(ds);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

/** ISO week number. */
export function getWeekNum(d) {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  dt.setDate(dt.getDate() + 3 - (dt.getDay() + 6) % 7);
  const w1 = new Date(dt.getFullYear(), 0, 4);
  return 1 + Math.round(((dt - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
}

/** Days remaining in the week after today (0 on Sunday). */
export function daysLeftInWeek() {
  const dow = new Date().getDay();
  const fromMon = dow === 0 ? 6 : dow - 1;
  return 6 - fromMon;
}
