// Suggestion engine for Morgan Life OS
//
// SETUP: Place your suggestion_pools.json file at:
//   src/assets/suggestion_pools.json
// Vite bundles JSON imports natively — no extra config needed.
//
// Expected JSON shape:
// {
//   "suggestions": [
//     {
//       "id": "tinywin_water_salt",
//       "anchorType": "tinyWin" | "adminHouse" | "tomorrowHelp",
//       "level": 1 | 2 | 3,
//       "text": "...",
//       "energyCost": "low" | "medium",
//       "typicalDurationMinutes": number,
//       "recommendedFrequencyDays": number,
//       "tags": string[]
//     }
//   ]
// }

import pools from '../assets/suggestion_pools.json';
import { lg, ls } from './storage';
import { todayStr, parseLocal, getMondayOf, dateStr } from './dates';

// Dev-only smoke test: print suggestion pool breakdown to console
if (import.meta.env.DEV) {
  const all = pools.suggestions ?? [];
  console.log(
    `[MorganLifeOS] Suggestion pool loaded: ${all.length} suggestions` +
    ` | L1: ${all.filter(s => s.level === 1).length}` +
    ` | L2: ${all.filter(s => s.level === 2).length}` +
    ` | L3: ${all.filter(s => s.level === 3).length}`
  );
}

// Storage keys (all prefixed by the existing mlos_ convention via lg/ls)
// mlos_suggestionLastDone  → { [id]: "YYYY-MM-DD" }
// mlos_dailyLevels         → { ["YYYY-MM-DD"]: { level1Lit, level2Lit, level3Lit } }
// mlos_anchorSelectedSug_YYYY-MM-DD → { [anchorIndex]: id | null }

const FALLBACKS = {
  tinyWin:      'Any tiny thing counts — drink water or breathe for 30 seconds.',
  adminHouse:   'Any 2-minute tidy or admin move counts today.',
  tomorrowHelp: 'Any small thing Future You will appreciate counts.',
};

function daysSince(dateStr) {
  if (!dateStr) return 999;
  const ms = parseLocal(todayStr()) - parseLocal(dateStr);
  return Math.max(0, Math.round(ms / 86400000));
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/** Returns all suggestions from the pool merged with their stored lastDone dates. */
export function getAllSuggestions() {
  const lastDone = lg('suggestionLastDone', {});
  return (pools.suggestions ?? []).map(s => ({
    ...s,
    lastDone: lastDone[s.id] ?? null,
  }));
}

/**
 * Returns the top N scored suggestions for a given anchorType + energy mode.
 * Falls back to a single generic suggestion if the filtered pool is empty.
 *
 * anchorType: "tinyWin" | "adminHouse" | "tomorrowHelp"
 * energy:     "low" | "medium" | "full"
 */
export function getScoredSuggestions(anchorType, energy) {
  const count = energy === 'low' ? 1 : energy === 'medium' ? 2 : 3;
  const all = getAllSuggestions();

  let candidates = all.filter(s => s.anchorType === anchorType);

  // Filter by energy budget
  if (energy === 'low') {
    candidates = candidates.filter(s => s.energyCost === 'low');
  } else if (energy === 'medium') {
    candidates = candidates.filter(s => s.energyCost === 'low' || s.energyCost === 'medium');
  }
  // full → no filter

  // Fall back to unfiltered pool for this anchorType if nothing survives
  if (candidates.length === 0) {
    candidates = all.filter(s => s.anchorType === anchorType);
  }

  // Still nothing → synthetic fallback
  if (candidates.length === 0) {
    const text = FALLBACKS[anchorType] ?? 'Any small step counts.';
    return [{ id: '__fallback__', text, isFallback: true }];
  }

  // Score each candidate
  // score = overdueScore * 2 + levelWeight − recentPenalty
  const scored = candidates.map(s => {
    const ds = daysSince(s.lastDone);
    const overdueScore = clamp(ds / Math.max(1, s.recommendedFrequencyDays), 0, 5);
    const levelWeight = 4 - s.level; // level 1 → 3, level 2 → 2, level 3 → 1
    const recentPenalty = ds === 1 ? 1 : 0;
    return { ...s, _score: overdueScore * 2 + levelWeight - recentPenalty };
  });

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, count);
}

