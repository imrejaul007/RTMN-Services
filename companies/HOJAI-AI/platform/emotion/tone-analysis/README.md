# Tone Analysis

**Port:** 4767  
Sales-specific tone analytics.

## Features

- Sales conversation tone detection
- Objection detection
- Coaching tips
- Engagement scoring

## API

```bash
# Analyze conversation
POST /analyze
{"conversation": "Hello, I'm looking for a solution to our problem..."}

# Get tone keywords
GET /tones
```

## Tones

- opening, qualification, objection, negotiation, closing, rapport
