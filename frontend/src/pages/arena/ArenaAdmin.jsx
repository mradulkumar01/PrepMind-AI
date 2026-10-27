import { useEffect, useState } from "react";
import { api } from "../../api.js";
import { ArenaButton, ArenaCard, ArenaFrame, ArenaNotice, LoadingState } from "./ArenaUI.jsx";

const emptyProblem = {
  slug: "", title: "", difficulty: "Easy", topics: "Arrays", statement: "", examples: '[{"input":"","output":"","explanation":""}]',
  constraints: "", testCases: '[{"input":"","output":"","visible":true}]', starter: "{}", prerequisites: "", hints: "", editorial: "", published: true,
};

const future = (hours) => { const d = new Date(Date.now() + hours * 3600000); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export default function ArenaAdmin() {
  const [problems, setProblems] = useState(null);
  const [contests, setContests] = useState([]);
  const [problem, setProblem] = useState(emptyProblem);
  const [contest, setContest] = useState({ slug: "", title: "", description: "", start_at: future(48), end_at: future(50), problem_slugs: "", participation_mode: "individual", ai_policy: "disabled" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => Promise.all([api.arenaAdminProblems(), api.arenaAdminContests()]).then(([p, c]) => { setProblems(p); setContests(c); setError(""); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const saveProblem = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const saved = await api.arenaAdminSaveProblem({
        slug: problem.slug, title: problem.title, difficulty: problem.difficulty,
        topics: problem.topics.split(",").map((v) => v.trim()).filter(Boolean), statement: problem.statement,
        examples: JSON.parse(problem.examples), constraints: problem.constraints.split("\n").map((v) => v.trim()).filter(Boolean),
        test_cases: JSON.parse(problem.testCases), starter_code: JSON.parse(problem.starter),
        prerequisites: problem.prerequisites.split(",").map((v) => v.trim()).filter(Boolean), hints: problem.hints.split("\n").map((v) => v.trim()).filter(Boolean),
        editorial: problem.editorial || null, published: problem.published,
      });
      setMessage(`Saved ${saved.slug}.`); setProblem(emptyProblem); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const saveContest = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const saved = await api.arenaAdminSaveContest({
        ...contest, start_at: new Date(contest.start_at).toISOString(), end_at: new Date(contest.end_at).toISOString(),
        problem_slugs: contest.problem_slugs.split(",").map((v) => v.trim()).filter(Boolean),
        points_by_difficulty: { Easy: 100, Medium: 200, Hard: 300 },
      });
      setMessage(`Saved contest ${saved.slug}.`); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return <ArenaFrame title="Arena administration" description="Manage published problem content and server-timed contests. Access is enforced by ARENA_ADMIN_EMAILS on the backend.">
    {error && <div className="mb-4"><ArenaNotice>{error}{error.includes("admin access") && " Add your account email to ARENA_ADMIN_EMAILS in backend/.env, then restart the API."}</ArenaNotice></div>}
    {message && <p role="status" className="mb-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">{message}</p>}
    {!problems && !error ? <LoadingState label="Checking admin access…"/> : <>
      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <ArenaCard><div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Problem manager</p><h2 className="mt-1 text-xl font-bold">Create or update problem</h2><p className="mt-1 text-xs text-slate-500">Hidden inputs and expected outputs are submitted only through this protected form.</p></div>
          <form onSubmit={saveProblem} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2"><label className="arena-label">Slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} className="arena-input mt-1" value={problem.slug} onChange={(e) => setProblem({ ...problem, slug: e.target.value })}/></label><label className="arena-label">Title<input required minLength={3} maxLength={160} className="arena-input mt-1" value={problem.title} onChange={(e) => setProblem({ ...problem, title: e.target.value })}/></label></div>
            <div className="grid gap-3 sm:grid-cols-2"><label className="arena-label">Difficulty<select className="arena-input mt-1" value={problem.difficulty} onChange={(e) => setProblem({ ...problem, difficulty: e.target.value })}><option>Easy</option><option>Medium</option><option>Hard</option></select></label><label className="arena-label">Topics, comma separated<input required className="arena-input mt-1" value={problem.topics} onChange={(e) => setProblem({ ...problem, topics: e.target.value })}/></label></div>
            <label className="arena-label">Problem statement<textarea required minLength={20} maxLength={12000} rows={4} className="arena-input mt-1" value={problem.statement} onChange={(e) => setProblem({ ...problem, statement: e.target.value })}/></label>
            <label className="arena-label">Examples JSON<textarea required rows={4} className="arena-input mt-1 font-mono text-xs" value={problem.examples} onChange={(e) => setProblem({ ...problem, examples: e.target.value })}/></label>
            <label className="arena-label">Constraints, one per line<textarea required rows={2} className="arena-input mt-1" value={problem.constraints} onChange={(e) => setProblem({ ...problem, constraints: e.target.value })}/></label>
            <label className="arena-label">Public and hidden test cases JSON<textarea required rows={6} className="arena-input mt-1 font-mono text-xs" value={problem.testCases} onChange={(e) => setProblem({ ...problem, testCases: e.target.value })}/></label>
            <label className="arena-label">Starter code by language JSON<textarea rows={4} className="arena-input mt-1 font-mono text-xs" value={problem.starter} onChange={(e) => setProblem({ ...problem, starter: e.target.value })}/></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="arena-label">Prerequisites<input className="arena-input mt-1" value={problem.prerequisites} onChange={(e) => setProblem({ ...problem, prerequisites: e.target.value })}/></label><label className="arena-label">Hints, one per line<textarea rows={2} className="arena-input mt-1" value={problem.hints} onChange={(e) => setProblem({ ...problem, hints: e.target.value })}/></label></div>
            <label className="arena-label">Editorial<textarea rows={3} className="arena-input mt-1" value={problem.editorial} onChange={(e) => setProblem({ ...problem, editorial: e.target.value })}/></label>
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={problem.published} onChange={(e) => setProblem({ ...problem, published: e.target.checked })} className="accent-violet-400"/> Published and visible to users</label>
            <ArenaButton type="submit" disabled={busy}>{busy ? "Saving…" : "Save problem"}</ArenaButton>
          </form>
        </ArenaCard>

        <ArenaCard><div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-300">Contest scheduler</p><h2 className="mt-1 text-xl font-bold">Create or update contest</h2><p className="mt-1 text-xs text-slate-500">All start and end timestamps are submitted with a timezone and checked by the API.</p></div>
          <form onSubmit={saveContest} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2"><label className="arena-label">Contest slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" className="arena-input mt-1" value={contest.slug} onChange={(e) => setContest({ ...contest, slug: e.target.value })}/></label><label className="arena-label">Title<input required minLength={3} className="arena-input mt-1" value={contest.title} onChange={(e) => setContest({ ...contest, title: e.target.value })}/></label></div>
            <label className="arena-label">Description<textarea required minLength={10} rows={3} className="arena-input mt-1" value={contest.description} onChange={(e) => setContest({ ...contest, description: e.target.value })}/></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="arena-label">Starts at<input type="datetime-local" required className="arena-input mt-1" value={contest.start_at} onChange={(e) => setContest({ ...contest, start_at: e.target.value })}/></label><label className="arena-label">Ends at<input type="datetime-local" required className="arena-input mt-1" value={contest.end_at} onChange={(e) => setContest({ ...contest, end_at: e.target.value })}/></label></div>
            <label className="arena-label">Published problem slugs, comma separated<input required className="arena-input mt-1" value={contest.problem_slugs} onChange={(e) => setContest({ ...contest, problem_slugs: e.target.value })}/></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="arena-label">Participation<select className="arena-input mt-1" value={contest.participation_mode} onChange={(e) => setContest({ ...contest, participation_mode: e.target.value })}><option value="individual">Individual</option><option value="team">Teams</option></select></label><label className="arena-label">AI policy<select className="arena-input mt-1" value={contest.ai_policy} onChange={(e) => setContest({ ...contest, ai_policy: e.target.value })}><option value="disabled">Disabled during contest</option><option value="limited">Limited coaching</option></select></label></div>
            <ArenaButton type="submit" disabled={busy}>{busy ? "Saving…" : "Save contest"}</ArenaButton>
          </form>
        </ArenaCard>
      </div>
      <div className="grid gap-5 xl:grid-cols-2"><ArenaCard><h2 className="text-sm font-bold">Problems ({problems?.length ?? 0})</h2><div className="mt-3 space-y-2">{problems?.map((p) => <div key={p.slug} className="flex justify-between gap-2 rounded-lg bg-white/[.03] px-3 py-2 text-xs"><span>{p.title} <span className="text-slate-500">/{p.slug}</span></span><span className="text-slate-500">{p.test_case_count} cases · {p.published ? "published" : "draft"}</span></div>)}</div></ArenaCard><ArenaCard><h2 className="text-sm font-bold">Contests ({contests.length})</h2><div className="mt-3 space-y-2">{contests.map((c) => <div key={c.id} className="flex justify-between gap-2 rounded-lg bg-white/[.03] px-3 py-2 text-xs"><span>{c.title}</span><span className="text-slate-500">{new Date(c.start_at).toLocaleString()}</span></div>)}</div></ArenaCard></div>
    </>}
  </ArenaFrame>;
}
