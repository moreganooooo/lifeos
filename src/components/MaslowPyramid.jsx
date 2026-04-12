// Maslow pyramid for the Today right panel.
// Bars render top-to-bottom as Connection → Safety → Health,
// so the widest bar (Health) sits at the bottom — classic pyramid shape.
// Lit bars pulse with a CSS glow animation.

const BARS = [
  { key: 'l3', label: '❤️ Connection', litKey: 'level3Lit', color: '#f472b6', pct: 44 },
  { key: 'l2', label: '🛡️ Safety',     litKey: 'level2Lit', color: '#fb923c', pct: 72 },
  { key: 'l1', label: '💜 Health',     litKey: 'level1Lit', color: '#e879f9', pct: 100 },
];

export default function MaslowPyramid({ levels, weekSummary }) {
  return (
    <div className="pyramid-wrap">
      <div className="sh" style={{ color: 'var(--sub)', marginTop: 0 }}>Needs met today</div>
      <div className="pyramid">
        {BARS.map(({ key, label, litKey, color, pct }) => {
          const lit = levels[litKey];
          return (
            <div key={key} style={{ width: `${pct}%` }}>
              <div
                className={`pyr-bar${lit ? ' pyr-lit' : ''}`}
                style={lit ? {
                  '--pyr-glow': color + '88',
                  background: color,
                  color: '#1a0f2e',
                  borderColor: 'transparent',
                } : {}}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>
      {weekSummary && (
        <div className="pyr-week">{weekSummary}</div>
      )}
    </div>
  );
}
