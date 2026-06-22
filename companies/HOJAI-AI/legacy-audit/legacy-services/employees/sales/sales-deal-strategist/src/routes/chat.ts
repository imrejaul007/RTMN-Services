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

    const systemPrompt = buildSystemPrompt(persona, context);
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: messages[messages.length - 1]?.content || "",
      timestamp: Date.now()
    };
    history.push(userMessage);

    const fullPrompt = buildFullPrompt(systemPrompt, history, persona);
    const response = await generateResponse(fullPrompt, userMessage.content, context);

    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: "assistant",
      content: response,
      timestamp: Date.now()
    };
    history.push(assistantMessage);

    if (history.length > 50) history = history.slice(-50);
    sessions.set(session, history);

    const chatResponse: ChatResponse = { message: assistantMessage, sessionId: session };
    res.json(chatResponse);
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/history/:sessionId", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  res.json({ sessionId, messages: sessions.get(sessionId) || [] });
});

router.delete("/session/:sessionId", (req: Request, res: Response) => {
  sessions.delete(req.params.sessionId);
  res.json({ success: true });
});

function buildSystemPrompt(persona: typeof import("../persona.js").persona, context?: ChatRequest["context"]): string {
  let prompt = persona.fullPersona;
  if (context) {
    prompt += "\n\n## Current Deal Context\n";
    if (context.dealId) prompt += `- **Deal ID**: ${context.dealId}\n`;
    if (context.dealName) prompt += `- **Deal Name**: ${context.dealName}\n`;
    if (context.accountName) prompt += `- **Account**: ${context.accountName}\n`;
    if (context.dealValue) prompt += `- **Value**: $${context.dealValue.toLocaleString()}\n`;
    if (context.stage) prompt += `- **Stage**: ${context.stage}\n`;
    if (context.competitor) prompt += `- **Competitor**: ${context.competitor}\n`;
    if (context.meddippicScore) {
      const s = context.meddippicScore;
      prompt += `\n### MEDDPICC Scores\n`;
      prompt += `- Metrics: ${s.metrics}/5\n`;
      prompt += `- Economic Buyer: ${s.economicBuyer}/5\n`;
      prompt += `- Decision Criteria: ${s.decisionCriteria}/5\n`;
      prompt += `- Decision Process: ${s.decisionProcess}/5\n`;
      prompt += `- Paper Process: ${s.paperProcess}/5\n`;
      prompt += `- Identify Pain: ${s.identifyPain}/5\n`;
      prompt += `- Champion: ${s.champion}/5\n`;
      prompt += `- Competition: ${s.competition}/5\n`;
    }
  }
  prompt += "\n\nQualify deals with surgical precision. Every gap identified must have a specific next action.";
  return prompt;
}

function buildFullPrompt(systemPrompt: string, history: ChatMessage[], persona: typeof import("../persona.js").persona): string {
  let prompt = `<system>${systemPrompt}</system>\n\n`;
  prompt += `<agent>${persona.name}</agent>\n\n`;
  history.forEach(msg => {
    prompt += msg.role === "user" ? `<user>${msg.content}</user>\n` : `<assistant>${msg.content}</assistant>\n`;
  });
  return prompt;
}

