import type { ToolSchema } from "../sdk/types";

/** Matched by prefix ("Full" / "Partial") in pensionAmount() in run.ts. */
export const PENSION_OPTIONS = [
  "Full State Pension",
  "Partial State Pension (roughly half)",
  "None",
];

export const schema: ToolSchema = {
  fields: [
    { kind: "number", id: "startAge", label: "Drawdown start age", min: 55, max: 80, required: true },
    { kind: "number", id: "pot", label: "Pension pot (£)", min: 1, max: 100_000_000, required: true },
    { kind: "number", id: "income", label: "Desired annual income (£)", min: 1, max: 10_000_000, required: true },
    { kind: "select", id: "pension", label: "State Pension expectation", options: PENSION_OPTIONS, required: true },
    { kind: "number", id: "growth", label: "Real growth % per year (typically 4)", min: 0, max: 20, required: true },
    { kind: "number", id: "lumpSum", label: "Tax-free lump sum taken at start, % of pot (0–25, optional)", min: 0, max: 25 },
  ],
};
