import { useState, useEffect, useCallback } from 'react';
import { lg, ls } from '../lib/storage';
import {
  todayStr, dateStr, MONTHS, WEEKDAYS, fmtShort,
  getMondayOf, getWeekNum, daysLeftInWeek, parseLocal,
} from '../lib/dates';
import { getWeekLevelCounts } from '../lib/suggestions';
import { addReflectionSparks, loadSparksData } from '../lib/sparks';
import { incrementReflectionCount, checkBadges } from '../lib/badges';

const ANCHOR_ICONS = ['☀️', '🏠', '🌙'];

const BASE_PROMPTS = [
  { key: 'r1', prompt: 'What worked this week?' },
  { key: 'r2', prompt: 'What was hard?' },
  { key: 'r3', prompt: 'One thing to keep next week?' },
];

const BONUS_PROMPT = { key: 'r4', prompt: 'One thing I want to build momentum on this week? 🟢' };

function buildWeekData(monday) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const ds = dateStr(d);
    const data = lg('anchors_' + ds, { checked: [false, false, false] });
    days.push({ d, ds, data });
  }
  return days;
}

function calcProgress(days) {
  const t = todayStr();
  let total = 0, full = 0;
  for (const { ds, data } of days) {
    if (ds > t) break;
    const done = data.checked.filter(Boolean).length;
    total += done;
    if (done >= 3) full++;
  }
  return { total, full };
}

export default function ThisWeek({ isActive }) {
  const [weekDays,    setWeekDays]    = useState([]);
  const [weekLabel,   setWeekLabel]   = useState('');
  const [progress,    setProgress]    = useState({ total: 0, full: 0 });
  const [reflection,  setReflection]  = useState({ r1: '', r2: '', r3: '', r4: '' });
  const [weekNum,     setWeekNum]     = useState(0);
  const [energy,      setEnergy]      = useState('medium');
  const [levelCounts, setLevelCounts] = useState({ l1: 0, l2: 0, l3: 0 });

  const refresh = useCallback(() => {
    const monday = getMondayOf(todayStr());
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const wn = getWeekNum(new Date());
    setWeekNum(wn);
    setWeekLabel(`${fmtShort(monday)} – ${fmtShort(sunday)} · Week ${wn}`);

    const days = buildWeekData(monday);
    setWeekDays(days);
    setProgress(calcProgress(days));
    setLevelCounts(getWeekLevelCounts(days));

    const saved = lg('reflect_' + wn, { r1: '', r2: '', r3: '', r4: '' });
    setReflection({ r1: saved.r1 ?? '', r2: saved.r2 ?? '', r3: saved.r3 ?? '', r4: saved.r4 ?? '' });

    setEnergy(lg('energy', lg('default_energy', 'medium')));
  }, []);

  useEffect(() => {
    if (isActive) refresh();
  }, [isActive, refresh]);

  function saveReflection(field, val) {
    const updated = { ...reflection, [field]: val };
    setReflection(updated);
    ls('reflect_' + weekNum, updated);

    // Award reflection sparks + track badge progress when r1 first filled
    if (field === 'r1' && val && !reflection.r1) {
      addReflectionSparks(weekNum);
      incrementReflectionCount(weekNum);
      checkBadges({});
    }
  }

  const t      = todayStr();
  const isFull = energy === 'full';
  const pct    = weekDays.length ? (progress.total / 21) * 100 : 0;
  const toGo   = daysLeftInWeek();
  const prompts = isFull ? [...BASE_PROMPTS, BONUS_PROMPT] : BASE_PROMPTS;

  return (
    <div className={`screen week-screen${isActive ? ' active' : ''}`}>
      <div className="week-layout">

        {/* ═══ LEFT: header, calendar, progress, tracker ═══ */}
        <div className="week-left">

          <div className="hd">
            <h1>This Week 📋</h1>
            <p>{weekLabel}</p>
          </div>

          {/* 7-day calendar strip */}
          <div className="cal">
            {weekDays.map(({ d, ds, data }) => {
              const isT    = ds === t;
              const isP    = ds < t;
              const isF    = ds > t;
              const allDone = isP && data.checked.every(Boolean);
              return (
                <div
                  key={ds}
                  className={`cd${isT ? ' today' : ''}${isP ? ' past' : ''}${isF ? ' future' : ''}`}
                >
                  <div className="cdn">{WEEKDAYS[d.getDay()]}</div>
                  <div className="cdd">{d.getDate()}</div>
                  {allDone ? <div className="cddot" /> : <div style={{ height: 10 }} />}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="prog">
            <div className="prog-hd">
              <h3>Week Progress</h3>
              <span>{progress.total} / 21 anchors</span>
            </div>
            <div className="prog-bar">
              <div className="prog-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="prog-sub">
              {progress.full} full day{progress.full !== 1 ? 's' : ''} done · {toGo} to go
            </div>
          </div>

          {/* Anchor tracker */}
          <div className="sh" style={{ color: 'var(--orange)' }}>📌 Anchor Tracker</div>
          <div className="card">
            {weekDays.map(({ d, ds, data }, rowIdx) => {
              const isT = ds === t;
              const isF = ds > t;
              return (
                <div
                  key={ds}
                  className={`tr-row${isT ? ' tr-today' : ''}${isF ? ' tr-future' : ''}`}
                  style={rowIdx > 0 ? { borderTop: '1px solid var(--border)' } : {}}
                >
                  <div className="tr-day">
                    {WEEKDAYS[d.getDay()]}
                    <br />
                    <span className="tr-date">{d.getDate()}</span>
                  </div>
                  <div className="tr-dots">
                    {[0, 1, 2].map(j => (
                      <div
                        key={j}
                        className={`dot${data.checked[j] ? ' done' : ''}${!data.checked[j] && isT ? ' t' : ''}`}
                      />
                    ))}
                  </div>
                  <div className="tr-labels">{ANCHOR_ICONS.join(' ')}</div>
                </div>
              );
            })}
          </div>

        </div>

        {/* ═══ RIGHT: level stats + reflection ═══ */}
        <div className="week-right">

          <div className="sh" style={{ color: 'var(--magenta)', marginTop: 0 }}>📊 Level Stats This Week</div>
          <div className="level-stats">
            <div className="level-stat">
              <div className="ls-num" style={{ color: 'var(--magenta)' }}>
                {levelCounts.l1}<span>/7</span>
              </div>
              <div className="ls-lbl">💜 Health</div>
            </div>
            <div className="level-stat">
              <div className="ls-num" style={{ color: 'var(--orange)' }}>
                {levelCounts.l2}<span>/7</span>
              </div>
              <div className="ls-lbl">🛡️ Safety</div>
            </div>
            <div className="level-stat">
              <div className="ls-num" style={{ color: 'var(--rose)' }}>
                {levelCounts.l3}<span>/7</span>
              </div>
              <div className="ls-lbl">❤️ Connection</div>
            </div>
          </div>

          {/* Weekly reflection */}
          <div className="sh" style={{ color: 'var(--lavender)' }}>💭 Weekly Reflection</div>
          <div className="card">
            <div className="body">
              {prompts.map(({ key, prompt }, idx) => (
                <div key={key}>
                  <div
                    className="rp"
                    style={{
                      marginTop: idx > 0 ? 4 : 0,
                      ...(key === 'r4' ? { color: 'var(--mint)' } : {}),
                    }}
                  >
                    {prompt}
                  </div>
                  <textarea
                    className={`rt${key === 'r4' ? ' rt-bonus' : ''}`}
                    placeholder="Type here…"
                    value={reflection[key]}
                    onChange={e => saveReflection(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