async function generateResponse(prompt: string, userMessage: string, context?: ChatRequest["context"]): Promise<string> {
  // TODO: Integrate with your AI provider

  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes("meddippic") || lowerMessage.includes("qualify") || lowerMessage.includes("score")) {
    return `## MEDDPICC Deal Scoring

Every element must be scored 1-5 with evidence. A deal without all 8 answered is a deal you don't understand.

### The 8 Elements (5 points each = 40 max)

| Element | Score | What You're Looking For |
|---------|-------|------------------------|
| **Metrics** | /5 | Quantified business outcome buyer needs |
| **Economic Buyer** | /5 | Budget controller, not just signer |
| **Decision Criteria** | /5 | Explicit, documented evaluation criteria |
| **Decision Process** | /5 | Steps, people, timeline mapped |
| **Paper Process** | /5 | Legal, procurement, security identified |
| **Identify Pain** | /5 | Cost of problem quantified |
| **Champion** | /5 | Power + Access + Personal Motive |
| **Competition** | /5 | Direct + adjacent + do-nothing mapped |

### Score Thresholds
- **28+/40**: Qualified, move forward
- **20-27/40**: Gaps to close, high risk
- **<20/40**: Not qualified, qualify out or fix gaps

### Critical Red Flags
${context?.meddippicScore ? `
**${context.dealName || "This deal"}** scores:` : ""}
- Paper Process <3: Procurement will kill the quarter
- Economic Buyer <3: Single-threaded to non-buyer
- Metrics <3: No urgency, no business case
- Champion <3: No internal advocate

### Deal Verdict
${calculateVerdict(context?.meddippicScore)}

What element would you like to score in detail?`;
  }

  if (lowerMessage.includes("competitor") || lowerMessage.includes("battlecard") || lowerMessage.includes("position")) {
    return `## Competitive Positioning Framework

### The Three Zones

**WINNING Zone** (Your strengths align with their criteria)
- Amplify these
- Make them weighted heavier
- Demo these moments

**BATTLING Zone** (Both credible)
- Shift to adjacent factors
- Implementation speed, TCO, ecosystem
- Create separation here

**LOSING Zone** (Competitor stronger)
- NEVER ATTACK
- Reposition: "They're excellent at X. Our customers find Y matters more at scale because..."

### Laying Landmines
Questions that surface requirements where you're strongest:

If you're strong at multi-entity handling:
> "How are you handling data consolidation across entities today? What breaks when you add a new entity?"

If you're strong at integration:
> "What does your current integration architecture look like? How do you handle real-time sync?"

### Battlecard Structure
# Competitive Battlecard: [Competitor]

**Positioning**: [Win/Battle/Lose]
**Encounter Rate**: [%]

| Zone | What | Talk Track |
|------|------|-----------|
| Win | Differentiator | "Exact language" |
| Battle | Shared capability | "How to separate" |
| Lose | Their strength | "Repositioning" |

${context?.competitor ? `
**Current Deal vs ${context.competitor}**

What's your competitive position in this deal?
- What criteria are you strong on?
- Where are you even?
- Where are they stronger?
` : ""}

What competitor would you like to build a battlecard for?`;
  }

  if (lowerMessage.includes("champion") || lowerMessage.includes("economic buyer") || lowerMessage.includes("multi-thread")) {
    return `## Stakeholder Mapping Framework

### Finding the Economic Buyer
Test: Can this person REALLOCATE budget from another initiative?
- If no, they're not the EB
- Access is earned through VALUE, not title matching
- Champions broker EB access — test them: "Can you make the introduction?"

### Champion Qualifiers (All 3 Required)
1. **Power**: Organizational influence to drive decision
2. **Access**: Relationship with EB and decision process
3. **Personal Motive**: Their career benefits from this succeeding

A friendly contact who takes your calls is NOT a champion.

### Multi-Threading Requirement
- **3+ active relationship threads** per account minimum
- If champion leaves tomorrow, who else cares?
- Map the informal network, not just the org chart

### Contact Plan Template
| Contact | Role | Last Contact | Relationship Health |
|---------|------|--------------|-------------------|
| [Name] | EB | [Date] | [Strong/AtRisk/None] |
| [Name] | Champion | [Date] | [Strong/AtRisk/None] |
| [Name] | Influencer | [Date] | [Strong/AtRisk/None] |
| [Name] | End User | [Date] | [Strong/AtRisk/None] |

### Red Flags
- Single-threaded to non-EB
- Champion won't grant EB access
- Decision-maker you haven't spoken to

${context?.dealName ? `
**${context.dealName}** Stakeholder Status?

1. Who is the EB?
2. Have you spoken to them directly?
3. Who is the champion?
4. How many threads are active?
` : ""}

What stakeholder would you like to analyze?`;
  }

  if (lowerMessage.includes("pain") || lowerMessage.includes("urgency") || lowerMessage.includes("compelling")) {
    return `## Pain & Urgency Framework

### Quantified Pain
Not: "They have a problem with reporting"
But: "They lose $2.4M annually in billing errors because reconciliation takes 14 days"

### Cost of Inaction
If they can't quantify the cost of NOT solving this, the deal has no urgency.

Questions to surface:
- "What happens if this continues for 6-12 months?"
- "What did this cost last quarter? Last year?"
- "Who else feels this pain?"

### Compelling Event
What SPECIFIC event is driving timeline?
- Budget cycle (not a deadline, a constraint)
- Competitive threat (losing deals, market pressure)
- Regulatory requirement (hard deadline)
- Internal initiative (get promoted, avoid being fired)

### The Challenger Reframe
Lead with insight, not questions about their problems:

"Most companies approach [X] by [conventional method]. Here's what the data shows about why that breaks at scale..."

Then quantify the cost. Then make it personal.

What pain would you like to quantify for this deal?`;
  }

  // Default
  return `I'm ${persona.name}, deal strategy specialist.

I help with:
- **MEDDPICC scoring** - Qualify every deal systematically
- **Deal verdict** - Winning, battling, or losing
- **Competitive positioning** - Battlecards, landmines, repositioning
- **Stakeholder mapping** - Find EB, develop champions, multi-thread
- **Pain quantification** - Build urgency through business impact
- **Win planning** - Stage-by-stage action plans

${context?.dealName ? `
**Current Deal**: ${context.dealName}
${context.dealValue ? `**Value**: $${context.dealValue.toLocaleString()}\n` : ""}
${context?.stage ? `**Stage**: ${context.stage}\n` : ""}
` : ""}

What deal challenge would you like to analyze?`;
}

function calculateVerdict(scores?: ChatRequest["context"]["meddippicScore"]): string {
  if (!scores) return "Provide MEDDPICC scores for a verdict.";
  const total = scores.metrics + scores.economicBuyer + scores.decisionCriteria +
    scores.decisionProcess + scores.paperProcess + scores.identifyPain +
    scores.champion + scores.competition;
  if (total >= 28) return "**VERDICT: QUALIFIED** — Score 28+/40. This deal is worth pursuing with full resources.";
  if (total >= 20) return "**VERDICT: BATTLING** — Score 20-27/40. High risk. Close gaps in 14 days or qualify out.";
  return "**VERDICT: NOT QUALIFIED** — Score <20/40. Fix critical gaps or withdraw.";
}

export default router;
