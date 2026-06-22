/**
 * Loop Orchestrator Module
 *
 * Orchestrates the full Inventory → Reorder closed loop flow.
 * Handles failures, routes to approval when needed, and manages the
 * end-to-end lifecycle of reorder events.
 *
 * Flow:
 * 1. Receive inventory.low event from Event Platform
 * 2. Process intent through Intent Graph
 * 3. Make decision through Action Engine
 * 4. Execute: Create draft PO or auto-approve
 * 5. Wait for merchant approval (if required)
 * 6. Record feedback
 * 7. Trigger learning update
 */

import { v4 as uuidv4 } from 'uuid';
import { InventoryLowEvent } from './emitter';

// ============================================================================
// Types
// ============================================================================

export enum LoopState {
  INITIALIZED = 'initialized',
  INTENT_PROCESSING = 'intent_processing',
  ACTION_DECIDING = 'action_deciding',
  EXECUTING = 'executing',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ActionDecision {
  AUTO_APPROVE = 'auto_approve',
  DRAFT_FOR_APPROVAL = 'draft_for_approval',
  SKIP = 'skip',
  MANUAL_REVIEW = 'manual_review',
}

export interface LoopContext {
  loopId: string;
  correlationId: string;
  tenantId: string;
  state: LoopState;
  event: InventoryLowEvent;
  intent?: ProcessedIntent;
  decision?: ActionDecision;
  draftOrderId?: string;
  approvalUrl?: string;
  error?: string;
  timestamps: {
    started: string;
    intentProcessed?: string;
    actionDecided?: string;
    executed?: string;
    approved?: string;
    completed?: string;
    failed?: string;
  };
  retryCount: number;
}

export interface ProcessedIntent {
  intentId: string;
  type: 'reorder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  suggestedQuantity: number;
  supplierId: string;
  estimatedCost: number;
  leadTimeDays: number;
  confidence: number;
}

export interface ActionResult {
  decision: ActionDecision;
  reason: string;
  autoApprove: boolean;
  draftOrderId?: string;
  approvalUrl?: string;
}

export interface ExecutionResult {
  success: boolean;
  draftOrderId?: string;
  approvalUrl?: string;
  error?: string;
}

export interface FeedbackResult {
  success: boolean;
  feedbackId?: string;
  error?: string;
}

export interface OrchestratorConfig {
  intentGraphUrl: string;
  actionEngineUrl: string;
  nextaBizUrl: string;
  nextaBizApiKey: string;
  feedbackServiceUrl: string;
  feedbackServiceToken: string;
  adaptiveAgentUrl: string;
  loopTimeoutMs: number;
  maxRetries: number;
  onStateChange?: (context: LoopContext) => void;
  onError?: (context: LoopContext, error: Error) => void;
  onCompletion?: (context: LoopContext) => void;
}

// ============================================================================
// Service Clients
// ============================================================================

class IntentGraphClient {
  constructor(private readonly url: string) {}

  async processIntent(
    event: InventoryLowEvent,
    correlationId: string
  ): Promise<ProcessedIntent> {
    // In production, this would be a gRPC call
    const response = await fetch(`${this.url}/api/v1/intents/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify({
        eventType: event.eventType,
        payload: event.payload,
        tenantId: event.tenantId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Intent Graph failed: ${response.status}`);
    }

    return response.json();
  }
}

class ActionEngineClient {
  constructor(private readonly url: string) {}

