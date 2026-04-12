// TaskLibrary — Browse all suggestions by level.
// Used from Today screen ("Browse tasks by level" button) and
// from inside the StartTodayFlow wizard ("Browse all…" per level).
//
// Props:
//   isOpen              boolean
//   onClose             () => void
//   onAdd               (suggestion) => void   — called when "+ Add" tapped
//   existingTaskSugIds  Set<string>            — suggestions already in today list
//   levelFilter         1|2|3|null             — null = show all levels

import { getAllSuggestions } from '../lib/suggestions';
import { todayStr, parseLocal } from '../lib/dates';

const LEVEL_META = {
  1: { label: '💜 Health',     color: 'var(--magenta)' },
  2: { label: '🛡️ Safety',    color: 'var(--orange)' },
  3: { label: '❤️ Connection', color: 'var(--rose)' },
};

const ANCHOR_CHIP = {
  tinyWin:      'Tiny Win',
  adminHouse:   'Admin/House',
  tomorrowHelp: 'Tomorrow',
};

function daysSince(lastDone) {
  if (!lastDone) return null;
  return Math.max(0, Math.round((parseLocal(todayStr()) - parseLocal(lastDone)) / 86400000));
}

export default function TaskLibrary({ isOpen, onClose, onAdd, existingTaskSugIds = new Set(), levelFilter = null }) {
  if (!isOpen) return null;

  const all    = getAllSuggestions();
  const levels = levelFilter ? [levelFilter] : [1, 2, 3];

  return (
    <div className="lib-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="lib-panel">

        <div className="lib-hd">
          <div className="lib-title">
            {levelFilter ? LEVEL_META[levelFilter].label + ' Tasks' : 'Browse Tasks by Level'}
          </div>
          <button className="lib-close" onClick={onClose}>×</button>
        </div>

        <div className="lib-body">
          {levels.map(level => {
            const sugs = all.filter(s => s.level === level);
            if (sugs.length === 0) return (
              <div key={level} className="lib-empty">No {LEVEL_META[level].label} tasks in pool yet.</div>
            );
            return (
              <div key={level}>
                {!levelFilter && (
                  <div className="sh" style={{ color: LEVEL_META[level].color, paddingTop: 8 }}>
                    {LEVEL_META[level].label}
                  </div>
                )}
                <div className="card">
                  {sugs.map((s, i) => {
                    const added = existingTaskSugIds.has(s.id);
                    const ds    = daysSince(s.lastDone);
                    return (
                      <div
                        key={s.id}
                        className="lib-item"
                        style={i > 0 ? { borderTop: '1px solid var(--border)' } : {}}
                      >
                        <div className="lib-item-main">
                          <div className="lib-item-bar" style={{ background: LEVEL_META[level].color }} />
                          <div className="lib-item-content">
                            <div className="lib-item-text">{s.text}</div>
                            <div className="lib-meta">
                              {s.typicalDurationMinutes && (
                                <span>~{s.typicalDurationMinutes}m</span>
                              )}
                              {s.energyCost && (
                                <span>{s.energyCost} effort</span>
                              )}
                              {s.anchorType && ANCHOR_CHIP[s.anchorType] && (
                                <span className="lib-chip">{ANCHOR_CHIP[s.anchorType]}</span>
                              )}
                              {ds !== null
                                ? <span className="lib-lastdone">{ds === 0 ? 'done today' : `${ds}d ago`}</span>
                                : <span className="lib-lastdone lib-never">never done</span>
                              }
                            </div>
                          </div>
                        </div>
                        <button
                          className={`lib-add-btn${added ? ' lib-added' : ''}`}
                          onClick={() => !added && onAdd(s)}
                          disabled={added}
                        >
                          {added ? '✓' : '+ Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
