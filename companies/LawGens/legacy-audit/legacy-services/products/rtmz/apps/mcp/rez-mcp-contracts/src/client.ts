// REST Client for Contract Management Service
const CONTRACT_SERVICE_URL = process.env.CONTRACT_SERVICE_URL || 'http://localhost:5003';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

export interface Contract {
  id: string;
  title: string;
  parties: string[];
  status: 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated';
  startDate: string;
  endDate: string;
  value?: number;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractCreate {
  title: string;
  parties: string[];
  type: string;
  startDate: string;
  endDate: string;
  value?: number;
  content?: string;
}

export interface SignatureRequest {
  contractId: string;
  signers: Array<{
    email: string;
    name: string;
    role: string;
  }>;
  message?: string;
}

export interface SignatureResult {
  signatureId: string;
  signedBy?: string;
  signedAt?: string;
  status: 'pending' | 'signed' | 'declined';
}

export async function fetchFromContract<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${CONTRACT_SERVICE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_SERVICE_TOKEN,
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as T;
  } catch (error) {
    console.error(`Contract API error (${endpoint}):`, error);
    return null;
  }
}

export async function createContract(contract: ContractCreate): Promise<Contract | null> {
  return fetchFromContract<Contract>('/api/contracts', {
    method: 'POST',
    body: JSON.stringify(contract)
  });
}

export async function getContract(contractId: string): Promise<Contract | null> {
  return fetchFromContract<Contract>(`/api/contracts/${contractId}`);
}

export async function updateContract(contractId: string, updates: Partial<ContractCreate>): Promise<Contract | null> {
  return fetchFromContract<Contract>(`/api/contracts/${contractId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function sendForSignature(request: SignatureRequest): Promise<{ requestId: string } | null> {
  return fetchFromContract<{ requestId: string }>('/api/contracts/signature/send', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

export async function signContract(signatureId: string, signerEmail: string): Promise<SignatureResult | null> {
  return fetchFromContract<SignatureResult>(`/api/contracts/signature/${signatureId}/sign`, {
    method: 'POST',
    body: JSON.stringify({ signerEmail })
  });
}

export async function getRenewalReminders(daysAhead?: number): Promise<Contract[] | null> {
  return fetchFromContract<Contract[]>(`/api/contracts/renewals?days=${daysAhead || 30}`);
}
