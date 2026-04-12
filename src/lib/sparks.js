// Sparks + Streak engine for Morgan Life OS
// Sparks = lightweight gamification points
// Streak = consecutive days with at least 1 anchor completed (1 grace day allowed)

import { lg, ls } from './storage';
import { todayStr, parseLocal } from './dates';

// localStorage keys (prefixed via lg/ls → mlos_*)
// mlos_totalSparks       — running total
// mlos_currentStreak     — current streak count
// mlos_streakLastDate    — last date streak was credited
// mlos_streakGraceUsed   — boolean: grace day consumed in current run
// mlos_dailySparks_YYYY-MM-DD — sparks earned on a specific day (for delta calc)

/** Sparks earned from a checked array (indices 0–2 are mandatory anchors). */
export function computeTodaySparks(checkedArr) {
  const regular = [checkedArr[0], checkedArr[1], checkedArr[2]].filter(Boolean).length;
  return regular + (regular === 3 ? 2 : 0); // +2 bonus for all-3
}

/**
 * Recomputes today's spark total after a checkbox change.
 * Uses a stored daily baseline so check/uncheck is always idempotent.
 * Returns { total, todaySparks, delta }.
 */
export function updateSparksOnToggle(newChecked) {
  const today     = todayStr();
  const prevDaily = lg('dailySparks_' + today, 0);
  const newDaily  = computeTodaySparks(newChecked);
  const delta     = newDaily - prevDaily;

  const total = Math.max(0, lg('totalSparks', 0) + delta);
  if (delta !== 0) {
    ls('totalSparks', total);
    ls('dailySparks_' + today, newDaily);
  }
  return { total, todaySparks: newDaily, delta };
}

/**
 * Update streak after at least one anchor is checked today.
 * Safe to call on every checkbox toggle — guards internally.
 * Returns { current }.
 */
export function updateStreak(checkedArr) {
  if (!checkedArr.some(Boolean)) return { current: lg('currentStreak', 0) };

  const today     = todayStr();
  const lastDate  = lg('streakLastDate', '');
  const current   = lg('currentStreak', 0);
  const graceUsed = lg('streakGraceUsed', false);

  if (lastDate === today) return { current }; // already credited today

  const todayD = parseLocal(today);
  const lastD  = lastDate ? parseLocal(lastDate) : null;
  const diff   = lastD ? Math.round((todayD - lastD) / 86400000) : Infinity;

  let newStreak = 1;
  let newGrace  = false;

  if (!lastD || diff === Infinity) {
    newStreak = 1;
    newGrace  = false;
  } else if (diff === 1) {
    newStreak = current + 1;
    newGrace  = graceUsed; // preserve existing grace state
  } else if (diff === 2 && !graceUsed) {
    newStreak = current + 1; // grace day forgives the gap
    newGrace  = true;
  } else {
    newStreak = 1; // streak broken — reset
    newGrace  = false;
  }

  ls('currentStreak', newStreak);
  ls('streakLastDate', today);
  ls('streakGraceUsed', newGrace);
  return { current: newStreak };
}

/**
 * Add reflection sparks for a given week number (idempotent — max once per week).
 * Returns the new total.
 */
export function addReflectionSparks(weekNum) {
  const key = 'reflectSparks_W' + weekNum;
  if (lg(key, false)) return lg('totalSparks', 0);
  const total = lg('totalSparks', 0) + 3;
  ls('totalSparks', total);
  ls(key, true);
  return total;
}

/**
 * Award +3 sparks for completing an evening wind-down.
 * Idempotent per day — only awards once regardless of how many times called.
 * Returns the new total.
 */
export function addWindDownSparks() {
  const key = 'windDownSparks_' + todayStr();
  if (lg(key, false)) return lg('totalSparks', 0);
  const total = lg('totalSparks', 0) + 3;
  ls('totalSparks', total);
  ls(key, true);
  return total;
}

/** Read current sparks data from storage. */
export function loadSparksData() {
  return {
    total:       lg('totalSparks', 0),
    current:     lg('currentStreak', 0),
    todaySparks: lg('dailySparks_' + todayStr(), 0),
  };
}
