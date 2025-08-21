import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Suspense, lazy } from "react";
import Home from "./pages/Home.jsx";
import Explore from "./pages/Explore.jsx";
import SearchBox from "./components/SearchBox.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
// import ProfileReview from "./pages/ProfileReview.jsx"; // kept for later
import "./styles/modern.css";

const Detail = lazy(() => import("./pages/Detail.jsx"));

export default function App() {
  return (
    <BrowserRouter>
      <header className="site-header">
        <div className="container navbar">
          <div className="brand">
            <span className="dot" />
            <span>Uni Admissions</span>
          </div>

          <nav className="navlinks">
            <NavLink to="/" end className={({isActive}) => isActive ? "active" : ""}>Home</NavLink>
            <NavLink to="/explore" className={({isActive}) => isActive ? "active" : ""}>Explore</NavLink>
            {/* <NavLink to="/review" className={({isActive}) => isActive ? "active" : ""}>Profile Review</NavLink> */}
          </nav>

          <div className="nav-spacer" />
          <div className="nav-search">
            <SearchBox />
          </div>
        </div>
      </header>

      <main className="container main-pad">
        <ErrorBoundary>
          <Suspense fallback={<div style={{padding:24}}>Loading page…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/institution/:unitid" element={<Detail />} />
              {/* <Route path="/review" element={<ProfileReview />} /> */}
              <Route path="*" element={<div>Not found</div>} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className="container footer">
        <span>© {new Date().getFullYear()} Uni Admissions</span>
        <span style={{float:"right"}}>Built for insights & transparency</span>
      </footer>
    </BrowserRouter>
  );
}
