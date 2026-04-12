// StartTodayFlow — 6-step wizard that builds todayTasks[today].
//
// Steps:
//   0  Energy & Mood
//   1  Non-Negotiables (iron, labs — read-only)
//   2  Level 1 / Health tasks
//   3  Level 2 / Safety tasks
//   4  Level 3 / Connection tasks
//   5  Review & confirm
//
// Props:
//   isOpen          boolean
//   energy          string           — current energy from Today.jsx
//   onEnergyChange  (level) => void
//   iron            { text, cls, urgent }
//   labs            { text, cls, urgent }
//   onComplete      (tasks, mood) => void
//   onSkip          () => void

import { useState } from 'react';
import { getScoredSuggestionsForLevel, getAllSuggestions } from '../lib/suggestions';
import { makeTaskId, defaultTimeOfDay } from '../lib/todayTasks';
import TaskLibrary from './TaskLibrary';

const TOTAL_STEPS = 6;

const MOODS = [
  { value: 1, emoji: '😴', label: 'Exhausted' },
  { value: 2, emoji: '😕', label: 'Low'       },
  { value: 3, emoji: '😐', label: 'Okay'      },
  { value: 4, emoji: '🙂', label: 'Good'      },
  { value: 5, emoji: '✨', label: 'Great'     },
];

const LEVEL_META = [
  null, // index 0 unused
  { label: 'Level 1 · Health 💜',     color: 'var(--magenta)', count: 5 },
  { label: 'Level 2 · Safety 🛡️',    color: 'var(--orange)',  count: 5 },
  { label: 'Level 3 · Connection ❤️', color: 'var(--rose)',    count: 5 },
];

const TOD_OPTIONS = [
  { value: 'morning', label: '🌅 Morning' },
  { value: 'midday',  label: '🕛 Midday'  },
  { value: 'evening', label: '🌙 Evening' },
];

