# LLM Intelligence Adapters

LLM-powered intelligence for real meeting analysis.

## Providers

| Provider | Speed | Quality | Cost |
|----------|-------|---------|------|
| **Claude Sonnet 4** | Fast | Excellent | Moderate |
| **GPT-4o** | Fast | Excellent | Moderate |
| **Gemini 2.0 Flash** | Very Fast | Good | Low |
| **Ollama (local)** | Varies | Good | Free |

## Usage

```javascript
import { createLLMAdapter, generateMeetingSummary, extractTasksFromTranscript } from './index.js';

// Create adapter
const llm = createLLMAdapter('claude', {
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Generate 4-layer meeting summary
const summary = await generateMeetingSummary(transcript, {
  meetingType: 'investor_call',
  participants: ['Rejaul', 'Investor A'],
  userId: 'rejaul_001'
}, llm);

// Extract tasks
const tasks = await extractTasksFromTranscript(transcript, {
  userId: 'rejaul_001',
  knownPeople: [{ name: 'Rejaul', userId: 'rejaul_001' }]
}, llm);
```

## Capabilities

### 4-Layer Meeting Summary
- **Executive**: Topics, decisions, risks
- **Action**: Tasks, owners, deadlines
- **Relationship**: Trust changes, communication notes
- **Knowledge**: Facts, preferences, insights

### Task Extraction
NLP-powered extraction of:
- Committed actions ("I will send the deck")
- Delegated tasks ("Please follow up")
- Due dates and priorities

### Decision Capture
- What was decided
- Why (context/reason)
- Who was involved
- Alternatives considered

### Relationship Analysis
- Trust level
- Communication styles
- Power dynamics
- Recommendations

## Configuration

```bash
# OpenAI
export OPENAI_API_KEY=sk-...

# Anthropic
export ANTHROPIC_API_KEY=sk-ant-...

# Google
export GOOGLE_AI_API_KEY=...

# Ollama (local)
export OLLAMA_URL=http://localhost:11434
```

## Architecture

```
Meeting Recording
     │
     ▼
Speech-to-Text (Azure/Whisper/Google)
     │
     ▼
LLM Intelligence Adapter
     │
     ├── generateMeetingSummary()
     ├── extractTasksFromTranscript()
     ├── extractDecisionsFromTranscript()
     ├── analyzeRelationship()
     ├── extractKnowledge()
     └── analyzeSentiment()
     │
     ▼
Genie Memory / Decision Twin
```

---

*Real AI intelligence, finally.*
