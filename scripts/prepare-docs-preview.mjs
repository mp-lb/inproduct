import { copyFileSync } from "node:fs";
import { URL } from "node:url";

const output = new URL("../apps/docs/build/client/", import.meta.url);

// Serve existing prerendered routes first; use the SPA shell only for missing paths.
copyFileSync(
  new URL("__spa-fallback.html", output),
  new URL("404.html", output),
);
