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

  if (lastMessage.includes("display") || lastMessage.includes("gdn") || lastMessage.includes("placement")) {
    return `## Display & GDN Strategy

### Key Differences from Search
Display is NOT search:
- Reach vs. clicks
- Frequency matters
- Brand building vs. direct response
- Viewability vs. CTR

### GDN Campaign Structure
**Managed Placements**:
- Curate high-quality sites
- Block low performers
- Category-based selection

**Audience Targeting**:
- In-market audiences
- Custom intent (keywords)
- Remarketing lists

**Topic Targeting**:
- Broader reach
- Interest-based
- Lower specificity

### Placement Management
1. Start with managed placements only
2. Add exclusions for waste
3. Expand after 2-3 weeks
4. Monitor viewability by site

### Viewability Standards
- MRC standard: 50% for display, 30% for video
- Best practice: 70%+ viewability
- Below 50% = investigate

What display campaign would you like to plan?`;
  }

  if (lastMessage.includes("programmatic") || lastMessage.includes("dsp") || lastMessage.includes("dv360")) {
    return `## Programmatic & DSP Strategy

### Deal Types
| Type | Guarantee | Price | Use Case |
|------|-----------|-------|----------|
| PG | 100% | Fixed | Premium inventory |
| PMP | 70-90% | Floor | Preferred access |
| Open Exchange | None | Bid-based | Scale, testing |

### Supply Path Optimization
- Direct publishers > exchanges
- Preferred deals > open exchange
- Clean supply > bloated

### Audience Targeting
- First-party data (own)
- Third-party segments
- Contextual signals
- Lookalike modeling

### DV360 Features
- Integrated bidding across formats
- Cross-exchange inventory
- Audience management
- Attribution & reporting

### Measurement
- View-through attribution (VTC)
- Incrementality testing
- Brand lift studies

What programmatic campaign would you like to design?`;
  }

  if (lastMessage.includes("abm") || lastMessage.includes("account-based") || lastMessage.includes("demandbase")) {
    return `## ABM Display Strategy

### Platform Options
- Demandbase
- 6Sense
- RollWorks
- LinkedIn Matched Audiences

### Account List Strategy
1. **Upload**: Target accounts (100-1000)
2. **Enrich**: Firmographic data
3. **Score**: Engagement scoring
4. **Target**: Intent signals + display

### Targeting Layers
- Company name/industry
- Job title seniority
- Tech stack signals
- Intent topics

### Suppression
- Exclude current customers (unless upsell)
- Exclude unqualified accounts
- Reduce frequency for engaged accounts

### Measurement
- Reach against target list
- Engagement score trends
- Pipeline attributed to ABM

What ABM campaign would you like to design?`;
  }

  if (lastMessage.includes("viewability") || lastMessage.includes("brand safety") || lastMessage.includes("ivt")) {
    return `## Viewability & Brand Safety

### Viewability Benchmarks
| Format | MRC Standard | Best Practice |
|--------|-------------|---------------|
| Display | 50% | 70%+ |
| Video | 30% | 70%+ |
| Pre-roll | 50% | 80%+ |

### IVT (Invalid Traffic)
- General IVT: <3% threshold
- Sophisticated IVT: <1% threshold
- Monitor regularly
- Refund requests for high IVT

### Brand Safety
Tools:
- IAS (Integral Ad Science)
- DoubleVerify
- OpenSlate

Strategies:
- Whitelisting premium sites
- Blacklisting risky categories
- Contextual exclusions
- Topic/content targeting

### Frequency Management
- Prospecting: 3-5 impressions/week
- Retargeting: 5-7 impressions/week
- Above threshold = waste
- Below threshold = forget

What safety/quality concern would you like to address?`;
  }

  // Default
  return `I'm ${persona.name}, programmatic & display buyer.

I help with:
- **Display campaigns** — GDN, managed placements
- **Programmatic buying** — DSP, DV360, deals
- **ABM display** — Demandbase, account targeting
- **Viewability** — MRC standards, optimization
- **Brand safety** — IVT, contextual targeting
- **Partner media** — Newsletter, sponsorships
- **Frequency caps** — Impression management

${context?.platform ? `Platform: **${context.platform}**` : ""}

What display or programmatic campaign would you like to design?`;
}

export default router;
