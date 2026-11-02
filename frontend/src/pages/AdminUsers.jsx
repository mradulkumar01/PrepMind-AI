import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { LoadingGesture } from "../components/ui.jsx";

const date = (value) => value ? new Date(value).toLocaleString() : "No sign-in recorded";

export default function AdminUsers() {
  const [data, setData] = useState(null);
  const [logins, setLogins] = useState([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [result, recentLogins] = await Promise.all([api.adminUsers(query, page), api.adminLogins()]);
      setData(result);
      setLogins(recentLogins);
      setDrafts(Object.fromEntries(result.items.map((item) => [item.id, item.name])));
    } catch (e) { setError(e.message); }
  }, [query, page]);
  useEffect(() => { load(); }, [load]);

  const update = async (person, changes, label) => {
    setBusy(person.id); setError(""); setMessage("");
    try {
      await api.adminUpdateUser(person.id, changes);
      setMessage(`${label} updated for ${person.email}.`);
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(""); }
  };

  const submitSearch = (event) => { event.preventDefault(); setPage(1); setQuery(search.trim()); };

  if (error && !data) return <section className="card mx-auto max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">PrepMind administration</p><h1 className="mt-2 text-2xl font-bold">Admin access required</h1><p role="alert" className="mt-3 rounded-xl border border-coral/20 bg-coral/10 p-4 text-sm text-coral">{error}</p><p className="mt-4 text-sm text-ink/60">Add your registered account email to <code>ARENA_ADMIN_EMAILS</code> in the Render API service’s Environment settings, save and redeploy, then sign out and back in.</p><Link className="mt-4 inline-flex text-sm font-semibold text-brand underline" to="/">Return to PrepMind</Link></section>;
  if (!data) return <LoadingGesture label="Loading user administration…" />;

  return <div className="space-y-5">
    <section className="home-hero relative overflow-hidden rounded-[28px] border border-brand/20 bg-white/85 p-6 shadow-[0_22px_70px_-44px_rgba(119,35,78,.4)] sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Private admin workspace</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">User administration</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/60">View registered accounts, their latest sign-in time, and PrepMind usage. Update display names or temporarily disable and restore accounts.</p></div><div className="rounded-2xl border border-brand/15 bg-white/80 px-5 py-3"><strong className="block text-2xl text-brand">{data.total}</strong><span className="text-xs text-ink/55">registered accounts</span></div></div>
      <p className="mt-4 rounded-xl border border-gold/20 bg-gold/10 px-4 py-3 text-xs leading-relaxed text-ink/65">Passwords, password hashes, reset tokens, and login tokens are never shown here. “Last sign-in” is recorded from the moment this feature is deployed; earlier sign-ins are not in the database.</p>
    </section>

    {error && <p role="alert" className="rounded-xl border border-coral/20 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</p>}
    {message && <p role="status" className="rounded-xl border border-mint/20 bg-mint/10 px-4 py-3 text-sm text-mint">{message}</p>}

    <section className="card">
      <form onSubmit={submitSearch} className="mb-4 flex flex-wrap gap-2"><input className="input min-w-52 flex-1" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" aria-label="Search users"/><button className="btn" type="submit">Search</button><button className="btn-ghost" type="button" onClick={() => { setSearch(""); setQuery(""); setPage(1); }}>Clear</button></form>
      <div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-ink/50"><tr><th className="pb-3">Account</th><th className="pb-3">Created</th><th className="pb-3">Last sign-in</th><th className="pb-3">Usage</th><th className="pb-3">Status</th><th className="pb-3">Admin actions</th></tr></thead><tbody>{data.items.map((person) => <tr key={person.id} className="border-t border-ink/10 align-top"><td className="py-4 pr-3"><strong className="block">{person.name}</strong><span className="text-xs text-ink/55">{person.email}</span></td><td className="py-4 pr-3 text-xs text-ink/60">{date(person.created_at)}</td><td className="py-4 pr-3 text-xs text-ink/60">{date(person.last_login_at)}</td><td className="py-4 pr-3 text-xs text-ink/60">{person.resume_count} resumes<br/>{person.interview_count} interviews · {person.completed_interview_count} completed</td><td className="py-4 pr-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${person.is_active ? "bg-mint/10 text-mint" : "bg-coral/10 text-coral"}`}>{person.is_active ? "Active" : "Disabled"}</span></td><td className="py-3"><div className="flex min-w-64 flex-col gap-2"><div className="flex gap-2"><input className="input !py-2 text-xs" aria-label={`Display name for ${person.email}`} value={drafts[person.id] ?? person.name} onChange={(e) => setDrafts((current) => ({ ...current, [person.id]: e.target.value }))}/><button className="btn-ghost !px-3 !py-2 text-xs" disabled={busy === person.id || (drafts[person.id] ?? person.name).trim() === person.name} onClick={() => update(person, { name: (drafts[person.id] ?? person.name).trim() }, "Display name")}>Save</button></div><button className={`self-start rounded-lg px-3 py-2 text-xs font-semibold ${person.is_active ? "bg-coral/10 text-coral hover:bg-coral/15" : "bg-mint/10 text-mint hover:bg-mint/15"}`} disabled={busy === person.id} onClick={() => update(person, { is_active: !person.is_active }, person.is_active ? "Account disabled" : "Account restored")}>{busy === person.id ? "Saving…" : person.is_active ? "Disable account" : "Restore account"}</button></div></td></tr>)}</tbody></table>{!data.items.length && <p className="py-10 text-center text-sm text-ink/55">No accounts match this search.</p>}</div>
      <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-4 text-xs text-ink/55"><span>Showing {data.items.length ? (page - 1) * data.limit + 1 : 0}–{Math.min(page * data.limit, data.total)} of {data.total}</span><div className="flex gap-2"><button className="btn-ghost !px-3 !py-2" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>Previous</button><button className="btn-ghost !px-3 !py-2" disabled={page * data.limit >= data.total} onClick={() => setPage((n) => n + 1)}>Next</button></div></div>
    </section>
    <section className="card"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Account activity</p><h2 className="mt-1 text-xl font-bold">Recent successful sign-ins</h2></div><span className="text-xs text-ink/50">90-day retention · no IP or device tracking</span></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-ink/50"><tr><th className="pb-2">User</th><th className="pb-2">Email</th><th className="pb-2">Signed in</th></tr></thead><tbody>{logins.map((event, index) => <tr key={`${event.user_id}-${event.created_at}-${index}`} className="border-t border-ink/10"><td className="py-3">{event.name}</td><td className="py-3 text-ink/60">{event.email}</td><td className="py-3 text-xs text-ink/60">{date(event.created_at)}</td></tr>)}</tbody></table>{!logins.length && <p className="py-6 text-center text-sm text-ink/55">New successful sign-ins will appear here after this update deploys.</p>}</div></section>
  </div>;
}
