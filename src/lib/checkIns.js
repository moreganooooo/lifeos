// Check-in helpers for Morgan Life OS
//
// Midday check-in  — gentle prompt when first opening app after midday hour
// Evening wind-down — reflection overlay when first opening app after evening hour
//
// Timing strategy: "first open after X" heuristic using localStorage flags.
// No background timers needed — checked on every app focus / tab activation.
//
// Storage keys (all via lg/ls → mlos_ prefix):
//   mlos_middayDismissed_YYYY-MM-DD  — boolean
//   mlos_eveningDismissed_YYYY-MM-DD — boolean
//   mlos_checkin_midday_hour         — 0-23 (default 13)
//   mlos_checkin_evening_hour        — 0-23 (default 19)

import { lg, ls } from './storage';
import { todayStr, pad, getWeekNum } from './dates';
import { getTodayTasksForDate, saveTodayTasksForDate, makeTaskId } from './todayTasks';

// ── Configurable times ─────────────────────────────────────────────────────

export function getCheckInHours() {
  return {
    midday:  lg('checkin_midday_hour',  13),
    evening: lg('checkin_evening_hour', 19),
  };
}

export function setCheckInHours({ midday, evening } = {}) {
  if (midday  !== undefined) ls('checkin_midday_hour',  Number(midday));
  if (evening !== undefined) ls('checkin_evening_hour', Number(evening));
}

// ── Due checks ─────────────────────────────────────────────────────────────

/** True if it's past the midday hour and check-in hasn't been dismissed today. */
export function isMiddayCheckInDue() {
  const { midday } = getCheckInHours();
  return new Date().getHours() >= midday &&
    !lg('middayDismissed_' + todayStr(), false);
}

/** True if it's past the evening hour and wind-down hasn't been dismissed today. */
export function isEveningWindDownDue() {
  const { evening } = getCheckInHours();
  return new Date().getHours() >= evening &&
    !lg('eveningDismissed_' + todayStr(), false);
}

// ── Dismissal ──────────────────────────────────────────────────────────────

export function dismissMiddayCheckIn() {
  ls('middayDismissed_' + todayStr(), true);
}

export function dismissEveningWindDown() {
  ls('eveningDismissed_' + todayStr(), true);
}

// ── Date helpers ───────────────────────────────────────────────────────────

export function getTomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ── Defer logic ────────────────────────────────────────────────────────────

/**
 * Move a TodayTask from today's list to tomorrow.
 * Returns the updated today task list (so the caller can sync state).
 */
export function deferTaskToTomorrow(task) {
  const today    = todayStr();
  const tomorrow = getTomorrowStr();

  // Remove from today
  const todayList = getTodayTasksForDate(today).filter(t => t.id !== task.id);
  saveTodayTasksForDate(today, todayList);

  // Add to tomorrow with a fresh ID and deferredFrom marker
  const tomorrowList = getTodayTasksForDate(tomorrow);
  tomorrowList.push({
    ...task,
    id:          makeTaskId(),
    completed:   false,
    deferredFrom: today,
  });
  saveTodayTasksForDate(tomorrow, tomorrowList);

  return todayList;
}

// ── Weekly reflection append ───────────────────────────────────────────────

/**
 * Append evening wind-down answers to the current week's reflection.
 * Appends rather than overwrites, so existing ThisWeek reflection is preserved.
 *
 *   r1Add  → appended to "What worked this week?"
 *   r2Add  → appended to "What was hard?"
 *   r3Add  → appended to "One thing to keep?"
 */
export function appendToWeeklyReflection({ r1Add, r2Add, r3Add } = {}) {
  const wn  = getWeekNum(new Date());
  const key = 'reflect_' + wn;
  const saved = lg(key, { r1: '', r2: '', r3: '', r4: '' });

  function append(existing, addition) {
    if (!addition || !addition.trim()) return existing;
    if (!existing || !existing.trim()) return addition.trim();
    return existing + '\n\n— ' + addition.trim();
  }

  const updated = {
    ...saved,
    r1: append(saved.r1, r1Add),
    r2: append(saved.r2, r2Add),
    r3: append(saved.r3, r3Add),
  };
  ls(key, updated);
}
