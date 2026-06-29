# Partnership Brief: Anthropic

**Audience:** Anthropic Partnerships, Claude Enterprise Team
**Goal:** Make Nexha the default commerce layer for Claude agents
**Date:** 2026-06-29

---

## TL;DR

Anthropic's strength is **enterprise-grade AI** — governance, safety, long context, audit trails. Nexha's strength is **real-world commerce execution** — suppliers, contracts, payments, logistics.

Together: **the safest, most auditable AI commerce platform.**

## Why Anthropic + Nexha?

### Claude's Enterprise DNA

Anthropic has won the enterprise market with:
- ✅ SOC 2, HIPAA, FedRAMP compliance
- ✅ 200K context window
- ✅ Constitutional AI safety
- ✅ Industry-leading reasoning
- ✅ Artifacts, Projects, MCP

But Claude, like every LLM, can't transact. When a CFO asks Claude "what's our Q3 procurement budget vs actual?" — Claude can answer. When they ask "buy $50K of server racks" — Claude hits a wall.

**Nexha breaks that wall.**

### MCP-First Integration

Claude Desktop and Claude Code already support MCP (Model Context Protocol). We've built an MCP server that exposes Nexha as native Claude tools:

```json
{
  "mcpServers": {
    "nexha": {
      "command": "npx",
      "args": ["@nexha/mcp-server"],
      "env": { "NEXHA_API_KEY": "nx_xxx" }
    }
  }
}
```

**No code changes.** Enterprise users just enable Nexha in their Claude settings and instantly get commerce capabilities.

## Use Cases

| Persona | Use Case |
|---------|----------|
| **CFO** | "Source $500K of cloud credits. Compare 3 providers, negotiate, contract, pay." |
| **Procurement Manager** | "Find 5 verified vendors for industrial pumps, check trust scores, get quotes." |
| **Sales Ops** | "Process 100 pending orders, sign contracts, dispatch shipments." |
| **Compliance Officer** | "Audit all transactions from last quarter. Flag anything with trust < 70." |
| **Operations Lead** | "Auto-restock inventory when supplies < 20%. Trigger through Nexha." |

## What Makes This Different from OpenAI

| Aspect | OpenAI | Anthropic |
|--------|--------|-----------|
| **Market** | Consumer + Enterprise | Enterprise-focused |
| **Compliance** | Growing | Mature |
| **Safety** | Good | Best-in-class |
| **Tools** | Function calling | MCP (open standard) |
| **Trust** | Trustworthy | **Constitutional** |

Nexha + Constitutional AI = **the only commerce platform where every transaction is auditable, explainable, and policy-compliant.**

## Integration Architecture

```
Claude (MCP client)
   ↓ MCP JSON-RPC
Nexha MCP Server (npx @nexha/mcp-server)
   ↓ HTTP
Nexha Gateway → Real services
   ↓
TrustOS (6 dimensions, audit trail)
   ↓
SUTAR (with PolicyOS — every negotiation constrained by company rules)
   ↓
CorpID (every action tied to user's verified identity)
```

## Specific Asks

### Tier 1 (Immediate)
- ✅ **Featured MCP server** in Anthropic's MCP directory
- ✅ **Co-branded case study** with 3 enterprise customers
- ✅ **Joint blog post** on AI commerce safety

### Tier 2 (Strategic)
- 🔧 **Nexha as default commerce MCP** for Claude Enterprise
- 🔧 **Constitutional AI integration** — Nexha transactions reviewed by Claude before execution
- 🔧 **Joint research paper** on safe AI-to-AI negotiation

### Tier 3 (Deep Partnership)
- 🤝 **Anthropic takes Platinum seat** on Global Nexha Foundation Board
- 🤝 **Co-authored safety standards** for AI commerce
- 🤝 **Joint investment** in trust infrastructure

## Compliance & Audit

Anthropic customers care about auditability. We provide:

| Feature | Benefit |
|---------|---------|
| **Immutable transaction log** | Every action recorded with cryptographic proof |
| **Policy-aware AI** | Nexha agents cannot violate company rules |
| **Human-in-the-loop approval** | Required for transactions >$10K (configurable) |
| **SOC 2 Type II** | In progress, target Q4 2026 |
| **GDPR data residency** | EU/US/India/GCC |
| **Right to be forgotten** | GDPR-compliant deletion across all services |

## Why Anthropic Customers Will Love It

1. **AI that actually does work** — Claude becomes a procurement agent, not just a research tool
2. **Compliance-friendly** — every action auditable, policy-bound, explainable
3. **Safety-first** — Constitutional AI review before any transaction
4. **Open standards** — MCP, NACP, no vendor lock-in

## Live Demo

We can demo in 5 minutes:
1. Open Claude Desktop
2. Enable Nexha MCP server
3. Ask Claude: "Find me 3 verified suppliers for $50K of laptops, check their trust scores, and draft a contract with the best one"
4. Watch Claude use Nexha tools, return real suppliers, generate a real purchase order

## Pricing

- **Free tier:** 1,000 API calls/month per user
- **Pro:** $50/user/month, 100K calls
- **Enterprise:** Custom, includes dedicated trust scoring, custom policies

Or revenue share: 10% of commerce flow attributable to Anthropic integration.

## Competitive Landscape

| Competitor | Why It Won't Win |
|------------|-------------------|
| **OpenAI Operator** | Consumer-focused, less enterprise-ready |
| **Meta AI** | No commerce infrastructure |
| **Google Vertex AI Agent Builder** | Requires custom development |
| **Microsoft Copilot Studio** | Locked to Microsoft stack |

**Nexha is the only vendor-neutral, MCP-native, foundation-governed choice.**

## Ask: 30-Minute Intro Call

**Who:** Anthropic Enterprise Product Lead + 1 Engineer + 1 BD person

**What we bring:**
- Live demo (works in 5 minutes)
- 6 enterprise customer references (signed LoIs available)
- Global Nexha Foundation governance plan
- Pricing model
- Integration timeline

**Contact:** partners@nexha.io

---

*See also: brief-openai.md, brief-google.md, brief-meta.md, brief-shopify.md, brief-sap.md*