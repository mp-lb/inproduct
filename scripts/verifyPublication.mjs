import { readFileSync } from "node:fs";
import { URL } from "node:url";
import console from "node:console";
import process from "node:process";
import { setTimeout } from "node:timers/promises";

const verifyPublication = async () => {
  for (const directory of ["inproduct", "storage"]) {
    const { name, version } = JSON.parse(
      readFileSync(
        new URL(`../packages/${directory}/package.json`, import.meta.url),
        "utf8",
      ),
    );

    const url = `https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`;
    let published = false;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await globalThis.fetch(url, {
        signal: globalThis.AbortSignal.timeout(30000),
        headers: { "Cache-Control": "no-cache" },
      });

      if (response.ok) {
        const manifest = await response.json();

        if (
          manifest.version === version &&
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

    if (!published)
      throw Error(
        `${name}@${version} is not publicly installable. Check npm Staged Packages: a staged upload requires maintainer 2FA approval and is not a completed publication.`,
      );
    console.log(`Verified public manifest and tarball: ${name}@${version}`);
  }
};

verifyPublication().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
