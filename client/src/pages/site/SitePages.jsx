import { Link } from "react-router-dom";
import {
  CapsSection,
  CtaSection,
  ExplorerSection,
  FaqSection,
  ModulesSection,
  PageHead,
  PricingSection,
  StackSection,
  StepsSection,
  TrustSection,
} from "../../components/site/Sections.jsx";
import { MODULE_WORD } from "../../lib/site";
import { useTitle } from "../../hooks/useTitle";

export function FeaturesPage() {
  useTitle(
    "Features",
    "Agents for chat, code, research, SQL, testing, debugging and deployment, with retrieval over your own files and one shared memory.",
  );
  return (
    <main>
      <PageHead
        title="Every tool a developer reaches for, in one place."
        lede="Agents for the daily work, retrieval over your own files, and a memory they all share."
      />
      <CapsSection />
      <ExplorerSection />
      <ModulesSection />
      <StepsSection />
      <TrustSection />
      <CtaSection />
    </main>
  );
}

export function PricingPage() {
  useTitle(
    "Pricing",
    "Start free with your own Anthropic key. Upgrade for hosted AI, embedding search and team features.",
  );
  return (
    <main>
      <PageHead
        title="Start free. Upgrade when it becomes daily."
        lede={`Every plan includes all ${MODULE_WORD} modules. Pay only for hosting the AI for you and for team features.`}
      />
      <PricingSection />
      <FaqSection />
      <CtaSection />
    </main>
  );
}

export function AboutPage() {
  useTitle(
    "About",
    "Why AI Developer OS exists: one memory shared by every developer tool, on a stack you already know.",
  );
  return (
    <main>
      <PageHead
        title="Built because re-explaining your project gets old."
        lede="AI Developer OS began as a way to stop switching between a chatbot, a notes app, a SQL tool and a PDF reader, and starting from zero in each."
      />
      <section className="s-sec">
        <div className="s-wrap principles">
          <div>
            <h2>One memory, many agents</h2>
            <p>Facts you save are added to every agent's context. You describe your stack once.</p>
          </div>
          <div>
            <h2>Sources you can check</h2>
            <p>Retrieval shows where an answer came from, so you can open the passage and judge it yourself.</p>
          </div>
          <div>
            <h2>Runs on a stack you know</h2>
            <p>
              MongoDB, Express, React and Node. Deploy it on Vercel with Atlas, and add the Python ML service when you
              want embeddings.
            </p>
          </div>
        </div>
      </section>
      <StackSection />
      <TrustSection />
      <section className="s-sec">
        <div className="s-wrap">
          <p className="s-lede">
            Questions about how it works? The{" "}
            <Link to="/pricing" style={{ color: "var(--amber)", textDecoration: "underline" }}>
              pricing page
            </Link>{" "}
            answers the common ones.
          </p>
        </div>
      </section>
      <CtaSection />
    </main>
  );
}

const Doc = ({ title, updated, children }) => (
  <main>
    <section className="s-wrap page-hero" style={{ paddingBottom: 0 }}>
      <h1 style={{ maxWidth: "none" }}>{title}</h1>
      <p className="muted">Last updated {updated}</p>
    </section>
    <section className="s-sec" style={{ paddingTop: 28 }}>
      <div className="s-wrap legal">{children}</div>
    </section>
  </main>
);

export function PrivacyPage() {
  useTitle("Privacy");
  return (
    <Doc title="Privacy" updated="October 3, 2026">
      <p>
        AI Developer OS is software you can run yourself. The operator of a deployment is the party who controls the
        data stored in it. This page describes what the software does with your information.
      </p>
      <h2>What is stored</h2>
      <p>
        Your name, email address and a bcrypt hash of your password. Content you create: chats, notes, memory entries,
        documents and their indexed text, projects, quiz results, your resume data and agents you publish. Basic usage
        records (which feature was used and when) that power the admin dashboard.
      </p>
      <h2>What stays in your browser</h2>
      <p>
        Any Anthropic or GitHub key you enter in Settings, and your theme choice. Keys are not saved to the database.
        Your sign-in session is an httpOnly cookie that page scripts cannot read. They are sent with your own requests
        so the server can call those services for you.
      </p>
      <h2>Who else receives data</h2>
      <p>
        When you use an AI feature, the text you send, relevant memory entries and retrieved passages from your
        documents are sent to Anthropic's API to produce a reply. GitHub's API is used when you import a repository or
        view analytics. If the operator has connected the optional ML service, document text is sent to it for
        embeddings and sentiment analysis. The software does not include advertising or analytics trackers.
      </p>
      <h2>Your controls</h2>
      <p>
        You can delete individual notes, memories, documents and chats at any time. In Settings you can change your
        password or delete your account, which removes your account and everything it owns. Deleted data is removed from
        the database, though the operator's own backups follow their own schedule.
      </p>
      <h2>Contact</h2>
      <p>For questions or requests about your data, contact the operator of the site you signed up on.</p>
    </Doc>
  );
}

export function TermsPage() {
  useTitle("Terms");
  return (
    <Doc title="Terms of use" updated="October 3, 2026">
      <p>By creating an account you agree to these terms.</p>
      <h2>Your account</h2>
      <p>
        Keep your password private and use accurate details. You are responsible for activity under your account. Do not
        attempt to access other people's data, probe the service for weaknesses, or overload it.
      </p>
      <h2>Your content</h2>
      <p>
        You keep ownership of what you upload or write. You allow the service to store and process it to provide the
        features you use, including sending it to the AI providers described in the Privacy page.
      </p>
      <h2>AI output</h2>
      <p>
        AI replies can be wrong, incomplete or out of date. Review generated code, SQL, deployment steps and any advice
        before relying on it, and do not use the service as a substitute for professional advice.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Do not use the service for anything unlawful, to create malware, or to violate the terms of the AI providers it
        connects to. Content you publish to the marketplace must be yours to share.
      </p>
      <h2>Availability and changes</h2>
      <p>
        The service is provided as is, without warranties, and may change or be unavailable at times. The operator may
        suspend accounts that break these terms, and may update these terms by posting a new date above.
      </p>
    </Doc>
  );
}

export function NotFoundPage() {
  useTitle("Page not found");
  return (
    <main>
      <section className="s-wrap page-hero" style={{ minHeight: "56vh" }}>
        <h1>That page doesn't exist.</h1>
        <p className="s-lede">The link may be old or mistyped. Try one of these instead.</p>
        <div className="row wrap">
          <Link className="btn primary lg" to="/">
            Go home
          </Link>
          <Link className="btn lg" to="/features">
            See features
          </Link>
        </div>
      </section>
    </main>
  );
}
