import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function normalize(s = "") {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set(["the", "of", "and", "for", "at", "in", "on", "to", "a", "an", "&"]);

function tokenize(s = "") {
  const n = normalize(s);
  const raw = n.split(" ").filter(Boolean);
  const tokens = raw.filter(t => !STOP.has(t));
  const acronym = raw.filter(w => w.length > 2).map(w => w[0]).join("");
  if (acronym.length >= 2) tokens.push(acronym);
  return Array.from(new Set(tokens));
}

function enrich(row) {
  const nameState = `${row.name ?? ""} ${row.state ?? ""}`;
  const tokens = tokenize(nameState);
  const compact = normalize(nameState).replace(/\s+/g, "");
  return { ...row, _tokens: tokens, _compact: compact };
}

function score(row, qTokens, qCompact) {
  if (!row._tokens) return 0;
  let hits = 0;
  for (const qt of qTokens) {
    if (row._tokens.some(rt => rt.startsWith(qt) || rt.includes(qt))) hits++;
  }
  if (hits === 0) return 0;
  let sc = hits;
  if (row._compact.includes(qCompact)) sc += 2;
  if (hits === qTokens.length) sc += 1;
  return sc;
}

function formatNumber(value) {
  if (!Number.isFinite(+value)) return "—";
  return Number(value).toLocaleString();
}

function formatPercent(value) {
  if (!Number.isFinite(+value)) return "—";
  return `${Number(value).toFixed(1).replace(/\.0$/, "")}%`;
}

function formatCurrency(value) {
  if (!Number.isFinite(+value)) return "—";
  return `$${Number(value).toLocaleString()}`;
}

function formatTuitionPair(inState, outState, fallback) {
  const fmt = value => `$${Number(value).toLocaleString()}`;
  const hasIn = Number.isFinite(+inState);
  const hasOut = Number.isFinite(+outState);

  if (hasIn && hasOut) return `${fmt(inState)} / ${fmt(outState)}`;
  if (hasIn) return `${fmt(inState)} (in-state)`;
  if (hasOut) return `${fmt(outState)} (out-of-state)`;
  if (Number.isFinite(+fallback)) return fmt(fallback);
  return "—";
}

function formatScore(value) {
  if (!Number.isFinite(+value)) return "—";
  return `${Number(value)}`;
}

function formatScorePair(primary, secondary) {
  const valid1 = Number.isFinite(+primary);
  const valid2 = Number.isFinite(+secondary);
  if (valid1 && valid2) return `${Number(primary)} / ${Number(secondary)}`;
  if (valid1) return `${Number(primary)}`;
  if (valid2) return `${Number(secondary)}`;
  return "—";
}

const METRIC_ROWS = [
  {
    key: "location",
    label: "Location",
    render(inst) {
      const city = inst.city ? `${inst.city}, ` : "";
      return `${city}${inst.state ?? ""}`.trim() || "—";
    }
  },
  { key: "control", label: "Control", render: inst => inst.control ?? "—" },
  { key: "level", label: "Level", render: inst => inst.level ?? "—" },
  {
    key: "applicants",
    label: "Applicants",
    render: (_inst, metric) => formatNumber(metric?.applicants_total)
  },
  {
    key: "admitted",
    label: "Estimated Admitted",
    render: (_inst, metric) => formatNumber(metric?.admitted_est)
  },
  {
    key: "enrolled",
    label: "Estimated Enrolled",
    render: (_inst, metric) => formatNumber(metric?.enrolled_est)
  },
  {
    key: "acceptance",
    label: "Acceptance Rate",
    render: (_inst, metric) => formatPercent(metric?.acceptance_rate)
  },
  {
    key: "yield",
    label: "Yield",
    render: (_inst, metric) => formatPercent(metric?.yield)
  },
  {
    key: "tuition",
    label: "Tuition (In / Out-of-state)",
    render: (inst, metric) => formatTuitionPair(
      inst?.tuition_2023_24_in_state,
      inst?.tuition_2023_24_out_of_state,
      metric?.tuition_2023_24 ?? inst?.tuition_2023_24
    )
  },
  {
    key: "gradRate",
    label: "6-yr Graduation Rate",
    render: (_inst, metric) => formatPercent(metric?.grad_rate_6yr)
  },
  {
    key: "sat50_ebrw",
    label: "SAT Evidence-Based Reading & Writing (50th)",
    render: (_inst, metric) => formatScore(metric?.sat_evidence_based_reading_and_writing_50th_percentile_score)
  },
  {
    key: "sat50_math",
    label: "SAT Math (50th)",
    render: (_inst, metric) => formatScore(metric?.sat_math_50th_percentile_score)
  },
  {
    key: "act50_english",
    label: "ACT English (50th)",
    render: (_inst, metric) => formatScore(metric?.act_english_50th_percentile_score)
  },
  {
    key: "act50_math",
    label: "ACT Math (50th)",
    render: (_inst, metric) => formatScore(metric?.act_math_50th_percentile_score)
  }
];

export default function Compare() {
  const [institutions, setInstitutions] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetch("/data/institutions.json")
      .then(r => r.json())
      .then(data => setInstitutions(data.map(enrich)))
      .catch(() => setInstitutions([]));
    fetch("/data/metrics_by_year.json")
      .then(r => r.json())
      .then(setMetrics)
      .catch(() => setMetrics([]));
  }, []);

  const institutionsById = useMemo(() => {
    const map = new Map();
    (institutions ?? []).forEach(inst => map.set(String(inst.unitid), inst));
    return map;
  }, [institutions]);

  const latestMetrics = useMemo(() => {
    const map = new Map();
    (metrics ?? []).forEach(row => {
      const id = String(row.unitid);
      const prior = map.get(id);
      if (!prior || prior.year < row.year) {
        map.set(id, row);
      }
    });
    return map;
  }, [metrics]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || !institutions?.length) return [];
    const qTokens = tokenize(trimmed);
    const qCompact = normalize(trimmed).replace(/\s+/g, "");
    const scored = [];

    for (const inst of institutions) {
      const sc = score(inst, qTokens, qCompact);
      if (sc > 0) scored.push([sc, inst]);
    }

    scored.sort((a, b) => b[0] - a[0]);
    return scored.slice(0, 12).map(x => x[1]);
  }, [query, institutions]);

  const selectedInstitutions = selectedIds
    .map(id => institutionsById.get(String(id)))
    .filter(Boolean);

  function addInstitution(inst) {
    const id = String(inst.unitid);
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev;
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
    setQuery("");
  }

  function removeInstitution(id) {
    setSelectedIds(prev => prev.filter(x => x !== String(id)));
  }

  const gridColumns = `220px repeat(${Math.max(selectedInstitutions.length, 1)}, minmax(220px, 1fr))`;

  return (
    <section>
      <div className="page-intro">
        <h1 className="h1">Compare Institutions</h1>
        <p className="sub">
          Select up to three universities to review admissions and outcome metrics side by side.
          Use the search below to add institutions, then drill into a profile if you need deeper historical context.
        </p>
      </div>

      <div className="card" style={{ marginTop: 28, padding: 24, display: "grid", gap: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          {selectedInstitutions.length === 0 && (
            <span style={{ color: "#64748b" }}>No institutions selected yet.</span>
          )}
          {selectedInstitutions.map(inst => (
            <span
              key={inst.unitid}
              className="badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#eef2ff",
                borderColor: "transparent",
                fontSize: 13
              }}
            >
              {inst.name}
              <button
                onClick={() => removeInstitution(inst.unitid)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 16,
                  lineHeight: 1,
                  padding: 0,
                  color: "#4338ca"
                }}
                aria-label={`Remove ${inst.name}`}
              >
                ×
              </button>
            </span>
          ))}
          {selectedInstitutions.length > 0 && (
            <button
              onClick={() => setSelectedIds([])}
              style={{
                border: "none",
                background: "transparent",
                color: "#64748b",
                cursor: "pointer",
                fontSize: 13
              }}
            >
              Clear all
            </button>
          )}
        </div>

        <div
          className="search-wrap"
          style={{
            maxWidth: "min(640px, 100%)"
          }}
        >
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.71.71l.27.28v.79L20 21.5L21.5 20L15.5 14zm-6 0A4.5 4.5 0 1 1 14 9.5A4.5 4.5 0 0 1 9.5 14z"
            />
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={selectedInstitutions.length >= 3 ? "Maximum of 3 selected" : "Search for a university…"}
            className="search"
            disabled={selectedInstitutions.length >= 3}
          />
        </div>

        {query.trim() && results.length === 0 && (
          <div style={{ fontSize: 14, color: "#64748b" }}>No matches found.</div>
        )}

        {results.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: 8,
              maxHeight: 280,
              overflowY: "auto",
              paddingRight: 4
            }}
          >
            {results.map(inst => {
              const alreadySelected = selectedIds.includes(String(inst.unitid));
              return (
                <button
                  key={inst.unitid}
                  onClick={() => addInstitution(inst)}
                  disabled={alreadySelected || selectedIds.length >= 3}
                  style={{
                    textAlign: "left",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    background: alreadySelected ? "#f5f6fb" : "#fff",
                    cursor: alreadySelected ? "default" : "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12
                  }}
                >
                  <span>
                    <div style={{ fontWeight: 600 }}>{inst.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {(inst.city ? `${inst.city}, ` : "")}{inst.state} · {inst.control}
                    </div>
                  </span>
                  <span style={{ fontSize: 12, color: "#4338ca" }}>
                    {alreadySelected ? "Added" : "Add"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: 32 }}>
        {selectedInstitutions.length === 0 ? (
          <div
            className="card"
            style={{
              padding: 32,
              textAlign: "center",
              color: "#64748b",
              fontSize: 16
            }}
          >
            Select institutions to see a comparison summary.
          </div>
        ) : (
          <div
            className="card"
            style={{
              padding: 0,
              overflowX: "auto"
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 0,
                gridTemplateColumns: gridColumns,
                minWidth: selectedInstitutions.length ? 480 : "auto"
              }}
            >
              <div style={{ padding: "20px 18px", fontWeight: 700, borderBottom: "1px solid var(--border)" }}>
                Metric
              </div>
              {selectedInstitutions.map(inst => (
                <div
                  key={`col-${inst.unitid}`}
                  style={{
                    padding: "20px 18px",
                    borderBottom: "1px solid var(--border)",
                    borderLeft: "1px solid var(--border)"
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{inst.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    <Link to={`/institution/${inst.unitid}`} style={{ color: "#4338ca" }}>
                      View profile →
                    </Link>
                  </div>
                </div>
              ))}

              {METRIC_ROWS.map(row => (
                <FragmentRow
                  key={row.key}
                  row={row}
                  institutions={selectedInstitutions}
                  latestMetrics={latestMetrics}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FragmentRow({ row, institutions, latestMetrics }) {
  return (
    <>
      <div
        style={{
          padding: "16px 18px",
          borderTop: "1px solid var(--border)",
          fontWeight: 600,
          background: "#f8f9fc"
        }}
      >
        {row.label}
      </div>
      {institutions.map(inst => {
        const metric = latestMetrics.get(String(inst.unitid)) ?? {};
        return (
          <div
            key={`${row.key}-${inst.unitid}`}
            style={{
              padding: "16px 18px",
              borderTop: "1px solid var(--border)",
              borderLeft: "1px solid var(--border)"
            }}
          >
            {row.render(inst, metric)}
          </div>
        );
      })}
    </>
  );
}
