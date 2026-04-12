// Today List data layer for Morgan Life OS
//
// TodayTask shape:
//   id:           string   — unique per instance
//   suggestionId: string?  — links to suggestion pool
//   level:        1|2|3    — Maslow level
//   anchorType:   string?  — "tinyWin" | "adminHouse" | "tomorrowHelp"
//   text:         string
//   timeOfDay:    "morning" | "midday" | "evening"
//   essential:    boolean
//   completed:    boolean
//
// Storage key:  mlos_todayTasks = { [dateString]: TodayTask[] }
// Flow flag:    mlos_todayFlowDone_YYYY-MM-DD = boolean

import { lg, ls } from './storage';
import { todayStr } from './dates';

/** Generate a short unique ID for a task instance. */
export function makeTaskId() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

/** Default timeOfDay based on Maslow level. */
export function defaultTimeOfDay(level) {
  if (level === 1) return 'morning';
  if (level === 2) return 'midday';
  return 'evening';
}

/** Maps anchorType string to the 0-based anchor index used in the existing checked[] array. */
export const ANCHOR_TYPE_TO_IDX = { tinyWin: 0, adminHouse: 1, tomorrowHelp: 2 };

// ── CRUD ──────────────────────────────────────────────────────────────────────

/** Return today's task list (empty array if none saved). */
export function getTodayTasksForDate(date) {
  return (lg('todayTasks', {}))[date] ?? [];
}

/** Persist a task list for the given date. */
export function saveTodayTasksForDate(date, tasks) {
  const all = lg('todayTasks', {});
  all[date] = tasks;
  ls('todayTasks', all);
}

// ── FLOW COMPLETION FLAG ──────────────────────────────────────────────────────

/** True if the Start Today flow has already been run (or skipped) today. */
export function isFlowDoneToday() {
  return lg('todayFlowDone_' + todayStr(), false);
}

/** Mark flow as done/skipped for today (prevents auto-launch). */
export function markFlowDoneToday() {
  ls('todayFlowDone_' + todayStr(), true);
}

/** Clear the flag so the flow can run again (used by "Rebuild Today"). */
export function clearFlowDoneToday() {
  ls('todayFlowDone_' + todayStr(), false);
}
