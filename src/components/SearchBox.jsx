import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/** ---------- Non-linear search helpers ---------- */
function normalize(s = "") {
  // lower, strip accents, collapse spaces
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set([
  "the", "of", "and", "for", "at", "in", "on", "to", "a", "an", "&"
  // keep words like "university", "college", "state" so "uni" / "college" queries can match
]);

function tokenize(s = "") {
  const n = normalize(s);
  const raw = n.split(" ").filter(Boolean);
  const tokens = raw.filter(t => !STOP.has(t));
  // Add acronym token (e.g., University of Southern California -> usc)
  const acronym = raw.filter(w => w.length > 2).map(w => w[0]).join("");
  if (acronym.length >= 2) tokens.push(acronym);
  return Array.from(new Set(tokens));
}

function scoreRow(row, qTokens, qCompact) {
  if (!row._tokens) return 0;
  // token hits (prefix or substring, order-agnostic)
  let hits = 0;
  for (const qt of qTokens) {
    if (row._tokens.some(rt => rt.startsWith(qt) || rt.includes(qt))) hits++;
  }
  if (hits === 0) return 0;

  // bonuses
  let score = hits;
  if (row._compact.includes(qCompact)) score += 2;   // contiguous match
  if (hits === qTokens.length) score += 1;          // all tokens found
  if (row._acronym && qTokens.includes(row._acronym)) score += 1;

  return score;
}

export default function SearchBox() {
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const nav = useNavigate();
  const boxRef = useRef(null);

  useEffect(() => {
    fetch("/data/institutions_index.json")
      .then(r => r.json())
      .then(rows => {
        const enriched = rows.map(r => {
          const nameState = `${r.name ?? ""} ${r.state ?? ""}`;
          const tokens = tokenize(nameState);
          const compact = normalize(nameState).replace(/\s+/g, "");
          // acronym derived from full phrase too (keeps 'university' letter)
          const words = normalize(r.name ?? "").split(" ").filter(Boolean);
          const acronym = words.filter(w => w.length > 2).map(w => w[0]).join("");
          return { ...r, _tokens: tokens, _compact: compact, _acronym: acronym };
        });
        setList(enriched);
      })
      .catch(() => setList([]));
  }, []);

  const results = useMemo(() => {
    const s = q.trim();
    if (!s) return [];
    const qTokens = tokenize(s);
    const qCompact = normalize(s).replace(/\s+/g, "");
    const scored = [];

    for (const r of list) {
      const sc = scoreRow(r, qTokens, qCompact);
      if (sc > 0) scored.push([sc, r]);
    }

    scored.sort((a, b) => b[0] - a[0]);
    return scored.slice(0, 10).map(x => x[1]);
  }, [q, list]);

  function choose(row) {
    setOpen(false);
    setQ("");
    nav(`/institution/${row.unitid}`);
  }

  function onKey(e) {
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi(h => Math.min(h + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); choose(results[hi]); }
    if (e.key === "Escape")    { setOpen(false); }
  }

  useEffect(() => {
    function onDocClick(ev){ if (!boxRef.current?.contains(ev.target)) setOpen(false); }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="search-wrap" role="search" aria-label="Search universities">
      <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.71.71l.27.28v.79L20 21.5L21.5 20L15.5 14zm-6 0A4.5 4.5 0 1 1 14 9.5A4.5 4.5 0 0 1 9.5 14z"/>
      </svg>
      <input
        value={q}
        onFocus={()=>setOpen(true)}
        onChange={e=>{ setQ(e.target.value); setOpen(true); setHi(0); }}
        onKeyDown={onKey}
        placeholder="Search a university…"
        className="search"
      />

      {open && results.length>0 && (
        <div className="suggest" role="listbox">
          {results.map((r,i)=>(
            <div
              key={r.unitid}
              className={`row ${i===hi ? "active" : ""}`}
              onMouseEnter={()=>setHi(i)}
              onMouseDown={(e)=>{e.preventDefault(); choose(r);}}
              role="option"
            >
              <div className="name">{r.name}</div>
              <div className="meta">{r.state}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
