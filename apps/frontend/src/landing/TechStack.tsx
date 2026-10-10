const frameworks = ["Express", "Fastify", "Next.js", "Node.js HTTP"]

export const TechStack = () => (
  <section className="stack-section" aria-labelledby="stack-title">
    <h2 id="stack-title">The stack</h2>
    <div className="stack-foundations">
      <div>
        <h3>MongoDB</h3>
        <p>
          Designed for MongoDB. The modules store their data in your database.
        </p>
      </div>
      <div>
        <h3>tRPC</h3>
        <p>Mount the modules’ tRPC routers in your existing Node.js server.</p>
      </div>
    </div>
    <p className="stack-caption">Bring your server framework.</p>
    <ul
      className="framework-list"
      aria-label="Server options through tRPC adapters"
    >
      {frameworks.map((framework) => (
        <li key={framework}>{framework}</li>
      ))}
    </ul>
    <p className="stack-note">
      Framework compatibility comes through{" "}
      <a href="https://trpc.io/">tRPC’s adapters</a>, including other Node.js
      frameworks supported by tRPC.
    </p>
  </section>
)
