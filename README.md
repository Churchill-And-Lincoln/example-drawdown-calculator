# Build a tool for Churchill & Lincoln

This is the official template for [manyuseful.tools](https://manyuseful.tools)
— the pay-per-use tool marketplace. You write **one function**; the platform
handles the storefront, the form, payment, delivery, email, and the buyer's
permanent result link. You keep **95% of every sale**, paid directly into
your own Stripe account at the moment of purchase.

## The whole contract

A tool is three files in `tool/`:

| File | What it is |
|---|---|
| `config.ts` | Name, description, price and pricing curve, required secrets |
| `schema.ts` | The buyer's form, declared as fields — the platform renders it |
| `run.ts` | `async (input, secrets, ctx) => Result` — your actual tool |

Your `run()` gets the buyer's validated answers and your secrets, does its
work (call an LLM, crunch numbers, whatever), and returns a **Result**: a
title, a one-line summary, and content blocks (markdown, tables, key-values,
charts) plus optional file attachments like an Excel model. The platform
renders that identically-branded for every tool on the marketplace. You
never write frontend, payment, or email code.

## Start here

```bash
# 1. Make your own repo from this template (green "Use this template"
#    button on GitHub — don't fork), then:
npm install
cp .env.example .env      # add any API keys your tool will use
npm run dev               # → http://localhost:5150
```

The dev server renders your form, runs your `run()` with the `.env` secrets,
and previews the result. The included example (a Meeting Agenda builder)
works with **no keys at all** — run it first, then gut `tool/` and build
yours. `npm run check` validates your config and schema against the
platform's rules at any time.

## The rules of the house

- **Banknotes only.** Every price is a multiple of £5/$5. Your `config.ts`
  declares one of three pricing curves, printed on your tool's card:
  - `descent` — your price drops £5 per repeat purchase per buyer, flooring
    at £5. The floor is platform law. Loyalty gets cheaper.
  - `ascent` — starts at your list price and rises £5 per repeat purchase
    per buyer, up to a cap you set. Price it knowing list is your intro
    price: buyers who don't use their return links pay list again, never
    more — so list must be a price you're happy with forever.
  - `flat` — name your price and stand by it.
- **Buyers have no accounts.** Repeat-purchase pricing works through return
  links in the result emails. Your tool doesn't need to know any of this.
- **If your run() throws, the buyer is refunded, not shortchanged.** The
  platform retries twice, then refunds. So *do* throw on failure — never
  return a degraded or empty result for a paid output.
- **Your API keys are yours.** Declare names in `requiredSecrets`, set the
  values in your dashboard's Secrets tab. They're stored encrypted by
  Cloudflare inside your tool's own sandbox — the platform can't read them,
  other tools can't reach them, and their cost comes out of your margin, so
  price accordingly.
- **Runtime:** TypeScript only, bundled to one file. No filesystem, no
  native modules, HTTP via `ctx.fetch` only, and finish within a couple of
  minutes (plenty for any LLM call). CPU and request limits are enforced.
- **Attachments:** up to 5 MB total per result. For spreadsheet outputs,
  generate the bytes yourself (e.g. with the `xlsx` package) and return
  them as an attachment — pro tip: sheets with live formulas beat static
  values; buyers love a model they can edit.

## Publishing

1. Sign in at **app.manyuseful.tools** with GitHub, connect your Stripe
   account (you're the merchant of record — buyers pay you directly).
2. Create your tool there: pick the slug (it becomes
   `your-slug.manyuseful.tools`) and copy the **deploy token**.
3. In your repo: Settings → Secrets and variables → Actions → add
   `CL_DEPLOY_TOKEN`.
4. Set any `requiredSecrets` values in the dashboard's Secrets tab.
5. **Push to main.** The included workflow validates, bundles, and
   publishes. First version goes to the founders for a quick human review
   (usually same-day); after approval, every push deploys live
   automatically.

The kill switch is ours; the tool, the price, the customers' money — yours.

## What good tools have in common

The form is the product: buyers pay for what comes out, and what comes out
depends on what your questions extract. Six sharp questions beat twenty
vague ones. Look at any tool on the marketplace and study its form before
writing yours.

Questions: **support@manyuseful.tools**
