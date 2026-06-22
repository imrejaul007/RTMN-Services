# SUTAR OS - Complete Services Documentation

**Version:** 2.0 | **Date:** 2026-06-13
**Status:** ✅ Production Ready - All 25 Services Built

---

## Overview

SUTAR OS is **Autonomous Economic Infrastructure** — powered by **25 microservices** enabling AI agents to autonomously find, evaluate, hire, negotiate, contract, and transact with each other.

---

## All Services (25 Total)

| Service | Port | Description | Layer |
|---------|------|-------------|-------|
| **sutar-gateway** | 4140 | SUTAR OS Main API Gateway | Gateway |
| **sutar-twin-os** | 4142 | Digital Twin OS - Entity state management | Twin & Memory |
| **sutar-memory-bridge** | 4143 | Memory Bridge - HOJAI Memory integration | Twin & Memory |
| **sutar-agent-id** | 4146 | Agent Identity Service | Twin & Memory |
| **sutar-identity-os** | 4147 | Identity OS - Agent identity and verification | Twin & Memory |
| **sutar-intent-bus** | 4154 | Intent Bus - Intent routing and management | Intent & Agent |
| **sutar-agent-network** | 4155 | Agent Network - Agent registry and discovery | Intent & Agent |
| **sutar-decision-engine** | 4240 | Decision Engine - Policy and risk evaluation | Decision |
| **sutar-simulation-os** | 4241 | Simulation OS - What-if analysis | Decision |
| **sutar-goal-os** | 4242 | Goal OS - Goal decomposition | Decision |
| **sutar-network-learning** | 4243 | Network Learning - Collective intelligence | Decision |
| **sutar-flow-os** | 4244 | Flow OS - Workflow orchestration | Decision |
| **sutar-marketplace** | 4250 | Marketplace - Agent & capability marketplace | Marketplace |
| **sutar-economy-os** | 4251 | Economy OS - Economic flow management | Marketplace |
| **sutar-usage-tracker** | 4253 | Usage Tracker - Resource usage monitoring | Marketplace |
| **sutar-policy-os** | 4254 | Policy OS - Policy management | Marketplace |
| **sutar-trust-engine** | 4180 | Trust Engine - Trust score verification | Trust & Compliance |
| **sutar-contract-os** | 4190 | Contract OS - Smart contract management | Trust & Compliance |
| **sutar-negotiation-engine** | 4191 | Negotiation Engine - RFQ and counter-offer | Trust & Compliance |
| **sutar-monitoring** | 3100 | Monitoring - System health and metrics | Monitoring |
| **sutar-exploration-engine** | 4255 | Exploration Engine - New opportunity discovery | Discovery & Analysis |
| **sutar-discovery-engine** | 4256 | Discovery Engine - Agent and service discovery | Discovery & Analysis |
| **sutar-multi-agent-evaluator** | 4257 | Multi-Agent Evaluator - Compare agent capabilities | Discovery & Analysis |
| **sutar-reputation-aggregator** | 4258 | Reputation Aggregator - Trust and reputation scoring | Discovery & Analysis |
| **sutar-roi-calculator** | 4259 | ROI Calculator - Return on investment analysis | Discovery & Analysis |

---

## Gateway Layer

| Service | Port | Features |
|---------|------|----------|
| sutar-gateway | 4140 | Request routing, Authentication, Rate limiting... |

## Twin & Memory Layer

| Service | Port | Features |
|---------|------|----------|
| sutar-twin-os | 4142 | Entity creation, State tracking, Change history... |
| sutar-memory-bridge | 4143 | Context storage, Retrieval, Vector search... |
| sutar-agent-id | 4146 | Agent registration, Identity verification, Capability declaration... |
| sutar-identity-os | 4147 | Identity verification, KYC, Credential management... |

## Intent & Agent Layer

| Service | Port | Features |
|---------|------|----------|
| sutar-intent-bus | 4154 | Intent capture, Pattern recognition, Context enrichment... |
| sutar-agent-network | 4155 | Agent registry, Capability matching, Location filtering... |

## Decision Layer

| Service | Port | Features |
|---------|------|----------|
| sutar-decision-engine | 4240 | Policy check, Risk assessment, Authorization... |
| sutar-simulation-os | 4241 | Scenario testing, Impact prediction, Confidence scoring... |
| sutar-goal-os | 4242 | Goal decomposition, Sub-goal generation, Prioritization... |
| sutar-network-learning | 4243 | Pattern learning, Success analysis, Strategy extraction... |
| sutar-flow-os | 4244 | Step sequencing, Dependency management, Parallel execution... |

## Marketplace Layer

| Service | Port | Features |
|---------|------|----------|
| sutar-marketplace | 4250 | Service listing, Capability search, Pricing... |
| sutar-economy-os | 4251 | Transaction tracking, Balance management, Payment routing... |
| sutar-usage-tracker | 4253 | API usage, Resource metering, Cost calculation... |
| sutar-policy-os | 4254 | Policy CRUD, Versioning, Validation... |

## Trust & Compliance Layer

| Service | Port | Features |
|---------|------|----------|
| sutar-trust-engine | 4180 | Credit check, Trust validation, Payment history... |
| sutar-contract-os | 4190 | Contract generation, Digital signatures, Terms management... |
| sutar-negotiation-engine | 4191 | RFQ processing, Quote management, Counter-offers... |

## Discovery & Analysis Layer

| Service | Port | Features |
|---------|------|----------|
| sutar-exploration-engine | 4255 | Market scanning, Opportunity identification, Trend analysis... |
| sutar-discovery-engine | 4256 | Search, Filtering, Ranking... |
| sutar-multi-agent-evaluator | 4257 | Capability comparison, Performance scoring, Selection recommendation... |
| sutar-reputation-aggregator | 4258 | Review aggregation, Reputation scoring, Trust calculation... |
| sutar-roi-calculator | 4259 | Cost analysis, Benefit calculation, ROI projection... |

## Monitoring Layer

| Service | Port | Features |
|---------|------|----------|
| sutar-monitoring | 3100 | Health checks, Metrics collection, Alerting... |

