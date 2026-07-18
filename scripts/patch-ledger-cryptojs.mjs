// @rango-dev/provider-ledger bundles an old crypto-js UMD build whose AMD
// branch references "./core" and "./sha256" — files that don't exist in the
// published package. Bundlers (webpack/Turbopack) resolve those references
// statically and fail with "Module not found".
//
// The AMD branch never executes at runtime (the CommonJS branch is always
// taken in our builds), so empty stubs are enough to satisfy the resolver.
// Runs automatically via the postinstall hook.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(
  process.cwd(),
  "node_modules",
  "@rango-dev",
  "provider-ledger",
  "dist",
);

for (const name of ["core.js", "sha256.js"]) {
  const file = join(dist, name);
  if (existsSync(dist) && !existsSync(file)) {
    writeFileSync(
      file,
      "// Stub for bundler resolution — see scripts/patch-ledger-cryptojs.mjs\nmodule.exports = {};\n",
    );
    console.log(`[patch] wrote ${file}`);
  }
}
