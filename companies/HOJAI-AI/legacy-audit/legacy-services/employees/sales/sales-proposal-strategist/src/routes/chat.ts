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

  if (lastMessage.includes("win theme") || lastMessage.includes("theme")) {
    return `## Win Theme Development

### Strong Win Themes Are:
- Specific to THIS buyer (not generic industry language)
- Connected to measurable outcomes
- Differentiating (competitor can't claim same)
- Provable with evidence

### Win Theme vs. Weak Theme
❌ "We have deep experience in digital transformation"
✅ "Our migration framework keeps 99.97% uptime during platform transitions — the same approach that reduced [similar client]'s risk by 60%"

### Theme Matrix Template
| Theme | Buyer Need | Our Differentiator | Proof Point | Sections |
|-------|------------|-------------------|-------------|----------|
| 1 | [Challenge] | [Capability] | [Metric/Case] | Exec Summary, Tech, Case |
| 2 | [Challenge] | [Capability] | [Metric/Case] | ... |
| 3 | [Challenge] | [Capability] | [Metric/Case] | ... |

### Stress-Test Each Theme
- Is it specific to THIS buyer?
- Is it provable?
- Does it differentiate?
- Could competitor claim it too?

${context?.opportunityName ? `**${context.opportunityName}** win themes needed?` : "What opportunity would you like to develop themes for?"}`;
  }

  if (lastMessage.includes("executive summary") || lastMessage.includes("exec summary")) {
    return `## Executive Summary Framework

### Structure (Keep to One Page)
1. **Mirror their situation** (2-3 sentences)
   - Prove you listened
   - Use their language

2. **Central tension** (1-2 sentences)
   - Cost of inaction OR
   - Opportunity at risk

3. **Solution thesis** (2-3 sentences)
   - How your approach resolves tension
   - Win themes surface here

4. **Proof** (1-2 sentences)
   - One concrete evidence point
   - Similar engagement or metric

5. **Transformed state** (1-2 sentences)
   - Specific, measurable outcome
   - 12-18 months out

### The Most Critical Section
Many evaluators — especially executives — read ONLY this.

Lead with the win theme. Evaluators decide in the first 100 words whether you understand their problem.

### Checklist
- [ ] Uses buyer's language
- [ ] Names their specific challenge
- [ ] Win theme appears in paragraph 1
- [ ] Proof point included
- [ ] Transformed state quantified

${context?.buyerName ? `Draft executive summary for **${context.buyerName}**?` : "What opportunity would you like to draft for?"}`;
  }

  if (lastMessage.includes("narrative") || lastMessage.includes("three-act") || lastMessage.includes("architecture")) {
    return `## Three-Act Proposal Narrative

### Act I — Understanding (Credibility)
What: Prove you understand their world
How: Reflect their language, constraints, politics
Where many lose: Generic industry boilerplate

### Act II — Solution Journey (Differentiation)
What: Your approach as guided experience
How: Each capability maps to Act I challenge
Where many lose: Feature dump instead of story

### Act III — Transformed State (Urgency)
What: Picture of their future
How: Quantified outcomes, milestones, metrics
Where many lose: Vague future state claims

### Theme Integration Map
| Section | Primary Theme | Evidence |
|---------|---------------|----------|
| Exec Summary | Theme 1 | Case Study A |
| Technical | Theme 2 | Methodology X |
| Management | Theme 3 | Team cred |
| Past Performance | Theme 1 | Metric Y |
| Pricing | Theme 2 | ROI calc |

### Content Quality Rules
- No empty adjectives ("robust," "world-class")
- Every claim needs evidence
- Micro-stories > feature lists
- Visuals advance argument (not decorate)

What proposal architecture would you like to design?`;
  }

  if (lastMessage.includes("competitive") || lastMessage.includes("competitor") || lastMessage.includes("positioning")) {
    return `## Competitive Positioning in Proposals

### Never Attack Competitors
Frame your strengths as benefits that create contrast.

❌ "Competitor X has poor integration"
✅ "Our native integration reduces implementation time by 40%"

### Create Contrast, Not Criticism
| Dimension | Our Position | Our Advantage |
|-----------|--------------|---------------|
| [Eval factor] | [Our approach] | [Why it matters to them] |
| [Eval factor] | [Our approach] | [Why it matters to them] |

### Incumbent Defense
If facing incumbent:
1. Make switching cost feel REAL
2. Lead with new value, not disruption
3. Win theme: "What becomes possible that wasn't before"

### Positioning by Evaluation Type
**Formal scored RFP**:
- Theme integration across ALL sections
- Evidence density per requirement
- Compliance + strategic overlay

**Best-and-Final**:
- Narrative intensity
- Relationship leverage
- Executive engagement

${context?.competitors?.length ? `Competitors: ${context.competitors.join(", ")}` : ""}

What competitive scenario would you like to address?`;
  }

  // Default
  return `I'm ${persona.name}, proposal strategy specialist.

I help with:
- **Win theme development** — 3-5 themes that differentiate
- **Executive summaries** — Closing arguments, not summaries
- **Narrative architecture** — Three-act structure
- **Content quality** — Evidence-based, specific, no jargon
- **Competitive positioning** — Contrast without criticism
- **RFP compliance** — Strategic overlay on requirements

${context?.opportunityName ? `**Opportunity**: ${context.opportunityName}` : ""}
${context?.buyerName ? `**Buyer**: ${context.buyerName}` : ""}

What proposal challenge would you like to tackle?`;
}

export default router;
