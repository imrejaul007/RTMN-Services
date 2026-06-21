// API client for commerce-identity service
//
// Authentication model (Phase 5 / S-4 fix):
//   - The browser sends httpOnly cookies automatically with credentials: 'include'.
//   - Server-to-server callers (and clients without cookie support) can still send
//     Authorization: Bearer <token>.
//   - The portal no longer stores the token in localStorage.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const init: RequestInit = {
    ...options,
    credentials: 'include', // send httpOnly cookies
    headers,
  };

  const res = await fetch(`${API_BASE}${path}`, init);
  const json = (await res.json().catch(() => ({}))) as {
    success: boolean;
    data?: T;
    error?: string;
  };

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return (json.data ?? json) as T;
}

// --- Auth ---

export async function login(corpId: string, password: string) {
  return request<{ token: string; expiresAt: string; corpId: string; role: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ corpId, password }),
  });
}

export async function registerAndLogin(payload: {
  corpId: string;
  password: string;
  type: 'supplier' | 'buyer';
}) {
  return request<{ token: string; expiresAt: string; corpId: string; role: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logout() {
  return request<{ success: true }>('/api/auth/logout', { method: 'POST' });
}

export async function setPassword(password: string) {
  return request<{ message: string }>('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function getMe() {
  return request<{ corpId: string; role: string; guestId?: string; authMethod?: string }>('/api/auth/me', {
    method: 'GET',
  });
}

// --- CorpID ---

export async function issueCorpId(payload: {
  type: string;
  businessName: string;
  phone: string;
  email?: string;
}) {
  return request<{ corpId: string }>('/api/corpid/issue', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// --- Suppliers ---

export async function registerSupplier(payload: {
  corpId: string;
  businessName: string;
  legalName: string;
  email: string;
  phone: string;
  categories: string[];
  address: { line1: string; city: string; state: string; pincode: string };
  documents?: Array<{ type: string; number: string }>;
}) {
  return request<Record<string, unknown>>('/api/suppliers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getSupplier(corpId: string) {
  return request<Record<string, unknown>>(`/api/suppliers/${corpId}`);
}

export async function updateSupplierStatus(corpId: string, status: string, reason?: string) {
  return request<Record<string, unknown>>(`/api/suppliers/${corpId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  });
}

// --- Guest ---

export async function onboardGuest(payload: {
  businessName: string;
  ownerName: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  city: string;
  state: string;
  pincode: string;
  categories?: string[];
  promoCode?: string;
}) {
  return request<{ guestId: string; status: string; expiresAt: string; promoCode: string }>(
    '/api/guest-suppliers/onboard',
    { method: 'POST', body: JSON.stringify(payload) }
  );
}

export async function resendOtp(guestId: string) {
  return request<{ guestId: string; status: string }>(
    '/api/guest-suppliers/' + guestId + '/resend-otp',
    { method: 'POST' }
  );
}

export async function verifyOtp(guestId: string, code: string) {
  return request<{ guestId: string; status: string; token?: string; tokenExpiresAt?: string }>(
    '/api/guest-suppliers/' + guestId + '/verify-otp',
    { method: 'POST', body: JSON.stringify({ code }) }
  );
}

export async function getGuest(guestId: string) {
  return request<Record<string, unknown>>('/api/guest-suppliers/' + guestId);
}

export async function convertGuest(
  guestId: string,
  corpId: string,
  documents: { gstin?: string; pan?: string }
) {
  return request<{ corpId: string }>('/api/guest-suppliers/' + guestId + '/convert', {
    method: 'POST',
    body: JSON.stringify({ corpId, documents }),
  });
}

// --- Ratings ---

export async function submitRating(payload: {
  type: string;
  subjectCorpId: string;
  score: number;
  feedback?: string;
  dealId?: string;
}) {
  return request<{ ratingId: string }>('/api/ratings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getReputation(corpId: string) {
  return request<{
    overallScore: number;
    breakdown: Record<string, unknown>;
    recentTrend: string;
  }>('/api/suppliers/' + corpId + '/reputation');
}

// --- Health ---

export async function getHealth() {
  return request<{ status: string; version: string }>('/health');
}
