// ============================================================================
// SUTAR Identity OS - Main Application
// ============================================================================

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import { ZodError } from "zod";

import { logger, generateRequestId } from "./utils/logger.js";
import { identityService } from "./services/identity.service.js";
import { credentialService } from "./services/credential.service.js";
import { kycService } from "./services/kyc.service.js";
import { trustEngineService } from "./services/trust-engine.service.js";
import type {
  APIResponse,
  Identity,
  Credential,
  KYCRecord,
} from "./types/index.js";

// ============================================================================
// Configuration
// ============================================================================

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4147;
const START_TIME = Date.now();
const SERVICE_NAME = "sutar-identity-os";
const SERVICE_VERSION = "1.0.0";

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
}));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
    timestamp: new Date().toISOString(),
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 auth requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many authentication attempts, please try again later.",
    timestamp: new Date().toISOString(),
  },
});

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.headers["x-request-id"] = req.headers["x-request-id"] || generateRequestId();
  next();
});

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  _res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("HTTP", `${req.method} ${req.path} ${_res.statusCode} ${duration}ms`, {
      requestId: req.headers["x-request-id"],
      ip: req.ip,
    });
  });
  next();
});

// Apply rate limiting
app.use(globalLimiter);

// ============================================================================
// API Response Helpers
// ============================================================================

function apiResponse<T>(success: boolean, data?: T, error?: string, message?: string): APIResponse<T> {
  return {
    success,
    data,
    error,
    message,
    timestamp: new Date().toISOString(),
  };
}

function errorResponse(res: Response, status: number, error: string, message?: string): Response {
  return res.status(status).json(apiResponse(false, undefined, error, message));
}

function successResponse<T>(res: Response, data: T, message?: string): Response {
  return res.status(200).json(apiResponse(true, data, undefined, message));
}

function createdResponse<T>(res: Response, data: T, message?: string): Response {
  return res.status(201).json(apiResponse(true, data, undefined, message));
}

// ============================================================================
// Error Handling
// ============================================================================

// Zod validation error handler
function handleZodError(error: ZodError): string {
  return error.errors
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join("; ");
}

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("ErrorHandler", err.message, { stack: err.stack });

  if (err instanceof ZodError) {
    return errorResponse(res, 400, handleZodError(err));
  }

  if (err.name === "SyntaxError") {
    return errorResponse(res, 400, "Invalid JSON in request body");
  }

  return errorResponse(res, 500, "Internal server error");
});

// 404 handler
app.use((_req: Request, res: Response) => {
  errorResponse(res, 404, "Endpoint not found");
});

// ============================================================================
// Health & Info Endpoints
// ============================================================================

// Health check
app.get("/health", async (_req: Request, res: Response) => {
  const trustEngineHealthy = await trustEngineService.healthCheck();

  res.json({
    status: "healthy",
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    dependencies: {
      trustEngine: trustEngineHealthy ? "healthy" : "unhealthy",
    },
  });
});

// Service info
app.get("/api/v1/info", (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    name: SERVICE_NAME,
    description: "SUTAR Identity OS - Identity verification and KYC service",
    version: SERVICE_VERSION,
    features: [
      "Identity verification",
      "KYC (Know Your Customer)",
      "Credential management",
      "Entity registration (user, merchant, agent, company)",
      "Identity status tracking",
      "Verification badges",
      "Document verification",
      "Multi-factor authentication (MFA)",
      "Trust Engine integration",
    ],
    endpoints: {
      identities: "/api/v1/identities",
      credentials: "/api/v1/credentials",
      kyc: "/api/v1/identities/:id/kyc",
      verification: "/api/v1/identities/:id/verify",
      status: "/api/v1/identities/:id/status",
    },
  }));
});

// ============================================================================
// Identity Endpoints
// ============================================================================

// Register new identity
app.post("/api/v1/identities", authLimiter, async (req: Request, res: Response) => {
  try {
    const identity = await identityService.createIdentity(req.body);
    logger.info("IdentityController", `Created identity: ${identity.id}`);
    createdResponse(res, identity, "Identity registered successfully");
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(res, 400, handleZodError(error));
    }
    logger.error("IdentityController", `Failed to create identity: ${error}`);
    return errorResponse(res, 500, "Failed to create identity");
  }
});

