# Genie Thinking Engine

**Version:** 1.0.0
**Port:** 4719
**Status:** ✅ PHASE 2 COMPLETE - Deep Reasoning & Analysis

---

## Overview

Genie Thinking Engine powers Genie's Intelligence OS pillar. It provides deep reasoning capabilities for brainstorming, decision analysis, and strategic thinking.

---

## Features

- **Deep Thinking** - Break down complex problems
- **Brainstorming** - Generate creative ideas
- **Decision Analysis** - Pros/cons, scenarios, go/no-go
- **SWOT Analysis** - Strategic analysis
- **Root Cause Analysis** - 5 Whys method
- **First Principles** - Challenge assumptions
- **Scenario Simulation** - Plan for future

---

## API Endpoints

### Analysis
- `POST /analyze/swot` - SWOT Analysis
- `POST /analyze/root-cause` - Root Cause Analysis
- `POST /analyze/first-principles` - First Principles Thinking
- `POST /analyze/cost-benefit` - Cost-Benefit Analysis
- `POST /analyze/compare` - Compare Options

### Brainstorming
- `POST /brainstorm` - Generate Ideas
- `POST /brainstorm/scatter` - Multi-perspective
- `POST /brainstorm/reverse` - Reverse Brainstorming
- `POST /brainstorm/six-hats` - Six Thinking Hats
- `POST /brainstorm/crazy-8` - Crazy 8 Method
- `POST /brainstorm/analogies` - Analogical Thinking

### Decision
- `POST /decide/pros-cons` - Pros and Cons
- `POST /decide/scenario` - Scenario Planning
- `POST /decide/go-no-go` - Go/No-Go Framework

### Research
- `POST /research/summarize` - Research Summary
- `POST /research/compare` - Topic Comparison

---

## Example Usage

### SWOT Analysis
```bash
curl -X POST http://localhost:4719/analyze/swot \
  -d '{"topic": "Starting a restaurant"}'
```

### Six Hats Brainstorming
```bash
curl -X POST http://localhost:4719/brainstorm/six-hats \
  -d '{"topic": "Improving customer experience"}'
```

### Pros and Cons
```bash
curl -X POST http://localhost:4719/decide/pros-cons \
  -d '{"decision": "Moving to a new city"}'
```

---

*Last Updated: June 18, 2026*
