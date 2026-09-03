// Drawdown Excel model: live formulas — edit income, growth, or the lump
// sum % on Inputs and the projection recalculates. Income tax ignored (v1).
import { buildXlsx, GBP, type Cell } from "./excel";
import type { DrawdownModel } from "./run";

export const STATE_PENSION_AGE = 68;

export function buildDrawdownXlsx(m: DrawdownModel): Uint8Array {
  // Inputs: B2 start age, B3 pot, B4 income, B5 pension/yr, B6 growth %,
  // B7 lump %.
  const I = "'Inputs & Assumptions'!";
  const inputs: Cell[][] = [
    ["Inputs & Assumptions", ""],
    ["Drawdown start age", m.startAge],
    ["Pension pot (£)", { v: m.pot, z: GBP }],
    ["Desired annual income (£) — editable", { v: m.income, z: GBP }],
    ["State Pension from 68 (£/yr)", { v: m.pension, z: GBP }],
    ["Real growth (%) — editable", m.growth],
    ["Tax-free lump sum % — editable", m.lumpPct],
    ["", ""],
    ["Note: income tax is ignored in this model; draws are gross.", ""],
  ];

  // Projection: A age, B draw, C growth, D balance at year end.
  // Row 2 = first drawdown year, starting from pot less the lump sum.
  const proj: Cell[][] = [["Age", "Drawn from pot", "Growth", "Balance at year end"]];
  const nYears = 100 - m.startAge + 1;
  for (let i = 0; i < nYears; i++) {
    const r = i + 2; // this row, 1-indexed
    const prevBal = i === 0 ? `${I}B3*(1-${I}B7/100)` : `D${r - 1}`;
    const y = m.years[i]; // undefined once the pot has run dry
    proj.push([
      { f: `${I}B2+${i}`, v: m.startAge + i },
      { f: `MIN(MAX(0,${I}B4-IF(A${r}>=${STATE_PENSION_AGE},${I}B5,0)),${prevBal})`, v: y?.draw ?? 0, z: GBP },
      { f: `MAX(0,(${prevBal})-B${r})*${I}B6/100`, v: y?.growth ?? 0, z: GBP },
      { f: `MAX(0,(${prevBal})-B${r})+C${r}`, v: y?.balance ?? 0, z: GBP },
    ]);
  }

  const summary: Cell[][] = [
    ["Summary", ""],
    [
      "Runs out at age",
      {
        f: `IFERROR(INDEX(Projection!A2:A${nYears + 1},MATCH(TRUE,INDEX(Projection!D2:D${nYears + 1}<=0,0),0)),"Lasts beyond 100")`,
        v: m.depletionAge ?? "Lasts beyond 100",
      },
    ],
    ["Pot after lump sum (£)", { f: `${I}B3*(1-${I}B7/100)`, v: m.pot - m.lumpTaken, z: GBP }],
  ];

  return buildXlsx([
    { name: "Inputs & Assumptions", rows: inputs, colWidths: [42, 16] },
    { name: "Projection", rows: proj, colWidths: [8, 18, 16, 20] },
    { name: "Summary", rows: summary, colWidths: [26, 20] },
  ]);
}
