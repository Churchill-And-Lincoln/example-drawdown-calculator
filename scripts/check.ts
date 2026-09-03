// `npm run check` — the same validation the publish workflow runs, and a
// local mirror of the platform's server-side checks.
import { config } from "../tool/config";
import { schema } from "../tool/schema";
import { validateTool } from "../sdk/validate";

const errs = validateTool(config, schema);
if (errs.length) {
  console.error(`✗ ${config.slug}: ${errs.length} problem(s)`);
  for (const e of errs) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ ${config.slug}: config and schema valid (${schema.fields.length} fields, £${config.pricePence / 100} ${config.pricing.model})`);
