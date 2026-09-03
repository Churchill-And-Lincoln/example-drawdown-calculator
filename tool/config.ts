import type { ToolConfig } from "../sdk/types";

// YOUR TOOL. Edit everything below. Every price is a multiple of £5/$5.
export const config: ToolConfig = {
  slug: "drawdown",
  name: "Pension Drawdown Modeller",
  description:
    "How long will the pot actually last? Year-by-year drawdown projection with chart and table, plus a downloadable Excel model with live formulas — change growth or income and it recalculates.",
  pricePence: 1000,
  currency: "gbp",
  pricing: { model: "flat" },
  requiredSecrets: [], // e.g. ["OPENAI_API_KEY"] if your tool must have it
};
