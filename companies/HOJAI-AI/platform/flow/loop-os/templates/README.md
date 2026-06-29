# LoopOS Templates

Pre-built loop configurations for common autonomous AI workflows.

## Template Categories

### Sales Team
- [lead-qualification.yml](sales/lead-qualification.yml) - Auto-qualify and route leads
- [follow-up.yml](sales/follow-up.yml) - Follow up with prospects
- [pipeline-review.yml](sales/pipeline-review.yml) - Weekly pipeline review
- [proposal-generator.yml](sales/proposal-generator.yml) - Generate proposals

### Marketing
- [campaign-monitor.yml](marketing/campaign-monitor.yml) - Monitor campaign performance
- [content-calendar.yml](marketing/content-calendar.yml) - Manage content scheduling
- [competitor-watch.yml](marketing/competitor-watch.yml) - Track competitor activity

### Customer Success
- [health-check.yml](cs/health-check.yml) - Monitor customer health scores
- [nps-survey.yml](cs/nps-survey.yml) - Send NPS surveys
- [churn-risk.yml](cs/churn-risk.yml) - Identify churn risks

### Operations
- [inventory-check.yml](ops/inventory-check.yml) - Check inventory levels
- [incident-monitor.yml](ops/incident-monitor.yml) - Monitor system incidents
- [daily-standup.yml](ops/daily-standup.yml) - Daily team sync

### Finance
- [expense-audit.yml](finance/expense-audit.yml) - Audit expenses
- [invoice-follow.yml](finance/invoice-follow.yml) - Follow up on invoices

## Usage

```bash
# Deploy a template
loopos deploy sales/lead-qualification.yml

# Or use the SDK
const loopOS = new LoopOS();
await loopOS.scheduler.createLoop(template);
```

## Creating Templates

Templates are YAML files with the following structure:

```yaml
name: My Loop
description: What this loop does
frequency: "*/5 * * * *"  # Cron expression

budget:
  dailyTokens: 500000
  dailySpend: 50

actions:
  - name: action_one
    verify: true
  - name: action_two
    requiresApproval: high_risk

notifications:
  onFailure: slack
  onCompletion: email
```
