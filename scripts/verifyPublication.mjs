import console from "node:console";
import process from "node:process";
import { setTimeout } from "node:timers/promises";

const verifyPublication = async () => {
  for (const directory of ["inproduct", "storage"]) {
    const name =
      directory === "inproduct"
        ? "@mp-lb/inproduct"
        : "@mp-lb/inproduct-storage";

    const url = `https://registry.npmjs.org/${encodeURIComponent(name)}/latest`;
    let published = false;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await globalThis.fetch(url, {
        signal: globalThis.AbortSignal.timeout(30000),
        headers: { "Cache-Control": "no-cache" },
      });

      if (response.ok) {
        const manifest = await response.json();

        if (
          typeof manifest.version === "string" &&
          manifest.dist?.tarball?.startsWith("https://registry.npmjs.org/")
        ) {
          const tarball = await globalThis.fetch(manifest.dist.tarball, {
            method: "HEAD",
            signal: globalThis.AbortSignal.timeout(30000),
          });

          published = tarball.ok;
        }
      } else if (response.status !== 404) {
        throw Error(`Registry verification returned HTTP ${response.status}.`);
      }

      if (published) break;
      if (attempt < 5) await setTimeout(10000);
    }

    if (!published) throw Error(`${name} is not publicly installable.`);
    console.log(`Verified public manifest and tarball: ${name}`);
  }
};

verifyPublication().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
