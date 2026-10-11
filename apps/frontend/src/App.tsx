import { BuildingBlocks } from "./landing/BuildingBlocks"
import { TechStack } from "./landing/TechStack"
import "./landing/landing.css"

export const App = () => (
  <div className="site-shell">
    <a className="skip-link" href="#main">
      Skip to content
    </a>
    <header className="site-header">
      <a className="wordmark" href="#" aria-label="InProduct home">
        <span className="brand-mark" aria-hidden="true">
          [ip]
        </span>{" "}
        InProduct
      </a>
      <nav aria-label="Main navigation">
        <a href="#building-blocks">The bits</a>
        {import.meta.env.VITE_DOCS_URL && (
          <a href={import.meta.env.VITE_DOCS_URL}>Docs</a>
        )}
      </nav>
    </header>
    <main id="main">
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">
          <span className="status-dot" /> Small tools. Home-grown software.
        </p>
        <h1 id="hero-title">
          Useful things.
          <br />
          Inside <span className="highlight">your product.</span>
        </h1>
        <p className="hero-description">
          A collection of small, composable building blocks for the stuff you
          keep rebuilding. Your data, your code, your slightly peculiar way of
          doing things.
        </p>
      </section>
      <BuildingBlocks />
      <TechStack />
    </main>
    <footer className="site-footer">
      <p>
        <span aria-hidden="true">[ip]</span> InProduct
      </p>
      <a href="#">Back to top ↑</a>
    </footer>
  </div>
)
