import type { Result, RunFn } from "../sdk/types";

// THE TOOL. This is the only real code you write:
//   (input, secrets, ctx) => Result
// input   — the buyer's validated form answers (strings, keyed by field id)
// secrets — the values you set in the dashboard Secrets tab
// ctx     — ctx.fetch for HTTP calls, ctx.log for debugging
//
// Rules of the road: return within a couple of minutes; make external calls
// only via ctx.fetch; never rely on global state between runs; if a paid
// API fails, throw — the platform retries, and the buyer is refunded rather
// than sold a blank page.
export const run: RunFn = async (input, secrets, ctx) => {
  const apiKey = secrets.OPENAI_API_KEY; // optional in this example
  const markdown = apiKey
    ? await generateWithLLM(input, apiKey, ctx)
    : offlineDraft(input); // works with no key — great for local dev

  const result: Result = {
    title: `Agenda: ${input.purpose}`,
    summary: `A ${input.minutes}-minute ${input.style.toLowerCase()} agenda with minutes template and follow-up.`,
    blocks: [
      {
        type: "keyvalues",
        items: [
          { label: "Meeting length", value: `${input.minutes} minutes` },
          { label: "Style", value: input.style },
          { label: "Definition of done", value: input.outcome },
        ],
      },
      { type: "markdown", content: markdown },
    ],
    // attachments: [ { filename, mimeType, data } ]  — e.g. an Excel model,
    // ≤ 5 MB total. See the README for the pattern.
  };
  return result;
};

async function generateWithLLM(
  input: Record<string, string>,
  apiKey: string,
  ctx: { fetch: typeof fetch },
): Promise<string> {
  const prompt = `Create a meeting kit in Markdown with three sections:
## The Agenda — time-boxed to exactly ${input.minutes} minutes total, ordered so the meeting ends with "${input.outcome}" achieved. Style: ${input.style}.
## Minutes Template — a fill-in-the-blanks structure for decisions, actions (owner + date), and parked items.
## The Follow-up — a short message to send afterwards summarising decisions and actions.

Meeting purpose: ${input.purpose}
Attendees and what they care about: ${input.attendees}
Topics that must be covered:\n${input.topics}

Be specific and practical, no filler.`;

  const res = await ctx.fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1800,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

function offlineDraft(input: Record<string, string>): string {
  const topics = input.topics.split(/\r?\n/).filter(Boolean);
  const total = Number(input.minutes) || 30;
  const opening = Math.max(2, Math.round(total * 0.1));
  const closing = Math.max(3, Math.round(total * 0.15));
  const per = Math.max(3, Math.floor((total - opening - closing) / Math.max(topics.length, 1)));
  return `> _Offline mode (no OPENAI_API_KEY set) — structured draft._

## The Agenda (${total} min)
- **0–${opening} min** — Purpose & definition of done: *${input.outcome}*
${topics.map((t, i) => `- **${opening + i * per}–${opening + (i + 1) * per} min** — ${t}`).join("\n")}
- **Final ${closing} min** — Decisions recap, actions with owners, next steps

## Minutes Template
**Decisions:** … | **Actions (owner, due):** … | **Parked:** …

## The Follow-up
"Thanks all — we met to ${input.purpose.toLowerCase()}. Decisions: … Actions: … Shout by EOD if I've missed anything."`;
}
