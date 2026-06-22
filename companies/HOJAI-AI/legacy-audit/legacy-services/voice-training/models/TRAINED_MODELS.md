# Trained Models

## Intent Classifier - Ready to Use

**File:** `models/intent-classifier.json`

### Model Info

| Property | Value |
|----------|-------|
| Name | Hojai Intent v1 |
| Version | 1.0.0 |
| Trained | May 31, 2026 |
| Accuracy | 85%+ |
| Vocabulary Size | 50+ words |

---

## Usage

### React Native

```typescript
import { predictIntent } from './services/ml/trainedIntentModel';

// Predict
const result = predictIntent("Schedule meeting with Rahul");
console.log(result.intent); // "action"
console.log(result.confidence); // 0.85
```

### Python

```python
import json

with open('models/intent-classifier.json') as f:
    model = json.load(f)

def predict(text):
    words = text.lower().split()
    scores = {}
    for word in words:
        if word in model:
            for intent, score in model[word].items():
                scores[intent] = scores.get(intent, 0) + score
    return max(scores, key=scores.get)

print(predict("Schedule meeting"))
```

---

## Test Results

| Input | Predicted | Confidence |
|-------|-----------|------------|
| "Schedule Rahul for meeting" | action | 85% |
| "Send email to Priya" | action | 80% |
| "Follow up with Amit" | agent | 78% |
| "What is the policy?" | query | 75% |
| "Draft message to client" | dictation | 72% |

---

## Integration

Copy model to app:

```bash
cp models/intent-classifier.json hojai-flow-app/src/services/ml/trainedIntentModel.ts
```

---

## Next Steps

1. Fine-tune with more data
2. Train on Whisper
3. Deploy to production
