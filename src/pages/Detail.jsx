// src/pages/Detail.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { BoxPlot } from "../components/Charts.jsx";

function Bar({ pct, label }) {
  const val = Number.isFinite(+pct) ? Math.max(0, Math.min(100, +pct)) : null;
  return (
    <div style={{ margin: "6px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span>{label}</span>
        <span>{val == null ? "–" : `${val}%`}</span>
      </div>
      <div style={{ height: 10, background: "#f0f2f5", borderRadius: 6 }}>
        <div
          style={{
            width: `${val || 0}%`,
            height: "100%",
            borderRadius: 6,
            background: "#9bbcf4",
            transition: "width .2s ease"
          }}
        />
      </div>
    </div>
  );
}

export default function Detail() {
  const { unitid } = useParams();
  const [institutions, setInstitutions] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [reqs, setReqs] = useState(null);

  useEffect(() => {
    fetch("/data/institutions.json").then(r => r.json()).then(setInstitutions).catch(() => setInstitutions([]));
    fetch("/data/metrics_by_year.json").then(r => r.json()).then(setMetrics).catch(() => setMetrics([]));
    fetch("/data/requirements_2023.json").then(r => r.json()).then(setReqs).catch(() => setReqs([]));
  }, []);

  // Build time series (we just need the latest row now)
  const series = useMemo(() => {
    const rows = Array.isArray(metrics)
      ? metrics.filter(x => String(x.unitid) === String(unitid)).sort((a, b) => a.year - b.year)
      : [];
    const last = rows.length ? rows[rows.length - 1] : {};
    const prev = rows.length ? rows[0] : {};
    return { rows, last, prev };
  }, [metrics, unitid]);

  const req = useMemo(() => {
    const list = Array.isArray(reqs) ? reqs : [];
    return list.find(x => String(x.unitid) === String(unitid)) || {
      required: [], considered: [], not_considered: []
    };
  }, [reqs, unitid]);

  if (!institutions) return <p style={{ padding: 24 }}>Loading…</p>;

  const inst = (institutions || []).find(x => String(x.unitid) === String(unitid));
  if (!inst) return <p style={{ padding: 24 }}>Not found.</p>;

  const m = series.last || {};

  // Funnel numbers
  const applicants   = m.applicants_total;
  const acceptance   = m.acceptance_rate;
  const yieldPct     = m.yield;
  const admittedEst  = m.admitted_est;
  const enrolledEst  = m.enrolled_est;
  const totalEnroll  = m.total_enrollment ?? inst.total_enrollment;

  // SAT percentiles
  const satEBRW = [
    m.sat_evidence_based_reading_and_writing_25th_percentile_score,
    m.sat_evidence_based_reading_and_writing_50th_percentile_score,
    m.sat_evidence_based_reading_and_writing_75th_percentile_score
  ];
  const satMath = [
    m.sat_math_25th_percentile_score,
    m.sat_math_50th_percentile_score,
    m.sat_math_75th_percentile_score
  ];

  // ACT percentiles (IPEDS uses 1–36 scale)
  const actComposite = [
    m.act_composite_25th_percentile_score,
    m.act_composite_50th_percentile_score,
    m.act_composite_75th_percentile_score
  ];
  const actEnglish = [
    m.act_english_25th_percentile_score,
    m.act_english_50th_percentile_score,
    m.act_english_75th_percentile_score
  ];
  const actMath = [
    m.act_math_25th_percentile_score,
    m.act_math_50th_percentile_score,
    m.act_math_75th_percentile_score
  ];

  return (
    <div>
      <p><Link to="/explore">← Back to Explore</Link></p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
        {/* LEFT */}
        <div>
          <h2 style={{ marginBottom: 4 }}>{inst.name}</h2>
          <div style={{ color: "#555", marginBottom: 10 }}>
            {(inst.city ? `${inst.city}, ` : "")}{inst.state} · {inst.control} · {inst.level}
          </div>

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
            <div><strong>Total enrollment:</strong> {Number.isFinite(+totalEnroll) ? Number(totalEnroll).toLocaleString() : "–"}</div>
            <div><strong>6-yr grad:</strong> {Number.isFinite(+m.grad_rate_6yr) ? `${m.grad_rate_6yr}%` : "–"}</div>
          </div>

          {/* Admissions Funnel */}
          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 16, margin: "18px 0" }}>
            <h3 style={{ marginTop: 0 }}>Admissions Funnel</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <div style={{ fontWeight: 600 }}>Applicants</div>
                <div style={{ fontSize: 13, color: "#666" }}>
                  {Number.isFinite(+applicants) ? Number(applicants).toLocaleString() : "–"}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Admitted</div>
                <Bar pct={acceptance} label="Acceptance" />
                <div style={{ fontSize: 12, color: "#666" }}>
                  {Number.isFinite(+admittedEst) ? `${Number(admittedEst).toLocaleString()} (est.)` : ""}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Enrolled</div>
                <Bar pct={yieldPct} label="Yield" />
                <div style={{ fontSize: 12, color: "#666" }}>
                  {Number.isFinite(+enrolledEst) ? `${Number(enrolledEst).toLocaleString()} (est.)` : ""}
                </div>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 16, margin: "18px 0" }}>
            <h3 style={{ marginTop: 0 }}>Admission Requirements</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(220px,1fr))", gap: 16 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Required</div>
                <ul>{(req.required || []).map(x => <li key={`req-${x}`}>{x}</li>)}</ul>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Considered</div>
                <ul>{(req.considered || []).map(x => <li key={`cons-${x}`}>{x}</li>)}</ul>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Not considered</div>
                <ul>{(req.not_considered || []).map(x => <li key={`not-${x}`}>{x}</li>)}</ul>
              </div>
            </div>
          </div>

          {/* Test Scores */}
          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 16, margin: "18px 0" }}>
            <h3 style={{ marginTop: 0 }}>Test Scores &amp; Submission Rates</h3>

            {/* SAT */}
            <div style={{ marginTop: 6 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>SAT</div>
              <div style={{ marginBottom: 10, fontSize: 14 }}>
                Test submission:&nbsp;
                {m.percent_of_first_time_degree_certificate_seeking_students_submitting_sat_scores ?? "–"}%
                {Number.isFinite(+m.number_of_first_time_degree_certificate_seeking_students_submitting_sat_scores)
                  ? ` (${Number(m.number_of_first_time_degree_certificate_seeking_students_submitting_sat_scores).toLocaleString()})`
                  : ""}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
                <BoxPlot
                  label="SAT Evidence-Based Reading & Writing"
                  q1={satEBRW[0]} median={satEBRW[1]} q3={satEBRW[2]}
                  domain={[200, 800]}
                />
                <BoxPlot
                  label="SAT Math"
                  q1={satMath[0]} median={satMath[1]} q3={satMath[2]}
                  domain={[200, 800]}
                />
              </div>
            </div>

            {/* ACT */}
            <div style={{ marginTop: 22 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>ACT</div>
              <div style={{ marginBottom: 10, fontSize: 14 }}>
                Test submission:&nbsp;
                {m.percent_of_first_time_degree_certificate_seeking_students_submitting_act_scores ?? "–"}%
                {Number.isFinite(+m.number_of_first_time_degree_certificate_seeking_students_submitting_act_scores)
                  ? ` (${Number(m.number_of_first_time_degree_certificate_seeking_students_submitting_act_scores).toLocaleString()})`
                  : ""}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
                <BoxPlot
                  label="ACT Composite"
                  q1={actComposite[0]} median={actComposite[1]} q3={actComposite[2]}
                  domain={[1, 36]}
                />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
                  <BoxPlot
                    label="ACT Math"
                    q1={actMath[0]} median={actMath[1]} q3={actMath[2]}
                    domain={[1, 36]}
                  />
                  <BoxPlot
                    label="ACT English"
                    q1={actEnglish[0]} median={actEnglish[1]} q3={actEnglish[2]}
                    domain={[1, 36]}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <aside style={{ position: "sticky", top: 16, alignSelf: "start" }}>
          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Links</div>
            <div style={{ display: "grid", gap: 6 }}>
              {inst.website && (
                <a href={inst.website} target="_blank" rel="noreferrer">
                  Institution Website ↗
                </a>
              )}
              {inst.admissions_url && (
                <a href={inst.admissions_url} target="_blank" rel="noreferrer">
                  Admissions ↗
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
