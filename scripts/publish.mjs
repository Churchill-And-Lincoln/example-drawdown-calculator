// Bundles the tool and publishes it to Churchill & Lincoln.
// Runs in CI (.github/workflows/publish.yml) on every push to main, or
// locally: CL_DEPLOY_TOKEN=... node scripts/publish.mjs
// Get your deploy token when you create the tool at app.manyuseful.tools.
import { build } from "esbuild";
import { execSync } from "node:child_process";

const API = process.env.CL_PUBLISH_URL ?? "https://app.manyuseful.tools/api/publish";
const token = process.env.CL_DEPLOY_TOKEN;

// 1. Validate (fails the run before anything is sent)
execSync("npx tsx scripts/check.ts", { stdio: "inherit" });

if (!token) {
  console.log("↷ CL_DEPLOY_TOKEN not set — validation only, skipping publish.");
  console.log("  Add it as a repository Actions secret to enable publishing.");
  process.exit(0);
}

// 2. Bundle run.ts (the platform wraps it in its own Worker shim)
const bundle = await build({
  entryPoints: ["tool/index.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  write: false,
  minify: true,
});
const code = bundle.outputFiles[0].text;

// 3. Send bundle + config + schema + git sha
const { config } = await import("../tool/config.ts");
const { schema } = await import("../tool/schema.ts");
const sha = process.env.GITHUB_SHA ?? execSync("git rev-parse HEAD").toString().trim();

const res = await fetch(API, {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify({ config, schema, code, gitSha: sha }),
});
const text = await res.text();
if (!res.ok) {
  console.error(`✗ publish failed (${res.status}): ${text}`);
  process.exit(1);
}
console.log(`✓ published ${config.slug} @ ${sha.slice(0, 7)} — ${text}`);
