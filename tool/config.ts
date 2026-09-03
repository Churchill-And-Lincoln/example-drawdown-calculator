import type { ToolConfig } from "../sdk/types";

// YOUR TOOL. Edit everything below. Every price is a multiple of £5/$5.
export const config: ToolConfig = {
  slug: "agenda", // becomes agenda.manyuseful.tools — must match the slug you create in the dashboard
  name: "Meeting Agenda & Minutes Kit",
  description:
    "Answer six questions about your meeting and get a tight, time-boxed agenda, a decisions-and-actions minutes template, and a follow-up message ready to send.",
  pricePence: 500, // £5
  currency: "gbp",
  pricing: { model: "flat" }, // or { model: "descent" } or { model: "ascent", capPence: 2000 }
  // Secrets your run() needs — set values in the dashboard's Secrets tab.
  // Publishing is blocked until every listed secret is set. This example
  // works WITHOUT a key (offline fallback), so nothing is required:
  requiredSecrets: [], // e.g. ["OPENAI_API_KEY"] if your tool must have it
};