// Get identity by ID
app.get("/api/v1/identities/:id", async (req: Request, res: Response) => {
  try {
    const identity = await identityService.getIdentity(req.params.id);

    if (!identity) {
      return errorResponse(res, 404, "Identity not found");
    }

    // Update last login on access
    await identityService.updateLastLogin(req.params.id);

    successResponse(res, identity);
  } catch (error) {
    logger.error("IdentityController", `Failed to get identity: ${error}`);
    return errorResponse(res, 500, "Failed to get identity");
  }
});

// Update identity
app.put("/api/v1/identities/:id", async (req: Request, res: Response) => {
  try {
    const identity = await identityService.updateIdentity(req.params.id, req.body);

    if (!identity) {
      return errorResponse(res, 404, "Identity not found");
    }

    logger.info("IdentityController", `Updated identity: ${identity.id}`);
    successResponse(res, identity, "Identity updated successfully");
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(res, 400, handleZodError(error));
    }
    logger.error("IdentityController", `Failed to update identity: ${error}`);
    return errorResponse(res, 500, "Failed to update identity");
  }
});

// Delete identity (soft delete)
app.delete("/api/v1/identities/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await identityService.deleteIdentity(req.params.id);

    if (!deleted) {
      return errorResponse(res, 404, "Identity not found");
    }

    logger.info("IdentityController", `Deleted identity: ${req.params.id}`);
    successResponse(res, { id: req.params.id, deleted: true }, "Identity deleted successfully");
  } catch (error) {
    logger.error("IdentityController", `Failed to delete identity: ${error}`);
    return errorResponse(res, 500, "Failed to delete identity");
  }
});

// Verify identity
app.post("/api/v1/identities/:id/verify", authLimiter, async (req: Request, res: Response) => {
  try {
    const identity = await identityService.getIdentity(req.params.id);

    if (!identity) {
      return errorResponse(res, 404, "Identity not found");
    }

    // Evaluate trust via Trust Engine
    const trustResult = await trustEngineService.evaluateTrust({
      identityId: identity.id,
      entityType: identity.entityType,
      verificationType: "identity",
      kycLevel: identity.kycLevel,
      documents: identity.documents.map(d => ({
        type: d.type,
        documentNumber: d.documentNumber,
        verified: d.verified,
      })),
    });

    // Update verification status based on trust evaluation
    const newStatus = trustResult.trustScore >= 0.5 ? "verified" : "pending";
    const updatedIdentity = await identityService.verifyIdentity(req.params.id, {
      ...req.body,
      verificationType: "identity",
    });

    logger.info("IdentityController", `Verified identity: ${req.params.id}, trust score: ${trustResult.trustScore}`);
    successResponse(res, {
      identity: updatedIdentity,
      trustEvaluation: {
        score: trustResult.trustScore,
        riskLevel: trustResult.riskLevel,
        factors: trustResult.factors,
        recommendations: trustResult.recommendations,
      },
    }, "Identity verification completed");
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(res, 400, handleZodError(error));
    }
    logger.error("IdentityController", `Failed to verify identity: ${error}`);
    return errorResponse(res, 500, "Failed to verify identity");
  }
});

// Get verification status
app.get("/api/v1/identities/:id/status", async (req: Request, res: Response) => {
  try {
    const status = await identityService.getVerificationStatus(req.params.id);

    if (!status) {
      return errorResponse(res, 404, "Identity not found");
    }

    // Get KYC expiry status
    const kycExpiry = await kycService.getKYCExpiryStatus(req.params.id);

    // Get audit log
    const auditLog = await identityService.getAuditLog(req.params.id);

    successResponse(res, {
      ...status,
      kycExpiry,
      recentActivity: auditLog.slice(-10),
    });
  } catch (error) {
    logger.error("IdentityController", `Failed to get verification status: ${error}`);
    return errorResponse(res, 500, "Failed to get verification status");
  }
});

// ============================================================================
// KYC Endpoints
// ============================================================================

// Submit KYC application
app.post("/api/v1/identities/:id/kyc", authLimiter, async (req: Request, res: Response) => {
  try {
    const identity = await identityService.getIdentity(req.params.id);

    if (!identity) {
      return errorResponse(res, 404, "Identity not found");
    }

    // Submit KYC
    const kycRecord = await kycService.submitKYC(req.params.id, req.body);

    logger.info("KYCController", `Submitted KYC: ${kycRecord.id} for identity: ${req.params.id}`);
    createdResponse(res, kycRecord, "KYC application submitted successfully");
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(res, 400, handleZodError(error));
    }
    if (error instanceof Error && error.message.includes("Identity not found")) {
      return errorResponse(res, 404, error.message);
    }
    logger.error("KYCController", `Failed to submit KYC: ${error}`);
    return errorResponse(res, 500, "Failed to submit KYC application");
  }
});

