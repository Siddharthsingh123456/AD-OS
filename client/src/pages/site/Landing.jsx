import { Link } from "react-router-dom";
import {
  AboutSection,
  CapsSection,
  CtaSection,
  ExplorerSection,
  FaqSection,
  ModulesSection,
  PricingSection,
  StartLink,
  StepsSection,
  TourSection,
  TrustSection,
} from "../../components/site/Sections.jsx";
import { MODULE_COUNT, STATS, TECH } from "../../lib/site";
import { useTitle } from "../../hooks/useTitle";

export default function Landing() {
  useTitle();
  return (
    <main>
      <section className="s-wrap hero">
        <a className="hero-pill" href="#modules">
          <i aria-hidden="true" />
          Claude-powered · {MODULE_COUNT} modules · one shared memory
          <span aria-hidden="true">→</span>
        </a>
        <h1>
          <span>One workspace.</span>
          <span>Every developer tool.</span>
          <span className="grad">One AI brain.</span>
        </h1>
        <p className="s-lede">
          Chat, code, research, query, test, debug and deploy from one place. Every agent shares your memory and can
          search your PDFs, docs and repositories.
        </p>
        <div className="row wrap">
          <StartLink />
          <Link className="btn lg" to="/features">
            See how it works
          </Link>
        </div>
        <p className="muted small" style={{ marginTop: 14 }}>
          Free to start. Bring your own Anthropic key.
        </p>
        <div className="hero-stats">
          {STATS.map(([n, l]) => (
            <div key={l}>
              <b>{n}</b>
              <span>{l}</span>
            </div>
          ))}
        </div>
        <ul className="hero-tech" aria-label="Built with">
          {TECH.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
      <AboutSection />
      <CapsSection />
      <TourSection />
      <ExplorerSection />
      <ModulesSection />
      <StepsSection />
      <TrustSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
    </main>
  );
}
