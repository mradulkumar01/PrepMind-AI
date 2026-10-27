import { useEffect, useState } from "react";

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const toneColor = (v) => (v >= 70 ? "#5BE0BE" : v >= 50 ? "#FFC56E" : "#FF7890");

/* ---------- icons ---------- */
const PATHS = {
  upload: "M12 16V4m0 0l-4 4m4-4l4 4M4 20h16",
  file: "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5",
  play: "M5 3l14 9-14 9V3z",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  folder: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
  layers: "M12 2l10 5-10 5L2 7l10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  up: "M12 19V5m0 0l-6 6m6-6l6 6",
  down: "M12 5v14m0 0l6-6m-6 6l-6-6",
  right: "M5 12h14m0 0l-6-6m6 6l-6 6",
  check: "M5 13l4 4L19 7",
  print: "M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  chevron: "M6 9l6 6 6-6",
};

export function Icon({ name, className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Logo({ light = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill={light ? "#fff" : "#171020"} />
        <circle cx="16" cy="16" r="7" fill="none" stroke={light ? "#171020" : "#fff"} strokeWidth="2.5" strokeDasharray="30 14" strokeLinecap="round" />
        <circle cx="22" cy="10" r="2.6" fill="#F3A0C9" />
      </svg>
      <span className={`font-display text-lg font-bold ${light ? "text-white" : "text-ink"}`}>PrepMind AI</span>
    </span>
  );
}

export function Spinner({ className = "h-4 w-4" }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden="true" />;
}

export function LoadingGesture({ label = "Getting your workspace ready…", compact = false }) {
  const [message, setMessage] = useState(0);
  const messages = [label, "Gathering your progress…", "Preparing your next step…"];
  useEffect(() => {
    if (reduceMotion()) return undefined;
    const timer = window.setInterval(() => setMessage((value) => (value + 1) % messages.length), 1800);
    return () => window.clearInterval(timer);
  }, [label]);
  return (
    <div className={`prep-loader ${compact ? "prep-loader-compact" : ""}`} role="status" aria-live="polite">
      <span className="prep-loader-orbit" aria-hidden="true"><span /><span /><span /></span>
      <span className="prep-loader-copy"><strong>{messages[message]}</strong><span className="prep-loader-dots" aria-hidden="true">···</span></span>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/* ---------- motion helpers ---------- */
export function useCountUp(target, ms = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduceMotion()) { setN(target); return undefined; }
    let raf;
    let start = null;
    const tick = (t) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / ms, 1);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

export function Typewriter({ text, speed = 16 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduceMotion()) { setN(text.length); return undefined; }
    setN(0);
    const id = setInterval(() => {
      setN((x) => {
        if (x >= text.length) { clearInterval(id); return x; }
        return x + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, n)}
        <span className="ml-0.5 inline-block h-[1em] w-[3px] translate-y-[3px] animate-caret bg-gold" />
      </span>
    </>
  );
}

/* ---------- data visuals ---------- */
export function ScoreRing({ value = 0, size = 128, stroke = 10, caption }) {
  const [drawn, setDrawn] = useState(0);
  const n = useCountUp(Math.round(value));
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Score ${Math.round(value)} out of 100`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EBD3DF" strokeOpacity=".8" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={toneColor(value)} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - drawn / 100)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-3xl font-bold leading-none tabular-nums">{n}</div>
        {caption && <div className="mt-1 text-[11px] text-ink/60">{caption}</div>}
      </div>
    </div>
  );
}

export function Bar({ label, value }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(value ?? 0));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const v = Math.round(value ?? 0);
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span className="capitalize">{label.replaceAll("_", " ")}</span>
        <span className="font-semibold tabular-nums">{v}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full" style={{ width: `${w}%`, background: toneColor(v), transition: "width .9s cubic-bezier(.2,.8,.2,1)" }} />
      </div>
    </div>
  );
}

export function Radar({ data, size = 240 }) {
  const keys = Object.keys(data);
  const n = keys.length;
  if (n < 3) return null;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 38;
  const pt = (i, f) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f];
  };
  const ring = (f) => keys.map((_, i) => pt(i, f).join(",")).join(" ");
  const shape = keys.map((k, i) => pt(i, Math.max(0.04, (data[k] ?? 0) / 100)).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[280px]" role="img" aria-label="Scores by criterion">
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={ring(f)} fill="none" stroke="#EBD3DF" strokeOpacity=".8" />)}
      {keys.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#EBD3DF" strokeOpacity=".8" />; })}
      <polygon points={shape} fill="#D74691" fillOpacity=".28" stroke="#D74691" strokeWidth="2" strokeLinejoin="round" className="animate-grow" style={{ transformOrigin: `${cx}px ${cy}px` }} />
      {keys.map((k, i) => { const [x, y] = pt(i, 1.2); return <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#684956" fillOpacity=".95">{k.replaceAll("_", " ")}</text>; })}
    </svg>
  );
}

export function Sparkline({ values }) {
  if (values.length < 2) return <p className="text-sm text-ink/55">Finish two interviews to see your trend.</p>;
  const w = 220;
  const h = 56;
  const p = 6;
  const pts = values.map((v, i) => [p + (i * (w - 2 * p)) / (values.length - 1), h - p - (Math.max(0, Math.min(100, v)) / 100) * (h - 2 * p)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`Score trend over ${values.length} interviews`}>
      <path d={`${d} L${lx} ${h} L${pts[0][0]} ${h} Z`} fill="#D74691" fillOpacity=".14" />
      <path d={d} pathLength="1" fill="none" stroke="#D74691" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" className="animate-draw" />
      <circle cx={lx} cy={ly} r="4" fill="#FFC56E" stroke="#351C2C" strokeWidth="2" />
    </svg>
  );
}

const LEVELS = ["easy", "medium", "hard"];
export function Difficulty({ level }) {
  const i = Math.max(0, LEVELS.indexOf(level));
  return (
    <div className="flex items-end gap-1" title={`Difficulty: ${level}`}>
      {LEVELS.map((l, k) => <span key={l} className={`w-2 rounded-sm transition-all duration-500 ${k <= i ? "bg-gold" : "bg-white/20"}`} style={{ height: 8 + k * 6 }} />)}
      <span className="ml-2 text-xs capitalize text-white/70">{level}</span>
    </div>
  );
}

export function Chip({ children, tone = "brand", delay = 0 }) {
  const tones = { brand: "bg-brand/15 text-brand-dark", gold: "bg-gold/15 text-gold", mint: "bg-mint/15 text-mint", coral: "bg-coral/15 text-coral" };
  return <span className={`inline-block animate-pop rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`} style={{ animationDelay: `${delay}ms` }}>{children}</span>;
}
