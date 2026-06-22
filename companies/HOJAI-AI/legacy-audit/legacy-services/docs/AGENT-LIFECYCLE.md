# HOJAI AGENT LIFECYCLE SPECIFICATION
**Version:** 1.0 | **Date:** May 29, 2026 | **Status:** ARCHITECTURE SPEC

---

## Executive Summary

**Agent Lifecycle** defines how AI employees are created, trained, deployed, monitored, and retired.

Today it's conceptual. This document makes it concrete.

**Key Components:**
- Agent Registry
- Agent Versioning
- Agent Deployment
- Agent Evaluation
- Agent Monitoring
- Agent Rollback

---

## Agent Lifecycle States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AGENT LIFECYCLE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   ┌────────┐ │
│  │ DESIGN  │───▶│  TRAIN  │───▶│ DEPLOY  │───▶│ MONITOR │───▶│ RETIRE │ │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘   └────────┘ │
│                                                                             │
│     │              │              │              │                        │
│     ▼              ▼              ▼              ▼                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│  │ Define  │  │  Build  │  │ Staged  │  │  Live   │               │
│  │ Purpose │  │ Model   │  │ Rollout │  │ Traffic │               │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Agent States

```typescript
type AgentState = 
  | 'draft'           // Being designed
  | 'training'        // Model being trained
  | 'testing'         // In testing/evaluation
  | 'staged'          // Ready, waiting for rollout
  | 'active'          // Handling live traffic
  | 'paused'          // Temporarily disabled
  | 'superseded'       // Replaced by newer version
  | 'retired';        // Permanently disabled

interface AgentLifecycleState {
  agent_id: string;
  state: AgentState;
  
  // State-specific data
  state_data: {
    // For 'training'
    training_job_id?: string;
    training_progress?: number;
    estimated_completion?: Date;
    
    // For 'testing'
    test_results?: TestResults;
    test_traffic_percentage?: number;
    
    // For 'staged'
    rollout_schedule?: Date;
    
    // For 'active'
    live_since?: Date;
    traffic_percentage?: number;
    
    // For 'superseded'
    superseded_by?: string;
    superseded_at?: Date;
    
    // For 'retired'
    retirement_reason?: string;
    archived_data?: boolean;
  };
  
  // Timestamps
  entered_state_at: Date;
  previous_state?: AgentState;
}
```

---

## Stage 1: Agent Design

### 1.1 Define Agent Purpose

```typescript
interface AgentDesign {
  // Identity
  name: string;                  // "XYZ Support Agent"
  title?: string;                // "Customer Support Specialist"
  description: string;
  
  // Purpose
  type: AgentType;
  primary_use_case: string;
  success_metrics: SuccessMetric[];
  
  // Capabilities
  capabilities: Capability[];
  limitations: string[];
  
  // Behavior
  personality: AgentPersonality;
  
  // Knowledge
  knowledge_domains: string[];
  required_integrations: string[];
  
  // Audience
  target_customers: 'new' | 'existing' | 'all';
  
  // Compliance
  required_approvals: string[];   // 'refunds', 'discounts'
  restricted_actions: string[];
}

type AgentType = 
  | 'support'           // Customer support
  | 'sales'             // Drive conversions
  | 'booking'           // Reservations
  | 'marketing'         // Campaigns
  | 'retention'         // Win-back
  | 'fulfillment';      // Order management

interface SuccessMetric {
  name: string;               // "Resolution Rate"
  target: number;             // 0.85 (85%)
  measurement_period: string;  // "per_month"
}

interface Capability {
  name: string;               // "answer_faq"
  description: string;
  enabled: boolean;
  config?: Record<string, any>;
}

interface AgentPersonality {
  tone: 'formal' | 'friendly' | 'casual';
  language: string[];        // ['en', 'hi']
  use_emoji: boolean;
  traits: string[];           // ['patient', 'helpful']
  greeting_template: string;
  closing_template: string;
}
```

---

### 1.2 Create Agent Template

```typescript
interface AgentTemplate {
  id: string;
  type: AgentType;
  
  // Pre-configured
  default_capabilities: Capability[];
  default_personality: AgentPersonality;
  default_workflow: string;
  
  // Training data
  training_data_template: string[];
  evaluation_questions: string[];
  
  // Industry-specific
  industry: string;           // 'retail', 'healthcare'
  use_cases: string[];
}
```