// Get KYC status for identity
app.get("/api/v1/identities/:id/kyc", async (req: Request, res: Response) => {
  try {
    const kycRecord = await kycService.getKYCByIdentity(req.params.id);

    if (!kycRecord) {
      return errorResponse(res, 404, "No KYC record found for this identity");
    }

    // Check if KYC is complete
    const isComplete = await kycService.isKYCComplete(kycRecord.id);
    const expiryStatus = await kycService.getKYCExpiryStatus(req.params.id);

    successResponse(res, {
      ...kycRecord,
      isComplete,
      ...expiryStatus,
    });
  } catch (error) {
    logger.error("KYCController", `Failed to get KYC status: ${error}`);
    return errorResponse(res, 500, "Failed to get KYC status");
  }
});

// Admin: Approve KYC
app.post("/api/v1/kyc/:id/approve", authLimiter, async (req: Request, res: Response) => {
  try {
    const approvedBy = req.headers["x-admin-id"] as string || "system";
    const kycRecord = await kycService.approveKYC(
      req.params.id,
      approvedBy,
      req.body.notes
    );

    if (!kycRecord) {
      return errorResponse(res, 404, "KYC record not found");
    }

    logger.info("KYCController", `Approved KYC: ${req.params.id} by ${approvedBy}`);
    successResponse(res, kycRecord, "KYC approved successfully");
  } catch (error) {
    logger.error("KYCController", `Failed to approve KYC: ${error}`);
    return errorResponse(res, 500, "Failed to approve KYC");
  }
});

// Admin: Reject KYC
app.post("/api/v1/kyc/:id/reject", authLimiter, async (req: Request, res: Response) => {
  try {
    const rejectedBy = req.headers["x-admin-id"] as string || "system";
    const { reason } = req.body;

    if (!reason) {
      return errorResponse(res, 400, "Rejection reason is required");
    }

    const kycRecord = await kycService.rejectKYC(req.params.id, rejectedBy, reason);

    if (!kycRecord) {
      return errorResponse(res, 404, "KYC record not found");
    }

    logger.info("KYCController", `Rejected KYC: ${req.params.id} by ${rejectedBy}`);
    successResponse(res, kycRecord, "KYC rejected");
  } catch (error) {
    logger.error("KYCController", `Failed to reject KYC: ${error}`);
    return errorResponse(res, 500, "Failed to reject KYC");
  }
});

// ============================================================================
// Credential Endpoints
// ============================================================================

// Create credential
app.post("/api/v1/credentials", authLimiter, async (req: Request, res: Response) => {
  try {
    // Verify identity exists
    const identity = await identityService.getIdentity(req.body.identityId);
    if (!identity) {
      return errorResponse(res, 404, "Identity not found");
    }

    const credential = await credentialService.createCredential(req.body);

    // Link credential to identity
    await identityService.addCredential(req.body.identityId, credential.id);

    logger.info("CredentialController", `Created credential: ${credential.id}`);
    createdResponse(res, credential, "Credential created successfully");
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(res, 400, handleZodError(error));
    }
    logger.error("CredentialController", `Failed to create credential: ${error}`);
    return errorResponse(res, 500, "Failed to create credential");
  }
});

// Get credential by ID
app.get("/api/v1/credentials/:id", async (req: Request, res: Response) => {
  try {
    const credential = await credentialService.getCredential(req.params.id);

    if (!credential) {
      return errorResponse(res, 404, "Credential not found");
    }

    // Check validity
    const isValid = await credentialService.isCredentialValid(req.params.id);

    successResponse(res, {
      ...credential,
      isValid,
    });
  } catch (error) {
    logger.error("CredentialController", `Failed to get credential: ${error}`);
    return errorResponse(res, 500, "Failed to get credential");
  }
});

