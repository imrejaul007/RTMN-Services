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

  if (lastMessage.includes("demo") || lastMessage.includes("demonstration")) {
    return `## Demo Engineering Framework

### The Demo Structure (Not a Tour)
1. **Quantify the problem first**: "You spend 6 hours/week reconciling data. Let me show you what that looks like automated."
2. **Show the outcome**: Dashboard, report, workflow result — not how it works yet
3. **Reverse into the how**: Once they want it, explain the architecture
4. **Close with proof**: Customer reference at their scale

### Tailored Demo Checklist
- [ ] Top 3 pain points mapped to specific capabilities
- [ ] Audience identified (technical vs. business)
- [ ] Two demo paths prepared (planned + deep-dive)
- [ ] Buyer's terminology used, not product vocabulary
- [ ] Aha moment planned and reached

### The "Aha Moment" Test
Every demo should produce a moment where the buyer thinks:
"That's exactly what we need."

If that moment didn't happen, the demo failed.

### Demo Types by Audience
| Audience | Focus | Depth |
|----------|-------|-------|
| Technical evaluators | Architecture, API, integration | Deep |
| Business sponsors | Outcomes, timelines, ROI | Light |
| Mixed room | Business first, tech backup | Layered |

${context?.accountName ? `**${context.accountName}** demo prep needed?**` : ""}

What demo scenario would you like to plan?`;
  }

  if (lastMessage.includes("poc") || lastMessage.includes("proof of concept") || lastMessage.includes("scope")) {
    return `## POC Scoping Framework

### The Problem Statement (Must Be Writeable)
"This POC will prove that [product] can [capability] in [environment] within [timeframe], measured by [criteria]."

If you can't write that sentence, the POC isn't scoped.

### Success Criteria (Written BEFORE Starting)
| Criterion | Target | Measurement |
|-----------|--------|-------------|
| [Capability] | [Quantified] | [How measured] |
| [Integration] | Pass/Fail | [Test scenario] |
| [Performance] | [Threshold] | [Load test] |

### Scope Discipline
**In scope**: [Specific features/workflows]
**Explicitly out of scope**: [What we're NOT testing]

Buyer: "Can we also test X?"
Answer: "Absolutely — in phase two. Let's nail the core use case first."

### Timeline
- Day 1-2: Environment setup
- Day 3-7: Core implementation
- Day 8: Midpoint review
- Day 9-12: Refinement
- Day 13-14: Final readout + decision

### Decision Gate
GO / NO-GO based on pre-agreed criteria.

${context?.accountName ? `Design a POC scope for **${context.accountName}**?` : "What POC would you like to scope?"}`;
  }

  if (lastMessage.includes("technical discovery") || lastMessage.includes("technical evaluation")) {
    return `## Technical Discovery Framework

### The Real Questions
Not just "what's your stack?" but:
- "What will this have to integrate with?"
- "What does security review look like?"
- "What scale do you need to handle?"
- "Who are the technical decision makers?"

### Discovery Checklist
- [ ] Architecture and stack
- [ ] Integration points (APIs, databases, middleware)
- [ ] Security requirements (SSO, SOC 2, data residency)
- [ ] Scale requirements (users, volume, throughput)
- [ ] Technical decision makers + their concerns
- [ ] Timeline and decision process

### Decode Objections
| Buyer Says | They Mean |
|------------|-----------|
| "Does it support SSO?" | "Will this pass security?" |
| "Can it handle our scale?" | "We've been burned before" |
| "We need on-prem" | Which? Security concerns or sunk cost? |
| "Competitor showed X" | "Convince me you're better" |

### Technical Win Criteria
- Evaluation criteria known and influenced
- Technical evaluators favor us
- Architecture fits their environment
- Integration plan validated
- Security concerns addressed

${context?.accountName ? `
**${context.accountName}** Technical Environment:
${context.technicalEnvironment?.stack ? `- Stack: ${context.technicalEnvironment.stack.join(", ")}` : ""}
${context.technicalEnvironment?.integrations ? `- Integrations: ${context.technicalEnvironment.integrations.join(", ")}` : ""}
` : ""}

What technical discovery would you like to plan?`;
  }

  if (lastMessage.includes("competitive") || lastMessage.includes("battlecard") || lastMessage.includes("competitor")) {
    return `## FIA Competitive Framework

### Fact, Impact, Act
**FACT**: Truth about competitor. No spin.
"Competitor X requires dedicated ETL layer"

**IMPACT**: Why it matters to THIS buyer.
"Adds 2-3 weeks implementation + ongoing maintenance"

**ACT**: What to say/do.
"Here's how our native handling creates separation..."

### Three Zones

**WINNING** — Your strengths, their criteria
- Build demo moments
- Make weighted heavily

**BATTLING** — Both credible
- Shift to TCO, implementation speed
- Create separation

**LOSING** — Competitor stronger
- Acknowledge it
- Reposition: "For YOUR priority..."

### Never Attack
"Great for [strength]. For teams needing [Y], here's how we differ..."

### Landmine Questions
Ask questions that surface YOUR strengths:
- "How do you handle [your strength] today?"
- "What breaks when [your differentiator]?"
- "How will [your capability] scale with your team?"

${context?.competitors?.length ? `Competitors in deal: ${context.competitors.join(", ")}` : ""}

What competitive scenario would you like to build?`;
  }

  // Default
  return `I'm ${persona.name}, pre-sales engineer.

I help with:
- **Technical discovery** — Architecture, integrations, security, scale
- **Demo engineering** — Tailored demos that hit the "aha moment"
- **POC scoping** — Focused proof-of-concept with clear criteria
- **Competitive positioning** — FIA battlecards, landmine questions
- **Solution architecture** — Map capabilities to buyer infrastructure
- **Technical objections** — Decode what they really mean

${context?.accountName ? `**Current Deal**: ${context.accountName}` : ""}

What technical challenge would you like to tackle?`;
}

export default router;
