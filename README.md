# Pension Drawdown Modeller — an example tool for ManyUseful.Tools

This repo is a **worked example** of a marketplace tool built for
[ManyUseful.Tools](https://manyuseful.tools), the pay-per-use tool
marketplace from Churchill & Lincoln. It exists to show what a complete,
publishable tool looks like — use it as a reference or as the starting
point for your own tool.

## What the tool does

**"How long will the pot actually last?"**

The buyer enters a few details about their pension and retirement plans and
gets back a year-by-year drawdown projection:

- **A verdict** — the age the pot runs out, or confirmation it lasts beyond 100.
- **Key figures** — pot after any tax-free lump sum, and the yearly draw
  before and after the State Pension starts at 68.
- **A line chart** of the pot balance by age.
- **A year-by-year table** — amount drawn, growth, and closing balance.
- **A downloadable Excel model** with live formulas. Change the income,
  growth rate, or lump-sum percentage on the Inputs sheet and the whole
  projection recalculates.

The model works in real (after-inflation) terms, allows a tax-free lump sum
of up to 25%, offsets the full or partial State Pension from age 68, and
ignores income tax (a v1 simplification, flagged in both the result and the
spreadsheet). It is illustrative only, not financial advice.

It is priced flat at £10 and needs **no API keys** — it's pure arithmetic,
so you can run it locally straight away.

## How it's built

A ManyUseful.Tools tool is one function plus a form; the platform handles
the storefront, payment, rendering, email, and the buyer's permanent result
link. Everything specific to this tool lives in `tool/`:

| File | What it is |
|---|---|
| `config.ts` | Slug, name, description, price (£10, flat), required secrets (none) |
| `schema.ts` | The buyer's form, declared as fields — the platform renders it |
| `run.ts` | `computeDrawdown()` builds the projection; `run()` turns it into result blocks and the attachment |
| `xlsx.ts` | Builds the Excel workbook with live formulas from the model |
| `excel.ts` | Small helper around the `xlsx` package for writing cells and formulas |

`run(input, secrets, ctx)` receives the buyer's validated answers and
returns a **Result**: a title, a one-line summary, content blocks
(key-values, chart, table, markdown) and the `.xlsx` attachment. If it
throws, the buyer is refunded — so it never returns a degraded result.

Everything outside `tool/` (`sdk/`, `dev/`, `scripts/`, the workflow) is
platform scaffolding and should not be edited.

## Run it locally

```bash
npm install
cp .env.example .env      # no secrets needed for this example
npm run dev               # → http://localhost:5150
```

The dev server renders the form, runs `run()`, and previews the result
including the Excel download. `npm run check` validates the config and
schema against the platform's rules.

## Making your own tool

Use this repo as a template (the green "Use this template" button on
GitHub — don't fork), then replace the contents of `tool/` with your own
config, schema, and `run()`.

### The rules of the house

- **Banknotes only.** Every price is a multiple of £5/$5. `config.ts`
  declares one of three pricing curves:
  - `descent` — price drops £5 per repeat purchase per buyer, flooring at £5.
  - `ascent` — starts at list and rises £5 per repeat purchase, up to a cap
    you set. List is your intro price and must be one you're happy with forever.
  - `flat` — name your price and stand by it.
- **Buyers have no accounts.** Repeat-purchase pricing works through return
  links in the result emails; your tool never needs to know.
- **If `run()` throws, the buyer is refunded, not shortchanged.** The
  platform retries twice, then refunds. Throw on failure; never return an
  empty or degraded result for a paid output.
- **Your API keys are yours.** Declare names in `requiredSecrets`, set the
  values in the dashboard's Secrets tab. They're stored encrypted inside
  your tool's own sandbox and their cost comes out of your margin.
- **Runtime:** TypeScript only, bundled to one file. No filesystem, no
  native modules, HTTP via `ctx.fetch` only, finish within a couple of
  minutes. At most 20 form fields.
- **Attachments:** up to 5 MB total per result. Spreadsheets with live
  formulas beat static values — buyers love a model they can edit.

### Publishing

1. Sign in at **app.manyuseful.tools** with GitHub and connect your Stripe
   account (you're the merchant of record; buyers pay you directly and you
   keep 95% of every sale).
2. Create your tool there, pick the slug (it becomes
   `your-slug.manyuseful.tools`) and copy the **deploy token**.
3. In your repo: Settings → Secrets and variables → Actions → add
   `CL_DEPLOY_TOKEN`.
4. Set any `requiredSecrets` values in the dashboard's Secrets tab.
5. **Push to main.** The included workflow validates, bundles, and
   publishes. The first version gets a quick human review; after approval,
   every push deploys live automatically.

The form is the product: buyers pay for what comes out, and what comes out
depends on what your questions extract. Six sharp questions beat twenty
vague ones.

Questions: **support@manyuseful.tools**
