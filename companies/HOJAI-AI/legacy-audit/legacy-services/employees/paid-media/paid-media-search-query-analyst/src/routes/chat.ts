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

  if (lastMessage.includes("negative keyword") || lastMessage.includes("negative")) {
    return `## Negative Keyword Architecture

### Tiered Structure
**Account Level** (Applies to all campaigns):
- Broad irrelevant terms
- Competitor names (unless competing)
- Job titles + free
- [Product] + review/complaint

**Campaign Level** (Applies to specific campaigns):
- Industry-specific irrelevant terms
- Product variations you don't sell
- Geographic exclusions

**Ad Group Level** (Highly specific):
- Close variants you don't want
- Intent mismatches

### Negative Keyword Decision Tree
If query contains [X] AND [Y], negative at [level]:
- [free] + [software] → Account level
- [cheap] + [specific product] → Campaign level
- [variant A] + [variant B] → Ad group level

### Common Negative Lists
1. **Research intent**: "what is", "how to", "tutorial"
2. **Free**: "free", "cheap", "discount"
3. **Job titles**: + jobs, + careers, + hiring
4. **Competitors** (if not competing): Competitor names

### Conflicts to Avoid
- Don't negative exact match keywords
- Don't negative close variants excessively
- Check for campaign overlap

${context?.campaignName ? `Build negatives for **${context.campaignName}**?` : "What campaign needs negative keywords?"}`;
  }

  if (lastMessage.includes("search term") || lastMessage.includes("query") || lastMessage.includes("waste")) {
    return `## Search Query Analysis Framework

### The 10-20% Rule
First analysis typically finds 10-20% of spend on irrelevant queries. That's pure waste.

### Query Analysis Process
1. Pull search term report
2. Flag non-converting queries
3. Calculate wasted spend
4. Group by pattern (n-gram)
5. Deploy targeted negatives

### N-Gram Analysis
Look for recurring irrelevant modifiers:
- [brand name] + [free] = negative
- [product] + [jobs] = negative
- [service] + [comic] = negative

### Intent Classification
| Intent | Query Example | Action |
|--------|--------------|--------|
| Informational | "what is X" | Negative or separate |
| Navigational | "[brand] login" | Negative if brand intent |
| Commercial | "best X review" | Keep, optimize |
| Transactional | "buy X now" | Priority |

### Query-to-Keyword Alignment
Each query should match:
- Relevant keyword
- Relevant ad copy
- Relevant landing page

Misalignment = Quality Score hit = wasted spend

${context?.timePeriod ? `Analyze search terms for **${context.timePeriod}**?` : "What time period would you like to analyze?"}`;
  }

  if (lastMessage.includes("match type") || lastMessage.includes("broad") || lastMessage.includes("phrase")) {
    return `## Match Type Strategy

### Match Type Hierarchy
**Broad**: Widest reach, least control
**Phrase**: Moderate reach, some control
**Exact**: Tightest control, highest efficiency

### When to Use Each
| Type | Use When |
|------|----------|
| Broad + Smart Bidding | Sufficient data, automated optimization |
| Phrase | Need some control, testing reach |
| Exact | Precise targeting, branded terms |

### Broad Match + Smart Bidding
- Let algorithm find conversions
- Monitor search terms weekly
- Build negative list aggressively
- Works best with 50+ conversions/week

### Close Variants
Google automatically includes:
- Stemming (run/running/runs)
- Plurals
- Misspellings
- Function words

### Match Type Expansion
Broad match EXPANDS beyond your keyword:
- "data analytics software" may show for "BI tools"
- Monitor what queries are triggered
- Negative irrelevant matches quickly

### Query Sculpting
Use negatives to direct queries:
- Campaign A: [data analytics]
- Campaign B: [business intelligence]
- Negative [business intelligence] in Campaign A

What match type strategy would you like to develop?`;
  }

  if (lastMessage.includes("opportunity") || lastMessage.includes("keyword discovery") || lastMessage.includes("new keyword")) {
    return `## Keyword Opportunity Mining

### Converting Query Expansion
Look for patterns in converting queries:
- "best [X]" → Add "top rated [X]"
- "[X] for [Y]" → Add more [Y] modifiers
- "[X] software" → Add adjacent products

### High-Volume, No-Keywords
Queries with impressions but no clicks:
- Add as keywords
- Improve ad copy
- Or negative if irrelevant

### Long-Tail Opportunities
- Lower competition
- Higher intent
- Longer queries = closer to purchase

### Research-Based Expansion
- Competitor keywords
- Industry terms
- Adjacent product searches
- Question-based queries

### New Keyword Templates
If [product] converts, consider:
- [product] alternatives
- [product] vs [competitor]
- [product] reviews
- [product] pricing
- [product] + [use case]

What opportunity would you like to explore?`;
  }

  // Default
  return `I'm ${persona.name}, search query analyst.

I help with:
- **Search term analysis** — N-gram, pattern identification
- **Negative keywords** — Tiered architecture, decision trees
- **Intent classification** — Informational, navigational, commercial, transactional
- **Match type optimization** — Broad, phrase, exact strategies
- **Waste identification** — Eliminating irrelevant spend
- **Keyword discovery** — Converting query expansion
- **Query sculpting** — Directing traffic to right campaigns

${context?.campaignName ? `Campaign: **${context.campaignName}**` : ""}
${context?.timePeriod ? `Period: **${context.timePeriod}**` : ""}

What analysis would you like to run?`;
}

export default router;
