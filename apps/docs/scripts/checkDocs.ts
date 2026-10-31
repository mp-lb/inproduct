import { URL } from "node:url";
import console from "node:console";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const output = new URL("../build/client/", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, output), "utf8");

for (const [path, title] of [
  ["", "InProduct"],
  ["installation/", "Installation"],
  ["backend/", "Backend integration"],
  ["storage/", "File storage"],
  ["file-library/", "Managed file library"],
  ["file-types/", "File types and names"],
  ["data-jobs/", "Data jobs"],
  ["myshop/", "MyShop local example"],
] as const) {
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
  "createFileStorage",
  "useFileStorage",
  "maxBytes",
  "Memory storage is ephemeral",
  "createMongoFileStorageAdapter",
  "createMongoStorageAdapter",
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

const libraryMarkdown = read("llms.mdx/docs/file-library/content.md");

for (const marker of [
  "createFileLibrary",
  "createS3FileDriver",
  "createMongoFileLibraryRepository",
  "createFileReferenceCoordinator",
  "createFileAuditDispatcher",
  "replica set is required",
  "Extension contracts",
]) {
  assert.ok(
    libraryMarkdown.includes(marker),
    `file library Markdown missing: ${marker}`,
  );

  assert.ok(
    full.includes(marker),
    `agent bundle missing file library content: ${marker}`,
  );
}

const typesMarkdown = read("llms.mdx/docs/file-types/content.md");

for (const marker of [
  "defaultFileTypeRegistry",
  "createFileTypeRegistry",
  "identifyFileType",
  "describeFileDownload",
  "Recognition is not validation",
]) {
  assert.ok(
    typesMarkdown.includes(marker),
    `file types Markdown missing: ${marker}`,
  );

  assert.ok(
    full.includes(marker),
    `agent bundle missing file types content: ${marker}`,
  );
}

for (const marker of ["Type policy", "Records from 0.1.6 and earlier"])
  assert.ok(
    libraryMarkdown.includes(marker),
    `file library Markdown missing: ${marker}`,
  );

assert.ok(
  read("api/search").includes("/docs/file-types"),
  "search index missing file types guide",
);

assert.ok(
  read("docs/installation/index.html").includes('href="/docs/file-types"'),
  "documentation navigation missing file types guide",
);

assert.ok(
  read("api/search").includes("/docs/file-library"),
  "search index missing file library guide",
);

assert.ok(
  read("docs/installation/index.html").includes('href="/docs/file-library"'),
  "documentation navigation missing file library guide",
);

assert.ok(
  read("api/search").includes("/docs/storage"),
  "search index missing storage guide",
);

assert.ok(
  read("docs/installation/index.html").includes('href="/docs/storage"'),
  "documentation navigation missing storage guide",
);

console.log("Verified prerendered documentation, Markdown and local search.");

const dataJobsMarkdown = read("llms.mdx/docs/data-jobs/content.md");

for (const marker of [
  "createDataJobRunner",
  "createRemoveFieldsJob",
  "defineDataJob",
  "mountDataJobsPanel",
  "runDataJobsCli",
  "safe_to_rerun",
  "exactly-once",
]) {
  assert.ok(
    dataJobsMarkdown.includes(marker),
    `data jobs Markdown missing: ${marker}`,
  );

  assert.ok(
    full.includes(marker),
    `agent bundle missing data jobs content: ${marker}`,
  );
}
