import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/** ---------- Non-linear search helpers (same as SearchBox) ---------- */
function normalize(s = "") {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const STOP = new Set(["the","of","and","for","at","in","on","to","a","an","&"]);
function tokenize(s = "") {
  const n = normalize(s);
  const raw = n.split(" ").filter(Boolean);
  const tokens = raw.filter(t => !STOP.has(t));
  const acronym = raw.filter(w => w.length > 2).map(w => w[0]).join("");
  if (acronym.length >= 2) tokens.push(acronym);
  return Array.from(new Set(tokens));
}
function enrichRow(r) {
  const nameState = `${r.name ?? ""} ${r.state ?? ""}`;
  const tokens = tokenize(nameState);
  const compact = normalize(nameState).replace(/\s+/g, "");
  const words = normalize(r.name ?? "").split(" ").filter(Boolean);
  const acronym = words.filter(w => w.length > 2).map(w => w[0]).join("");
  return { ...r, _tokens: tokens, _compact: compact, _acronym: acronym };
}
function scoreRow(row, qTokens, qCompact) {
  if (!row._tokens) return 0;
  let hits = 0;
  for (const qt of qTokens) {
    if (row._tokens.some(rt => rt.startsWith(qt) || rt.includes(qt))) hits++;
  }
  if (hits === 0) return 0;
  let score = hits;
  if (row._compact.includes(qCompact)) score += 2;
  if (hits === qTokens.length) score += 1;
  if (row._acronym && qTokens.includes(row._acronym)) score += 1;
  return score;
}

export default function Explore() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null); // null until first fetch

  useEffect(() => {
    if (q.trim().length >= 2 && rows === null) {
      fetch("/data/institutions.json")
        .then(r=>r.json())
        .then(data => setRows(data.map(enrichRow)))
        .catch(()=>setRows([]));
    }
  }, [q, rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = q.trim();
    if (!s) return [];
    const qTokens = tokenize(s);
    const qCompact = normalize(s).replace(/\s+/g, "");
    const scored = [];

    for (const r of rows) {
      const sc = scoreRow(r, qTokens, qCompact);
      if (sc > 0) scored.push([sc, r]);
    }

    scored.sort((a,b) => b[0]-a[0]);
    return scored.slice(0, 50).map(x => x[1]);
  }, [rows, q]);

  return (
    <section>
      <h1 className="h1">Explore Institutions</h1>

      <div className="search-wrap" style={{maxWidth:420, marginTop:12, marginBottom:18}}>
        <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.71.71l.27.28v.79L20 21.5L21.5 20L15.5 14zm-6 0A4.5 4.5 0 1 1 14 9.5A4.5 4.5 0 0 1 9.5 14z"/>
        </svg>
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Type at least 2 letters…"
          className="search"
        />
      </div>

      {!rows && q.trim().length < 2 && (
        <p className="sub">Tip: you can also use the search box in the header.</p>
      )}

      <div className="grid">
        {filtered.map(row => (
          <Link
            key={row.unitid}
            to={`/institution/${row.unitid}`}
            className="card"
            style={{textDecoration:"none", color:"inherit"}}
          >
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:16}}>
              <div>
                <div style={{fontWeight:700, marginBottom:2}}>{row.name}</div>
                <div className="sub" style={{fontSize:13}}>
                  {row.city ? `${row.city}, ` : ""}{row.state} · {row.control} · {row.level}
                </div>
              </div>
              <span className="badge">View</span>
            </div>

            <div style={{marginTop:10, display:"flex", gap:14, flexWrap:"wrap", fontSize:14}}>
              <span>Acceptance: {row.acceptance_rate ?? "–"}%</span>
              <span>Yield: {row.yield ?? "–"}%</span>
              <span>Tuition: {row.tuition_2023_24 ? `$${row.tuition_2023_24.toLocaleString()}` : "–"}</span>
              <span>6-yr Grad: {row.grad_rate_6yr ?? "–"}%</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
