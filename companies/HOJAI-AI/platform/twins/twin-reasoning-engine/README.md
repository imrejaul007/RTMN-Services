# TwinOS Reasoning Engine
**Port: 4716**

> Active cross-twin reasoning and explanation service.

## Features
- Why reasoning (explain events)
- What-if reasoning (scenario analysis)
- Trace reasoning (relationship paths)
- Recommendations generation

## API

```bash
# Why analysis
curl -X POST :4716/api/reasoning/why -d '{"twinId":"customer-1","event":"churn"}'

# What-if
curl -X POST :4716/api/reasoning/whatif -d '{"twinId":"customer-1","action":"send_discount"}'

# Trace
curl -X POST :4716/api/reasoning/trace -d '{"twinId":"customer-1"}'

# Recommend
curl -X POST :4716/api/reasoning/recommend -d '{"twinId":"customer-1"}'
```
