# RTMN AI Training & Operations Guide

**Date:** June 16, 2026  
**Version:** 1.0.0

---

## 📚 Table of Contents

1. [Current AI Architecture](#current-ai-architecture)
2. [Do We Need Training?](#do-we-need-training)
3. [Training Requirements](#training-requirements)
4. [LLM Provider Setup](#llm-provider-setup)
5. [RAG Pipeline Setup](#rag-pipeline-setup)
6. [Voice AI Training](#voice-ai-training)
7. [Agent Training](#agent-training)
8. [Fine-tuning Requirements](#fine-tuning-requirements)
9. [Go-Live Checklist](#go-live-checklist)

---

## Current AI Architecture

### AI Service Flow

```
User Input
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ROUTING LAYER                                 │
│  Intent Graph (4018) → Discovery Engine (4256) → Model Router   │
└─────────────────────────────────────────────────────────────────┘
    │                    │                      │
    ▼                    ▼                      ▼
┌─────────┐        ┌─────────────┐        ┌─────────────────────┐
│ Intent  │        │  Agent     │        │  LLM Provider       │
│ Parsing │        │  Discovery │        │  (OpenAI/Claude)    │
└─────────┘        └─────────────┘        └─────────────────────┘
                                                  │
                                                  ▼
                    ┌─────────────────────────────────────────────┐
                    │              AI PROCESSING                 │
                    │  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │
                    │  │  RAG    │  │ Memory  │  │   Twins    │ │
                    │  │Pipeline │  │   OS   │  │    Hub     │ │
                    │  └─────────┘  └─────────┘  └─────────────┘ │
                    └─────────────────────────────────────────────┘
                                                  │
                                                  ▼
                                           ┌─────────────┐
                                           │   Response  │
                                           │  + Citations│
                                           └─────────────┘
```

### Services Involved in AI

| Port | Service | AI Function |
|------|---------|-------------|
| 4018 | Intent Graph | Intent parsing, entity extraction |
| 4256 | Discovery Engine | Agent registry, capability matching |
| 4241 | Simulation Engine | Monte Carlo, what-if analysis |
| 4712 | Model Router | LLM provider routing |
| 4703 | Memory OS | Context & memory |
| 4705 | TwinOS Hub | Digital twins data |
| 4701 | Genie Gateway | Consumer AI orchestrator |
| 4600 | Business Copilot | 24 Industry skill packs |
| 4721 | Vector Store | RAG embeddings |

---

## Do We Need Training?

### Short Answer: **YES**, but depends on what you mean by "training"

| Type | Needed? | Purpose | Effort |
|------|---------|---------|--------|
| **LLM Fine-tuning** | ❌ No | Custom models | High |
| **RAG Training** | ✅ Yes | Domain knowledge | Medium |
| **Voice Fine-tuning** | ⚠️ Optional | Indian accents | Medium |
| **Agent Prompting** | ✅ Yes | Industry personas | Low |
| **Embedding Training** | ❌ No | Use OpenAI | None |

### What You're Actually Paying For

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR AI COSTS                                │
│                                                                  │
│  1. LLM API Calls (Pay-per-token)                              │
│     - GPT-4o-mini: ~$0.15/1M tokens input                       │
│     - Claude 3.5: ~$3/1M tokens input                           │
│                                                                  │
│  2. Embeddings (Pay-per-token)                                  │
│     - text-embedding-3-small: ~$0.02/1M tokens                   │
│                                                                  │
│  3. Voice API (Pay-per-minute)                                  │
│     - Whisper: ~$0.006/minute                                    │
│     - ElevenLabs: ~$0.30/1K characters                           │
│                                                                  │
│  TOTAL: Depends on volume. Start small, scale as needed.        │
└─────────────────────────────────────────────────────────────────┘
```

### What You DON'T Need to Train

1. **LLMs (GPT, Claude)** - Already trained on vast data. Fine-tuning is rarely needed.
2. **Base Embeddings** - OpenAI embeddings are excellent out of the box.
3. **General Knowledge** - Models already know this.

### What You DO Need to Configure

1. **RAG Knowledge Base** - Your business data, documents, FAQs
2. **Prompt Engineering** - Industry-specific instructions
3. **Agent Workflows** - How agents should behave
4. **Voice Configuration** - Language settings, medical terms

---

## Training Requirements

### 1. RAG Knowledge Base (REQUIRED)

#### What to Upload

| Industry | Required Documents | Priority |
|----------|-------------------|----------|
| **Restaurant** | Menu items, recipes, ordering flows, dietary info | HIGH |
| **Hotel** | Room types, amenities, booking policies, services | HIGH |
| **Healthcare** | Medical terms, protocols, care plans | CRITICAL |
| **Retail** | Products, pricing, inventory, promotions | HIGH |
| **Legal** | Contract templates, compliance docs, case law | CRITICAL |
| **All** | Company FAQs, policies, procedures | HIGH |

#### Knowledge Base Structure

```
/knowledge-base
├── common/
│   ├── company-info.md
│   ├── policies.md
│   └── faq.md
├── restaurant/
│   ├── menu-items.md
│   ├── dietary-info.md
│   └── ordering-flows.md
├── hotel/
│   ├── room-types.md
│   ├── amenities.md
│   └── booking-policies.md
└── healthcare/
    ├── medical-terms.md
    ├── care-protocols.md
    └── compliance.md
```

#### RAG Setup Steps

```bash
# 1. Install RAG SDK
cd /companies/hojai-ai/hojai-rag
npm install

# 2. Configure environment
cat > .env << EOF
OPENAI_API_KEY=sk-...
VECTOR_STORE_URL=http://localhost:4721
EMBEDDING_MODEL=text-embedding-3-small
EOF

# 3. Ingest documents
npm run ingest -- --path /knowledge-base/restaurant

# 4. Verify
npm run search -- --query "What dietary options do you have?"
```

---

### 2. Prompt Engineering (REQUIRED)

#### Industry-Specific Personas

```typescript
// Restaurant Bot Persona
const restaurantSystemPrompt = `
You are Genie, a helpful restaurant assistant for {restaurant_name}.

Your capabilities:
- Answer questions about menu items, ingredients, and allergens
- Help with reservations and ordering
- Provide dietary recommendations

Guidelines:
- Be friendly and conversational
- Use {restaurant_name}'s tone (friendly/formal)
- Never make up menu items
- If unsure, suggest calling the restaurant
- Keep responses under 3 sentences for quick answers
`;

// Healthcare Bot Persona
const healthcareSystemPrompt = `
You are a healthcare assistant helping with non-urgent health queries.

Your capabilities:
- Explain medical terms in simple language
- Guide patients through care plans
- Provide appointment scheduling assistance
-Remind about medications and follow-ups

IMPORTANT:
- NEVER diagnose or prescribe
- Always recommend consulting a physician for medical decisions
- Maintain HIPAA compliance
- Be empathetic and patient
`;
```

#### Agent Behavior Prompts

```typescript
const agentPrompts = {
  orderTaker: `
    Take food orders accurately.
    1. Greet customer
    2. Ask for items one by one
    3. Confirm order before closing
    4. Provide estimated time
  `,
  
  reservationAgent: `
    Handle reservations professionally.
    1. Check availability
    2. Collect name, phone, date, time, party size
    3. Confirm booking
    4. Send reminder instructions
  `,
  
  complaintResolver: `
    Resolve customer complaints empathetically.
    1. Acknowledge the issue
    2. Apologize sincerely
    3. Offer solution options
    4. Follow up to ensure satisfaction
  `,
};
```

---

### 3. Voice AI Configuration (OPTIONAL)

#### Current Providers

| Provider | Purpose | Cost | Status |
|----------|---------|------|--------|
| OpenAI Whisper | STT | $0.006/min | ✅ Configured |
| ElevenLabs | TTS | $0.30/1K chars | ✅ Configured |
| Google Speech | STT | Pay-per-use | ⚠️ Not configured |
| AssemblyAI | STT | Pay-per-use | ⚠️ Not configured |

#### Indian Languages Setup

```bash
# Whisper fine-tuning for Indian accents
# Location: /companies/hojai-ai/voice-training/

# 1. Prepare training data
python scripts/prepare_training_data.py \
  --language hi \
  --output /data/indian-english/hindi/

# 2. Fine-tune Whisper
python scripts/fine_tune_models.py \
  --model whisper \
  --base-model openai/whisper-small \
  --training-data /data/indian-english/hindi/ \
  --output /models/whisper-hindi \
  --epochs 3

# 3. Deploy to Replicate
replicate deploy --model /models/whisper-hindi
```

#### Supported Languages

| Language | Code | Whisper Model | Status |
|----------|------|---------------|--------|
| English | en | base | ✅ Ready |
| Hindi | hi | small (fine-tuned) | ⚠️ Needs training |
| Bengali | bn | small (fine-tuned) | ⚠️ Needs training |
| Tamil | ta | small (fine-tuned) | ⚠️ Needs training |
| Telugu | te | small (fine-tuned) | ⚠️ Needs training |
| Marathi | mr | small (fine-tuned) | ⚠️ Needs training |

---

### 4. Agent Training (REQUIRED)

#### Agent Marketplace Configuration

```bash
# Location: /companies/hojai-ai/hojai-agent-marketplace/

# 1. Register industry agents
npm run register-agents -- --industry restaurant

# 2. Configure agent capabilities
cat > config/restaurant-agents.json << 'EOF'
{
  "agents": [
    {
      "name": "Order Taker",
      "type": "order_taker",
      "capabilities": ["take_order", "modify_order", "cancel_order"],
      "industry": "restaurant",
      "trust_score": 0.95,
      "avg_response_time_ms": 1500
    },
    {
      "name": "Reservation Agent",
      "type": "reservation",
      "capabilities": ["book_table", "modify_booking", "check_availability"],
      "industry": "restaurant",
      "trust_score": 0.92,
      "avg_response_time_ms": 2000
    }
  ]
}
EOF

# 3. Deploy agent marketplace
npm run deploy -- --port 4860
```

#### Agent Workflow Configuration

```typescript
// Configure agent behaviors
const agentWorkflows = {
  customerOnboarding: {
    steps: [
      { action: 'greet', agent: 'welcome_agent' },
      { action: 'collect_info', agent: 'info_collection' },
      { action: 'verify', agent: 'verification' },
      { action: 'setup', agent: 'account_setup' },
      { action: 'introduce', agent: 'product_tour' },
    ],
    fallback: 'human_escalation',
  },
  
  orderFulfillment: {
    steps: [
      { action: 'receive_order', agent: 'order_taker' },
      { action: 'validate', agent: 'order_validator' },
      { action: 'process_payment', agent: 'payment_agent' },
      { action: 'confirm', agent: 'confirmation' },
      { action: 'track', agent: 'tracking' },
    ],
    fallback: 'order_support',
  },
};
```

---

## LLM Provider Setup

### Current Configuration

```typescript
// Location: /companies/hojai-ai/hojai-mlops/model-router/src/config/index.ts

export const llmConfig = {
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      models: {
        chat: 'gpt-4o-mini',        // Fast, cheap
        completion: 'gpt-4o-mini',
        analysis: 'gpt-4o',         // Complex reasoning
      },
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
      models: {
        chat: 'claude-3-5-sonnet-20240620',
        analysis: 'claude-3-opus-20240229',
      },
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY,
      models: {
        chat: 'gemini-1.5-flash',
        analysis: 'gemini-1.5-pro',
      },
    },
  },
  
  routing: {
    // Task-based routing
    'customer-chat': 'openai',
    'medical-analysis': 'anthropic',
    'code-generation': 'openai',
    'complex-reasoning': 'anthropic',
    'fast-response': 'google',
  },
};
```

### Setup Instructions

```bash
# 1. Get API keys
# OpenAI: https://platform.openai.com/api-keys
# Anthropic: https://console.anthropic.com/

# 2. Set environment variables
cat > /companies/hojai-ai/hojai-mlops/model-router/.env << 'EOF'
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...

# Provider selection
DEFAULT_PROVIDER=openai
FALLBACK_PROVIDER=anthropic

# Rate limits
MAX_REQUESTS_PER_MINUTE=60
MAX_TOKENS_PER_MINUTE=100000
EOF

# 3. Test the router
npm run test -- --provider openai --model gpt-4o-mini

# 4. Monitor usage
npm run dashboard
```

---

## RAG Pipeline Setup

### Current Architecture

```typescript
// Location: /companies/hojai-ai/hojai-rag/src/index.ts

async function queryWithRAG(request: QueryRequest): Promise<QueryResponse> {
  // 1. Query expansion
  const expandedQueries = await expandQuery(request.query);
  
  // 2. Hybrid search (BM25 + Vector) with RRF
  const results = await hybridSearch(
    expandedQueries,
    request.filters,
    { k: 20 }
  );
  
  // 3. Cross-encoder reranking
  const reranked = await rerank(results, request.query);
  
  // 4. Context building (respect token limit)
  const context = buildContext(reranked, request.maxTokens || 4000);
  
  // 5. LLM generation
  const response = await generateWithLLM(
    request.query,
    context,
    request.systemPrompt
  );
  
  // 6. Citation generation
  const citations = generateCitations(response, reranked);
  
  return { response, citations };
}
```

### Knowledge Base Ingestion

```bash
# 1. Create industry knowledge bases
mkdir -p /knowledge-base/{restaurant,hotel,healthcare,retail,legal}

# 2. Add documents (Markdown recommended)
cat > /knowledge-base/restaurant/menu.md << 'EOF'
# Menu Items

## Starters
- Paneer Tikka - ₹250 - Vegetarian, spicy
- Chicken Wings - ₹320 - Non-veg, 6 pcs

## Main Course
- Butter Chicken - ₹450 - Signature dish
- Dal Makhani - ₹280 - Vegetarian specialty

## Dietary Info
- GF = Gluten Free
- V = Vegetarian
- VG = Vegan
- H = Contains nuts
EOF

# 3. Ingest to vector store
cd /companies/hojai-ai/hojai-rag
npm run ingest \
  --source /knowledge-base \
  --industry restaurant \
  --chunk-size 500 \
  --overlap 50

# 4. Test retrieval
npm run query << 'EOF'
What vegetarian options do you have?
EOF
```

---

## Voice AI Training

### Current Capabilities

```typescript
// Speech-to-Text (Whisper)
const sttConfig = {
  provider: 'whisper',
  model: 'whisper-1',
  language: 'auto', // or 'en', 'hi', etc.
  response_format: 'json',
  timestamp_granularities: ['word'],
};

// Text-to-Speech (ElevenLabs)
const ttsConfig = {
  provider: 'elevenlabs',
  voice_id: '21m00Tcm4TlvDq8ikWAM', // Rachel (default)
  model: 'eleven_multilingual_v2',
  stability: 0.5,
  similarity_boost: 0.75,
};
```

### Indian Language Fine-tuning

```python
# /companies/hojai-ai/voice-training/scripts/fine_tune_models.py

"""
Fine-tune Whisper for Indian English and regional languages
"""

import argparse
from datasets import load_dataset
from transformers import WhisperForConditionalGeneration, WhisperProcessor

def fine_tune_whisper(
    base_model: str,
    language: str,
    output_dir: str,
    epochs: int = 3,
    batch_size: int = 8,
):
    """
    Fine-tune Whisper on Indian language data
    
    Args:
        base_model: Base Whisper model (small recommended)
        language: Language code (hi, bn, ta, te, mr)
        output_dir: Output directory for fine-tuned model
        epochs: Training epochs
        batch_size: Batch size for training
    """
    # Load dataset
    # ... (see full script)
    
    # Fine-tune
    model = WhisperForConditionalGeneration.from_pretrained(base_model)
    processor = WhisperProcessor.from_pretrained(base_model)
    
    # Training loop
    for epoch in range(epochs):
        # ... training code ...
        pass
    
    # Save model
    model.save_pretrained(output_dir)
    
    # Deploy to Replicate
    print(f"Model saved to {output_dir}")
    print(f"Deploy with: replicate deploy --model {output_dir}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-model', default='openai/whisper-small')
    parser.add_argument('--language', required=True)
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--epochs', type=int, default=3)
    parser.add_argument('--batch-size', type=int, default=8)
    
    args = parser.parse_args()
    fine_tune_whisper(**vars(args))
```

### Medical NLP Training

```python
# /companies/hojai-ai/voice-training/scripts/train_medical_nlp.py

"""
Train NER model for medical terminology extraction
"""

import spacy
from spacy.training import Example

def train_medical_ner(
    training_data: list,
    output_dir: str,
    n_iter: int = 100,
):
    """
    Train NER for medical entities
    
    Entities:
    - SYMPTOM
    - MEDICATION
    - DOSAGE
    - DURATION
    - DIAGNOSIS
    """
    nlp = spacy.blank('en')
    
    # Add NER component
    ner = nlp.add_pipe('ner')
    
    # Add entity labels
    for label in ['SYMPTOM', 'MEDICATION', 'DOSAGE', 'DURATION', 'DIAGNOSIS']:
        ner.add_label(label)
    
    # Train
    other_pipes = [pipe for pipe in nlp.pipe_names if pipe != 'ner']
    with nlp.select_pipes(disable=other_pipes):
        optimizer = nlp.begin_training()
        for itn in range(n_iter):
            losses = {}
            # ... training loop ...
            pass
    
    nlp.to_disk(output_dir)
```

---

## Agent Training

### Agent Capability Definition

```typescript
// /companies/hojai-ai/hojai-agent-marketplace/src/agents.ts

export interface AgentCapability {
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  examples: string[];
  trust_score: number;
  avg_response_time_ms: number;
}

export const agentCapabilities: Record<string, AgentCapability[]> = {
  restaurant: [
    {
      name: 'order_taker',
      description: 'Takes food orders accurately',
      inputs: ['customer_message', 'menu_data'],
      outputs: ['order_object', 'confirmation'],
      examples: [
        'I would like to order a butter chicken',
        'Can I get the paneer tikka with extra cheese?',
      ],
      trust_score: 0.95,
      avg_response_time_ms: 1500,
    },
    {
      name: 'reservation_manager',
      description: 'Handles table reservations',
      inputs: ['customer_message', 'availability'],
      outputs: ['booking_object', 'confirmation'],
      examples: [
        'I want to book a table for 4 tonight at 7 PM',
        'Do you have any tables available tomorrow?',
      ],
      trust_score: 0.92,
      avg_response_time_ms: 2000,
    },
  ],
  
  healthcare: [
    {
      name: 'symptom_checker',
      description: 'Preliminary symptom assessment (non-diagnostic)',
      inputs: ['symptoms', 'patient_history'],
      outputs: ['assessment', 'recommendations'],
      examples: [
        'I have a headache and fever',
        'My knee has been hurting for 3 days',
      ],
      trust_score: 0.85,
      avg_response_time_ms: 3000,
      disclaimer: 'This is not a medical diagnosis. Please consult a physician.',
    },
    {
      name: 'appointment_scheduler',
      description: 'Schedules medical appointments',
      inputs: ['specialty', 'preferred_date', 'patient_info'],
      outputs: ['appointment_object', 'reminders'],
      examples: [
        'I need to see a cardiologist',
        'Book an appointment for tomorrow morning',
      ],
      trust_score: 0.98,
      avg_response_time_ms: 1500,
    },
  ],
};
```

### Agent Training Data

```json
{
  "training_data": {
    "order_taker": {
      "intent_examples": [
        {"text": "I'd like to order the chicken biryani", "label": "place_order"},
        {"text": "Can I get a table for 4?", "label": "make_reservation"},
        {"text": "Where is my order?", "label": "track_order"},
        {"text": "I want to cancel my order", "label": "cancel_order"}
      ],
      "entity_examples": [
        {"text": "chicken biryani", "label": "food_item"},
        {"text": "extra spicy", "label": "modification"},
        {"text": "table for four", "label": "party_size"}
      ],
      "response_templates": {
        "place_order": "I've added {items} to your order. Your total is ₹{total}. Is there anything else?",
        "confirm_order": "Your order #{order_id} is confirmed. Estimated time: {time} minutes."
      }
    }
  }
}
```

---

## Fine-tuning Requirements

### When to Fine-tune

| Scenario | Fine-tune? | Alternative |
|----------|-----------|-------------|
| General chatbot | ❌ No | Better prompts |
| Domain-specific (medical, legal) | ⚠️ Maybe | RAG first |
| Unique terminology | ✅ Yes | If RAG not enough |
| Style/tone customization | ❌ No | System prompts |
| Code generation | ❌ No | Already excellent |

### Fine-tuning Cost Estimate

```
┌─────────────────────────────────────────────────────────────────┐
│                    FINE-TUNING COSTS                             │
│                                                                  │
│  OpenAI Fine-tuning:                                            │
│  - Training: ~$0.008/1K tokens                                  │
│  - Input: ~$0.003/1K tokens                                     │
│  - Output: ~$0.012/1K tokens                                    │
│                                                                  │
│  Example: Restaurant menu chatbot                               │
│  - Dataset: 10,000 examples                                     │
│  - Training time: ~1 hour                                       │
│  - One-time cost: ~$6                                            │
│  - Monthly usage: ~$50 (if 10K queries/month)                   │
│                                                                  │
│  Recommendation: Start WITHOUT fine-tuning                      │
│  Use RAG + prompts first. Fine-tune only if performance lags.   │
└─────────────────────────────────────────────────────────────────┘
```

### Fine-tuning Process (If Needed)

```bash
# 1. Prepare training data
cat > training_data.jsonl << 'EOF'
{"messages": [
  {"role": "system", "content": "You are a restaurant assistant..."},
  {"role": "user", "content": "What's in the butter chicken?"},
  {"role": "assistant", "content": "Butter chicken contains..."}
]}
EOF

# 2. Upload dataset
curl https://api.openai.com/v1/files \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F purpose="fine-tune" \
  -F file="@training_data.jsonl"

# 3. Create fine-tune job
curl https://api.openai.com/v1/fine_tuning/jobs \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "training_file": "file-xxxxx",
    "model": "gpt-4o-mini-2024-07-18"
  }'

# 4. Monitor progress
openai fine_tuning.jobs.list

# 5. Use fine-tuned model
model = "ft:gpt-4o-mini-2024-07-18:company:restaurant-assistant:xxxxx"
```

---

## Go-Live Checklist

### AI Setup (Do Before Launch)

- [ ] **LLM Providers Configured**
  - [ ] OpenAI API key set
  - [ ] Anthropic API key set (optional)
  - [ ] Google API key set (optional)
  - [ ] Model router deployed and tested

- [ ] **RAG Knowledge Base**
  - [ ] Industry documents uploaded
  - [ ] Documents chunked and indexed
  - [ ] Retrieval tested with sample queries
  - [ ] Citations working correctly

- [ ] **Voice AI**
  - [ ] Whisper API configured
  - [ ] ElevenLabs API configured
  - [ ] Language settings correct
  - [ ] Audio quality tested

- [ ] **Agents**
  - [ ] Agent marketplace deployed
  - [ ] Industry agents registered
  - [ ] Agent workflows configured
  - [ ] Fallback to human set up

### Testing Checklist

```bash
# 1. Test LLM routing
npm run test:routing -- --provider openai

# 2. Test RAG retrieval
npm run test:rag << 'EOF'
What vegetarian options are available?
EOF

# 3. Test agent matching
npm run test:agent-matching -- --query "I want to book a table"

# 4. Test voice pipeline
npm run test:voice -- --audio sample.wav

# 5. Test end-to-end
npm run test:e2e -- --scenario "customer orders food"
```

### Monitoring Setup

```typescript
// Add to your services for monitoring

const monitoring = {
  // Track LLM costs
  llmUsage: {
    totalTokens: 0,
    costEstimate: 0,
    byModel: {},
    byIntent: {},
  },
  
  // Track RAG performance
  ragMetrics: {
    retrievalLatency: [],
    contextRelevance: [],
    citationAccuracy: [],
  },
  
  // Track agent performance
  agentMetrics: {
    successRate: 0,
    avgResponseTime: 0,
    escalationRate: 0,
    byAgent: {},
  },
};
```

---

## Summary

### What You Need to Do

| Task | Effort | Priority | Status |
|------|--------|----------|--------|
| Configure LLM API keys | 5 min | CRITICAL | ⏳ |
| Upload RAG documents | 2-4 hours | HIGH | ⏳ |
| Configure agent personas | 1-2 hours | HIGH | ⏳ |
| Test AI pipelines | 1 hour | HIGH | ⏳ |
| Set up monitoring | 1 hour | MEDIUM | ⏳ |
| Fine-tune Whisper (optional) | 4-8 hours | LOW | ⏳ |
| Fine-tune LLM (rarely needed) | 2-4 hours | LOW | ⏳ |

### Key Takeaways

1. **You don't need to train models** - Use RAG + prompts instead
2. **Focus on knowledge base** - Your business data matters most
3. **Start simple** - Add complexity only if needed
4. **Monitor costs** - Set up billing alerts
5. **Test thoroughly** - AI can be unpredictable

---

**Questions?** Check the documentation or reach out to the HOJAI AI team.
