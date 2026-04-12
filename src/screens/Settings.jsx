import { useState, useEffect, useCallback } from 'react';
import { lg, ls, exportAll, importAll } from '../lib/storage';
import { todayStr, parseLocal } from '../lib/dates';
import { checkBadges, getBadges, BADGE_DEFS } from '../lib/badges';
import { getCheckInHours, setCheckInHours } from '../lib/checkIns';

function fmtHour(h) {
  if (h === 0)  return '12:00 AM';
  if (h < 12)  return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}

function Toggle({ storageKey, defaultVal, label, sub }) {
  const [checked, setChecked] = useState(() => lg(storageKey, defaultVal));

  function handleChange(e) {
    setChecked(e.target.checked);
    ls(storageKey, e.target.checked);
  }

  return (
    <div className="s-row">
      <div>
        <div className="s-lbl">{label}</div>
        {sub && <div className="s-sub">{sub}</div>}
      </div>
      <label className="tog">
        <input type="checkbox" checked={checked} onChange={handleChange} />
        <div className="tog-track" />
        <div className="tog-thumb" />
      </label>
    </div>
  );
}

export default function Settings({ isActive }) {
  const [defaultEnergy,  setDefaultEnergy]  = useState('medium');
  const [labsDate,       setLabsDate]       = useState('');
  const [labsSub,        setLabsSub]        = useState('Shows countdown on Today');
  const [morningTime,    setMorningTime]    = useState('08:00');
  const [eveningTime,    setEveningTime]    = useState('21:00');
  const [middayHour,     setMiddayHour]     = useState(13);
  const [eveningHour,    setEveningHour]    = useState(19);
  const [badges,         setBadges]         = useState({});

  const refresh = useCallback(() => {
    setDefaultEnergy(lg('default_energy', 'medium'));
    const ld = lg('labs_date', '') || '';
    setLabsDate(ld);
    setLabsSub(calcLabsSub(ld));
    setMorningTime(lg('morning_time', '08:00'));
    setEveningTime(lg('evening_time', '21:00'));
    const hours = getCheckInHours();
    setMiddayHour(hours.midday);
    setEveningHour(hours.evening);
    setBadges(getBadges());
  }, []);

  useEffect(() => {
    if (isActive) refresh();
  }, [isActive, refresh]);

  function calcLabsSub(date) {
    if (!date) return 'Shows countdown on Today';
    const diff = Math.round((parseLocal(date) - parseLocal(todayStr())) / 86400000);
    if (diff < 0)   return `Was ${Math.abs(diff)} days ago`;
    if (diff === 0) return 'Today!';
    return `${diff} day${diff !== 1 ? 's' : ''} away`;
  }

  function handleDefaultEnergy(level) {
    ls('default_energy', level);
    setDefaultEnergy(level);
  }

  function handleLabsDate(val) {
    ls('labs_date', val);
    setLabsDate(val);
    setLabsSub(calcLabsSub(val));
    if (val) {
      checkBadges({ hasLabsDate: true });
      setBadges(getBadges());
    }
  }

  function handleMorningTime(val) {
    ls('morning_time', val);
    setMorningTime(val);
  }

  function handleEveningTime(val) {
    ls('evening_time', val);
    setEveningTime(val);
  }

  function handleMiddayHour(val) {
    const h = Number(val);
    setMiddayHour(h);
    setCheckInHours({ midday: h });
  }

  function handleEveningHour(val) {
    const h = Number(val);
    setEveningHour(h);
    setCheckInHours({ evening: h });
  }

  function handleExport() {
    const data = exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `morgan-life-os-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        importAll(data);
        alert('Imported successfully! The app will reload.');
        window.location.reload();
      } catch {
        alert('Import failed — not a valid backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className={`screen set-screen${isActive ? ' active' : ''}`}>

      <div className="set-hd-row">
        <div className="hd"><h1>Settings ⚙️</h1></div>
      </div>

      <div className="set-layout">

        {/* ═══ LEFT: Energy, Anchors, Health ═══ */}
        <div className="set-col">

          {/* Default Energy */}
          <div className="sh" style={{ color: 'var(--amber)' }}>🌡️ Default Energy Mode</div>
          <div className="s-card">
            {[
              { level: 'low',    dot: 'var(--red)',   emoji: '🔴 Low' },
              { level: 'medium', dot: 'var(--amber)', emoji: '🟡 Medium' },
              { level: 'full',   dot: 'var(--mint)',  emoji: '🟢 Full' },
            ].map(({ level, dot, emoji }, i) => (
              <div
                key={level}
                className="eo"
                onClick={() => handleDefaultEnergy(level)}
                style={i > 0 ? { borderTop: '1px solid var(--border)' } : {}}
              >
                <div className="eo-dot" style={{ background: dot }} />
                <div className="eo-lbl">{emoji}</div>
                {defaultEnergy === level && <div className="eo-ck">✓</div>}
              </div>
            ))}
          </div>

          {/* Anchors */}
          <div className="sh" style={{ color: 'var(--magenta)' }}>⚡ Anchors</div>
          <div className="s-card">
            <Toggle storageKey="morning_anchor" defaultVal={true}  label="☀️ Morning anchor" />
            <Toggle storageKey="midday_anchor"  defaultVal={true}  label="🏠 Midday anchor" />
            <Toggle storageKey="evening_anchor" defaultVal={true}  label="🌙 Evening anchor" />
            <Toggle storageKey="daytype_prompt" defaultVal={false} label="🌡️ Day-type prompt" sub="Ask energy level on open" />
          </div>

          {/* Health Reminders */}
          <div className="sh" style={{ color: 'var(--lavender)' }}>💊 Health Reminders</div>
          <div className="s-card">
            <Toggle storageKey="iron_reminder" defaultVal={true}  label="Iron day reminder"   sub="Alternate days" />
            <Toggle storageKey="pots_reminder" defaultVal={false} label="POTS check-in nudge" sub="Morning" />
            <div className="s-row">
              <div>
                <div className="s-lbl">Labs recheck date</div>
                <div className="s-sub">{labsSub}</div>
              </div>
              <input
                type="date"
                className="s-input"
                value={labsDate}
                onChange={e => handleLabsDate(e.target.value)}
              />
            </div>
          </div>

          {/* Data */}
          <div className="sh" style={{ color: 'var(--sub)' }}>💾 Data</div>
          <div className="s-card">
            <div className="s-row" style={{ cursor: 'pointer' }} onClick={handleExport}>
              <div className="s-lbl">Export to JSON</div>
              <span style={{ color: 'var(--sub)', fontSize: 20 }}>↓</span>
            </div>
            <div
              className="s-row"
              style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }}
              onClick={() => document.getElementById('imp-input').click()}
            >
              <div className="s-lbl">Import from JSON</div>
              <span style={{ color: 'var(--sub)', fontSize: 20 }}>↑</span>
            </div>
            <input type="file" id="imp-input" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          </div>

        </div>

        {/* ═══ RIGHT: Notifications, Badges ═══ */}
        <div className="set-col">

          {/* Notifications */}
          <div className="sh" style={{ color: 'var(--orange)' }}>🔔 Notifications</div>
          <div className="s-card">
            <div className="s-row">
              <div className="s-lbl">Morning nudge</div>
              <input
                type="time"
                className="s-input"
                value={morningTime}
                onChange={e => handleMorningTime(e.target.value)}
              />
            </div>
            <div className="s-row" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="s-lbl">Evening nudge</div>
              <input
                type="time"
                className="s-input"
                value={eveningTime}
                onChange={e => handleEveningTime(e.target.value)}
              />
            </div>
            <Toggle storageKey="gentle_mode" defaultVal={false} label="Gentle mode" sub="Softer language on low-energy days" />
          </div>

          {/* Check-in timing */}
          <div className="sh" style={{ color: 'var(--amber)' }}>✨ Daily Check-Ins</div>
          <div className="s-card">
            <div className="s-row">
              <div>
                <div className="s-lbl">🕛 Midday check-in</div>
                <div className="s-sub">Banner appears after this hour</div>
              </div>
              <select
                className="s-input s-select"
                value={middayHour}
                onChange={e => handleMiddayHour(e.target.value)}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{fmtHour(h)}</option>
                ))}
              </select>
            </div>
            <div className="s-row" style={{ borderTop: '1px solid var(--border)' }}>
              <div>
                <div className="s-lbl">🌙 Evening wind-down</div>
                <div className="s-sub">Banner appears after this hour</div>
              </div>
              <select
                className="s-input s-select"
                value={eveningHour}
                onChange={e => handleEveningHour(e.target.value)}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{fmtHour(h)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Badges */}
          <div className="sh" style={{ color: 'var(--amber)' }}>🏅 Badges</div>
          <div className="badge-grid">
            {BADGE_DEFS.map(b => {
              const data     = badges[b.id] || { unlocked: false };
              const unlocked = data.unlocked;
              return (
                <div key={b.id} className={`badge-tile${!unlocked ? ' badge-locked' : ''}`}>
                  <div className="badge-emoji">{b.emoji}</div>
                  <div className="badge-name">{b.name}</div>
                  <div className="badge-desc">{b.desc}</div>
                  {unlocked && (
                    <div className="badge-earned">
                      ✓ {data.dateEarned ? data.dateEarned : 'Earned'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="about">
            Morgan Life OS · v1.0<br />
            Local · private · yours 🌅<br />
            <span style={{ fontSize: 11 }}>
              All data lives in your browser's localStorage.<br />
              Use Export JSON to back up regularly.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
