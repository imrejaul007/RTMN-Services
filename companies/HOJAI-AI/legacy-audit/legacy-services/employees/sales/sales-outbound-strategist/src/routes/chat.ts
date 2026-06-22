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

  if (lastMessage.includes("signal") || lastMessage.includes("intent")) {
    return `## Signal-Based Selling Framework

### Signal Tiers by Intent

**TIER 1 — Active Buying Signals (4-8x conversion)**
- G2/review site visits, pricing page views
- Competitor comparison searches
- RFP/vendor evaluation announcements
- Tech evaluation job postings

**TIER 2 — Organizational Change (2-4x conversion)**
- Leadership changes (new VP = new priorities)
- Funding events (Series B+ = budget + urgency)
- Hiring surges (scaling pain)
- M&A activity

**TIER 3 — Technographic/Behavioral**
- Technology stack changes
- Conference attendance
- Content engagement (whitepapers, webinars)
- Competitor renewal timing

### Speed-to-Signal
- **<30 min**: Optimal — route to rep immediately
- **24 hours**: Stale — competitor likely engaged
- **72 hours**: Dead — conversation already happened

### Your ICP Filters
${context?.targetICP ? `Target ICP: **${context.targetICP}**` : "Define your ICP first."}

What signal would you like to build a play around?`;
  }

  if (lastMessage.includes("icp") || lastMessage.includes("ideal customer") || lastMessage.includes("target account")) {
    return `## ICP Definition Framework

### A Falsifiable ICP

If it doesn't EXCLUDE companies, it's not an ICP — it's a TAM slide.

**FIRMOGRAPHICS**
- Industry (2-4 specific, not "enterprise")
- Revenue/employee band
- Geography
- Tech stack requirements

**BEHAVIORAL QUALIFIERS**
- What event makes them buy NOW?
- What pain can't they ignore?
- Who feels it most acutely?
- What's their current workaround?

**DISQUALIFIERS** (Just as Important)
- What looks good but never closes?
- Win rate below 15%?
- Wrong stage for your product?

### Account Tiering

**Tier 1 (50-100 accounts)**
- Deep research: 10-K, earnings, strategic initiatives
- Multi-thread: 3-5 contacts per account
- Custom messaging per persona
- Dedicated rep, weekly reviews

**Tier 2 (200-500 accounts)**
- Industry messaging + account opening line
- 2-3 contacts
- Signal-triggered enrollment
- Quarterly re-evaluation

**Tier 3 (Remaining ICP)**
- Automated + dynamic tokens
- Single primary contact
- Signal-triggered only
- Auto-scoring for promotion

What ICP would you like to define?`;
  }

  if (lastMessage.includes("sequence") || lastMessage.includes("email") || lastMessage.includes("outreach")) {
    return `## Multi-Channel Sequence Design

### 10-Touch Sequence Structure

Touch 1 (Day 1, Email): Signal-based + value prop + soft CTA
Touch 2 (Day 3, LinkedIn): Connection request (no pitch)
Touch 3 (Day 5, Email): Insight/data point relevant to them
Touch 4 (Day 8, Phone): Voicemail drop referencing email
Touch 5 (Day 10, LinkedIn): Engage with their content
Touch 6 (Day 14, Email): Case study from similar company
Touch 7 (Day 17, Video): 60-sec Loom specific to them
Touch 8 (Day 21, Email): Different pain point/stakeholder
Touch 9 (Day 24, Phone): Final call attempt
Touch 10 (Day 28, Email): Breakup email — honest, brief

### Channel by Persona

| Persona | Primary | Secondary | Tertiary |
|---------|---------|-----------|----------|
| C-Suite | LinkedIn | Warm intro | Email |
| VP | Email | LinkedIn | Phone |
| Director | Email | Phone | LinkedIn |
| Manager/IC | Email | LinkedIn | Video |

### Cold Email Anatomy

**Subject**: 3-5 words, lowercase, internal-looking
❌ "Quick question about [company]"
✅ "re: the new data team"

**Opening**: Signal-based, specific
❌ "I hope this finds you well"
✅ "Saw you hired 4 data engineers..."

**CTA**: Single, low-friction
❌ "30-min demo call?"
✅ "15-minute conversation to see if this applies?"

### Reply Rate Benchmarks
- Generic: 1-3%
- Role/industry personalized: 5-8%
- Signal-based + research: 12-25%
- Referral-based: 30-50%

What sequence would you like to design?`;
  }

  if (lastMessage.includes("reply rate") || lastMessage.includes("conversion") || lastMessage.includes("metric")) {
    return `## Outbound Metrics That Matter

### Primary Metrics
| Metric | Target | What It Tells You |
|--------|--------|-------------------|
| Signal-to-Contact | <30 min | Speed of response |
| Reply Rate | 12-25% | Message relevance |
| Positive Reply Rate | 5-10% | Real interest |
| Meeting Conversion | 40-60% of +replies | Reply quality |
| Stage 1→2 Rate | 50%+ | Meeting qualification |
| Sequence Completion | 80%+ | Rep discipline |

### Vanity Metrics (Ignore)
- Activities per day
- Emails sent
- Calls made
- Connections sent

### Sequence Optimization
Test ONE variable at a time:
- Change subject → track reply rate
- Change opening → track reply rate
- Change CTA → track meeting conversion

If you change everything at once, you learn nothing.

### What Good Looks Like
- 100 contacts targeted with signal-based reasoning
- 12-25% reply rate
- 5-10% positive reply rate
- 40-60% of positives convert to meetings

What metric would you like to improve?`;
  }

  // Default
  return `I'm ${persona.name}, signal-based outbound strategist.

I help with:
- **Signal identification** — Tier 1/2/3 buying signals
- **ICP definition** — Falsifiable, not just TAM slides
- **Account tiering** — Tier 1/2/3 engagement model
- **Sequence design** — Multi-channel 10-touch plays
- **Cold email writing** — High-converting outreach
- **Metric optimization** — Reply rates, not send volumes

${context?.targetICP ? `Target ICP: **${context.targetICP}**` : ""}
${context?.signalType ? `Signal type: **${context.signalType}**` : ""}

What outbound challenge would you like to solve?`;
}

export default router;
