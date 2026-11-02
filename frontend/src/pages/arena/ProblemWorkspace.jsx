import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, getToken } from "../../api.js";
import { ArenaButton, ArenaCard, ArenaFrame, ArenaNotice, DifficultyPill, LoadingState } from "./ArenaUI.jsx";
import DeleteConfirmAction from "../../components/DeleteConfirmAction.jsx";

const initialLanguages = [
  { id: "python", label: "Python 3" }, { id: "javascript", label: "JavaScript" }, { id: "java", label: "Java" },
  { id: "cpp", label: "C++ 17" }, { id: "c", label: "C" }, { id: "sql", label: "SQLite" },
];

export default function ProblemWorkspace() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const contestId = searchParams.get("contest");
  const duelId = searchParams.get("duel");
  const [problem, setProblem] = useState(null);
  const [languages, setLanguages] = useState(initialLanguages);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState(null);
  const [history, setHistory] = useState([]);
  const [panel, setPanel] = useState("description");
  const [mode, setMode] = useState("practice");
  const [assistantQuestion, setAssistantQuestion] = useState("Give me a progressive hint.");
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const [assistantError, setAssistantError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [editorLight, setEditorLight] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [split, setSplit] = useState(50);
  const [showHints, setShowHints] = useState(false);
  const [approach, setApproach] = useState("");
  const [thinkAloudFocus, setThinkAloudFocus] = useState("time complexity");
  const [thinkAloudAnswer, setThinkAloudAnswer] = useState("");
  const [duelInfo, setDuelInfo] = useState(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [clockNow, setClockNow] = useState(Date.now());
  const editorRef = useRef(null);
  const userDraftKey = `prepmind_arena_${getToken()?.slice(-12) || "guest"}_${slug}_${language}`;
  const sample = problem?.examples?.[0];
  const duelRemaining = duelInfo?.ends_at ? Math.max(0, Date.parse(duelInfo.ends_at) - (clockNow + serverOffset)) : null;
  const lineNumbers = useMemo(() => Array.from({ length: Math.max(1, code.split("\n").length) }, (_, i) => i + 1), [code]);

  const load = () => {
    Promise.all([api.arenaProblem(slug), api.arenaSubmissions(slug)]).then(([p, s]) => {
      setProblem(p); setHistory(s.items); setError("");
      setStdin((old) => old || p.examples?.[0]?.input || "");
      setCode((old) => old || localStorage.getItem(userDraftKey) || p.starter_code?.[language] || "");
    }).catch((e) => setError(e.message));
  };
  useEffect(() => { load(); api.arenaLanguages().then(setLanguages).catch(() => {}); }, [slug]);
  useEffect(() => {
    if (!duelId) return undefined;
    let active = true;
    const refreshDuel = () => api.arenaDuel(duelId).then((info) => {
      if (active) { setDuelInfo(info); setServerOffset(Date.parse(info.server_time) - Date.now()); }
    }).catch(() => {});
    refreshDuel();
    const interval = setInterval(refreshDuel, 12000);
    return () => { active = false; clearInterval(interval); };
  }, [duelId]);
  useEffect(() => {
    const interval = setInterval(() => setClockNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!problem) return;
    const saved = localStorage.getItem(userDraftKey);
    setCode(saved ?? problem.starter_code?.[language] ?? "");
  }, [language, problem?.slug]);
  useEffect(() => {
    if (!problem) return;
    const timer = setTimeout(() => localStorage.setItem(userDraftKey, code), 400);
    return () => clearTimeout(timer);
  }, [code, userDraftKey, problem?.slug]);

  const runCode = async () => {
    if (!code.trim()) return;
    setBusy("run"); setError(""); setOutput(null); setPanel("results");
    try { setOutput({ kind: "run", ...(await api.arenaRun(slug, { code, language, stdin })) }); }
    catch (e) { setError(e.message); }
    finally { setBusy(""); }
  };
  const submitCode = async () => {
    if (!code.trim()) return;
    setBusy("submit"); setError(""); setOutput(null); setPanel("results");
    try {
      const result = await api.arenaSubmit(slug, { code, language, contest_id: contestId || undefined, duel_id: duelId || undefined });
      setOutput({ kind: "submit", ...result });
      setHistory((items) => [result, ...items]);
    } catch (e) { setError(e.message); }
    finally { setBusy(""); }
  };
  const requestHelp = async (question = assistantQuestion, assistantMode = mode) => {
    setAssistantError(""); setAssistantAnswer(""); setBusy("assistant");
    try {
      const res = await api.arenaAssistant({ problem_slug: slug, question, code, mode: assistantMode, contest_id: contestId || undefined, duel_id: duelId || undefined });
      setAssistantAnswer(res.answer);
      return res.answer;
    } catch (e) { setAssistantError(e.message); }
    finally { setBusy(""); }
  };
  const askThinkAloud = async () => {
    if (!approach.trim()) return;
    setThinkAloudAnswer("");
    const followup = await requestHelp(`The candidate is explaining their current solution approach: <approach>${approach.slice(0, 2500)}</approach>. Ask one concise interviewer follow-up focused on ${thinkAloudFocus}. Do not provide the answer or a complete solution.`, "interview");
    setThinkAloudAnswer(followup || "");
  };
  const changeLanguage = (next) => setLanguage(next);
  const resetCode = () => {
    if (!window.confirm("Reset this draft to the starter code?")) return;
    setCode(problem?.starter_code?.[language] || "");
  };
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); } catch { setError("Clipboard permission was unavailable. Select and copy the code instead."); }
  };
  const onEditorKeyDown = (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const el = event.currentTarget; const start = el.selectionStart; const end = el.selectionEnd;
      setCode((value) => `${value.slice(0, start)}    ${value.slice(end)}`);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 4; });
    } else if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault(); runCode();
    }
  };

  if (error && !problem) return <ArenaFrame><ArenaNotice>{error}<Link className="ml-3 underline" to="/arena/problems">Back to problems</Link></ArenaNotice></ArenaFrame>;
  if (!problem) return <ArenaFrame><LoadingState label="Opening problem workspace…" /></ArenaFrame>;

  return <ArenaFrame eyebrow={duelId ? "FRIEND DUEL · SERVER TIMED" : contestId ? "CONTEST WORKSPACE · SERVER-TIMED" : "CODING WORKSPACE"} title={problem.title} description="Think through an approach, write code, run tests, and review complexity and edge cases in the configured sandbox." actions={<div className="flex items-center gap-2"><DifficultyPill value={problem.difficulty} /><span className="text-xs text-slate-500">{problem.acceptance_rate == null ? "Acceptance —" : `${problem.acceptance_rate}% acceptance`}</span></div>}>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400"><Link to={duelId ? `/arena/friends/${duelId}` : contestId ? "/arena/hackathons" : "/arena/problems"} className="hover:text-white">← {duelId ? "Friend duel" : contestId ? "Contest" : "Problem library"}</Link><span className="flex items-center gap-3">{duelId && duelInfo?.status === "live" && duelRemaining != null && <b className="rounded-full border border-rose-300/15 bg-rose-300/[.06] px-3 py-1.5 font-mono text-rose-100">{String(Math.floor(duelRemaining / 60000)).padStart(2, "0")}:{String(Math.floor((duelRemaining % 60000) / 1000)).padStart(2, "0")} remaining</b>}<span>Draft autosaves in this browser · Ctrl/⌘ + Enter runs code</span></span></div>
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] p-2.5">
      <span className="mr-1 text-xs font-semibold text-slate-400">Resize split</span><input aria-label="Problem and editor split" type="range" min="35" max="65" value={split} onChange={(e) => setSplit(Number(e.target.value))} className="w-44 accent-violet-400" />
      <span className="ml-auto hidden text-xs text-slate-500 sm:block">{problem.prerequisites?.length ? `Prerequisites: ${problem.prerequisites.join(" · ")}` : "No prerequisite list"}</span>
    </div>
    <div className="grid gap-4 lg:items-start" style={{ gridTemplateColumns: `minmax(0, ${split}fr) minmax(0, ${100 - split}fr)` }}>
      <div className="min-w-0 space-y-3">
        <ArenaCard className="max-h-[calc(100vh-260px)] overflow-auto">
          <div className="flex flex-wrap gap-2 border-b border-white/[.07] pb-3">{["description", "hints", "submissions"].map((key) => <button key={key} onClick={() => setPanel(key)} className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${panel === key ? "bg-violet-300/15 text-violet-100" : "text-slate-500 hover:bg-white/5 hover:text-white"}`}>{key}</button>)}</div>
          {panel === "description" && <div className="pt-4"><div className="flex flex-wrap gap-2">{problem.topics.map((topic) => <span key={topic} className="rounded-full border border-cyan-200/10 bg-cyan-200/[.05] px-2.5 py-1 text-[10px] text-cyan-100">{topic}</span>)}</div><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300">{problem.statement}</p>
            <h3 className="mt-6 text-sm font-bold text-white">Examples</h3><div className="mt-3 space-y-3">{problem.examples.map((ex, i) => <div key={i} className="rounded-xl border border-white/[.07] bg-black/20 p-3"><p className="text-xs font-bold text-slate-400">Example {i + 1}</p><pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-cyan-100"><span className="text-slate-500">Input: </span>{ex.input}{"\n"}<span className="text-slate-500">Output: </span>{ex.output}</pre>{ex.explanation && <p className="mt-2 text-xs leading-relaxed text-slate-500">{ex.explanation}</p>}</div>)}</div>
            <h3 className="mt-6 text-sm font-bold text-white">Constraints</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-400">{problem.constraints.map((item, i) => <li key={i}>{item}</li>)}</ul>
            <details className="mt-5 rounded-xl border border-white/[.06] bg-white/[.02] p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-300">Company tags</summary><p className="mt-2 text-xs text-slate-500">Company-specific tags are not configured for this library.</p></details>
          </div>}
          {panel === "hints" && <div className="space-y-3 pt-4"><p className="text-xs text-slate-500">Hints are progressively revealed. Ask the assistant for coaching using the selected mode.</p>{problem.hints?.map((hint, i) => <details key={i} className="group rounded-xl border border-white/[.07] bg-black/15 p-3"><summary className="cursor-pointer text-sm font-medium text-slate-300">Hint {i + 1}</summary><p className="mt-3 text-sm leading-relaxed text-slate-400">{hint}</p></details>)}<button type="button" className="text-xs text-violet-200 underline" onClick={() => requestHelp("Give me one progressive hint.")}>Ask PrepMind AI for a hint</button></div>}
          {panel === "submissions" && <div className="space-y-2 pt-4">{history.length ? history.map((s, i) => <div key={s.id || i} className="flex items-center justify-between gap-3 rounded-lg bg-white/[.025] p-3 text-xs"><span className="text-slate-400">{s.language} · {s.created_at ? new Date(s.created_at).toLocaleString() : "just now"}</span><span className="flex items-center gap-3"><span className={s.status === "Accepted" ? "font-bold text-emerald-300" : "font-bold text-rose-300"}>{s.status}</span>{s.id && <DeleteConfirmAction className="rounded-md p-1 text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-200" title="Remove this submission from history?" description="It will disappear from your personal submission history. Verified contest scores and coding progress are preserved." confirmLabel="Remove from history" triggerProps={{ "aria-label": `Remove ${s.status} ${s.language} submission from history`, title: "Remove from history" }} onDelete={async () => { await api.deleteArenaSubmission(s.id); setHistory((items) => items.filter((item) => item.id !== s.id)); }}><span aria-hidden="true">×</span></DeleteConfirmAction>}</span></div>) : <p className="py-8 text-center text-sm text-slate-500">No submissions for this problem yet.</p>}</div>}
        </ArenaCard>
        <ArenaCard>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Think-aloud coding</p><h3 className="mt-1 text-sm font-bold">Explain the approach you are writing</h3></div><span className="rounded-full bg-violet-300/10 px-2.5 py-1 text-[10px] text-violet-100">Interview practice</span></div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">Before submitting, describe your plan. The AI interviewer asks one follow-up about complexity, edge cases, optimization, or an alternative solution.</p>
          <textarea className="arena-input mt-3 min-h-24 resize-y text-sm" maxLength={2500} value={approach} onChange={(e) => setApproach(e.target.value)} placeholder="Example: I will scan once and store values in a hash map. That should be O(n) time and O(n) space…" />
          <div className="mt-2 flex flex-wrap gap-2">{["time complexity", "edge cases", "optimization", "an alternative solution"].map((focus) => <button key={focus} type="button" onClick={() => setThinkAloudFocus(focus)} className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${thinkAloudFocus === focus ? "bg-violet-300/15 text-violet-100" : "bg-white/[.04] text-slate-500 hover:text-slate-200"}`}>{focus}</button>)}</div>
          <button className="arena-button arena-button-subtle mt-3" disabled={!approach.trim() || busy === "assistant" || Boolean(contestId) || Boolean(duelId)} onClick={askThinkAloud}>{busy === "assistant" ? "Interviewer is thinking…" : "Explain & get a follow-up"}</button>
          {(contestId || duelId) && <p className="mt-2 text-[10px] text-amber-200/75">AI coaching is disabled during live contests and friend duels to keep the competition fair.</p>}
          {thinkAloudAnswer && <div className="mt-3 rounded-xl border border-violet-300/15 bg-violet-300/[.05] p-3 text-sm leading-relaxed text-violet-50"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-violet-200">Interviewer follow-up</span>{thinkAloudAnswer}</div>}
          {assistantError && <p role="alert" className="mt-2 text-xs text-rose-200">{assistantError}</p>}
        </ArenaCard>
        <ArenaCard>
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-300">PrepMind assistant</p><h3 className="mt-1 text-sm font-bold">Coach, don’t copy</h3></div><select aria-label="Assistant mode" className="arena-input w-auto" value={mode} onChange={(e) => setMode(e.target.value)}><option value="learn">Learn mode</option><option value="practice">Practice mode</option><option value="interview">Interview mode</option><option value="contest">Contest mode</option></select></div>
          <div className="mt-3 flex gap-2"><input className="arena-input" maxLength={3000} value={assistantQuestion} onChange={(e) => setAssistantQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") requestHelp(); }} placeholder="Ask about a pattern, edge case, or complexity" /><button className="arena-button arena-button-subtle shrink-0" disabled={busy === "assistant" || !assistantQuestion.trim()} onClick={() => requestHelp()}>{busy === "assistant" ? "Thinking…" : "Ask"}</button></div>
          {assistantError && <p role="alert" className="mt-3 text-xs text-rose-200">{assistantError}</p>}{assistantAnswer && <div className="mt-3 whitespace-pre-wrap rounded-xl border border-cyan-300/10 bg-cyan-300/[.04] p-3 text-sm leading-relaxed text-cyan-50">{assistantAnswer}</div>}
          {contestId && <p className="mt-3 text-[11px] text-amber-200/75">Contest rules are checked by the backend. AI assistance may be disabled for this event.</p>}
        </ArenaCard>
      </div>

      <div className="min-w-0 space-y-3">
        <ArenaCard className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] p-3">
            <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-300">Language</span><select className="arena-input w-auto min-w-36" value={language} onChange={(e) => changeLanguage(e.target.value)}>{languages.map((lang) => <option key={lang.id} value={lang.id}>{lang.label}</option>)}</select></div>
            <div className="flex flex-wrap items-center gap-1"><button className="arena-button arena-button-quiet !px-2.5 !py-2 text-xs" onClick={() => setFontSize((v) => Math.max(11, v - 1))}>A−</button><span className="w-7 text-center text-[10px] text-slate-500">{fontSize}</span><button className="arena-button arena-button-quiet !px-2.5 !py-2 text-xs" onClick={() => setFontSize((v) => Math.min(20, v + 1))}>A+</button><button className="arena-button arena-button-quiet !px-2.5 !py-2 text-xs" onClick={() => setEditorLight((v) => !v)}>{editorLight ? "Dark" : "Light"}</button><button className="arena-button arena-button-quiet !px-2.5 !py-2 text-xs" onClick={copyCode}>Copy</button><button className="arena-button arena-button-quiet !px-2.5 !py-2 text-xs" onClick={resetCode}>Reset</button></div>
          </div>
          <div className={`flex overflow-hidden ${editorLight ? "bg-[#f6f7fb]" : "bg-[#0b0f1b]"}`}>
            <pre aria-hidden="true" className={`arena-editor w-12 shrink-0 overflow-hidden py-4 pr-3 text-right text-xs leading-6 ${editorLight ? "text-slate-400" : "text-slate-600"}`} style={{ fontSize }}>
              {lineNumbers.map((line) => <span className="block" key={line}>{line}</span>)}
            </pre>
            <textarea ref={editorRef} aria-label="Source code editor" spellCheck="false" autoCapitalize="off" autoCorrect="off" className={`arena-editor min-w-0 flex-1 border-0 border-l border-white/5 bg-transparent p-4 font-mono leading-6 outline-none focus:ring-0 ${editorLight ? "arena-editor-light" : "text-slate-100"}`} style={{ fontSize }} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={onEditorKeyDown} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[.07] p-3"><span className="text-[10px] text-slate-500">Tab indents · Ctrl/⌘+Enter runs · local autosave</span><div className="flex gap-2"><ArenaButton variant="subtle" disabled={Boolean(busy)} onClick={runCode}>{busy === "run" ? "Running…" : "▶ Run sample"}</ArenaButton><ArenaButton disabled={Boolean(busy)} onClick={submitCode}>{busy === "submit" ? "Judging…" : contestId ? "Submit to contest" : "Submit solution"}</ArenaButton></div></div>
        </ArenaCard>
        <ArenaCard><div className="flex items-center justify-between"><label className="text-xs font-bold text-white" htmlFor="custom-stdin">Custom input</label><button className="text-[10px] text-cyan-200 hover:underline" onClick={() => setStdin(sample?.input || "")}>Load sample</button></div><textarea id="custom-stdin" className="arena-input mt-2 min-h-20 resize-y font-mono text-xs leading-relaxed" value={stdin} onChange={(e) => setStdin(e.target.value)} placeholder="Paste stdin for a custom run" /></ArenaCard>
        {(error || output || busy === "run" || busy === "submit") && <ArenaCard>
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Execution results</p><h3 className={`mt-1 text-lg font-bold ${output?.verdict === "Accepted" ? "text-emerald-300" : output ? "text-rose-200" : "text-white"}`}>{busy === "run" ? "Running in sandbox…" : busy === "submit" ? "Judging hidden tests…" : output?.kind === "run" ? `${output.verdict}${output.sample_run ? " · sample/custom run" : " · custom run"}` : output?.verdict || "Ready"}</h3></div>{output?.kind === "submit" && <span className="rounded-full bg-white/[.05] px-3 py-1.5 text-xs text-slate-300">{output.passed_tests}/{output.total_tests} passed</span>}</div>
          {error && <ArenaNotice>{error}</ArenaNotice>}
          {output?.kind === "run" && <div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-black/20 p-3"><p className="mb-2 text-[10px] font-bold uppercase text-slate-500">Standard output</p><pre className="min-h-10 whitespace-pre-wrap break-words font-mono text-xs text-cyan-100">{output.stdout || "(empty)"}</pre></div><div className="rounded-xl bg-black/20 p-3"><p className="mb-2 text-[10px] font-bold uppercase text-slate-500">Compiler / runtime output</p><pre className="min-h-10 whitespace-pre-wrap break-words font-mono text-xs text-rose-100">{output.compile_output || output.stderr || "(none)"}</pre></div><p className="text-[10px] text-slate-500">A sample run only checks the supplied input; it does not count as an accepted submission.</p></div>}
          {output?.kind === "submit" && <><p className="mt-3 text-xs text-slate-400">{output.execution_time}s total execution · {output.memory_kb || "—"} KB peak memory · {new Date(output.created_at).toLocaleString()}</p>{output.xp_awarded && <p className="mt-2 inline-flex rounded-full border border-amber-200/15 bg-amber-200/[.06] px-3 py-1.5 text-xs font-bold text-amber-100">+{output.xp_points} XP · first accepted solve</p>}{output.duel_points_awarded && <p className="ml-2 mt-2 inline-flex rounded-full border border-violet-200/15 bg-violet-200/[.06] px-3 py-1.5 text-xs font-bold text-violet-100">+{output.duel_points} duel points</p>}{output.failures?.map((f, i) => <div key={i} className="mt-3 rounded-xl border border-rose-300/10 bg-rose-300/[.04] p-3"><p className="text-xs font-bold text-rose-200">Test {f.case} {f.hidden ? "· hidden case" : "· visible case"}</p>{!f.hidden && <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">Input: {f.input}{"\n"}Expected: {f.expected}{"\n"}Actual: {f.actual || "(empty)"}{(f.compile_output || f.stderr) ? `\n${f.compile_output || f.stderr}` : ""}</pre>}</div>)}</>}
        </ArenaCard>}
      </div>
    </div>
  </ArenaFrame>;
}
