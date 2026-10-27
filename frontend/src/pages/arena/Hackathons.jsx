import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api.js";
import { ArenaButton, ArenaCard, ArenaFrame, ArenaNotice, DifficultyPill, LoadingState } from "./ArenaUI.jsx";

function Countdown({ contest }) {
  const [now, setNow] = useState(Date.now());
  const offset = Date.parse(contest.server_time || new Date().toISOString()) - Date.now();
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const target = Date.parse(contest.status === "live" ? contest.end_at : contest.start_at);
  const remain = Math.max(0, target - (now + offset));
  const days = Math.floor(remain / 86400000); const hours = Math.floor((remain % 86400000) / 3600000); const mins = Math.floor((remain % 3600000) / 60000); const secs = Math.floor((remain % 60000) / 1000);
  return <div className="flex gap-2 tabular-nums">{[[days, "D"], [hours, "H"], [mins, "M"], [secs, "S"]].map(([v, unit]) => <span key={unit} className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-center"><b className="block font-display text-xl text-white">{String(v).padStart(2, "0")}</b><i className="text-[9px] not-italic text-slate-500">{unit}</i></span>)}</div>;
}

export default function Hackathons() {
  const { slug } = useParams();
  const [contests, setContests] = useState([]);
  const [contest, setContest] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [team, setTeam] = useState(null);
  const [tab, setTab] = useState("all");

  const load = async () => {
    try {
      const all = await api.arenaContests(); setContests(all); setError("");
      if (slug) {
        const detail = all.find((c) => c.slug === slug) || await api.arenaContest(slug);
        setContest(detail);
        const board = await api.arenaLeaderboard(slug); setLeaderboard(board.items);
      }
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, [slug]);
  useEffect(() => {
    if (!slug || contest?.status !== "live") return undefined;
    const timer = setInterval(() => api.arenaLeaderboard(slug).then((r) => setLeaderboard(r.items)).catch(() => {}), 20000);
    return () => clearInterval(timer);
  }, [slug, contest?.status]);

  const changeRegistration = async (cancel = false) => {
    setBusy(true); setError("");
    try { if (cancel) await api.arenaCancelRegistration(slug); else await api.arenaRegisterContest(slug); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const createTeam = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try { setTeam(await api.arenaCreateTeam(slug, { name: teamName })); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const joinTeam = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try { const res = await api.arenaJoinTeam(slug, { invite_code: inviteCode }); setTeam({ name: res.team }); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const copyInvite = async () => { try { await navigator.clipboard.writeText(team.invite_code); } catch { setError("Could not access the clipboard. Copy the invite code manually."); } };

  if (error && !contests.length) return <ArenaFrame><ArenaNotice>{error}</ArenaNotice></ArenaFrame>;
  if (!slug) {
    const visible = contests.filter((c) => tab === "all" || c.status === tab);
    return <ArenaFrame title="Hackathons & contests" description="Join server-timed coding events, track standings, and solve problems under clear contest rules.">
      <div className="mb-5 flex flex-wrap gap-2">{["all", "upcoming", "live", "completed"].map((key) => <button key={key} onClick={() => setTab(key)} className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize ${tab === key ? "bg-violet-300/15 text-violet-100" : "bg-white/[.035] text-slate-400 hover:text-white"}`}>{key}</button>)}</div>
      {error && <ArenaNotice>{error}</ArenaNotice>}{!contests.length ? <ArenaCard><LoadingState label="Loading event schedule…" /></ArenaCard> : visible.length ? <div className="grid gap-4 lg:grid-cols-2">{visible.map((c) => <ArenaCard key={c.id} className="relative overflow-hidden"><div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" /><div className="relative flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-300">{c.participation_mode} event · {c.duration_minutes} min</p><h2 className="mt-2 text-xl font-bold text-white">{c.title}</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">{c.description}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${c.status === "live" ? "bg-rose-300/10 text-rose-200" : c.status === "completed" ? "bg-white/5 text-slate-400" : "bg-cyan-300/10 text-cyan-100"}`}>{c.status}</span></div><div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] pt-4"><div className="text-xs text-slate-500">Starts {new Date(c.start_at).toLocaleString()}<span className="mt-1 block">{c.registered ? "✓ You are registered" : `${c.problem_slugs.length} problems · registration ${c.status === "upcoming" ? "open" : "closed"}`}</span></div><ArenaButton to={`/arena/hackathons/${c.slug}`} variant={c.status === "live" ? "primary" : "quiet"}>{c.status === "live" ? "Enter contest" : "Contest details"} →</ArenaButton></div></ArenaCard>)}</div> : <ArenaCard className="py-12 text-center"><p className="font-semibold">No {tab === "all" ? "" : `${tab} `}events here yet.</p><p className="mt-2 text-sm text-slate-500">Contest status and dates are evaluated using the server clock.</p></ArenaCard>}
    </ArenaFrame>;
  }

  if (!contest) return <ArenaFrame><LoadingState label="Loading contest details…" /></ArenaFrame>;
  const isUpcoming = contest.status === "upcoming";
  const isLive = contest.status === "live";
  const canEnter = isLive && contest.registered;
  return <ArenaFrame eyebrow="OFFICIAL EVENT · SERVER-AUTHORITATIVE TIME" title={contest.title} description={contest.description} actions={<Link className="text-sm text-cyan-200 hover:underline" to="/arena/hackathons">← All events</Link>}>
    {error && <div className="mb-4"><ArenaNotice>{error}</ArenaNotice></div>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.8fr)]">
      <div className="space-y-5">
        <ArenaCard className="arena-grid relative overflow-hidden"><div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl"/><div className="relative flex flex-wrap items-start justify-between gap-5"><div><span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${isLive ? "bg-rose-300/10 text-rose-200" : "bg-violet-300/10 text-violet-100"}`}>{contest.status} contest</span><h2 className="mt-4 text-xl font-bold">{isLive ? "Time remaining" : isUpcoming ? "Starts in" : "Contest ended"}</h2><p className="mt-1 text-xs text-slate-400">{new Date(contest.start_at).toLocaleString()} – {new Date(contest.end_at).toLocaleString()}</p></div>{(isLive || isUpcoming) && <Countdown contest={contest}/>}</div><div className="relative mt-6 flex flex-wrap items-center gap-3"><span className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-slate-300">{contest.duration_minutes} minute duration</span><span className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-slate-300">{contest.participation_mode === "team" ? "Team entry" : "Individual entry"}</span><span className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-slate-300">AI {contest.ai_policy === "disabled" ? "disabled" : "limited"}</span></div></ArenaCard>

        <ArenaCard><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Contest set</p><h2 className="mt-1 text-lg font-bold">Problems</h2></div><span className="text-xs text-slate-500">Scoring · first accepted solve per problem</span></div><div className="mt-4 space-y-2">{contest.problem_slugs.map((problemSlug) => <ContestProblem key={problemSlug} slug={problemSlug} contest={contest} canEnter={canEnter}/>)}</div></ArenaCard>
        <ArenaCard><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-300">Verified standings</p><h2 className="mt-1 text-lg font-bold">Leaderboard</h2></div><span className="text-[10px] text-slate-500">{isLive ? "Refreshes every 20 sec" : "Final saved scores"}</span></div><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="pb-2">Rank</th><th className="pb-2">Participant</th><th className="pb-2">Type</th><th className="pb-2 text-right">Score</th></tr></thead><tbody>{leaderboard.map((row) => <tr key={`${row.rank}-${row.participant}`} className="border-t border-white/[.06]"><td className="py-3 font-bold text-violet-200">#{row.rank}</td><td className="py-3 font-medium">{row.participant}</td><td className="py-3 text-xs capitalize text-slate-500">{row.kind}</td><td className="py-3 text-right font-bold text-cyan-100">{row.score}</td></tr>)}</tbody></table>{!leaderboard.length && <p className="py-6 text-center text-sm text-slate-500">No accepted contest submissions yet.</p>}</div></ArenaCard>
      </div>
      <aside className="space-y-5">
        <ArenaCard><p className="text-[10px] font-bold uppercase tracking-[.2em] text-pink-300">Your entry</p><h2 className="mt-1 text-lg font-bold">{contest.registered ? "You’re in" : "Reserve your place"}</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">Contest windows and eligibility are enforced by the backend clock when a solution is submitted.</p>
          {contest.participation_mode === "individual" ? <div className="mt-4">{contest.registered ? <ArenaButton variant="danger" disabled={!isUpcoming || busy} onClick={() => changeRegistration(true)}>{isUpcoming ? "Cancel registration" : "Registration locked"}</ArenaButton> : <ArenaButton disabled={!isUpcoming || busy} onClick={() => changeRegistration(false)}>{busy ? "Registering…" : isUpcoming ? "Register for contest" : "Registration closed"}</ArenaButton>}</div> : <div className="mt-4 space-y-3">
            {contest.registered ? <p className="rounded-lg bg-emerald-300/10 p-3 text-xs text-emerald-100">Your team is registered for this event.</p> : isUpcoming && <><form onSubmit={createTeam} className="flex gap-2"><input required minLength={2} maxLength={60} className="arena-input" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="New team name"/><button className="arena-button arena-button-primary" disabled={busy}>Create team</button></form><div className="text-center text-[10px] text-slate-600">OR JOIN A TEAM</div><form onSubmit={joinTeam} className="flex gap-2"><input required className="arena-input" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Team invite code"/><button className="arena-button arena-button-subtle" disabled={busy}>Join</button></form></>}
            {team?.invite_code && <div className="rounded-xl border border-violet-300/15 bg-violet-300/[.05] p-3"><p className="text-xs font-semibold">Share this invite code</p><div className="mt-2 flex items-center justify-between gap-2"><code className="break-all text-sm text-violet-100">{team.invite_code}</code><button className="text-xs text-cyan-200 underline" onClick={copyInvite}>Copy</button></div></div>}
          </div>}
          {canEnter && <ArenaButton className="mt-3 w-full" to={`/arena/problems/${contest.problem_slugs[0]}?contest=${contest.id}`}>Enter live contest →</ArenaButton>}
          {!contest.registered && isLive && <p className="mt-3 text-xs text-amber-100">You must register before the contest begins to submit for standings.</p>}
        </ArenaCard>
        <ArenaCard><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-200">Rules & scoring</p><ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">{contest.rules?.map((rule, i) => <li key={i} className="flex gap-2"><span className="text-cyan-300">{String(i + 1).padStart(2, "0")}</span><span>{rule}</span></li>)}<li className="flex gap-2"><span className="text-cyan-300">✦</span><span>Points: Easy {contest.points_by_difficulty.Easy} · Medium {contest.points_by_difficulty.Medium} · Hard {contest.points_by_difficulty.Hard}</span></li></ul></ArenaCard>
      </aside>
    </div>
  </ArenaFrame>;
}

function ContestProblem({ slug, contest, canEnter }) {
  const [problem, setProblem] = useState(null);
  useEffect(() => { api.arenaProblem(slug).then(setProblem).catch(() => {}); }, [slug]);
  if (!problem) return <div className="h-14 animate-pulse rounded-xl bg-white/[.04]" />;
  const href = canEnter ? `/arena/problems/${slug}?contest=${contest.id}` : `/arena/problems/${slug}`;
  return <Link to={href} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-white/[.025] p-3 transition hover:border-violet-300/20 hover:bg-white/[.05]"><span><span className="block text-sm font-semibold text-white">{problem.title}</span><span className="mt-1 flex flex-wrap gap-1.5">{problem.topics.slice(0, 2).map((topic) => <span key={topic} className="text-[10px] text-slate-500">{topic}</span>)}</span></span><span className="flex items-center gap-3"><DifficultyPill value={problem.difficulty}/><span className="text-slate-500">→</span></span></Link>;
}
