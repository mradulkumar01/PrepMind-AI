import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import DeleteConfirmAction from "../components/DeleteConfirmAction.jsx";
import { Icon, LoadingGesture, Spinner } from "../components/ui.jsx";

const MAX_MB = 5;
const dateLabel = (date) => date ? new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Date unavailable";
const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "P";

export default function Profile({ user }) {
  const [data, setData] = useState({ resumes: [], interviews: [], prep: { notes: [], checklist: [] }, coding: null });
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    const results = await Promise.allSettled([api.resumes(), api.interviews(), api.prepSpace(), api.arenaProgress()]);
    const [resumes, interviews, prep, coding] = results;
    setData({
      resumes: resumes.status === "fulfilled" ? resumes.value : [],
      interviews: interviews.status === "fulfilled" ? interviews.value : [],
      prep: prep.status === "fulfilled" ? prep.value : { notes: [], checklist: [] },
      coding: coding.status === "fulfilled" ? coding.value : null,
    });
    const requiredFailures = [resumes, interviews, prep].filter((item) => item.status === "rejected");
    if (requiredFailures.length) setError(requiredFailures[0].reason?.message || "Some profile data could not be loaded.");
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const completed = useMemo(() => data.interviews.filter((item) => item.status === "completed"), [data.interviews]);
  const average = completed.length ? Math.round(completed.reduce((sum, item) => sum + (item.summary?.overall || 0), 0) / completed.length) : null;
  const codingStats = data.coding?.stats || {};
  const checklistDone = data.prep.checklist.filter((item) => item.completed).length;

  const selectResume = (file) => {
    setMessage(""); setError("");
    if (!file) return setSelectedFile(null);
    if (!/\.(pdf|docx)$/i.test(file.name)) { setError("Choose a PDF or DOCX resume."); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setError(`Choose a file smaller than ${MAX_MB} MB.`); return; }
    setSelectedFile(file);
  };

  const saveResume = async (event) => {
    event.preventDefault();
    if (!selectedFile) return;
    const formElement = event.currentTarget;
    setUploading(true); setError(""); setMessage("");
    try {
      const form = new FormData(); form.append("file", selectedFile);
      await api.uploadResume(form);
      setSelectedFile(null); formElement.reset();
      setMessage("Resume analyzed and saved to your profile.");
      await load();
    } catch (ex) { setError(ex.message); }
    finally { setUploading(false); }
  };

  const deleteResume = async (resumeId) => {
    try { await api.deleteResume(resumeId); setData((current) => ({ ...current, resumes: current.resumes.filter((resume) => resume.id !== resumeId) })); }
    catch (ex) { throw ex; }
  };

  return <div className="space-y-6">
    <section className="profile-hero home-hero-enter relative overflow-hidden rounded-3xl border border-brand/15 p-6 shadow-[0_22px_60px_-38px_rgba(119,35,78,.42)] sm:p-8">
      <span className="home-hero-glow home-hero-glow-one"/><span className="home-hero-glow home-hero-glow-two"/>
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="profile-avatar">{initials(user?.name)}</div>
        <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Your PrepMind profile</p><h1 className="mt-1 break-words font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{user?.name || "Your profile"}</h1><p className="mt-1 text-sm text-ink/60">{user?.email || "Personal interview and career preparation space"}</p><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/60">Your saved resume, interview practice, preparation notes, and progress report in one place.</p></div>
        <Link to="/" className="btn-ghost shrink-0">← Back to home</Link>
      </div>
    </section>

    {error && <p className="rounded-xl border border-coral/20 bg-coral/10 px-4 py-3 text-sm text-coral" role="alert">{error}</p>}
    {message && <p className="rounded-xl border border-mint/20 bg-mint/10 px-4 py-3 text-sm text-ink" role="status">{message}</p>}
    {loading ? <LoadingGesture label="Gathering your profile and progress…" /> : <>
      <section aria-labelledby="profile-progress-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Your progress report</p><h2 id="profile-progress-title" className="mt-1 text-xl font-bold">Practice at a glance</h2></div><Link to="/arena/progress" className="prep-text-button">Open coding analytics →</Link></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Interviews completed", completed.length, `${data.interviews.length} total sessions`, "✦"],
            ["Average interview score", average == null ? "—" : `${average}%`, average == null ? "Complete an interview to see a score" : "Across completed practice sessions", "↗"],
            ["Coding problems solved", codingStats.solved ?? "—", `${codingStats.submissions ?? 0} verified submissions`, "⌘"],
            ["Prep workspace", `${data.prep.notes.length} notes`, `${checklistDone} of ${data.prep.checklist.length} checklist items complete`, "✎"],
          ].map(([label, value, caption, icon]) => <article key={label} className="profile-stat card"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-ink/55">{label}</span><span className="profile-stat-icon" aria-hidden="true">{icon}</span></div><p className="mt-3 font-display text-3xl font-bold text-ink">{value}</p><p className="mt-1 text-xs text-ink/50">{caption}</p></article>)}
        </div>
        <article className="card mt-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">Coding progress</h3><p className="text-xs text-ink/55">Verified practice submissions and solved problems</p></div><Link className="prep-text-button" to="/arena">Open Coding Arena →</Link></div>
          {data.coding ? <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="profile-progress-row"><span>Easy</span><strong>{codingStats.solved_by_difficulty?.Easy ?? 0} solved</strong></div><div className="profile-progress-row"><span>Medium</span><strong>{codingStats.solved_by_difficulty?.Medium ?? 0} solved</strong></div><div className="profile-progress-row"><span>Hard</span><strong>{codingStats.solved_by_difficulty?.Hard ?? 0} solved</strong></div></div> : <p className="mt-3 text-sm text-ink/55">Coding analytics are unavailable right now.</p>}
        </article>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <section className="card" aria-labelledby="profile-resumes-title">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Saved career details</p><h2 id="profile-resumes-title" className="mt-1 text-xl font-bold">My resumes</h2><p className="mt-1 text-sm text-ink/55">Add a resume to use it for personalized mock interviews.</p></div><span className="profile-count">{data.resumes.length} saved</span></div>
          <form className="profile-upload mt-4" onSubmit={saveResume}><label className="profile-file-label" htmlFor="profile-resume-upload"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-xl text-brand" aria-hidden="true">＋</span><span className="min-w-0 flex-1"><strong className="block text-sm">{selectedFile ? selectedFile.name : "Choose your resume"}</strong><span className="mt-1 block text-xs text-ink/50">PDF or DOCX · up to {MAX_MB} MB</span></span><input id="profile-resume-upload" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => selectResume(event.target.files?.[0])}/></label><button type="submit" className="btn shrink-0" disabled={!selectedFile || uploading}>{uploading ? <><Spinner/>Saving…</> : "Save resume"}</button></form>
          <div className="mt-4 space-y-3">{data.resumes.map((resume) => <article key={resume.id} className="profile-resume-row"><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold">{resume.filename}</h3><p className="mt-1 text-xs text-ink/50">Added {dateLabel(resume.created_at)} · {resume.skills?.length || 0} skills identified</p>{resume.skills?.length > 0 && <p className="mt-2 line-clamp-2 text-xs text-ink/60">{resume.skills.slice(0, 8).join(" · ")}</p>}</div><DeleteConfirmAction className="btn-ghost shrink-0 !px-2 !py-1.5 text-coral" onDelete={() => deleteResume(resume.id)} title="Delete this saved resume?" description={`“${resume.filename}” and its stored resume data will be removed from your account.`} triggerProps={{ "aria-label": `Delete ${resume.filename}`, title: "Delete resume" }}><Icon name="trash" className="h-4 w-4"/></DeleteConfirmAction></article>)}{!data.resumes.length && <p className="rounded-xl bg-canvas p-4 text-sm text-ink/55">No resume saved yet. Choose a file above to add one.</p>}</div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink/45">PrepMind saves resume analysis and interview-ready text. The original uploaded file is not retained.</p>
        </section>

        <section className="card" aria-labelledby="profile-interviews-title">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Practice history</p><h2 id="profile-interviews-title" className="mt-1 text-xl font-bold">My interviews</h2></div><span className="profile-count">{data.interviews.length} sessions</span></div>
          <div className="mt-4 max-h-[27rem] space-y-2 overflow-y-auto pr-1">{data.interviews.map((interview) => <article key={interview.id} className="profile-interview-row"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold capitalize">{interview.interview_type || "Mock"} interview</h3><span className={`profile-status ${interview.status === "completed" ? "profile-status-done" : ""}`}>{interview.status?.replaceAll("_", " ")}</span></div><p className="mt-1 text-xs text-ink/50">{interview.target_role || "Practice session"} · {dateLabel(interview.created_at)}</p></div>{interview.status === "completed" ? <Link to={`/results/${interview.id}`} className="profile-score">{Math.round(interview.summary?.overall || 0)}%</Link> : <Link to={`/interview/${interview.id}`} className="prep-text-button">Continue →</Link>}</article>)}{!data.interviews.length && <p className="rounded-xl bg-canvas p-4 text-sm text-ink/55">Your interview sessions will appear here.</p>}</div>
        </section>
      </div>

      <section className="card" aria-labelledby="profile-notes-title">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Your personal workspace</p><h2 id="profile-notes-title" className="mt-1 text-xl font-bold">Notes and checklist</h2><p className="mt-1 text-sm text-ink/55">Your saved thoughts, voice transcripts, and preparation tasks.</p></div><Link to="/" className="prep-text-button">Open prep workspace →</Link></div>
        <div className="mt-4 grid gap-5 lg:grid-cols-2"><div><h3 className="mb-2 text-sm font-bold">Saved notes <span className="text-ink/45">({data.prep.notes.length})</span></h3><div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">{data.prep.notes.map((note) => <article className="profile-note" key={note.id}><div className="flex items-start justify-between gap-3"><h4 className="text-sm font-bold">{note.title || "Untitled note"}</h4><time className="shrink-0 text-[10px] text-ink/45">{dateLabel(note.updated_at)}</time></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/65">{note.body || "Empty note"}</p></article>)}{!data.prep.notes.length && <p className="rounded-xl bg-canvas p-4 text-sm text-ink/55">No notes saved yet.</p>}</div></div>
          <div><h3 className="mb-2 text-sm font-bold">Preparation checklist <span className="text-ink/45">({checklistDone}/{data.prep.checklist.length})</span></h3><ul className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">{data.prep.checklist.map((item) => <li key={item.id} className="profile-check-item"><span className={`profile-check-mark ${item.completed ? "profile-check-mark-done" : ""}`} aria-hidden="true">{item.completed ? "✓" : "·"}</span><span className={item.completed ? "text-ink/45 line-through" : "text-ink/75"}>{item.text}</span></li>)}</ul>{!data.prep.checklist.length && <p className="rounded-xl bg-canvas p-4 text-sm text-ink/55">Your preparation tasks will appear here.</p>}</div>
        </div>
      </section>
    </>}
  </div>;
}
