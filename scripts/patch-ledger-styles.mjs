// @ledgerhq/ledger-wallet-provider (pulled in by @rango-dev/provider-ledger-wallet
// since widget-embedded 0.63.1-next.x) ships a styles.css that uses
// `@layer base`. Tailwind's PostCSS plugin reserves that layer name and
// hard-fails when the file doesn't also contain `@tailwind base`:
//   "@layer base is used but no matching @tailwind base directive is present"
// which broke the Vercel production build (webpack css-loader error).
//
// Fix: rename the layer to a non-reserved name. Cascade layers are just CSS —
// the rules keep working, Tailwind stops intercepting them.
// Runs automatically via the postinstall hook.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const file = join(
  process.cwd(),
  "node_modules",
  "@ledgerhq",
  "ledger-wallet-provider",
  "dist",
  "styles.css",
);

if (existsSync(file)) {
  const css = readFileSync(file, "utf8");
  if (css.includes("@layer base")) {
    writeFileSync(file, css.replaceAll("@layer base", "@layer ledger-wallet"));
    console.log(`[patch] renamed @layer base in ${file}`);
  }
}
