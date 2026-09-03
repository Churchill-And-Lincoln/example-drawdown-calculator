// Local runner: `npm run dev` → http://localhost:5150
// Renders your schema as a form, runs run() with secrets from .env, and
// previews the Result roughly as the marketplace will render it. Zero
// dependencies beyond tsx.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { config } from "../tool/config";
import { schema } from "../tool/schema";
import { run } from "../tool/run";
import { validateTool } from "../sdk/validate";
import type { Field, Result, ResultBlock } from "../sdk/types";

const PORT = 5150;

// --- tiny .env loader (names must match your dashboard Secrets) ----------
function loadEnv(): Record<string, string> {
  if (!existsSync(".env")) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m && m[2]) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// --- minimal markdown (mirrors the platform's conservative renderer) ------
function mdToHtml(md: string): string {
  const lines = esc(md).split(/\r?\n/);
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const line of lines) {
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    const ul = /^[-*]\s+(.*)$/.exec(line);
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    const bq = /^>\s?(.*)$/.exec(line);
    const inline = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>");
    if (h) { close(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); }
    else if (ul) { if (list !== "ul") { close(); out.push("<ul>"); list = "ul"; } out.push(`<li>${inline(ul[1])}</li>`); }
    else if (ol) { if (list !== "ol") { close(); out.push("<ol>"); list = "ol"; } out.push(`<li>${inline(ol[1])}</li>`); }
    else if (bq) { close(); out.push(`<blockquote>${inline(bq[1])}</blockquote>`); }
    else if (line.trim() === "") close();
    else { close(); out.push(`<p>${inline(line)}</p>`); }
  }
  close();
  return out.join("\n");
}

function renderBlock(b: ResultBlock): string {
  switch (b.type) {
    case "markdown": return mdToHtml(b.content);
    case "table": return `<table><thead><tr>${b.header.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    case "keyvalues": return `<dl>${b.items.map((i) => `<dt><b>${esc(i.label)}</b></dt><dd>${esc(i.value)}</dd>`).join("")}</dl>`;
    case "chart": return `<p style="border:1px dashed #999;padding:1rem"><b>[chart: ${esc(b.title)}]</b> ${b.series.map((s) => esc(s.name)).join(", ")} — rendered as a proper SVG on the platform.</p>`;
  }
}

const css = `body{font-family:Georgia,serif;background:#faf8f5;color:#1a1a2e;line-height:1.6;max-width:680px;margin:0 auto;padding:2rem 1rem}
label{display:block;font-weight:bold;margin:1rem 0 .3rem}input,textarea,select{width:100%;padding:.6rem;border:1px solid #e5e0d8;border-radius:6px;font:inherit}
button{background:#7c2d3e;color:#fff;border:none;padding:.8rem 1.5rem;border-radius:6px;font:inherit;margin-top:1.2rem;cursor:pointer}
table{border-collapse:collapse}th,td{border:1px solid #e5e0d8;padding:.4rem .6rem}.warn{background:#fdecec;padding:.7rem;border-radius:6px}
.att{background:#eef;padding:.5rem .8rem;border-radius:6px}`;

function fieldHtml(f: Field): string {
  const req = f.required ? " required" : "";
  switch (f.kind) {
    case "textarea": return `<textarea name="${f.id}" rows="${f.rows ?? 4}"${req}></textarea>`;
    case "select": return `<select name="${f.id}"${req}>${f.options.map((o) => `<option>${esc(o)}</option>`).join("")}</select>`;
    case "number": return `<input type="number" name="${f.id}"${f.min !== undefined ? ` min="${f.min}"` : ""}${f.max !== undefined ? ` max="${f.max}"` : ""}${req}>`;
    default: return `<input type="text" name="${f.id}" placeholder="${esc(f.placeholder ?? "")}"${req}>`;
  }
}

const server = createServer(async (req, res) => {
  const errs = validateTool(config, schema);
  const banner = errs.length ? `<div class="warn"><b>Validation:</b><ul>${errs.map((e) => `<li>${esc(e)}</li>`).join("")}</ul></div>` : "";

  if (req.method === "GET") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(`<html><head><title>${esc(config.name)} — local dev</title><style>${css}</style></head><body>
${banner}<h1>${esc(config.name)}</h1><p>${esc(config.description)}</p>
<p><i>£${config.pricePence / 100} · ${config.pricing.model}${config.pricing.model === "ascent" ? ` (cap £${config.pricing.capPence / 100})` : ""} — payment is skipped locally</i></p>
<form method="post">${schema.fields.map((f) => `<label>${esc(f.label)}</label>${fieldHtml(f)}`).join("")}
<button>Run locally →</button></form></body></html>`);
    return;
  }

  // POST: parse form, run the tool, render the result
  let body = "";
  for await (const chunk of req) body += chunk;
  const input: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(body)) input[k] = v;

  try {
    const started = Date.now();
    const result: Result = await run(input, loadEnv(), { fetch, log: console.log });
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    mkdirSync("dist", { recursive: true });
    for (const a of result.attachments ?? []) writeFileSync(`dist/${a.filename}`, a.data);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(`<html><head><title>${esc(result.title)}</title><style>${css}</style></head><body>
<p><a href="/">← form</a> · ran in ${secs}s</p><h1>${esc(result.title)}</h1><p><i>${esc(result.summary)}</i></p>
${result.blocks.map(renderBlock).join("\n")}
${(result.attachments ?? []).map((a) => `<p class="att">📎 ${esc(a.filename)} (${(a.data.length / 1024).toFixed(0)} KB) — written to dist/</p>`).join("")}
</body></html>`);
  } catch (err) {
    res.writeHead(500, { "content-type": "text/html; charset=utf-8" });
    res.end(`<html><head><style>${css}</style></head><body><p><a href="/">← form</a></p><div class="warn"><b>run() threw:</b><pre>${esc(String(err))}</pre><p>On the platform this triggers retries, then a refund — fix it here first.</p></div></body></html>`);
  }
});

server.listen(PORT, () => {
  console.log(`\n  ${config.name} — local dev\n  http://localhost:${PORT}\n`);
  const errs = validateTool(config, schema);
  if (errs.length) console.warn(`  ⚠ validation issues (also shown in the page):\n${errs.map((e) => `    - ${e}`).join("\n")}`);
});
