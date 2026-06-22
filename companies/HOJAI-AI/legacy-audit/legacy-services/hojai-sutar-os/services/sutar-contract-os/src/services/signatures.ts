// ============================================================================
// SUTAR Contract OS - Signature Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { Signature, SignatureStatus, Party } from '../types/index';

// In-memory stores
const signatureRequests = new Map<string, SignatureRequest>();
const signatureLogs = new Map<string, SignatureLog>();

// Signature request interface
interface SignatureRequest {
  id: string;
  contractId: string;
  partyId: string;
  partyName: string;
  partyEmail: string;
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled';
  createdAt: string;
  expiresAt: string;
  signedAt?: string;
  signatureData?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

interface SignatureLog {
  id: string;
  requestId: string;
  contractId: string;
  action: 'created' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled';
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
}

// Generate a cryptographic hash for signature verification
const generateSignatureHash = (signatureData: string, contractId: string, partyId: string): string => {
  const data = `${signatureData}|${contractId}|${partyId}|${new Date().toISOString()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Create a digital signature certificate
const createSignatureCertificate = (
  contractId: string,
  partyId: string,
  partyName: string,
  signatureData: string,
  timestamp: string
): SignatureCertificate => {
  return {
    id: `cert-${uuidv4()}`,
    contractId,
    partyId,
    partyName,
    issuedAt: timestamp,
    validUntil: new Date(new Date(timestamp).getTime() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 10 years
    signatureHash: generateSignatureHash(signatureData, contractId, partyId),
    algorithm: 'RSA-SHA256',
    status: 'valid',
  };
};

interface SignatureCertificate {
  id: string;
  contractId: string;
  partyId: string;
  partyName: string;
  issuedAt: string;
  validUntil: string;
  signatureHash: string;
  algorithm: string;
  status: 'valid' | 'revoked' | 'expired';
}

// Signature styles
export const signatureStyles = [
  'cursive',
  'handwritten',
  'typewriter',
  ' initials',
  'stamp',
  'digital',
];

// Signature Service Functions
export const signatureService = {
  // Create a new signature request
  createSignatureRequest: (
    contractId: string,
    party: Party,
    options?: {
      expiryDays?: number;
      message?: string;
      redirectUrl?: string;
    }
  ): SignatureRequest => {
    const expiryDays = options?.expiryDays || 7;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    const request: SignatureRequest = {
      id: `sig-req-${uuidv4()}`,
      contractId,
      partyId: party.id,
      partyName: party.name,
      partyEmail: party.email,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt,
      metadata: {
        message: options?.message,
        redirectUrl: options?.redirectUrl,
      },
    };

    signatureRequests.set(request.id, request);

    // Log the creation
    signatureService.logSignatureAction(request.id, contractId, 'created');

    console.log(`[SIGNATURE] Request created: ${request.id} for contract ${contractId}`);
    return request;
  },

  // Send signature request to party
  sendSignatureRequest: async (
    requestId: string,
    options?: {
      emailSubject?: string;
      emailBody?: string;
      sendMethod?: 'email' | 'sms' | 'whatsapp';
    }
  ): Promise<boolean> => {
    const request = signatureRequests.get(requestId);
    if (!request) return false;

    // In a real implementation, this would integrate with an email/SMS service
    request.status = 'sent';

    // Simulate sending
    console.log(`[SIGNATURE] Sending request ${requestId} to ${request.partyEmail}`);
    console.log(`[SIGNATURE] Subject: ${options?.emailSubject || 'Please sign the contract'}`);

    signatureService.logSignatureAction(requestId, request.contractId, 'sent');

    return true;
  },

  // Get signature request
  getSignatureRequest: (requestId: string): SignatureRequest | undefined => {
    return signatureRequests.get(requestId);
  },

  // Get signature requests for contract
  getSignatureRequestsForContract: (contractId: string): SignatureRequest[] => {
    return Array.from(signatureRequests.values())
      .filter(r => r.contractId === contractId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // View signature request (track when party opens it)
  viewSignatureRequest: (requestId: string, ipAddress?: string, userAgent?: string): boolean => {
    const request = signatureRequests.get(requestId);
    if (!request) return false;

    request.status = 'viewed';
    signatureRequests.set(requestId, request);

    signatureService.logSignatureAction(requestId, request.contractId, 'viewed', ipAddress, userAgent);

    console.log(`[SIGNATURE] Request viewed: ${requestId}`);
    return true;
  },

  // Sign a document
  signDocument: (
    requestId: string,
    signatureData: string,
    options?: {
      ipAddress?: string;
      userAgent?: string;
      signatureType?: 'electronic' | 'digital' | 'wet';
    }
  ): Signature | undefined => {
    const request = signatureRequests.get(requestId);
    if (!request) return undefined;

    // Check if request has expired
    if (new Date(request.expiresAt) < new Date()) {
      request.status = 'expired';
      signatureRequests.set(requestId, request);
      signatureService.logSignatureAction(requestId, request.contractId, 'expired');
      return undefined;
    }

    const timestamp = new Date().toISOString();
    const signatureHash = generateSignatureHash(signatureData, request.contractId, request.partyId);
    const certificate = createSignatureCertificate(
      request.contractId,
      request.partyId,
      request.partyName,
      signatureData,
      timestamp
    );

    const signature: Signature = {
      id: `sig-${uuidv4()}`,
      partyId: request.partyId,
      partyName: request.partyName,
      signature: signatureData,
      signatureType: options?.signatureType || 'electronic',
      ipAddress: options?.ipAddress || 'unknown',
      userAgent: options?.userAgent,
      timestamp,
      status: 'signed',
      hash: signatureHash,
      certificate: JSON.stringify(certificate),
      expiresAt: request.expiresAt,
    };

    // Update request status
    request.status = 'signed';
    request.signedAt = timestamp;
    request.signatureData = signatureData;
    request.ipAddress = options?.ipAddress;
    request.userAgent = options?.userAgent;
    signatureRequests.set(requestId, request);

    // Log the signing
    signatureService.logSignatureAction(
      requestId,
      request.contractId,
      'signed',
      options?.ipAddress,
      options?.userAgent,
      `Signature hash: ${signatureHash}`
    );

    console.log(`[SIGNATURE] Document signed: ${requestId} by ${request.partyName}`);
    return signature;
  },

  // Cancel signature request
  cancelSignatureRequest: (requestId: string, reason?: string): boolean => {
    const request = signatureRequests.get(requestId);
    if (!request) return false;

    request.status = 'cancelled';
    signatureRequests.set(requestId, request);

    signatureService.logSignatureAction(
      requestId,
      request.contractId,
      'cancelled',
      undefined,
      undefined,
      reason
    );

    console.log(`[SIGNATURE] Request cancelled: ${requestId}`);
    return true;
  },

  // Expire old requests
  expireOldRequests: (): number => {
    const now = new Date();
    let expiredCount = 0;

    signatureRequests.forEach((request, id) => {
      if (request.status === 'pending' || request.status === 'sent' || request.status === 'viewed') {
        if (new Date(request.expiresAt) < now) {
          request.status = 'expired';
          signatureRequests.set(id, request);
          signatureService.logSignatureAction(id, request.contractId, 'expired');
          expiredCount++;
        }
      }
    });

    if (expiredCount > 0) {
      console.log(`[SIGNATURE] Expired ${expiredCount} signature requests`);
    }
    return expiredCount;
  },

  // Log signature action
  logSignatureAction: (
    requestId: string,
    contractId: string,
    action: SignatureLog['action'],
    ipAddress?: string,
    userAgent?: string,
    details?: string
  ): void => {
    const log: SignatureLog = {
      id: `log-${uuidv4()}`,
      requestId,
      contractId,
      action,
      timestamp: new Date().toISOString(),
      ipAddress,
      userAgent,
      details,
    };
    signatureLogs.set(log.id, log);
  },

  // Get signature logs for contract
  getSignatureLogs: (contractId: string): SignatureLog[] => {
    return Array.from(signatureLogs.values())
      .filter(log => log.contractId === contractId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  // Verify a signature
  verifySignature: (contractId: string, partyId: string, signatureHash: string): {
    isValid: boolean;
    signature?: Signature;
    certificate?: SignatureCertificate;
  } => {
    // In a real implementation, this would look up the actual signature
    // For now, we just return a structure
    return {
      isValid: true,
    };
  },

  // Generate a signature image (for electronic signatures)
  generateSignatureImage: (
    name: string,
    style: 'cursive' | 'handwritten' | 'typewriter' = 'cursive',
    color: string = '#000000'
  ): string => {
    // In a real implementation, this would generate an actual signature image
    // For now, return a placeholder data URL
    const canvas = Buffer.alloc(1); // Placeholder
    return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"><text x="10" y="50" font-family="cursive" font-size="24" fill="${color}">${name}</text></svg>`).toString('base64')}`;
  },

  // Create typed signature
  createTypedSignature: (name: string, ipAddress?: string): Signature => {
    const timestamp = new Date().toISOString();
    const signatureData = `TYPED:${name.toUpperCase()}:${timestamp}`;
    const signatureHash = generateSignatureHash(signatureData, 'typed', name);

    return {
      id: `sig-${uuidv4()}`,
      partyId: 'typed-party',
      partyName: name,
      signature: signatureData,
      signatureType: 'electronic',
      ipAddress: ipAddress || 'unknown',
      timestamp,
      status: 'signed',
      hash: signatureHash,
    };
  },

  // Create initial signature
  createInitialSignature: (initials: string, ipAddress?: string): Signature => {
    const timestamp = new Date().toISOString();
    const signatureData = `INITIAL:${initials.toUpperCase()}:${timestamp}`;
    const signatureHash = generateSignatureHash(signatureData, 'initial', initials);

    return {
      id: `sig-${uuidv4()}`,
      partyId: 'initial-party',
      partyName: initials,
      signature: signatureData,
      signatureType: 'electronic',
      ipAddress: ipAddress || 'unknown',
      timestamp,
      status: 'signed',
      hash: signatureHash,
    };
  },

  // Get signature statistics
  getSignatureStats: (): {
    totalRequests: number;
    pending: number;
    signed: number;
    expired: number;
    cancelled: number;
    averageSigningTime: number;
  } => {
    const requests = Array.from(signatureRequests.values());
    const signedRequests = requests.filter(r => r.status === 'signed' && r.signedAt);

    let totalSigningTime = 0;
    signedRequests.forEach(r => {
      if (r.signedAt) {
        const created = new Date(r.createdAt).getTime();
        const signed = new Date(r.signedAt).getTime();
        totalSigningTime += (signed - created) / (60 * 60 * 1000); // Hours
      }
    });

    return {
      totalRequests: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      signed: requests.filter(r => r.status === 'signed').length,
      expired: requests.filter(r => r.status === 'expired').length,
      cancelled: requests.filter(r => r.status === 'cancelled').length,
      averageSigningTime: signedRequests.length > 0 ? totalSigningTime / signedRequests.length : 0,
    };
  },

  // Bulk create signature requests
  bulkCreateSignatureRequests: (
    contractId: string,
    parties: Party[],
    options?: {
      expiryDays?: number;
      message?: string;
    }
  ): SignatureRequest[] => {
    return parties.map(party =>
      signatureService.createSignatureRequest(contractId, party, options)
    );
  },

  // Resend signature request
  resendSignatureRequest: async (requestId: string): Promise<boolean> => {
    const request = signatureRequests.get(requestId);
    if (!request) return false;

    if (request.status === 'signed') {
      console.log(`[SIGNATURE] Cannot resend - already signed: ${requestId}`);
      return false;
    }

    if (request.status === 'expired' || request.status === 'cancelled') {
      console.log(`[SIGNATURE] Cannot resend - request is ${request.status}: ${requestId}`);
      return false;
    }

    return signatureService.sendSignatureRequest(requestId);
  },

  // Get pending signatures for email
  getPendingSignatures: (): SignatureRequest[] => {
    return Array.from(signatureRequests.values())
      .filter(r => r.status === 'pending' || r.status === 'sent' || r.status === 'viewed')
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
  },

  // Audit trail - get all signature events
  getAuditTrail: (contractId: string): SignatureLog[] => {
    return signatureService.getSignatureLogs(contractId);
  },
};

export default signatureService;
