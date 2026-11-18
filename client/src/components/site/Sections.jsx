import { useState } from "react";
import { Link } from "react-router-dom";
import { GROUPS, MODULES } from "../../lib/modules";
import { CAPS, DEMOS, FAQ, MODULE_WORD, PLANS, STACK, STEPS, TRUST } from "../../lib/site";
import { useAuth } from "../../lib/auth.jsx";
import { Brain, Library, Puzzle, ShieldCheck } from "lucide-react";
import { Icon } from "../ui/Icon.jsx";
import Tilt from "./Tilt.jsx";
import Reveal from "./Reveal.jsx";

const CAP_ICONS = { memory: Brain, search: Library, agents: Puzzle, shield: ShieldCheck };
const CapIcon = ({ name }) => {
  const G = CAP_ICONS[name] || Brain;
  return <G size={22} strokeWidth={1.8} aria-hidden="true" />;
};

export const Eyebrow = ({ children }) => <span className="eyebrow">{children}</span>;

export function StartLink({ className = "btn primary lg", children = "Create free account", to }) {
  const { user } = useAuth();
  return (
    <Link className={className} to={user ? "/app" : to || "/register"}>
      {user ? "Open workspace" : children}
    </Link>
  );
}

export const PageHead = ({ title, lede }) => (
  <section className="s-wrap page-hero">
    <h1>{title}</h1>
    <p className="s-lede">{lede}</p>
  </section>
);

export function ConsoleDemo() {
  return (
    <Tilt className="console-wrap">
      <div className="console" aria-hidden="true">
        <div className="bar2">
          <i />
          <i />
          <i />
        </div>
        <div className="body">
          <div>
            <span className="p">you ›</span> /remember I deploy on Vercel with MongoDB Atlas
          </div>
          <div className="ok">✓ saved to memory — every agent can use it</div>
          <div style={{ marginTop: 10 }}>
            <span className="p">you ›</span> why does my cold start exceed 10s?
          </div>
          <div className="dim">debugging-agent · retrieved 3 passages from [vercel.json] [api/index.js]</div>
          <div>
            Your Mongo connection is opened on every invocation. Cache it on <span className="p">global</span> so warm
            lambdas reuse it…
            <span className="cursor" />
          </div>
        </div>
      </div>
    </Tilt>
  );
}

export function AboutSection() {
  return (
    <section className="s-sec">
      <Reveal className="s-wrap about-grid">
        <div>
          <h2>Your tools should already know what you told the last one.</h2>
          <p className="s-lede">
            A chatbot here, a notes app there, a PDF reader, a SQL client. Each one starts from zero, so you explain
            your project again every time.
          </p>
          <p className="s-lede">
            AI Developer OS puts them behind one login and gives them one memory. Tell it your stack once and the code
            assistant, the debugger and the deployment agent all work from it.
          </p>
          <Link className="btn" to="/about" style={{ marginTop: 8 }}>
            Read the story
          </Link>
        </div>
        <ConsoleDemo />
      </Reveal>
    </section>
  );
}

