/**
 * Forensics shared types
 * Shared TypeScript types for forensics MCPs
 */

// Investigation types
export interface Investigation {
  id: string;
  title: string;
  description?: string;
  type: InvestigationType;
  status: InvestigationStatus;
  priority: InvestigationPriority;
  query: string;
  results?: Record<string, unknown>;
  mcpResults?: Record<string, unknown>;
  reportId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export enum InvestigationType {
  EVIDENCE = 'evidence',
  DEEPFAKE = 'deepfake',
  OSINT = 'osint',
  FINANCIAL = 'financial',
  LOCATION = 'location',
  FULL = 'full'
}

export enum InvestigationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum InvestigationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Evidence types
export interface Evidence {
  id: string;
  type: EvidenceType;
  filename: string;
  fileSize: number;
  mimeType: string;
  sha256Hash: string;
  metadata?: Record<string, unknown>;
  source: string;
  importedBy: string;
  investigationId?: string;
  createdAt: string;
}

export enum EvidenceType {
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  CCTV = 'cctv',
  DOCUMENT = 'document',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  OTHER = 'other'
}

export interface EvidenceImportRequest {
  type: EvidenceType;
  filename: string;
  fileData: string;
  source: string;
  metadata?: Record<string, unknown>;
  investigationId?: string;
}

// Deepfake detection types
export interface DeepfakeAnalysis {
  id: string;
  fileId: string;
  fileType: string;
  analysisType: DeepfakeAnalysisType;
  confidence: number;
  verdict: DeepfakeVerdict;
  details?: DeepfakeDetails;
  examinedBy: string;
  examinedAt: string;
}

export enum DeepfakeAnalysisType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  EXIF = 'exif'
}

export enum DeepfakeVerdict {
  REAL = 'real',
  FAKE = 'fake',
  UNCERTAIN = 'uncertain'
}

export interface DeepfakeDetails {
  faceDetection?: boolean;
  manipulationDetected?: boolean;
  confidenceBreakdown?: Record<string, number>;
  artifacts?: string[];
  metadataAnalysis?: Record<string, unknown>;
}

// Chain of custody types
export interface CustodyChain {
  evidenceId: string;
  chain: CustodyTransfer[];
  isIntact: boolean;
  createdAt: string;
}

export interface CustodyTransfer {
  id: string;
  evidenceId: string;
  fromCustodian: string;
  toCustodian: string;
  purpose: CustodyPurpose;
  hashVerified: boolean;
  transferredAt: string;
  notes?: string;
}

export enum CustodyPurpose {
  ANALYSIS = 'analysis',
  STORAGE = 'storage',
  TRANSFER = 'transfer',
  COURT = 'court',
  OTHER = 'other'
}

// Financial forensics types
export interface FinancialAnalysis {
  id: string;
  caseId: string;
  analysisType: FinancialAnalysisType;
  findings: FinancialFinding[];
  anomalies: FinancialAnomaly[];
  summary?: string;
  createdAt: string;
}

export enum FinancialAnalysisType {
  INVOICE = 'invoice',
  FRAUD = 'fraud',
  TRANSACTION = 'transaction',
  PATTERN = 'pattern'
}

export interface FinancialFinding {
  type: string;
  description: string;
  severity: FindingSeverity;
  details?: Record<string, unknown>;
}

export enum FindingSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface FinancialAnomaly {
  type: string;
  description: string;
  confidence: number;
  affectedTransactions?: number;
  metadata?: Record<string, unknown>;
}

// Social intelligence types
export interface SocialProfile {
  identifier: string;
  platform?: SocialPlatform;
  profileData?: Record<string, unknown>;
  riskScore?: number;
  lastUpdated?: string;
}

export enum SocialPlatform {
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  GITHUB = 'github',
  OTHER = 'other'
}

export interface SocialConnection {
  identifier: string;
  platform?: SocialPlatform;
  relationship?: string;
  strength: number;
  metadata?: Record<string, unknown>;
}

// Location intelligence types
export interface LocationData {
  identifier: string;
  type: LocationType;
  coordinates?: GeoCoordinates;
  address?: string;
  confidence: number;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export enum LocationType {
  GPS = 'gps',
  IP = 'ip',
  CELL_TOWER = 'cell_tower',
  WIFI = 'wifi',
  ADDRESS = 'address'
}

export interface GeoCoordinates {
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
}

// Expert report types
export interface ExpertReport {
  id: string;
  investigationId: string;
  type: ReportType;
  format: ReportFormat;
  title: string;
  content: string;
  exhibits?: string[];
  declaration?: ExpertDeclaration;
  generatedAt: string;
  generatedBy: string;
}

export enum ReportType {
  PRELIMINARY = 'preliminary',
  INTERIM = 'interim',
  FINAL = 'final',
  SUPPLEMENTARY = 'supplementary'
}

export enum ReportFormat {
  PDF = 'pdf',
  HTML = 'html',
  DOCX = 'docx'
}

export interface ExpertDeclaration {
  name: string;
  qualifications: string;
  experience: string;
  signature?: string;
  date: string;
}

// Forensics tool types
export interface ForensicsTool {
  name: string;
  description: string;
  endpoint: string;
  capabilities: string[];
  mcpPort: number;
  version?: string;
}

// API response types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ForensicsApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    processingTimeMs?: number;
  };
}
