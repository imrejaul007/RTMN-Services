# A/B Testing Engine - HOJAI SiteOS

Create experiments, split traffic, track conversions, and auto-declare winners.

## Quick Start

```bash
cd ab-testing
npm install
npm start
```

## Features

- **Experiment Management**: Full lifecycle management
- **Weighted Traffic Split**: Consistent user assignment
- **Conversion Tracking**: With revenue value
- **Statistical Significance**: Z-test based calculations
- **Auto-Winner**: Automatic winner declaration
- **Analytics**: Performance insights

## Create Experiment

```bash
curl -X POST http://localhost:5467/api/experiments \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "name": "Checkout Button Test",
    "description": "Testing button color on checkout page",
    "hypothesis": "Orange button increases checkout rate",
    "metric": "checkout_complete",
    "variants": [
      { "name": "Control (Blue)", "weight": 50 },
      { "name": "Variant A (Orange)", "weight": 50 }
    ]
  }'
```

## Start Experiment

```bash
curl -X POST http://localhost:5467/api/experiments/exp_abc123/start
```

## Assign User to Variant

```bash
curl "http://localhost:5467/api/experiments/exp_abc123/assign?userId=user_xyz789"
```

Response:
```json
{
  "success": true,
  "data": {
    "experimentId": "exp_abc123",
    "variantId": "var_def456",
    "variantName": "Control (Blue)",
    "isControl": true
  }
}
```

## Force Specific Variant (for testing)

```bash
curl "http://localhost:5467/api/experiments/exp_abc123/assign?userId=test_user&forceVariant=var_ghi789"
```

## Track Conversion

```bash
curl -X POST http://localhost:5467/api/experiments/exp_abc123/convert \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "user_xyz789",
    "value": 299.00,
    "metadata": {
      "orderId": "ORD-12345",
      "product": "Premium Plan"
    }
  }'
```

## Get Statistics

```bash
curl http://localhost:5467/api/experiments/exp_abc123/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "experimentId": "exp_abc123",
    "status": "running",
    "variants": [
      {
        "name": "Control (Blue)",
        "visitors": 10000,
        "conversions": 250,
        "conversionRate": "2.5000",
        "uplift": null
      },
      {
        "name": "Variant A (Orange)",
        "visitors": 10000,
        "conversions": 320,
        "conversionRate": "3.2000",
        "uplift": {
          "absolute": "0.7000",
          "relative": "28.00"
        }
      }
    ]
  }
}
```

## Check Statistical Significance

```bash
curl "http://localhost:5467/api/experiments/exp_abc123/significance?confidenceLevel=95"
```

Response:
```json
{
  "success": true,
  "data": {
    "requiredConfidence": 95,
    "results": [
      {
        "variantName": "Variant A (Orange)",
        "relativeUplift": "28.00",
        "confidenceLevel": "97.50",
        "isSignificant": true,
        "pValue": "0.025000",
        "zScore": "1.9600",
        "recommendedAction": "consider_implementing"
      }
    ],
    "summary": {
      "allSignificant": false,
      "action": "continue_experiment"
    }
  }
}
```

## Auto-Declare Winner

```bash
curl -X POST http://localhost:5467/api/experiments/exp_abc123/auto-winner \
  -H 'Content-Type: application/json' \
  -d '{
    "confidenceThreshold": 95,
    "minSampleSize": 1000
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "declared": true,
    "winner": {
      "variantId": "var_ghi789",
      "name": "Variant A (Orange)",
      "confidence": "97.50",
      "conversionRate": "3.2000",
      "relativeUplift": "28.00"
    }
  }
}
```

## Stop Experiment

```bash
curl -X POST http://localhost:5467/api/experiments/exp_abc123/stop \
  -H 'Content-Type: application/json' \
  -d '{"winner": "var_ghi789"}'
```

## List Experiments

```bash
curl "http://localhost:5467/api/experiments?companyId=your-company&status=running"
```

## A/B Testing Analytics

```bash
curl "http://localhost:5467/api/analytics?companyId=your-company"
```

Response:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalExperiments": 15,
      "running": 5,
      "completed": 8,
      "draft": 2,
      "experimentsWithWinners": 7,
      "avgUplift": "12.50"
    },
    "totals": {
      "totalVisitors": 250000,
      "totalConversions": 8750,
      "overallConversionRate": "3.5000"
    }
  }
}
```

## Experiment Status

| Status | Description |
|--------|-------------|
| `draft` | Experiment created but not started |
| `running` | Experiment is active |
| `stopped` | Experiment ended (winner declared) |

## Statistical Significance

### Confidence Levels

| Level | Action |
|-------|--------|
| >= 99% | Strong evidence - implement immediately |
| >= 95% | Good evidence - consider implementing |
| < 95% | Not significant - continue experiment |

### Recommended Actions

| Recommendation | When |
|----------------|------|
| `implement_winner` | 99%+ confidence, variant is better |
| `implement_control` | 99%+ confidence, control is better |
| `consider_implementing` | 95-99% confidence, variant is better |
| `revert_to_control` | 95-99% confidence, control is better |
| `continue_experiment` | < 95% confidence |

## Environment Variables

```bash
AB_TESTING_PORT=5467
ANALYTICS_URL=http://localhost:4750
```

## Integration Example

### Frontend Integration

```javascript
// Fetch variant for user
const response = await fetch(
  `http://localhost:5467/api/experiments/${experimentId}/assign?userId=${userId}`
);
const { variantId, variantName } = response.data.data;

// Apply variant to UI
if (variantId === 'var_green') {
  document.getElementById('cta').classList.add('green');
}

// Track conversion on action
await fetch(
  `http://localhost:5467/api/experiments/${experimentId}/convert`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      value: orderValue
    })
  }
);
```

## License

Proprietary - HOJAI AI