export function CapsSection() {
  return (
    <section className="s-sec">
      <Reveal className="s-wrap">
        <Eyebrow>Why it works</Eyebrow>
        <h2>What you get</h2>
        <div className="caps">
          {CAPS.map((c) => (
            <div className="cap" key={c.title}>
              <span className="cap-ico">
                <CapIcon name={c.icon} />
              </span>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function ModulesSection() {
  return (
    <section className="s-sec" id="modules">
      <Reveal className="s-wrap">
        <Eyebrow>The workspace</Eyebrow>
        <h2>
          {MODULE_WORD[0].toUpperCase() + MODULE_WORD.slice(1)} modules, {GROUPS.length === 4 ? "four" : GROUPS.length}{" "}
          areas
        </h2>
        <p className="s-lede" style={{ marginBottom: 32 }}>
          Everything opens from the same sidebar once you sign in.
        </p>
        <div className="mods">
          {GROUPS.map((g) => (
            <div key={g}>
              <h3>{g}</h3>
              {MODULES.filter((m) => m.group === g && m.id !== "settings").map((m) => (
                <div className="mod" key={m.id}>
                  <span className="ico">
                    <Icon name={m.id} />
                  </span>
                  <div>
                    <b>{m.name}</b>
                    <small>{m.desc}</small>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function StepsSection() {
  return (
    <section className="s-sec">
      <Reveal className="s-wrap">
        <Eyebrow>How it works</Eyebrow>
        <h2>From sign-in to shipping</h2>
        <ol className="steps">
          {STEPS.map(([t, d]) => (
            <li key={t}>
              <h3>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}

export function PricingSection() {
  const [yearly, setYearly] = useState(true);
  return (
    <section className="s-sec">
      <Reveal className="s-wrap">
        <div className="price-head">
          <div>
            <Eyebrow>Pricing</Eyebrow>
            <h2>Simple, honest plans</h2>
          </div>
          <div className="seg" role="group" aria-label="Billing period">
            <button className={!yearly ? "on" : ""} onClick={() => setYearly(false)}>
              Monthly
            </button>
            <button className={yearly ? "on" : ""} onClick={() => setYearly(true)}>
              Yearly, save 17%
            </button>
          </div>
        </div>
        <div className="plans">
          {PLANS.map((p) => {
            const price = yearly ? p.yearly : p.monthly;
            const card = (
              <div className={"plan" + (p.featured ? " featured" : "")}>
                {p.featured && <span className="plan-badge">Recommended</span>}
                <div>
                  <h3>{p.name}</h3>
                  <p className="muted small">{p.blurb}</p>
                </div>
                <div className="price">
                  ${price}
                  <small>{price === 0 ? " free forever" : p.seat ? " per seat, per month" : " per month"}</small>
                </div>
                <ul>
                  {p.feats.map((f) =>
                    typeof f === "string" ? (
                      <li key={f}>{f}</li>
                    ) : (
                      <li key={f.t}>
                        {f.t}
                        {f.soon && <span className="soon">Soon</span>}
                      </li>
                    ),
                  )}
                </ul>
                <StartLink className={"btn block lg" + (p.featured ? " primary" : "")}>{p.cta}</StartLink>
              </div>
            );
            return p.featured ? (
              <Tilt key={p.id} max={5}>
                {card}
              </Tilt>
            ) : (
              <div key={p.id} className="plan-slot">
                {card}
              </div>
            );
          })}
        </div>
        <p className="muted plans-note">
          Billing is not connected in this preview, so every plan opens a free account.
        </p>
      </Reveal>
    </section>
  );
}

export function FaqSection() {
  return (
    <section className="s-sec">
      <Reveal className="s-wrap">
        <Eyebrow>FAQ</Eyebrow>
        <h2>Questions</h2>
        <div className="faq">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function StackSection() {
  return (
    <section className="s-sec">
      <Reveal className="s-wrap">
        <Eyebrow>Architecture</Eyebrow>
        <h2>Under the hood</h2>
        <div className="stack-table">
          {STACK.map(([k, v]) => (
            <div key={k}>
              <b>{k}</b>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="s-sec">
      <Reveal className="s-wrap">
        <div className="cta">
          <h2>Open your workspace.</h2>
          <p className="s-lede">Create an account, add a document, and ask your first question in a few minutes.</p>
          <div className="row wrap">
            <StartLink />
            <Link className="btn lg" to="/pricing">
              See pricing
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function ExplorerSection() {
  const [id, setId] = useState(DEMOS[0].id);
  const d = DEMOS.find((x) => x.id === id);
  return (
    <section className="s-sec">
      <Reveal className="s-wrap">
        <Eyebrow>Live examples</Eyebrow>
        <h2>See an agent work</h2>
        <p className="s-lede" style={{ marginBottom: 28 }}>
          Examples of what each agent returns when it knows your stack. Pick one.
        </p>
        <div className="explorer">
          <div className="ex-tabs" role="tablist" aria-label="Agents">
            {DEMOS.map((x) => (
              <button
                key={x.id}
                role="tab"
                id={"tab-" + x.id}
                aria-selected={x.id === id}
                aria-controls="ex-panel"
                className={x.id === id ? "on" : ""}
                onClick={() => setId(x.id)}
              >
                <Icon name={x.id === "debug" ? "debugging" : x.id === "deploy" ? "deployment" : x.id} size={16} />
                {x.name}
              </button>
            ))}
          </div>
          <Tilt max={3}>
            <div className="console ex-panel" id="ex-panel" role="tabpanel" aria-labelledby={"tab-" + d.id} key={d.id}>
              <div className="bar2">
                <i />
                <i />
                <i />
                <span className="ex-mem">memory · {d.mem}</span>
              </div>
              <div className="body">
                <div>
                  <span className="p">you ›</span> {d.you}
                </div>
                {d.code ? (
                  <pre className="ex-code">{d.out}</pre>
                ) : (
                  <div className="ex-out">
                    {d.out.split("\n").map((l, n) => (
                      <div key={n}>{l}</div>
                    ))}
                  </div>
                )}
                <div className="dim">{d.note}</div>
              </div>
            </div>
          </Tilt>
        </div>
      </Reveal>
    </section>
  );
}

export function TrustSection() {
  return (
    <section className="s-sec">
      <Reveal className="s-wrap">
        <Eyebrow>Security and privacy</Eyebrow>
        <h2>Built to be trusted with your work</h2>
        <div className="trust">
          {TRUST.map(([t, d]) => (
            <div key={t}>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

const TOUR = [
  {
    id: "dashboard",
    tab: "Dashboard",
    src: "/tour/dashboard.jpg",
    alt: "Workspace dashboard with stats, recent chats and module tiles",
    note: `Every module, one login: your recent work and all ${MODULE_WORD} tools on one screen.`,
  },
  {
    id: "chat",
    tab: "Answers with sources",
    src: "/tour/chat.jpg",
    alt: "Debugging agent answering with code and cited source files",
    note: "Replies show the passages they were built from, and use what the chat already learned about your stack.",
  },
  {
    id: "memory",
    tab: "Shared memory",
    src: "/tour/memory.jpg",
    alt: "AI Memory page listing saved facts every agent can read",
    note: "Save a fact once. Every agent reads it before it answers.",
  },
];

export function TourSection() {
  const [i, setI] = useState(0);
  const t = TOUR[i];
  return (
    <section className="s-sec" id="tour">
      <Reveal className="s-wrap">
        <Eyebrow>Product tour</Eyebrow>
        <h2>See the real workspace</h2>
        <p className="s-lede">Screenshots of the running app, using sample data.</p>
        <div className="tour-tabs" role="tablist" aria-label="Product tour">
          {TOUR.map((x, n) => (
            <button
              key={x.id}
              role="tab"
              type="button"
              aria-selected={n === i}
              className={n === i ? "on" : ""}
              onClick={() => setI(n)}
            >
              {x.tab}
            </button>
          ))}
        </div>
        <figure className="tour-frame">
          <div className="tour-bar" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>app.ai-developer-os</span>
          </div>
          <img key={t.id} src={t.src} alt={t.alt} width="1440" height="900" loading="lazy" decoding="async" />
        </figure>
        <p className="tour-note" role="status">
          {t.note}
        </p>
      </Reveal>
    </section>
  );
}
