// Local mirror of the platform's publish-time validation. `npm run check`
// runs this; the publish workflow runs it; the platform runs its own copy
// server-side regardless. Fix everything here before pushing.
import type { ToolConfig, ToolSchema } from "./types";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
const RESERVED = new Set(["www", "app", "api", "admin", "r", "t", "tools", "assets", "static", "mail", "tech"]);
const note = (n: number) => Number.isInteger(n) && n >= 500 && n % 500 === 0;

export function validateTool(config: ToolConfig, schema: ToolSchema): string[] {
  const errs: string[] = [];

  if (!SLUG_RE.test(config.slug)) errs.push(`slug "${config.slug}": lowercase letters, digits and hyphens only, 1–40 chars`);
  if (RESERVED.has(config.slug)) errs.push(`slug "${config.slug}" is reserved`);
  if (!config.name?.trim() || config.name.length > 80) errs.push("name: required, ≤ 80 chars");
  if (!config.description?.trim() || config.description.length > 400) errs.push("description: required, ≤ 400 chars");
  if (config.currency !== "gbp" && config.currency !== "usd") errs.push("currency: must be gbp or usd");

  if (!note(config.pricePence)) errs.push(`pricePence ${config.pricePence}: must be ≥ 500 and a multiple of 500 (banknotes only)`);
  const p = config.pricing;
  if (!p) errs.push("pricing: required — { model: 'descent' | 'ascent' | 'flat' }");
  else if (p.model === "ascent" && (!note(p.capPence) || p.capPence < config.pricePence))
    errs.push(`ascent capPence ${p.capPence}: must be ≥ pricePence and a multiple of 500`);
  else if (p.model !== "descent" && p.model !== "ascent" && p.model !== "flat")
    errs.push(`pricing.model "${(p as { model: string }).model}": unknown`);

  for (const s of config.requiredSecrets ?? [])
    if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(s)) errs.push(`requiredSecrets "${s}": UPPER_SNAKE_CASE, 3–64 chars`);

  if (!schema.fields?.length) errs.push("schema: at least one field");
  if ((schema.fields?.length ?? 0) > 20) errs.push("schema: at most 20 fields");
  const ids = new Set<string>();
  for (const f of schema.fields ?? []) {
    if (!/^[a-z][a-zA-Z0-9_]{0,39}$/.test(f.id)) errs.push(`field id "${f.id}": start lowercase, alphanumeric/underscore, ≤ 40 chars`);
    if (ids.has(f.id)) errs.push(`field id "${f.id}": duplicate`);
    ids.add(f.id);
    if (!f.label?.trim()) errs.push(`field "${f.id}": label required`);
    if (f.kind === "select" && (!f.options?.length || f.options.length > 12))
      errs.push(`field "${f.id}": select needs 1–12 options`);
    if (f.kind === "number" && f.min !== undefined && f.max !== undefined && f.min > f.max)
      errs.push(`field "${f.id}": min > max`);
  }
  return errs;
}
