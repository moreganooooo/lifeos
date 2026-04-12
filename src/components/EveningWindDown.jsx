// EveningWindDown — end-of-day reflection overlay.
//
// Props:
//   isOpen              boolean
//   onClose             () => void       — dismiss without completing
//   todayTasks          Task[]
//   todayLevels         { level1Lit, level2Lit, level3Lit }
//   energy              'low' | 'medium' | 'full'
//   onWindDownComplete  () => void       — called after sending reflection

import { useState } from 'react';
import { appendToWeeklyReflection } from '../lib/checkIns';

const LEVEL_COLOR = {
  1: 'var(--magenta)',
  2: 'var(--orange)',
  3: 'var(--rose)',
};

export default function EveningWindDown({
  isOpen,
  onClose,
  todayTasks = [],
  todayLevels = {},
  energy,
  onWindDownComplete,
}) {
  const [r1,   setR1]   = useState('');
  const [r2,   setR2]   = useState('');
  const [r3,   setR3]   = useState('');
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const isLow    = energy === 'low';
  const total    = todayTasks.length;
  const done     = todayTasks.filter(t => t.completed).length;
  const doneList = todayTasks.filter(t => t.completed);
  const canSend  = isLow ? r3.trim().length > 0 : (r1.trim() || r2.trim() || r3.trim());

  function handleClose() {
    setR1(''); setR2(''); setR3('');
    setSent(false);
    onClose();
  }

  function handleSend() {
    appendToWeeklyReflection({
      r1Add: isLow ? undefined : r1,
      r2Add: isLow ? undefined : r2,
      r3Add: r3,
    });
    setSent(true);
    onWindDownComplete();
  }

  return (
    <div className="wd-overlay">
      <div className="wd-panel">

        <div className="wd-hd">
          <div className="wd-title">🌙 Wind Down</div>
          <button className="wd-close" onClick={handleClose}>×</button>
        </div>

        <div className="wd-body">
          {sent ? (
            /* ── Success state ──────────────────────────────────────────── */
            <div className="wd-sent">
              <div className="wd-sent-icon">✨</div>
              <div className="wd-sent-msg">
                Reflection saved to This Week.<br />+3 sparks earned!
              </div>
              <button className="wd-primary" onClick={handleClose}>Done</button>
            </div>
          ) : (
            <>
              {/* Task summary */}
              <div className="wd-summary">
                <div className="wd-summary-line">
                  <span className="wd-sum-num">{done}</span>
                  {total > 0 ? `/${total}` : ''} task{done !== 1 ? 's' : ''} done today
                </div>
                {doneList.length > 0 && !isLow && (
                  <div className="wd-done-list">
                    {doneList.slice(0, 5).map(t => (
                      <div key={t.id} className="wd-done-item">
                        <div className="wd-done-bar" style={{ background: LEVEL_COLOR[t.level] ?? 'var(--border)' }} />
                        <span>✓ {t.text}</span>
                      </div>
                    ))}
                    {doneList.length > 5 && (
                      <div className="wd-done-item">
                        <div className="wd-done-bar" style={{ background: 'var(--border)' }} />
                        <span style={{ color: 'var(--sub)' }}>+ {doneList.length - 5} more</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reflection questions */}
              {isLow ? (
                <div className="wd-qs">
                  <div className="wd-q">One thing I'm proud of today 💜</div>
                  <textarea
                    className="wd-ta"
                    placeholder="Even something tiny counts…"
                    value={r3}
                    onChange={e => setR3(e.target.value)}
                  />
                </div>
              ) : (
                <div className="wd-qs">
                  <div className="wd-q">What worked today?</div>
                  <textarea
                    className="wd-ta"
                    placeholder="Something that went well…"
                    value={r1}
                    onChange={e => setR1(e.target.value)}
                  />
                  <div className="wd-q">What was hard?</div>
                  <textarea
                    className="wd-ta"
                    placeholder="No judgment here…"
                    value={r2}
                    onChange={e => setR2(e.target.value)}
                  />
                  <div className="wd-q">One thing I'm proud of 💜</div>
                  <textarea
                    className="wd-ta"
                    placeholder="Even something tiny counts…"
                    value={r3}
                    onChange={e => setR3(e.target.value)}
                  />
                </div>
              )}

              <button className="wd-primary" onClick={handleSend} disabled={!canSend}>
                Send to Weekly Reflection →
              </button>
              <button className="wd-skip" onClick={handleClose}>Skip for tonight</button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
