import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { ArenaButton, ArenaCard, ArenaFrame, ArenaNotice, LoadingState, StatCard } from "./ArenaUI.jsx";

function Activity({ items = [] }) {
  const max = Math.max(1, ...items.map((x) => x.count));
  return <div className="grid grid-cols-7 gap-2">{items.map((item) => <div key={item.date} className="text-center"><div title={`${item.count} submissions · ${item.date}`} className="mx-auto aspect-square w-full max-w-12 rounded-lg border border-white/5" style={{ backgroundColor: item.count ? `rgba(34, 211, 238, ${.15 + .75 * item.count / max})` : "rgba(255,255,255,.035)" }} /><span className="mt-2 block text-[10px] text-slate-500">{new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</span></div>)}</div>;
}

export default function ArenaDashboard({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const refresh = () => api.arenaDashboard().then((res) => { setData(res); setError(""); }).catch((e) => setError(e.message));
  useEffect(() => { refresh(); }, []);
  if (error && !data) return <ArenaFrame><ArenaNotice>{error} — check that the API and MongoDB are running.</ArenaNotice></ArenaFrame>;
  if (!data) return <ArenaFrame><LoadingState /></ArenaFrame>;

  const { stats } = data;
  const progressHref = data.last_attempted ? `/arena/problems/${data.last_attempted}` : "/arena/problems";
  const statsCards = [
    ["Problems solved", stats.solved, `${stats.solved_by_difficulty.Easy} easy · ${stats.solved_by_difficulty.Medium} medium · ${stats.solved_by_difficulty.Hard} hard`, "violet"],
    ["Current streak", `${stats.streak} days`, `Longest: ${stats.longest_streak} days`, "cyan"],
    ["Submissions", stats.submissions, `${stats.acceptance_rate == null ? "No rate yet" : `${stats.acceptance_rate}% accepted`}`, "pink"],
    ["Global rank", stats.global_rank ? `#${stats.global_rank}` : "—", stats.contest_rating == null ? "Contest rating unavailable" : `Rating ${stats.contest_rating}`, "cyan"],
  ];

  return <ArenaFrame eyebrow="YOUR DEVELOPER WORKSPACE" title={`Welcome back, ${user?.name?.split(" ")[0] || data.name}`} description="Build problem-solving momentum with daily practice, verified judging, and friendly contests." actions={<ArenaButton to={progressHref} variant="subtle">{data.last_attempted ? "Continue solving →" : "Explore problems →"}</ArenaButton>}>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{statsCards.map(([label, value, footnote, accent]) => <StatCard key={label} label={label} value={value} footnote={footnote} accent={accent} />)}</div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
      <ArenaCard className="arena-grid relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-300">Today’s challenge</p><h2 className="mt-3 text-2xl font-bold text-white">{data.daily_challenge?.title || "No problems yet"}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">{data.daily_challenge?.statement || "The arena library is waiting for its first curated problem."}</p></div>
          {data.daily_challenge && <div className="flex items-center gap-2"><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-cyan-200">{data.daily_challenge.topics[0]}</span><span className="rounded-full bg-violet-300/10 px-3 py-1.5 text-xs font-bold text-violet-200">{data.daily_challenge.difficulty}</span></div>}
        </div>
        <div className="relative mt-6 flex flex-wrap items-center gap-3"><ArenaButton to={data.daily_challenge ? `/arena/problems/${data.daily_challenge.slug}` : "/arena/problems"}>Open challenge <span aria-hidden="true">↗</span></ArenaButton><Link className="text-sm text-slate-400 transition hover:text-white" to="/arena/problems">Browse all problems</Link></div>
      </ArenaCard>
      <ArenaCard>
        <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-violet-300">Consistency</p><h2 className="mt-1 text-lg font-bold">This week</h2></div><span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-xs text-cyan-200">{data.activity.reduce((sum, day) => sum + day.count, 0)} submissions</span></div>
        <div className="mt-6"><Activity items={data.activity} /></div><p className="mt-4 text-xs text-slate-500">A submission is counted on its server-recorded UTC date.</p>
      </ArenaCard>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-3">
      <ArenaCard><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Keep your edge</p><h2 className="mt-1 text-lg font-bold">Recommended next</h2></div><Link to="/arena/problems" className="text-xs text-slate-400 hover:text-white">See all →</Link></div>
        <div className="mt-4 space-y-2">{data.recommended.length ? data.recommended.map((problem) => <Link key={problem.slug} to={`/arena/problems/${problem.slug}`} className="flex items-center justify-between rounded-xl border border-white/[.06] bg-white/[.025] p-3 transition hover:border-violet-300/25 hover:bg-white/[.05]"><span><span className="block text-sm font-semibold">{problem.title}</span><span className="mt-1 block text-xs text-slate-500">{problem.topics.slice(0, 2).join(" · ")}</span></span><span className="text-xs text-slate-400">{problem.difficulty}</span></Link>) : <p className="py-5 text-sm text-slate-500">You’ve attempted the whole current library. New problems will appear here.</p>}</div>
      </ArenaCard>
      <ArenaCard><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-pink-300">Recent activity</p><h2 className="mt-1 text-lg font-bold">Latest submissions</h2></div><Link to="/arena/progress" className="text-xs text-slate-400 hover:text-white">Analytics →</Link></div>
        <div className="mt-4 space-y-2">{data.recent_submissions.length ? data.recent_submissions.slice(0, 5).map((s) => <Link key={s.id} to={`/arena/problems/${s.problem_slug}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[.025] px-3 py-2.5"><span className="min-w-0 truncate text-sm font-medium">{s.problem_slug.replaceAll("-", " ")}</span><span className={`shrink-0 text-xs font-semibold ${s.status === "Accepted" ? "text-emerald-300" : "text-rose-300"}`}>{s.status}</span></Link>) : <p className="py-6 text-sm text-slate-500">Your first solution will show up here.</p>}</div>
      </ArenaCard>
      <ArenaCard><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-violet-300">Compete</p><h2 className="mt-1 text-lg font-bold">Upcoming contests</h2></div><Link to="/arena/hackathons" className="text-xs text-slate-400 hover:text-white">All events →</Link></div>
        <div className="mt-4 space-y-3">{data.contests.slice(0, 3).map((contest) => <Link key={contest.id} to={`/arena/hackathons/${contest.slug}`} className="block rounded-xl border border-white/[.06] bg-white/[.025] p-3 transition hover:border-cyan-300/20"><span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{contest.title}</span><span className={`text-[10px] font-bold uppercase ${contest.status === "live" ? "text-rose-300" : "text-cyan-300"}`}>{contest.status}</span></span><span className="mt-2 block text-xs text-slate-500">{new Date(contest.start_at).toLocaleString()} · {contest.duration_minutes} min</span></Link>)}{!data.contests.length && <p className="py-5 text-sm text-slate-500">No upcoming contests are scheduled.</p>}</div>
      </ArenaCard>
    </div>

    <div className="mt-5 flex flex-wrap items-center gap-2">{data.achievements.map((badge) => <span key={badge.id} className="rounded-xl border border-amber-200/15 bg-amber-200/[.06] px-3 py-2 text-xs font-semibold text-amber-100">✦ {badge.title}</span>)}{!data.achievements.length && <p className="text-xs text-slate-500">Achievement badges unlock as you solve problems.</p>}</div>
  </ArenaFrame>;
}