/**
 * Mark a suggestion as done today.
 * Updates mlos_suggestionLastDone and mlos_dailyLevels.
 */
export function markSuggestionDone(id) {
  if (!id || id === '__fallback__') return;

  const suggestion = (pools.suggestions ?? []).find(s => s.id === id);

  // Update lastDone
  const lastDone = lg('suggestionLastDone', {});
  lastDone[id] = todayStr();
  ls('suggestionLastDone', lastDone);

  // Update daily level flags
  if (suggestion) {
    const today = todayStr();
    const dailyLevels = lg('dailyLevels', {});
    const day = dailyLevels[today] || { level1Lit: false, level2Lit: false, level3Lit: false };
    if (suggestion.level === 1) day.level1Lit = true;
    if (suggestion.level === 2) day.level2Lit = true;
    if (suggestion.level === 3) day.level3Lit = true;
    dailyLevels[today] = day;
    ls('dailyLevels', dailyLevels);
  }
}

/** Returns today's { level1Lit, level2Lit, level3Lit } from storage. */
export function getTodayLevels() {
  const dailyLevels = lg('dailyLevels', {});
  return dailyLevels[todayStr()] || { level1Lit: false, level2Lit: false, level3Lit: false };
}

/**
 * Count how many days in the given week had each Maslow level lit.
 * weekDays is the same array built by ThisWeek: [{ ds: "YYYY-MM-DD", ... }]
 * Returns { l1: number, l2: number, l3: number }
 */
export function getWeekLevelCounts(weekDays) {
  const today = todayStr();
  const dailyLevels = lg('dailyLevels', {});
  let l1 = 0, l2 = 0, l3 = 0;
  for (const { ds } of weekDays) {
    if (ds > today) continue;
    const d = dailyLevels[ds] || {};
    if (d.level1Lit) l1++;
    if (d.level2Lit) l2++;
    if (d.level3Lit) l3++;
  }
  return { l1, l2, l3 };
}

/** Convenience: build the current week's days internally and return level counts. */
export function getCurrentWeekLevelCounts() {
  const monday = getMondayOf(todayStr());
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDays.push({ ds: dateStr(d) });
  }
  return getWeekLevelCounts(weekDays);
}

/**
 * Returns the top N scored suggestions filtered by Maslow level + energy mode.
 * Uses the same scoring algorithm as getScoredSuggestions.
 * Used by the Start Today wizard.
 */
export function getScoredSuggestionsForLevel(level, energy, count = 5) {
  const all = getAllSuggestions();

  let candidates = all.filter(s => s.level === level);

  // Energy filter (same logic as getScoredSuggestions, but fall back gracefully)
  if (energy === 'low') {
    const low = candidates.filter(s => s.energyCost === 'low');
    if (low.length > 0) candidates = low;
  } else if (energy === 'medium') {
    const med = candidates.filter(s => s.energyCost === 'low' || s.energyCost === 'medium');
    if (med.length > 0) candidates = med;
  }

  if (candidates.length === 0) return [];

  const today = parseLocal(todayStr());
  const scored = candidates.map(s => {
    const ds = s.lastDone
      ? Math.max(0, Math.round((today - parseLocal(s.lastDone)) / 86400000))
      : 999;
    const overdueScore  = clamp(ds / Math.max(1, s.recommendedFrequencyDays), 0, 5);
    const levelWeight   = 4 - s.level;
    const recentPenalty = ds === 1 ? 1 : 0;
    return { ...s, _score: overdueScore * 2 + levelWeight - recentPenalty, daysSince: ds };
  });

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, count);
}

/**
 * Returns the top N most-overdue suggestions (ratio > 1), sorted by overdue ratio desc.
 * Each item gets a `daysSince` and `ratio` field attached.
 */
export function getTopOverdue(n = 3) {
  const today = parseLocal(todayStr());
  const all   = getAllSuggestions();

  const overdue = all
    .map(s => {
      const ds    = s.lastDone
        ? Math.max(0, Math.round((today - parseLocal(s.lastDone)) / 86400000))
        : 999;
      const ratio = ds / Math.max(1, s.recommendedFrequencyDays);
      return { ...s, daysSince: ds, ratio };
    })
    .filter(s => s.ratio > 1);

  overdue.sort((a, b) => b.ratio - a.ratio);
  return overdue.slice(0, n);
}
