import { useEffect, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api, getToken, setToken } from "./api.js";
import Auth from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Profile from "./pages/Profile.jsx";
import Interview from "./pages/Interview.jsx";
import Results from "./pages/Results.jsx";
import ArenaModule from "./pages/arena/ArenaModule.jsx";
import LoginLoadingScreen from "./components/LoginLoadingScreen.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const loginStartedAt = useRef(0);
  const navigate = useNavigate();

  const logout = () => { setToken(null); setUser(null); navigate("/login"); };

  useEffect(() => {
    window.addEventListener("auth:logout", logout);
    return () => window.removeEventListener("auth:logout", logout);
  }, []);

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api.me().then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  const finishLoginLoading = () => {
    const remaining = Math.max(0, 850 - (Date.now() - loginStartedAt.current));
    window.setTimeout(() => setLoginLoading(false), remaining);
  };

  useEffect(() => {
    if (!loginLoading) return undefined;
    const fallback = window.setTimeout(() => setLoginLoading(false), 12000);
    return () => window.clearTimeout(fallback);
  }, [loginLoading]);

  if (!ready) return <LoginLoadingScreen label="Restoring your session" />;

  const onAuth = (res) => { loginStartedAt.current = Date.now(); setLoginLoading(true); setToken(res.access_token); setUser(res.user); navigate("/"); };
  const guard = (el) => (user ? el : <Navigate to="/login" replace />);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-brand/15 bg-white/80 shadow-[0_6px_24px_-18px_rgba(119,35,78,.45)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold text-brand">
            PrepMind AI <span className="hidden text-xs font-normal text-ink/55 sm:inline">Prepare Smarter. Perform Better.</span>
          </Link>
          {user && (
            <div className="flex items-center gap-3 text-sm">
              <Link to="/" className="nav-action nav-home" aria-label="Return to the main PrepMind page"><span aria-hidden="true">⌂</span><span>Home</span></Link>
              <Link to="/profile" className="nav-action nav-profile"><span aria-hidden="true">◎</span><span>Profile</span></Link>
              <Link to="/arena" className="nav-action nav-arena"><span aria-hidden="true">⌘</span><span>Coding Arena</span></Link>
              <span className="hidden text-ink/70 md:inline">{user.name}</span>
              <button className="nav-action nav-logout" onClick={logout}><span aria-hidden="true">↗</span><span>Log out</span></button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/login" element={<Auth onAuth={onAuth} />} />
          <Route path="/" element={guard(<Dashboard user={user} onReady={finishLoginLoading} />)} />
          <Route path="/profile" element={guard(<Profile user={user} />)} />
          <Route path="/interview/:id" element={guard(<Interview />)} />
          <Route path="/results/:id" element={guard(<Results />)} />
          <Route path="/arena/*" element={guard(<ArenaModule user={user} />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <p className="mt-10 text-center text-xs text-ink/40">
          Scores are practice feedback only — not a measure of your employability.
        </p>
      </main>
      {loginLoading && <LoginLoadingScreen onSkip={() => setLoginLoading(false)} />}
    </>
  );
}
