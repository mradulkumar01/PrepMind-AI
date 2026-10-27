// Thin fetch wrapper. NOTE: the JWT is kept in localStorage for simplicity (prototype);
// a production app would prefer httpOnly cookies. React escapes all text, so LLM output is rendered as plain text.
const KEY = "prepmind_token";
export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

function message(detail, status) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => `${d.loc?.slice(-1)[0] ?? "field"}: ${d.msg}`).join("; ");
  return `Request failed (${status})`;
}

async function request(path, { method = "GET", body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }

  const res = await fetch(`/api${path}`, { method, headers, body: payload });
  if (res.status === 401 && token) window.dispatchEvent(new Event("auth:logout"));
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(message(data?.detail, res.status));
  return data;
}

export const api = {
  register: (b) => request("/auth/register", { method: "POST", body: b }),
  login: (b) => request("/auth/login", { method: "POST", body: b }),
  me: () => request("/auth/me"),
  resumes: () => request("/resumes"),
  uploadResume: (form) => request("/resumes", { method: "POST", form }),
  deleteResume: (id) => request(`/resumes/${id}`, { method: "DELETE" }),
  interviews: () => request("/interviews"),
  deleteInterview: (id) => request(`/interviews/${id}`, { method: "DELETE" }),
  startInterview: (b) => request("/interviews", { method: "POST", body: b }),
  interview: (id) => request(`/interviews/${id}`),
  answer: (id, b) => request(`/interviews/${id}/answer`, { method: "POST", body: b }),
  finishInterview: (id, b = {}) => request(`/interviews/${id}/finish`, { method: "POST", body: b }),
  cancelInterview: (id) => request(`/interviews/${id}/cancel`, { method: "POST" }),
  speechStatus: () => request("/speech/status"),
  transcribeAudio: (form) => request("/speech/transcribe", { method: "POST", form }),
  learningPlan: () => request("/learning-plan"),
  updateLearningTask: (id, completed) => request(`/learning-plan/tasks/${id}`, { method: "PATCH", body: { completed } }),
  prepSpace: () => request("/prep-space"),
  savePrepSpace: (body) => request("/prep-space", { method: "PUT", body }),
  arenaDashboard: () => request("/arena/dashboard"),
  arenaLanguages: () => request("/arena/languages"),
  arenaProblems: (filters = {}) => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ""));
    return request(`/arena/problems${params.size ? `?${params}` : ""}`);
  },
  arenaProblem: (slug) => request(`/arena/problems/${slug}`),
  arenaBookmark: (slug) => request(`/arena/problems/${slug}/bookmark`, { method: "POST" }),
  arenaRun: (slug, body) => request(`/arena/problems/${slug}/run`, { method: "POST", body }),
  arenaSubmit: (slug, body) => request(`/arena/problems/${slug}/submit`, { method: "POST", body }),
  arenaSubmissions: (problemSlug, page = 1) => request(`/arena/submissions?page=${page}${problemSlug ? `&problem_slug=${encodeURIComponent(problemSlug)}` : ""}`),
  arenaSubmission: (id) => request(`/arena/submissions/${id}`),
  deleteArenaSubmission: (id) => request(`/arena/submissions/${id}`, { method: "DELETE" }),
  arenaProgress: () => request("/arena/progress"),
  arenaAssistant: (body) => request("/arena/assistant", { method: "POST", body }),
  arenaContests: () => request("/arena/contests"),
  arenaContest: (slug) => request(`/arena/contests/${slug}`),
  arenaRegisterContest: (slug) => request(`/arena/contests/${slug}/register`, { method: "POST" }),
  arenaCancelRegistration: (slug) => request(`/arena/contests/${slug}/cancel-registration`, { method: "POST" }),
  arenaCreateTeam: (slug, body) => request(`/arena/contests/${slug}/teams`, { method: "POST", body }),
  arenaJoinTeam: (slug, body) => request(`/arena/contests/${slug}/teams/join`, { method: "POST", body }),
  arenaLeaderboard: (slug) => request(`/arena/contests/${slug}/leaderboard`),
  arenaAdminProblems: () => request("/arena/admin/problems"),
  arenaAdminSaveProblem: (body) => request("/arena/admin/problems", { method: "POST", body }),
  arenaAdminContests: () => request("/arena/admin/contests"),
  arenaAdminSaveContest: (body) => request("/arena/admin/contests", { method: "POST", body }),
};