  async decideAction(
    intent: ProcessedIntent,
    tenantId: string,
    correlationId: string
  ): Promise<ActionResult> {
    // In production, this would be a gRPC call
    const response = await fetch(`${this.url}/api/v1/actions/decide`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify({
        intent,
        tenantId,
        policyContext: {
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Action Engine failed: ${response.status}`);
    }

    return response.json();
  }
}

class NextaBizClient {
  constructor(
    private readonly url: string,
    private readonly apiKey: string
  ) {}

  async createDraftOrder(
    intent: ProcessedIntent,
    correlationId: string
  ): Promise<ExecutionResult> {
    const response = await fetch(`${this.url}/api/v1/procurement/draft-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify({
        supplierId: intent.supplierId,
        lineItems: [
          {
            productId: intent.intentId,
            quantity: intent.suggestedQuantity,
            metadata: {
              leadTimeDays: intent.leadTimeDays,
            },
          },
        ],
        metadata: {
          trigger: 'inventory.low',
          intentId: intent.intentId,
          priority: intent.priority,
        },
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `NextaBiZ failed: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      draftOrderId: data.draftOrderId,
      approvalUrl: data.approvalUrl,
    };
  }
}

class FeedbackServiceClient {
  constructor(
    private readonly url: string,
    private readonly token: string
  ) {}

  async recordOutcome(
    context: LoopContext,
    outcome: 'approved' | 'rejected' | 'modified',
    merchantFeedback?: string
  ): Promise<FeedbackResult> {
    const response = await fetch(`${this.url}/api/v1/feedback/loop-outcomes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        'X-Correlation-ID': context.correlationId,
      },
      body: JSON.stringify({
        loopId: context.loopId,
        correlationId: context.correlationId,
        intentId: context.intent?.intentId,
        draftOrderId: context.draftOrderId,
        outcome,
        tenantId: context.tenantId,
        merchantFeedback,
        timestamps: context.timestamps,
        durationMs: new Date(context.timestamps.completed!).getTime() -
          new Date(context.timestamps.started).getTime(),
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Feedback Service failed: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      feedbackId: data.feedbackId,
    };
  }
}

class AdaptiveAgentClient {
  constructor(private readonly url: string) {}

  async updateModel(
    context: LoopContext,
    outcome: 'approved' | 'rejected' | 'modified'
  ): Promise<void> {
    // In production, this would be a gRPC call
    await fetch(`${this.url}/api/v1/agent/update-model`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType: 'reorder_pattern',
        context: {
          productId: context.event.payload.productId,
          supplierId: context.intent?.supplierId,
          priority: context.intent?.priority,
        },
        outcome: {
          approved: outcome === 'approved',
          modified: outcome === 'modified',
          actualQuantity: context.intent?.suggestedQuantity,
        },
        metadata: {
          loopId: context.loopId,
          tenantId: context.tenantId,
        },
      }),
    });
  }
}

// ============================================================================
// Loop Orchestrator
// ============================================================================

export class LoopOrchestrator {
  private readonly intentGraph: IntentGraphClient;
  private readonly actionEngine: ActionEngineClient;
  private readonly nextaBiz: NextaBizClient;
  private readonly feedbackService: FeedbackServiceClient;
  private readonly adaptiveAgent: AdaptiveAgentClient;
  private readonly config: Required<OrchestratorConfig>;
  private readonly metrics: OrchestratorMetrics;
  private readonly activeLoops: Map<string, LoopContext> = new Map();

  constructor(config: OrchestratorConfig) {
    this.config = {
      loopTimeoutMs: 300000,
      maxRetries: 3,
      onStateChange: () => {},
      onError: () => {},
      onCompletion: () => {},
      ...config,
    };

    this.intentGraph = new IntentGraphClient(config.intentGraphUrl);
    this.actionEngine = new ActionEngineClient(config.actionEngineUrl);
    this.nextaBiz = new NextaBizClient(config.nextaBizUrl, config.nextaBizApiKey);
    this.feedbackService = new FeedbackServiceClient(
      config.feedbackServiceUrl,
      config.feedbackServiceToken
    );
    this.adaptiveAgent = new AdaptiveAgentClient(config.adaptiveAgentUrl);

    this.metrics = {
      loopsStarted: 0,
      loopsCompleted: 0,
      loopsFailed: 0,
      loopsPendingApproval: 0,
      totalDurationMs: 0,
    };
  }

  /**
   * Start processing a new inventory.low event through the loop
   */
  async startLoop(event: InventoryLowEvent): Promise<LoopContext> {
    const loopId = `loop_${uuidv4()}`;
    const correlationId = event.eventId;

    const context: LoopContext = {
      loopId,
      correlationId,
      tenantId: event.tenantId,
      state: LoopState.INITIALIZED,
      event,
      timestamps: {
        started: new Date().toISOString(),
      },
      retryCount: 0,
    };

    this.activeLoops.set(loopId, context);
    this.metrics.loopsStarted++;

    // Execute the loop asynchronously
    this.executeLoop(context).catch((error) => {
      this.config.onError(context, error);
    });

    return context;
  }

  /**
   * Execute the full loop flow with error handling and retries
   */
  private async executeLoop(context: LoopContext): Promise<void> {
    try {
      // Step 1: Process intent through Intent Graph
      await this.processIntent(context);

      // Step 2: Decide action through Action Engine
      await this.decideAction(context);

      // Step 3: Execute based on decision
      await this.executeAction(context);

      // Check if approval is needed
      if (context.decision === ActionDecision.DRAFT_FOR_APPROVAL) {
        context.state = LoopState.PENDING_APPROVAL;
        this.metrics.loopsPendingApproval++;
        this.config.onStateChange(context);

        // Wait for external approval (handled by webhook/callback)
        // For now, mark as pending - actual approval handled via completeLoop()
        return;
      }

      // Auto-approve path
      context.state = LoopState.APPROVED;
      context.timestamps.approved = new Date().toISOString();
      this.config.onStateChange(context);

      // Step 4: Record feedback and trigger learning
      await this.completeWithOutcome(context, 'approved');

    } catch (error) {
      await this.handleFailure(context, error);
    }
  }

  /**
   * Process intent through the Intent Graph
   */
  private async processIntent(context: LoopContext): Promise<void> {
    context.state = LoopState.INTENT_PROCESSING;
    this.config.onStateChange(context);

    const intent = await this.intentGraph.processIntent(
      context.event,
      context.correlationId
    );

    context.intent = intent;
    context.timestamps.intentProcessed = new Date().toISOString();
  }

  /**
   * Decide action through the Action Engine
   */
  private async decideAction(context: LoopContext): Promise<void> {
    if (!context.intent) {
      throw new Error('Intent not processed');
    }

    context.state = LoopState.ACTION_DECIDING;
    this.config.onStateChange(context);

    const result = await this.actionEngine.decideAction(
      context.intent,
      context.tenantId,
      context.correlationId
    );

    context.decision = result.decision;
    context.timestamps.actionDecided = new Date().toISOString();

    // Skip if action engine recommends skipping
    if (result.decision === ActionDecision.SKIP) {
      await this.completeWithOutcome(context, 'rejected');
      return;
    }
  }

  /**
   * Execute the action (create draft or auto-approve)
   */
  private async executeAction(context: LoopContext): Promise<void> {
    if (!context.intent) {
      throw new Error('Intent not available');
    }

    context.state = LoopState.EXECUTING;
    this.config.onStateChange(context);

    if (context.decision === ActionDecision.AUTO_APPROVE) {
      // Create and immediately approve the order
      const result = await this.nextaBiz.createDraftOrder(
        context.intent,
        context.correlationId
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      context.draftOrderId = result.draftOrderId;
      context.approvalUrl = result.approvalUrl;
    } else if (context.decision === ActionDecision.DRAFT_FOR_APPROVAL) {
      // Create draft order for approval
      const result = await this.nextaBiz.createDraftOrder(
        context.intent,
        context.correlationId
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      context.draftOrderId = result.draftOrderId;
      context.approvalUrl = result.approvalUrl;
    }

    context.timestamps.executed = new Date().toISOString();
  }

  /**
   * Complete the loop with the given outcome
   */
  private async completeWithOutcome(
    context: LoopContext,
    outcome: 'approved' | 'rejected' | 'modified',
    merchantFeedback?: string
  ): Promise<void> {
    context.state = outcome === 'rejected' ? LoopState.REJECTED : LoopState.COMPLETED;
    context.timestamps.completed = new Date().toISOString();

    try {
      // Record feedback
      await this.feedbackService.recordOutcome(context, outcome, merchantFeedback);

      // Trigger adaptive learning
      await this.adaptiveAgent.updateModel(context, outcome);

      context.state = LoopState.COMPLETED;
      this.metrics.loopsCompleted++;
      this.metrics.totalDurationMs +=
        new Date(context.timestamps.completed!).getTime() -
        new Date(context.timestamps.started).getTime();

      if (outcome === 'approved' || outcome === 'modified') {
        this.metrics.loopsPendingApproval--;
      }

    } catch (error) {
      // Log but don't fail the loop for feedback errors
      console.error('Failed to record feedback:', error);
    }

    this.config.onCompletion(context);
    this.activeLoops.delete(context.loopId);
  }

  /**
   * Handle failure with retries
   */
  private async handleFailure(
    context: LoopContext,
    error: unknown
  ): Promise<void> {
    context.error = error instanceof Error ? error.message : String(error);
    context.retryCount++;

    if (context.retryCount < this.config.maxRetries) {
      // Retry with exponential backoff
      const delayMs = Math.pow(2, context.retryCount) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Retry the last failed step
      try {
        if (context.state === LoopState.INTENT_PROCESSING) {
          await this.processIntent(context);
        }
        await this.executeLoop(context);
        return;
      } catch (retryError) {
        // Fall through to final failure handling
      }
    }

    context.state = LoopState.FAILED;
    context.timestamps.failed = new Date().toISOString();
    this.metrics.loopsFailed++;
    this.metrics.loopsPendingApproval--;

    this.config.onError(
      context,
      error instanceof Error ? error : new Error(String(error))
    );
    this.activeLoops.delete(context.loopId);
  }

  /**
   * Complete a loop that was pending approval (called via webhook)
   */
  async completeLoop(
    loopId: string,
    outcome: 'approved' | 'rejected' | 'modified',
    merchantFeedback?: string
  ): Promise<LoopContext | null> {
    const context = this.activeLoops.get(loopId);
    if (!context) {
      return null;
    }

    await this.completeWithOutcome(context, outcome, merchantFeedback);
    return context;
  }

  /**
   * Get current status of a loop
   */
  getLoopStatus(loopId: string): LoopContext | null {
    return this.activeLoops.get(loopId) || null;
  }

  /**
   * Get all active loops
   */
  getActiveLoops(): LoopContext[] {
    return Array.from(this.activeLoops.values());
  }

  /**
   * Get orchestrator metrics
   */
  getMetrics(): Readonly<OrchestratorMetrics> {
    return {
      ...this.metrics,
      activeLoops: this.activeLoops.size,
      avgDurationMs: this.metrics.loopsCompleted > 0
        ? this.metrics.totalDurationMs / this.metrics.loopsCompleted
        : 0,
    };
  }

  /**
   * Cancel a pending loop
   */
  cancelLoop(loopId: string): boolean {
    const context = this.activeLoops.get(loopId);
    if (!context) {
      return false;
    }

    context.state = LoopState.REJECTED;
    context.timestamps.completed = new Date().toISOString();
    this.activeLoops.delete(loopId);
    this.metrics.loopsPendingApproval--;

    return true;
  }
}

// ============================================================================
// Metrics Interface
// ============================================================================

interface OrchestratorMetrics {
  loopsStarted: number;
  loopsCompleted: number;
  loopsFailed: number;
  loopsPendingApproval: number;
  totalDurationMs: number;
  activeLoops?: number;
  avgDurationMs?: number;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOrchestrator(
  config: OrchestratorConfig
): LoopOrchestrator {
  // Validate required configuration
  const requiredFields = [
    'intentGraphUrl',
    'actionEngineUrl',
    'nextaBizUrl',
    'nextaBizApiKey',
    'feedbackServiceUrl',
    'feedbackServiceToken',
    'adaptiveAgentUrl',
  ] as const;

  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`${field} is required`);
    }
  }

  return new LoopOrchestrator(config);
}

// ============================================================================
// Event Handler for Event Platform Integration
// ============================================================================

export function createEventHandler(orchestrator: LoopOrchestrator) {
  return async (event: InventoryLowEvent): Promise<LoopContext> => {
    return orchestrator.startLoop(event);
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  LoopOrchestrator,
  createOrchestrator,
  createEventHandler,
  LoopState,
  ActionDecision,
};
