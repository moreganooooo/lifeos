export default function SparksStreakWidget({ total, current, todaySparks }) {
  return (
    <div className="sparks-widget">
      <div className="sh" style={{ color: 'var(--amber)', marginTop: 0 }}>✨ Sparks &amp; Streak</div>
      <div className="card">
        <div className="sparks-row">
          <div className="sparks-cell">
            <div className="sparks-icon">✨</div>
            <div className="sparks-num">{total}</div>
            <div className="sparks-lbl">Total Sparks</div>
          </div>
          <div className="sparks-sep" />
          <div className="sparks-cell">
            <div className="sparks-icon">🔥</div>
            <div className="sparks-num">{current}</div>
            <div className="sparks-lbl">Day streak</div>
          </div>
        </div>
        {todaySparks > 0 && (
          <div className="sparks-today">+{todaySparks} today</div>
        )}
      </div>
    </div>
  );
}
