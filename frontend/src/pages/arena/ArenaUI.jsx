import { Link, NavLink } from "react-router-dom";

const links = [
  ["/arena", "Overview", true], ["/arena/problems", "Problems"], ["/arena/hackathons", "Hackathons"], ["/arena/progress", "Progress"], ["/arena/admin", "Admin"],
];

export function ArenaFrame({ children, eyebrow = "PREPMIND AI · CODING ARENA", title, description, actions }) {
  return (
    <div className="arena-shell -mx-4 -my-8 min-h-[calc(100vh-80px)] overflow-hidden rounded-b-[30px] text-slate-100">
      <div className="arena-glow pointer-events-none absolute inset-x-0 top-0 h-[480px]" />
      <div className="relative mx-auto max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 py-5">
          <Link to="/arena" className="flex items-center gap-3 font-bold tracking-tight"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-cyan-400 text-[#080b16] shadow-[0_0_28px_rgba(130,90,255,.35)]">⌘</span><span>PrepMind <span className="text-cyan-300">Arena</span></span></Link>
          <nav aria-label="Coding Arena" className="flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-white/10 bg-white/[.035] p-1.5">
            {links.map(([to, label, exact]) => <NavLink key={to} to={to} end={exact} className={({ isActive }) => `rounded-xl px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${isActive ? "bg-white/10 text-white shadow-inner shadow-white/5" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>{label}</NavLink>)}
          </nav>
        </div>
        {(title || actions) && <div className="flex flex-wrap items-end justify-between gap-4 py-7 sm:py-9"><div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-cyan-300/80">{eyebrow}</p>{title && <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>}{description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>}</div>{actions && <div>{actions}</div>}</div>}
        {children}
        <footer className="mt-12 border-t border-white/10 pt-5 text-center text-xs text-slate-500">Arena scores and rankings come from saved submissions. Code runs in the configured isolated Judge0 service.</footer>
      </div>
    </div>
  );
}

export function ArenaCard({ children, className = "" }) { return <section className={`arena-card ${className}`}>{children}</section>; }

export function ArenaButton({ children, onClick, to, variant = "primary", disabled = false, type = "button", className = "" }) {
  const classes = `arena-button ${variant === "primary" ? "arena-button-primary" : variant === "danger" ? "arena-button-danger" : variant === "subtle" ? "arena-button-subtle" : "arena-button-quiet"} ${className}`;
  return to ? <Link className={classes} to={to}>{children}</Link> : <button type={type} disabled={disabled} onClick={onClick} className={classes}>{children}</button>;
}

export function ArenaNotice({ children, tone = "error" }) {
  return <p role="alert" className={`rounded-xl border px-4 py-3 text-sm ${tone === "error" ? "border-rose-400/20 bg-rose-400/10 text-rose-200" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"}`}>{children}</p>;
}

export function LoadingState({ label = "Loading arena data…" }) {
  return <div className="grid min-h-48 place-items-center text-sm text-slate-400"><span className="flex items-center gap-3"><span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-200" />{label}</span></div>;
}

export function ErrorState({ error, retry }) {
  return <ArenaNotice>{error}{retry && <button type="button" className="ml-3 underline" onClick={retry}>Retry</button>}</ArenaNotice>;
}

export function StatCard({ label, value, footnote, accent = "cyan" }) {
  return <div className="arena-card min-w-0"><p className="text-xs font-medium text-slate-400">{label}</p><p className={`mt-3 font-display text-3xl font-bold tracking-tight ${accent === "violet" ? "text-violet-200" : accent === "pink" ? "text-pink-200" : "text-cyan-200"}`}>{value ?? "—"}</p>{footnote && <p className="mt-2 text-xs text-slate-500">{footnote}</p>}</div>;
}

export function DifficultyPill({ value }) {
  const tone = value?.toLowerCase() === "easy" ? "text-emerald-300 bg-emerald-300/10" : value?.toLowerCase() === "hard" ? "text-rose-300 bg-rose-300/10" : "text-amber-200 bg-amber-200/10";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{value}</span>;
}
