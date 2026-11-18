import { useMemo, useState } from "react";
import { highlight } from "../../lib/highlight";

const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^\s*][^*\n]*\*|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/g;
function inline(text) {
  return text.split(INLINE).map((p, i) => {
    if (!p) return null;
    if (p.length > 2 && p.startsWith("`") && p.endsWith("`")) return <code key={i}>{p.slice(1, -1)}</code>;
    if (p.length > 4 && p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.length > 2 && p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
    const m = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (m)
      return (
        <a key={i} href={m[2]} target="_blank" rel="noreferrer noopener">
          {m[1]}
        </a>
      );
    return p;
  });
}

function Code({ lang, code }) {
  const [done, setDone] = useState(false);
  const tokens = useMemo(() => highlight(code, lang), [code, lang]);
  return (
    <div className="codeblock">
      <div className="codehead">
        <span>{lang || "code"}</span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(code);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }}
        >
          {done ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>
          {tokens.map(([t, v], i) =>
            t ? (
              <span key={i} className={"tok-" + t}>
                {v}
              </span>
            ) : (
              v
            ),
          )}
        </code>
      </pre>
    </div>
  );
}

const cells = (l) =>
  l
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
const isBlockStart = (l) => /^(#{1,4}\s|\s*([-*+]|\d+\.)\s|>|---+$)/.test(l) || l.includes("|");

function Text({ v }) {
  const lines = v.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      const H = `h${m[1].length + 1}`;
      out.push(<H key={i}>{inline(m[2])}</H>);
      i++;
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      out.push(<hr key={i} />);
      i++;
      continue;
    }
    if (line.includes("|") && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || "")) {
      const head = cells(line);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|")) rows.push(cells(lines[i++]));
      out.push(
        <table key={i}>
          <thead>
            <tr>
              {head.map((c, j) => (
                <th key={j}>{inline(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, a) => (
              <tr key={a}>
                {r.map((c, b) => (
                  <td key={b}>{inline(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i]))
        items.push(lines[i++].replace(/^\s*([-*+]|\d+\.)\s+/, ""));
      const L = ordered ? "ol" : "ul";
      out.push(
        <L key={i}>
          {items.map((t, j) => (
            <li key={j}>{inline(t)}</li>
          ))}
        </L>,
      );
      continue;
    }
    if (line.startsWith(">")) {
      const q = [];
      while (i < lines.length && lines[i].startsWith(">")) q.push(lines[i++].replace(/^>\s?/, ""));
      out.push(<blockquote key={i}>{inline(q.join(" "))}</blockquote>);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && (para.length === 0 || !isBlockStart(lines[i]))) para.push(lines[i++]);
    out.push(
      <p key={i}>
        {para.map((t, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {inline(t)}
          </span>
        ))}
      </p>,
    );
  }
  return <>{out}</>;
}

export default function Markdown({ text = "" }) {
  const blocks = [];
  const re = /```([\w+-]*)[^\n]*\n?([\s\S]*?)(```|$)/g;
  let last = 0,
    m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) blocks.push({ code: false, v: text.slice(last, m.index) });
    blocks.push({ code: true, lang: m[1], v: m[2].replace(/\n$/, "") });
    last = re.lastIndex;
  }
  if (last < text.length) blocks.push({ code: false, v: text.slice(last) });
  return (
    <div className="md">
      {blocks.map((b, i) => (b.code ? <Code key={i} lang={b.lang} code={b.v} /> : <Text key={i} v={b.v} />))}
    </div>
  );
}
