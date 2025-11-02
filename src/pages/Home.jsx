import SearchBox from "../components/SearchBox.jsx";

export default function Home() {
  return (
    <>
      <section
        className="hero"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        <div className="page-intro">
          <div className="kicker">Admissions insights | Real data</div>
          <h1 className="h1">
            <span className="gradient-text">University Admissions Demo</span>
          </h1>
          <p className="sub">
            Search institutions and instantly compare applicants, admit rate, yield, tuition, and graduation outcomes.
            Reference-ready metrics make it simple to brief counselors, update leadership, or validate outreach strategies in minutes.
          </p>
        </div>

        <div style={{ maxWidth: "min(1040px, 100%)" }}>
          <SearchBox />
        </div>
      </section>

      <div className="divider"></div>

      <section
        className="section"
        style={{
          display: "grid",
          gap: "20px",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        <article className="card">
          <h3>Transparent metrics</h3>
          <p>Total applicants, admitted, enrolled, test submissions, and more.</p>
        </article>

        <article className="card">
          <h3>Clean comparisons</h3>
          <p>Compare institutions with consistent, readable visuals and numbers.</p>
        </article>

        <article className="card">
          <h3>Workflow friendly</h3>
          <p>
            Export filtered views, capture notes in Profile Review, and sync context to downstream dashboards without leaving the browser.
          </p>
        </article>
      </section>
    </>
  );
}
