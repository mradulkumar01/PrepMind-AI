import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Bar, Chip, Icon, Radar, ScoreRing, Spinner, toneColor } from "../components/ui.jsx";

export default function Results() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.interview(id).then(setData).catch((e) => setErr(e.message)); }, [id]);

  if (err) return <p role="alert" className="rounded-xl bg-coral/10 p-4 text-coral">{err}</p>;
  if (!data) return <div className="grid place-items-center py-24 text-ink/50"><Spinner className="h-6 w-6" /></div>;
  const s = data.interview.summary;
  if (!s) return <p className="card">This interview isn't finished yet. <Link className="font-semibold text-brand underline" to={`/interview/${id}`}>Continue it</Link></p>;

  const mock = data.questions.some((q) => q.answer?.evaluator === "mock-heuristic");
  const headline = s.overall >= 70 ? "A strong practice round" : s.overall >= 50 ? "A solid base with a few gaps" : "Useful practice: focus on the weaker topics";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-8">
          <div className="rounded-full border border-white/10 bg-panel p-2 text-ink"><ScoreRing value={s.overall} size={150} stroke={12} caption="out of 100" /></div>
          <div className="min-w-[220px] flex-1">
            <h1 className="text-3xl font-bold sm:text-4xl">{headline}</h1>
            <p className="mt-2 text-white/70">{s.answered} answers scored. This is practice feedback, not a verdict on your employability.</p>
            {data.interview.completed_early && <p className="mt-2 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">Submitted early · partial results</p>}
            <div className="no-print mt-5 flex flex-wrap gap-3">
              <Link to="/" className="btn">Practise again</Link>
              <button className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20" onClick={() => window.print()}><Icon name="print" className="h-4 w-4" />Print or save as PDF</button>
            </div>
          </div>
        </div>
      </section>

      {mock && <p className="rounded-xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">These scores came from demo mode (keyword and length heuristics), not an AI model.</p>}
      <p className="rounded-xl border border-brand/15 bg-white/70 px-4 py-3 text-sm text-ink/65">Scores are practice estimates based on answer text or its transcript. The camera is preview-only; the app does not measure speech fluency, facial expressions, or visual engagement.</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="text-xl font-bold">How you scored</h2>
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-2">
            <Radar data={s.criteria_avg} />
            <div>{Object.entries(s.criteria_avg).map(([k, v]) => <Bar key={k} label={k} value={v} />)}</div>
          </div>
        </section>
        <section className="card">
          <h2 className="text-xl font-bold">By topic</h2>
          <div className="mt-4">{Object.entries(s.by_topic).map(([k, v]) => <Bar key={k} label={k} value={v} />)}</div>
          <div className="mt-4 space-y-3 text-sm">
            <div><p className="mb-1.5 font-semibold">Strong topics (70 or more)</p><div className="flex flex-wrap gap-1.5">{s.strengths.length ? s.strengths.map((t) => <Chip key={t} tone="mint">{t}</Chip>) : <span className="text-ink/55">None yet</span>}</div></div>
            <div><p className="mb-1.5 font-semibold">Needs work (50 or less)</p><div className="flex flex-wrap gap-1.5">{s.weaknesses.length ? s.weaknesses.map((t) => <Chip key={t} tone="coral">{t}</Chip>) : <span className="text-ink/55">None. Nice.</span>}</div></div>
          </div>
        </section>
      </div>

      <section className="card">
        <h2 className="mb-3 text-xl font-bold">Review your answers</h2>
        <div className="space-y-2">
          {data.questions.map((q, i) => (
            <details key={q.id} className="group rounded-xl border border-ink/10 open:bg-canvas">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">{i + 1}</span>
                <span className="flex-1 font-medium">{q.text}</span>
                <span className="rounded-full px-2.5 py-1 text-xs font-bold text-[#100b19]" style={{ background: toneColor(q.answer?.overall ?? 0) }}>{Math.round(q.answer?.overall ?? 0)}</span>
                <Icon name="chevron" className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <div className="space-y-3 px-4 pb-4 text-sm">
                <div><p className="mb-1 text-xs font-semibold text-ink/55">Your answer</p><p className="whitespace-pre-wrap">{q.answer?.text}</p></div>
                {q.answer?.feedback && <div><p className="mb-1 text-xs font-semibold text-ink/55">Feedback</p><p>{q.answer.feedback}</p></div>}
                {q.answer?.sample_answer && <div><p className="mb-1 text-xs font-semibold text-brand">A stronger answer structure</p><p>{q.answer.sample_answer}</p></div>}
                {q.expected_points?.length > 0 && <div><p className="mb-1 text-xs font-semibold text-ink/55">A strong answer would cover</p><ul className="list-disc pl-5">{q.expected_points.map((p, k) => <li key={k}>{p}</li>)}</ul></div>}
                <p className="text-xs text-ink/50 capitalize">{q.kind}, {q.topic}, {q.difficulty}</p>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