---

## Stage 2: Agent Training

### 2.1 Training Pipeline

```typescript
interface TrainingPipeline {
  agent_id: string;
  
  // Training configuration
  config: TrainingConfig;
  
  // Training data
  data_sources: DataSource[];
  
  // Pipeline stages
  stages: TrainingStage[];
  
  // Progress
  current_stage: number;
  progress_percent: number;
  
  // Results
  results?: TrainingResults;
}

interface TrainingConfig {
  // Model
  model_type: 'fine_tune' | 'rag' | 'hybrid';
  base_model: string;          // 'gpt-4', 'claude-3'
  
  // Parameters
  temperature: number;
  max_tokens: number;
  
  // Training settings
  epochs: number;
  batch_size: number;
  learning_rate: number;
  
  // Validation
  validation_split: number;     // 0.2
  test_split: number;          // 0.1
}

interface DataSource {
  type: 'knowledge_base' | 'conversation_history' | 'product_catalog' | 'custom';
  source_id: string;
  filter?: string;
  weight: number;              // Importance weight
}

interface TrainingStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: Date;
  completed_at?: Date;
  output?: any;
  error?: string;
}
```

---

### 2.2 Training Jobs

```typescript
interface TrainingJob {
  id: string;
  agent_id: string;
  
  // Status
  status: TrainingJobStatus;
  
  // Configuration
  config: TrainingConfig;
  data_sources: DataSource[];
  
  // Progress
  progress: {
    current_epoch: number;
    total_epochs: number;
    current_stage: string;
    metrics: Record<string, number>;
  };
  
  // Timing
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  estimated_time_remaining?: number; // minutes
  
  // Results
  results?: TrainingResults;
  
  // Costs
  compute_cost?: number;
  training_cost?: number;
}

type TrainingJobStatus = 
  | 'queued'
  | 'preparing'
  | 'training'
  | 'evaluating'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

---

### 2.3 Training Results

```typescript
interface TrainingResults {
  // Overall quality
  quality_score: number;         // 0-100
  
  // Metrics
  metrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
    response_time_ms: number;
  };
  
  // Evaluation
  evaluation: {
    total_questions: number;
    correct_answers: number;
    avg_score: number;
    scores_by_category: Record<string, number>;
  };
  
  // Benchmark comparison
  benchmarks: {
    vs_previous_version?: number;  // Improvement %
    vs_template?: number;
  };
  
  // Issues
  issues: {
    type: 'bias' | 'incorrect' | 'slow' | 'unsafe';
    severity: 'low' | 'medium' | 'high';
    count: number;
    examples: string[];
  }[];
}
```

---

## Stage 3: Agent Evaluation

### 3.1 Evaluation Framework

```typescript
interface AgentEvaluation {
  id: string;
  agent_id: string;
  
  // Evaluation type
  type: 'automatic' | 'manual' | 'production';
  
  // Test cases
  test_cases: TestCase[];
  
  // Results
  results: EvaluationResults;
  
  // Decision
  decision: 'approved' | 'needs_work' | 'rejected';
  decision_reason?: string;
  
  // Timing
  created_at: Date;
  completed_at?: Date;
  decided_by?: string;        // User ID or 'system'
}

interface TestCase {
  id: string;
  category: string;
  
  // Input
  input: {
    type: 'query' | 'scenario';
    content: string;
  };
  
  // Expected
  expected: {
    response_contains?: string[];
    response_type?: 'informative' | 'action' | 'escalation';
    action_type?: string;
  };
  
  // Weight (importance)
  weight: number;             // 1-10
  
  // Actual result (filled after evaluation)
  actual?: {
    response: string;
    passed: boolean;
    score: number;
    feedback?: string;
  };
}
```

---

### 3.2 Evaluation Metrics

```typescript
interface EvaluationMetrics {
  // Accuracy
  accuracy: number;            // % of test cases passed
  
  // Quality
  quality: {
    helpfulness: number;       // 1-5
    relevance: number;         // 1-5
    clarity: number;            // 1-5
    safety: number;            // 1-5
  };
  
  // Behavior
  behavior: {
    escalation_rate: number;  // How often escalates
    avg_response_time: number; // ms
    task_completion_rate: number;
  };
  
