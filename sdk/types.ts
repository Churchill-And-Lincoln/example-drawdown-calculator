// The Churchill & Lincoln tool contract. This file MIRRORS the platform's
// shared types — do not edit it; your tool is validated against the
// platform's copy at publish time, and drift means rejection.

/** The standard output every tool must return. The platform renders this
 *  into the delivery page, the email and any downloads — identically for
 *  every tool on the marketplace. */
export interface Result {
  title: string;
  summary: string; // one-liner used in the delivery email
  blocks: ResultBlock[];
  attachments?: Attachment[]; // e.g. an Excel model; ≤ 5 MB total
}

export type ResultBlock =
  | { type: "markdown"; content: string }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "keyvalues"; items: { label: string; value: string }[] }
  | {
      type: "chart"; // rendered server-side as inline SVG
      kind: "line" | "bar";
      title: string;
      xLabels: string[];
      series: { name: string; values: number[] }[]; // ≤ 4 series
      yFormat?: "currency" | "number" | "percent";
    };

export interface Attachment {
  filename: string;
  mimeType: string;
  data: Uint8Array;
}

/** Declarative form definition — the platform renders it; you never write UI. */
export interface ToolSchema {
  fields: Field[];
}

export type Field =
  | { kind: "text"; id: string; label: string; required?: boolean; placeholder?: string }
  | { kind: "textarea"; id: string; label: string; required?: boolean; rows?: number }
  | { kind: "select"; id: string; label: string; options: string[]; required?: boolean }
  | { kind: "number"; id: string; label: string; min?: number; max?: number; required?: boolean };

/** Every price on the platform is a multiple of £5/$5 (500 pence/cents). */
export type PricingCurve =
  | { model: "descent" } // ↓ £5 per repeat purchase; floors at £5 (the law)
  | { model: "ascent"; capPence: number } // ↑ £5 per repeat purchase to your cap
  | { model: "flat" };

export interface ToolConfig {
  slug: string; // your tool's subdomain: <slug>.manyuseful.tools
  name: string;
  description: string;
  pricePence: number; // list/starting price — ≥ 500, multiple of 500
  currency: "gbp" | "usd";
  pricing: PricingCurve;
  /** Secret names your run() needs (set in the dashboard Secrets tab).
   *  Publishing is blocked until every one of these is set. */
  requiredSecrets?: string[];
}

/** What your run() receives. Secrets are the values you set in the
 *  dashboard, injected at execution time — never in your repo. */
export type ToolInput = Record<string, string>;
export type Secrets = Record<string, string>;

export interface ToolCtx {
  fetch: typeof fetch;
  log: (...args: unknown[]) => void;
}

export type RunFn = (
  input: ToolInput,
  secrets: Secrets,
  ctx: ToolCtx,
) => Promise<Result>;
