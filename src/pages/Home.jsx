import SearchBox from "../components/SearchBox.jsx";

export default function Home(){
  return (
    <>
      <section className="hero">
        <div className="kicker">Admissions insights • Real data</div>
        <h1 className="h1">
          <span className="gradient-text">University Admissions Demo</span>
        </h1>
        <p className="sub">Search institutions and view key metrics: applicants, admit rate, and yield — all in one simple view.</p>

        <SearchBox onSubmit={(q)=>{ /* wire up your navigation / search here */ }} />

        <div className="stats">
          <div className="stat">
            <div className="label">Applicants</div>
            <div className="value">80,808</div>
          </div>
          <div className="stat">
            <div className="label">Admit rate</div>
            <div className="value">10%</div>
          </div>
          <div className="stat">
            <div className="label">Yield</div>
            <div className="value">45%</div>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      <section className="section" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px"}}>
        <article className="card">
          <h3>Transparent metrics</h3>
          <p>Side-by-side applicants, admitted, enrolled, test submissions, and more.</p>
        </article>
        <article className="card">
          <h3>Clean comparisons</h3>
          <p>Compare institutions with consistent, readable visuals and numbers.</p>
        </article>
        <article className="card">
          <h3>Built for speed</h3>
          <p>Minimal UI with just-enough chrome so your data stays front and center.</p>
        </article>
      </section>
    </>
  );
}
