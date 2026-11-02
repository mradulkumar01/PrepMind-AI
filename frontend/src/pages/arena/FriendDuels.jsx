import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../api.js";
import { ArenaButton, ArenaCard, ArenaFrame, ArenaNotice, LoadingState } from "./ArenaUI.jsx";

function Clock({ duel }) {
  const [now, setNow] = useState(Date.now());
  const offset = Date.parse(duel.server_time || new Date().toISOString()) - Date.now();
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const end = Date.parse(duel.ends_at || "");
  const remaining = Math.max(0, end - (now + offset));
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return <span className="font-mono text-2xl font-bold tabular-nums text-violet-100">{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>;
}

export default function FriendDuels() {
  const { duelId } = useParams();
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const [duels, setDuels] = useState([]);
  const [duel, setDuel] = useState(null);
  const [board, setBoard] = useState([]);
  const [problems, setProblems] = useState([]);
  const [problemSlug, setProblemSlug] = useState("");
  const [duration, setDuration] = useState(30);
  const [inviteCode, setInviteCode] = useState(search.get("invite") || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshList = useCallback(async () => {
    const [mine, library] = await Promise.all([api.arenaDuels(), api.arenaProblems({ limit: 100 })]);
    setDuels(mine); setProblems(library.items || []);
    setProblemSlug((old) => old || library.items?.[0]?.slug || "");
  }, []);
  const refreshDetail = useCallback(async () => {
    if (!duelId) return;
    const [detail, standings] = await Promise.all([api.arenaDuel(duelId), api.arenaDuelLeaderboard(duelId)]);
    setDuel(standings.duel || detail); setBoard(standings.items || []); setError("");
  }, [duelId]);

  useEffect(() => {
    const load = duelId ? refreshDetail : refreshList;
    load().catch((e) => setError(e.message));
  }, [duelId, refreshDetail, refreshList]);
  useEffect(() => {
    if (!duelId || duel?.status !== "live") return undefined;
    const timer = setInterval(() => refreshDetail().catch(() => {}), 12000);
    return () => clearInterval(timer);
  }, [duelId, duel?.status, refreshDetail]);

  const create = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const created = await api.arenaCreateDuel({ problem_slug: problemSlug, duration_minutes: Number(duration) });
      await refreshList(); navigate(`/arena/friends/${created.id}`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const join = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const joined = await api.arenaJoinDuel({ invite_code: inviteCode.trim() });
      setSearch({}); navigate(`/arena/friends/${joined.id}`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/arena/friends?invite=${encodeURIComponent(duel.invite_code)}`); }
    catch { setError(`Copy this invite code manually: ${duel.invite_code}`); }
  };

  if (error && !duels.length && !duel) return <ArenaFrame><ArenaNotice>{error}</ArenaNotice></ArenaFrame>;
  if (duelId && !duel) return <ArenaFrame><LoadingState label="Loading friend duel…" /></ArenaFrame>;

  if (duelId) return <ArenaFrame eyebrow="HEAD-TO-HEAD · SERVER TIMED" title="Friend coding duel" description="Both players solve the same problem. Correctness and problem difficulty determine points; the first server-recorded accepted solve breaks a tie." actions={<Link to="/arena/friends" className="text-sm text-cyan-200 hover:underline">← All duels</Link>}>
    {error && <div className="mb-4"><ArenaNotice>{error}</ArenaNotice></div>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.8fr)]">
      <div className="space-y-5">
        <ArenaCard className="arena-grid relative overflow-hidden"><div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl"/><div className="relative flex flex-wrap items-start justify-between gap-4"><div><span className="rounded-full bg-violet-300/10 px-3 py-1 text-[10px] font-bold uppercase text-violet-100">{duel.status}</span><h2 className="mt-3 text-xl font-bold">{duel.problem_title}</h2><p className="mt-1 text-sm text-slate-400">{duel.difficulty} · {duel.duration_minutes}-minute round · {duel.member_count}/2 players</p></div>{duel.status === "live" ? <div className="rounded-2xl border border-violet-200/15 bg-black/20 p-4"><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Time remaining</p><Clock duel={duel}/></div> : <span className="text-sm text-slate-400">{duel.status === "lobby" ? "Waiting for your friend to join" : "Time is up"}</span>}</div>
          <div className="relative mt-5 flex flex-wrap gap-2"><span className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-slate-300">+{duel.difficulty === "Hard" ? 300 : duel.difficulty === "Medium" ? 200 : 100} duel points for first accepted solve</span><span className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-slate-300">AI coach disabled during live play</span></div>
          {duel.status === "live" && <ArenaButton className="relative mt-5" to={`/arena/problems/${duel.problem_slug}?duel=${duel.id}`}>Enter duel workspace →</ArenaButton>}
          {duel.status === "lobby" && <div className="relative mt-5 rounded-xl border border-violet-200/10 bg-black/20 p-4"><p className="text-sm font-semibold">Invite one friend</p><p className="mt-1 text-xs text-slate-400">The server timer starts when your opponent joins.</p><div className="mt-3 flex flex-wrap items-center gap-3"><code className="rounded-lg bg-black/30 px-3 py-2 font-mono text-violet-100">{duel.invite_code}</code><button onClick={copyInvite} className="text-xs font-semibold text-cyan-200 underline">Copy invite link</button></div></div>}
        </ArenaCard>
        <ArenaCard><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Server-verified</p><h2 className="mt-1 text-lg font-bold">Duel standings</h2></div><span className="text-xs text-slate-500">First accepted solve per player</span></div>{duel.status === "completed" && <p className="mt-3 rounded-lg bg-violet-300/10 px-3 py-2 text-sm font-semibold text-violet-100">{duel.result === "draw" ? "Draw · same score and server-recorded solve time" : duel.result === "no_solve" ? "Round complete · no accepted solves" : duel.winner_id ? `${board.find((row) => row.user_id === duel.winner_id)?.participant || "A player"} wins` : "Round complete"}</p>}<div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="pb-2">Rank</th><th className="pb-2">Player</th><th className="pb-2 text-right">Points</th><th className="pb-2 text-right">Accepted at</th></tr></thead><tbody>{board.map((row) => <tr key={row.user_id} className="border-t border-white/[.06]"><td className="py-3 font-bold text-violet-200">#{row.rank}</td><td className="py-3">{row.participant}</td><td className="py-3 text-right font-bold text-cyan-100">{row.score}</td><td className="py-3 text-right text-xs text-slate-500">{new Date(row.accepted_at).toLocaleTimeString()}</td></tr>)}</tbody></table>{!board.length && <p className="py-6 text-center text-sm text-slate-500">No accepted solves yet.</p>}</div><p className="mt-3 text-xs text-slate-500">Tie-break: earliest accepted submission time recorded by the API server. Identical solve times share a rank and result in a draw. Incorrect attempts do not reduce points.</p></ArenaCard>
      </div>
      <aside className="space-y-5"><ArenaCard><p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-300">Challenge rules</p><ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400"><li>1. Both players work on the same published problem.</li><li>2. The timer begins when the second player joins; the server enforces the deadline.</li><li>3. Only a first accepted solution scores points for each player.</li><li>4. Points use fixed problem difficulty values: Easy 100, Medium 200, Hard 300.</li><li>5. The earlier server-recorded accepted time ranks first; identical times are a draw.</li></ol></ArenaCard><ArenaCard><p className="text-[10px] font-bold uppercase tracking-[.2em] text-pink-300">Privacy & fairness</p><p className="mt-2 text-sm leading-relaxed text-slate-400">Your code stays private to your account. The standings expose player display names and scores only. Friend duels disable AI help while the timer is live.</p></ArenaCard></aside>
    </div>
  </ArenaFrame>;

  return <ArenaFrame eyebrow="GAMIFIED PRACTICE" title="Timed friend duels" description="Create a one-problem challenge, invite one friend, and compete under the same server-controlled clock and scoring rubric.">
    {error && <div className="mb-4"><ArenaNotice>{error}</ArenaNotice></div>}
    <div className="grid gap-5 xl:grid-cols-2">
      <ArenaCard><p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-300">Create challenge</p><h2 className="mt-1 text-lg font-bold">Pick the problem and clock</h2><form onSubmit={create} className="mt-4 space-y-3"><label className="block text-xs font-semibold text-slate-400">Problem<select className="arena-input mt-2" required value={problemSlug} onChange={(e) => setProblemSlug(e.target.value)}>{problems.map((problem) => <option key={problem.slug} value={problem.slug}>{problem.title} · {problem.difficulty}</option>)}</select></label><label className="block text-xs font-semibold text-slate-400">Time limit<select className="arena-input mt-2" value={duration} onChange={(e) => setDuration(e.target.value)}><option value={10}>10 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option><option value={90}>90 minutes</option><option value={120}>120 minutes</option></select></label><ArenaButton disabled={busy || !problemSlug}>{busy ? "Creating…" : "Create invite challenge"}</ArenaButton></form><p className="mt-3 text-[11px] leading-relaxed text-slate-500">The server starts the timer only after your opponent joins. Use the invite link to bring them to the duel.</p></ArenaCard>
      <ArenaCard><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Join a friend</p><h2 className="mt-1 text-lg font-bold">Enter their invite code</h2><form onSubmit={join} className="mt-4 flex flex-wrap gap-2"><input className="arena-input min-w-48 flex-1" minLength={6} maxLength={32} required value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Paste duel invite code"/><ArenaButton disabled={busy || !inviteCode.trim()} variant="subtle">Join duel</ArenaButton></form><p className="mt-3 text-[11px] leading-relaxed text-slate-500">The duel opens when the second player joins. The countdown and deadline are enforced by the backend.</p></ArenaCard>
    </div>
    <section className="mt-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Your duels</h2><span className="text-xs text-slate-500">{duels.length} saved</span></div>{duels.length ? <div className="grid gap-3 md:grid-cols-2">{duels.map((item) => <ArenaCard key={item.id} className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-violet-200">{item.status} · {item.duration_minutes} min</p><h3 className="mt-1 font-semibold">{item.problem_title}</h3><p className="mt-1 text-xs text-slate-500">{item.difficulty}{item.status === "lobby" ? " · waiting for opponent" : ""}</p></div><ArenaButton to={`/arena/friends/${item.id}`} variant="subtle">Open →</ArenaButton></ArenaCard>)}</div> : <ArenaCard><p className="py-5 text-center text-sm text-slate-500">Your friend duels will appear here.</p></ArenaCard>}</section>
  </ArenaFrame>;
}
