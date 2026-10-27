import { useState } from "react";
import { api } from "../api.js";

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const res = mode === "login" ? await api.login({ email: f.email, password: f.password }) : await api.register(f);
      onAuth(res);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="card mx-auto max-w-sm space-y-3">
      <h1 className="text-xl font-semibold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      {mode === "register" && <input className="input" placeholder="Name" value={f.name} onChange={set("name")} required maxLength={80} />}
      <input className="input" type="email" placeholder="Email" value={f.email} onChange={set("email")} required />
      <input className="input" type="password" placeholder="Password (min 8 characters)" value={f.password} onChange={set("password")} required minLength={mode === "register" ? 8 : 1} maxLength={64} />
      {err && <p className="text-sm text-rose-600">{err}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}</button>
      <button type="button" className="btn-ghost w-full" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); }}>
        {mode === "login" ? "New here? Create an account" : "Have an account? Log in"}
      </button>
    </form>
  );
}
