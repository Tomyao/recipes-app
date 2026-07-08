import { Route, Routes } from "react-router-dom";
import { Header } from "@/components/Header";
import { SkipLink } from "@/components/SkipLink";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Home } from "@/pages/Home";
import { Details } from "@/pages/Details";
import { Favorites } from "@/pages/Favorites";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/recipe/:id" element={<Details />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route
              path="*"
              element={
                <div className="container py-16 text-center">
                  <p className="text-lg font-medium">Page not found</p>
                </div>
              }
            />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}
