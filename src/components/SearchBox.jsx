import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

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
      .then(setList)
      .catch(() => setList([]));
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return list
      .filter(r => (r.name || "").toLowerCase().includes(s) || (r.state || "").toLowerCase().includes(s))
      .slice(0, 10);
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
