import type { Config } from "@react-router/dev/config";
import { glob } from "node:fs/promises";
import { createGetUrl, getSlugs } from "fumadocs-core/source";

const getUrl = createGetUrl("/docs");
export default {
  ssr: false,
  async prerender() {
    const paths = ["/", "/api/search", "/llms.txt", "/llms-full.txt"];

    for await (const entry of glob("**/*.mdx", { cwd: "../../docs/public" })) {
      const slugs = getSlugs(entry);
      paths.push(
        getUrl(slugs),
        `/llms.mdx/docs/${[...slugs, "content.md"].join("/")}`,
      );
    }

    return paths;
  },
} satisfies Config;
