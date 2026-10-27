import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api.js";
import { ArenaCard, ArenaFrame, ArenaNotice, DifficultyPill, LoadingState } from "./ArenaUI.jsx";

export default function ProblemExplorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const track = searchParams.get("track") || "all";
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ difficulty: "all", topic: "all", status: "all", sort: "title", bookmarked: false, page: 1 });
  const [data, setData] = useState(null);
  const [topicSource, setTopicSource] = useState([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const topics = useMemo(() => [...new Set(topicSource.flatMap((p) => p.topics))].sort(), [topicSource]);

  useEffect(() => { setFilters((f) => ({ ...f, page: 1 })); }, [track]);
  useEffect(() => { api.arenaProblems({ limit: 100 }).then((r) => setTopicSource(r.items)).catch(() => {}); }, []);
  useEffect(() => {
    setPending(true);
    const timer = window.setTimeout(() => {
      api.arenaProblems({ ...filters, track, search: query, limit: 10 })
        .then((r) => { setData(r); setError(""); })
        .catch((e) => setError(e.message))
        .finally(() => setPending(false));
    }, query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [query, filters, track]);

  const update = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  const bookmark = async (event, slug) => {
    event.preventDefault(); event.stopPropagation();
    try { await api.arenaBookmark(slug); const response = await api.arenaProblems({ ...filters, track, search: query, limit: 10 }); setData(response); }
    catch (e) { setError(e.message); }
  };

  return <ArenaFrame title="Problem library" description="Find your next challenge, filter by topic and difficulty, and track what you’ve solved." actions={<span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-slate-300">{data?.total ?? "…"} problems</span>}>
    <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <ArenaCard><h2 className="text-sm font-bold text-white">Filter problems</h2><div className="mt-4 space-y-4">
          <label className="block text-xs font-medium text-slate-400">Difficulty<select className="arena-input mt-1.5" value={filters.difficulty} onChange={(e) => update("difficulty", e.target.value)}><option value="all">All levels</option><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
          <label className="block text-xs font-medium text-slate-400">Topic<select className="arena-input mt-1.5" value={filters.topic} onChange={(e) => update("topic", e.target.value)}><option value="all">All topics</option>{topics.map((topic) => <option key={topic}>{topic}</option>)}</select></label>
          <label className="block text-xs font-medium text-slate-400">Progress<select className="arena-input mt-1.5" value={filters.status} onChange={(e) => update("status", e.target.value)}><option value="all">All problems</option><option value="todo">Not started</option><option value="attempted">Attempted</option><option value="solved">Solved</option></select></label>
          <label className="block text-xs font-medium text-slate-400">Sort by<select className="arena-input mt-1.5" value={filters.sort} onChange={(e) => update("sort", e.target.value)}><option value="title">Title</option><option value="difficulty">Difficulty</option><option value="newest">Newest</option></select></label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={filters.bookmarked} onChange={(e) => update("bookmarked", e.target.checked)} className="accent-violet-400" /> Bookmarked only</label>
        </div></ArenaCard>
        <ArenaCard><p className="text-xs font-bold uppercase tracking-[.2em] text-violet-300">Curated tracks</p><div className="mt-3 space-y-2"><Link className={`block rounded-lg px-3 py-2 text-sm ${track === "interview" ? "bg-violet-300/10 text-violet-100" : "bg-white/[.035] text-slate-300 hover:bg-white/[.07]"}`} to="/arena/problems?track=interview">Interview prep · Core DSA</Link><Link className={`block rounded-lg px-3 py-2 text-sm ${track === "beginner" ? "bg-violet-300/10 text-violet-100" : "bg-white/[.035] text-slate-300 hover:bg-white/[.07]"}`} to="/arena/problems?track=beginner">Beginner foundations</Link><Link className="block rounded-lg bg-white/[.035] px-3 py-2 text-sm text-slate-300 hover:bg-white/[.07]" to="/arena/hackathons">Contest archive</Link></div><p className="mt-3 text-[11px] leading-relaxed text-slate-500">Tracks filter the published library to a focused problem set.</p></ArenaCard>
      </aside>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3"><label className="relative min-w-[220px] flex-1"><span className="sr-only">Search problems</span><span className="pointer-events-none absolute left-3 top-2.5 text-slate-500">⌕</span><input className="arena-input pl-9" placeholder="Search title, topic, or statement…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><span className="text-xs text-slate-500">{track === "all" ? "Search updates as you type" : `${track === "interview" ? "Interview prep" : "Beginner foundations"} track`}</span></div>
        {error && <ArenaNotice>{error}</ArenaNotice>}
        {!data || pending ? <ArenaCard><LoadingState label="Finding problems…" /></ArenaCard> : data.items.length ? <>
          {data.items.map((problem) => <Link key={problem.slug} to={`/arena/problems/${problem.slug}`} className="group block rounded-2xl border border-white/[.08] bg-white/[.035] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-violet-300/25 hover:bg-white/[.055] sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${problem.user_status === "solved" ? "bg-emerald-300" : problem.user_status === "attempted" ? "bg-amber-200" : "bg-slate-700"}`} title={problem.user_status} /><div><h2 className="font-semibold text-white group-hover:text-cyan-100">{problem.title}</h2><div className="mt-2 flex flex-wrap items-center gap-2"><DifficultyPill value={problem.difficulty} />{problem.topics.map((topic) => <span key={topic} className="rounded-full border border-white/[.07] bg-white/[.025] px-2.5 py-1 text-[10px] text-slate-400">{topic}</span>)}</div></div></div>
              <div className="flex items-center gap-3"><span className="text-right text-xs text-slate-500">{problem.acceptance_rate == null ? "—" : `${problem.acceptance_rate}%`}<span className="mt-1 block">acceptance</span></span><button aria-label={problem.bookmarked ? "Remove bookmark" : "Bookmark problem"} title={problem.bookmarked ? "Remove bookmark" : "Bookmark problem"} onClick={(e) => bookmark(e, problem.slug)} className={`grid h-9 w-9 place-items-center rounded-xl border transition ${problem.bookmarked ? "border-amber-200/20 bg-amber-200/10 text-amber-100" : "border-white/10 text-slate-500 hover:bg-white/10 hover:text-white"}`}>{problem.bookmarked ? "★" : "☆"}</button></div>
            </div>
            <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-slate-400">{problem.statement}</p>
          </Link>)}
          <div className="flex items-center justify-between pt-3"><span className="text-xs text-slate-500">Page {data.page} of {Math.max(1, data.pages)} · {data.total} results</span><div className="flex gap-2"><button className="arena-button arena-button-quiet" disabled={data.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>← Previous</button><button className="arena-button arena-button-quiet" disabled={data.page >= data.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Next →</button></div></div>
        </> : <ArenaCard className="py-14 text-center"><p className="text-lg font-semibold">No problems match those filters.</p><p className="mt-2 text-sm text-slate-500">Try another topic, or clear the search.</p><button className="mt-5 text-sm text-cyan-200 underline" onClick={() => { setQuery(""); setFilters({ difficulty: "all", topic: "all", status: "all", sort: "title", bookmarked: false, page: 1 }); setSearchParams({}); }}>Reset filters</button></ArenaCard>}
      </section>
    </div>
  </ArenaFrame>;
}
