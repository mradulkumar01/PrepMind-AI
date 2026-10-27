import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { Chip, Icon, LoadingGesture, Sparkline, Spinner, Typewriter } from "../components/ui.jsx";
import PrepWorkspace from "../components/PrepWorkspace.jsx";
import DeleteConfirmAction from "../components/DeleteConfirmAction.jsx";

const TYPES = [
  { id: "mixed", icon: "layers", title: "Mixed", text: "Technical, project and HR in rotation" },
  { id: "technical", icon: "code", title: "Technical", text: "One skill from your resume at a time" },
  { id: "project", icon: "folder", title: "Project deep-dive", text: "Decisions, trade-offs and results" },
  { id: "hr", icon: "users", title: "HR", text: "Teamwork, pressure and motivation" },
];
const MAX_MB = 5;

export default function Dashboard({ user, onReady }) {
  const [resumes, setResumes] = useState([]);
  const [history, setHistory] = useState([]);
  const [plan, setPlan] = useState({ tasks: [] });
  const [roadmapBusy, setRoadmapBusy] = useState("");
  const [file, setFile] = useState(null);
  const [inputKey, setInputKey] = useState(0);
  const [drag, setDrag] = useState(false);
  const [jd, setJd] = useState("");
  const [showJd, setShowJd] = useState(false);
  const [cfg, setCfg] = useState({ resume_id: "", interview_type: "mixed", num_questions: 5, target_role: "Software engineering", topics: "", difficulty: "medium" });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async (initial = false) => {
    setLoading(true);
    try {
      const [r, h, p] = await Promise.all([api.resumes(), api.interviews(), api.learningPlan()]);
      setResumes(r); setHistory(h); setPlan(p);
      setCfg((c) => ({ ...c, resume_id: r.some((x) => x.id === c.resume_id) ? c.resume_id : r[0]?.id || "" }));
    } catch (e) { setMsg({ type: "error", text: e.message }); }
    finally { setLoading(false); if (initial) onReady?.(); }
  };
  useEffect(() => { load(true); }, []);

  const pick = (f) => {
    if (!f) return;
    if (!/\.(pdf|docx)$/i.test(f.name)) return setMsg({ type: "error", text: "Choose a .pdf or .docx file." });
    if (f.size > MAX_MB * 1024 * 1024) return setMsg({ type: "error", text: `That file is over ${MAX_MB} MB.` });
    setMsg({ type: "", text: "" }); setFile(f);
  };

  const upload = async () => {
    if (!file) return;
    setBusy("upload"); setMsg({ type: "", text: "" });
    try {
      const form = new FormData();
      form.append("file", file); form.append("job_description", jd);
      await api.uploadResume(form);
      setFile(null); setJd(""); setShowJd(false); setInputKey((k) => k + 1);
      setMsg({ type: "ok", text: "Resume analysed. You can start an interview now." });
      await load();
    } catch (ex) { setMsg({ type: "error", text: ex.message }); } finally { setBusy(""); }
  };

  const start = async () => {
    setBusy("start"); setMsg({ type: "", text: "" });
    try {
      const res = await api.startInterview({
        ...cfg,
        num_questions: Number(cfg.num_questions),
        topics: cfg.topics.split(",").map((topic) => topic.trim()).filter(Boolean).slice(0, 10),
      });
      navigate(`/interview/${res.interview.id}`);
    } catch (ex) { setMsg({ type: "error", text: ex.message }); setBusy(""); }
  };

  const remove = async (id) => {
    try { await api.deleteResume(id); await load(); }
    catch (ex) { setMsg({ type: "error", text: ex.message }); throw ex; }
  };

  const deleteInterview = async (interview) => {
    setMsg({ type: "", text: "" });
    try {
      await api.deleteInterview(interview.id);
      setHistory((items) => items.filter((item) => item.id !== interview.id));
      setMsg({ type: "ok", text: "Interview history deleted." });
    } catch (ex) { setMsg({ type: "error", text: ex.message }); throw ex; }
  };

  const toggleTask = async (task) => {
    const completed = !task.completed;
    setRoadmapBusy(task.id);
    setPlan((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, completed } : item) }));
    try { await api.updateLearningTask(task.id, completed); }
    catch (ex) {
      setPlan((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, completed: task.completed } : item) }));
      setMsg({ type: "error", text: ex.message });
    } finally { setRoadmapBusy(""); }
  };

  const done = history.filter((h) => h.status === "completed" && h.summary);
  const scores = [...done].reverse().map((h) => h.summary.overall);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const best = scores.length ? Math.round(Math.max(...scores)) : null;
  const first = user?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const openTasks = plan.tasks.filter((task) => !task.completed).length;
  const jumpToInterview = () => document.getElementById("interview-setup")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

  return (
    <div className="space-y-6">
      <section className="home-hero home-hero-enter relative isolate overflow-hidden rounded-[28px] border border-brand/20 bg-white/80 p-5 shadow-[0_22px_70px_-44px_rgba(119,35,78,.5)] backdrop-blur-xl sm:p-8">
        <span className="home-hero-glow home-hero-glow-one" aria-hidden="true"/><span className="home-hero-glow home-hero-glow-two" aria-hidden="true"/>
        <div className="relative grid items-center gap-7 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand-light/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-brand-dark"><span className="home-live-dot"/>Your personal preparation space</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">{greeting}, {first}<span className="text-brand">.</span></h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink/65"><Typewriter text="Your next strong interview starts with one focused practice." speed={22}/></p>
            <div className="mt-6 flex flex-wrap gap-3"><button type="button" className="btn home-cta" onClick={jumpToInterview}><Icon name="play" className="h-4 w-4"/>Start an interview<span aria-hidden="true">↗</span></button><Link className="btn-ghost" to="/arena"><Icon name="code" className="h-4 w-4"/>Open Coding Arena</Link></div>
          </div>
          <div className="home-focus-card relative mx-auto w-full max-w-xs rounded-2xl border border-white/80 bg-white/70 p-5 shadow-[0_16px_45px_-26px_rgba(119,35,78,.45)] lg:mx-0">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[.16em] text-ink/55">Your momentum</span><span className="home-pulse-icon" aria-hidden="true">✦</span></div>
            <p className="mt-4 font-display text-3xl font-bold tabular-nums">{loading ? "…" : done.length}<span className="ml-2 text-sm font-medium text-ink/55">interviews completed</span></p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-brand/10"><div className="home-progress-bar h-full rounded-full bg-gradient-to-r from-brand to-[#f2a1ca]" style={{ width: `${loading ? 12 : Math.min(100, done.length ? Math.max(18, done.length * 14) : resumes.length ? 12 : 4)}%` }}/></div>
            <p className="mt-3 text-xs text-ink/55">{loading ? "Syncing your saved progress" : resumes.length ? `${openTasks} personal practice ${openTasks === 1 ? "step" : "steps"} ready` : "Add your resume to unlock a tailored interview"}</p>
          </div>
        </div>
        <div className="relative mt-7 grid gap-2 border-t border-brand/10 pt-4 text-xs sm:grid-cols-3"><div className="flex items-center gap-2 text-ink/65"><span className="home-step-number">01</span> Add your resume</div><div className="flex items-center gap-2 text-ink/65"><span className="home-step-number">02</span> Practise with adaptive questions</div><div className="flex items-center gap-2 text-ink/65"><span className="home-step-number">03</span> Turn feedback into progress</div></div>
      </section>

      {msg.text && (
        <p role={msg.type === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${msg.type === "ok" ? "border-mint/20 bg-mint/10 text-mint" : "border-coral/20 bg-coral/10 text-coral"}`}>{msg.text}</p>
      )}

      <PrepWorkspace />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* Step 1 */}
          <section className="card scroll-mt-28" id="interview-setup">
            <h2 className="mb-4 flex items-center gap-3 text-xl font-bold"><span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-sm text-white">1</span>Your resume</h2>
            <label
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition focus-within:ring-2 focus-within:ring-brand/40 ${drag ? "scale-[1.01] border-brand bg-brand-light" : "border-ink/20 hover:border-brand/60"}`}
            >
              <input key={inputKey} type="file" accept=".pdf,.docx" className="sr-only" onChange={(e) => pick(e.target.files[0])} />
              <span className={`grid h-12 w-12 place-items-center rounded-full transition ${drag ? "bg-brand text-white" : "bg-brand-light text-brand"}`}><Icon name={file ? "file" : "upload"} className="h-6 w-6" /></span>
              {file
                ? <span className="font-medium">{file.name} <span className="font-normal text-ink/50">({Math.max(1, Math.round(file.size / 1024))} KB)</span></span>
                : <><span className="font-medium">Drop your resume here or click to browse</span><span className="text-sm text-ink/55">PDF or DOCX, up to {MAX_MB} MB</span></>}
            </label>

            <button type="button" className="mt-3 text-sm font-medium text-brand hover:underline" onClick={() => setShowJd(!showJd)}>
              {showJd ? "Remove job description" : "Add a job description (optional)"}
            </button>
            {showJd && <textarea className="input mt-2" rows={4} maxLength={8000} placeholder="Paste the job description. Questions will lean towards it and you will see which of its skills your resume is missing." value={jd} onChange={(e) => setJd(e.target.value)} />}

            <div className="mt-4 flex items-center gap-3">
              <button className="btn" disabled={!file || busy === "upload"} onClick={upload}>{busy === "upload" ? <><Spinner /> Reading your resume</> : "Analyse resume"}</button>
              {busy === "upload" && <span className="text-xs text-ink/55">The first upload is slower while the embedding model loads.</span>}
            </div>

            {loading ? <LoadingGesture compact label="Loading your resumes…" /> : <ul className="mt-5 space-y-3">
              {resumes.map((r) => (
                <li key={r.id} className="rounded-xl bg-canvas p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="truncate">{r.filename}</strong>
                    <DeleteConfirmAction className="btn-ghost !px-2 !py-1 text-coral" title="Delete this resume?" description="This removes the resume and its stored text chunks from your account." onDelete={() => remove(r.id)} triggerProps={{ "aria-label": `Delete ${r.filename}`, title: "Delete resume" }}><Icon name="trash" className="h-4 w-4" /></DeleteConfirmAction>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.skills.length === 0 && <span className="text-sm text-ink/55">No skills from the built-in list were found.</span>}
                    {r.skills.slice(0, 16).map((s, i) => <Chip key={s} delay={i * 35}>{s}</Chip>)}
                    {r.skills.length > 16 && <Chip tone="brand">+{r.skills.length - 16} more</Chip>}
                  </div>
                  {r.skill_gap?.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs text-ink/60">In the job description but not on your resume:</p>
                      <div className="flex flex-wrap gap-1.5">{r.skill_gap.map((s, i) => <Chip key={s} tone="gold" delay={i * 35}>{s}</Chip>)}</div>
                    </div>
                  )}
                </li>
              ))}
            </ul>}
          </section>

          {/* Step 2 */}
          <section className="card">
            <h2 className="mb-4 flex items-center gap-3 text-xl font-bold"><span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-sm text-white">2</span>Your interview</h2>
            {resumes.length === 0 ? (
              <p className="rounded-xl bg-canvas p-4 text-sm text-ink/60">Upload a resume in step 1 to unlock this.</p>
            ) : (
              <>
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium" htmlFor="target-role">Target role
                    <input id="target-role" className="input mt-2" maxLength={120} value={cfg.target_role} onChange={(e) => setCfg({ ...cfg, target_role: e.target.value })} placeholder="e.g. Backend engineer" />
                  </label>
                  <label className="text-sm font-medium" htmlFor="topics">Topics <span className="font-normal text-ink/50">(optional, comma separated)</span>
                    <input id="topics" className="input mt-2" maxLength={800} value={cfg.topics} onChange={(e) => setCfg({ ...cfg, topics: e.target.value })} placeholder="e.g. Python, APIs, system design" />
                  </label>
                </div>
                {resumes.length > 1 && (
                  <select className="input mb-4" value={cfg.resume_id} onChange={(e) => setCfg({ ...cfg, resume_id: e.target.value })} aria-label="Resume to use">
                    {resumes.map((r) => <option key={r.id} value={r.id}>{r.filename}</option>)}
                  </select>
                )}
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Interview type">
                  {TYPES.map((t) => {
                    const on = cfg.interview_type === t.id;
                    return (
                      <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => setCfg({ ...cfg, interview_type: t.id })}
                        className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition ${on ? "border-brand bg-brand-light" : "border-ink/10 hover:border-ink/30"}`}>
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${on ? "bg-brand text-white" : "bg-ink/5 text-ink/70"}`}><Icon name={t.icon} className="h-5 w-5" /></span>
                        <span><span className="block font-semibold">{t.title}</span><span className="text-sm text-ink/60">{t.text}</span></span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5">
                  <label className="flex items-center justify-between text-sm font-medium" htmlFor="nq">Number of questions<span className="font-display text-lg font-bold text-brand">{cfg.num_questions}</span></label>
                  <input id="nq" type="range" min={3} max={15} value={cfg.num_questions} onChange={(e) => setCfg({ ...cfg, num_questions: e.target.value })} className="mt-2 w-full accent-[#D74691]" />
                </div>
                <div className="mt-4 max-w-xs">
                  <label className="text-sm font-medium" htmlFor="difficulty">Starting difficulty</label>
                  <select id="difficulty" className="input mt-2" value={cfg.difficulty} onChange={(e) => setCfg({ ...cfg, difficulty: e.target.value })}>
                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                  </select>
                </div>
                <button className="btn mt-5 w-full py-3 sm:w-auto" disabled={!cfg.resume_id || !cfg.target_role.trim() || busy === "start"} onClick={start}>
                  {busy === "start" ? <><Spinner /> Preparing your first question</> : <><Icon name="play" className="h-4 w-4" /> Start interview</>}
                </button>
              </>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section className="card">
            <h2 className="text-lg font-bold">Your progress</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[["Done", done.length], ["Average", avg ?? "–"], ["Best", best ?? "–"]].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-canvas py-3"><div className="font-display text-2xl font-bold tabular-nums">{v}</div><div className="text-xs text-ink/55">{l}</div></div>
              ))}
            </div>
            <div className="mt-4"><Sparkline values={scores} /></div>
          </section>

          <section className="card">
            <h2 className="mb-2 text-lg font-bold">History</h2>
            {loading ? <LoadingGesture compact label="Loading your interview history…" /> : <ul className="divide-y divide-ink/10 text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 py-2.5">
                  <span>
                    <span className="block font-medium capitalize">{h.interview_type}</span>
                    <span className="text-xs text-ink/55">{new Date(h.created_at).toLocaleDateString()} · {h.num_questions} questions</span>
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {h.status === "completed"
                      ? <Link className="rounded-full bg-mint/15 px-3 py-1 text-xs font-semibold text-mint hover:bg-mint/25" to={`/results/${h.id}`}>{Math.round(h.summary?.overall ?? 0)} / 100</Link>
                      : h.status === "cancelled"
                        ? <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink/55">Cancelled</span>
                        : <Link className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold hover:bg-gold/25" to={`/interview/${h.id}`}>Continue</Link>}
                    <DeleteConfirmAction type="button" className="btn-ghost shrink-0 !border-coral/20 !px-2.5 !py-1.5 text-coral hover:!bg-coral/10" onDelete={() => deleteInterview(h)} title="Delete this interview?" description="This permanently removes the interview and its saved questions, answers, and feedback." triggerProps={{ "aria-label": `Delete ${h.interview_type} interview history from ${new Date(h.created_at).toLocaleDateString()}`, title: "Delete interview history" }}><Icon name="trash" className="h-4 w-4" /></DeleteConfirmAction>
                  </div>
                </li>
              ))}
              {history.length === 0 && <li className="py-2 text-ink/55">Your finished interviews will show up here.</li>}
            </ul>}
          </section>

          <section className="card">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-brand">Your next steps</p><h2 className="mt-1 text-lg font-bold">Practice roadmap</h2></div>
              <span className="rounded-full bg-brand/15 px-2.5 py-1 text-xs font-semibold text-brand-dark">{plan.tasks.filter((task) => !task.completed).length} open</span>
            </div>
            {loading ? <LoadingGesture compact label="Building your personal roadmap…" /> : plan.tasks.length === 0 ? (
              <p className="mt-4 rounded-xl bg-canvas p-3 text-sm text-ink/55">No recommendations yet. Add a job description to a resume or complete an interview to create personalized next steps.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {plan.tasks.map((task) => (
                  <li key={task.id} className={`rounded-xl border p-3 transition ${task.completed ? "border-mint/25 bg-mint/[.06] opacity-70" : "border-brand/15 bg-white/65"}`}>
                    <button type="button" role="checkbox" aria-checked={task.completed} disabled={roadmapBusy === task.id} onClick={() => toggleTask(task)} className="flex w-full items-start gap-3 text-left">
                      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs ${task.completed ? "border-mint bg-mint text-white" : "border-brand/25 text-transparent"}`}>✓</span>
                      <span className="min-w-0"><span className={`block text-sm font-semibold ${task.completed ? "line-through" : ""}`}>{task.title}</span><span className="mt-1 block text-xs leading-relaxed text-ink/55">{task.reason}</span></span>
                    </button>
                    <ol className="ml-8 mt-2 list-decimal space-y-1 pl-4 text-xs text-ink/70">{task.actions.map((action) => <li key={action}>{action}</li>)}</ol>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
