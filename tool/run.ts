import type { ResultBlock, RunFn } from "../sdk/types";
import { buildDrawdownXlsx } from "./xlsx";
import {
  DEFAULT_GROWTH_PCT,
  MAX_AGE,
  MAX_LUMP_PCT,
  STATE_PENSION_AGE,
  STATE_PENSION_FULL,
  XLSX_MIME,
} from "./constants";

// ---------------------------------------------------------------------------
// Static blocks
// ---------------------------------------------------------------------------

const DISCLAIMER_BLOCK: ResultBlock = {
  type: "markdown",
  content: `---

> _This is an illustrative model built from your inputs and the stated
> assumptions — not financial advice. Growth is applied in real (after-
> inflation) terms; actual returns vary year to year, and rates and tax
> rules change. Check anything important with a professional before acting._`,
};

const TAX_NOTE_BLOCK: ResultBlock = {
  type: "markdown",
  content:
    "_Income tax is ignored in this v1 model — the draw shown is gross. The Excel notes say the same._",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "£1,234,567" — whole pounds, thousands separators. */
export const gbp = (n: number): string =>
  `£${Math.round(n).toLocaleString("en-GB")}`;

/** Read a numeric field from the form input, falling back if missing or non-numeric. */
const num = (input: Record<string, string>, id: string, fallback = 0): number => {
  const n = Number(input[id]);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** £/yr of State Pension implied by the select choice (see PENSION_OPTIONS in schema.ts). */
export const pensionAmount = (choice: string): number => {
  if (choice.startsWith("Full")) return STATE_PENSION_FULL;
  if (choice.startsWith("Partial")) return STATE_PENSION_FULL / 2;
  return 0;
};

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export interface DrawdownYear {
  age: number;
  draw: number;
  growth: number;
  balance: number;
}

export interface DrawdownModel {
  startAge: number;
  pot: number;
  income: number;
  pension: number; // £/yr from STATE_PENSION_AGE
  growth: number; // % per year, real terms
  lumpPct: number; // 0–25
  lumpTaken: number;
  years: DrawdownYear[];
  depletionAge: number | null; // null = lasts beyond MAX_AGE
}

export function computeDrawdown(input: Record<string, string>): DrawdownModel {
  const startAge = num(input, "startAge");
  const pot = num(input, "pot");
  const income = num(input, "income");
  const pension = pensionAmount(input.pension ?? "");
  const growth = num(input, "growth", DEFAULT_GROWTH_PCT);
  const lumpPct = clamp(num(input, "lumpSum"), 0, MAX_LUMP_PCT);
  const lumpTaken = pot * (lumpPct / 100);

  const years: DrawdownYear[] = [];
  let depletionAge: number | null = null;
  let balance = pot - lumpTaken;

  for (let age = startAge; age <= MAX_AGE; age++) {
    const pensionThisYear = age >= STATE_PENSION_AGE ? pension : 0;
    const draw = Math.max(0, income - pensionThisYear);
    const afterDraw = balance - draw;

    if (afterDraw <= 0) {
      years.push({ age, draw: balance, growth: 0, balance: 0 });
      depletionAge = age;
      break;
    }

    const growthAmount = afterDraw * (growth / 100);
    balance = afterDraw + growthAmount;
    years.push({ age, draw, growth: growthAmount, balance });
  }

  return { startAge, pot, income, pension, growth, lumpPct, lumpTaken, years, depletionAge };
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

const describeVerdict = (m: DrawdownModel): string =>
  m.depletionAge === null
    ? `Lasts beyond age ${MAX_AGE} on these assumptions`
    : `Runs out at age ${m.depletionAge}`;

const describePotAfterLump = (m: DrawdownModel): string => {
  const base = gbp(m.pot - m.lumpTaken);
  return m.lumpPct ? `${base} (took ${gbp(m.lumpTaken)} tax-free)` : base;
};

const describeYearlyDraw = (m: DrawdownModel): string =>
  `${gbp(Math.max(0, m.income - m.pension))} once the State Pension starts at ${STATE_PENSION_AGE} (${gbp(m.income)} before)`;

function buildBlocks(m: DrawdownModel, verdict: string): ResultBlock[] {
  return [
    {
      type: "keyvalues",
      items: [
        { label: "The verdict", value: verdict },
        { label: "Pot after lump sum", value: describePotAfterLump(m) },
        { label: "Yearly draw from the pot", value: describeYearlyDraw(m) },
      ],
    },
    {
      type: "chart",
      kind: "line",
      title: "Pot balance by age",
      xLabels: m.years.map((y) => String(y.age)),
      series: [{ name: "Balance", values: m.years.map((y) => Math.round(y.balance)) }],
      yFormat: "currency",
    },
    {
      type: "table",
      header: ["Age", "Drawn from pot", "Growth", "Balance at year end"],
      rows: m.years.map((y) => [String(y.age), gbp(y.draw), gbp(y.growth), gbp(y.balance)]),
    },
    TAX_NOTE_BLOCK,
    DISCLAIMER_BLOCK,
  ];
}

export const run: RunFn = async (input) => {
  const model = computeDrawdown(input);
  const verdict = describeVerdict(model);

  return {
    title: "Your Pension Drawdown Projection",
    summary: verdict,
    blocks: buildBlocks(model, verdict),
    attachments: [
      { filename: "drawdown-model.xlsx", mimeType: XLSX_MIME, data: buildDrawdownXlsx(model) },
    ],
  };
};
