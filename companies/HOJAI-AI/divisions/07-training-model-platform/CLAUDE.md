# Division 7 — AI Training & Model Platform ⭐

> **Status:** 🔴 ~5% built (the largest gap)
> **Owner:** HOJAI AI Research + Platform team

---

## 1. Mission

This is the **strategic bottleneck** and the most ambitious division. Build the capability to **train, fine-tune, evaluate, serve, and continuously improve** HOJAI's own models. Long-term this is what differentiates HOJAI from a thin wrapper around OpenAI/Anthropic.

**Realistic expectation:** Build incrementally. For the next 2-3 years, the highest ROI comes from being a **smart orchestrator** of external models (OpenAI, Anthropic, Google, Mistral, open-source). Training a foundation model from scratch is a 5-year, $50M+ investment. Start with fine-tuning + RLHF + continuous learning.

## 2. Target State (per plan)

### Foundation Models
- HOJAI Foundation Model (general-purpose LLM)
- Domain-Specific Models (healthcare, legal, finance, retail, etc.)
- Small Language Models (SLMs, edge-deployable)
- Vision Models
- Speech Models
- Embedding Models
- Reranking Models
- Multimodal Models

### Training Platform
- Dataset Management
- Data Labeling
- Synthetic Data Generation
- Knowledge Distillation
- Fine-Tuning Pipeline
- Reinforcement Learning Pipeline (RLHF / RLAIF)
- Evaluation & Benchmarking
- Model Registry
- Model Versioning
- Experiment Tracking
- Distributed Training
- GPU Cluster Management

### Continuous Learning
- User Feedback Learning
- Company Learning
- Industry Learning
- Agent Learning
- Twin Learning
- Skill Learning
- Workflow Learning

### Model Serving
- Inference Gateway
- Prompt Management
- Prompt Optimization
- Caching
- Routing Across Models
- Cost Optimization
- Latency Optimization
- Safety Filters

### AI Safety
- Guardrails
- Red Team Testing
- Hallucination Detection
- Privacy Protection
- Bias Evaluation
- Compliance
- Security Scanning

## 3. Current State — What's Built

**Effectively nothing.** Grep for "fine-tun", "rlhf", "embedding model", "vector db" across the repo:

| What I searched | Found |
|---|---|
| Pinecone/Weaviate/Qdrant/chromadb/embedding model | 0 results |
| fine-tune / rlhf / training pipeline | 0 results |
| openai SDK | 1 result — only in [companies/HOJAI-AI-restored/hojai-intelligence/package.json](../../HOJAI-AI-restored/hojai-intelligence/package.json), and that service isn't running |
| Anthropic / Google / Mistral SDKs | 0 results |

**Bottom line: no model serving infrastructure, no training pipeline, no GPU cluster, no eval framework, no safety/red-team testing.** Every division that needs LLM inference is implicitly relying on direct calls to OpenAI/Anthropic from inside service code.

## 4. What's NOT Built (everything)

| Missing | Effort | Notes |
|---|---|---|
| **Model Serving Gateway** | 4-6 weeks | vLLM / Triton / TGI to serve open models |
| **Inference Gateway** (multi-model routing) | 4-6 weeks | Route to OpenAI / Anthropic / Google / self-hosted by capability + cost |
| **Prompt Management + Versioning** | 2-3 weeks | Store prompts as code, version, A/B test |
| **Caching layer** (semantic cache) | 2-3 weeks | GPTCache or build on Redis |
| **Cost + Latency optimization** | ongoing | Token budgets, model downgrade |
| **Fine-tuning Pipeline** | 6-8 weeks | LoRA / PEFT first, full FT later |
| **RLHF / RLAIF Pipeline** | 8-12 weeks | Needs labeling + reward model + PPO/DPO |
| **Evaluation + Benchmarking** | 4-6 weeks | Internal eval harness + benchmarks |
| **GPU Cluster Management** | ongoing | Kubernetes + GPU operators, or managed (Modal, Replicate, Anyscale) |
| **Model Registry + Versioning** | 2-3 weeks | MLflow or custom |
| **Experiment Tracking** | 2-3 weeks | Weights & Biases or MLflow |
| **Distributed Training** | 12+ weeks | Only matters if doing foundation model training |
| **Synthetic Data Generation** | 4-6 weeks | Use LLMs to bootstrap training data |
| **Knowledge Distillation** | 6-8 weeks | Distill big model into small for edge |
| **Continuous Learning** (closed-loop from agent feedback) | 8-12 weeks | The flywheel from your plan |
| **AI Safety** (guardrails, red team, hallucination detection) | 6-8 weeks | Critical for customer trust |
| **Bias Evaluation** | 4-6 weeks | Fairlearn or custom |
| **Compliance** (EU AI Act, GDPR) | ongoing | Legal + tech |
| **Multimodal Models** | 12+ weeks | Vision + Speech + Text unified |

