// Badge system for Morgan Life OS
// Storage keys (all prefixed mlos_ via lg/ls):
//   mlos_badges            — { [id]: { unlocked: bool, dateEarned?: string } }
//   mlos_ironLogCount      — number of times iron has been logged
//   mlos_reflectionCount   — number of distinct weeks with a completed reflection
//   mlos_reflectCounted_WN — idempotency flag per week

import { lg, ls } from './storage';
import { todayStr } from './dates';

export const BADGE_DEFS = [
  { id: 'first_light',  emoji: '🌅', name: 'First Light',       desc: 'Complete your first anchor' },
  { id: 'iron_will',    emoji: '💊', name: 'Iron Will',          desc: 'Log iron day 7 times' },
  { id: 'steady',       emoji: '🧘', name: 'Steady',             desc: '3-day streak' },
  { id: 'on_a_roll',    emoji: '🔥', name: 'On a Roll',          desc: '7-day streak' },
  { id: 'heart_first',  emoji: '💜', name: 'Heart First',        desc: 'Log a connection moment' },
  { id: 'know_numbers', emoji: '🩺', name: 'Know Your Numbers',  desc: 'Set labs recheck date' },
  { id: 'reflective',   emoji: '✍️', name: 'Reflective',         desc: 'Complete 3 weekly reflections' },
  { id: 'rode_wave',    emoji: '🌊', name: 'Rode the Wave',      desc: 'Check an anchor on a Low energy day' },
  { id: 'full_send',    emoji: '💅', name: 'Full Send',          desc: 'Complete all 21 anchors in one week' },
];

/** Returns the full badges map from storage. */
export function getBadges() {
  return lg('badges', {});
}

/** Unlock a single badge by id. Returns true if newly unlocked, false if already had it. */
function unlockBadge(id) {
  const badges = lg('badges', {});
  if (badges[id]?.unlocked) return false;
  badges[id] = { unlocked: true, dateEarned: todayStr() };
  ls('badges', badges);
  return true;
}

/**
 * Check conditions and unlock any newly-earned badges.
 * Safe to call repeatedly — each unlock is idempotent.
 *
 * ctx fields (all optional):
 *   streak          {number}  — current streak count
 *   checkedAny      {boolean} — at least one anchor was just checked
 *   energy          {string}  — current energy level ('low' | 'medium' | 'full')
 *   hasConnectionLog{boolean} — connLog has at least one non-empty lastDate
 *   hasLabsDate     {boolean} — labs_date is set
 *   weekTotal       {number}  — total anchors done this week
 */
export function checkBadges(ctx = {}) {
  const { streak = 0, checkedAny, energy, hasConnectionLog, hasLabsDate, weekTotal } = ctx;

  if (checkedAny) {
    unlockBadge('first_light');
    if (energy === 'low') unlockBadge('rode_wave');
  }

  if (streak >= 3) unlockBadge('steady');
  if (streak >= 7) unlockBadge('on_a_roll');

  if (hasConnectionLog) unlockBadge('heart_first');
  if (hasLabsDate)      unlockBadge('know_numbers');
  if (weekTotal >= 21)  unlockBadge('full_send');

  if (lg('ironLogCount', 0) >= 7)     unlockBadge('iron_will');
  if (lg('reflectionCount', 0) >= 3)  unlockBadge('reflective');
}

/**
 * Increment the iron log counter (call when iron is toggled ON, not off).
 * Returns new count.
 */
export function incrementIronLog() {
  const n = lg('ironLogCount', 0) + 1;
  ls('ironLogCount', n);
  return n;
}

/**
 * Increment the weekly reflection counter (idempotent per weekNum).
 * Call when a week's first reflection field is saved with non-empty content.
 * Returns new count.
 */
export function incrementReflectionCount(weekNum) {
  const key = 'reflectCounted_W' + weekNum;
  if (lg(key, false)) return lg('reflectionCount', 0);
  const n = lg('reflectionCount', 0) + 1;
  ls('reflectionCount', n);
  ls(key, true);
  return n;
}
