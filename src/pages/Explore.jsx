import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function Explore() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null); // null until we actually fetch

  useEffect(() => {
    if (q.trim().length >= 2 && rows === null) {
      fetch("/data/institutions.json").then(r=>r.json()).then(setRows).catch(()=>setRows([]));
    }
  }, [q, rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return rows.filter(r =>
      (r.name||"").toLowerCase().includes(s) ||
      (r.state||"").toLowerCase().includes(s)
    ).slice(0, 50);
  }, [rows, q]);

  return (
    <div>
      <h2>Explore Institutions</h2>
      <input
        value={q}
        onChange={e=>setQ(e.target.value)}
        placeholder="Type at least 2 letters…"
        style={{padding:"8px 10px", width:"100%", maxWidth:420, margin:"12px 0"}}
      />
      {!rows && q.trim().length < 2 && (
        <p style={{color:"#666"}}>Tip: use the search box in the header, or start typing here.</p>
      )}
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:16}}>
        {filtered.map(row => (
          <Link key={row.unitid} to={`/institution/${row.unitid}`} style={{textDecoration:"none", color:"inherit"}}>
            <div style={{border:"1px solid #eee", borderRadius:8, padding:16}}>
              <div style={{fontWeight:600}}>{row.name}</div>
              <div style={{fontSize:13, color:"#666"}}>{row.city ? `${row.city}, ` : ""}{row.state} · {row.control} · {row.level}</div>
              <div style={{marginTop:8, display:"flex", gap:12, fontSize:14, flexWrap:"wrap"}}>
                <span>Acceptance: {row.acceptance_rate ?? "–"}%</span>
                <span>Yield: {row.yield ?? "–"}%</span>
                <span>Tuition: {row.tuition_2023_24 ? `$${row.tuition_2023_24.toLocaleString()}` : "–"}</span>
                <span>6-yr Grad: {row.grad_rate_6yr ?? "–"}%</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
