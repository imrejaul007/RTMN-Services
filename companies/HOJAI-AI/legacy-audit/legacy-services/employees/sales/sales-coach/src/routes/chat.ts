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
    prompt += "\n\n## Current Coaching Context\n";
    if (context.repId) prompt += `- **Rep ID**: ${context.repId}\n`;
    if (context.repName) prompt += `- **Rep Name**: ${context.repName}\n`;
    if (context.quotaAttainment) prompt += `- **Quota Attainment YTD**: ${context.quotaAttainment}%\n`;
    if (context.winRate) prompt += `- **Win Rate**: ${context.winRate}%\n`;
    if (context.averageDealSize) prompt += `- **Average Deal Size**: $${context.averageDealSize.toLocaleString()}\n`;
    if (context.salesCycleLength) prompt += `- **Sales Cycle Length**: ${context.salesCycleLength} days\n`;
    if (context.focusAreas?.length) prompt += `- **Focus Areas**: ${context.focusAreas.join(", ")}\n`;
    if (context.coachingHistory?.length) {
      prompt += "\n### Recent Coaching History\n";
      context.coachingHistory.forEach(h => prompt += `- ${h}\n`);
    }
  }

  prompt += "\n\nCoach with specificity, behavioral feedback, and Socratic questions. Every interaction should produce at least one actionable takeaway.";
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
  // TODO: Integrate with your AI provider

  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes("pipeline review") || lowerMessage.includes("deal inspect")) {
    return `## Pipeline Review Coaching Framework

### The Pipeline Review Mindset Shift
Transform reviews from interrogation to coaching:
- **Replace**: "When is this closing?"
- **With**: "What do we not know about this deal?"

### Deal Inspection Questions (Ask Each Deal)
1. What changed since last review? (Progress, not activity)
2. Who are we talking to? (Multi-threaded or single-threaded?)
3. What is the business case? (Why would they spend this money?)
4. What is the decision process? (Steps, people, criteria, timeline)
5. What is the biggest risk? (And the plan to mitigate?)
6. What is the specific next step? (Date, owner, purpose)

### Red Flags to Surface
${context?.repName ? `
**${context.repName}'s** pipeline shows:` : `**Your** pipeline shows:`}
- Deals stuck in same stage >1.5x average
- Single-threaded deals >$50K
- Missing MEDDPICC fields at late stages
- Deals with no activity >14 days

### Pipeline Quality Check
A $2M pipeline of unqualified deals is WORSE than $800K of well-qualified deals.

Each deal should have:
- [ ] Economic buyer identified
- [ ] Business case quantified
- [ ] Decision timeline known
- [ ] Competitors mapped
- [ ] Next step with commitment

What deal would you like to analyze together?`;
  }

  if (lowerMessage.includes("call review") || lowerMessage.includes("discovery") || lowerMessage.includes("demo")) {
    return `## Call Coaching Framework

### The Observe-Ask-Suggest-Practice Loop
1. **Observe**: Describe what you saw specifically
2. **Ask**: "What were you thinking when...?"
3. **Suggest**: Here's what to try instead
4. **Practice**: Let's practice it now

### Discovery Call Coaching Points
**What to Look For**:
- Talk-to-listen ratio (buyer should talk 60%+)
- Question depth (3+ follow-ups before solution)
- SPIN sequence (Situation → Problem → Implication → Need-Payoff)
- Silence after hard questions (let them think)

**Key Moments to Capture**:
- "At 4:32 when buyer said [X], you responded with [Y]"
- "What was the real question behind what they asked?"

### The MEDDPICC Diagnostic
When a rep can't articulate:
- **Economic Buyer** → CRM hygiene issue? No. Deal risk.
- **Metrics** → No quantified business case = no urgency
- **Decision Process** → Unknown process = unknown timeline

### Behavioral Feedback Formula
"**At [timestamp], when [buyer action], you [response]. Instead, try [alternative]. This matters because [impact].**"

### What Great Discovery Looks Like
- Buyer says "that's a great question" and pauses
- Buyer reveals something unplanned
- Buyer sells internally before you ask
- You can restate their situation and they say "Exactly"

What call would you like to debrief?`;
  }

  if (lowerMessage.includes("forecast") || lowerMessage.includes("commit")) {
    return `## Forecast Coaching Framework

### The Forecast Question
Never: "Do you feel good about this deal?"
Always: "What has the buyer DONE, not SAID, that tells you this is closing?"

### Commit Criteria by Stage
Each stage needs VERIFIABLE EVIDENCE:
- **Stage 1-2**: Champion identified, pain quantified
- **Stage 3-4**: EB access, decision criteria known
- **Stage 5+**: Proposal sent, procurement timeline known
- **Commit**: Verbal yes or signed contract

### Forecast Categories (Protect These)
1. **Closed**: Signed contracts
2. **Commit**: >90% confidence based on evidence
3. **Best Case**: >60% confidence, needs execution
4. **Upside**: Possible but needs several things to go right

### Rep Forecasting Patterns
${context?.repName ? `
**${context.repName}'s** pattern:` : `To identify your pattern:`}
- Consistently over-forecast → Coaching on qualification
- Consistently under-forecast → Coaching on deal control
- Wild swings → Pattern interrupt needed

### Protecting Forecast Integrity
- Pulling from commit should be REWARDED (intellectual honesty)
- Keeping dead deals in commit needs coaching (not punishment)
- Track accuracy over time, not just at quarter-end

What deal's forecast would you like to pressure-test?`;
  }

  if (lowerMessage.includes("ramp") || lowerMessage.includes("new rep") || lowerMessage.includes("onboarding")) {
    return `## New Rep Ramp Plan Framework

### 30-Day Milestones (Learn)
- [ ] Complete product certification
- [ ] Shadow discovery calls and demos
- [ ] Practice pitch with manager feedback
- [ ] Articulate top 3 pain points + product answers
- [ ] CRM and tool stack onboarded
- **Gate**: Can they describe value prop in customer language?

### 60-Day Milestones (Execute with Support)
- [ ] Run discovery calls with manager observing
- [ ] Build qualified pipeline (MEDDPICC, not dollar value)
- [ ] Use qualification framework correctly
- [ ] Handle top 5 objections without help
- **Gate**: Full discovery call, business pain + stakeholders + next step

### 90-Day Milestones (Execute Independently)
- [ ] Pipeline target with stage-appropriate qualification
- [ ] Close first deal (or final negotiation)
- [ ] Forecast with [%] accuracy vs commit
- [ ] Positive buyer feedback on calls
- **Gate**: Manage deal qualification through close

### Competency Gates
1. **30 days**: "Tell me what we solve and for whom"
2. **60 days**: "Run a full discovery call"
3. **90 days**: "Manage a deal independently with coaching on strategy, not execution"

### Coaching by Experience Level
- **New reps**: Skill building, process adherence
- **Experienced reps**: Strategic sharpening, pattern interruption

What aspect of the ramp plan would you like to explore?`;
  }

  if (lowerMessage.includes("objection") || lowerMessage.includes("handle")) {
    return `## Objection Handling Coaching

### The AECR Framework
**Acknowledge**: "Fair concern, I hear that often"
**Empathize**: "If I were in your shoes..."
**Clarify**: "Help me understand specifically what concerns you"
**Reframe**: "Here's how others in your situation have thought about it"

### Objection Distribution
| Category | Frequency | What It Really Means |
|----------|-----------|---------------------|
| Budget/Value | 48% | "ROI doesn't justify cost" or "I don't control budget" |
| Timing | 32% | "Not a priority" or "Bandwidth issue" |
| Competition | 20% | "Need to justify not [alternative]" |

### Price Objection Coaching
Budget objections are rarely about budget.
They're about whether value > cost.

If discovery was thorough:
- Quantify the gap clearly
- Make it a math problem, not a negotiation

### Competitor Objection
- Never trash the competitor
- Acknowledge their strength
- Reframe toward your differentiator
- "They're great at X. For teams needing Y, here's how we differ..."

### Hard Questions for Reps
- "What was the real objection behind what they said?"
- "What would need to be true for this to not be an objection?"
- "What question could you have asked earlier to surface this sooner?"

What type of objection would you like to practice handling?`;
  }

  // Default response
  return `I'm ${persona.name}, your sales coaching specialist.

I help with:
- **Pipeline reviews** - Turn interrogation into coaching
- **Call coaching** - Specific, behavioral feedback on calls
- **Deal strategy** - Pressure-test deals with MEDDPICC
- **Forecast accuracy** - Evidence-based commit discipline
- **Rep development** - Individualized coaching plans
- **Ramp plans** - Get new reps to productivity faster

${context?.repName ? `
Currently coaching: **${context.repName}**
${context.focusAreas?.length ? `Focus areas: ${context.focusAreas.join(", ")}` : ""}
` : ""}

What would you like to work on today?`;
}

export default router;
