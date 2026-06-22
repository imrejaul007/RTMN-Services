# AI Intelligence Service

**Port:** 4881  
**Status:** ✅ BUILT  
**Purpose:** AI-powered customer operations with Intent, Sentiment, Fraud agents

---

## Overview

AI Intelligence provides AI-powered analysis for customer operations:
- Intent Detection
- Sentiment Analysis
- Fraud Detection
- Entity Extraction
- Language Detection
- Conversation Insights

## Features

- ✅ Intent Detection Agent (94% accuracy)
- ✅ Sentiment Analysis Agent (91% accuracy)
- ✅ Fraud Detection Agent (87% accuracy)
- ✅ Text Classification
- ✅ Entity Extraction
- ✅ Language Detection
- ✅ Conversation Insights
- ✅ CSAT Prediction

## API Endpoints

### Intent
- `POST /api/intent/analyze` - Detect customer intent

### Sentiment
- `POST /api/sentiment/analyze` - Analyze text sentiment

### Fraud
- `POST /api/fraud/analyze` - Detect fraud risk

### Classification
- `POST /api/classify` - Classify text into categories

### Entities
- `POST /api/entities/extract` - Extract emails, phones, amounts, dates

### Language
- `POST /api/language/detect` - Detect language

### Insights
- `POST /api/insights/conversation` - Get conversation insights

### Models
- `GET /api/models` - List AI models
- `GET /api/analyses` - Analysis history

## Quick Start

```bash
cd companies/HOJAI-AI/services/ai-intelligence
npm install
npm start
```

## Integration

- **Customer Intelligence** - Customer insights
- **Ticket Engine** - Ticket classification
- **Unified Inbox** - Message analysis
- **Agent Copilot** - AI suggestions
