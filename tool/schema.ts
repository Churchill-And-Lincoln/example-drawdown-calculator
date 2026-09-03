import type { ToolSchema } from "../sdk/types";

// The form the buyer fills in. The platform renders it — you never write UI.
// Good questions are the product: what goes in decides what comes out.
export const schema: ToolSchema = {
  fields: [
    { kind: "text", id: "purpose", label: "What is this meeting for, in one sentence?", required: true, placeholder: "e.g. Decide the Q4 launch date and owners" },
    { kind: "number", id: "minutes", label: "How long is the meeting (minutes)?", min: 15, max: 240, required: true },
    { kind: "textarea", id: "attendees", label: "Who's attending, and what do they care about?", rows: 3, required: true },
    { kind: "textarea", id: "topics", label: "Topics that must be covered (one per line)", rows: 4, required: true },
    { kind: "select", id: "style", label: "Meeting style", options: ["Decision-focused", "Brainstorm", "Status/standup", "Difficult conversation"], required: true },
    { kind: "text", id: "outcome", label: "What must be true when the meeting ends?", required: true },
  ],
};
