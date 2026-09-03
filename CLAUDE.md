# CLAUDE.md — Churchill & Lincoln tool template

This repo is a single marketplace tool for manyuseful.tools. The developer
edits ONLY tool/config.ts, tool/schema.ts, tool/run.ts. Everything else
(sdk/, dev/, scripts/, workflow) is platform scaffolding — do not modify it,
and do not add frameworks, servers, or UI code; the platform renders forms
and results.

Contract: run(input, secrets, ctx) => Result. input = buyer's answers
(strings by field id). secrets = values set in the dashboard, names declared
in config.requiredSecrets. ctx.fetch for all HTTP. Throw on failure (buyer
gets refunded); never return degraded output for a paid result.

Hard rules: prices in pence, ≥ 500, multiples of 500; ascent cap ≥ list;
slug lowercase-hyphen; ≤ 20 form fields; attachments ≤ 5 MB total; finish
within ~2 minutes; TypeScript only, no filesystem or native modules; no new
dependencies unless run.ts genuinely needs them (bundled size matters).

Verify work with: npm run check (validation) and npm run dev
(http://localhost:5150 — form → run → preview, secrets from .env).
Publishing happens via push to main once CL_DEPLOY_TOKEN is set; never
commit .env or any secret value.
