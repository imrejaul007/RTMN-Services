export interface RezAuthUser {
  id: string;
  email: string;
  name?: string;
  role: 'merchant' | 'supplier' | 'admin';
  merchantId?: string;   // if role=merchant
  supplierId?: string;   // if role=supplier
  businessName?: string;
}

export interface RezAuthTokenPayload {
  sub: string;
  email: string;
  name?: string;
  role: string;
  merchantId?: string;
  supplierId?: string;
  businessName?: string;
  iat: number;
  exp: number;
}

export interface SSOCallbackResult {
  success: boolean;
  user?: RezAuthUser;
  token?: string;
  error?: string;
}

export interface TokenExchangeResponse {
  access_token: string;
  user: RezAuthUser;
}

export interface ValidateTokenResponse {
  valid: boolean;
  user?: RezAuthUser;
  error?: string;
}