export default function StartTodayFlow({
  isOpen,
  energy,
  onEnergyChange,
  iron,
  labs,
  onComplete,
  onSkip,
}) {
  const [step,    setStep]    = useState(0);
  const [mood,    setMood]    = useState(null);
  // selected: Set of suggestion IDs the user has checked
  const [selected, setSelected] = useState(new Set());
  // meta: overrides for timeOfDay and essential per suggestion id
  const [meta,    setMeta]    = useState({});
  // Library state (used from wizard steps 2-4)
  const [libOpen,      setLibOpen]      = useState(false);
  const [libLevelFilter, setLibLevelFilter] = useState(null);

  if (!isOpen) return null;

  // ── helpers ──────────────────────────────────────────────────────────────

  function toggleSelected(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else              next.add(id);
      return next;
    });
  }

  function addFromLibrary(sug) {
    setSelected(prev => new Set([...prev, sug.id]));
    setLibOpen(false);
  }

  function updateMeta(id, field, value) {
    setMeta(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), [field]: value },
    }));
  }

  function removeFromSelected(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  // All suggestions with IDs in `selected`, in their pool order
  function getSelectedSuggestions() {
    const all = getAllSuggestions();
    return all.filter(s => selected.has(s.id));
  }

  function handleConfirm() {
    const tasks = getSelectedSuggestions().map(sug => ({
      id:          makeTaskId(),
      suggestionId: sug.id,
      level:       sug.level,
      anchorType:  sug.anchorType,
      text:        sug.text,
      timeOfDay:   meta[sug.id]?.timeOfDay  ?? defaultTimeOfDay(sug.level),
      essential:   meta[sug.id]?.essential  ?? true,
      completed:   false,
    }));
    onComplete(tasks, mood);
  }

  function openLibraryForLevel(level) {
    setLibLevelFilter(level);
    setLibOpen(true);
  }

  // ── step renderers ────────────────────────────────────────────────────────

  function renderStep0() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return (
      <div className="flow-step">
        <div className="flow-step-title">{greeting}, Morgan 👋</div>
        <div className="flow-step-sub">Let's plan your day.</div>

        <div className="sh" style={{ color: 'var(--amber)', marginTop: 24 }}>🌡️ Energy Mode</div>
        <div className="pills">
          {['low', 'medium', 'full'].map(level => (
            <button
              key={level}
              className={`pill${energy === level ? ` on-${level}` : ''}`}
              onClick={() => onEnergyChange(level)}
            >
              {level === 'low' ? '🔴 Low' : level === 'medium' ? '🟡 Medium' : '🟢 Full'}
            </button>
          ))}
        </div>

        <div className="sh" style={{ color: 'var(--lavender)', marginTop: 20 }}>💜 How are you feeling?</div>
        <div className="mood-row">
          {MOODS.map(m => (
            <button
              key={m.value}
              className={`mood-btn${mood === m.value ? ' mood-active' : ''}`}
              onClick={() => setMood(m.value)}
            >
              <span className="mood-emoji">{m.emoji}</span>
              <span className="mood-lbl">{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderStep1() {
    const hasIron = iron?.text;
    const hasLabs = labs?.text;
    return (
      <div className="flow-step">
        <div className="flow-step-title">Today's Must-Knows</div>
        <div className="flow-step-sub">A quick check before you plan.</div>

        <div className="flow-nonneg">
          {hasIron && (
            <div className="flow-nn-item">
              <span className="flow-nn-icon">💊</span>
              <div>
                <div className="flow-nn-label">Iron Day</div>
                <div className={`flow-nn-val${iron.cls ? ' ' + iron.cls : ''}`}>{iron.text}</div>
              </div>
            </div>
          )}
          {hasLabs && (
            <div className="flow-nn-item">
              <span className="flow-nn-icon">🩺</span>
              <div>
                <div className="flow-nn-label">Labs Recheck</div>
                <div className={`flow-nn-val${labs.cls ? ' ' + labs.cls : ''}`}>{labs.text}</div>
              </div>
            </div>
          )}
          {!hasIron && !hasLabs && (
            <div className="flow-nn-empty">
              Nothing flagged for today — you're clear to plan.
            </div>
          )}
          <div className="flow-nn-note">
            Appointments can be tracked in Settings in a future update.
          </div>
        </div>
      </div>
    );
  }

  function renderLevelStep(level) {
    const lm   = LEVEL_META[level];
    const sugs = getScoredSuggestionsForLevel(level, energy, lm.count);

    return (
      <div className="flow-step">
        <div className="flow-step-title" style={{ color: lm.color }}>{lm.label}</div>
        <div className="flow-step-sub">Choose what fits today. You can add more anytime.</div>

        {sugs.length === 0 && (
          <div className="flow-empty-pool">
            No suggestions in your pool for this level yet.
          </div>
        )}

        <div className="flow-sug-list">
          {sugs.map(sug => {
            const isSelected = selected.has(sug.id);
            return (
              <div
                key={sug.id}
                className={`flow-sug-item${isSelected ? ' flow-sug-selected' : ''}`}
                onClick={() => toggleSelected(sug.id)}
              >
                <div className={`flow-sug-cb${isSelected ? ' flow-sug-cb-on' : ''}`}
                  style={isSelected ? {} : { borderColor: lm.color }}>
                  {isSelected ? '✓' : ''}
                </div>
                <div className="flow-sug-content">
                  <div className="flow-sug-text">{sug.text}</div>
                  <div className="flow-sug-meta">
                    {sug.typicalDurationMinutes && <span>~{sug.typicalDurationMinutes}m</span>}
                    {sug.energyCost             && <span>{sug.energyCost} effort</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="flow-browse-btn"
          onClick={() => openLibraryForLevel(level)}
        >
          Browse all {lm.label.split(' · ')[1]} tasks →
        </button>
      </div>
    );
  }

  function renderStep5() {
    const tasks = getSelectedSuggestions();
    const byTod = {
      morning: tasks.filter(s => (meta[s.id]?.timeOfDay ?? defaultTimeOfDay(s.level)) === 'morning'),
      midday:  tasks.filter(s => (meta[s.id]?.timeOfDay ?? defaultTimeOfDay(s.level)) === 'midday'),
      evening: tasks.filter(s => (meta[s.id]?.timeOfDay ?? defaultTimeOfDay(s.level)) === 'evening'),
    };

    if (tasks.length === 0) {
      return (
        <div className="flow-step">
          <div className="flow-step-title">Today's Plan</div>
          <div className="flow-step-sub">No tasks selected yet. Go back and choose some, or confirm an empty day.</div>
        </div>
      );
    }

    return (
      <div className="flow-step">
        <div className="flow-step-title">Today's Plan</div>
        <div className="flow-step-sub">{tasks.length} task{tasks.length !== 1 ? 's' : ''} ready. Fine-tune below.</div>

        {Object.entries(byTod).map(([tod, group]) => {
          if (group.length === 0) return null;
          const todLabel = { morning: '🌅 Morning', midday: '🕛 Midday', evening: '🌙 Evening' }[tod];
          return (
            <div key={tod}>
              <div className="sh" style={{ color: 'var(--sub)', marginTop: 16 }}>{todLabel}</div>
              {group.map(sug => {
                const todValue = meta[sug.id]?.timeOfDay ?? defaultTimeOfDay(sug.level);
                const ess      = meta[sug.id]?.essential ?? true;
                return (
                  <div key={sug.id} className="flow-review-item">
                    <button
                      className="flow-review-remove"
                      onClick={() => removeFromSelected(sug.id)}
                      title="Remove from today"
                    >×</button>

                    <div className="flow-review-text">{sug.text}</div>

                    <div className="flow-review-controls">
                      <select
                        className="flow-review-tod"
                        value={todValue}
                        onChange={e => updateMeta(sug.id, 'timeOfDay', e.target.value)}
                      >
                        {TOD_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <button
                        className={`flow-review-ess${ess ? ' flow-ess-on' : ''}`}
                        onClick={() => updateMeta(sug.id, 'essential', !ess)}
                        title={ess ? 'Mark optional' : 'Mark essential'}
                      >
                        {ess ? '⭐ essential' : '○ optional'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  // ── layout ────────────────────────────────────────────────────────────────

  const STEP_TITLES = [
    'Energy & Mood',
    'Must-Knows',
    'Health Tasks',
    'Safety Tasks',
    'Connection Tasks',
    'Review Plan',
  ];

  const stepContent = [
    renderStep0(),
    renderStep1(),
    renderLevelStep(1),
    renderLevelStep(2),
    renderLevelStep(3),
    renderStep5(),
  ];

  const isLast  = step === TOTAL_STEPS - 1;
  const isFirst = step === 0;

  return (
    <>
      <div className="flow-overlay">
        <div className="flow-panel">

          {/* Header */}
          <div className="flow-hd">
            <div className="flow-progress">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div key={i} className={`flow-dot${i === step ? ' flow-dot-active' : i < step ? ' flow-dot-done' : ''}`} />
              ))}
            </div>
            <div className="flow-step-name">{STEP_TITLES[step]}</div>
            <button className="flow-skip-btn" onClick={onSkip} title="Skip for today">Skip</button>
          </div>

          {/* Content */}
          <div className="flow-content">
            {stepContent[step]}
          </div>

          {/* Footer nav */}
          <div className="flow-footer">
            {!isFirst && (
              <button className="flow-back-btn" onClick={() => setStep(s => s - 1)}>
                ← Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            {isLast ? (
              <button className="flow-confirm-btn" onClick={handleConfirm}>
                Confirm Today Plan ✓
              </button>
            ) : (
              <button className="flow-next-btn" onClick={() => setStep(s => s + 1)}>
                Next →
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Library overlay (sits on top of the flow overlay) */}
      <TaskLibrary
        isOpen={libOpen}
        onClose={() => setLibOpen(false)}
        onAdd={addFromLibrary}
        existingTaskSugIds={selected}
        levelFilter={libLevelFilter}
      />
    </>
  );
}
