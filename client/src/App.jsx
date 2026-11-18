import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import Shell from "./components/layout/Shell.jsx";
import SiteLayout from "./components/layout/SiteLayout.jsx";
import Background3D from "./components/effects/Background3D.jsx";
import CommandPalette from "./components/system/CommandPalette.jsx";
import Landing from "./pages/site/Landing.jsx";
import AuthPage from "./pages/site/AuthPage.jsx";
import { AboutPage, FeaturesPage, NotFoundPage, PricingPage, PrivacyPage, TermsPage } from "./pages/site/SitePages.jsx";

// The workspace is code-split so the public site loads fast.
const Dashboard = lazy(() => import("./pages/app/Dashboard.jsx"));
const AgentPage = lazy(() => import("./pages/app/AgentPages.jsx").then((m) => ({ default: m.AgentPage })));
const RagPage = lazy(() => import("./pages/app/AgentPages.jsx").then((m) => ({ default: m.RagPage })));
const CustomAgentPage = lazy(() => import("./pages/app/AgentPages.jsx").then((m) => ({ default: m.CustomAgentPage })));
const PdfChat = lazy(() => import("./pages/app/PdfChat.jsx"));
const Notes = lazy(() => import("./pages/app/Notes.jsx"));
const Quiz = lazy(() => import("./pages/app/Quiz.jsx"));
const Resume = lazy(() => import("./pages/app/Resume.jsx"));
const Files = lazy(() => import("./pages/app/Files.jsx"));
const GitHub = lazy(() => import("./pages/app/GitHub.jsx"));
const Memory = lazy(() => import("./pages/app/Memory.jsx"));
const Marketplace = lazy(() => import("./pages/app/Marketplace.jsx"));
const Admin = lazy(() => import("./pages/app/Admin.jsx"));
const Settings = lazy(() => import("./pages/app/Settings.jsx"));

const AGENTS = ["chat", "code", "research", "sql", "testing", "debugging", "deployment"];
const RAGS = ["rag", "codebase", "docs"];
const Loading = () => (
  <div className="splash">
    <div className="spinner" />
  </div>
);

export default function App() {
  return (
    <>
      <Background3D />
      <CommandPalette />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/app" element={<Shell />}>
            <Route index element={<Dashboard />} />
            {AGENTS.map((id) => (
              <Route key={id} path={id} element={<AgentPage id={id} />} />
            ))}
            {RAGS.map((id) => (
              <Route key={id} path={id} element={<RagPage id={id} />} />
            ))}
            <Route path="agents/:id" element={<CustomAgentPage />} />
            <Route path="pdf" element={<PdfChat />} />
            <Route path="notes" element={<Notes />} />
            <Route path="quiz" element={<Quiz />} />
            <Route path="resume" element={<Resume />} />
            <Route path="files" element={<Files />} />
            <Route path="github" element={<GitHub />} />
            <Route path="memory" element={<Memory />} />
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="admin" element={<Admin />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
