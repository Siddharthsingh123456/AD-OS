import { useParams } from "react-router-dom";
import ChatWorkspace from "../../components/chat/ChatWorkspace.jsx";
import RagWorkspace from "../../components/chat/RagWorkspace.jsx";
import { useAgents } from "../../hooks/useAgents";

const Loading = () => (
  <div className="splash">
    <div className="spinner" />
  </div>
);

export function AgentPage({ id }) {
  const { builtin, loading } = useAgents();
  const a = builtin.find((x) => x.id === id);
  if (loading) return <Loading />;
  return a ? (
    <ChatWorkspace agent={a} />
  ) : (
    <div className="page">
      <div className="notice err">Could not load this agent. Is the API running?</div>
    </div>
  );
}

export function RagPage({ id }) {
  const { builtin, loading } = useAgents();
  const a = builtin.find((x) => x.id === id);
  if (loading) return <Loading />;
  return a ? (
    <RagWorkspace agent={a} />
  ) : (
    <div className="page">
      <div className="notice err">Could not load this workspace.</div>
    </div>
  );
}

export function CustomAgentPage() {
  const { id } = useParams();
  const { custom, loading } = useAgents();
  const a = custom.find((x) => x.id === id);
  if (loading) return <Loading />;
  return a ? (
    <ChatWorkspace agent={a} />
  ) : (
    <div className="page">
      <div className="notice err">Agent not found. It may have been removed.</div>
    </div>
  );
}
