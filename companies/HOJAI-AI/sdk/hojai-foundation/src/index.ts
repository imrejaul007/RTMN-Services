/**
 * HOJAI Foundation SDK v2
 *
 * Unified client for HOJAI-native applications. Wraps 6 foundation services
 * via the RTMN Hub (http://localhost:4399):
 *   CorpID  → /api/identity/*  → CorpID service (4702)
 *   Memory  → /api/memory/*    → MemoryOS (4703)
 *   Twin    → /api/twins/*     → TwinOS Hub (4705)
 *   Trust   → /api/foundation/sada-os/*   → SADA OS (4190)
 *   Flow    → /api/foundation/flow-orchestrator/* → (4244)
 *   Policy  → /api/foundation/policy-os/*       → PolicyOS (4254)
 *
 * Auth: call hojai.login(email, password) before any other call.
 * The SDK manages JWT lifecycle (auto-refresh on 401).
 *
 * @example
 * ```ts
 * import { Hojai } from '@hojai/foundation';
 *
 * const hojai = new Hojai({ baseUrl: 'http://localhost:4399' });
 * await hojai.login('alice@example.com', 'secret');
 *
 * const corp = await hojai.corpId.create({ type: 'company', metadata: { name: 'Acme' } });
 * const memory = await hojai.memory.write({ type: 'fact', scope: { ownerId: corp.id, ownerType: 'company' }, content: { value: true } });
 * const twin = await hojai.twin.create({ type: 'customer', name: 'Alice', attributes: { email: 'alice@example.com' } });
 * const trust = await hojai.trust.getScore(corp.id);
 * const plan = await hojai.flow.create({ name: 'onboard', steps: [{ name: 'greet', type: 'log', config: { message: 'Welcome!' } }] });
 * const decision = await hojai.policy.evaluate({ action: 'send_email', context: { recipient: 'bob@example.com' }, corpId: corp.id });
 * ```
 */

import type { HojaiConfig } from './config.js';
import { resolveConfig } from './config.js';
import { CorpIDClient } from './corp-id.js';
import { MemoryClient } from './memory.js';
import { TwinClient } from './twin.js';
import { TrustClient } from './trust.js';
import { FlowClient } from './flow.js';
import { PolicyClient } from './policy.js';
import { HojaiAuthError, request } from './utils.js';
import type { AuthState } from './utils.js';

export type { HojaiConfig } from './config.js';
export { resolveConfig } from './config.js';
export { HojaiApiError, HojaiAuthError } from './utils.js';
export { CorpIDClient } from './corp-id.js';
export { MemoryClient } from './memory.js';
export { TwinClient } from './twin.js';
export { TrustClient } from './trust.js';
export { FlowClient } from './flow.js';
export { PolicyClient } from './policy.js';

export type {
  CorpID, CorpIDType, CorpIDMetadata, CreateCorpIDRequest
} from './corp-id.js';
export type {
  Memory, MemoryType, MemoryScope, WriteMemoryRequest, SearchMemoryRequest
} from './memory.js';
export type {
  Twin, TwinType, CreateTwinRequest, UpdateTwinRequest
} from './twin.js';
export type {
  TrustScore, TrustActivity, VerifyRequest, VerifyResult
} from './trust.js';
export type {
  FlowPlan, FlowExecution, FlowStep, FlowStepType, CreateFlowRequest, RunFlowRequest
} from './flow.js';
export type {
  Policy, PolicyCategory, PolicyStatus, PolicyRule, CreatePolicyRequest, EvaluateRequest, EvaluateResult
} from './policy.js';

/**
 * Main HOJAI Foundation client.
 *
 * Stores auth tokens and passes them to all sub-clients.
 * Auto-refreshes on 401.
 */
export class Hojai {
  public readonly corpId: CorpIDClient;
  public readonly memory: MemoryClient;
  public readonly twin: TwinClient;
  public readonly trust: TrustClient;
  public readonly flow: FlowClient;
  public readonly policy: PolicyClient;
  public readonly config: ReturnType<typeof resolveConfig>;

  /** @internal */
  private readonly _authState: AuthState = { accessToken: null, refreshToken: null };

  constructor(config: HojaiConfig = {}) {
    this.config = resolveConfig(config);
    this.corpId  = new CorpIDClient(this.config, this._authState);
    this.memory  = new MemoryClient(this.config, this._authState);
    this.twin    = new TwinClient(this.config, this._authState);
    this.trust   = new TrustClient(this.config, this._authState);
    this.flow    = new FlowClient(this.config, this._authState);
    this.policy  = new PolicyClient(this.config, this._authState);
  }

  /**
   * Login with email + password.
   * Stores access + refresh tokens for all subsequent calls.
   */
  async login(email: string, password: string): Promise<void> {
    const tokens = await this.corpId._login(email, password);
    this._authState.accessToken  = tokens.accessToken;
    this._authState.refreshToken = tokens.refreshToken;
  }

  /**
   * Logout — clears stored tokens.
   * (Also calls POST /api/identity/auth/logout on the backend.)
   */
  async logout(): Promise<void> {
    try {
      await request({ ...this.config, authState: this._authState }, 'POST', '/api/identity/auth/logout', {});
    } catch {
      // ignore — we clear tokens regardless
    }
    this._authState.accessToken  = null;
    this._authState.refreshToken = null;
  }

  /**
   * True if tokens are currently stored.
   */
  get isAuthenticated(): boolean {
    return this._authState.accessToken !== null;
  }

  /**
   * Refresh the access token using the stored refresh token.
   * Called automatically on 401, but can be called manually.
   * @throws HojaiAuthError if refresh fails
   */
  async refresh(): Promise<void> {
    if (!this._authState.refreshToken) {
      throw new HojaiAuthError('No refresh token. Call hojai.login() first.');
    }
    const tokens = await this.corpId._refresh(this._authState.refreshToken);
    this._authState.accessToken  = tokens.accessToken;
    this._authState.refreshToken = tokens.refreshToken;
  }
}

/** Default export */
export default Hojai;
