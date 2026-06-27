# FlowOS Duplicate Audit Report
## June 27, 2026

## Already Built (DO NOT REBUILD)
- Workflow Twin: `platform/twins/workflow-twin/` (port 4741)
- SimulationOS: `platform/sutar-os/core/simulation-os/` (port 4874)
- Cost Tracker: `services/cost-tracker/` (port 4410)
- Approval OS: `nexha/services/nexha-approval-os/` (port 4390)
- Observability OS: `nexha/services/nexha-observability-os/` (port 4363)

## Must Build NEW
- Event Sourcing Engine (port 5370)
- Saga Coordinator (port 5371)
- BPMN Parser (port 5372)
- Connector Registry (port 5374)
- Webhook Router (port 5375)
- LangGraph Bridge (port 5379)
- CrewAI Bridge (port 5380)
- AutoGen Bridge (port 5381)
- Workflow Designer UI

## Enhance Existing
- execution-engine: Add Checkpointing, Exactly-Once

## Integration Work
- Connect flow-orchestrator -> existing services
- Connect execution-engine -> cost-tracker
