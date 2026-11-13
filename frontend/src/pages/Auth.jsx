import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const INTERVIEW_VIDEO = "https://videos.pexels.com/video-files/5442623/5442623-hd_1920_1080_25fps.mp4";

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const visualRef = useRef(null);
  const videoRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!reduceMotion.matches) {
      videoRef.current?.play().then(() => setVideoPlaying(true)).catch(() => setVideoPlaying(false));
    }
    const stopForReducedMotion = (event) => {
      if (event.matches) {
        videoRef.current?.pause();
        setVideoPlaying(false);
      }
    };
    reduceMotion.addEventListener?.("change", stopForReducedMotion);
    return () => reduceMotion.removeEventListener?.("change", stopForReducedMotion);
  }, []);

  const tiltVisual = (event) => {
    if (!visualRef.current || event.pointerType !== "mouse") return;
    const rect = visualRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    visualRef.current.style.setProperty("--tilt-x", `${(-y * 5).toFixed(2)}deg`);
    visualRef.current.style.setProperty("--tilt-y", `${(x * 6).toFixed(2)}deg`);
  };

  const resetTilt = () => {
    if (!visualRef.current) return;
    visualRef.current.style.setProperty("--tilt-x", "0deg");
    visualRef.current.style.setProperty("--tilt-y", "0deg");
  };

  const toggleVideo = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
        setVideoPlaying(true);
      } catch {
        setVideoPlaying(false);
      }
    } else {
      video.pause();
      setVideoPlaying(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = mode === "login" ? await api.login({ email: f.email, password: f.password }) : await api.register(f);
      onAuth(res);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const register = mode === "register";

  return (
    <section className="auth-page" aria-label="PrepMind account access">
      <div className="auth-ambient auth-ambient-one" aria-hidden="true" />
      <div className="auth-ambient auth-ambient-two" aria-hidden="true" />

      <div className="auth-layout">
        <section
          ref={visualRef}
          className="auth-visual"
          onPointerMove={tiltVisual}
          onPointerLeave={resetTilt}
          aria-label="Preview of a PrepMind video interview"
        >
          <video
            ref={videoRef}
            className="auth-video"
            src={INTERVIEW_VIDEO}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
          <div className="auth-video-shade" aria-hidden="true" />
          <div className="auth-video-grain" aria-hidden="true" />

          <div className="auth-visual-top">
            <span className="auth-live"><i /> INTERVIEW PREVIEW</span>
            <button className="auth-video-toggle" type="button" onClick={toggleVideo} aria-label={videoPlaying ? "Pause interview video" : "Play interview video"}>
              <span aria-hidden="true">{videoPlaying ? "Ⅱ" : "▶"}</span>
              <span>{videoPlaying ? "Pause" : "Play"}</span>
            </button>
          </div>

          <div className="auth-visual-copy">
            <span className="auth-eyebrow">YOUR NEXT OPPORTUNITY STARTS HERE</span>
            <h2>Practise like<br />you’re already there.</h2>
            <p>Build confidence with realistic video interviews and feedback shaped around your goals.</p>
          </div>

          <div className="auth-floating-card auth-floating-question" aria-hidden="true">
            <span className="auth-float-icon">✳</span>
            <span><b>AI interviewer</b><small>Tell me about a challenge you solved.</small></span>
          </div>
          <div className="auth-floating-card auth-floating-signal" aria-hidden="true">
            <span className="auth-signal-dot" />
            <span><b>Practice in progress</b><small>Voice · Video · Adaptive questions</small></span>
            <span className="auth-wave"><i /><i /><i /><i /><i /><i /><i /></span>
          </div>

          <div className="auth-visual-foot">
            <span><b>01</b> Practise out loud</span>
            <span><b>02</b> Get useful feedback</span>
          </div>
        </section>

        <div className="auth-form-wrap">
          <div className="auth-form-card">
            <div className="auth-form-heading">
              <span className="auth-mark" aria-hidden="true"><span>✦</span></span>
              <span className="auth-form-kicker">PREPMIND AI</span>
              <h1>{register ? "Create your account" : "Welcome back"}</h1>
              <p>{register ? "Your focused interview practice starts here." : "Pick up where your preparation left off."}</p>
            </div>

            <form onSubmit={submit} className="auth-form">
              {register && (
                <label className="auth-field">
                  <span>Your name</span>
                  <input className="input" placeholder="e.g. Alex Morgan" value={f.name} onChange={set("name")} required maxLength={80} autoComplete="name" />
                </label>
              )}
              <label className="auth-field">
                <span>Email address</span>
                <input className="input" type="email" placeholder="you@example.com" value={f.email} onChange={set("email")} required autoComplete="email" />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <span className="auth-password-wrap">
                  <input className="input" type={showPassword ? "text" : "password"} placeholder={register ? "At least 8 characters" : "Enter your password"} value={f.password} onChange={set("password")} required minLength={register ? 8 : 1} maxLength={64} autoComplete={register ? "new-password" : "current-password"} />
                  <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
                </span>
              </label>
              {err && <p className="auth-error" role="alert">{err}</p>}
              <button className="auth-submit" disabled={busy}>
                <span>{busy ? "Please wait…" : register ? "Create account" : "Log in"}</span>
                <span className="auth-submit-arrow" aria-hidden="true">↗</span>
              </button>
            </form>

            <div className="auth-divider"><span>or</span></div>
            <button type="button" className="auth-mode-toggle" onClick={() => { setMode(register ? "login" : "register"); setErr(""); }}>
              <span>{register ? "Already have an account?" : "New to PrepMind?"}</span>
              <b>{register ? "Log in" : "Create an account"}</b>
              <span aria-hidden="true">→</span>
            </button>
            <p className="auth-privacy"><span aria-hidden="true">⌑</span> Your practice space is private and secure.</p>
          </div>
          <p className="auth-mobile-caption">Realistic practice. More confident interviews.</p>
        </div>
      </div>
    </section>
  );
}
