// MiddayCheckIn — compact panel for the midday check-in touchpoint.
//
// Props:
//   isOpen         boolean
//   onClose        () => void       — also dismisses for the day
//   todayTasks     Task[]
//   todayLevels    { level1Lit, level2Lit, level3Lit }
//   energy         'low' | 'medium' | 'full'
//   onDeferTask    (task) => void   — move task to tomorrow
//   onAddTinyWin   () => void       — open L1 TaskLibrary
//   onCompleteTask (taskId) => void — mark a task done (low energy path)

import { useState } from 'react';

const LEVEL_COLOR = {
  1: 'var(--magenta)',
  2: 'var(--orange)',
  3: 'var(--rose)',
};

export default function MiddayCheckIn({
  isOpen,
  onClose,
  todayTasks = [],
  todayLevels = {},
  energy,
  onDeferTask,
  onAddTinyWin,
  onCompleteTask,
}) {
  const [mode, setMode] = useState('summary'); // 'summary' | 'defer'

  if (!isOpen) return null;

  const isLow   = energy === 'low';
  const total   = todayTasks.length;
  const done    = todayTasks.filter(t => t.completed).length;
  const pending = todayTasks.filter(t => !t.completed);

  function handleClose() {
    setMode('summary');
    onClose();
  }

  function handleDefer(task) {
    onDeferTask(task);
    setMode('summary');
  }

  return (
    <div className="ci-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="ci-panel">

        <div className="ci-hd">
          <div className="ci-title">🕛 Midday Check-In</div>
          <button className="ci-close" onClick={handleClose}>×</button>
        </div>

        <div className="ci-body">
          {isLow ? (
            /* ── Low energy: just a quick mark-done list ─────────────────── */
            <>
              <div className="ci-low-prompt">Want to mark anything done? 💜</div>
              {pending.length === 0 && (
                <div className="ci-empty">
                  {total === 0 ? 'No tasks planned today.' : 'All done — great work! 🌟'}
                </div>
              )}
              {pending.map(task => (
                <div key={task.id} className="ci-task-row">
                  <div className="ci-task-bar" style={{ background: LEVEL_COLOR[task.level] ?? 'var(--border)' }} />
                  <div className="ci-task-text">{task.text}</div>
                  <button className="ci-done-btn" onClick={() => onCompleteTask(task.id)}>
                    Done
                  </button>
                </div>
              ))}
              <button className="ci-primary" style={{ marginTop: 16 }} onClick={handleClose}>
                Looks good ✓
              </button>
            </>
          ) : mode === 'defer' ? (
            /* ── Defer picker ─────────────────────────────────────────────── */
            <>
              <div className="ci-sub">Which task moves to tomorrow?</div>
              {pending.length === 0 ? (
                <div className="ci-empty">No pending tasks to defer.</div>
              ) : (
                pending.map(task => (
                  <div key={task.id} className="ci-defer-item" onClick={() => handleDefer(task)}>
                    <div className="ci-task-bar" style={{ background: LEVEL_COLOR[task.level] ?? 'var(--border)' }} />
                    <div className="ci-task-text">{task.text}</div>
                    <span className="ci-defer-arrow">→ tomorrow</span>
                  </div>
                ))
              )}
              <button className="ci-back-btn" onClick={() => setMode('summary')}>← Back</button>
            </>
          ) : (
            /* ── Normal summary ───────────────────────────────────────────── */
            <>
              <div className="ci-summary">
                <div className="ci-progress">
                  <span className="ci-prog-num">{done}/{total}</span>
                  <span className="ci-prog-lbl">{total === 0 ? 'tasks planned' : 'tasks done'}</span>
                </div>
                <div className="ci-levels">
                  {[
                    { lit: todayLevels.level1Lit, label: '💜 Health',     color: 'var(--magenta)' },
                    { lit: todayLevels.level2Lit, label: '🛡️ Safety',    color: 'var(--orange)'  },
                    { lit: todayLevels.level3Lit, label: '❤️ Connection', color: 'var(--rose)'    },
                  ].map(({ lit, label, color }) => (
                    <div
                      key={label}
                      className={`ci-level-chip${lit ? ' ci-level-lit' : ''}`}
                      style={lit ? { borderColor: color, color } : {}}
                    >
                      {label}{lit ? ' ✓' : ''}
                    </div>
                  ))}
                </div>
              </div>

              <div className="ci-actions">
                <button className="ci-primary" onClick={handleClose}>
                  Looks good ✓
                </button>
                <button
                  className="ci-secondary"
                  onClick={() => setMode('defer')}
                  disabled={pending.length === 0}
                >
                  Move one task to tomorrow
                </button>
                <button className="ci-secondary" onClick={() => { onAddTinyWin(); handleClose(); }}>
                  Add one tiny win
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
