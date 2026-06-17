# HOJAI Agent Copilot

**Port:** 4895  
**Purpose:** AI-powered assistance for customer support agents - draft replies, summarize conversations, predict CSAT, suggest macros.

## Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/copilot/draft-reply | Generate reply suggestions |
| POST | /api/copilot/summarize | Summarize conversation |
| POST | /api/copilot/predict-csat | Predict customer satisfaction |
| POST | /api/copilot/suggest-macros | Suggest canned responses |
| GET | /health | Health check |

## Features

### Draft Reply Generation
Analyzes conversation context and generates professional reply suggestions.

### Conversation Summarization
Creates concise summaries of long ticket threads for quick context.

### CSAT Prediction
Predicts customer satisfaction score based on conversation sentiment.

### Macro Suggestions
Recommends relevant canned responses based on conversation keywords.

## Environment Variables

See `.env.example`

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```
