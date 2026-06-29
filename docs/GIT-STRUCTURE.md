# RTMN Git Structure

## Repositories

| Repo | Local Path | Remote | Branch |
|------|------------|----|-------|
| RTMN-Services | `/RTMN/` | github.com/imrejaul007/RTMN-Services | docs/genie-phase-a-complete |
| HOJAI-AI | `/RTMN/companies/HOJAI-AI/` | github.com/imrejaul007/hojai-ai | feat/killer-30min-demo |
| Nexha | `/RTMN/companies/Nexha/` | github.com/imrejaul007/nexha | main |

## Pushing Changes

### 1. HOJAI-AI changes (ALWAYS do this first):
```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
git add -A
git commit -m "message"
git push origin feat/killer-30min-demo
```

### 2. Then update RTMN submodule reference:
```bash
cd /Users/rejaulkarim/Documents/RTMN
git add companies/HOJAI-AI
git commit -m "chore: Update HOJAI-AI submodule"
git push origin docs/genie-phase-a-complete
```

## Services Built (June 29, 2026)

### EmotionOS (8 services) - in HOJAI-AI
- voice-emotion-detection (4760)
- emotional-memory (4761)
- empathy-response-engine (4762)
- emotion-analytics (4763)
- emotional-journey (4764)
- emotion-alerts (4765)
- cross-modal-emotion (4766)
- tone-analysis (4767)

### PresenceOS (1 service) - in HOJAI-AI
- human-presence (4880)

### VoiceOS Pipeline (10 services) - in HOJAI-AI
- voice-identity-bridge (4885)
- voice-twin-retriever (4886)
- voice-memory-router (4887)
- voice-relationship-graph (4888)
- voice-action-router (4889)
- meeting-intelligence (4890)
- voice-analytics-dashboard (4891)
- company-voice-profiles (4892)
- brand-voice-templates (4893)

### TrustOS (10 services) - in HOJAI-AI
- confidence-scorer (4990)
- source-tracker (4991)
- evidence-collector (4992)
- verification-engine (4993)
- hallucination-detector (4994)
- risk-scorer (4995)
- trust-semantic-cache (4996)
- trust-audit-trail (4997)
- trust-policy-engine (4998)
- federated-trust (4999)

### KnowledgeOS (4 services) - in HOJAI-AI
- persistent-graph-store (4750)
- ontology-engine (4751)
- entity-resolution (4752)
- reasoning-engine (4753)

### Task Engine (7 services) - in HOJAI-AI
- task-assignment-engine (4290)
- task-extraction-engine (4291)
- action-orchestrator (4292)
- goal-task-linker (4293)
- deadline-tracker (4294)
- task-reminders (4295)
- escalation-engine (4296)

## Current Status (June 29, 2026)
- HOJAI-AI: ALL CLEAN ✅
- RTMN: ALL CLEAN ✅
- All 40+ new services built and committed
