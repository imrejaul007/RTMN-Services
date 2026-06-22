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

  if (lastMessage.includes("account structure") || lastMessage.includes("campaign architecture") || lastMessage.includes("campaigns")) {
    return `## Campaign Architecture Framework

### Tiered Structure
**Brand Campaign**
- Protect brand terms
- 100% + bids
- High impression share target (90%+)

**Non-Brand Campaigns**
- Core product/service keywords
- Moderate bids
- Primary volume drivers

**Competitor Campaigns**
- Target competitor terms
- Lower bids, test offers
- Budget capped

**Remarketing/RLSA**
- Past visitors, cart abandoners
- Higher bids
- Intent signals

### Campaign Naming Convention
[Channel]_[Match_Type]_[Product]_[Target]_[Geo]
Example: SEM_Exact_Data_SaaS_US

### Budget Allocation
${context?.monthlyBudget ? `$${context.monthlyBudget.toLocaleString()}/month:` : ""}
- Brand: 10-15%
- Non-brand: 50-60%
- Competitor: 10-15%
- Remarketing: 15-25%

What architecture would you like to build?`;
  }

  if (lastMessage.includes("bidding") || lastMessage.includes("bid strategy") || lastMessage.includes("tcpa") || lastMessage.includes("troas")) {
    return `## Bidding Strategy Framework

### Strategy Selection
| Strategy | Use When | Requirements |
|----------|-----------|--------------|
| Max Conversions | 50+ conversions/week, stable volume | Conversion tracking |
| tCPA | Need predictable CPA | 50+ conversions/week |
| tROAS | Maximize revenue value | ecomm with values |
| Max Conv Value | Variable values | 100+ conversions/week |
| Manual CPC | Learning phase, low volume | None |
| eCPC | Transition to automation | 30+ conversions/week |

### When to Automate
- Minimum 30-50 conversions/week for 2+ weeks
- Stable account (no major changes)
- Accurate conversion tracking
- Sufficient budget (10x target CPA minimum)

### Bid Strategy Transitions
1. Start with eCPC or Manual
2. Gather conversion data
3. Switch to Target CPA
4. Once stable, test Target ROAS
5. Ultimately Maximize Conversions

### Portfolio Bid Strategies
For MCC-level optimization:
- Combine similar campaigns
- Set portfolio-level targets
- Let algorithm optimize across accounts

What bidding strategy would you like to design?`;
  }

  if (lastMessage.includes("performance max") || lastMessage.includes("pmax")) {
    return `## Performance Max Strategy

### When to Use
- Wide audience reach
- Cross-channel goals
- Automated optimization needed
- Feed-based products/services

### Asset Groups
Structure by theme, not product:
- Theme 1: Core product/service
- Theme 2: Seasonal/promotional
- Theme 3: Brand messaging

### Required Assets
- 3+ images (landscape, square)
- 2+ videos (or use video assets)
- 5+ headlines (short, punchy)
- 5+ descriptions
- Logo (if using brand awareness)

### Signals vs. Targeting
- Signals guide, not restrict
- First-party audiences strongest
- Broad targeting + signals

### Budget Considerations
- Start with 50% of search budget
- Allow 2-3 weeks learning
- Scale based on performance

What Performance Max campaign would you like to design?`;
  }

  if (lastMessage.includes("impression share") || lastMessage.includes("competitive")) {
    return `## Competitive Intelligence Framework

### Impression Share Analysis
- Top of page IS: 90%+ brand, 40-60% non-brand
- Outranking share: How often beating competitor
- Lost IS (rank): Need higher bids or QS
- Lost IS (budget): Budget constrained

### Auction Insights
- Impression share vs. competitors
- Average position vs. competitors
- Overlap rate: Showing with competitor
- Top IS rate: Top of page vs. total

### Bidding for Share
**High Value Keywords**:
- Increase bids to capture IS
- Target 70-80% IS

**Price Sensitive**:
- Accept lower IS
- Optimize for efficiency not share

### Competitor Conquesting
- Bid on competitor terms
- Strong unique value prop
- Budget capped (10-15% max)

What competitive analysis would you like to run?`;
  }

  // Default
  return `I'm ${persona.name}, PPC campaign strategist.

I help with:
- **Account architecture** — Campaign structure, naming
- **Bidding strategies** — tCPA, tROAS, Max Conversions
- **Performance Max** — Asset groups, signals
- **Budget allocation** — Across campaigns/platforms
- **Competitive intelligence** — Impression share, conquesting
- **Keyword strategy** — Match types, negatives
- **Audience signals** — RLSA, Customer Match

${context?.monthlyBudget ? `Budget: **$${context.monthlyBudget.toLocaleString()}**/month` : ""}
${context?.campaignType ? `Campaign type: **${context.campaignType}**` : ""}

What strategy would you like to develop?`;
}

export default router;
