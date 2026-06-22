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

  if (lastMessage.includes("meta") || lastMessage.includes("facebook") || lastMessage.includes("instagram")) {
    return `## Meta Advertising Framework

### Campaign Structure Options
**CBO (Campaign Budget Optimization)**
- Let algorithm optimize across ad sets
- Better for 5+ ad sets
- Less control, more automation

**ABO (Ad Set Budget)**
- Control budget per audience
- Better for testing
- More manual management

### Audience Types
| Type | Use Case | Size |
|------|----------|------|
| Custom Audiences | Retargeting site/app visitors | 1K+ |
| Lookalikes | Find similar people | 1-10% similarity |
| Saved | Broad interest targeting | Wide reach |
| Engagement | Video/Post engagers | 1K+ |

### Key Metrics
- Frequency: 1.5-2.5 prospecting, 3-5 retargeting
- CTR: 1-2% prospecting, 2-4% retargeting
- CPC: Varies by competition
- ROAS: 3:1+ retargeting, 1.5:1+ prospecting

### Advantage+ Shopping
Automated product ads using machine learning:
- Dynamic creative selection
- Automatic budget allocation
- Broad audience targeting

What Meta campaign would you like to design?`;
  }

  if (lastMessage.includes("linkedin") || lastMessage.includes("b2b")) {
    return `## LinkedIn Advertising Framework

### Ad Formats
| Format | Best For |
|--------|----------|
| Sponsored Content | Awareness, thought leadership |
| Message Ads | Personalized outreach, ABM |
| Conversation Ads | Complex nurturing |
| Document Ads | Lead gen, whitepapers |
| Dynamic Ads | Personalization at scale |

### B2B Targeting
**Account Targeting**:
- Target by company name, size, industry
- Match with CRM data
- ABM list uploads

**Job Title Targeting**:
- Be specific (Director, VP, C-level)
- Layer with seniority
- Combine with company targeting

### ABM Integration
1. Upload target account list
2. Match to LinkedIn profiles
3. Run targeted campaigns
4. Track engagement by account
5. Route hot accounts to sales

### Lead Gen Forms
- Pre-filled with LinkedIn data
- Lower friction
- Higher volume, lower quality

What LinkedIn campaign would you like to design?`;
  }

  if (lastMessage.includes("tiktok")) {
    return `## TikTok Advertising Framework

### Ad Formats
| Format | Use Case |
|--------|----------|
| Spark Ads | Organic content amplification |
| TopView | Maximum impact, first impression |
| In-Feed Ads | Native scroll experience |
| Branded Hashtag | Challenge/awareness |

### Creative Requirements
- Native, UGC-style content
- First 1-3 seconds critical
- No polished ads — feels like content
- Music/sound integral
- Vertical (9:16)

### Audience Targeting
- Interest-based (not keyword)
- Behavioral signals
- Custom audiences (limited)
- Lookalikes from pixel

### TikTok Creative Center
- Research trending sounds
- See top-performing creatives
- Identify format trends

What TikTok campaign would you like to design?`;
  }

  if (lastMessage.includes("full funnel") || lastMessage.includes("funnel") || lastMessage.includes("audience")) {
    return `## Full-Funnel Social Strategy

### Funnel Stages

**AWARENESS** (Top)
- Objective: Reach, video views
- Audience: Broad, interest-based
- Creative: Educational, entertaining
- Budget: 20-30%

**CONSIDERATION** (Middle)
- Objective: Traffic, engagement
- Audience: Engaged users, lookalikes
- Creative: Value prop, social proof
- Budget: 30-40%

**CONVERSION** (Bottom)
- Objective: Leads, purchases
- Audience: Warm retargeting, high-intent
- Creative: Direct response, urgency
- Budget: 30-40%

**RETENTION** (Loyalty)
- Objective: Repeat purchases, LTV
- Audience: Past purchasers
- Creative: Exclusives, upsells
- Budget: Ongoing

### Audience Overlap
Prevent same person seeing ads across funnel:
- Suppress converters from prospecting
- Exclude past purchasers from acquisition (unless upsell)

### Frequency Management
- Prospecting: 1.5-2.5 impressions/week
- Retargeting: 3-5 impressions/week
- Above = waste, below = forget

What funnel stage would you like to design?`;
  }

  // Default
  return `I'm ${persona.name}, paid social strategist.

I help with:
- **Meta** — CBO/ABO, audiences, Advantage+
- **LinkedIn** — B2B targeting, ABM, lead gen
- **TikTok** — Native creative, Spark Ads
- **Full-funnel** — Awareness to conversion
- **Audience strategy** — Suppression, overlap
- **Frequency management** — Optimal impression caps

${context?.platform ? `Platform: **${context.platform}**` : ""}
${context?.campaignObjective ? `Objective: **${context.campaignObjective}**` : ""}
${context?.monthlyBudget ? `Budget: **$${context.monthlyBudget.toLocaleString()}**/month` : ""}

What would you like to design?`;
}

export default router;