  // Compliance
  compliance: {
    policy_violations: number;
    required_approvals_followed: number;
    restricted_actions_blocked: number;
  };
  
  // Comparison
  vs_previous: {
    quality_improvement: number;
    response_time_change: number;
  };
}
```

---

### 3.3 Approval Workflow

```typescript
interface ApprovalWorkflow {
  id: string;
  agent_id: string;
  
  // Required approvals
  required_approvers: {
    type: 'auto' | 'human';
    role?: string;           // For human: 'admin', 'manager'
    auto_criteria?: {
      min_quality_score: number;
      max_issues: number;
    };
  }[];
  
  // Current status
  approvals: {
    approver_id: string;
    approver_type: 'auto' | 'human';
    status: 'pending' | 'approved' | 'rejected';
    decision_at?: Date;
    feedback?: string;
  }[];
  
  // Final decision
  final_decision: 'approved' | 'rejected' | 'needs_changes';
  decided_at?: Date;
}
```

---

## Stage 4: Agent Deployment

### 4.1 Deployment Configuration

```typescript
interface DeploymentConfig {
  agent_id: string;
  version: string;
  
  // Traffic allocation
  traffic: {
    type: 'all' | 'percentage' | 'segment';
    percentage?: number;       // 0-100
    segment?: string;          // Segment ID
  };
  
  // Schedule
  schedule: {
    type: 'immediate' | 'scheduled' | 'gradual';
    start_time?: Date;
    gradual_increase?: {
      initial_percentage: number;
      increment_by: number;
      interval_minutes: number;
    };
  };
  
  // Channels
  channels: {
    channel: 'whatsapp' | 'webchat' | 'instagram';
    enabled: boolean;
    config?: Record<string, any>;
  }[];
  
  // Fallback
  fallback: {
    type: 'human' | 'different_agent' | 'message';
    target?: string;
    message?: string;
  };
}
```

---

### 4.2 Deployment States

```typescript
interface DeploymentState {
  agent_id: string;
  version: string;
  
  // Deployment status
  status: DeploymentStatus;
  
  // Traffic
  traffic: {
    current_percentage: number;
    max_percentage: number;
    increment_progress?: {
      last_increased_at: Date;
      next_increase_at: Date;
    };
  };
  
  // Health
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    last_check_at: Date;
  };
  
  // Timing
  deployed_at?: Date;
  last_updated_at?: Date;
}

type DeploymentStatus = 
  | 'staged'           // Waiting for deployment
  | 'rolling_out'      // Gradual rollout in progress
  | 'full'             // 100% traffic
  | 'paused'           // Paused mid-rollout
  | 'rolled_back'      // Rolled back to previous version
  | 'terminated';      // Deployment ended
```

---

### 4.3 Gradual Rollout

```typescript
interface GradualRollout {
  // Configuration
  config: {
    initial_percentage: number;     // 5
    max_percentage: number;        // 100
    increment_by: number;           // 10
    interval_minutes: number;       // 30
    auto_increase: boolean;
  };
  
  // Automatic conditions
  auto_increase_conditions: {
    min_success_rate: number;      // 0.95
    max_error_rate: number;        // 0.02
    min_csat_score?: number;      // 4.0
    monitoring_period_minutes: number; // 30
  };
  
  // Auto rollback conditions
  auto_rollback_conditions: {
    max_error_rate: number;        // 0.05
    max_latency_ms: number;        // 5000
    min_success_rate: number;      // 0.90
  };
  
  // Progress
  progress: {
    current_percentage: number;
    status: 'increasing' | 'stable' | 'rollback';
    
    // History
    checkpoints: {
      percentage: number;
      reached_at: Date;
      metrics: HealthMetrics;
    }[];
    
    // Next
    next_increase_at?: Date;
  };
}
```

---

## Stage 5: Agent Monitoring

### 5.1 Monitoring Metrics

```typescript
interface AgentMonitoringMetrics {
  agent_id: string;
  version: string;
  
  // Time period
  period: {
    start: Date;
    end: Date;
  };
  
  // Volume
  volume: {
    total_conversations: number;
    conversations_by_channel: Record<string, number>;
    messages_per_conversation: number;
  };
  
