import { useState, useEffect, useCallback, useRef } from 'react';
import { lg, ls } from '../lib/storage';
import { todayStr, MONTHS, WEEKDAYS_FULL, parseLocal, getWeekNum } from '../lib/dates';
import { getScoredSuggestions, markSuggestionDone, getTodayLevels, getAllSuggestions, getCurrentWeekLevelCounts } from '../lib/suggestions';
import { loadSparksData, updateSparksOnToggle, updateStreak, addWindDownSparks } from '../lib/sparks';
import { checkBadges, incrementIronLog, incrementReflectionCount } from '../lib/badges';
import {
  getTodayTasksForDate, saveTodayTasksForDate,
  isFlowDoneToday, markFlowDoneToday, clearFlowDoneToday,
  makeTaskId, defaultTimeOfDay, ANCHOR_TYPE_TO_IDX,
} from '../lib/todayTasks';
import {
  isMiddayCheckInDue, isEveningWindDownDue,
  dismissMiddayCheckIn, dismissEveningWindDown,
  deferTaskToTomorrow,
} from '../lib/checkIns';
import MaslowPyramid     from '../components/MaslowPyramid';
import SparksStreakWidget from '../components/SparksStreakWidget';
import RelationshipPanel  from '../components/RelationshipPanel';
import WhatsDueStrip      from '../components/WhatsDueStrip';
import TodaysStoryCard    from '../components/TodaysStoryCard';
import TodayTaskList      from '../components/TodayTaskList';
import TaskLibrary        from '../components/TaskLibrary';
import StartTodayFlow     from '../components/StartTodayFlow';
import MiddayCheckIn      from '../components/MiddayCheckIn';
import EveningWindDown    from '../components/EveningWindDown';

const ENERGY_LABELS = {
  low:    'Low energy day',
  medium: 'Medium energy day',
  full:   'Full energy day',
};

const ANCHOR_TITLES = [
  '☀️ Tiny win',
  '🏠 Admin / House',
  '🌙 Tomorrow-help',
  '✨ Bonus anchor',
];
const ANCHOR_PLACEHOLDERS = [
  "What's your tiny win today?",
  'One small home or admin thing',
  'One thing to make tomorrow easier',
  'One more thing you want to do today',
];

const ANCHOR_TYPES = ['tinyWin', 'adminHouse', 'tomorrowHelp'];

const WORK_TILES = new Set(['home', 'job', 'mvc']);
const ALL_TILES = [
  { id: 'pots', color: 'var(--magenta)',  icon: '⚕️', label: 'POTS Protocol'  },
  { id: 'iron', color: 'var(--lavender)', icon: '💊', label: 'Supplement Plan' },
  { id: 'scm',  color: 'var(--orange)',   icon: '🦴', label: 'SCM Protocol'    },
  { id: 'home', color: 'var(--orange)',   icon: '🛡️', label: 'Home Checklist' },
  { id: 'job',  color: 'var(--rose)',     icon: '💼', label: 'Job Tracker'     },
  { id: 'mvc',  color: 'var(--rose)',     icon: '❤️', label: 'Connection'     },
];

function checkDayReset() {
  const last = lg('anchor_date', null);
  const t    = todayStr();
  if (last !== t) {
    ls('anchor_date', t);
    ls('energy', lg('default_energy', 'medium'));
  }
}

function getIronStatus() {
  const last = lg('iron_last', '');
  const t    = todayStr();
  if (!last) return { text: 'Tap to mark taken today', cls: '', urgent: false };
  const diff = Math.round((parseLocal(t) - parseLocal(last)) / 86400000);
  if (diff === 0) return { text: '✓ Taken today',               cls: 'ok', urgent: true };
  if (diff === 1) return { text: '→ Take today (alternate day)', cls: '',   urgent: true };
  if (diff >= 2) {
    const next = new Date(parseLocal(last));
    next.setDate(next.getDate() + 2);
    if (parseLocal(t) >= next) return { text: '→ Take today', cls: '', urgent: true };
    const days = Math.round((next - parseLocal(t)) / 86400000);
    return { text: `Next in ${days} day${days > 1 ? 's' : ''}`, cls: 'dim', urgent: false };
  }
  return { text: '', cls: '', urgent: false };
}

