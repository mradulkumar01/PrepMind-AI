import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Bar, Icon, ScoreRing, Spinner, Typewriter } from "../components/ui.jsx";

const LEVELS = ["easy", "medium", "hard"];
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function Interview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [text, setText] = useState("");
  const [last, setLast] = useState(null); // evaluation of the answer just submitted
  const [answeredLevel, setAnsweredLevel] = useState("medium");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [answerMode, setAnswerMode] = useState("text");
  const [voiceInterviewer, setVoiceInterviewer] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [secs, setSecs] = useState(0);
  const boxRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const cameraRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const recognitionRef = useRef(null);

  const load = () => api.interview(id).then(setData).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);
  useEffect(() => { api.speechStatus().then((s) => setSpeechAvailable(s.available)).catch(() => setSpeechAvailable(false)); }, []);
  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.ondataavailable = null;
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    window.speechSynthesis?.cancel();
    recognitionRef.current?.abort();
  }, []);

  const current = data?.questions.find((q) => !q.answer);
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const speakQuestion = (question = current) => {
    if (!question || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.text);
    utterance.lang = "en-US";
    utterance.rate = 0.96;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (voiceInterviewer && current && !last) speakQuestion(current);
    return () => window.speechSynthesis?.cancel();
  }, [current?.id, voiceInterviewer, !!last]);

  useEffect(() => {
    if (cameraRef.current) cameraRef.current.srcObject = cameraStreamRef.current;
  }, [cameraOn]);

  const toggleCamera = async () => {
    setCameraError("");
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setCameraOn(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access requires a secure browser context (HTTPS or localhost).");
      return;
    }
    try {
      cameraStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setCameraOn(true);
    } catch (e) {
      setCameraError(e.name === "NotAllowedError" ? "Camera permission was denied. You can continue with the camera off." : "Could not start the camera. Check that another app is not using it.");
    }
  };

  // elapsed time per question (practice pacing only)
  useEffect(() => {
    setSecs(0);
    if (!current || last) return undefined;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [current?.id, !!last]);

  if (err && !data) return <p role="alert" className="rounded-xl bg-coral/10 p-4 text-coral">{err}</p>;
  if (!data) return <div className="grid place-items-center py-24 text-ink/50"><Spinner className="h-6 w-6" /></div>;

  const { interview, questions } = data;
  const answered = questions.filter((q) => q.answer).length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  if (interview.status === "cancelled") return <section className="card mx-auto max-w-xl space-y-3 text-center"><h1 className="text-2xl font-bold">Interview cancelled</h1><p className="text-sm text-ink/60">This session was cancelled. Any submitted answers remain in your history.</p><Link className="btn" to="/">Back to dashboard</Link></section>;

  const startRecording = async () => {
    setErr("");
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    if (!speechAvailable && SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
          const spoken = Array.from(event.results).slice(event.resultIndex).map((result) => result[0]?.transcript || "").join(" ").trim();
          if (spoken) {
            setText((value) => `${value}${value.trim() ? " " : ""}${spoken}`.slice(0, 4000));
            setAnswerMode("transcript");
          }
        };
        recognition.onerror = (event) => setErr(event.error === "not-allowed" ? "Microphone permission was denied. You can still type your answer." : "Voice recognition stopped. Try again or type your answer.");
        recognition.onend = () => { setRecording(false); recognitionRef.current = null; };
        recognitionRef.current = recognition;
        recognition.start();
        setRecording(true);
      } catch { setErr("Could not start voice recognition. You can still type your answer."); }
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setErr("This browser does not support audio recording. You can still type your answer.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (!blob.size) { setErr("No audio was captured. Check microphone permission and try again."); return; }
        if (blob.size > 15 * 1024 * 1024) { setErr("Recording exceeds the 15 MB limit. Record a shorter answer."); return; }
        const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
        const form = new FormData();
        form.append("file", blob, `answer.${ext}`);
        setTranscribing(true);
        try {
          const result = await api.transcribeAudio(form);
          setText((value) => `${value}${value.trim() ? "\n\n" : ""}${result.text}`);
          setAnswerMode("transcript");
        } catch (e) { setErr(`${e.message} You can type your answer instead.`); }
        finally { setTranscribing(false); }
      };
      recorder.start();
      setRecording(true);
    } catch (e) {
      setErr(e.name === "NotAllowedError" ? "Microphone permission was denied. You can still type your answer." : "Could not access the microphone. You can still type your answer.");
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setRecording(false);
      return;
    }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  };

  const closeRoomDevices = (discardRecording = false) => {
    if (recorderRef.current?.state === "recording") {
      if (discardRecording) {
        recorderRef.current.ondataavailable = null;
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        chunksRef.current = [];
      } else stopRecording();
    }
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
    setCameraOn(false);
    setRecording(false);
    setSpeaking(false);
  };

  const finishInterview = async () => {
    const hasDraft = Boolean(text.trim() && current && !last);
    if (!window.confirm(`Submit this interview now?${hasDraft ? " Your current answer will be saved and scored." : " Your saved answers will be included in a partial-results report."}`)) return;
    setEnding(true); setErr("");
    try {
      const body = hasDraft ? { answer: { question_id: current.id, answer_text: text.trim(), answer_mode: answerMode } } : {};
      await api.finishInterview(id, body);
      closeRoomDevices(true);
      navigate(`/results/${id}`);
    } catch (e) { setErr(e.message); } finally { setEnding(false); }
  };

  const cancelInterview = async () => {
    if (!window.confirm("Cancel and leave this interview? Saved answers will stay in history, but your unsent draft will be discarded.")) return;
    setCanceling(true); setErr("");
    try {
      closeRoomDevices(true);
      await api.cancelInterview(id);
      navigate("/");
    } catch (e) { setErr(e.message); setCanceling(false); }
  };

  const submit = async () => {
    if (!current || busy || !text.trim()) return;
    setBusy(true); setErr("");
    try {
      setAnsweredLevel(current.difficulty);
      const res = await api.answer(id, { question_id: current.id, answer_text: text, answer_mode: answerMode });
      setLast(res); setText(""); setAnswerMode("text"); await load();
      boxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const conferenceRoom = (
    <section className="conference-room overflow-hidden rounded-[28px] border border-brand/35 text-white shadow-[0_28px_70px_-38px_rgba(99,22,61,.7)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-sm font-extrabold tracking-tight text-pink-100">PM</span>
          <span><span className="block text-sm font-bold">PrepMind Interview Room</span><span className="text-xs text-white/55">Virtual practice session</span></span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/25 bg-rose-400/10 px-3 py-1.5 font-semibold text-rose-100"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-300" /> LIVE SESSION</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-white/75">{answered}/{interview.num_questions} answered</span>
        </div>
      </div>
      <div className="grid gap-3 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="ai-video-feed relative flex min-h-[300px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 p-6 text-center sm:min-h-[370px]">
          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5 text-xs text-white/80"><span className={`h-2 w-2 rounded-full ${speaking ? "animate-pulse bg-rose-300" : "bg-emerald-300"}`} />{speaking ? "AI interviewer speaking" : "AI interviewer"}</div>
          <span className="absolute right-4 top-4 rounded-full bg-black/25 px-3 py-1.5 text-xs text-white/70">{current?.difficulty ?? interview.current_difficulty} level</span>
          <div className={`ai-orb relative mb-5 grid h-28 w-28 place-items-center rounded-full border border-white/35 text-3xl font-black text-white shadow-[0_0_60px_rgba(240,102,172,.4)] sm:h-36 sm:w-36 ${speaking ? "call-control-active" : ""}`}><span className="absolute inset-[-14px] rounded-full border border-rose-100/20" /><span className="absolute inset-[-27px] rounded-full border border-rose-100/10" />AI</div>
          <p className="text-xs font-bold uppercase tracking-[.25em] text-rose-100/65">AI Interviewer · {current?.kind ?? "Session review"}</p>
          <div className="mt-3 max-w-2xl rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-base leading-relaxed text-white/95 backdrop-blur sm:text-lg">
            {last ? (last.completed ? "That completes your interview. Your results are ready." : "Answer reviewed. Continue when you’re ready for the next question.") : current ? <Typewriter key={current.id} text={current.text} /> : "Preparing your interview room…"}
          </div>
          {current && !last && <p className="mt-3 text-xs text-white/45">Question {answered + 1} of {interview.num_questions}{current.topic ? ` · ${current.topic}` : ""}{current.is_followup ? " · adaptive follow-up" : ""}</p>}
        </div>
        <div className="relative min-h-[230px] overflow-hidden rounded-2xl border border-white/15 bg-[#321526] lg:min-h-full">
          {cameraOn
            ? <video ref={cameraRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover" aria-label="Your live local camera preview" />
            : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_center,rgba(226,100,167,.32),transparent_65%)] px-5 text-center text-white/80"><div><div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-white/10"><Icon name="users" className="h-7 w-7" /></div><p className="text-sm font-semibold">Your camera is off</p><p className="mt-1 text-xs text-white/55">Turn it on to join on video</p></div></div>}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
            <span className="rounded-full bg-black/55 px-2.5 py-1.5 text-xs text-white">You {cameraOn ? "· Camera on" : "· Audio / text"}</span>
            <button type="button" className="rounded-xl border border-white/25 bg-black/45 px-3 py-2 text-xs font-bold text-white transition hover:scale-105 hover:bg-black/65" onClick={toggleCamera}>{cameraOn ? "Camera off" : "Camera on"}</button>
          </div>
        </div>
      </div>
      {interview.status === "in_progress" ? <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-black/15 px-3 py-4 sm:gap-3 sm:px-5">
        <button type="button" className={`call-control ${voiceInterviewer ? "call-control-active" : ""}`} onClick={() => { const next = !voiceInterviewer; setVoiceInterviewer(next); if (next && current && !last) speakQuestion(current); else { window.speechSynthesis?.cancel(); setSpeaking(false); } }} aria-pressed={voiceInterviewer}>
          <span className="text-xl" aria-hidden="true">{voiceInterviewer ? "🔊" : "🔈"}</span><span>{voiceInterviewer ? "Voice on" : "Hear AI"}</span>
        </button>
        <button type="button" className={`call-control ${recording ? "call-control-primary call-control-active" : ""}`} disabled={ending || canceling || transcribing || (!speechAvailable && !SpeechRecognition)} onClick={recording ? stopRecording : startRecording}>
          <span className="text-xl" aria-hidden="true">{recording ? "⏹" : "🎙"}</span><span>{recording ? "Stop answer" : "Answer by voice"}</span>
        </button>
        <button type="button" className={`call-control ${cameraOn ? "call-control-active" : ""}`} onClick={toggleCamera}>
          <span className="text-xl" aria-hidden="true">{cameraOn ? "📹" : "📷"}</span><span>{cameraOn ? "Camera on" : "Camera off"}</span>
        </button>
        <button type="button" className="call-control call-control-danger" disabled={ending || canceling} onClick={cancelInterview}>
          <span className="text-xl" aria-hidden="true">{canceling ? "…" : "☎"}</span><span>{canceling ? "Leaving…" : "Cancel"}</span>
        </button>
        <button type="button" className="call-control call-control-primary" disabled={ending || canceling || busy || transcribing || recording} onClick={finishInterview}>
          <span className="text-xl" aria-hidden="true">{ending ? "…" : "✓"}</span><span>{ending ? "Submitting…" : "End & submit"}</span>
        </button>
      </div> : <div className="flex items-center justify-center border-t border-white/10 bg-black/15 px-4 py-4"><button type="button" className="call-control call-control-primary" onClick={() => navigate(`/results/${id}`)}>View interview results</button></div>}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-4 text-[11px] text-white/45 sm:px-7">
        <span>Camera preview stays on this device · no video is recorded</span>
        {cameraError && <span role="status" className="text-rose-200">{cameraError}</span>}
      </div>
    </section>
  );

  if (last) {
    const ev = last.evaluation;
    const from = LEVELS.indexOf(answeredLevel);
    const to = LEVELS.indexOf(last.difficulty_next);
    const trend = to > from ? ["up", "Next questions get harder."] : to < from ? ["down", "Next questions get a little easier."] : ["right", "Difficulty stays the same."];
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        {conferenceRoom}
        <section ref={boxRef} className="card space-y-5">
          <div className="flex flex-wrap items-center gap-6">
            <ScoreRing value={ev.overall} caption="this answer" />
            <div className="min-w-[200px] flex-1">
              {Object.entries(ev.scores).map(([k, v]) => <Bar key={k} label={k} value={v} />)}
            </div>
          </div>
          <p className="text-[15px] leading-relaxed">{ev.feedback}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {ev.strengths.length > 0 && <div className="rounded-xl border border-mint/20 bg-mint/10 p-4"><h3 className="mb-1 font-semibold text-mint">What worked</h3><ul className="list-disc space-y-1 pl-5 text-sm">{ev.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
            {ev.improvements.length > 0 && <div className="rounded-xl border border-gold/20 bg-gold/10 p-4"><h3 className="mb-1 font-semibold text-gold">To improve</h3><ul className="list-disc space-y-1 pl-5 text-sm">{ev.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
          </div>
          {ev.sample_answer && <div className="rounded-xl border border-brand/20 bg-brand/5 p-4"><h3 className="mb-1 font-semibold text-brand-dark">A stronger answer structure</h3><p className="text-sm leading-relaxed">{ev.sample_answer}</p></div>}
          <div className="rounded-xl bg-canvas p-4"><h3 className="mb-1 font-semibold">A strong answer would cover</h3><ul className="list-disc space-y-1 pl-5 text-sm">{ev.expected_points.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
          {!last.completed && <p className="flex items-center gap-2 text-sm font-medium text-ink/75"><Icon name={trend[0]} className="h-4 w-4 text-brand" />{trend[1]}</p>}
          <p className="text-xs text-ink/50">Evaluated by: {ev.evaluator}{ev.evaluator === "mock-heuristic" ? ". Demo mode: this is a keyword and length heuristic, not an AI judgement." : ""}</p>
          {last.completed
            ? <button className="btn" onClick={() => navigate(`/results/${id}`)}>See your results <Icon name="right" className="h-4 w-4" /></button>
            : <button className="btn" onClick={() => setLast(null)}>Next question <Icon name="right" className="h-4 w-4" /></button>}
        </section>
      </div>
    );
  }

  if (!current) {
    if (interview.status === "in_progress") return (
      <section className="card mx-auto max-w-2xl space-y-4 text-center">
        <h1 className="text-2xl font-bold">Your answer is saved</h1>
        <p className="text-sm text-ink/60">The next question is being recovered. You can retry without submitting your answer again.</p>
        {err && <p role="alert" className="rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{err}</p>}
        <button className="btn" onClick={() => { setErr(""); load(); }}>Retry next question</button>
      </section>
    );
    return <p className="card">This interview is complete. <Link className="font-semibold text-brand underline" to={`/results/${id}`}>See your results</Link></p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {conferenceRoom}
      <section className="card">
        {(speechAvailable || SpeechRecognition) && <p className="mb-4 rounded-xl border border-brand/20 bg-brand/5 p-3 text-xs text-ink/60">{speechAvailable ? "Your spoken answer will be sent to the configured transcription provider, then discarded. Review its transcript before submitting." : "Browser voice input turns speech into editable text. Review the transcript before submitting."}</p>}
        {!speechAvailable && !SpeechRecognition && <p className="mb-3 text-xs text-ink/45">Voice input is unavailable in this browser and no transcription provider is configured. You can answer by typing.</p>}
        <label htmlFor="answer" className="sr-only">Your answer</label>
        <textarea
          id="answer" className="input min-h-[220px] resize-y text-[15px] leading-relaxed" maxLength={4000} value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit(); }}
          placeholder="Answer as you would in the room. Give an example, explain your reasoning, and say what the result was."
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-ink/55">
            <span className="flex items-center gap-1.5 tabular-nums"><Icon name="clock" className="h-4 w-4" />{mmss(secs)}</span>
            <span>{words} words</span>
            <span>{text.length}/4000</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink/45 sm:inline">Ctrl + Enter to submit</span>
            <button className="btn" disabled={busy || !text.trim()} onClick={submit}>{busy ? <><Spinner /> Evaluating</> : "Submit answer"}</button>
          </div>
        </div>
        {answerMode === "transcript" && <p className="mt-2 text-xs text-brand">Transcript ready. Review and edit it before submitting.</p>}
        {err && <p role="alert" className="mt-3 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{err}</p>}
      </section>
    </div>
  );
}
