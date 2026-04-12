// TodayTaskList — shows todayTasks[today] grouped by timeOfDay.
// Completion is one-way (checked → stays checked).

const TIME_GROUPS = [
  { key: 'morning', label: '🌅 Morning' },
  { key: 'midday',  label: '🕛 Midday' },
  { key: 'evening', label: '🌙 Evening' },
];

const LEVEL_COLOR = {
  1: 'var(--magenta)',
  2: 'var(--orange)',
  3: 'var(--rose)',
};

export default function TodayTaskList({ tasks, onComplete }) {
  if (!tasks || tasks.length === 0) return null;

  const total = tasks.length;
  const done  = tasks.filter(t => t.completed).length;

  return (
    <div className="tl-wrap">
      <div className="sh tl-sh">
        <span style={{ color: 'var(--lavender)' }}>📋 Today's Tasks</span>
        <span className="tl-count">{done}/{total} done</span>
      </div>

      {TIME_GROUPS.map(({ key, label }) => {
        const group = tasks.filter(t => t.timeOfDay === key);
        if (group.length === 0) return null;
        return (
          <div key={key} className="tl-group">
            <div className="tl-group-hd">{label}</div>
            <div className="card tl-card">
              {group.map((task, i) => (
                <div
                  key={task.id}
                  className={`tl-item${task.completed ? ' tl-item-done' : ''}${i > 0 ? ' tl-sep' : ''}`}
                >
                  {/* Level color bar */}
                  <div className="tl-level-bar" style={{ background: LEVEL_COLOR[task.level] }} />

                  {/* Checkbox */}
                  <div
                    className={`tl-cb${task.completed ? ' tl-cb-done' : ''}`}
                    style={task.completed ? {} : { borderColor: LEVEL_COLOR[task.level] }}
                    onClick={() => !task.completed && onComplete(task.id)}
                    title={task.completed ? 'Done' : 'Mark complete'}
                  >
                    {task.completed ? '✓' : ''}
                  </div>

                  {/* Text + meta */}
                  <div className="tl-body">
                    <div className={`tl-text${task.essential ? ' tl-essential' : ''}`}>
                      {task.text}
                    </div>
                    {task.essential && (
                      <span className="tl-ess-badge">⭐ essential</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