function getLabsStatus() {
  const date = lg('labs_date', '');
  if (!date) return { text: 'Set date in Settings', cls: '', urgent: false };
  const diff = Math.round((parseLocal(date) - parseLocal(todayStr())) / 86400000);
  if (diff < 0)   return { text: `Labs were ${Math.abs(diff)} days ago`, cls: 'dim', urgent: false };
  if (diff === 0) return { text: '🩺 Labs today!', cls: 'ok', urgent: true };
  return { text: `${diff} day${diff !== 1 ? 's' : ''} until labs`, cls: '', urgent: diff <= 7 };
}

export default function Today({ isActive, onOpenDetail }) {
  // ── Core state ─────────────────────────────────────────────────
  const [energy,     setEnergy]     = useState('medium');
  const [gentleMode, setGentleMode] = useState(false);
  const [anchorData, setAnchorData] = useState({
    checked: [false, false, false, false],
    subs:    ['', '', '', ''],
  });
  const [flashIdx, setFlashIdx] = useState(null);
  const [iron,     setIron]     = useState({ text: '', cls: '', urgent: false });
  const [labs,     setLabs]     = useState({ text: '', cls: '', urgent: false });

  // ── Suggestion engine ───────────────────────────────────────────
  const [openSuggestionIdx,   setOpenSuggestionIdx]   = useState(null);
  const [currentSuggestions,  setCurrentSuggestions]  = useState([]);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState({});
  const [todayLevels, setTodayLevels] = useState({ level1Lit: false, level2Lit: false, level3Lit: false });
  const [weekSummary, setWeekSummary] = useState('');

  // ── Sparks / streak ─────────────────────────────────────────────
  const [sparksData, setSparksData] = useState({ total: 0, current: 0, todaySparks: 0 });
  const [sparkFloat, setSparkFloat] = useState(null); // { idx, delta }

  // ── Relationship ────────────────────────────────────────────────
  const [connLog, setConnLog] = useState({ dom: { lastDate: '' }, eli: { lastDate: '' } });
  const [connectionPrompt, setConnectionPrompt] = useState(null); // anchor index

  // ── Today List ──────────────────────────────────────────────────
  const [todayTasks,    setTodayTasks]    = useState([]);
  const [showFlow,      setShowFlow]      = useState(false);
  const [showLibrary,   setShowLibrary]   = useState(false);
  const [libraryLevel,  setLibraryLevel]  = useState(null);

  // ── Check-ins ────────────────────────────────────────────────────
  const [showMiddayBanner,  setShowMiddayBanner]  = useState(false);
  const [showMiddayPanel,   setShowMiddayPanel]   = useState(false);
  const [showEveningBanner, setShowEveningBanner] = useState(false);
  const [showEveningPanel,  setShowEveningPanel]  = useState(false);

  // ── Refs for debounced saves ─────────────────────────────────────
  const anchorDataRef  = useRef(anchorData);
  const todayTasksRef  = useRef(todayTasks);
  const subSaveTimer   = useRef(null);
  anchorDataRef.current = anchorData;   // keep refs in sync every render
  todayTasksRef.current = todayTasks;

  // ── Helpers ──────────────────────────────────────────────────────
  function buildWeekSummary() {
    const c = getCurrentWeekLevelCounts();
    return `This week: Health ${c.l1}/7 · Safety ${c.l2}/7 · Connection ${c.l3}/7`;
  }

  const refresh = useCallback(() => {
    checkDayReset();
    setEnergy(lg('energy', lg('default_energy', 'medium')));
    setGentleMode(lg('gentle_mode', false));

    const raw  = lg('anchors_' + todayStr(), { checked: [false, false, false, false], subs: ['', '', '', ''] });
    const data = {
      checked: [raw.checked[0] ?? false, raw.checked[1] ?? false, raw.checked[2] ?? false, raw.checked[3] ?? false],
      subs:    [raw.subs[0]    ?? '',    raw.subs[1]    ?? '',    raw.subs[2]    ?? '',    raw.subs[3]    ?? ''   ],
    };
    anchorDataRef.current = data;
    setAnchorData(data);

    setSelectedSuggestionIds(lg('anchorSelectedSug_' + todayStr(), {}));
    setTodayLevels(getTodayLevels());
    setWeekSummary(buildWeekSummary());
    setSparksData(loadSparksData());
    setConnLog(lg('connectionLog', { dom: { lastDate: '' }, eli: { lastDate: '' } }));
    setOpenSuggestionIdx(null);
    setConnectionPrompt(null);
    setIron(getIronStatus());
    setLabs(getLabsStatus());

    // Load today's task list + auto-launch flow if not done yet
    const tasks = getTodayTasksForDate(todayStr());
    todayTasksRef.current = tasks;
    setTodayTasks(tasks);
    if (!isFlowDoneToday() && tasks.length === 0) {
      setShowFlow(true);
    }

    // Check-in banners (first open after configured hour)
    setShowMiddayBanner(isMiddayCheckInDue());
    setShowEveningBanner(isEveningWindDownDue());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isActive) refresh();
  }, [isActive, refresh]);

  useEffect(() => {
    return () => { if (subSaveTimer.current) clearTimeout(subSaveTimer.current); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      checkDayReset();
      setIron(getIronStatus());
      setLabs(getLabsStatus());
      // Reveal banners as soon as the hour threshold is crossed
      if (isMiddayCheckInDue())  setShowMiddayBanner(true);
      if (isEveningWindDownDue()) setShowEveningBanner(true);
    }, 60000);
    return () => clearInterval(id);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────

  function handleSetEnergy(level) {
    ls('energy', level);
    setEnergy(level);
    setOpenSuggestionIdx(null);
  }

  function logConnectionForPerson(person) {
    const next = { ...connLog, [person]: { lastDate: todayStr() } };
    setConnLog(next);
    ls('connectionLog', next);
  }

  function toggleAnchor(i) {
    if (subSaveTimer.current) { clearTimeout(subSaveTimer.current); subSaveTimer.current = null; }

    const latest = anchorDataRef.current;
    const next   = { checked: [...latest.checked], subs: [...latest.subs] };
    next.checked[i] = !next.checked[i];
    ls('anchors_' + todayStr(), next);
    anchorDataRef.current = next;
    setAnchorData(next);

    if (next.checked[i]) {
      setFlashIdx(i);
      setTimeout(() => setFlashIdx(null), 700);

      // Sync: mark any linked TodayTasks for this anchorType as complete
      if (i < 3) {
        const aType = ANCHOR_TYPES[i];
        const synced = todayTasksRef.current.map(t =>
          t.anchorType === aType && !t.completed ? { ...t, completed: true } : t
        );
        if (synced.some((t, idx) => t.completed !== todayTasksRef.current[idx].completed)) {
          saveTodayTasksForDate(todayStr(), synced);
          todayTasksRef.current = synced;
          setTodayTasks(synced);
        }
      }

      // Handle suggestion completion
      const sugId = i < 3 ? selectedSuggestionIds[i] : null;
      if (sugId) {
        markSuggestionDone(sugId);
        const newLevels = getTodayLevels();
        setTodayLevels(newLevels);
        setWeekSummary(buildWeekSummary());

        // Connection detection — check suggestion tags + text
        const sug = getAllSuggestions().find(s => s.id === sugId);
        if (sug?.tags?.some(t => t === 'connection' || t === 'relationships')) {
          const text   = sug.text.toLowerCase();
          const person = text.includes('dom') ? 'dom' : text.includes('eli') ? 'eli' : null;
          if (person) {
            logConnectionForPerson(person);
          } else {
            setConnectionPrompt(i);
          }
        }
      }

      // Sparks + streak
      const { total, todaySparks, delta } = updateSparksOnToggle(next.checked);
      const { current }                   = updateStreak(next.checked);
      setSparksData({ total, current, todaySparks });
      if (delta > 0) {
        setSparkFloat({ idx: i, delta });
        setTimeout(() => setSparkFloat(null), 900);
      }

      // Badge checks
      checkBadges({
        streak: current,
        checkedAny: true,
        energy,
        hasConnectionLog: !!(connLog.dom.lastDate || connLog.eli.lastDate),
        hasLabsDate: !!lg('labs_date', ''),
      });
    }
  }

  function handleSubChange(i, val) {
    const latest = anchorDataRef.current;
    const next   = { checked: [...latest.checked], subs: [...latest.subs] };
    next.subs[i] = val;
    anchorDataRef.current = next;
    setAnchorData(next);
    if (subSaveTimer.current) clearTimeout(subSaveTimer.current);
    subSaveTimer.current = setTimeout(() => {
      ls('anchors_' + todayStr(), anchorDataRef.current);
      subSaveTimer.current = null;
    }, 400);
  }

  function toggleIron() {
    const t      = todayStr();
    const wasOff = lg('iron_last', '') !== t;
    ls('iron_last', wasOff ? t : '');
    if (wasOff) {
      incrementIronLog();
      checkBadges({ hasLabsDate: !!lg('labs_date', '') });
    }
    setIron(getIronStatus());
  }

  function toggleSuggestions(i) {
    if (openSuggestionIdx === i) { setOpenSuggestionIdx(null); return; }
    setCurrentSuggestions(getScoredSuggestions(ANCHOR_TYPES[i], energy));
    setOpenSuggestionIdx(i);
  }

  // ── Today List handlers ───────────────────────────────────────────

  /** Complete a TodayTask by ID. One-way. Syncs anchor + sparks. */
  function handleCompleteTask(taskId) {
    const task = todayTasksRef.current.find(t => t.id === taskId);
    if (!task || task.completed) return;

    // 1. Mark task complete
    const updatedTasks = todayTasksRef.current.map(t =>
      t.id === taskId ? { ...t, completed: true } : t
    );
    saveTodayTasksForDate(todayStr(), updatedTasks);
    todayTasksRef.current = updatedTasks;
    setTodayTasks(updatedTasks);

    // 2. Mark suggestion done (updates dailyLevels + suggestionLastDone)
    if (task.suggestionId) {
      markSuggestionDone(task.suggestionId);
      setTodayLevels(getTodayLevels());
      setWeekSummary(buildWeekSummary());
    }

    // 3. Mark anchor done if not already (for sparks via delta mechanism)
    let finalChecked = anchorDataRef.current.checked;
    if (task.anchorType) {
      const ai = ANCHOR_TYPE_TO_IDX[task.anchorType];
      if (ai !== undefined && !anchorDataRef.current.checked[ai]) {
        const nextAnchor = {
          checked: [...anchorDataRef.current.checked],
          subs:    [...anchorDataRef.current.subs],
        };
        nextAnchor.checked[ai] = true;
        if (!nextAnchor.subs[ai]) nextAnchor.subs[ai] = task.text;
        ls('anchors_' + todayStr(), nextAnchor);
        anchorDataRef.current = nextAnchor;
        setAnchorData(nextAnchor);
        finalChecked = nextAnchor.checked;
        setFlashIdx(ai);
        setTimeout(() => setFlashIdx(null), 700);
      }
    }

    // 4. Sparks + streak
    const { total, todaySparks, delta } = updateSparksOnToggle(finalChecked);
    const { current }                   = updateStreak(finalChecked);
    setSparksData({ total, current, todaySparks });
    if (delta > 0) {
      const floatIdx = task.anchorType ? (ANCHOR_TYPE_TO_IDX[task.anchorType] ?? 0) : 0;
      setSparkFloat({ idx: floatIdx, delta });
      setTimeout(() => setSparkFloat(null), 900);
    }

    // 5. Badge checks
    checkBadges({
      streak: current, checkedAny: true, energy,
      hasConnectionLog: !!(connLog.dom.lastDate || connLog.eli.lastDate),
      hasLabsDate: !!lg('labs_date', ''),
    });
  }

  /** Add a suggestion from the library as a new (incomplete) TodayTask. */
  function handleAddFromLibrary(sug) {
    const today = todayStr();
    if (todayTasksRef.current.some(t => t.suggestionId === sug.id)) return;
    const newTask = {
      id:          makeTaskId(),
      suggestionId: sug.id,
      level:       sug.level,
      anchorType:  sug.anchorType,
      text:        sug.text,
      timeOfDay:   defaultTimeOfDay(sug.level),
      essential:   false,
      completed:   false,
    };
    const updatedTasks = [...todayTasksRef.current, newTask];
    saveTodayTasksForDate(today, updatedTasks);
    todayTasksRef.current = updatedTasks;
    setTodayTasks(updatedTasks);
  }

  /** Called when the wizard is confirmed with a task list. */
  function handleFlowComplete(tasks, mood) {
    const today = todayStr();
    saveTodayTasksForDate(today, tasks);
    todayTasksRef.current = tasks;
    setTodayTasks(tasks);
    if (mood !== null && mood !== undefined) {
      ls('mood', { ...lg('mood', {}), [today]: mood });
    }
    markFlowDoneToday();
    setShowFlow(false);
  }

  /** Called when the wizard is dismissed without completing. */
  function handleFlowSkip() {
    markFlowDoneToday(); // prevents auto-re-launch today
    setShowFlow(false);
  }

  /** Re-run the wizard, clearing current task list after confirmation. */
  function handleRebuildToday() {
    const existing = todayTasksRef.current;
    if (existing.length > 0) {
      if (!window.confirm('This will clear your current Today List and rebuild it. Continue?')) return;
    }
    clearFlowDoneToday();
    saveTodayTasksForDate(todayStr(), []);
    todayTasksRef.current = [];
    setTodayTasks([]);
    setShowFlow(true);
  }

  // ── Check-in handlers ────────────────────────────────────────────

  function handleMiddayClose() {
    dismissMiddayCheckIn();
    setShowMiddayPanel(false);
    setShowMiddayBanner(false);
  }

  function handleDeferTask(task) {
    const updatedList = deferTaskToTomorrow(task);
    todayTasksRef.current = updatedList;
    setTodayTasks(updatedList);
  }

  function handleEveningClose() {
    dismissEveningWindDown();
    setShowEveningPanel(false);
    setShowEveningBanner(false);
  }

  function handleWindDownComplete() {
    // +3 sparks (idempotent per day)
    addWindDownSparks();
    setSparksData(loadSparksData());
    // Progress toward Reflective badge (idempotent per week)
    const wn = getWeekNum(new Date());
    incrementReflectionCount(wn);
    checkBadges({});
    dismissEveningWindDown();
    setShowEveningPanel(false);
    setShowEveningBanner(false);
  }

  function openLibraryForLevel(level) {
    setLibraryLevel(level ?? null);
    setShowLibrary(true);
  }

  function handleLibraryClose() {
    setShowLibrary(false);
    setLibraryLevel(null);
  }

  function handleSuggestionSelect(i, suggestion) {
    // If the anchor is already checked, do nothing (don't double-count Sparks)
    if (anchorDataRef.current.checked[i]) return;

    if (subSaveTimer.current) { clearTimeout(subSaveTimer.current); subSaveTimer.current = null; }

    const latest = anchorDataRef.current;
    const next   = { checked: [...latest.checked], subs: [...latest.subs] };

    // Fill task field + immediately mark anchor as complete
    next.subs[i]    = suggestion.text;
    next.checked[i] = true;

    ls('anchors_' + todayStr(), next);
    anchorDataRef.current = next;
    setAnchorData(next);

    // Record selected suggestion
    const nextIds = { ...selectedSuggestionIds, [i]: suggestion.isFallback ? null : suggestion.id };
    setSelectedSuggestionIds(nextIds);
    ls('anchorSelectedSug_' + todayStr(), nextIds);

    // Flash the checkbox
    setFlashIdx(i);
    setTimeout(() => setFlashIdx(null), 700);

    // Mark suggestion done + update pyramid
    if (!suggestion.isFallback && suggestion.id) {
      markSuggestionDone(suggestion.id);
      setTodayLevels(getTodayLevels());
      setWeekSummary(buildWeekSummary());

      // Connection detection
      const sug = getAllSuggestions().find(s => s.id === suggestion.id);
      if (sug?.tags?.some(t => t === 'connection' || t === 'relationships')) {
        const text   = sug.text.toLowerCase();
        const person = text.includes('dom') ? 'dom' : text.includes('eli') ? 'eli' : null;
        if (person) {
          logConnectionForPerson(person);
        } else {
          setConnectionPrompt(i);
        }
      }
    }

    // Sparks + streak
    const { total, todaySparks, delta } = updateSparksOnToggle(next.checked);
    const { current }                   = updateStreak(next.checked);
    setSparksData({ total, current, todaySparks });
    if (delta > 0) {
      setSparkFloat({ idx: i, delta });
      setTimeout(() => setSparkFloat(null), 900);
    }

    // Badge checks
    checkBadges({
      streak: current,
      checkedAny: true,
      energy,
      hasConnectionLog: !!(connLog.dom.lastDate || connLog.eli.lastDate),
      hasLabsDate: !!lg('labs_date', ''),
    });

    // Sync TodayTask: create-and-complete, or mark existing complete
    if (!suggestion.isFallback && suggestion.id) {
      const today   = todayStr();
      const tasks   = todayTasksRef.current;
      const existing = tasks.find(t => t.suggestionId === suggestion.id);
      let updatedTasks;
      if (existing) {
        updatedTasks = tasks.map(t =>
          t.id === existing.id ? { ...t, completed: true } : t
        );
      } else {
        updatedTasks = [...tasks, {
          id:          makeTaskId(),
          suggestionId: suggestion.id,
          level:       suggestion.level ?? 1,
          anchorType:  suggestion.anchorType,
          text:        suggestion.text,
          timeOfDay:   defaultTimeOfDay(suggestion.level ?? 1),
          essential:   false,
          completed:   true,
        }];
      }
      saveTodayTasksForDate(today, updatedTasks);
      todayTasksRef.current = updatedTasks;
      setTodayTasks(updatedTasks);
    }

    // Keep dropdown open so ✅ is visible — do NOT close it
  }

  // ── Derived values ────────────────────────────────────────────────
  const isLow  = energy === 'low';
  const isFull = energy === 'full';

  const anchorCount  = isLow ? 1 : 3;
  const anchorHeader = isLow
    ? "Today's Anchors · even one is enough 💜"
    : '☀️ Today\'s Anchors';

  const showIron = !isLow || iron.urgent;
  const showLabs = !isLow;
  const showJob  = !isLow;

  const d        = new Date();
  const subtitle = `${WEEKDAYS_FULL[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()} · ${ENERGY_LABELS[energy]}`;

  // ── Reusable anchor card renderer ──────────────────────────────────
  function renderAnchorCard(i, isBonus = false) {
    const color = isBonus ? 'var(--amber)' : 'var(--magenta)';
    return (
      <div className="card" key={isBonus ? 'bonus' : i}>
        <div className="accented">
          <div className="strip" style={{ background: color, opacity: isBonus ? 0.7 : 1 }} />
          <div style={{ flex: 1 }}>
            <div className="anchor-row">
              <div className="cb-wrap">
                <div
                  className={`cb${isBonus ? ' cb-bonus' : ''}${anchorData.checked[i] ? ' done' : ''}${flashIdx === i ? ' flash' : ''}`}
                  onClick={() => toggleAnchor(i)}
                >
                  ✓
                </div>
                {sparkFloat?.idx === i && (
                  <div className="spark-float">+{sparkFloat.delta} ✨</div>
                )}
              </div>
              <div className="ai">
                <div className="at" style={isBonus ? { color: 'var(--amber)' } : {}}>
                  {ANCHOR_TITLES[i]}
                </div>
                <input
                  className="as"
                  type="text"
                  placeholder={ANCHOR_PLACEHOLDERS[i]}
                  value={anchorData.subs[i] || ''}
                  onChange={e => handleSubChange(i, e.target.value)}
                />
              </div>
            </div>

            {/* Suggestion menu (regular anchors only) */}
            {!isBonus && (
              <div className="sug-wrap">
                <button
                  className={`sug-btn${openSuggestionIdx === i ? ' open' : ''}`}
                  onClick={() => toggleSuggestions(i)}
                >
                  💡 Need ideas?
                </button>
                {openSuggestionIdx === i && (
                  <div className={`sug-list${anchorData.checked[i] ? ' sug-list-done' : ''}`}>
                    {currentSuggestions.map(s => {
                      const isDone = anchorData.checked[i] && selectedSuggestionIds[i] === s.id;
                      return (
                        <div key={s.id} className="sug-item" onClick={() => handleSuggestionSelect(i, s)}>
                          <span className="sug-text">{s.text}</span>
                          {isDone && <span className="sug-check">✅</span>}
                          {!isDone && !s.isFallback && s.typicalDurationMinutes && (
                            <span className="sug-dur">~{s.typicalDurationMinutes}m</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Connection attribution prompt */}
            {connectionPrompt === i && (
              <div className="conn-prompt">
                <span className="conn-prompt-txt">Who was this connection with?</span>
                <div className="conn-prompt-btns">
                  <button onClick={() => { logConnectionForPerson('dom'); setConnectionPrompt(null); }}>Dom</button>
                  <button onClick={() => { logConnectionForPerson('eli'); setConnectionPrompt(null); }}>Eli</button>
                  <button className="conn-other" onClick={() => setConnectionPrompt(null)}>Other</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── JSX ───────────────────────────────────────────────────────────
  return (
    <>
    <div className={`screen today-screen${isActive ? ' active' : ''}`}>
      <div className={`today-layout${isLow ? ' low-energy' : ''}`}>

        {/* ═══ LEFT PANEL ══════════════════════════════════════════ */}
        <div className="today-left">

          <div className="hd">
            <h1>Hey, Morgan 👋</h1>
            <p>{subtitle}</p>
          </div>

          <div className="pills">
            {['low', 'medium', 'full'].map(level => (
              <button
                key={level}
                className={`pill${energy === level ? ` on-${level}` : ''}`}
                onClick={() => handleSetEnergy(level)}
              >
                {level === 'low' ? '🔴 Low' : level === 'medium' ? '🟡 Medium' : '🟢 Full'}
              </button>
            ))}
          </div>

          {/* Start Today / Rebuild button */}
          <div className="start-today-row">
            {todayTasks.length > 0 ? (
              <button className="start-today-btn rebuild" onClick={handleRebuildToday}>
                ↺ Rebuild Today
              </button>
            ) : (
              <button className="start-today-btn" onClick={() => setShowFlow(true)}>
                ▶ Start Today
              </button>
            )}
          </div>

          {/* ── Check-in banners ──────────────────────────────────── */}
          {showMiddayBanner && !showMiddayPanel && (
            <div className="checkin-banner">
              <span>🕛 Midday check-in time!</span>
              <button className="checkin-banner-btn" onClick={() => setShowMiddayPanel(true)}>
                Check In
              </button>
              <button className="checkin-banner-x" onClick={handleMiddayClose} title="Dismiss">×</button>
            </div>
          )}
          {showEveningBanner && !showEveningPanel && (
            <div className="checkin-banner evening-banner">
              <span>🌙 Wind down your day?</span>
              <button className="checkin-banner-btn" onClick={() => setShowEveningPanel(true)}>
                Wind Down
              </button>
              <button className="checkin-banner-x" onClick={handleEveningClose} title="Dismiss">×</button>
            </div>
          )}

          <div className="sh" style={{ color: 'var(--magenta)' }}>{anchorHeader}</div>
          {Array.from({ length: anchorCount }, (_, i) => renderAnchorCard(i))}
          {isFull && renderAnchorCard(3, true)}

          {/* Iron card visible on low energy if urgent */}
          {isLow && iron.urgent && (
            <>
              <div className="sh" style={{ color: 'var(--lavender)' }}>💊 Health</div>
              <div className="card">
                <div className="accented">
                  <div className="strip" style={{ background: 'var(--lavender)' }} />
                  <div style={{ flex: 1 }}>
                    <div className="sc" onClick={toggleIron}>
                      <div className="sl">Iron Day</div>
                      <div className={`sv${iron.cls ? ' ' + iron.cls : ''}`}>{iron.text}</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <WhatsDueStrip />

          {/* Today's Task List */}
          <TodayTaskList
            tasks={todayTasks}
            onComplete={handleCompleteTask}
          />

          {/* Browse tasks by level */}
          {todayTasks.length > 0 && (
            <button
              className="browse-tasks-btn"
              onClick={() => setShowLibrary(true)}
            >
              + Browse tasks by level
            </button>
          )}

          {!isLow && (
            <>
              <div className="sh" style={{ color: 'var(--sub)' }}>Quick Links</div>
              <div className="ql-grid">
                {ALL_TILES.map(({ id, color, icon, label }) => {
                  const jobFull = isFull && id === 'job';
                  return (
                    <div
                      className={`ql${jobFull ? ' ql-featured' : ''}`}
                      key={id}
                      onClick={() => onOpenDetail(id, true)}
                    >
                      <div className="ql-top" style={{ background: color }} />
                      <div className="ql-body">
                        <div>
                          <div className="ql-icon">{icon}</div>
                          <div className="ql-lbl">{label}</div>
                        </div>
                        <div className="ql-arr">→ open</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ═══ RIGHT PANEL (always visible) ════════════════════════ */}
        <div className="today-right">

          <MaslowPyramid levels={todayLevels} weekSummary={weekSummary} />

          {isLow ? (
            /* Low energy — gentle support card instead of task list */
            <div className="card low-energy-card">
              <div className="body">
                <div className="le-line">Rest is productive 💜</div>
                <div className="le-line">Low energy is not failure.</div>
                <div className="le-line">One small thing is enough.</div>
              </div>
            </div>
          ) : (
            <>
              {/* Active Right Now */}
              <div className="sh" style={{ color: 'var(--orange)' }}>⚡ Active Right Now</div>

              {showIron && (
                <div className="card">
                  <div className="accented">
                    <div className="strip" style={{ background: 'var(--lavender)' }} />
                    <div style={{ flex: 1 }}>
                      <div className="sc" onClick={toggleIron}>
                        <div className="sl">💊 Iron Day</div>
                        <div className={`sv${iron.cls ? ' ' + iron.cls : ''}`}>{iron.text}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showLabs && (
                <div className="card">
                  <div className="accented">
                    <div className="strip" style={{ background: 'var(--lavender)' }} />
                    <div style={{ flex: 1 }}>
                      <div className="sc">
                        <div className="sl">🩺 Labs Recheck</div>
                        <div className={`sv${labs.cls ? ' ' + labs.cls : ''}`}>{labs.text}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showJob && (
                <div className="card">
                  <div className="accented">
                    <div className="strip" style={{ background: 'var(--rose)' }} />
                    <div style={{ flex: 1 }}>
                      <div className="sc" onClick={() => onOpenDetail('job', true)}>
                        <div className="sl">
                          💼 Job Search
                          {isFull && <span className="badge badge-full">Good day for a focus block! 🟢</span>}
                        </div>
                        <div className="sv">Tap to view tracker →</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <SparksStreakWidget
            total={sparksData.total}
            current={sparksData.current}
            todaySparks={sparksData.todaySparks}
          />

          <RelationshipPanel
            connLog={connLog}
            onOpenDetail={id => onOpenDetail(id, false)}
          />

          <TodaysStoryCard
            todayLevels={todayLevels}
            anchorData={anchorData}
            todaySparks={sparksData.todaySparks}
            currentStreak={sparksData.current}
          />

        </div>

      </div>
    </div>

    {/* ── Overlays ──────────────────────────────────────────────── */}
    <StartTodayFlow
      isOpen={showFlow}
      energy={energy}
      onEnergyChange={handleSetEnergy}
      iron={iron}
      labs={labs}
      onComplete={handleFlowComplete}
      onSkip={handleFlowSkip}
    />

    <TaskLibrary
      isOpen={showLibrary}
      onClose={handleLibraryClose}
      onAdd={handleAddFromLibrary}
      existingTaskSugIds={new Set(todayTasks.map(t => t.suggestionId).filter(Boolean))}
      levelFilter={libraryLevel}
    />

    <MiddayCheckIn
      isOpen={showMiddayPanel}
      onClose={handleMiddayClose}
      todayTasks={todayTasks}
      todayLevels={todayLevels}
      energy={energy}
      onDeferTask={handleDeferTask}
      onAddTinyWin={() => openLibraryForLevel(1)}
      onCompleteTask={handleCompleteTask}
    />

    <EveningWindDown
      isOpen={showEveningPanel}
      onClose={handleEveningClose}
      todayTasks={todayTasks}
      todayLevels={todayLevels}
      energy={energy}
      onWindDownComplete={handleWindDownComplete}
    />
    </>
  );
}
