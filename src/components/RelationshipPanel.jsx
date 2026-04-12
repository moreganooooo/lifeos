import { parseLocal, todayStr } from '../lib/dates';

const DOT_COLORS = {
  green: '#86efac',
  amber: '#fbbf24',
  gray:  'var(--border)',
};

function statusFor(lastDate) {
  if (!lastDate) return { dot: 'gray', label: 'No log yet' };
  const days = Math.max(0, Math.round(
    (parseLocal(todayStr()) - parseLocal(lastDate)) / 86400000
  ));
  if (days === 0) return { dot: 'green', label: 'Today' };
  if (days <= 3)  return { dot: 'amber', label: `${days}d ago` };
  return { dot: 'gray', label: `${days}d ago` };
}

export default function RelationshipPanel({ connLog, onOpenDetail }) {
  const dom = statusFor(connLog?.dom?.lastDate ?? '');
  const eli = statusFor(connLog?.eli?.lastDate ?? '');

  const people = [
    { key: 'dom', name: 'Dom', detailId: 'dom', status: dom },
    { key: 'eli', name: 'Eli', detailId: 'eli', status: eli },
  ];

  return (
    <div className="rel-panel">
      <div className="sh" style={{ color: 'var(--rose)', marginTop: 0 }}>❤️ Connection</div>
      <div className="card">
        {people.map(({ key, name, detailId, status }, i) => (
          <div
            key={key}
            className="rel-row"
            style={i > 0 ? { borderTop: '1px solid var(--border)' } : {}}
            onClick={() => onOpenDetail(detailId)}
          >
            <div
              className="rel-dot"
              style={{
                background: DOT_COLORS[status.dot],
                boxShadow: status.dot === 'green' ? `0 0 6px ${DOT_COLORS.green}` : 'none',
              }}
            />
            <div className="rel-name">{name}</div>
            <div className="rel-last">{status.label}</div>
            <div className="rel-arr">›</div>
          </div>
        ))}
      </div>
    </div>
  );
}
