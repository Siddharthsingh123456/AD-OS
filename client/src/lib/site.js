import { MODULES } from "./modules";

export const STATS = [
  [String(MODULES.length), "modules behind one login"],
  ["7", "built-in specialist agents"],
  ["1", "shared memory every agent reads"],
];

const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
  "twenty-one",
  "twenty-two",
  "twenty-three",
  "twenty-four",
  "twenty-five",
];
/** The number of modules, as a word ("twenty"), so copy never drifts from the real module list. */
export const MODULE_WORD = WORDS[MODULES.length] || String(MODULES.length);
export const MODULE_COUNT = MODULES.length;

export const TECH = ["React 18", "Node.js", "MongoDB", "Claude API", "FastAPI", "Vite"];

export const CAPS = [
  {
    icon: "memory",
    title: "One memory, every agent",
    text: "Save a fact once, like your stack or your naming rules. It is added to every agent's context, so the SQL agent knows what the chat already learned.",
  },
  {
    icon: "search",
    title: "Answers you can check",
    text: "Search your PDFs, docs and GitHub repos with keyword and embedding retrieval. Replies show the passages they were built from.",
  },
  {
    icon: "agents",
    title: "Agents with a job",
    text: "Chat, code, research, SQL, testing, debugging and deployment each have their own instructions. Install more from the marketplace or publish your own.",
  },
  {
    icon: "shield",
    title: "Your key, your data",
    text: "Paste your own Anthropic key in Settings and it stays in your browser, or deploy with a server key. Accounts use JWT, and the first account becomes the admin.",
  },
];

export const STEPS = [
  ["Create an account", "Register in under a minute. The first account on a new deployment becomes the admin."],
  [
    "Add what you know",
    "Upload a PDF, import a GitHub repo or paste your docs. They are split into chunks and indexed.",
  ],
  ["Tell it about you", "Save your stack and conventions to AI Memory. Every agent reads them before it answers."],
  ["Pick an agent and work", "Chat, code, query, test, debug or deploy. Replies stream in as they are written."],
  ["Sign out when you are done", "Your notes, files and memory stay in your account and are waiting next time."],
];

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    monthly: 0,
    yearly: 0,
    blurb: "Try every module with your own API key.",
    cta: "Create free account",
    feats: [
      `All ${MODULES.length} modules`,
      "Bring your own Anthropic key",
      "Keyword search over your files",
      "AI Memory shared across agents",
      "Install community agents",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 12,
    yearly: 10,
    featured: true,
    blurb: "Daily use without managing keys.",
    cta: "Start free, upgrade later",
    feats: [
      "Everything in Starter",
      "Server-side AI key, nothing to paste",
      "Embedding search via the ML service",
      { t: "Higher usage limits", soon: true },
      "Publish your own agents",
    ],
  },
  {
    id: "team",
    name: "Team",
    monthly: 29,
    yearly: 24,
    seat: true,
    blurb: "Shared agents and oversight for a team.",
    cta: "Start free, upgrade later",
    feats: [
      "Everything in Pro",
      "Admin dashboard: users, usage, health",
      "Agent marketplace for every member",
      "Admin and member roles",
      { t: "Priority support", soon: true },
    ],
  },
];

export const FAQ = [
  [
    "Do I need my own API key?",
    "No, but you can use one. Set ANTHROPIC_API_KEY on the server and everyone can use the workspace. Or paste a key in Settings; it is stored only in your browser and takes priority.",
  ],
  [
    "Where is my data stored?",
    "In your own MongoDB database: accounts, notes, chats, indexed documents and memory. Passwords are hashed with bcrypt.",
  ],
  [
    "What does the ML service add?",
    "It is optional. A Python service adds sentence embeddings and transformer sentiment. Without it, search uses BM25 and text analysis falls back to a built-in method, so nothing breaks.",
  ],
  [
    "Who becomes the admin?",
    "The first account registered on a new deployment. Admins see a dashboard with users, usage and system health.",
  ],
  [
    "Can I build my own agents?",
    "Yes. The marketplace has templates and community agents to install, and you can publish your own.",
  ],
  [
    "What happens when I sign out?",
    "Your session cookie is cleared and you return to this site. Your data stays in your account for the next time you sign in.",
  ],
];

export const STACK = [
  ["Interface", "React 18, Vite, React Router"],
  ["API", "Express, Mongoose, JWT"],
  ["AI", "Anthropic Messages API with streaming"],
  ["Retrieval", "BM25 plus MiniLM embeddings (optional)"],
  ["NLP and ML", "FastAPI service with DistilBERT sentiment"],
  ["Hosting", "Vercel and MongoDB Atlas"],
];

export const TRUST = [
  ["Passwords are hashed", "Passwords are stored as bcrypt hashes. Nobody, including the admin, can read them."],
  [
    "Sessions expire",
    "You stay signed in with an httpOnly cookie that expires after 7 days, so page scripts cannot read it. Sign out clears it right away.",
  ],
  [
    "Your key stays with you",
    "An API key you paste in Settings is kept in your browser and sent only with your own requests.",
  ],
  [
    "Brute force is slowed",
    "Sign-in, sign-up and password changes are rate limited, and the API sends standard security headers.",
  ],
  [
    "You can leave",
    "Change your password or delete your account and everything in it from Settings, with no email to send.",
  ],
  ["Your database", "Data lives in the MongoDB database you connect, not in a shared pool."],
];

export const DEMOS = [
  {
    id: "code",
    name: "Code",
    mem: "React 18, JavaScript, no TypeScript",
    you: "Write a useDebounce hook.",
    out: `function useDebounce(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}`,
    code: true,
    note: "Plain JavaScript, because your memory says no TypeScript.",
  },
  {
    id: "sql",
    name: "SQL",
    mem: "PostgreSQL · tables: customers, orders",
    you: "Top 5 customers by spend in the last 30 days.",
    out: `SELECT c.name, SUM(o.total) AS spend
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.created_at >= now() - interval '30 days'
GROUP BY c.id
ORDER BY spend DESC
LIMIT 5;`,
    code: true,
    note: "Uses interval syntax that works in PostgreSQL.",
  },
  {
    id: "debug",
    name: "Debug",
    mem: "Vercel + MongoDB Atlas",
    you: "Buffering timed out after 10000ms on the first request.",
    out: "The query ran before the connection was ready, which is common on a cold start. Await the connection before handling the request, and cache it on global so warm functions reuse it instead of reconnecting.",
    note: "Sources: api/index.js, server/src/db.js",
  },
  {
    id: "research",
    name: "Research",
    mem: "Building docs search for a small team",
    you: "BM25 or embeddings for searching our docs?",
    out: "Start with BM25: it is fast, needs no model, and wins when people search exact terms like error codes. Add embeddings when questions are phrased differently from the docs. A hybrid of both usually beats either alone.",
    note: "A plan, the findings and the trade-offs, written as a short report.",
  },
  {
    id: "deploy",
    name: "Deploy",
    mem: "Vercel + MongoDB Atlas",
    you: "What should I check before going live?",
    out: "1. MONGODB_URI and ANTHROPIC_API_KEY set in Vercel\n2. Atlas network access allows Vercel (0.0.0.0/0)\n3. JWT_SECRET set to a long random value\n4. /api/health returns db: true and llm: true\n5. Request bodies stay under 4.5 MB",
    note: "A checklist built for your hosting setup.",
  },
];
