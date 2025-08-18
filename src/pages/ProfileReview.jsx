import { useEffect, useMemo, useState } from "react";

/** Tiny helper for the inline “what to include” tips */
function nudge(label, text) {
  return (
    <details style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
      <summary style={{ cursor: "pointer" }}>What to include for {label}?</summary>
      <div style={{ marginTop: 6, lineHeight: 1.3 }}>{text}</div>
    </details>
  );
}

/** Encode an object to x-www-form-urlencoded for Netlify Forms */
function encodeForm(data) {
  return new URLSearchParams(data).toString();
}

export default function ProfileReview() {
  const [institutions, setInstitutions] = useState([]);
  const [labelToName, setLabelToName] = useState({});
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");

  // 3 target universities (free-text with suggestions)
  const [u1, setU1] = useState("");
  const [u2, setU2] = useState("");
  const [u3, setU3] = useState("");

  // Four rubric sections
  const [academics, setAcademics] = useState("");
  const [extracurricular, setExtracurricular] = useState("");
  const [athletics, setAthletics] = useState("");
  const [personal, setPersonal] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Load institutions for the datalist suggestions
  useEffect(() => {
    (async () => {
      try {
        // Place institutions.json at: /public/data/institutions.json (Vite serves from project root)
        const r = await fetch("/data/institutions.json");
        if (!r.ok) throw new Error("Failed to load institutions");
        const data = await r.json();
        setInstitutions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Build datalist options + a label->canonical name map
  const options = useMemo(() => {
    const out = [];
    const map = {};
    for (const inst of institutions) {
      const name = inst.name || inst.institution_name || "";
      const state = inst.state_abbreviation || inst.state || "";
      const label = state ? `${name} (${state})` : name;
      if (name) {
        out.push({ label, name });
        map[label] = name;
      }
    }
    setLabelToName(map);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutions]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setDone(false);

    const trimmedEmail = (email || "").trim();
    if (!trimmedEmail) {
      setError("Please enter your email so we can contact you.");
      return;
    }

    // Normalize entered universities back to canonical names when possible
    const universities = [u1, u2, u3]
      .map((v) => (labelToName[v] ? labelToName[v] : (v || "").trim()))
      .filter(Boolean);

    // Netlify Forms needs flat fields + a special "form-name"
    const formData = {
      "form-name": "profile-review", // MUST match the hidden form in index.html
      name: (contactName || "").trim(),
      email: trimmedEmail,
      universities: universities.join("; "),
      academics: (academics || "").trim(),
      extracurricular: (extracurricular || "").trim(),
      athletics: (athletics || "").trim(),
      personal: (personal || "").trim(),
      "bot-field": "", // honeypot, keep empty
      siteVersion: "v1",
    };

    setSubmitting(true);
    try {
      const r = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encodeForm(formData),
      });

      if (!r.ok) {
        // Surface a helpful message for debugging if needed
        const txt = await r.text().catch(() => "");
        throw new Error(txt || "Submit failed");
      }

      // Clear and show success
      setContactName("");
      setEmail("");
      setU1(""); setU2(""); setU3("");
      setAcademics(""); setExtracurricular(""); setAthletics(""); setPersonal("");
      setDone(true);
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "24px auto", padding: "16px" }}>
      <h1 style={{ marginTop: 0 }}>Profile Review</h1>
      <p style={{ color: "#444", marginTop: -8 }}>
        Tell us about yourself and pick up to three universities. We’ll review your profile and get back to you ASAP.
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
        {/* Contact */}
        <div style={{ display: "grid", gap: 8 }}>
          <label>
            Your Name (optional)
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
              placeholder="Jane Doe"
              autoComplete="name"
            />
          </label>
          <label>
            Email (required)
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
              placeholder="jane@email.com"
              autoComplete="email"
            />
          </label>
        </div>

        {/* Universities */}
        <div>
          <h3>Target Universities (up to 3)</h3>
          <p style={{ fontSize: 12, color: "#555", marginTop: -8 }}>
            Type to search—pick exact names if possible.
          </p>

          <input
            list="uniList"
            value={u1}
            onChange={(e) => setU1(e.target.value)}
            placeholder="University 1"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8, marginBottom: 8 }}
          />
          <input
            list="uniList"
            value={u2}
            onChange={(e) => setU2(e.target.value)}
            placeholder="University 2"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8, marginBottom: 8 }}
          />
          <input
            list="uniList"
            value={u3}
            onChange={(e) => setU3(e.target.value)}
            placeholder="University 3"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />

          <datalist id="uniList">
            {options.slice(0, 8000).map((opt) => (
              <option key={opt.label} value={opt.label} />
            ))}
          </datalist>
        </div>

        {/* Academics */}
        <div>
          <h3>Academics</h3>
          <textarea
            value={academics}
            onChange={(e) => setAcademics(e.target.value)}
            rows={6}
            placeholder="Grades (trend & rigor), test scores, notable coursework, research, awards, publications…"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
          {nudge(
            "Academics",
            "Aim for a clear snapshot: GPA + rigor (honors/AP/IB), score ranges (SAT/ACT) and notable ‘spike’ evidence (research, competitions, original work). World-class = creativity/originality + trusted validation (e.g., awards, faculty recs)."
          )}
        </div>

        {/* Extracurricular */}
        <div>
          <h3>Extracurricular</h3>
          <textarea
            value={extracurricular}
            onChange={(e) => setExtracurricular(e.target.value)}
            rows={6}
            placeholder="Leadership roles, impact, scale (school/regional/national), continuity, outcomes…"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
          {nudge(
            "Extracurricular",
            "Highlight depth + impact. ‘1’ level often means national/international distinction or truly unusual accomplishment. ‘2’ = strong school/regional leadership. Emphasize results (users reached, funds raised, awards won)."
          )}
        </div>

        {/* Athletics */}
        <div>
          <h3>Athletics</h3>
          <textarea
            value={athletics}
            onChange={(e) => setAthletics(e.target.value)}
            rows={5}
            placeholder="Sport(s), level (varsity, club, national), rankings, recruit status, coach outreach…"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
          {nudge(
            "Athletics",
            "Recruit-level prospects (coach-supported) are a ‘1’. Otherwise, note team role, achievements, and time commitment. It’s okay if athletics isn’t your spike."
          )}
        </div>

        {/* Personal */}
        <div>
          <h3>Personal</h3>
          <textarea
            value={personal}
            onChange={(e) => setPersonal(e.target.value)}
            rows={6}
            placeholder="Character, grit, leadership, kindness; adversities overcome; community impact; what makes you memorable…"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
          {nudge(
            "Personal",
            "This summarizes qualities across essays, recommendations, interview, and life context (humor, sensitivity, courage, integrity, kindness). Show concrete stories—avoid generic claims."
          )}
        </div>

        {/* Submit */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #222",
              background: "#222",
              color: "#fff",
            }}
          >
            {submitting ? "Submitting…" : "Submit for Review"}
          </button>
          {done && <span style={{ color: "green" }}>✅ Submitted! We’ll get back to you ASAP.</span>}
          {error && <span style={{ color: "crimson" }}>⚠ {error}</span>}
        </div>
      </form>
    </div>
  );
}
