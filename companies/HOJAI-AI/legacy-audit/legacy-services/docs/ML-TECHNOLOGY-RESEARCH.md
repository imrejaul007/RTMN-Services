# HOJAI AI - ML/AI TECHNOLOGY RESEARCH
**Version:** 1.0 | **Date:** May 30, 2026

---

# EXECUTIVE SUMMARY

## HOJAI is NOT an ML company or LLM company.

**HOJAI is an Operational AI Platform.**

```
HOJAI combines:
├── ML Models
├── Neural Networks
├── LLMs
├── Memory Systems
├── Workflows
├── Agents
├── Data
└── Intelligence

Into operational AI systems.
```

## For Investors

> "Hojai combines machine learning, memory systems, workflow orchestration, industry intelligence, and large language models to create operational AI systems that continuously learn and execute."

**Story = Outcomes, not model architecture.**

---

# 1. TECHNOLOGY STACK OVERVIEW

## 1.1 The Three Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    HOJAI AI LAYERS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  LAYER 1: APPLICATION                               │  │
│  │  ├── AI Employees (Agents)                          │  │
│  │  ├── Memory (Organizational Brain)                   │  │
│  │  ├── Workflows (Automation)                          │  │
│  │  └── Products (Merchant OS, Enterprise OS, Genie)   │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  LAYER 2: INTELLIGENCE                              │  │
│  │  ├── Predictions (Churn, LTV, Conversion)           │  │
│  │  ├── Recommendations (Products, Content)            │  │
│  │  ├── Segmentation (RFM, Behavioral)                 │  │
│  │  └── Attribution (Multi-touch)                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  LAYER 3: MODELS (Don't show investors)             │  │
│  │  ├── Traditional ML (XGBoost, LightGBM)              │  │
│  │  ├── Neural Networks (DNN, Transformers)           │  │
│  │  ├── LLMs (GPT, Claude, Gemini)                    │  │
│  │  └── Vector Search (Pinecone, pgvector)              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

# 2. TRADITIONAL ML MODELS

## 2.1 When to Use

| Use Case | Best Model | Why |
|----------|-----------|-----|
| Churn prediction | XGBoost | Interpretable, fast, tabular data |
| LTV prediction | CatBoost | Handles categorical features |
| Fraud detection | LightGBM | Fast, imbalanced data |
| Demand forecasting | XGBoost + Prophet | Combines trend + features |
| Lead scoring | Logistic Regression | Simple, explainable |

## 2.2 Recommended Stack

| Model | Use Case | Library |
|-------|----------|---------|
| XGBoost | Tabular predictions | xgboost |
| LightGBM | Fast training | lightgbm |
| CatBoost | Categorical features | catboost |
| Prophet | Time series | prophet |
| Random Forest | Baseline | sklearn |

## 2.3 Industry Usage

```
┌─────────────────────────────────────────────────────┐
│  Traditional ML Usage in Industry                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Netflix:     XGBoost → Recommendation ranking     │
│  Uber:       LightGBM → Demand prediction          │
│  Airbnb:      XGBoost → Search ranking            │
│  LinkedIn:    Logistic Reg → Lead scoring          │
│  Stripe:      Random Forest → Fraud detection      │
│                                                      │
│  → These are NOT ML companies.                      │
│  → They use ML as a tool.                         │
│  → HOJAI follows same pattern.                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

# 3. NEURAL NETWORKS

## 3.1 When to Use

| Use Case | Best Architecture | Library |
|----------|-----------------|---------|
| Product recommendations | DNN, Two-Tower | TensorFlow, PyTorch |
| Customer embeddings | Embedding layers | PyTorch |
| Ranking | DeepFM, Wide & Deep | TensorFlow |
| Similarity search | Vector embeddings | Pinecone, pgvector |

## 3.2 Recommended Stack

| Architecture | Use Case | Complexity |
|-------------|----------|------------|
| DNN (Deep Neural Network) | Tabular + embeddings | Medium |
| Wide & Deep | Memorization + generalization | Medium |
| Two-Tower | Recommendation | Medium |
| DeepFM | Feature interactions | Medium |
| Transformer | Sequence understanding | High |

## 3.3 Customer Embeddings

```
┌─────────────────────────────────────────────────────┐
│  Customer Embeddings                                │
├─────────────────────────────────────────────────────┤
│                                                      │
│  User A: [0.2, -0.1, 0.8, 0.3, ...]             │
│  User B: [0.1, 0.3, 0.7, 0.2, ...]             │
│  User C: [-0.3, 0.5, 0.1, 0.9, ...]             │
│                                                      │
│  Similarity = Cosine(Embedding A, Embedding B)     │
│                                                      │
│  Use Cases:                                         │
│  ├── Find similar customers                          │
│  ├── Customer segmentation                          │
│  ├── Lookalike audiences                            │
│  └── Personalization                                │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

# 4. LARGE LANGUAGE MODELS (LLMs)

## 4.1 LLM Selection Matrix

| Provider | Model | Use Case | Cost |
|----------|-------|----------|------|
| OpenAI | GPT-4o | Reasoning, conversation | High |
| Anthropic | Claude 3.5 | Long context, analysis | High |
| Google | Gemini 1.5 | Multimodal, long context | Medium |
| Meta | Llama 3 | Open source, fine-tuning | Low |
| Mistral | Mixtral | Efficient, open | Low |

## 4.2 LLM Use Cases in HOJAI

```
┌─────────────────────────────────────────────────────┐
│  LLM Use Cases                                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  AI Employees (Agents)                               │
│  ├── Support → FAQ, ticket routing                 │
│  ├── Sales → Lead qualification                     │
│  ├── Info → Knowledge retrieval                    │
│  └── Consultant → Business advice                   │
│                                                      │
│  Memory & Context                                   │
│  ├── Summarization → Meeting notes                 │
│  ├── Entity extraction → Names, dates              │
│  └── Intent understanding → User queries             │
│                                                      │
│  Workflows                                          │
│  ├── Decision making → Route to agent              │
│  ├── Content generation → Responses                 │
│  └── Classification → Ticket categories             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## 4.3 LLM Architecture

```
┌─────────────────────────────────────────────────────┐
│  LLM Integration Architecture                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│                    ┌─────────────┐                  │
│                    │   LLM      │                  │
│                    │  (GPT-4o)  │                  │
│                    └──────┬──────┘                  │
│                           │                         │
│         ┌────────────────┼────────────────┐      │
│         │                │                │      │
│         ▼                ▼                ▼      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │  Memory    │  │  RAG       │  │  Tools     │  │
│  │  Context  │  │  Retrieval │  │  (Actions) │  │
│  └────────────┘  └────────────┘  └────────────┘  │
│                                                      │
│  LangChain / LangGraph for orchestration            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

# 5. WHERE EACH FITS IN HOJAI

## 5.1 HOJAI Intelligence Platform (4530)

```
┌─────────────────────────────────────────────────────┐
│  HOJAI Intelligence Platform                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  PREDICTIONS                                  │  │
│  │  ├── Churn prediction → XGBoost               │  │
│  │  ├── LTV prediction → CatBoost                │  │
│  │  ├── Conversion → LightGBM                     │  │
│  │  └── Fraud → Random Forest                     │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  RECOMMENDATIONS                              │  │
│  │  ├── Product → Neural Collaborative Filtering │  │
│  │  ├── Content → DNN embeddings                 │  │
│  │  └── Next action → Reinforcement Learning     │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  SEGMENTATION                                 │  │
│  │  ├── RFM → K-means clustering                │  │
│  │  ├── Behavioral → XGBoost + embeddings       │  │
│  │  └── Propensity → Logistic Regression        │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## 5.2 REZ Intelligence (Graph Services)

```
┌─────────────────────────────────────────────────────┐
│  REZ Intelligence - Graph Services                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  GRAPH NEURAL NETWORKS (Future)              │  │
│  │  ├── GraphSAGE → Node embeddings             │  │
│  │  ├── GAT → Attention-based GNN               │  │
│  │  └── Entity resolution → Link prediction       │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  INTENT MODELS                                │  │
│  │  ├── BERT → Intent classification            │  │
│  │  ├── GPT → Intent generation                  │  │
│  │  └── Transformer → Sequence understanding       │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  ATTRIBUTION MODELS                           │  │
│  │  ├── Shapley → Fair attribution              │  │
│  │  ├── Markov → Path attribution                │  │
│  │  └──生存 → Data-driven attribution            │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## 5.3 HOJAI Agents Platform (4550)

```
┌─────────────────────────────────────────────────────┐
│  HOJAI Agents Platform                             │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  AGENT ORCHESTRATION                          │  │
│  │  ├── LangGraph → Workflow graphs             │  │
│  │  ├── ReAct → Reasoning + acting               │  │
│  │  └── Tool use → Function calling              │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  AGENT TYPES                                  │  │
│  │  ├── Support → Claude (analysis)            │  │
│  │  ├── Sales → GPT-4o (conversation)          │  │
│  │  ├── Info → Llama (fast, local)              │  │
│  │  └── Research → Gemini (multimodal)          │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  MEMORY FOR AGENTS                            │  │
│  │  ├── Vector DB → Pinecone, pgvector          │  │
│  │  ├── Session → Redis                          │  │
│  │  └── Long-term → HOJAI Memory Platform        │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

# 6. INDUSTRY-SPECIFIC MODELS

## 6.1 Jewelry Intelligence

```
┌─────────────────────────────────────────────────────┐
│  Jewelry AI Models                                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  BRIDAL CONVERSION                            │  │
│  │  ├── Feature: Purchase history, visits        │  │
│  │  ├── Model: XGBoost                         │  │
│  │  └── Output: Probability of bridal purchase   │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  GOLD BUYING CYCLE                            │  │
│  │  ├── Feature: Festival dates, income          │  │
│  │  ├── Model: Prophet + XGBoost                │  │
│  │  └── Output: Next likely purchase date        │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  PRICE SENSITIVITY                            │  │
│  │  ├── Feature: Browsing, wishlist             │  │
│  │  ├── Model: Neural network                    │  │
│  │  └── Output: Discount sensitivity score        │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## 6.2 Healthcare Intelligence

```
┌─────────────────────────────────────────────────────┐
│  Healthcare AI Models                               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  NO-SHOW PREDICTION                          │  │
│  │  ├── Feature: History, demographics           │  │
│  │  ├── Model: XGBoost                          │  │
│  │  └── Output: No-show probability              │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  TREATMENT ADHERENCE                           │  │
│  │  ├── Feature: Prescription, history          │  │
│  │  ├── Model: LSTM (sequences)                 │  │
│  │  └── Output: Adherence score                  │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  PATIENT RISK STRATIFICATION                  │  │
│  │  ├── Feature: Vitals, history                 │  │
│  │  ├── Model: CatBoost                         │  │
│  │  └── Output: Risk tier (low/medium/high)      │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## 6.3 Hospitality Intelligence

```
┌─────────────────────────────────────────────────────┐
│  Hospitality AI Models                              │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  OCCUPANCY FORECASTING                        │  │
│  │  ├── Feature: Season, events, pricing        │  │
│  │  ├── Model: Prophet + TFT                    │  │
│  │  └── Output: Daily occupancy prediction        │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  UPSELL PROPENSITY                            │  │
│  │  ├── Feature: Booking, demographics          │  │
│  │  ├── Model: XGBoost                         │  │
│  │  └── Output: Upsell probability              │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  GUEST LTV                                   │  │
│  │  ├── Feature: Stay history, spend           │  │
│  │  ├── Model: BG/NBD + Gamma/Gamma           │  │
│  │  └── Output: Lifetime value estimate         │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

# 7. VECTOR SEARCH & MEMORY

## 7.1 Architecture

```
┌─────────────────────────────────────────────────────┐
│  Vector Search Architecture                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────┐    ┌─────────────┐               │
│  │   OpenAI    │    │   Gemini    │               │
│  │ Embeddings  │    │  Embeddings │               │
│  └──────┬──────┘    └──────┬──────┘               │
│         │                   │                        │
│         └─────────┬─────────┘                        │
│                   │                                   │
│                   ▼                                   │
│         ┌─────────────────┐                          │
│         │  Vector Store   │                          │
│         │  (Pinecone/     │                          │
│         │   pgvector)      │                          │
│         └────────┬────────┘                          │
│                  │                                    │
│                  ▼                                    │
│         ┌─────────────────┐                          │
│         │    HOJAI       │                          │
│         │    Memory      │                          │
│         │   Platform      │                          │
│         └─────────────────┘                          │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## 7.2 Use Cases

| Use Case | Embedding Model | Vector DB |
|----------|----------------|-----------|
| Document search | text-embedding-3 | Pinecone |
| Customer memory | Custom BERT | pgvector |
| Product search | CLIP | Pinecone |
| Semantic search | Gemini | pgvector |

---

# 8. MODEL DEPLOYMENT

## 8.1 Architecture

```
┌─────────────────────────────────────────────────────┐
│  Model Deployment Architecture                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  TRAINING PIPELINE                           │  │
│  │  ├── Feature store (Feast)                   │  │
│  │  ├── Training (SageMaker, Vertex AI)         │  │
│  │  └── Model registry (MLflow)                  │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  INFERENCE PIPELINE                           │  │
│  │  ├── API Gateway                              │  │
│  │  ├── Feature computation                       │  │
│  │  ├── Model inference                           │  │
│  │  └── Response caching (Redis)                   │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  MONITORING                                   │  │
│  │  ├── Drift detection                          │  │
│  │  ├── Latency monitoring                       │  │
│  │  └── Performance tracking                     │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## 8.2 Infrastructure Recommendations

| Component | Recommended | Use Case |
|-----------|-------------|----------|
| Cloud | AWS SageMaker | ML training/deployment |
| Alternative | GCP Vertex AI | ML training/deployment |
| Feature store | Feast | Feature management |
| Model registry | MLflow | Model versioning |
| Inference | TorchServe, TF Serving | Low latency |
| LLM inference | Replicate, Anyscale | Managed LLM |
| Vector DB | Pinecone, pgvector | Semantic search |

---

# 9. FOR INVESTORS (WHAT TO SAY)

## 9.1 The Simple Version

> "HOJAI combines machine learning, memory systems, workflow orchestration, industry intelligence, and large language models to create operational AI systems that continuously learn and execute."

## 9.2 Key Points

| Don't Say | Say Instead |
|------------|-------------|
| "We use XGBoost and LSTMs" | "We predict churn with 94% accuracy" |
| "We use transformer models" | "Our AI understands customer intent" |
| "We have neural networks" | "Our system learns from every interaction" |

## 9.3 Outcomes Over Architecture

| Outcome | Model Used |
|---------|-----------|
| Reduce churn by 30% | Churn prediction model |
| Increase conversion by 25% | Propensity model |
| Reduce support tickets by 50% | Support AI agent |
| Increase AOV by 15% | Recommendation engine |

**Investors care about outcomes, not model names.**

---

# 10. FOR DEVELOPERS (TECHNICAL DETAILS)

## 10.1 ML Stack

```yaml
ml_stack:
  tabular:
    - xgboost
    - lightgbm
    - catboost
    - sklearn
  
  deep_learning:
    - pytorch
    - tensorflow
  
  llm:
    - openai (gpt-4o)
    - anthropic (claude-3.5)
    - google (gemini-1.5)
    - meta (llama-3)
  
  vector_search:
    - pinecone
    - pgvector
    - weaviate
  
  orchestration:
    - langchain
    - langgraph
    - llamaindex
  
  mlops:
    - mlflow
    - feast
    - bentoml
```

## 10.2 Model Training Pipeline

```python
# Example: Churn Prediction
import xgboost as xgb
from sklearn.model_selection import train_test_split

# Load features from feature store
features = feast.get_features(entity_id=customer_id)

# Train model
X_train, X_test, y_train, y_test = train_test_split(
    features, labels, test_size=0.2
)

model = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1
)
model.fit(X_train, y_train)

# Log to MLflow
mlflow.xgboost.log_model(model, "churn_model")

# Deploy to production
bentoml.xgboost.save_model("churn", model)
```

## 10.3 LLM Integration

```python
# Example: Support Agent
from langchain import LangChain
from langchain.agents import Agent
from anthropic import Anthropic

# Initialize Claude
claude = Anthropic()

# Create agent with memory
agent = Agent(
    model=claude,
    tools=[
        knowledge_base.search,
        ticket_system.create,
        customer.get_info
    ],
    memory=hojai_memory
)

# Run agent
response = agent.run(
    "Customer asking about refund for order #12345"
)
```

---

# 11. COMPARISON WITH COMPETITORS

## 11.1 ML Usage

| Company | ML Stack | Approach |
|---------|----------|----------|
| Salesforce | XGBoost, Einstein | Tabular + predictions |
| HubSpot | sklearn, Keras | Lead scoring, chat |
| Intercom | GPT, BERT | Support, Fin |
| Zendesk | GPT | Support AI |
| HOJAI | XGBoost, GPT, Custom | Multi-model |

## 11.2 Key Insight

```
Salesforce ≠ ML company
HubSpot ≠ ML company
Intercom ≠ ML company

HOJAI ≠ ML company

All use ML as a tool.
```

---

# 12. RECOMMENDATIONS

## 12.1 Month 1-3: Foundation

| Model | Priority | Use Case |
|-------|----------|----------|
| XGBoost | HIGH | Churn, LTV |
| LightGBM | HIGH | Fast predictions |
| OpenAI GPT-4o | HIGH | Agents, conversation |
| Claude 3.5 | MEDIUM | Analysis, long context |
| Pinecone | HIGH | Vector search |

## 12.2 Month 4-6: Enhancement

| Model | Priority | Use Case |
|-------|----------|----------|
| CatBoost | MEDIUM | Categorical features |
| Llama 3 | MEDIUM | Local, fast inference |
| Gemini | MEDIUM | Multimodal |
| Recommendation DNN | MEDIUM | Product recommendations |
| Prophet | MEDIUM | Time series forecasting |

## 12.3 Month 7-12: Scale

| Model | Priority | Use Case |
|-------|----------|----------|
| Graph Neural Networks | LOW | Identity graph |
| Fine-tuned LLMs | MEDIUM | Industry-specific |
| Reinforcement Learning | LOW | Optimization |
| Custom Transformers | LOW | Proprietary models |

---

# 13. SUMMARY

## HOJAI ML Stack

```
┌─────────────────────────────────────────────────────┐
│  HOJAI AI - Technology Stack                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  APPLICATION LAYER                                  │
│  ├── AI Employees (Agents)                         │
│  ├── Memory Systems                                │
│  └── Workflow Orchestration                        │
│                                                      │
│  INTELLIGENCE LAYER                                │
│  ├── Predictions (XGBoost, LightGBM)             │
│  ├── Recommendations (Neural Networks)            │
│  ├── Segmentation (Clustering, Embeddings)        │
│  └── Attribution (Shapley, Markov)                │
│                                                      │
│  MODEL LAYER                                       │
│  ├── Traditional ML (XGBoost, LightGBM, CatBoost) │
│  ├── Neural Networks (DNN, Transformers)         │
│  ├── LLMs (GPT-4o, Claude, Gemini, Llama)        │
│  └── Vector Search (Pinecone, pgvector)          │
│                                                      │
│  INFRASTRUCTURE                                     │
│  ├── Cloud (AWS/GCP)                              │
│  ├── Feature Store (Feast)                        │
│  ├── Model Registry (MLflow)                      │
│  └── Observability (Evidently)                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Key Takeaway

**HOJAI is an Operational AI Platform.**

ML, Neural Networks, and LLMs are tools.

The story is **outcomes**, not architecture.

---

*Document Version: 1.0*
*Last Updated: May 30, 2026*
