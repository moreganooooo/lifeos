import { getTopOverdue } from '../lib/suggestions';

export default function WhatsDueStrip() {
  const overdue = getTopOverdue(3);

  if (overdue.length === 0) {
    return <div className="due-strip">You're all caught up today ✨</div>;
  }

  const chips = overdue.map(s => {
    const short = s.text.length > 30 ? s.text.slice(0, 27) + '…' : s.text;
    const tag   = s.daysSince >= 999 ? 'never done' : `${s.daysSince}d`;
    return `${short} (${tag})`;
  });

  return (
    <div className="due-strip">
      <span className="due-label">Next up: </span>
      {chips.join(' · ')}
    </div>
  );
}
