import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { persona } from "../persona.js";
import type { ChatRequest, ChatResponse, ChatMessage } from "../types.js";

const router = Router();
const sessions: Map<string, ChatMessage[]> = new Map();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { messages, sessionId, context } = req.body as ChatRequest;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const session = sessionId || uuidv4();
    let history = sessions.get(session) || [];

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: messages[messages.length - 1]?.content || "",
      timestamp: Date.now()
    };
    history.push(userMessage);

    const response = await generateResponse(persona, history, context);
    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: "assistant",
      content: response,
      timestamp: Date.now()
    };
    history.push(assistantMessage);

    if (history.length > 50) history = history.slice(-50);
    sessions.set(session, history);

    res.json({ message: assistantMessage, sessionId: session });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/history/:sessionId", (req: Request, res: Response) => {
  res.json({ sessionId: req.params.sessionId, messages: sessions.get(req.params.sessionId) || [] });
});

router.delete("/session/:sessionId", (req: Request, res: Response) => {
  sessions.delete(req.params.sessionId);
  res.json({ success: true });
});

async function generateResponse(persona: typeof import("../persona.js").persona, history: ChatMessage[], context?: ChatRequest["context"]): Promise<string> {
  const lastMessage = history[history.length - 1]?.content.toLowerCase() || "";
  const userMessage = history[history.length - 1]?.content || "";

  if (lastMessage.includes("spin") || lastMessage.includes("implication question")) {
    return `## SPIN Selling Framework

### The Question Sequence That Works

**Situation (Limit to 2-3)**
Already know this from research. Skip if you can.
- "Walk me through how your team handles [X]"
- "What tools are you using today?"

**Problem Questions**
- "Where does that break down?"
- "What's most frustrating?"
- "What happens when [scenario]?"

**Implication Questions (Where Deals Are Made)**
Don't skip these — they're uncomfortable, which is WHY they work:
- "When that breaks, what's the downstream impact?"
- "How does that affect your ability to [goal]?"
- "If this continues 6-12 months, what does it cost?"
- "Who else feels this pain?"

**Need-Payoff Questions**
Let the buyer sell themselves:
- "If you could solve that, what unlocks?"
- "What becomes possible?"

### The Key Insight
Implication questions activate LOSS AVERSION.
Buyers work harder to avoid a loss than capture a gain.

${context?.repName ? `What situation would you like to practice with ${context.repName}?` : "What call scenario would you like to practice?"}`;
  }

  if (lastMessage.includes("gap") || lastMessage.includes("root cause") || lastMessage.includes("current state")) {
    return `## Gap Selling Framework

### Map the Gap Precisely

**CURRENT STATE (Where they are)**
├── Environment: Tools, processes, structure
├── Problems: Broken, slow, painful, missing
├── Impact: Revenue, cost, risk, people cost
└── Root Cause: WHY problems exist (most skipped!)

**FUTURE STATE (Where they want)**
├── What does solved look like?
├── What metrics change?
└── Timeline?

**THE GAP**
├── How big is the distance?
├── Cost of inaction?
└── Can they close it without you?

### Root Cause vs. Surface Problem
❌ "Our tool is slow" — Surface problem
✅ "We're on legacy architecture, onboarding 3 enterprise clients next quarter, and current setup can't scale" — Root cause

### The Qualify-Out Question
"Can you close this gap without us?"
If YES → You have no deal.
If NO → You have a qualified opportunity.

${context?.repName ? `What gap would ${context.repName} like to map?` : "What buyer situation would you like to analyze?"}`;
  }

  if (lastMessage.includes("sandler") || lastMessage.includes("personal") || lastMessage.includes("emotional")) {
    return `## Sandler Pain Funnel

### Three Levels of Depth

**Level 1 — Surface Pain (Technical)**
- "Tell me more about that"
- "Can you give me an example?"
- "How long has this been going on?"

**Level 2 — Business Impact (Quantified)**
- "What has this cost the business?"
- "How does it affect [revenue/efficiency]?"
- "What have you tried? Why didn't it work?"

**Level 3 — Personal Stakes (Most Skipped!)**
- "How does this affect you day-to-day?"
- "What's at stake for you personally?"
- "What happens to your initiative if this doesn't get solved?"

### Why Level 3 Matters
Buying decisions are EMOTIONAL with rational justifications.
The VP saying "need better reporting" has a deeper truth:
"I'm presenting to the board in Q3 and I don't trust my numbers."

THAT is what drives urgency.

### Practice Question
"What's at stake for you personally if this doesn't get solved?"
${context?.repName ? `
${context.repName}, when have you last asked a Level 3 question?` : ""}`;
  }

  if (lastMessage.includes("call structure") || lastMessage.includes("upfront contract") || lastMessage.includes("30 minute")) {
    return `## Elite 30-Minute Discovery Call Structure

### Opening (2 min) — The Upfront Contract
"Sounds like this:
Thanks for making time. Here's what I was thinking for our 30 minutes:
- Ask questions to understand if there's a fit
- You should ask me anything — I'll be direct
- At the end: fit + next step, OR I'll tell you honestly there's no fit
Does that work?"

### Discovery (18 min) — 60-70% on PAIN
Opening question:
- Inbound: "What prompted you to take this call?"
- Outbound: "Saw [signal]. What's happening on your end?"

Then follow SPIN, Gap, or Sandler.

Know before you pitch:
1. What is broken? (Their words)
2. Why is it broken? (Root cause)
3. What does it cost? (Dollars, time, risk)
4. Who else cares? (Stakeholder map)
5. Why now? (Trigger)
6. What if they do nothing? (Cost of inaction)

### Tailored Pitch (6 min) — Relevance > Comprehensiveness
Map 2-3 capabilities directly to THEIR pain.
Not a tour. A targeted response.

### Next Steps (4 min) — Be Explicit
- Who does what by when
- Who else needs to be involved
- Set NEXT meeting before hanging up
- Define what "no" looks like

${context?.repName ? `Want me to run ${context.repName} through a practice call?` : "What call element would you like to practice?"}`;
  }

  if (lastMessage.includes("objection") || lastMessage.includes("handle")) {
    return `## AECR Objection Handling

### The Framework
**Acknowledge**: "Fair concern, hear that often"
**Empathize**: "If I were in your shoes..."
**Clarify**: "Help me understand specifically..."
**Reframe**: "Here's how others have thought about it"

### Objection Distribution
| Type | Frequency | Real Meaning |
|------|-----------|--------------|
| Budget | 48% | "ROI doesn't justify cost" or "I don't control budget" |
| Timing | 32% | "Not a priority" or "Bandwidth issue" |
| Competition | 20% | "Need to justify not [alt]" or "Comparison bid" |

### Budget Objection
Budget = ROI problem in disguise.
If discovery was thorough, quantify the gap clearly.
Make it a math problem, not a negotiation.

### The AECR in Action
Buyer: "The timing isn't right"
Acknowledge: "That's fair, timing matters"
Empathize: "If I were managing multiple initiatives..."
Clarify: "Is it budget cycle, bandwidth, or something else?"
Reframe: "Teams who solved this found [X]. Here's how they thought about timing..."

${context?.repName ? `What objection would ${context.repName} like to practice handling?` : "What objection would you like to practice?"}`;
  }

  // Default
  return `I'm ${persona.name}, discovery methodology coach.

I coach sellers on:
- **SPIN Selling** — Implication questions that create urgency
- **Gap Selling** — Root cause analysis and precise pain mapping
- **Sandler Pain Funnel** — From surface to personal stakes
- **Call Structure** — The 30-minute discovery framework
- **Upfront Contracts** — Permission to ask hard questions
- **Objection Handling** — AECR framework

${context?.repName ? `
Currently coaching: **${context.repName}**
Discovery quality: ${context.discoveryQuality || "Not assessed"}
` : ""}

${context?.repName ? `What would you like to work on with ${context.repName}?` : "What discovery challenge would you like to explore?"}`;
}

export default router;
