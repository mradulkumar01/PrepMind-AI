import { Navigate, Route, Routes } from "react-router-dom";
import ArenaDashboard from "./ArenaDashboard.jsx";
import ProblemExplorer from "./ProblemExplorer.jsx";
import ProblemWorkspace from "./ProblemWorkspace.jsx";
import Hackathons from "./Hackathons.jsx";
import ArenaProgress from "./ArenaProgress.jsx";
import ArenaAdmin from "./ArenaAdmin.jsx";

export default function ArenaModule({ user }) {
  return <Routes>
    <Route index element={<ArenaDashboard user={user} />} />
    <Route path="problems" element={<ProblemExplorer />} />
    <Route path="problems/:slug" element={<ProblemWorkspace />} />
    <Route path="hackathons" element={<Hackathons />} />
    <Route path="hackathons/:slug" element={<Hackathons />} />
    <Route path="progress" element={<ArenaProgress />} />
    <Route path="admin" element={<ArenaAdmin />} />
    <Route path="*" element={<Navigate to="/arena" replace />} />
  </Routes>;
}
