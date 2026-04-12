import { useState, useCallback } from 'react';
import './App.css';
import Today     from './screens/Today';
import ThisWeek  from './screens/ThisWeek';
import Reference from './screens/Reference';
import Settings  from './screens/Settings';
import DetailView from './components/DetailView';

const TABS = [
  { id: 'today',    icon: '🏠', label: 'Today' },
  { id: 'week',     icon: '📋', label: 'This Week' },
  { id: 'ref',      icon: '📚', label: 'Reference' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('today');
  const [detail, setDetail] = useState(null); // { id: string } | null

  // Opens detail overlay. If switchToRef is true, also navigates to Reference tab.
  const openDetail = useCallback((id, switchToRef = false) => {
    if (switchToRef) setActiveTab('ref');
    setDetail({ id });
  }, []);

  const closeDetail = useCallback(() => setDetail(null), []);

  return (
    <div className="app">
      <Today
        isActive={activeTab === 'today'}
        onOpenDetail={openDetail}
      />
      <ThisWeek
        isActive={activeTab === 'week'}
      />
      <Reference
        isActive={activeTab === 'ref'}
      />
      <Settings
        isActive={activeTab === 'settings'}
      />

      {/* Bottom nav */}
      <nav className="nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="ni">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Fullscreen detail overlay */}
      <DetailView detail={detail} onClose={closeDetail} />
    </div>
  );
}
