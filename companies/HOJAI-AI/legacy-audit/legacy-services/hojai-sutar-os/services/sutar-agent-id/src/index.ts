/**
 * SUTAR Agent ID Service - Main Entry Point
 * Agent Identity and Registration Service for SUTAR OS
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

// Types
import {
  AgentRegistrationSchema,
  AgentUpdateSchema,
  AgentVerifySchema,
  AgentAuthSchema,
  PermissionUpdateSchema,
  AgentSearchSchema,
  ApiResponse,
  HealthStatus,
  Agent,
  AgentStatus,
  AgentType,
  PermissionLevel,
  IdentityIntegration,
  ServiceConfig,
} from "./types/index.js";

// Services
import { storageService } from "./services/storage.service.js";
import { agentService } from "./services/agent.service.js";
import { authService } from "./services/auth.service.js";
import { permissionService } from "./services/permission.service.js";
import { verificationService } from "./services/verification.service.js";
import { identityOSService } from "./services/identity-os.service.js";
import { searchService } from "./services/search.service.js";
import { metricsService } from "./services/metrics.service.js";

// ============================================================================
// App Configuration
// ============================================================================

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4146;
const START_TIME = Date.now();
const REQUEST_ID_HEADER = "x-request-id";

// ============================================================================
// Middleware
// ============================================================================

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(",") || "*",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId = req.headers[REQUEST_ID_HEADER] as string || uuidv4();
  (req as any).requestId = requestId;
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${requestId}`);
  next();
});

// Request timing middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const success = res.statusCode < 400;
    metricsService.recordRequest(req.path, req.method, duration, success);
  });
  next();
});

// ============================================================================
// API Response Helper
// ============================================================================

const apiResponse = <T>(success: boolean, data?: T, error?: string, requestId?: string): ApiResponse<T> => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
  requestId,
});

// Error handler middleware
const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[ERROR] ${req.path}:`, err);
  res.status(500).json(apiResponse(false, undefined, err.message, (req as any).requestId));
};

// ============================================================================
// Health Endpoints
// ============================================================================

app.get("/health", async (_req: Request, res: Response) => {
  const health: HealthStatus = {
    status: "healthy",
    service: "sutar-agent-id",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    checks: {
      storage: { status: "pass", latency: 0 },
      identityOS: { status: identityOSService.getIntegrationStatus().status === "connected" ? "pass" : "fail" },
      dependencies: { status: "pass" },
    },
  };

  // Determine overall status
  if (health.checks.identityOS.status === "fail") {
    health.status = "degraded";
  }

  res.json(health);
});

app.get("/ready", async (_req: Request, res: Response) => {
  const isReady = identityOSService.getIntegrationStatus().status !== "error";
  if (isReady) {
    res.json({ ready: true, timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ ready: false, timestamp: new Date().toISOString() });
  }
});

app.get("/live", (_req: Request, res: Response) => {
  res.json({ alive: true, timestamp: new Date().toISOString() });
});

// ============================================================================
// Service Info Endpoint
// ============================================================================

app.get("/api/v1/info", (_req: Request, res: Response) => {
  const identityOS = identityOSService.getIntegrationStatus();
  res.json(apiResponse(true, {
    name: "sutar-agent-id",
    description: "SUTAR Agent Identity and Registration Service",
    version: "1.0.0",
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    features: [
      "Agent Registration",
      "Agent Identity",
      "Agent Verification",
      "Agent Metadata",
      "Agent Status",
      "Agent Authentication",
      "Agent Permissions",
      "Identity OS Integration",
    ],
    endpoints: {
      agents: "/api/v1/agents",
      search: "/api/v1/agents/search",
      auth: "/api/v1/auth",
      permissions: "/api/v1/permissions",
      metrics: "/api/v1/metrics",
      identityOS: "/api/v1/identity-os",
    },
    integration: {
      identityOS: {
        enabled: identityOS.enabled,
        status: identityOS.status,
        url: identityOS.serviceUrl,
        lastSync: identityOS.lastSync,
      },
    },
  }));
});

// ============================================================================
// Agent Registration
// POST /api/v1/agents/register
// ============================================================================

app.post("/api/v1/agents/register", async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;

    // Validate request
    const validationResult = AgentRegistrationSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json(apiResponse(false, undefined, validationResult.error.message, requestId));
      return;
    }

    const { name, type, metadata, capabilities, permissions, parentAgentId } = validationResult.data;

    // Register the agent
    const result = await agentService.registerAgent({
      name,
      type: type || AgentType.SERVICE,
      metadata,
      capabilities,
      permissions,
      parentAgentId,
    });

    // Setup default permissions if requested
    if (result.agent.type !== AgentType.SYSTEM) {
      await permissionService.setupDefaultPermissions(result.agent.id);
    }

    console.log(`[Agent] Registered: ${result.agent.agentId} (${result.agent.id})`);

    res.status(201).json(apiResponse(true, {
      agent: result.agent,
      apiKey: result.apiKey,
      message: result.message,
    }, undefined, requestId));
  } catch (error) {
    console.error("[Agent] Registration error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Get Agent
// GET /api/v1/agents/:id
// ============================================================================

app.get("/api/v1/agents/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = (req as any).requestId;

    // Try to get by UUID first, then by agentId
    let agent = await agentService.getAgent(id);
    if (!agent) {
      agent = await agentService.getAgentByAgentId(id);
    }

    if (!agent) {
      res.status(404).json(apiResponse(false, undefined, "Agent not found", requestId));
      return;
    }

    res.json(apiResponse(true, { agent }, undefined, requestId));
  } catch (error) {
    console.error("[Agent] Get error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Update Agent
// PUT /api/v1/agents/:id
// ============================================================================

app.put("/api/v1/agents/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = (req as any).requestId;

    // Validate request
    const validationResult = AgentUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json(apiResponse(false, undefined, validationResult.error.message, requestId));
      return;
    }

    const updatedAgent = await agentService.updateAgent(id, validationResult.data, {
      updatedBy: req.headers["x-agent-id"] as string,
    });

    if (!updatedAgent) {
      res.status(404).json(apiResponse(false, undefined, "Agent not found", requestId));
      return;
    }

    console.log(`[Agent] Updated: ${updatedAgent.agentId}`);

    res.json(apiResponse(true, { agent: updatedAgent }, undefined, requestId));
  } catch (error) {
    console.error("[Agent] Update error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Verify Agent
// POST /api/v1/agents/:id/verify
// ============================================================================

app.post("/api/v1/agents/:id/verify", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = (req as any).requestId;

    // Validate request
    const validationResult = AgentVerifySchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json(apiResponse(false, undefined, validationResult.error.message, requestId));
      return;
    }

    // Check if agent exists
    const agent = await agentService.getAgent(id);
    if (!agent) {
      res.status(404).json(apiResponse(false, undefined, "Agent not found", requestId));
      return;
    }

    const result = await verificationService.verifyAgent(id, validationResult.data);
    metricsService.recordVerificationAttempt(result.verified);

    if (result.verified) {
      console.log(`[Agent] Verified: ${agent.agentId}`);
    }

    res.json(apiResponse(true, {
      verified: result.verified,
      verificationStatus: result.verificationStatus,
      message: result.message,
    }, undefined, requestId));
  } catch (error) {
    console.error("[Agent] Verification error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Get Agent Status
// GET /api/v1/agents/:id/status
// ============================================================================

app.get("/api/v1/agents/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = (req as any).requestId;

    const agent = await agentService.getAgent(id);
    if (!agent) {
      res.status(404).json(apiResponse(false, undefined, "Agent not found", requestId));
      return;
    }

    const verificationStatus = await verificationService.getVerificationStatus(id);
    const permissions = await permissionService.getAgentPermissions(id);
    const tokens = await authService.getActiveTokens(id);

    res.json(apiResponse(true, {
      agentId: agent.agentId,
      status: agent.status,
      type: agent.type,
      verification: verificationStatus,
      lastActivity: agent.lastActivity,
      permissions: permissions.length,
      activeTokens: tokens.length,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    }, undefined, requestId));
  } catch (error) {
    console.error("[Agent] Status error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Authenticate Agent
// POST /api/v1/agents/:id/auth
// ============================================================================

app.post("/api/v1/agents/:id/auth", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = (req as any).requestId;

    // Validate request
    const validationResult = AgentAuthSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json(apiResponse(false, undefined, validationResult.error.message, requestId));
      return;
    }

    // Check if agent exists
    const agent = await agentService.getAgent(id);
    if (!agent) {
      metricsService.recordAuthAttempt(false);
      res.status(404).json(apiResponse(false, undefined, "Agent not found", requestId));
      return;
    }

    // Perform authentication
    const result = await authService.authenticate({
      method: validationResult.data.method,
      credentials: validationResult.data.credentials,
      scope: validationResult.data.scope,
    });

    if (!result) {
      metricsService.recordAuthAttempt(false);
      res.status(401).json(apiResponse(false, undefined, "Authentication failed", requestId));
      return;
    }

    metricsService.recordAuthAttempt(true);
    console.log(`[Agent] Authenticated: ${agent.agentId}`);

    res.json(apiResponse(true, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
      scope: result.scope,
    }, undefined, requestId));
  } catch (error) {
    console.error("[Agent] Auth error:", error);
    metricsService.recordAuthAttempt(false);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Set Agent Permissions
// POST /api/v1/agents/:id/permissions
// ============================================================================

app.post("/api/v1/agents/:id/permissions", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = (req as any).requestId;

    // Validate request
    const validationResult = PermissionUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json(apiResponse(false, undefined, validationResult.error.message, requestId));
      return;
    }

    // Check if agent exists
    const agent = await agentService.getAgent(id);
    if (!agent) {
      res.status(404).json(apiResponse(false, undefined, "Agent not found", requestId));
      return;
    }

    let result;
    if (validationResult.data.replace) {
      // Replace all permissions
      const revokeResult = await permissionService.bulkRevokePermissions(
        id,
        (await permissionService.getAgentPermissions(id)).map(p => p.resource)
      );
      result = await permissionService.bulkGrantPermissions(id, validationResult.data.permissions.map(p => ({
        resource: p.resource,
        actions: p.actions,
        level: p.level,
        conditions: p.conditions,
        grantedBy: req.headers["x-agent-id"] as string,
      })));
    } else {
      result = await permissionService.bulkGrantPermissions(id, validationResult.data.permissions.map(p => ({
        resource: p.resource,
        actions: p.actions,
        level: p.level,
        conditions: p.conditions,
        grantedBy: req.headers["x-agent-id"] as string,
      })));
    }

    console.log(`[Agent] Permissions updated: ${agent.agentId}`);

    res.json(apiResponse(true, {
      granted: result.success,
      failed: result.failed,
      permissions: result.permissions,
      errors: result.errors,
    }, undefined, requestId));
  } catch (error) {
    console.error("[Agent] Permissions error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Search Agents
// GET /api/v1/agents/search
// ============================================================================

app.get("/api/v1/agents/search", async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;

    // Parse query parameters
    const searchRequest = {
      query: req.query.query as string,
      type: req.query.type as AgentType,
      status: req.query.status as AgentStatus,
      tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags as string[] : [req.query.tags as string]) : undefined,
      capabilities: req.query.capabilities ? (Array.isArray(req.query.capabilities) ? req.query.capabilities as string[] : [req.query.capabilities as string]) : undefined,
      createdAfter: req.query.createdAfter as string,
      createdBefore: req.query.createdBefore as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      sortBy: req.query.sortBy as "name" | "createdAt" | "updatedAt" | "status",
      sortOrder: req.query.sortOrder as "asc" | "desc",
    };

    const result = await searchService.search(searchRequest);

    res.json(apiResponse(true, {
      items: result.items,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
      searchTime: result.searchTime,
    }, undefined, requestId));
  } catch (error) {
    console.error("[Search] Error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// List All Agents
// GET /api/v1/agents
// ============================================================================

app.get("/api/v1/agents", async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;

    const filter = {
      type: req.query.type as AgentType,
      status: req.query.status as AgentStatus,
    };

    const agents = await agentService.getAllAgents(filter);
    const total = agents.length;

    res.json(apiResponse(true, {
      items: agents,
      total,
      limit: agents.length,
      offset: 0,
      hasMore: false,
    }, undefined, requestId));
  } catch (error) {
    console.error("[Agents] List error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Delete Agent
// DELETE /api/v1/agents/:id
// ============================================================================

app.delete("/api/v1/agents/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = (req as any).requestId;
    const soft = req.query.soft !== "false";

    const deleted = await agentService.deleteAgent(id, soft);

    if (!deleted) {
      res.status(404).json(apiResponse(false, undefined, "Agent not found", requestId));
      return;
    }

    console.log(`[Agent] Deleted: ${id} (soft=${soft})`);

    res.json(apiResponse(true, {
      deleted: true,
      soft,
      message: soft ? "Agent soft deleted" : "Agent permanently deleted",
    }, undefined, requestId));
  } catch (error) {
    console.error("[Agent] Delete error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Agent Status Actions
// POST /api/v1/agents/:id/activate
// POST /api/v1/agents/:id/deactivate
// POST /api/v1/agents/:id/suspend
// POST /api/v1/agents/:id/ban
// ============================================================================

app.post("/api/v1/agents/:id/activate", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = (req as any).requestId;

    const agent = await agentService.activateAgent(id, req.headers["x-agent-id"] as string);

    if (!agent) {
      res.status(404).json(apiResponse(false, undefined, "Agent not found", requestId));
      return;
    }

    res.json(apiResponse(true, { agent, message: "Agent activated" }, undefined, requestId));
  } catch (error) {
    console.error("[Agent] Activate error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

app.post("/api/v1/agents/:id/deactivate", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = (req as any).requestId;
    const reason = req.body.reason;

    const agent = await agentService.deactivateAgent(id, req.headers["x-agent-id"] as string, reason);

    if (!agent) {
      res.status(404).json(apiResponse(false, undefined, "Agent not found", requestId));
      return;
    }

    // Revoke all tokens
    await authService.revokeAllTokens(id);

    res.json(apiResponse(true, { agent, message: "Agent deactivated" }, undefined, requestId));
  } catch (error) {
    console.error("[Agent] Deactivate error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

app.post("/api/v1/agents/:id/suspend", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = (req as any).requestId;
    const reason = req.body.reason;

    const agent = await agentService.suspendAgent(id, req.headers["x-agent-id"] as string, reason);

    if (!agent) {
      res.status(404).json(apiResponse(false, undefined, "Agent not found", requestId));
      return;
    }

    // Revoke all tokens
    await authService.revokeAllTokens(id);

    res.json(apiResponse(true, { agent, message: "Agent suspended" }, undefined, requestId));
  } catch (error) {
    console.error("[Agent] Suspend error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

app.post("/api/v1/agents/:id/ban", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = (req as any).requestId;
    const reason = req.body.reason;

    const agent = await agentService.banAgent(id, req.headers["x-agent-id"] as string, reason);

    if (!agent) {
      res.status(404).json(apiResponse(false, undefined, "Agent not found", requestId));
      return;
    }

    res.json(apiResponse(true, { agent, message: "Agent banned" }, undefined, requestId));
  } catch (error) {
    console.error("[Agent] Ban error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Auth Endpoints
// POST /api/v1/auth/token - Generate access token
// POST /api/v1/auth/refresh - Refresh access token
// POST /api/v1/auth/revoke - Revoke token
// ============================================================================

app.post("/api/v1/auth/token", async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;

    // Can authenticate with API key in body or header
    const apiKey = req.body.apiKey || req.headers["x-api-key"] as string;

    if (!apiKey) {
      res.status(400).json(apiResponse(false, undefined, "API key required", requestId));
      return;
    }

    const agent = await agentService.getAgentByApiKey(apiKey);
    if (!agent) {
      metricsService.recordAuthAttempt(false);
      res.status(401).json(apiResponse(false, undefined, "Invalid API key", requestId));
      return;
    }

    const result = await authService.authenticate({
      method: "api_key",
      credentials: { apiKey },
      scope: req.body.scope,
    });

    if (!result) {
      metricsService.recordAuthAttempt(false);
      res.status(401).json(apiResponse(false, undefined, "Authentication failed", requestId));
      return;
    }

    metricsService.recordAuthAttempt(true);

    res.json(apiResponse(true, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
    }, undefined, requestId));
  } catch (error) {
    console.error("[Auth] Token error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

app.post("/api/v1/auth/refresh", async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json(apiResponse(false, undefined, "Refresh token required", requestId));
      return;
    }

    const result = await authService.refreshTokens(refreshToken);

    if (!result) {
      res.status(401).json(apiResponse(false, undefined, "Invalid or expired refresh token", requestId));
      return;
    }

    res.json(apiResponse(true, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
    }, undefined, requestId));
  } catch (error) {
    console.error("[Auth] Refresh error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

app.post("/api/v1/auth/revoke", async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;
    const { tokenId, agentId, allTokens } = req.body;

    let revoked = 0;

    if (allTokens && agentId) {
      revoked = await authService.revokeAllTokens(agentId);
    } else if (tokenId) {
      revoked = (await authService.revokeToken(tokenId)) ? 1 : 0;
    } else {
      res.status(400).json(apiResponse(false, undefined, "tokenId or (agentId + allTokens) required", requestId));
      return;
    }

    res.json(apiResponse(true, { revoked, message: `Revoked ${revoked} token(s)` }, undefined, requestId));
  } catch (error) {
    console.error("[Auth] Revoke error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Permissions Endpoints
// GET /api/v1/permissions/roles
// POST /api/v1/permissions/roles
// GET /api/v1/permissions/roles/:id
// ============================================================================

app.get("/api/v1/permissions/roles", async (_req: Request, res: Response) => {
  try {
    const roles = await permissionService.getAllRoles();
    res.json(apiResponse(true, { items: roles, total: roles.length }));
  } catch (error) {
    console.error("[Permissions] Roles error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

app.post("/api/v1/permissions/roles", async (req: Request, res: Response) => {
  try {
    const { name, description, permissions } = req.body;

    const role = await permissionService.createRole(name, description, permissions);

    res.status(201).json(apiResponse(true, { role }));
  } catch (error) {
    console.error("[Permissions] Create role error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

app.get("/api/v1/permissions/roles/:id", async (req: Request, res: Response) => {
  try {
    const role = await permissionService.getRole(req.params.id);

    if (!role) {
      res.status(404).json(apiResponse(false, undefined, "Role not found"));
      return;
    }

    res.json(apiResponse(true, { role }));
  } catch (error) {
    console.error("[Permissions] Get role error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// Metrics Endpoints
// GET /api/v1/metrics
// GET /api/v1/metrics/snapshot
// GET /api/v1/metrics/prometheus
// ============================================================================

app.get("/api/v1/metrics", async (_req: Request, res: Response) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.json(apiResponse(true, metrics));
  } catch (error) {
    console.error("[Metrics] Error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

app.get("/api/v1/metrics/snapshot", async (_req: Request, res: Response) => {
  try {
    const snapshot = await metricsService.getSnapshot();
    res.json(apiResponse(true, snapshot));
  } catch (error) {
    console.error("[Metrics] Snapshot error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

app.get("/api/v1/metrics/prometheus", async (_req: Request, res: Response) => {
  try {
    const metrics = await metricsService.getPrometheusMetrics();
    res.set("Content-Type", "text/plain");
    res.send(metrics);
  } catch (error) {
    console.error("[Metrics] Prometheus error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// Identity OS Integration Endpoints
// GET /api/v1/identity-os/status
// POST /api/v1/identity-os/sync
// POST /api/v1/identity-os/connect
// POST /api/v1/identity-os/disconnect
// ============================================================================

app.get("/api/v1/identity-os/status", async (_req: Request, res: Response) => {
  try {
    const status = identityOSService.getIntegrationStatus();
    const syncStats = identityOSService.getSyncStats();
    const config = identityOSService.getConfig();

    res.json(apiResponse(true, {
      integration: status,
      sync: syncStats,
      config: {
        url: config.url,
        enabled: config.enabled,
        syncInterval: config.syncInterval,
      },
    }));
  } catch (error) {
    console.error("[IdentityOS] Status error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

app.post("/api/v1/identity-os/sync", async (req: Request, res: Response) => {
  try {
    const { agentId } = req.body;

    if (agentId) {
      const agent = await agentService.getAgent(agentId);
      if (!agent) {
        res.status(404).json(apiResponse(false, undefined, "Agent not found"));
        return;
      }
      await identityOSService.syncAgent(agent, "update");
    } else {
      const agents = await agentService.getAllAgents();
      await identityOSService.syncAllAgents(agents);
    }

    const syncStats = identityOSService.getSyncStats();

    res.json(apiResponse(true, {
      message: "Sync completed",
      stats: syncStats,
    }));
  } catch (error) {
    console.error("[IdentityOS] Sync error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

app.post("/api/v1/identity-os/connect", async (_req: Request, res: Response) => {
  try {
    const connected = await identityOSService.connect();
    const status = identityOSService.getIntegrationStatus();

    res.json(apiResponse(true, {
      connected,
      status,
      message: connected ? "Connected to Identity OS" : "Failed to connect",
    }));
  } catch (error) {
    console.error("[IdentityOS] Connect error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

app.post("/api/v1/identity-os/disconnect", async (_req: Request, res: Response) => {
  try {
    await identityOSService.disconnect();
    const status = identityOSService.getIntegrationStatus();

    res.json(apiResponse(true, {
      disconnected: true,
      status,
    }));
  } catch (error) {
    console.error("[IdentityOS] Disconnect error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// Events Endpoint
// GET /api/v1/events
// ============================================================================

app.get("/api/v1/events", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const agentId = req.query.agentId as string;
    const type = req.query.type as string;

    let events;
    if (agentId) {
      events = await storageService.getEventsByAgent(agentId, limit);
    } else if (type) {
      events = await storageService.getEventsByType(type, limit);
    } else {
      events = await storageService.getEvents(limit);
    }

    res.json(apiResponse(true, {
      items: events,
      total: events.length,
    }));
  } catch (error) {
    console.error("[Events] Error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// Intent/Event Handling (for SUTAR OS Bus Integration)
// ============================================================================

app.post("/api/v1/intent", async (req: Request, res: Response) => {
  try {
    const { type, payload } = req.body;
    console.log(`[INTENT] ${type}:`, payload);
    res.json(apiResponse(true, { intentId: uuidv4(), type, status: "received" }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

app.post("/api/v1/event", async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    console.log(`[EVENT] ${type}:`, data);

    // Publish to Identity OS if enabled
    if (type.startsWith("agent.")) {
      await identityOSService.publishEvent({
        id: uuidv4(),
        type: type as any,
        agentId: data?.agentId || "",
        data: data || {},
        timestamp: new Date().toISOString(),
      });
    }

    res.json(apiResponse(true, { eventId: uuidv4(), type, status: "processed" }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// Statistics Endpoints
// GET /api/v1/stats
// ============================================================================

app.get("/api/v1/stats", async (_req: Request, res: Response) => {
  try {
    const agentStats = await agentService.getAgentStats();
    const verificationStats = await verificationService.getVerificationStats();
    const permissionStats = await permissionService.getPermissionStats();
    const searchAggregations = await searchService.getAggregations();

    res.json(apiResponse(true, {
      agents: agentStats,
      verification: verificationStats,
      permissions: permissionStats,
      search: searchAggregations,
    }));
  } catch (error) {
    console.error("[Stats] Error:", error);
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// 404 Handler
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json(apiResponse(false, undefined, "Not found"));
});

// ============================================================================
// Error Handler
// ============================================================================

app.use(errorHandler);

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  SUTAR Agent ID Service                                      ║
║  Agent Identity and Registration                             ║
╠═══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                           ║
║  Environment: ${process.env.NODE_ENV || "development"}                                ║
║  Version:     1.0.0                                          ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                  ║
║  - POST   /api/v1/agents/register  Register agent             ║
║  - GET    /api/v1/agents/:id      Get agent                  ║
║  - PUT    /api/v1/agents/:id      Update agent                ║
║  - POST   /api/v1/agents/:id/verify  Verify agent             ║
║  - GET    /api/v1/agents/:id/status  Get status               ║
║  - POST   /api/v1/agents/:id/auth  Authenticate               ║
║  - POST   /api/v1/agents/:id/permissions  Set permissions      ║
║  - GET    /api/v1/agents/search  Search agents                ║
║  - GET    /health                Health check                ║
║  - GET    /api/v1/metrics         Metrics                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Integration:                                                 ║
║  - Identity OS: ${identityOSService.getIntegrationStatus().enabled ? "Enabled" : "Disabled"}                                     ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
