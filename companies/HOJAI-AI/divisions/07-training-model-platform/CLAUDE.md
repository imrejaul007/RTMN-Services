# Division 7 — AI Training & Model Platform ⭐

> **Status:** 🟢 ~50% built as of June 20, 2026 (9 new services added: inference-gateway, prompt-manager, semantic-cache, model-registry, ai-safety, evaluation-harness, **fine-tuning-pipeline, synthetic-data-generation, gpu-cluster-manager**)
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

**As of June 18, 2026:** effectively nothing — no model serving infrastructure, no training pipeline, no GPU cluster, no eval framework, no safety/red-team testing. Every division needing LLM inference was implicitly relying on direct calls to OpenAI/Anthropic from inside service code.

**As of June 20, 2026:** 🟢 Major step forward. **9** new services built that cover the **runtime + training + safety + eval + GPU** layer. The 3 new training-platform services landed today:

| Service | Port | Purpose |
|---------|------|---------|
| [./services/inference-gateway/](../services/inference-gateway/) | **4770** | ✅ — Multi-model LLM router (OpenAI, Anthropic, Google, Mistral, local) with cost + latency routing, fallback chain, 9-model catalog |
| [./services/prompt-manager/](../services/prompt-manager/) | **4771** | ✅ — Prompt templates with versioning, rollback, A/B experiments, variable substitution |
| [./services/semantic-cache/](../services/semantic-cache/) | **4772** | ✅ — Embedding-based LLM response cache, paraphrase matching, 50%+ cost reduction target |
| [./services/model-registry/](../services/model-registry/) | **4773** | ✅ — Model catalog of record with versions, deployment info, benchmark scores, capabilities |
| [./services/ai-safety/](../services/ai-safety/) | **4774** | ✅ — PII redaction, prompt-injection defense, content filtering, hallucination detection, output validation |
| [./services/evaluation-harness/](../services/evaluation-harness/) | **4775** | ✅ — LLM eval framework with 8 scorer types, benchmark CRUD, model comparison |
| [./services/fine-tuning-pipeline/](../services/fine-tuning-pipeline/) | **4776** | ✅ NEW — Fine-tuning orchestrator (LoRA / QLoRA / Prefix / IA³ / Full) with dataset CRUD, GPU-queue dispatch, checkpoint tracking, 5-method + 7-base-model catalog |
| [./services/synthetic-data-generation/](../services/synthetic-data-generation/) | **4777** | ✅ NEW — Synthetic dataset generator with 5 domain banks (customer_support, ecommerce, healthcare, finance, general) and per-domain schema/seed-set modes |
| [./services/gpu-cluster-manager/](../services/gpu-cluster-manager/) | **4778** | ✅ NEW — GPU node + allocation manager with priority scheduling, label matching, 7-GPU catalog (H100/A100/L40S/RTX-4090/T4/V100), live cluster stats |

All 9 are wired into HOJAI Intelligence (4881) routing — `GET /api/route` returns the URL for each, and `/api/agents` lists them as routable agents (now **23 agents total**, up from 20). The 14 new capabilities cover dataset generation, fine-tune job lifecycle, checkpoint tracking, method/model lookup, GPU allocation/release, cluster stats, and node heartbeat.

**Still missing:** RLHF/RLAIF pipeline, real model serving infrastructure (vLLM/Triton/TGI), embeddings beyond the toy vectorizer, real safety ML models, evaluation against real benchmarks, distributed training, knowledge distillation, foundation-model training.

## 4. What's NOT Built (everything)

| Missing | Effort | Notes |
|---|---|---|
| **Model Serving Gateway** | 4-6 weeks | vLLM / Triton / TGI to serve open models |
| **Inference Gateway** (multi-model routing) | 4-6 weeks | Route to OpenAI / Anthropic / Google / self-hosted by capability + cost |
| **Prompt Management + Versioning** | 2-3 weeks | Store prompts as code, version, A/B test |
| **Caching layer** (semantic cache) | 2-3 weeks | GPTCache or build on Redis |
| **Cost + Latency optimization** | ongoing | Token budgets, model downgrade |
| **Fine-tuning Pipeline** | 6-8 weeks | ✅ Built orchestrator (4776); real LoRA training still requires GPU workers |
| **RLHF / RLAIF Pipeline** | 8-12 weeks | Needs labeling + reward model + PPO/DPO |
| **Evaluation + Benchmarking** | 4-6 weeks | ✅ Built eval harness (4775); real benchmark runs still need model endpoints |
| **GPU Cluster Management** | ongoing | ✅ Built manager (4778); real cluster still needs physical/cloud GPUs |
| **Model Registry + Versioning** | 2-3 weeks | MLflow or custom |
| **Experiment Tracking** | 2-3 weeks | Weights & Biases or MLflow |
| **Distributed Training** | 12+ weeks | Only matters if doing foundation model training |
| **Synthetic Data Generation** | 4-6 weeks | ✅ Built generator (4777); 5 domain banks, real LLM-backed gen still needs an inference target |
| **Knowledge Distillation** | 6-8 weeks | Distill big model into small for edge |
| **Continuous Learning** (closed-loop from agent feedback) | 8-12 weeks | The flywheel from your plan |
| **AI Safety** (guardrails, red team, hallucination detection) | 6-8 weeks | Critical for customer trust |
| **Bias Evaluation** | 4-6 weeks | Fairlearn or custom |
| **Compliance** (EU AI Act, GDPR) | ongoing | Legal + tech |
| **Multimodal Models** | 12+ weeks | Vision + Speech + Text unified |

