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
    fetch("/data/institutions_index.json").then(r=>r.json()).then(setList).catch(()=>setList([]));
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return list
      .filter(r => (r.name||"").toLowerCase().includes(s) || (r.state||"").toLowerCase().includes(s))
      .slice(0, 10);
  }, [q, list]);

  function choose(row) {
    setOpen(false);
    setQ("");
    nav(`/institution/${row.unitid}`);
  }

  function onKey(e) {
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi(h => Math.min(h+1, results.length-1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHi(h => Math.max(h-1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); choose(results[hi]); }
    if (e.key === "Escape")    { setOpen(false); }
  }

  useEffect(() => {
    function onDocClick(ev){ if (!boxRef.current?.contains(ev.target)) setOpen(false); }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div ref={boxRef} style={{position:"relative", width:360}}>
      <input
        value={q}
        onFocus={()=>setOpen(true)}
        onChange={e=>{ setQ(e.target.value); setOpen(true); setHi(0); }}
        onKeyDown={onKey}
        placeholder="Search a university…"
        style={{width:"100%", padding:"8px 10px", border:"1px solid #ddd", borderRadius:6}}
      />
      {open && results.length>0 && (
        <div style={{position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #eee", borderRadius:6, marginTop:6, boxShadow:"0 4px 16px rgba(0,0,0,0.08)", zIndex:10}}>
          {results.map((r,i)=>(
            <div key={r.unitid}
                 onMouseEnter={()=>setHi(i)}
                 onMouseDown={(e)=>{e.preventDefault(); choose(r);}}
                 style={{padding:"8px 10px", cursor:"pointer", background:i===hi?"#f5f7fb":"#fff"}}>
              <div style={{fontWeight:600}}>{r.name}</div>
              <div style={{fontSize:12, color:"#666"}}>{r.state}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
