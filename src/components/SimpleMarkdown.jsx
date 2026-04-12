// Lightweight markdown renderer for the Reference detail pane.
// Handles: # ## ### headings, - / • / □ bullet lists, **bold**, blank-line paragraphs,
// horizontal rules (━━━ / --- / ===), and numbered lists (1. item).
// No external dependencies.

function parseLine(line) {
  // Replace **bold** spans
  const chunks = line.split(/(\*\*[^*]+\*\*)/g);
  return chunks.map((chunk, i) =>
    chunk.startsWith('**') && chunk.endsWith('**')
      ? <strong key={i}>{chunk.slice(2, -2)}</strong>
      : chunk
  );
}

export default function SimpleMarkdown({ children }) {
  if (!children) return null;

  const lines  = children.split('\n');
  const output = [];
  let listItems = [];
  let key = 0;

  function flushList() {
    if (!listItems.length) return;
    output.push(<ul key={key++} className="md-ul">{listItems}</ul>);
    listItems = [];
  }

  for (const raw of lines) {
    const t = raw.trim();

    if (!t) {
      flushList();
      output.push(<div key={key++} className="md-gap" />);
      continue;
    }

    // Horizontal rule: ━━━ / --- / ===
    if (/^[━─=\-]{3,}$/.test(t)) {
      flushList();
      output.push(<hr key={key++} className="md-hr" />);
      continue;
    }

    // Headings
    const h3 = t.match(/^###\s+(.*)/);
    const h2 = t.match(/^##\s+(.*)/);
    const h1 = t.match(/^#\s+(.*)/);
    if (h1) { flushList(); output.push(<h1 key={key++} className="md-h1">{parseLine(h1[1])}</h1>); continue; }
    if (h2) { flushList(); output.push(<h2 key={key++} className="md-h2">{parseLine(h2[1])}</h2>); continue; }
    if (h3) { flushList(); output.push(<h3 key={key++} className="md-h3">{parseLine(h3[1])}</h3>); continue; }

    // Bullet list: - / • / * / □
    const li = t.match(/^[-•*□]\s+(.*)/);
    if (li) { listItems.push(<li key={key++}>{parseLine(li[1])}</li>); continue; }

    // Numbered list: 1. item
    const nl = t.match(/^\d+[.)]\s+(.*)/);
    if (nl) { listItems.push(<li key={key++}>{parseLine(nl[1])}</li>); continue; }

    // Plain paragraph
    flushList();
    output.push(<p key={key++} className="md-p">{parseLine(t)}</p>);
  }

  flushList();
  return <div className="md-body">{output}</div>;
}
