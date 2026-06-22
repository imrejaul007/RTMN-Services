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

  if (lastMessage.includes("rsa") || lastMessage.includes("responsive search") || lastMessage.includes("headline")) {
    return `## RSA Architecture Framework

### 15-Headline Strategy
Mix across these categories:
1. **Brand** (2-3): Your brand name, tagline
2. **Keywords** (3-4): Query-matched terms
3. **Benefits** (3-4): What users gain
4. **Features** (2-3): Specific capabilities
5. **CTA** (2-3): Action-oriented
6. **Social Proof** (1-2): Trust signals

### Character Limits
- Headlines: 30 characters max
- Descriptions: 90 characters max
- Every combination must read coherently

### Pin Strategy
Pin high-performing assets to specific positions:
- Position 1: Keyword/Brand
- Position 2: Primary benefit
- Position 3: CTA/Social proof

### Description Pairing
Write descriptions that work with ANY headline combo:
- Don't reference specific headlines
- Lead with different info than headlines
- Include a CTA

### Ad Strength Checklist
- [ ] 15 unique headlines (no duplicates)
- [ ] All 90-char descriptions filled
- [ ] 4+ distinct themes
- [ ] No truncation warnings
- [ ] Every combo grammatically correct

${context?.campaignName ? `Create RSA copy for **${context.campaignName}**?` : "What campaign needs RSA copy?"}`;
  }

  if (lastMessage.includes("meta") || lastMessage.includes("facebook") || lastMessage.includes("instagram")) {
    return `## Meta Creative Framework

### Structure: Hook-Body-CTA
**Hook** (0-3 sec): Stop the scroll
- Question, bold claim, visual surprise
- "This is why most [X] fail..."

**Body**: Build the value
- Benefits, not features
- Social proof, data points
- Address the objection

**CTA**: What to do next
- Specific, action-oriented
- "Start Free Trial" > "Learn More"

### Format Selection
| Format | Best For |
|--------|----------|
| Single Image | Simple offers, retargeting |
| Carousel | Multiple products/features |
| Video | Complex stories, awareness |
| Collection | Ecommerce, browse-to-buy |

### Primary Text Best Practices
- Lead with benefit, not brand
- Include social proof
- Address the objection
- 125-150 characters optimal

### Creative Testing Plan
1. **Hypothesis**: "Using [X] will improve CTR by 15%"
2. **Variants**: Control + 2-3 test groups
3. **Metric**: Primary CTR, secondary conversion rate
4. **Sample**: Reach statistical significance
5. **Duration**: 2-4 weeks minimum

What Meta creative would you like to build?`;
  }

  if (lastMessage.includes("creative test") || lastMessage.includes("a/b test") || lastMessage.includes("fatigue")) {
    return `## Creative Testing Framework

### Test Design
1. **Hypothesis**: Specific, measurable
   - "Headline [X] will outperform [Y] by 10%"

2. **Variables**: Test ONE at a time
   - Headline vs headline
   - CTA vs CTA
   - Image vs image

3. **Sample Size**: Statistical significance
   - Rule of thumb: 1000+ clicks per variant
   - Use calculator for confidence interval

4. **Duration**: 2-4 weeks minimum
   - Need full business cycle
   - Day-of-week variance

### Fatigue Detection
Watch for:
- CTR declining over time
- Conversion rate declining
- Frequency >4 for prospecting

### Refresh Triggers
- CTR dropped 20%+ from peak
- Frequency hitting 5+
- 4+ weeks since refresh
- Seasonal/product change

### Test Velocity
Target: 2-3 new tests per major campaign/month

What creative test would you like to design?`;
  }

  // Default
  return `I'm ${persona.name}, ad creative strategist.

I help with:
- **RSA copy** — 15-headline strategy, pin optimization
- **Meta creative** — Hook-body-CTA, format selection
- **Performance Max** — Asset group composition
- **Creative testing** — A/B frameworks, fatigue detection
- **Ad strength** — Google's 0-10 score improvement
- **Landing page alignment** — Message match scoring

${context?.campaignName ? `Campaign: **${context.campaignName}**` : ""}
${context?.platform ? `Platform: **${context.platform}**` : ""}

What creative challenge would you like to tackle?`;
}

export default router;