  // Performance
  performance: {
    avg_response_time_ms: number;
    p95_response_time_ms: number;
    p99_response_time_ms: number;
    
    // Resolution
    resolution_rate: number;     // Conversations resolved by AI
    escalation_rate: number;      // Escalated to human
    drop_rate: number;           // Abandoned conversations
    
    // Task completion
    task_completion_rate: number;
    avg_tasks_per_conversation: number;
  };
  
  // Quality
  quality: {
    avg_csat_score: number;     // 1-5
    csat_distribution: Record<number, number>;
    helpfulness_score: number;
    
    // Accuracy
    accuracy_score: number;
    policy_violation_rate: number;
    incorrect_response_rate: number;
  };
  
  // Safety
  safety: {
    sensitive_topic_handling_rate: number;
    approval_required_correct_rate: number;
    restricted_action_block_rate: number;
  };
}
```

---

### 5.2 Health Checks

```typescript
interface AgentHealthCheck {
  agent_id: string;
  version: string;
  
  // Check results
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  // Metrics
  metrics: {
    error_rate: number;
    avg_latency_ms: number;
    success_rate: number;
    availability: number;        // Uptime percentage
  };
  
  // Alerts
  alerts: {
    type: AlertType;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    triggered_at: Date;
    resolved_at?: Date;
  }[];
  
  // Checks
  checks: {
    latency_check: { status: 'pass' | 'fail'; value: number };
    error_rate_check: { status: 'pass' | 'fail'; value: number };
    availability_check: { status: 'pass' | 'fail'; value: number };
    quality_check: { status: 'pass' | 'fail'; value: number };
  };
  
  // Timestamp
  checked_at: Date;
}

type AlertType = 
  | 'high_error_rate'
  | 'high_latency'
  | 'low_csat'
  | 'policy_violation'
  | 'unusual_pattern';
```

---

### 5.3 Continuous Monitoring

```typescript
interface ContinuousMonitoring {
  // Configuration
  config: {
    // Thresholds
    error_rate_threshold: number;     // 0.05
    latency_p99_threshold_ms: number; // 3000
    csat_min_threshold: number;       // 3.5
    resolution_rate_min: number;       // 0.70
    
    // Alerts
    alert_channels: string[];        // ['slack', 'email']
    alert_conditions: AlertCondition[];
  };
  
  // Active monitoring
  active: {
    metrics: LiveMetrics;
    alerts: ActiveAlert[];
    recent_events: MonitoringEvent[];
  };
}

interface AlertCondition {
  type: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq';
  threshold: number;
  duration_minutes: number;           // Must be breached for X minutes
}
```

---

## Stage 6: Agent Rollback

### 6.1 Rollback Triggers

```typescript
interface RollbackTrigger {
  type: 'manual' | 'automatic';
  
  // For automatic
  conditions?: {
    error_rate_breach_minutes: number;
    latency_breach_minutes: number;
    csat_drop_minutes: number;
    policy_violations_detected: number;
  };
  
  // For manual
  reason?: string;
  initiated_by?: string;
}

interface RollbackDecision {
  decision_id: string;
  agent_id: string;
  
  // From/To
  from_version: string;
  to_version: string;
  
  // Trigger
  trigger: RollbackTrigger;
  
  // Impact
  impact: {
    conversations_in_progress: number;
    affected_users: number;
    rollback_duration_seconds: number;
  };
  
  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  
  // Execution
  executed_at?: Date;
  completed_at?: Date;
}
```

---

### 6.2 Rollback Process

```typescript
async function performRollback(rollback: RollbackDecision) {
  // 1. Prepare new version
  await prepareVersion(rollback.to_version);
  
  // 2. Drain in-progress conversations
  await drainConversations(rollback.agent_id);
  
  // 3. Switch traffic to previous version
  await switchTraffic(rollback.agent_id, rollback.to_version);
  
  // 4. Update monitoring
  await updateMonitoring(rollback.agent_id, rollback.to_version);
  
  // 5. Notify team
  await notifyTeam(rollback);
  
  // 6. Create incident report
  await createIncidentReport(rollback);
}
```

---

## Stage 7: Agent Retirement

### 7.1 Retirement Process

```typescript
interface RetirementRequest {
  agent_id: string;
  
