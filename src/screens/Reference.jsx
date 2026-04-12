import { useState, useRef, useEffect } from 'react';
import { lg, ls } from '../lib/storage';
import { REF_TITLES, REF_DEFAULTS } from '../lib/defaults';
import SimpleMarkdown from '../components/SimpleMarkdown';

const SECTIONS = [
  {
    id: 'h1',
    label: '⚕️ Level 1 · Health',
    color: 'var(--magenta)',
    items: [
      { id: 'pots',    title: 'POTS & Volume Protocol',   desc: 'Salt loading, fluid targets, activity pacing',  tags: 'pots health volume level1' },
      { id: 'iron',    title: 'Iron & Supplement Plan',    desc: 'Alternate-day iron, timing, interactions',       tags: 'iron supplements health level1' },
      { id: 'scm',     title: 'Spine & SCM Protocol',      desc: 'Positioning, mobility, pain management',        tags: 'scm spine neck health level1' },
      { id: 'scripts', title: 'Provider Scripts',          desc: 'Words to use with doctors and providers',       tags: 'provider scripts doctor health level1' },
    ],
  },
  {
    id: 'h2',
    label: '🛡️ Level 2 · Safety',
    color: 'var(--orange)',
    items: [
      { id: 'home',  title: 'Weekly Home Checklist', desc: 'Minimum viable home maintenance',   tags: 'home checklist safety level2' },
      { id: 'job',   title: 'Job Search Tracker',    desc: 'Applications, follow-ups, targets', tags: 'job search career work safety level2' },
      { id: 'admin', title: 'Life Admin Checklist',  desc: 'Bills, appointments, paperwork',    tags: 'admin life bills safety level2' },
    ],
  },
  {
    id: 'h3',
    label: '❤️ Level 3 · Connection',
    color: 'var(--rose)',
    items: [
      { id: 'dom', title: 'Dom — Bond Rituals',        desc: 'Daily check-ins, repair scripts',    tags: 'dom bond connection relationship level3' },
      { id: 'eli', title: 'Eli — Connection Log',      desc: 'Moments, rituals, what matters',     tags: 'eli connection log level3' },
      { id: 'mvc', title: 'Minimum Viable Connection', desc: 'Low-energy days: what still counts', tags: 'minimum viable connection low energy level3' },
    ],
  },
  {
    id: 'hr',
    label: '📁 Resources',
    color: 'var(--lavender)',
    items: [
      { id: 'master', title: 'Life OS v1 Master',       desc: 'The full system overview',         tags: 'life os master overview resources' },
      { id: 'labs',   title: 'Lab Results & MRI Notes', desc: 'History, values, interpretations', tags: 'labs results mri notes history resources' },
    ],
  },
];

export default function Reference({ isActive }) {
  const [query,        setQuery]        = useState('');
  const [selectedItem, setSelectedItem] = useState(null); // { id, color, title } | null
  const [editing,      setEditing]      = useState(false);
  const [editContent,  setEditContent]  = useState('');
  const taRef = useRef(null);

  // Focus the textarea when edit mode activates
  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.selectionStart = taRef.current.value.length;
    }
  }, [editing]);

  const q = query.toLowerCase();

  function matches(item) {
    if (!q) return true;
    return item.title.toLowerCase().includes(q) || item.tags.includes(q);
  }

  function selectItem(item, color) {
    // Auto-save any in-progress edit before switching
    if (editing && selectedItem) {
      ls('ref_' + selectedItem.id, editContent);
    }
    const content = lg('ref_' + item.id, REF_DEFAULTS[item.id] ?? '');
    setSelectedItem({ id: item.id, color, title: item.title });
    setEditContent(content);
    setEditing(false);
  }

  function startEdit() {
    setEditing(true);
  }

  function saveEdit() {
    if (!selectedItem) return;
    ls('ref_' + selectedItem.id, editContent);
    setEditing(false);
  }

  function cancelEdit() {
    if (!selectedItem) return;
    // Reload from storage (discard unsaved changes)
    setEditContent(lg('ref_' + selectedItem.id, REF_DEFAULTS[selectedItem.id] ?? ''));
    setEditing(false);
  }

  return (
    <div className={`screen ref-screen${isActive ? ' active' : ''}`}>
      <div className="ref-layout">

        {/* ═══ LEFT: header, search, card list ═══ */}
        <div className="ref-left">

          <div className="hd">
            <h1>Reference 📚</h1>
            <p>Your protocols · scripts · history</p>
          </div>

          {/* Search */}
          <div className="srch">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search protocols…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--sub)', cursor: 'pointer', padding: '0 4px', fontSize: 16 }}
              >
                ×
              </button>
            )}
          </div>

          {/* Sections */}
          {SECTIONS.map(section => {
            const visibleItems = section.items.filter(matches);
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.id}>
                <div className="sh" style={{ color: section.color }}>{section.label}</div>
                <div className="card">
                  {visibleItems.map((item, i) => {
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <div key={item.id} style={i > 0 ? { borderTop: '1px solid var(--border)' } : {}}>
                        <div
                          className={`accented ref-card-row${isSelected ? ' ref-card-selected' : ''}`}
                          onClick={() => selectItem(item, section.color)}
                          style={{ cursor: 'pointer', borderLeft: isSelected ? `3px solid ${section.color}` : undefined }}
                        >
                          <div className="strip" style={{ background: section.color }} />
                          <div className="rc">
                            <div className="rci">
                              <div className="rct">{item.title}</div>
                              <div className="rcd">{item.desc}</div>
                            </div>
                            <div className="rca">{isSelected ? '›' : '›'}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        </div>

        {/* ═══ RIGHT: detail pane ═══ */}
        <div className="ref-right">
          {!selectedItem && (
            <div className="ref-placeholder">
              <div className="ref-ph-icon">📖</div>
              <div className="ref-ph-txt">← Select a protocol to read it here</div>
            </div>
          )}

          {selectedItem && (
            <div className="ref-detail">
              <div className="ref-detail-hd">
                <div className="ref-detail-title" style={{ color: selectedItem.color }}>
                  {selectedItem.title}
                </div>
                <div className="ref-detail-actions">
                  {editing ? (
                    <>
                      <button className="ref-btn ref-btn-save" onClick={saveEdit}>💾 Save</button>
                      <button className="ref-btn ref-btn-cancel" onClick={cancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <button className="ref-btn" onClick={startEdit}>✏️ Edit</button>
                  )}
                </div>
              </div>

              {editing ? (
                <textarea
                  ref={taRef}
                  className="ref-detail-ta"
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                />
              ) : (
                <div className="ref-detail-body">
                  <SimpleMarkdown>{editContent}</SimpleMarkdown>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
