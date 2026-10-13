import { URL } from "node:url";
import console from "node:console";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const output = new URL("../apps/docs/build/client/", import.meta.url);
const read = (path) => readFileSync(new URL(path, output), "utf8");

for (const [path, title] of [
  ["", "InProduct"],
  ["installation/", "Installation"],
  ["backend/", "Backend integration"],
  ["storage/", "Object storage"],
  ["myshop/", "MyShop local example"],
]) {
  assert.ok(
    read(`docs/${path}index.html`).includes(title),
    `missing HTML: ${title}`,
  );

  assert.ok(
    read(`llms.mdx/docs/${path}content.md`).includes(title),
    `missing Markdown: ${title}`,
  );
}

assert.equal(
  read("404.html"),
  read("__spa-fallback.html"),
  "missing SPA 404 fallback",
);

const full = read("llms-full.txt");
assert.ok(full.includes("zap task myshop"));
assert.ok(
  !full.includes("TypeScript Coding Guidelines"),
  "internal standards leaked into public docs",
);

assert.ok(read("api/search").includes("MyShop"), "search index missing MyShop");
const storageMarkdown = read("llms.mdx/docs/storage/content.md");

for (const marker of [
  "createStorage",
  "maxBytes",
  "Memory storage is ephemeral",
]) {
  assert.ok(
    storageMarkdown.includes(marker),
    `storage Markdown missing: ${marker}`,
  );

  assert.ok(
    full.includes(marker),
    `agent bundle missing storage content: ${marker}`,
  );
}

assert.ok(
  read("api/search").includes("/docs/storage"),
  "search index missing storage guide",
);

assert.ok(
  read("docs/installation/index.html").includes('href="/docs/storage"'),
  "documentation navigation missing storage guide",
);

console.log("Verified prerendered documentation, Markdown and local search.");
