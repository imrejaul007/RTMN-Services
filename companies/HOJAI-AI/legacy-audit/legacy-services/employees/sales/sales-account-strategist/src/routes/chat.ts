import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { persona } from "../persona.js";
import type { ChatRequest, ChatResponse, ChatMessage } from "../types.js";

const router = Router();

// In-memory session storage (replace with Redis in production)
const sessions: Map<string, ChatMessage[]> = new Map();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { messages, sessionId, context } = req.body as ChatRequest;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    // Get or create session
    const session = sessionId || uuidv4();
    let history = sessions.get(session) || [];

    // Build system prompt with persona and context
    const systemPrompt = buildSystemPrompt(persona, context);

    // Add messages to history
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: messages[messages.length - 1]?.content || "",
      timestamp: Date.now()
    };
    history.push(userMessage);

    // Build the full prompt for the AI
    const fullPrompt = buildFullPrompt(systemPrompt, history, persona);

    // Call the AI (placeholder - integrate with your AI provider)
    const response = await generateResponse(fullPrompt, userMessage.content, context);

    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: "assistant",
      content: response,
      timestamp: Date.now()
    };
    history.push(assistantMessage);

    // Store updated history (limit to last 50 messages)
    if (history.length > 50) {
      history = history.slice(-50);
    }
    sessions.set(session, history);

    const chatResponse: ChatResponse = {
      message: assistantMessage,
      sessionId: session
    };

    res.json(chatResponse);
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/history/:sessionId", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const history = sessions.get(sessionId) || [];
  res.json({ sessionId, messages: history });
});

router.delete("/session/:sessionId", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  sessions.delete(sessionId);
  res.json({ success: true, sessionId });
});

function buildSystemPrompt(persona: typeof import("../persona.js").persona, context?: ChatRequest["context"]): string {
  let prompt = persona.fullPersona;

  if (context) {
    prompt += "\n\n## Current Account Context\n";
    if (context.accountId) prompt += `- **Account ID**: ${context.accountId}\n`;
    if (context.accountName) prompt += `- **Account Name**: ${context.accountName}\n`;
    if (context.currentARR) prompt += `- **Current ARR**: $${context.currentARR.toLocaleString()}\n`;
    if (context.contractRenewalDate) prompt += `- **Contract Renewal**: ${context.contractRenewalDate}\n`;
    if (context.healthScore) prompt += `- **Health Score**: ${context.healthScore.toUpperCase()}\n`;
    if (context.productsDeployed?.length) prompt += `- **Products Deployed**: ${context.productsDeployed.join(", ")}\n`;
    if (context.stakeholders?.length) {
      prompt += "\n### Current Stakeholders\n";
      context.stakeholders.forEach(s => {
        prompt += `- **${s.name}** (${s.title}): ${s.role} - ${s.sentiment} sentiment\n`;
      });
    }
  }

  prompt += "\n\nProvide specific, actionable guidance based on the account strategy methodology above.";
  return prompt;
}

function buildFullPrompt(systemPrompt: string, history: ChatMessage[], persona: typeof import("../persona.js").persona): string {
  let prompt = `<system>${systemPrompt}</system>\n\n`;
  prompt += `<agent>${persona.name}</agent>\n\n`;

  history.forEach(msg => {
    if (msg.role === "user") {
      prompt += `<user>${msg.content}</user>\n`;
    } else if (msg.role === "assistant") {
      prompt += `<assistant>${msg.content}</assistant>\n`;
    }
  });

  return prompt;
}

