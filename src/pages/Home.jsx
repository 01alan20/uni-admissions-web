import SearchBox from "../components/SearchBox.jsx";

export default function Home(){
  return (
    <>
      <section className="hero">
        <div className="kicker">Admissions insights • Real data</div>
        <h1 className="h1">
          <span className="gradient-text">University Admissions Demo</span>
        </h1>
        <p className="sub">
          Search institutions and view key metrics: applicants, admit rate, and yield — all in one simple view.
        </p>

        {/* Keep the hero search — requested change only removes the stats below */}
        <SearchBox />
      </section>

      <div className="divider"></div>

      {/* Feature cards — removed the third "Built for speed" card */}
      <section
        className="section"
        style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "16px" }}
      >
        <article className="card">
          <h3>Transparent metrics</h3>
          <p>Total applicants, admitted, enrolled, test submissions, and more.</p>
        </article>

        <article className="card">
          <h3>Clean comparisons</h3>
          <p>Compare institutions with consistent, readable visuals and numbers.</p>
        </article>
      </section>
    </>
  );
}
