import {
  BookOpen,
  Brain,
  Bug,
  ChartColumn,
  Code,
  Database,
  Dna,
  FileText,
  FileUser,
  FlaskConical,
  FolderKanban,
  Globe,
  Library,
  LayoutDashboard,
  MemoryStick,
  NotebookPen,
  Puzzle,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

// One icon per workspace module. Built-in agents use these; user-made agents keep their own emoji.
const MAP = {
  dashboard: LayoutDashboard,
  chat: Brain,
  code: Code,
  research: Search,
  pdf: FileText,
  sql: Database,
  rag: Library,
  codebase: Dna,
  docs: BookOpen,
  testing: FlaskConical,
  debugging: Bug,
  deployment: Rocket,
  github: ChartColumn,
  notes: NotebookPen,
  quiz: Target,
  interview: Target,
  resume: FileUser,
  files: FolderKanban,
  memory: MemoryStick,
  marketplace: Puzzle,
  admin: ShieldCheck,
  settings: Settings,
  website: Globe,
};

export function Icon({ name, size = 18, ...rest }) {
  const Glyph = MAP[name] || Sparkles;
  return <Glyph size={size} strokeWidth={1.8} aria-hidden="true" focusable="false" {...rest} />;
}

/** Built-in agents get a line icon; custom agents show the emoji their author picked. */
export function AgentIcon({ agent, size = 22 }) {
  if (agent?.custom)
    return (
      <span className="emoji-ico" style={{ fontSize: size }} aria-hidden="true">
        {agent.icon}
      </span>
    );
  return <Icon name={agent?.id} size={size} />;
}