async function generateResponse(prompt: string, userMessage: string, context?: ChatRequest["context"]): Promise<string> {
  // TODO: Integrate with your AI provider (OpenAI, Anthropic, etc.)
  // For now, return a placeholder response

  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes("stakeholder") || lowerMessage.includes("org map") || lowerMessage.includes("relationship")) {
    return `Based on the account context provided, here's my analysis of the stakeholder landscape:

## Stakeholder Mapping Framework

### Key Principles
1. **Multi-threading requirement**: Every account needs 3+ active relationship threads to be healthy
2. **Informal influence matters**: The org chart rarely shows who actually drives decisions
3. **Update continuously**: Stakeholder maps decay - people change roles, priorities shift

### Recommended Actions
${context?.stakeholders?.length ? `
Current state shows ${context.stakeholders.length} stakeholder(s) identified. I recommend:
- Mapping at least 3 additional relationship threads
- Identifying the economic buyer vs. the champion
- Tracking detractors as carefully as champions
` : `
To build a comprehensive stakeholder map, I need:
- Key contacts in the account
- Their roles and organizational levels
- Any known influencers or detractors
`}

### Expansion Timing
${context?.healthScore === "green" ? `
The account health score is GREEN - this is the ideal time to pursue expansion opportunities.
` : context?.healthScore === "yellow" ? `
The account health score is YELLOW - focus on stabilization before expansion.
` : context?.healthScore === "red" ? `
The account health score is RED - prioritize retention and save plays before any expansion discussion.
` : `
Please provide the account health score to determine the appropriate approach.
`}

What specific aspect would you like to dive deeper into?`;
  }

  if (lowerMessage.includes("expansion") || lowerMessage.includes("upsell") || lowerMessage.includes("cross-sell")) {
    return `## Expansion Strategy Analysis

### Signal Requirements
Every expansion opportunity must have:
1. **Context** - Why is this happening now?
2. **Timing** - Why is this the right moment?
3. **Stakeholder alignment** - Who cares about this expansion?

### Expansion Playbook by Health Score

**GREEN Accounts** (Expansion Ready):
- Usage at 80%+ capacity
- Strong executive sponsorship
- Active product adoption
→ Run proactive expansion plays

**YELLOW Accounts** (Stabilization First):
- Usage declining or inconsistent
- Champion at risk
- Support ticket sentiment concerns
→ Focus on success before expansion

**RED Accounts** (Save Mode):
- Declining usage trends
- Champion departed
- High support escalation
→ Immediate intervention required

### Key Metrics to Track
- Net Revenue Retention (NRR)
- License consumption trends
- Feature adoption velocity
- Executive sponsor engagement

What expansion scenario would you like me to help you strategize?`;
  }

  if (lowerMessage.includes("qbr") || lowerMessage.includes("business review") || lowerMessage.includes("quarterly")) {
    return `## QBR Preparation Framework

### Structure for Success
Every QBR should be **forward-looking, not backward-looking**.

### Recommended Agenda (60 minutes)
1. **Value Delivered** (15 min): ROI recap with hard numbers
2. **Their Roadmap** (20 min): Where is the business going?
3. **Product Alignment** (15 min): How we evolve together
4. **Mutual Action Plan** (10 min): Commitments, owners, dates

### Pre-QBR Research Required
- Usage trends and adoption curves
- Support history and CSAT
- ROI data with specific numbers
- Industry context and competitive pressures

### Key Questions to Ask
- "What are your top 3 business priorities for the next two quarters?"
- "Where are you spending time on manual work that should be automated?"
- "Who else is trying to solve similar problems?"
- "What would make you confident to expand our partnership?"

### Close Every QBR With
A mutual action plan with:
- Specific commitments from both sides
- Named owners for each action
- Clear due dates
- Defined success criteria

Would you like me to create a detailed QBR preparation template for a specific account?`;
  }

  if (lowerMessage.includes("churn") || lowerMessage.includes("at risk") || lowerMessage.includes("retention")) {
    return `## Churn Prevention Analysis

### Early Warning Signals to Monitor
| Signal | Threshold | Severity |
|--------|-----------|----------|
| Monthly active users | Declining MoM | High |
| Feature adoption (core) | <50% utilization | High |
| Executive sponsor engagement | >60 days no contact | High |
| Support ticket sentiment | CSAT <3.5 | Medium |
| Champion status | At risk/departed | Critical |

### Intervention Timeline

**Immediate (This Week)**:
- Executive outreach to at-risk sponsor
- Usage review and re-enablement plan
- Identify alternative champions

**Short-term (30 Days)**:
- Re-establish strategic alignment
- Demonstrate value through ROI recap
- Build re-engagement touchpoints

**Medium-term (90 Days)**:
- Re-establish growth path
- Expand relationship threads
- Set foundation for expansion

### Risk Assessment Factors
- Probability of churn based on signal combination
- Revenue at risk
- Save difficulty (Low/Medium/High)
- Recommended investment to save

What account health indicators are you seeing? I can help you build a specific intervention plan.`;
  }

  // Default response
  return `I'm ${persona.name}, your post-sale account strategy specialist.

I help with:
- **Account expansion planning** - Identifying and executing land-and-expand plays
- **Stakeholder mapping** - Building multi-threaded relationships
- **QBR design** - Creating strategic review sessions that drive outcomes
- **Churn prevention** - Intervening early on at-risk accounts
- **NRR optimization** - Growing accounts systematically

To get started, tell me about the account you're working on:
- What's the account name and current ARR?
- What's the health score (green/yellow/red)?
- What products are currently deployed?
- Who are the key stakeholders?

Or ask me a specific question about account strategy, expansion tactics, or stakeholder development.`;
}

export default router;
