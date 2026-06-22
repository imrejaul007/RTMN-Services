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

  if (lastMessage.includes("audit") && (lastMessage.includes("checklist") || lastMessage.includes("200"))) {
    return `## 200+ Point Audit Framework

### Audit Categories (All Checked)

**1. Account Structure**
- Campaign taxonomy and naming
- Ad group granularity
- Label usage
- Geographic targeting
- Device bid adjustments
- Dayparting settings

**2. Tracking & Measurement**
- Conversion action configuration
- Attribution model selection
- GTM/GA4 implementation
- Enhanced conversions setup
- Offline conversion imports
- Cross-domain tracking

**3. Bidding & Budget**
- Bid strategy appropriateness
- Learning period violations
- Budget-constrained campaigns
- Portfolio bid strategies
- Bid floor/ceiling analysis

**4. Keyword & Targeting**
- Match type distribution
- Negative keyword coverage
- Keyword-to-ad relevance
- Quality score distribution
- Audience targeting vs observation
- Demographic exclusions

**5. Creative**
- RSA pin strategy
- Headline/description diversity
- Ad extension utilization
- Asset performance ratings
- Creative testing cadence

**6. Shopping & Feed**
- Product feed quality
- Title optimization
- Custom label strategy
- Disapproval rates
- Competitive pricing signals

**7. Competitive Positioning**
- Auction insights analysis
- Impression share gaps
- Competitive overlap rates
- Top-of-page rate

**8. Landing Page**
- Page speed
- Mobile experience
- Message match
- Conversion rate by page

What audit category would you like to dive into?`;
  }

  if (lastMessage.includes("finding") || lastMessage.includes("severity") || lastMessage.includes("critical")) {
    return `## Finding Severity Framework

### Severity Levels

**CRITICAL** (Fix immediately)
- Conversion tracking broken/missing
- Budget massively overallocated
- Policy violations active
- Severe Quality Score issues

**HIGH** (Fix within 1-2 weeks)
- Missing ad extensions
- Poor negative keyword coverage
- Suboptimal bid strategies
- Tracking partially broken

**MEDIUM** (Fix within 1 month)
- Creative fatigue
- Missing audience layers
- Suboptimal dayparting
- Moderate Quality Score issues

**LOW** (Optimize over time)
- Naming convention improvements
- Minor audience refinements
- Testing opportunities
- Nice-to-have optimizations

### Finding Format
Every finding includes:
1. **What**: Specific issue
2. **Why it matters**: Business impact
3. **Fix**: Specific action to take
4. **Projected impact**: Estimated improvement

What severity level would you like to explore?`;
  }

  if (lastMessage.includes("tracking") || lastMessage.includes("conversion")) {
    return `## Tracking & Measurement Audit

### Critical Checks
- [ ] Conversion actions configured correctly
- [ ] Attribution model appropriate for business
- [ ] GTM container healthy
- [ ] GA4 events firing correctly
- [ ] Enhanced conversions implemented
- [ ] Offline conversion imports working
- [ ] Cross-domain tracking verified

### Common Issues Found
1. **Duplicate conversions**: Counting same conversion multiple times
2. **Wrong attribution**: Crediting top-of-funnel when bottom drives value
3. **Missing micro-conversions**: Algorithm optimizing for wrong signal
4. **Cross-domain gaps**: Cart/checkout on different domains not tracked

### Impact of Bad Tracking
- Algorithm optimizes for wrong outcomes
- CPA/CRO metrics are wrong
- Budget misallocated
- Performance appears worse (or better) than reality

${context?.accountId ? `What tracking issue would you like to diagnose for account ${context.accountId}?` : "What tracking aspect would you like to audit?"}`;
  }

  if (lastMessage.includes("executive") || lastMessage.includes("summary")) {
    return `## Executive Audit Summary Framework

### Structure
1. **Account Health Score**: Overall 0-100 rating
2. **Quick Wins**: High-impact, low-effort fixes
3. **Critical Issues**: Must-fix immediately
4. **Projected Impact**: Dollar improvement estimate
5. **Priority Roadmap**: 30/60/90 day action plan

### Impact Calculation
Typical audit finds 15-30% efficiency improvement:
- $50K/month spend → $7.5K-$15K/month savings
- $100K/month spend → $15K-$30K/month savings
- $500K/month spend → $75K-$150K/month savings

### Executive Translation
Translate technical findings:
❌ "QS distribution is 60% below 7"
✅ "Campaigns are paying 20-40% more per click than necessary"

❌ "Missing RLSA audiences"
✅ "Not reaching 30% of high-value past visitors"

What executive summary would you like to create?`;
  }

  // Default
  return `I'm ${persona.name}, paid media auditor.

I evaluate accounts across 200+ checkpoints:
- **Account Structure** — Taxonomy, naming, targeting
- **Tracking** — Conversions, attribution, GTM/GA4
- **Bidding** — Strategies, budgets, bid adjustments
- **Keywords** — Match types, negatives, quality scores
- **Creative** — RSAs, extensions, asset performance
- **Shopping** — Feed quality, titles, labels
- **Competitive** — Auction insights, impression share
- **Landing Pages** — Speed, mobile, message match

${context?.platforms?.length ? `Platforms: ${context.platforms.join(", ")}` : ""}
${context?.monthlySpend ? `Monthly spend: $${context.monthlySpend.toLocaleString()}` : ""}

What audit would you like to run?`;
}

export default router;
