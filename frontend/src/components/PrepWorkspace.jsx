import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { Icon, Spinner } from "./ui.jsx";
import DeleteConfirmAction from "./DeleteConfirmAction.jsx";

const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function PrepWorkspace() {
  const [checklist, setChecklist] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [activeNoteId, setActiveNoteId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("loading");
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [micMessage, setMicMessage] = useState("");
  const recorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const saveQueueRef = useRef(Promise.resolve());
  const activeNote = useMemo(() => notes.find((note) => note.id === activeNoteId) || null, [notes, activeNoteId]);

  const reloadSpace = async () => {
    setSaveState("loading"); setError("");
    try {
      const [data, speech] = await Promise.all([api.prepSpace(), api.speechStatus().catch(() => ({ available: false }))]);
      setChecklist(data.checklist || []);
      setNotes(data.notes || []);
      setActiveNoteId(data.notes?.[0]?.id || "");
      setSpeechAvailable(Boolean(speech.available));
      setLoaded(true);
      setSaveState("saved");
    } catch (ex) { setError(ex.message); setSaveState("error"); }
  };

  useEffect(() => {
    reloadSpace();
  }, []);

  useEffect(() => {
    if (!loaded) return undefined;
    let alive = true;
    const timer = window.setTimeout(() => {
      setSaveState("saving");
      const snapshot = { checklist, notes };
      saveQueueRef.current = saveQueueRef.current.catch(() => {}).then(() => api.savePrepSpace(snapshot));
      saveQueueRef.current.then(() => { if (alive) { setSaveState("saved"); setError(""); } })
        .catch((ex) => { if (alive) { setSaveState("error"); setError(ex.message); } });
    }, 550);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [checklist, notes, loaded]);

  useEffect(() => () => {
    recorderRef.current?.stop();
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!recordingUrl) return undefined;
    return () => URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  const addTask = (event) => {
    event.preventDefault();
    const text = newTask.trim();
    if (!text) return;
    setChecklist((items) => [{ id: makeId(), text, completed: false }, ...items]);
    setNewTask("");
  };

  const addNote = (body = "", title = "Interview note") => {
    const note = { id: makeId(), title, body, updated_at: new Date().toISOString() };
    setNotes((items) => [note, ...items]);
    setActiveNoteId(note.id);
  };

  const updateNote = (field, value) => setNotes((items) => items.map((note) => note.id === activeNoteId ? { ...note, [field]: value, updated_at: new Date().toISOString() } : note));

  const beginRecording = async () => {
    setMicMessage(""); setError(""); setTranscript("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMicMessage("Audio recording is not supported in this browser. You can still type and save notes.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const preferred = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : undefined;
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecordingBlob(blob);
        setRecordingUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = navigator.language || "en-US";
        recognition.onresult = (event) => {
          const phrase = Array.from(event.results).slice(event.resultIndex).map((result) => result[0].transcript.trim()).filter(Boolean).join(" ");
          if (phrase) setTranscript((value) => `${value}${value ? " " : ""}${phrase}`);
        };
        recognition.onerror = () => setMicMessage("Live transcription paused. You can still use the saved recording or try server transcription.");
        recognitionRef.current = recognition;
        try { recognition.start(); } catch { /* Some browsers only allow one active recognizer. */ }
      }
      recorder.start();
      setRecording(true);
    } catch (ex) {
      setMicMessage(ex.name === "NotAllowedError" ? "Microphone access was blocked. Allow microphone access to record." : "Could not start microphone recording. Check the device and try again.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
    setMicMessage("Recording ready. Review it, then add the transcript to your notes.");
  };

  const saveRecordingAsNote = async () => {
    if (!recordingBlob) return;
    setTranscribing(true); setMicMessage("");
    try {
      let text = transcript.trim();
      let notice = "Transcript added to your saved notes.";
      if (speechAvailable) {
        const form = new FormData();
        const mime = recordingBlob.type.toLowerCase();
        const extension = mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "mp4" : mime.includes("wav") ? "wav" : mime.includes("mpeg") ? "mp3" : "webm";
        form.append("file", recordingBlob, `prep-note.${extension}`);
        try {
          const result = await api.transcribeAudio(form);
          text = result.text.trim();
        } catch (ex) {
          if (!text) throw ex;
          notice = "Speech service unavailable; saved the browser transcript instead.";
        }
      }
      if (!text) {
        setMicMessage("No speech was transcribed. Try speaking clearly, use server transcription, or type your note below.");
        return;
      }
      addNote(text, `Voice note · ${new Date().toLocaleString()}`);
      setMicMessage(notice);
    } catch (ex) { setMicMessage(ex.message); }
    finally { setTranscribing(false); }
  };

  const deleteNote = () => {
    if (!activeNote) return;
    const next = notes.filter((note) => note.id !== activeNote.id);
    setNotes(next); setActiveNoteId(next[0]?.id || "");
  };

  return (
    <section className="prep-workspace card" aria-labelledby="prep-space-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Make it yours</p><h2 id="prep-space-title" className="mt-1 text-2xl font-bold">Prep workspace</h2><p className="mt-1 max-w-2xl text-sm text-ink/60">Keep a focused checklist and capture useful thoughts before or after a practice session.</p></div>
        <span className={`prep-save-status ${saveState === "error" ? "prep-save-error" : ""}`} role="status">{saveState === "loading" ? "Loading your space…" : saveState === "saving" ? <><Spinner /> Saving</> : saveState === "error" ? "Save failed" : "✓ Saved"}</span>
      </div>
      {error && <p className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral" role="alert"><span>{error}</span>{!loaded && <button type="button" className="prep-text-button" onClick={reloadSpace}>Retry loading</button>}</p>}

      <div className="mt-5 grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <div className="prep-subcard">
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-bold">My checklist</h3><p className="mt-1 text-xs text-ink/55">{checklist.filter((item) => item.completed).length} of {checklist.length} complete</p></div><span className="prep-checklist-count">{checklist.length}</span></div>
          <form className="mt-4 flex gap-2" onSubmit={addTask}><label className="sr-only" htmlFor="prep-new-task">Add a checklist item</label><input id="prep-new-task" className="input" value={newTask} maxLength={180} onChange={(event) => setNewTask(event.target.value)} placeholder="e.g. Review project trade-offs"/><button type="submit" className="prep-purple-button shrink-0" disabled={!newTask.trim()} aria-label="Add checklist item">＋</button></form>
          <ul className="mt-3 space-y-2">
            {checklist.map((item) => <li key={item.id} className={`prep-check-item ${item.completed ? "prep-check-done" : ""}`}><label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3"><input type="checkbox" checked={item.completed} onChange={() => setChecklist((items) => items.map((row) => row.id === item.id ? { ...row, completed: !row.completed } : row))} className="mt-1 h-4 w-4 accent-violet-600"/><span className="break-words text-sm">{item.text}</span></label><DeleteConfirmAction className="prep-icon-button" title="Remove this checklist item?" description={`“${item.text}” will be removed from your prep checklist.`} confirmLabel="Remove item" triggerProps={{ title: "Remove checklist item", "aria-label": `Remove ${item.text}` }} onDelete={() => setChecklist((items) => items.filter((row) => row.id !== item.id))}><Icon name="trash" className="h-4 w-4"/></DeleteConfirmAction></li>)}
            {!checklist.length && <li className="prep-empty-state"><span className="text-2xl" aria-hidden="true">☑</span><span>Your checklist starts here. Add a small next step to build momentum.</span></li>}
          </ul>
        </div>

        <div className="prep-subcard">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Notes & voice capture</h3><p className="mt-1 text-xs text-ink/55">Notes save to your account. Recordings are session-only; transcription may send audio to your configured speech provider, and only the transcript is saved.</p></div><button type="button" className="prep-purple-button" onClick={() => addNote()}><span aria-hidden="true">＋</span> New note</button></div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(130px,.38fr)_minmax(0,1fr)]">
            <div className="prep-note-list" aria-label="Saved notes">
              {notes.map((note) => <button type="button" key={note.id} onClick={() => setActiveNoteId(note.id)} className={`prep-note-choice ${activeNoteId === note.id ? "prep-note-choice-active" : ""}`}><strong className="block truncate text-sm">{note.title || "Untitled note"}</strong><span className="mt-1 block truncate text-[11px] text-ink/50">{note.body || "No note text yet"}</span></button>)}
              {!notes.length && <p className="p-3 text-xs text-ink/50">Your saved notes appear here.</p>}
            </div>
            <div className="min-w-0">
              {activeNote ? <div className="space-y-2"><label className="sr-only" htmlFor="prep-note-title">Note title</label><input id="prep-note-title" className="input font-semibold" value={activeNote.title} maxLength={120} onChange={(event) => updateNote("title", event.target.value)} placeholder="Note title"/><label className="sr-only" htmlFor="prep-note-body">Note content</label><textarea id="prep-note-body" className="input min-h-44 resize-y leading-relaxed" value={activeNote.body} maxLength={12000} onChange={(event) => updateNote("body", event.target.value)} placeholder="Capture interview examples, questions to revisit, feedback, or ideas…"/><div className="flex justify-end"><DeleteConfirmAction className="prep-delete-note" onDelete={deleteNote} title="Delete this note?" description={`“${activeNote.title || "Untitled note"}” will be permanently removed from your prep workspace.`}>Delete note</DeleteConfirmAction></div></div> : <div className="prep-note-placeholder"><span className="text-3xl" aria-hidden="true">✎</span><p>Create a note or add a voice transcript.</p><button type="button" className="prep-text-button" onClick={() => addNote()}>Create your first note</button></div>}
            </div>
          </div>

          <div className="prep-recorder mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><button type="button" onClick={recording ? stopRecording : beginRecording} className={`prep-record-button ${recording ? "prep-recording" : ""}`} aria-pressed={recording}><span className="prep-record-indicator"/>{recording ? "Stop recording" : "Record a voice note"}</button><span className="text-xs text-ink/55">{recording ? "Listening… speak naturally" : speechAvailable ? "Mic capture + server transcription available" : "Mic capture + browser transcription when supported"}</span></div>{recording && <span className="prep-recording-wave" aria-label="Recording in progress"><i/><i/><i/><i/><i/></span>}</div>
            {recordingUrl && <div className="mt-3 flex flex-wrap items-center gap-3"><audio controls src={recordingUrl} className="h-9 max-w-full"/><a className="prep-text-button text-xs" href={recordingUrl} download="prepmind-voice-note.webm">Download recording</a><button type="button" onClick={saveRecordingAsNote} disabled={recording || transcribing || !recordingBlob} className="prep-purple-button" title={!speechAvailable && !transcript.trim() ? "No browser transcript is available; configure speech transcription or try another browser" : "Save the recording transcript as a note"}>{transcribing ? <><Spinner/>Transcribing…</> : "Add transcript to notes"}</button></div>}
            {micMessage && <p className="mt-2 text-xs text-ink/60" role="status">{micMessage}</p>}
            {!speechAvailable && <p className="mt-2 text-[11px] text-ink/45">If browser speech recognition is unavailable, configure SPEECH_TRANSCRIPTION_URL in backend/.env to transcribe recordings.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
