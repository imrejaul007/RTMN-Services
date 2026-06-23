# Phase 7: Prompt Engineering at Scale

**Duration:** 2 weeks (Week 11–12)
**Priority:** P2 (Medium)
**Owner:** Product Engineer

---

## Goal

Migrate hardcoded prompts to prompt-manager and build automated prompt optimization.

---

## Deliverables

### 7.1 Audit Hardcoded Prompts

**Tasks:**

1. Grep all services for hardcoded prompt strings
2. Catalog by service, use case, frequency
3. Prioritize: high-frequency prompts first
4. Estimated: 200+ hardcoded prompts

**Script:**

```bash
# Find hardcoded prompts
grep -r "role: 'system'" platform/ products/ --include="*.js" --include="*.ts" | wc -l
grep -r "You are a" platform/ products/ --include="*.js" --include="*.ts" | wc -l
```

---

### 7.2 Migrate Prompts to Prompt Manager

**File:** `platform/skills/prompt-manager/src/index.js`

**Tasks:**

1. Create templates for each hardcoded prompt
2. Add versioning (v1, v2, v3)
3. Add A/B test support
4. Add metrics per template

**Implementation:**

```javascript
// Migrate hardcoded prompt to template
await promptManager.create({
  id: 'customer-support-response',
  version: '2.0.0',
  template: `You are a helpful customer support agent for {{companyName}}.

Customer: {{customerName}}
Issue: {{issue}}
Tone: {{tone}}

Respond in a {{tone}} manner, acknowledge the issue, provide a solution, and ask if there's anything else you can help with.`,
  variables: ['companyName', 'customerName', 'issue', 'tone'],
  metadata: {
    category: 'customer-support',
    tags: ['support', 'response'],
    author: 'migration-script'
  }
});

// Use in service
const prompt = await promptManager.render('customer-support-response', {
  companyName: 'ACME Corp',
  customerName: 'John',
  issue: 'Product not working',
  tone: 'friendly'
});

const response = await inferenceGateway.complete({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }]
});
```

**A/B Testing:**

```javascript
// 50/50 traffic split between v1 and v2
const variant = Math.random() < 0.5 ? '1.0.0' : '2.0.0';

const prompt = await promptManager.render('customer-support-response', {
  // ... variables
}, { variant });

// Track which variant was used
metrics.increment('prompt_variant_used', {
  template: 'customer-support-response',
  variant
});
```

---

### 7.3 Build Prompt Optimization Loop

**File:** `platform/skills/prompt-manager/src/optimizer.js`

**Tasks:**

1. Weekly job: run eval suite on all prompt variants
2. Auto-promote winning variant to 100% traffic
3. Generate optimization report
4. Alert on regression

**Implementation:**

```javascript
import cron from 'node-cron';
import { evaluationHarness } from '../training/evaluation-harness/src/index.js';

// Weekly optimization (Sunday 3am)
cron.schedule('0 3 * * 0', async () => {
  logger.info('Starting prompt optimization');

  const templates = await promptManager.list();
  const results = [];

  for (const template of templates) {
    const variants = await promptManager.getVariants(template.id);

    for (const variant of variants) {
      // Run eval suite on this variant
      const evalResults = await evaluationHarness.runForPrompt(template.id, variant.version);
      results.push({ template: template.id, variant: variant.version, ...evalResults });
    }
  }

  // Find winning variant for each template
  for (const templateId of [...new Set(results.map(r => r.template))]) {
    const templateResults = results.filter(r => r.template === templateId);
    const winner = templateResults.reduce((best, current) =>
      current.overall > best.overall ? current : best
    );

    // Promote winner to 100% traffic
    await promptManager.promoteVariant(templateId, winner.variant);

    logger.info(`Promoted ${templateId} v${winner.variant} (score: ${winner.overall})`);
  }

  // Generate report
  const report = await generateOptimizationReport(results);
  await publishReport(report);
});
```

---

## Success Criteria

✅ 200+ hardcoded prompts migrated
✅ Versioning and A/B testing working
✅ Weekly optimization runs
✅ 5%+ accuracy improvement from optimization

---

*Phase 7 documentation: 2026-06-22*