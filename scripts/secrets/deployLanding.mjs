import process from "node:process";
import console from "node:console";
import { setTimeout } from "node:timers/promises";
import { readStandardSecrets } from "./readStandardSecrets.mjs";
import { selectCredentials } from "./selectCredentials.mjs";
import { maskCommand } from "./secretProcess.mjs";

const team = "team_1w5PsP1pNWCex9vAwF4PqvTs";
const domain = "inproduct.mp-lb.dev";

const main = async () => {
  if (
    process.env.GITHUB_ACTIONS !== "true" ||
    process.env.GITHUB_REPOSITORY !== "mp-lb/inproduct" ||
    process.env.GITHUB_REF !== "refs/heads/main"
  )
    throw Error("Landing deployment requires repository main CI.");
  const sha = process.env.GITHUB_SHA;
  if (!/^[a-f0-9]{40}$/.test(sha ?? "")) throw Error("Missing commit SHA.");
  const key = process.env.SECRETS_KEY;
  delete process.env.SECRETS_KEY;
  const values = await readStandardSecrets(process.cwd(), key);
  const { VERCEL_TOKEN: token } = selectCredentials(values, "deploy");
  process.stdout.write(maskCommand(token));

  const request = async (path, method = "GET", body) => {
    const response = await globalThis.fetch(
      `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${team}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: globalThis.AbortSignal.timeout(30000),
      },
    );

    if (!response.ok)
      throw Error(`Provider request failed: ${method} ${response.status}.`);
    return response.json();
  };

  const result = await request("/v9/projects?search=inproduct&limit=100");
  if (result.pagination?.next)
    throw Error(
      "Project search requires pagination; refusing ambiguous selection.",
    );
  const matches = [];

  for (const project of result.projects) {
    if (project.link?.org !== "mp-lb" || project.link?.repo !== "inproduct")
      continue;

    const { domains } = await request(
      `/v9/projects/${encodeURIComponent(project.id)}/domains`,
    );

    if (domains.some((entry) => entry.name === domain)) matches.push(project);
  }

  if (matches.length !== 1)
    throw Error("Expected one repository project owning the landing domain.");
  const project = matches[0];
  if (!["apps/frontend", "apps/landing-page"].includes(project.rootDirectory))
    throw Error("Unexpected landing root directory; refusing mutation.");
  await request(`/v9/projects/${project.id}`, "PATCH", {
    rootDirectory: "apps/landing-page",
  });

  const updated = await request(`/v9/projects/${project.id}`);
  if (updated.rootDirectory !== "apps/landing-page")
    throw Error("Landing root update did not persist.");
  console.log(`Updated landing root for ${domain}.`);

  const deployment = await request("/v13/deployments", "POST", {
    name: project.name,
    project: project.id,
    target: "production",
    gitSource: { type: "github", repoId: project.link.repoId, ref: sha },
  });

  console.log(`Created landing deployment ${deployment.id} for ${sha}.`);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const status = await request(`/v13/deployments/${deployment.id}`);

    if (status.readyState === "READY") {
      console.log(`Landing is READY: https://${domain} (${sha}).`);
      return;
    }

    if (["ERROR", "CANCELED"].includes(status.readyState))
      throw Error(`Landing deployment ${status.readyState}.`);
    await setTimeout(10000);
  }

  throw Error(
    "Landing deployment timed out; inspect provider state before retrying.",
  );
};

main().catch((error) => {
  // Never emit provider bodies, request objects, credentials, or crypto diagnostics.
  const message = error instanceof Error ? error.message : "";
  console.error(
    /^(Landing |Provider request failed:|Expected one |Unexpected landing |Project search |Missing commit)/.test(
      message,
    )
      ? message
      : "Landing deployment failed; details withheld to protect credentials.",
  );

  process.exitCode = 1;
});
