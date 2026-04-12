const KEY = 'mlos_';

export function lg(k, def = null) {
  try {
    const v = localStorage.getItem(KEY + k);
    return v !== null ? JSON.parse(v) : def;
  } catch {
    return def;
  }
}

export function ls(k, v) {
  try {
    localStorage.setItem(KEY + k, JSON.stringify(v));
  } catch {}
}

export function exportAll() {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(KEY)) out[k] = localStorage.getItem(k);
  }
  return out;
}

export function importAll(data) {
  Object.entries(data).forEach(([k, v]) => {
    if (k.startsWith(KEY)) localStorage.setItem(k, v);
  });
}
