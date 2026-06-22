// HOJAI Voice AI Service - Main Entry Point
// Port: 4590
// Purpose: Voice recording, transcription, synthesis, medical NLP

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { voiceRoutes } from './routes/voiceRoutes.js';
import { transcriptionRoutes } from './routes/transcriptionRoutes.js';
import { synthesisRoutes } from './routes/synthesisRoutes.js';
import { medicalRoutes } from './routes/medicalRoutes.js';
import { logger } from './utils/logger.js';
import { swaggerSpec } from './config/swagger.js';

// ============================================
// Types
// ============================================

export interface AuthenticatedRequest extends Request {
  requestId: string;
  userId?: string;
  userRole?: 'patient' | 'caregiver' | 'provider' | 'admin';
  file?: Express.Multer.File;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    duration?: number;
  };
}

// ============================================
// Configuration
// ============================================

const PORT = parseInt(process.env.PORT || '4590', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10); // 15 min
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

// ============================================
// App Setup
// ============================================

const app = express();

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
      'audio/x-m4a',
      'audio/ogg',
      'audio/webm',
      'audio/mp3',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}`));
    }
  },
});

// Rate limiting
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    });
  },
});

// ============================================
// Middleware
// ============================================

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(limiter);

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || `voice_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  res.setHeader('X-Request-ID', requestId);
  (req as AuthenticatedRequest).requestId = requestId;
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const authReq = req as AuthenticatedRequest;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      requestId: authReq.requestId,
      duration,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
    });
  });
  next();
});

// ============================================
// Health Checks
// ============================================

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  environment: string;
  capabilities: {
    transcription: boolean;
    synthesis: boolean;
    medicalExtraction: boolean;
  };
}

app.get('/health', (req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'healthy',
    service: 'hojai-voice-ai-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    capabilities: {
      transcription: true,
      synthesis: true,
      medicalExtraction: process.env.MEDICAL_NLP_ENABLED === 'true',
    },
  };
  res.json(response);
});

interface ReadinessResponse {
  status: string;
  sttProvider: string;
  ttsProvider: string;
  medicalNlp: string;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

app.get('/ready', (req: Request, res: Response) => {
  const response: ReadinessResponse = {
    status: 'ready',
    sttProvider: process.env.STT_PROVIDER || 'whisper',
    ttsProvider: process.env.TTS_PROVIDER || 'elevenlabs',
    medicalNlp: process.env.MEDICAL_NLP_ENABLED === 'true',
    rateLimit: {
      windowMs: RATE_LIMIT_WINDOW,
      maxRequests: RATE_LIMIT_MAX,
    },
  };
  res.json(response);
});

// ============================================
// Routes
// ============================================

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Voice AI Service API',
}));
app.get('/api/openapi.json', (req: Request, res: Response) => {
  res.json(swaggerSpec);
});

app.use('/api/voice', voiceRoutes);
app.use('/api/transcribe', upload.single('audio'), transcriptionRoutes);
app.use('/api/synthesize', synthesisRoutes);
app.use('/api/medical', medicalRoutes);

// ============================================
// Error Handling
// ============================================

// Multer errors
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;

  if (err.message.includes('Unsupported audio format')) {
    logger.warn('Unsupported audio format', {
      requestId: authReq.requestId,
      mimeType: (req as any).file?.mimetype,
    });
    res.status(400).json({
      success: false,
      error: {
        code: 'UNSUPPORTED_FORMAT',
        message: err.message,
        requestId: authReq.requestId,
      },
    });
    return;
  }

  if (err.message.includes('File too large')) {
    logger.warn('File too large', {
      requestId: authReq.requestId,
      size: (req as any).file?.size,
    });
    res.status(400).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'Audio file exceeds 100MB limit',
        requestId: authReq.requestId,
      },
    });
    return;
  }

  logger.error('Voice AI Service Error', err, {
    requestId: authReq.requestId,
  });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: NODE_ENV === 'production' ? 'An error occurred' : err.message,
      requestId: authReq.requestId,
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: authReq.requestId,
    },
  });
});

// ============================================
// Server Start
// ============================================

app.listen(PORT, () => {
  logger.info(`HOJAI Voice AI Service started on port ${PORT}`);
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info(`STT Provider: ${process.env.STT_PROVIDER || 'whisper'}`);
  logger.info(`TTS Provider: ${process.env.TTS_PROVIDER || 'elevenlabs'}`);
  logger.info(`Medical NLP: ${process.env.MEDICAL_NLP_ENABLED === 'true' ? 'enabled' : 'disabled'}`);
  logger.info(`Rate Limit: ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW / 1000}s`);
});

export default app;
