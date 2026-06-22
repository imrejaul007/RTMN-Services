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

  if (lastMessage.includes("forecast") || lastMessage.includes("commit") || lastMessage.includes("revenue")) {
    return `## Forecast Methodology

### Three-Tier Forecast
| Category | Confidence | What's Included |
|----------|------------|-----------------|
| **Commit** | >90% | Signed contracts, verbal commitments |
| **Best Case** | >60% | Commit + high-velocity qualified deals |
| **Upside** | <60% | Best Case + early-stage opportunities |

### Never Report a Single Number
Always include confidence intervals. Point estimates create false precision.

### Forecast Adjustments
${context?.forecastData ? `
**Current Forecast:**
- Commit: $${context.forecastData.commit.toLocaleString()}
- Best Case: $${context.forecastData.bestCase.toLocaleString()}
- Upside: $${context.forecastData.upside.toLocaleString()}
` : ""}

Adjust based on:
1. **Historical conversion rates** by stage and segment
2. **Velocity weighting** — deals progressing faster than avg
3. **Engagement signals** — multi-threaded vs single-threaded
4. **Seasonal patterns** — Q4 compression, etc.

### Red Flags
- Deals in late stages without EB contact
- Deals with no activity >14 days
- Stage-weighted probability vs. actual historical close rate

${context?.period ? `**${context.period}** forecast analysis needed?` : "What quarter would you like to forecast?"}`;
  }

  if (lastMessage.includes("pipeline") && (lastMessage.includes("health") || lastMessage.includes("review"))) {
    return `## Pipeline Health Diagnostics

### Pipeline Velocity Formula
**Velocity = (Opportunities x Avg Deal Size x Win Rate) / Sales Cycle**

Each variable is a diagnostic lever:
- **Opportunities**: Declining top-of-funnel = revenue impact 2-3 quarters out
- **Avg Deal Size**: Segment it — blended averages hide problems
- **Win Rate**: By stage, rep, segment — find where deals die
- **Sales Cycle**: Lengthening = competitive pressure or qualification gaps

### Coverage Targets
| Business Stage | Target Coverage |
|----------------|----------------|
| Mature | 3x |
| Growth | 4-5x |
| New rep | 5x+ |

### Quality-Adjusted Coverage
$5M of stale unqualified deals < $2M of active qualified deals.

### Deals Requiring Intervention
Flag deals with:
- No activity >30 days
- Single-threaded >$50K
- MEDDPICC score <5/8 at late stages
- Stage age >1.5x benchmark

${context?.segment ? `**${context.segment}** pipeline health?` : "What segment would you like to analyze?"}`;
  }

  if (lastMessage.includes("deal") && (lastMessage.includes("score") || lastMessage.includes("health"))) {
    return `## Deal Health Scoring

### MEDDPICC Assessment (16 points max)
| Criteria | Score | What It Means |
|----------|-------|--------------|
| Metrics | /2 | Buyer quantified value? |
| Economic Buyer | /2 | Identified and engaged? |
| Decision Criteria | /2 | Known and favorable? |
| Decision Process | /2 | Mapped and confirmed? |
| Paper Process | /2 | Legal/procurement known? |
| Implicated Pain | /2 | Business outcome tied? |
| Champion | /2 | Power + Access + Motive? |
| Competition | /2 | Mapped and positioned? |

### Engagement Score (10 points)
- Meeting recency (<14 days = green)
- Stakeholder breadth (multi-threaded = green)
- Buyer-initiated activity (strongest signal)
- Content engagement (proposals, docs)

### Velocity Score (10 points)
- Stage progression vs. benchmark
- Deals stalling = deals dying

### Composite Score (36 max)
- **28-36**: Advance — healthy deal
- **18-27**: Intervene — fix gaps
- **<18**: Nurture or disqualify

What deal would you like to score?`;
  }

  if (lastMessage.includes("velocity") || lastMessage.includes("conversion")) {
    return `## Stage Conversion Analysis

### Velocity Metrics
| Metric | Formula | What It Tells You |
|--------|---------|-------------------|
| Velocity | (Opps x ADS x Win Rate) / Cycle | Speed of revenue through funnel |
| Conversion Rate | Converted / In | Where deals die |
| Stage Duration | Avg days per stage | Bottlenecks |
| Productivity | Revenue / Rep | Efficiency |

### Stage-Level Win Rates
Track by segment and deal size, not just blended.

Example:
- Discovery → Qualification: 60%
- Qualification → Evaluation: 45%
- Evaluation → Proposal: 55%
- Proposal → Negotiation: 70%
- Negotiation → Close: 80%

Where are deals dying in YOUR funnel?

### Leading vs. Lagging Indicators
**Leading** (Predict):
- Pipeline creation velocity
- Stage conversion rates
- Activity metrics

**Lagging** (Confirm):
- Revenue closed
- Win/loss ratios
- Cycle length actuals

Act on leading indicators BEFORE lagging confirms the problem.`;
  }

  // Default
  return `I'm ${persona.name}, pipeline analytics specialist.

I help with:
- **Forecast modeling** — Commit/Best Case/Upside with confidence ranges
- **Pipeline health** — Velocity, coverage, quality-adjusted analysis
- **Deal scoring** — MEDDPICC assessment + engagement + velocity
- **Stage conversion** — Where deals die and why
- **Risk surfacing** — At-risk deals 30+ days before quarter close
- **Data quality** — Flagging stale/underqualified pipeline

${context?.period ? `**Current Period**: ${context.period}` : ""}
${context?.totalPipeline ? `**Total Pipeline**: $${context.totalPipeline.toLocaleString()}` : ""}
${context?.quotaRemaining ? `**Quota Remaining**: $${context.quotaRemaining.toLocaleString()}` : ""}

What analysis would you like to run?`;
}

export default router;