  // Reason
  reason: 'superseded' | 'performance' | 'business' | 'compliance';
  description: string;
  
  // Replacement
  replaced_by?: string;           // New agent ID
  redirect_workflows?: string[];  // Workflow IDs to update
  
  // Data handling
  data_handling: {
    archive_conversations: boolean;
    archive_metrics: boolean;
    delete_pii: boolean;
    retention_days: number;        // Days before final deletion
  };
  
  // Timeline
  timeline: {
    communication_date?: Date;    // When to notify customers
    graceful_period_days: number;  // Days to wind down
    final_shutdown_date: Date;
  };
  
  // Approval
  approved_by?: string;
  approved_at?: Date;
}
```

---

### 7.2 Retirement States

```typescript
interface AgentRetirement {
  agent_id: string;
  
  // Status
  status: 'requested' | 'approved' | 'communicating' | 'winding_down' | 'archived';
  
  // Timeline
  timeline: {
    requested_at: Date;
    approved_at?: Date;
    communication_sent_at?: Date;
    graceful_period_ends_at?: Date;
    archived_at?: Date;
  };
  
  // Data
  data: {
    conversations_archived: number;
    metrics_archived: boolean;
    pii_deleted: boolean;
    archive_location?: string;      // Where data is stored
  };
  
  // Post-retirement
  post_retirement: {
    is_available_for_restore: boolean;
    restore_expires_at?: Date;
  };
}
```

---

## Agent Registry

### Registry Entry

```typescript
interface AgentRegistryEntry {
  // Identity
  id: string;
  tenant_id: string;
  
  // Current state
  current_state: AgentLifecycleState;
  
  // Versions
  versions: AgentVersion[];
  
  // Current version
  active_version: string;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  last_deployed_at?: Date;
}

interface AgentVersion {
  version: string;              // Semantic: '1.0.0'
  
  // State
  state: AgentState;
  
  // Training
  training?: {
    job_id: string;
    results?: TrainingResults;
  };
  
  // Evaluation
  evaluation?: {
    evaluation_id: string;
    results?: EvaluationResults;
    approval?: ApprovalWorkflow;
  };
  
  // Deployment
  deployment?: {
    config: DeploymentConfig;
    state: DeploymentState;
    health: AgentHealthCheck;
  };
  
  // Monitoring
  monitoring?: {
    current_metrics: AgentMonitoringMetrics;
    alerts: Alert[];
  };
  
  // Timestamps
  created_at: Date;
  deployed_at?: Date;
  retired_at?: Date;
}
```

---

## API Endpoints

### Agent Management

```
# Create
POST   /api/agents                        - Create new agent
GET    /api/agents                        - List agents
GET    /api/agents/:id                    - Get agent
PUT    /api/agents/:id                    - Update agent
DELETE /api/agents/:id                    - Archive agent

# Versions
GET    /api/agents/:id/versions           - List versions
POST   /api/agents/:id/versions           - Create new version
GET    /api/agents/:id/versions/:version  - Get specific version
```

### Training

```
POST   /api/agents/:id/train               - Start training
GET    /api/agents/:id/training/:jobId    - Get training job
POST   /api/agents/:id/training/:jobId/cancel - Cancel training
```

### Evaluation

```
POST   /api/agents/:id/evaluate           - Run evaluation
GET    /api/agents/:id/evaluation/:id     - Get evaluation
POST   /api/agents/:id/approve            - Approve agent
POST   /api/agents/:id/reject              - Reject agent
```

### Deployment

```
POST   /api/agents/:id/deploy              - Deploy agent
POST   /api/agents/:id/rollback           - Rollback agent
POST   /api/agents/:id/pause              - Pause agent
POST   /api/agents/:id/resume             - Resume agent
```

### Monitoring

```
GET    /api/agents/:id/metrics             - Get metrics
GET    /api/agents/:id/health              - Get health status
GET    /api/agents/:id/alerts             - Get alerts
POST   /api/agents/:id/alerts/:alertId/resolve - Resolve alert
```

### Retirement

```
POST   /api/agents/:id/retire             - Request retirement
POST   /api/agents/:id/restore            - Restore retired agent
```

---

## Document Version

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | May 29, 2026 | Hojai AI | Initial spec |

---

*This is the Hojai Agent Lifecycle Specification.*
