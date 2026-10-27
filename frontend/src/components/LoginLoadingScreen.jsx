import { useEffect, useState } from "react";
import { Logo } from "./ui.jsx";

const stages = ["Warming up your workspace", "Syncing your practice progress", "Setting up your next step"];

export default function LoginLoadingScreen({ onSkip, label = "Getting your workspace ready" }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => setStage((value) => (value + 1) % stages.length), 1250);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="login-loading-screen" role="status" aria-live="polite">
      <div className="login-loading-wash" aria-hidden="true" />
      <section className="login-loading-card">
        <Logo />
        <div className="login-loader-mark" aria-hidden="true"><span /><span /><span /><b>✦</b></div>
        <p className="login-loading-kicker">WELCOME TO YOUR PREPMIND</p>
        <h1>{label}<span className="loading-ellipsis" aria-hidden="true">…</span></h1>
        <p className="login-loading-stage" key={stage}>{stages[stage]}</p>
        <div className="login-loading-track" aria-hidden="true"><span /></div>
        <p className="login-loading-caption">A moment while we bring your practice space to life.</p>
        {onSkip && <button type="button" className="login-loading-skip" onClick={onSkip}>Skip animation <span aria-hidden="true">→</span></button>}
      </section>
    </div>
  );
}
