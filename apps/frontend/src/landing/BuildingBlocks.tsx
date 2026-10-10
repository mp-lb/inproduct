const blocks = [
  {
    name: "Feature flags",
    description: "Turn features on or off for specific users.",
    symbol: "[±]",
  },
  {
    name: "Audit logs",
    description: "Track who changed what, and when.",
    symbol: "[≡]",
  },
  {
    name: "AI observability",
    description: "Inspect AI requests, responses, and costs.",
    symbol: "[◎]",
  },
  {
    name: "Notifications",
    description: "Send and manage notifications from your app.",
    symbol: "[!]",
  },
  {
    name: "Prompts",
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
          <h3>{block.name}</h3>
          <p>{block.description}</p>
        </li>
      ))}
    </ul>
    <p className="workbench-note">
      Modules are in development and aren’t available yet.
    </p>
  </section>
)