// Get credentials by identity
app.get("/api/v1/identities/:id/credentials", async (req: Request, res: Response) => {
  try {
    const { includeInactive } = req.query;
    let credentials: Credential[];

    if (includeInactive === "true") {
      credentials = await credentialService.getCredentialsByIdentity(req.params.id);
    } else {
      credentials = await credentialService.getActiveCredentials(req.params.id);
    }

    successResponse(res, {
      identityId: req.params.id,
      credentials,
      count: credentials.length,
    });
  } catch (error) {
    logger.error("CredentialController", `Failed to get credentials: ${error}`);
    return errorResponse(res, 500, "Failed to get credentials");
  }
});

// Revoke credential
app.post("/api/v1/credentials/:id/revoke", authLimiter, async (req: Request, res: Response) => {
  try {
    const revokedBy = req.headers["x-admin-id"] as string || "system";
    const { reason } = req.body;

    const credential = await credentialService.revokeCredential(
      req.params.id,
      reason,
      revokedBy
    );

    if (!credential) {
      return errorResponse(res, 404, "Credential not found");
    }

    logger.info("CredentialController", `Revoked credential: ${req.params.id}`);
    successResponse(res, credential, "Credential revoked successfully");
  } catch (error) {
    logger.error("CredentialController", `Failed to revoke credential: ${error}`);
    return errorResponse(res, 500, "Failed to revoke credential");
  }
});

// ============================================================================
// MFA Endpoints
// ============================================================================

// Setup MFA
app.post("/api/v1/identities/:id/mfa", authLimiter, async (req: Request, res: Response) => {
  try {
    const identity = await identityService.getIdentity(req.params.id);

    if (!identity) {
      return errorResponse(res, 404, "Identity not found");
    }

    const { type, value } = req.body;

    // In production, this would send verification codes, generate TOTP secrets, etc.
    const mfaSetup = {
      type,
      value,
      setupComplete: true,
      backupCodes: Array.from({ length: 10 }, () => uuidv4().substring(0, 8)),
    };

    // Update identity MFA
    const updatedMfa = {
      enabled: true,
      types: [...identity.mfa.types, type],
      verified: false,
      backupCodes: mfaSetup.backupCodes,
    };

    await identityService.updateIdentity(req.params.id, {
      mfaEnabled: true,
      mfaTypes: updatedMfa.types,
    });

    logger.info("MFAController", `MFA setup for identity: ${req.params.id}, type: ${type}`);
    successResponse(res, {
      mfaSetup,
      message: "MFA configured successfully. Store backup codes securely.",
    });
  } catch (error) {
    logger.error("MFAController", `Failed to setup MFA: ${error}`);
    return errorResponse(res, 500, "Failed to setup MFA");
  }
});

// Verify MFA
app.post("/api/v1/identities/:id/mfa/verify", authLimiter, async (req: Request, res: Response) => {
  try {
    const identity = await identityService.getIdentity(req.params.id);

    if (!identity) {
      return errorResponse(res, 404, "Identity not found");
    }

    const { code, type } = req.body;

    // In production, verify the code against the stored secret/TOTP
    // For demo, accept any 6-digit code
    const isValid = /^\d{6}$/.test(code);

    if (!isValid) {
      return errorResponse(res, 400, "Invalid verification code format");
    }

    logger.info("MFAController", `MFA verification for identity: ${req.params.id}`);
    successResponse(res, {
      verified: true,
      type,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("MFAController", `Failed to verify MFA: ${error}`);
    return errorResponse(res, 500, "Failed to verify MFA");
  }
});

// ============================================================================
// Document Verification Endpoint
// ============================================================================

// Verify document
app.post("/api/v1/documents/verify", authLimiter, async (req: Request, res: Response) => {
  try {
    const { type, number, metadata } = req.body;

    const result = await trustEngineService.verifyDocument(type, number, metadata);

    logger.info("DocumentController", `Document verified: ${type} ${number}, valid: ${result.valid}`);
    successResponse(res, result);
  } catch (error) {
    logger.error("DocumentController", `Failed to verify document: ${error}`);
    return errorResponse(res, 500, "Failed to verify document");
  }
});

// ============================================================================
// Trust Engine Integration Endpoints
// ============================================================================

// Evaluate trust score
app.post("/api/v1/trust/evaluate", authLimiter, async (req: Request, res: Response) => {
  try {
    const { identityId, ...rest } = req.body;

    if (!identityId) {
      return errorResponse(res, 400, "identityId is required");
    }

    const result = await trustEngineService.evaluateTrust({
      identityId,
      ...rest,
    });

    successResponse(res, result);
  } catch (error) {
    logger.error("TrustController", `Failed to evaluate trust: ${error}`);
    return errorResponse(res, 500, "Failed to evaluate trust");
  }
});

// Get risk assessment
app.post("/api/v1/trust/risk", authLimiter, async (req: Request, res: Response) => {
  try {
    const { identityId, context } = req.body;

    if (!identityId) {
      return errorResponse(res, 400, "identityId is required");
    }

    const result = await trustEngineService.getRiskAssessment(identityId, context);

    successResponse(res, result);
  } catch (error) {
    logger.error("TrustController", `Failed to get risk assessment: ${error}`);
    return errorResponse(res, 500, "Failed to get risk assessment");
  }
});

// ============================================================================
// List Endpoints (Admin)
// ============================================================================

// List identities
app.get("/api/v1/identities", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await identityService.listIdentities(page, limit);

    successResponse(res, result);
  } catch (error) {
    logger.error("IdentityController", `Failed to list identities: ${error}`);
    return errorResponse(res, 500, "Failed to list identities");
  }
});

