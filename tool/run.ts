import type { Result, ResultBlock, ToolCtx } from "../sdk/types";
import { buildDrawdownXlsx } from "./xlsx";

export const DISCLAIMER_BLOCK: ResultBlock = {
  type: "markdown",
  content: `---

> _This is an illustrative model built from your inputs and the stated
> assumptions — not financial advice. Growth is applied in real (after-
> inflation) terms; actual returns vary year to year, and rates and tax
> rules change. Check anything important with a professional before acting._`,
};

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** "£1,234,567" — whole pounds, thousands separators. */
export const gbp = (n: number): string =>
  `£${Math.round(n).toLocaleString("en-GB")}`;

export const num = (input: Record<string, string>, id: string, fallback = 0): number => {
  const n = Number(input[id]);
  return Number.isFinite(n) ? n : fallback;
};

export const STATE_PENSION_FULL = 11973;
export const STATE_PENSION_AGE = 68;

export const pensionAmount = (choice: string): number =>
  choice.startsWith("Full") ? STATE_PENSION_FULL : choice.startsWith("Partial") ? STATE_PENSION_FULL / 2 : 0;

export interface DrawdownModel {
  startAge: number;
  pot: number;
  income: number;
  pension: number; // £/yr from 68
  growth: number; // %
  lumpPct: number; // 0–25
  lumpTaken: number;
  years: { age: number; draw: number; growth: number; balance: number }[];
  depletionAge: number | null; // null = lasts beyond 100
}

export function computeDrawdown(input: Record<string, string>): DrawdownModel {
  const startAge = num(input, "startAge");
  const pot = num(input, "pot");
  const income = num(input, "income");
  const pension = pensionAmount(input.pension ?? "");
  const growth = num(input, "growth", 4);
  const lumpPct = Math.min(25, Math.max(0, num(input, "lumpSum", 0)));
  const lumpTaken = pot * (lumpPct / 100);

  let balance = pot - lumpTaken;
  const years: DrawdownModel["years"] = [];
  let depletionAge: number | null = null;
  for (let age = startAge; age <= 100; age++) {
    const draw = Math.max(0, income - (age >= STATE_PENSION_AGE ? pension : 0));
    const afterDraw = balance - draw;
    if (afterDraw <= 0) {
      years.push({ age, draw: balance, growth: 0, balance: 0 });
      depletionAge = age;
      break;
    }
    const g = afterDraw * (growth / 100);
    balance = afterDraw + g;
    years.push({ age, draw, growth: g, balance });
  }
  return { startAge, pot, income, pension, growth, lumpPct, lumpTaken, years, depletionAge };
}

export async function run(
  input: Record<string, string>,
  _secrets: Record<string, string>,
  _ctx: ToolCtx,
): Promise<Result> {
  const m = computeDrawdown(input);
  const verdict =
    m.depletionAge === null
      ? "Lasts beyond age 100 on these assumptions"
      : `Runs out at age ${m.depletionAge}`;

  const blocks: ResultBlock[] = [
    {
      type: "keyvalues",
      items: [
        { label: "The verdict", value: verdict },
        { label: "Pot after lump sum", value: `${gbp(m.pot - m.lumpTaken)}${m.lumpPct ? ` (took ${gbp(m.lumpTaken)} tax-free)` : ""}` },
        {
          label: "Yearly draw from the pot",
          value: `${gbp(Math.max(0, m.income - m.pension))} once the State Pension starts at ${STATE_PENSION_AGE} (${gbp(m.income)} before)`,
        },
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
    {
      type: "markdown",
      content:
        "_Income tax is ignored in this v1 model — the draw shown is gross. The Excel notes say the same._",
    },
    DISCLAIMER_BLOCK,
  ];

  return {
    title: "Your Pension Drawdown Projection",
    summary: verdict,
    blocks,
    attachments: [
      { filename: "drawdown-model.xlsx", mimeType: XLSX_MIME, data: buildDrawdownXlsx(m) },
    ],
  };
}
