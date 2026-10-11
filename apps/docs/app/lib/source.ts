import { llms, loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import { docsRoute } from "./shared";

export const docs = defineDocs({
  dir: "../../docs/public",
  docs: {
    // Four short guides fit in one bundle: keep hydration synchronous.
    async: false,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: docsRoute,
});

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText("processed")}`,
});
