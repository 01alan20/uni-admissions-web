import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Suspense, lazy } from "react";
import Home from "./pages/Home.jsx";
import Explore from "./pages/Explore.jsx";
import SearchBox from "./components/SearchBox.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ProfileReview from './pages/ProfileReview.jsx';


const Detail = lazy(() => import("./pages/Detail.jsx"));

export default function App() {
  return (
    <BrowserRouter>
      <header style={{ padding: "12px 24px", borderBottom: "1px solid #eee" }}>
        <nav style={{ display: "flex", gap: 16, alignItems: "center", maxWidth: 1280, margin: "0 auto" }}>
          <Link to="/">Home</Link>
          <Link to="/explore">Explore</Link>
          <div style={{ marginLeft: "auto", width: 360 }}>
            <SearchBox />
          </div>
        </nav>
      </header>

      <main style={{ padding: "24px", maxWidth: 1280, margin: "0 auto" }}>
        <ErrorBoundary>
          <Suspense fallback={<div style={{padding:24}}>Loading page…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/institution/:unitid" element={<Detail />} />
              <Route path="*" element={<div>Not found</div>} />
              <Route path="/review" element={<ProfileReview />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
    </BrowserRouter>
  );
}
