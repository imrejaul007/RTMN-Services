# Phase 12: SkillOS — Executable Capabilities

**Duration:** 4 weeks (Week 21–24)
**Priority:** P0 (Critical)
**Owner:** Senior AI Engineer + ML Engineer

---

## Goal

Make capabilities first-class citizens with versioned, executable Skills that agents can invoke.

---

## Why This Matters

**Current State:**
- Memory knows facts
- Twin knows entities
- Flow knows orchestration
- **Nothing knows capabilities**
- Agents execute raw prompts instead of reusable Skills

**Impact:** Without SkillOS, every agent reinvents capabilities. No reuse, no versioning, no marketplace.

**After This Phase:** 1000+ executable Skills with versioning, permissions, pricing, training, evaluation, and marketplace.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SkillOS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Skill     │  │    Skill     │  │    Skill     │         │
│  │   Registry   │  │   Executor   │  │  Versioning  │         │
│  │   (4910)     │  │   (4911)     │  │   (4912)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │    Skill     │  │   Skill      │                            │
│  │  Training    │  │ Marketplace  │                            │
│  │   (4913)     │  │   (4914)     │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Skill Schema

```yaml
skill:
  id: "negotiate-saas-contract"
  version: "2.3.1"
  
  # Metadata
  name: "SaaS Contract Negotiator"
  description: "Negotiates SaaS contracts with vendors"
  category: "business"
  tags: ["negotiation", "saas", "contracts"]
  author: "hojai-team"
  
  # Inputs
  inputs:
    - name: "contract_terms"
      type: "object"
      required: true
      schema:
        type: "object"
        properties:
          price: { type: "number" }
          duration: { type: "string" }
          features: { type: "array" }
    
    - name: "vendor_profile"
      type: "object"
      required: true
  
  # Outputs
  outputs:
    - name: "negotiated_terms"
      type: "object"
      schema:
        type: "object"
        properties:
          final_price: { type: "number" }
          final_duration: { type: "string" }
          concessions: { type: "array" }
  
  # Execution
  execution:
    type: "llm"
    model: "claude-3-5-sonnet"
    prompt_template: |
      You are negotiating a SaaS contract.
      Vendor: {{vendor_profile.name}}
      Initial terms: {{contract_terms}}
      
      Negotiate the best possible terms.
    temperature: 0.7
    max_tokens: 2000
  
  # Permissions
  permissions:
    - "wallet:read"
    - "contracts:write"
  
  # Pricing
  pricing:
    model: "per_call"
    amount: 0.05
    currency: "USD"
  
  # Training
  training:
    dataset: "saas-contracts-v3"
    accuracy: 0.87
    last_trained: "2026-06-01"
  
  # Evaluation
  evaluation:
    benchmark: "contract-negotiation-bench"
    score: 0.92
    last_evaluated: "2026-06-15"
  
  # Marketplace
  marketplace:
    published: true
    installs: 1234
    rating: 4.7
    reviews: 89
```

---

## 5 SkillOS Services

### 12.1 Skill Registry (Port 4910)

**Purpose:** Catalog of executable capabilities

**Implementation:**

```javascript
class SkillRegistry {
  async register(skill) {
    // Validate schema
    this.validateSkill(skill);
    
    // Store skill
    await this.skills.set(`${skill.id}:${skill.version}`, skill);
    
    // Index for search
    await this.searchIndex.add(skill);
    
    return skill;
  }
  
  async search(query, filters = {}) {
    return await this.searchIndex.search(query, filters);
  }
  
  async get(id, version = 'latest') {
    if (version === 'latest') {
      return await this.getLatestVersion(id);
    }
    return await this.skills.get(`${id}:${version}`);
  }
  
  async listVersions(id) {
    const versions = [];
    for (const [key, skill] of this.skills.entries()) {
      if (skill.id === id) {
        versions.push(skill.version);
      }
    }
    return versions.sort();
  }
}
```

---

### 12.2 Skill Executor (Port 4911)

**Purpose:** Run skills with inputs

**Implementation:**

```javascript
class SkillExecutor {
  async execute(skillId, inputs, options = {}) {
    // 1. Get skill
    const skill = await this.registry.get(skillId, options.version);
    
    // 2. Check permissions
    await this.checkPermissions(skill, options.agentId);
    
    // 3. Validate inputs
    this.validateInputs(skill, inputs);
    
    // 4. Render prompt
    const prompt = this.renderPrompt(skill.execution.prompt_template, inputs);
    
    // 5. Call LLM
    const response = await this.inferenceGateway.complete({
      model: skill.execution.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: skill.execution.temperature,
      maxTokens: skill.execution.max_tokens
    });
    
    // 6. Validate output
    const output = this.validateOutput(skill, response.content);
    
    // 7. Track usage
    await this.trackUsage(skill, options.agentId, response);
    
    // 8. Charge if applicable
    if (skill.pricing) {
      await this.charge(skill, options.agentId);
    }
    
    return output;
  }
}
```

---

### 12.3 Skill Versioning (Port 4912)

**Purpose:** Manage skill versions

**Features:**
- Semantic versioning (major.minor.patch)
- Backward compatibility checks
- Deprecation warnings
- Migration guides

---

### 12.4 Skill Training (Port 4913)

**Purpose:** Improve skills with data

**Features:**
- Training data collection (from executions)
- Fine-tuning pipeline (HOJAI-LLM)
- Evaluation before promotion
- A/B testing (new vs old version)

---

### 12.5 Skill Marketplace (Port 4914)

**Purpose:** Discover and install skills

**Features:**
- Marketplace UI (web)
- Skill search and filtering
- Skill ratings and reviews
- One-click install
- Revenue sharing (developer earns 70%)

---

## Success Criteria

✅ 5 SkillOS services deployed
✅ 50+ seed skills created
✅ Versioning and A/B testing working
✅ Marketplace UI launched
✅ 100+ skill installs in first month

---

*Phase 12 documentation: 2026-06-22*