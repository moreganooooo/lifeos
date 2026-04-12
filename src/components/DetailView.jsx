import { useEffect, useRef } from 'react';
import { lg, ls } from '../lib/storage';
import { REF_TITLES, REF_DEFAULTS } from '../lib/defaults';

export default function DetailView({ detail, onClose }) {
  const taRef = useRef(null);
  const isOpen = detail !== null;

  // Load content whenever the detail changes
  useEffect(() => {
    if (detail && taRef.current) {
      taRef.current.value = lg('ref_' + detail.id, REF_DEFAULTS[detail.id] ?? '');
    }
  }, [detail]);

  function handleInput() {
    if (detail && taRef.current) {
      ls('ref_' + detail.id, taRef.current.value);
    }
  }

  // Back button / keyboard escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <div className={`dv${isOpen ? ' open' : ''}`}>
      <div className="dv-hd">
        <button className="dv-back" onClick={onClose}>‹</button>
        <div className="dv-title">{detail ? (REF_TITLES[detail.id] ?? detail.id) : ''}</div>
      </div>
      <div className="dv-body">
        <textarea
          ref={taRef}
          className="dv-ta"
          placeholder="Tap to add your content…"
          onInput={handleInput}
        />
      </div>
    </div>
  );
}