## 5. Gap Score

**~50% of target state is built as of June 20, 2026.** Up from ~5% on June 18, ~30% on June 19. The runtime layer (inference, prompts, cache, registry, safety, eval) is in place. **The training layer is now scaffolded end-to-end** — fine-tuning pipeline, synthetic data generation, and GPU cluster management all exist with realistic APIs, catalog data, and job-lifecycle tracking.

The 9 new services represent the **highest-leverage ~45% of the target** — they unblock every other division's AI features, enable cost control, make prompt iteration safe, and now make custom-model training possible.

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Effort | Status |
|---|---|---|---|---|
| 1 | **Model Serving Gateway** (orchestration of external models) | 🔴 P0 | 4-6 weeks | ✅ DONE — `services/inference-gateway` (4770) |
| 2 | **Inference Gateway** (multi-model routing) | 🔴 P0 | 4-6 weeks | ✅ DONE — same service as #1 |
| 3 | **Prompt Management + Versioning** | 🔴 P0 | 2-3 weeks | ✅ DONE — `services/prompt-manager` (4771) |
| 4 | **Semantic Caching** | 🟡 P1 | 2-3 weeks | ✅ DONE — `services/semantic-cache` (4772), toy embeddings only |
| 5 | **AI Safety / Guardrails** | 🟡 P1 | 6-8 weeks | ✅ PARTIAL — `services/ai-safety` (4774) covers PII, injection, content, hallucination heuristics; ML-based detection still needed |
| 6 | **Hallucination Detection** | 🟡 P1 | 4-6 weeks | ✅ PARTIAL — heuristic detection in ai-safety; LLM-as-judge still needed |
| 7 | **Evaluation Harness** | 🟡 P1 | 4-6 weeks | ✅ DONE — `services/evaluation-harness` (4775), 8 scorer types |
| 8 | **Model Registry** | 🟡 P1 | 2-3 weeks | ✅ DONE — `services/model-registry` (4773) |
| 9 | **Embedding Models** (real, hosted) | 🟢 P2 | 2-4 weeks | ⚪ OPEN — semantic-cache uses toy vectorizer today |
| 10 | **Fine-tuning Pipeline** (LoRA/PEFT) | 🟡 P1 | 6-8 weeks | ✅ DONE — `services/fine-tuning-pipeline` (4776); orchestrator with 5 methods, 7 base models, GPU-queue dispatch, checkpoint tracking. Real training still requires GPU infra. |
| 11 | **Continuous Learning** (closed-loop from agent feedback) | 🟢 P2 | 8-12 weeks | ⚪ OPEN |
| 12 | **Real model serving** (vLLM/Triton/TGI for open models) | 🟡 P1 | 6-8 weeks | ⚪ OPEN |
| 13 | **RLHF/RLAIF Pipeline** | 🟢 P2 | 8-12 weeks | ⚪ OPEN |
| 14 | **GPU Cluster Management** | 🟡 P1 | ongoing | ✅ DONE — `services/gpu-cluster-manager` (4778); 7-GPU catalog, priority scheduling, label matching, live stats. Real cluster still requires physical/cloud GPUs. |
| 15 | **Synthetic Data Generation** | 🟢 P2 | 4-6 weeks | ✅ DONE — `services/synthetic-data-generation` (4777); 5 domain banks, schema + seed-set modes, deterministic generation. Real LLM-backed generation still requires an inference target. |
| 16 | **Knowledge Distillation** | 🟢 P2 | 6-8 weeks | ⚪ OPEN |
| 17 | **Domain-Specific Models** (healthcare, legal, finance) | 🟢 P2 | 12+ weeks each | ⚪ OPEN |
| 18 | **Bias Evaluation** | 🟢 P2 | 4-6 weeks | ⚪ OPEN |
| 19 | **Multimodal Models** | 🟢 P3 | 12+ weeks | ⚪ OPEN |
| 20 | **Distributed Training infra** | 🟢 P3 | 12+ weeks | ⚪ OPEN |
| 21 | **HOJAI Foundation Model** | 🔴 P3 (long-term) | 5 years, $50M+ — partner, don't build alone | ⚪ OPEN |

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

*See also: [./services/ai-intelligence/CLAUDE.md](../services/ai-intelligence/CLAUDE.md) (consumer), [companies/HOJAI-AI-restored/hojai-intelligence/CLAUDE.md](../../HOJAI-AI-restored/hojai-intelligence/CLAUDE.md) (recovered consumer with OpenAI dep)*