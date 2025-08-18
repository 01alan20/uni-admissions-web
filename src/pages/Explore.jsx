import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function Explore() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null); // null until we actually fetch

  useEffect(() => {
    if (q.trim().length >= 2 && rows === null) {
      fetch("/data/institutions.json")
        .then(r=>r.json())
        .then(setRows)
        .catch(()=>setRows([]));
    }
  }, [q, rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return rows
      .filter(r =>
        (r.name||"").toLowerCase().includes(s) ||
        (r.state||"").toLowerCase().includes(s)
      )
      .slice(0, 50);
  }, [rows, q]);

  return (
    <section>
      <h1 className="h1">Explore Institutions</h1>
      <p className="sub">Start typing to find universities by name or state.</p>

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
            <div className="card-row">
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
