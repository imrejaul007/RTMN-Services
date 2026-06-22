# @hojai/training-connector

**Training data collection from REZ & HOJAI signals**

---

## Two Data Sources

### REZ Ecosystem
Signals from REZ apps → Training data

### HOJAI Ecosystem
Feedback from HOJAI → Training data

---

## Flow

```
REZ Signals → Training Connector → Training Data

HOJAI Feedback → Training Data → Model Improvement
```

---

## API

```typescript
// REZ signal → training
POST /api/rez/signals { signal }

// HOJAI feedback → training
POST /api/hojai/feedback { feedback }
```

---

**Port:** 4890