// List credentials
app.get("/api/v1/credentials", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await credentialService.listCredentials(page, limit, {
      identityId: req.query.identityId as string,
      type: req.query.type as any,
      status: req.query.status as string,
    });

    successResponse(res, result);
  } catch (error) {
    logger.error("CredentialController", `Failed to list credentials: ${error}`);
    return errorResponse(res, 500, "Failed to list credentials");
  }
});

// List KYC records (admin)
app.get("/api/v1/kyc", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await kycService.listKYCRecords(page, limit, {
      identityId: req.query.identityId as string,
      level: req.query.level as any,
      status: req.query.status as any,
    });

    successResponse(res, result);
  } catch (error) {
    logger.error("KYCController", `Failed to list KYC records: ${error}`);
    return errorResponse(res, 500, "Failed to list KYC records");
  }
});

// ============================================================================
// Intent/Event Handlers (for SUTAR OS Integration)
// ============================================================================

// Handle intent
app.post("/api/v1/intent", async (req: Request, res: Response) => {
  try {
    const { type, payload } = req.body;

    logger.info("IntentHandler", `Processing intent: ${type}`, payload);

    let result: Identity | Credential | KYCRecord | { intentId: string; type: string; status: string; error?: string } = { intentId: uuidv4(), type, status: "received" };

    switch (type) {
      case "identity.create":
        result = await identityService.createIdentity(payload);
        break;
      case "identity.verify":
        if (payload.identityId) {
          const verified = await identityService.verifyIdentity(payload.identityId, payload);
          result = verified ?? { intentId: uuidv4(), type, status: "error", error: "Identity not found" };
        }
        break;
      case "kyc.submit":
        if (payload.identityId) {
          result = await kycService.submitKYC(payload.identityId, payload);
        }
        break;
      case "credential.create":
        result = await credentialService.createCredential(payload);
        if (payload.identityId && "id" in result) {
          await identityService.addCredential(payload.identityId, result.id);
        }
        break;
      default:
        logger.warn("IntentHandler", `Unknown intent type: ${type}`);
    }

    successResponse(res, result, `Intent ${type} processed`);
  } catch (error) {
    logger.error("IntentHandler", `Failed to process intent: ${error}`);
    return errorResponse(res, 400, `Failed to process intent: ${error}`);
  }
});

// Handle event
app.post("/api/v1/event", async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;

    logger.info("EventHandler", `Processing event: ${type}`, data);

    // Process events asynchronously
    switch (type) {
      case "identity.updated":
        logger.info("EventHandler", "Identity updated event processed");
        break;
      case "kyc.status_changed":
        logger.info("EventHandler", "KYC status changed event processed");
        break;
      case "credential.issued":
        logger.info("EventHandler", "Credential issued event processed");
        break;
      default:
        logger.warn("EventHandler", `Unknown event type: ${type}`);
    }

    successResponse(res, {
      eventId: uuidv4(),
      type,
      status: "processed",
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("EventHandler", `Failed to process event: ${error}`);
    return errorResponse(res, 400, `Failed to process event: ${error}`);
  }
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  logger.info("Server", `${SERVICE_NAME} v${SERVICE_VERSION} running on port ${PORT}`);
  logger.info("Server", `Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info("Server", `Trust Engine: ${process.env.TRUST_ENGINE_URL || "http://localhost:4180"}`);
});

export default app;