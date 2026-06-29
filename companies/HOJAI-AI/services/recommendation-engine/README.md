# Recommendation Engine

**Port:** 4902  
**Purpose:** Next best action engine

## API

```
POST /api/recommend
  Input: { context: 'checkout'|'cart'|'browse'|'support', limit }
  Output: { recommendations[], next_best_action }

POST /api/recommend/next-best-action
```
