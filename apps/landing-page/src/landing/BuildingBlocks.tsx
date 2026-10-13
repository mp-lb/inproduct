const blocks = [
  {
    name: "Feature flags",
    anchor: "feature-flags",
    description: "Turn features on or off for specific users.",
    symbol: "[±]",
  },
  {
    name: "Audit logs",
    anchor: "audit-logs",
    description: "Track who changed what, and when.",
    symbol: "[≡]",
  },
  {
    name: "AI observability",
    anchor: "ai-observability",
    description: "Inspect AI requests, responses, and costs.",
    symbol: "[◎]",
  },
  {
    name: "Notifications",
    anchor: "notifications",
    description: "Send and manage notifications from your app.",
    symbol: "[!]",
  },
  {
    name: "Prompts",
    anchor: "prompts",
    description: "Manage prompts as version-controlled Markdown.",
    symbol: "[>]",
  },
]

export const BuildingBlocks = () => (
  <section
    id="building-blocks"
    className="blocks-section"
    aria-labelledby="blocks-title"
  >
    <div className="section-heading">
      <h2 id="blocks-title">The pieces</h2>
      <span className="status-label">In development</span>
    </div>
    <ul className="block-list">
      {blocks.map((block) => (
        <li key={block.name}>
          <span className="block-symbol" aria-hidden="true">
            {block.symbol}
          </span>
          <h3>
            {import.meta.env.VITE_DOCS_URL ? (
              <a href={`${import.meta.env.VITE_DOCS_URL}#${block.anchor}`}>
                {block.name}
              </a>
            ) : (
              block.name
            )}
          </h3>
          <p>{block.description}</p>
        </li>
      ))}
    </ul>
    <p className="workbench-note">
      Modules are in development and aren’t available yet.
    </p>
  </section>
)