## 5. Gap Score

**~5% of target state is built.** This is the **single largest gap** in the entire platform. It's also the most expensive to close.

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Effort |
|---|---|---|---|
| 1 | **Model Serving Gateway** (orchestration of external models) | 🔴 P0 | 4-6 weeks — unblocks cost control + reliability |
| 2 | **Inference Gateway** (multi-model routing) | 🔴 P0 | 4-6 weeks — single API for all LLMs |
| 3 | **Prompt Management + Versioning** | 🔴 P0 | 2-3 weeks — every AI feature needs this |
| 4 | **Semantic Caching** | 🟡 P1 | 2-3 weeks — 50%+ cost reduction possible |
| 5 | **AI Safety / Guardrails** | 🟡 P1 | 6-8 weeks — customer trust |
| 6 | **Hallucination Detection** | 🟡 P1 | 4-6 weeks — quality |
| 7 | **Fine-tuning Pipeline** (LoRA/PEFT) | 🟡 P1 | 6-8 weeks — domain adaptation |
| 8 | **Evaluation Harness** | 🟡 P1 | 4-6 weeks — measure before improving |
| 9 | **Embedding Models** (small, hosted) | 🟢 P2 | 2-4 weeks |
| 10 | **RLHF/RLAIF Pipeline** | 🟢 P2 | 8-12 weeks |
| 11 | **Continuous Learning** (closed-loop from agent feedback) | 🟢 P2 | 8-12 weeks |
| 12 | **Domain-Specific Models** (healthcare, legal, finance) | 🟢 P2 | 12+ weeks each |
| 13 | **HOJAI Foundation Model** | 🔴 P3 (long-term) | 5 years, $50M+ — partner, don't build alone |
| 14 | **Multimodal Models** | 🟢 P3 | 12+ weeks |
| 15 | **Distributed Training infra** | 🟢 P3 | 12+ weeks |

## 7. Dependencies

- **Depends on:** Division 1 (auth, secrets for API keys), Division 6 (data for training)
- **Blocks:** Every other division that needs LLM inference (which is all of them)

## 8. Open Questions

These are big strategic decisions:

1. **Build vs Buy vs Partner on foundation model:**
   - Build from scratch ($50M+, 5 years) — only if you have unique data
   - Fine-tune Llama 3 / Mistral on your data (1-3 years, much cheaper)
   - Use OpenAI/Anthropic + build orchestration (fastest, lowest cost)
   - **My recommendation:** Start with orchestration + fine-tuning. Don't build foundation model until you have proprietary data advantage.

2. **GPU strategy:**
   - Own GPUs (capex, ops burden, but full control)
   - Rent from Modal / Replicate / Anyscale (opex, fast)
   - Use cloud GPU (AWS/GCP/Azure, moderate control)

3. **Data for training:**
   - User-generated data (privacy-sensitive, requires consent)
   - Synthetic data (safer, but quality varies)
   - Public datasets + your own (most realistic)

4. **When to hire an ML research team:**
   - Now (if vision is 5-year) — 3-5 PhD-level ML researchers
   - After orchestration is solid (recommended) — start with ML engineers, add researchers when you have proprietary data

5. **HOJAI Foundation Model name:** if you build it, what would it be called? (For naming/branding later)

---

*See also: [services/ai-intelligence/CLAUDE.md](../../../services/ai-intelligence/CLAUDE.md) (consumer), [companies/HOJAI-AI-restored/hojai-intelligence/CLAUDE.md](../../HOJAI-AI-restored/hojai-intelligence/CLAUDE.md) (recovered consumer with OpenAI dep)*