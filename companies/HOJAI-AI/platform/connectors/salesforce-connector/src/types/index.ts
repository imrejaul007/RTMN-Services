/**
 * Salesforce Connector - Type Definitions
 * Production-ready TypeScript types for Salesforce API
 */

// ============ Auth Types ============

export interface SalesforceAuthToken {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

export interface SalesforceTokenResponse {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
  expires_in?: number;
}

export interface SalesforceUserInfo {
  id: string;
  name: string;
  email: string;
  given_name: string;
  family_name: string;
  photos: {
    picture: string;
    thumbnail: string;
  };
  urls: {
    enterprise: string;
    metadata: string;
    partner: string;
    rest: string;
    sobjects: string;
    search: string;
    query: string;
    recent: string;
  };
  active: boolean;
  user_type: string;
  language: string;
  locale: string;
  utcOffset: number;
  mobile_app_device_platform?: string;
}

// ============ OAuth Types ============

export interface SalesforceOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: 'production' | 'sandbox' | 'test';
}

export interface SalesforceOAuthState {
  codeVerifier: string;
  redirectUri: string;
  timestamp: number;
}

// ============ Lead Types ============

export interface SalesforceLead {
  Id: string;
  FirstName?: string;
  LastName: string;
  Name?: string;
  Email?: string;
  Phone?: string;
  MobilePhone?: string;
  Title?: string;
  Company: string;
  Department?: string;
  Street?: string;
  City?: string;
  State?: string;
  PostalCode?: string;
  Country?: string;
  LeadSource?: string;
  Status?: string;
  Rating?: string;
  AnnualRevenue?: number;
  NumberOfEmployees?: number;
  Description?: string;
  Industry?: string;
  Website?: string;
  IsConverted?: boolean;
  IsUnreadByOwner?: boolean;
  OwnerId?: string;
  CreatedDate?: string;
  LastModifiedDate?: string;
}

export interface SalesforceLeadCreateInput {
  FirstName?: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  MobilePhone?: string;
  Title?: string;
  Company: string;
  Department?: string;
  Street?: string;
  City?: string;
  State?: string;
  PostalCode?: string;
  Country?: string;
  LeadSource?: string;
  Status?: string;
  Rating?: string;
  AnnualRevenue?: number;
  NumberOfEmployees?: number;
  Description?: string;
  Industry?: string;
  Website?: string;
}

export interface SalesforceLeadUpdateInput extends Partial<SalesforceLeadCreateInput> {
  Id: string;
}

// ============ Contact Types ============

export interface SalesforceContact {
  Id: string;
  FirstName?: string;
  LastName: string;
  Name?: string;
  Email?: string;
  Phone?: string;
  MobilePhone?: string;
  Title?: string;
  Department?: string;
  AccountId?: string;
  AccountName?: string;
  ReportsToId?: string;
  Birthdate?: string;
  MailingStreet?: string;
  MailingCity?: string;
  MailingState?: string;
  MailingPostalCode?: string;
  MailingCountry?: string;
  Description?: string;
  OwnerId?: string;
  CreatedDate?: string;
  LastModifiedDate?: string;
}

export interface SalesforceContactCreateInput {
  FirstName?: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  MobilePhone?: string;
  Title?: string;
  Department?: string;
  AccountId?: string;
  ReportsToId?: string;
  Birthdate?: string;
  MailingStreet?: string;
  MailingCity?: string;
  MailingState?: string;
  MailingPostalCode?: string;
  MailingCountry?: string;
  Description?: string;
}

export interface SalesforceContactUpdateInput extends Partial<SalesforceContactCreateInput> {
  Id: string;
}

// ============ Account Types ============

export interface SalesforceAccount {
  Id: string;
  Name: string;
  Type?: string;
  Industry?: string;
  AnnualRevenue?: number;
  NumberOfEmployees?: number;
  Description?: string;
  Website?: string;
  Phone?: string;
  Fax?: string;
  BillingStreet?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingPostalCode?: string;
  BillingCountry?: string;
  ShippingStreet?: string;
  ShippingCity?: string;
  ShippingState?: string;
  ShippingPostalCode?: string;
  ShippingCountry?: string;
  OwnerId?: string;
  CreatedDate?: string;
  LastModifiedDate?: string;
}

export interface SalesforceAccountCreateInput {
  Name: string;
  Type?: string;
  Industry?: string;
  AnnualRevenue?: number;
  NumberOfEmployees?: number;
  Description?: string;
  Website?: string;
  Phone?: string;
  Fax?: string;
  BillingStreet?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingPostalCode?: string;
  BillingCountry?: string;
}

export interface SalesforceAccountUpdateInput extends Partial<SalesforceAccountCreateInput> {
  Id: string;
}

// ============ Opportunity Types ============

export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  AccountId?: string;
  AccountName?: string;
  Type?: string;
  LeadSource?: string;
  StageName: string;
  Amount?: number;
  CloseDate: string;
  NextStep?: string;
  Description?: string;
  Probability?: number;
  ForecastCategory?: string;
  CampaignId?: string;
  OwnerId?: string;
  OwnerName?: string;
  IsClosed?: boolean;
  IsWon?: boolean;
  FiscalYear?: number;
  FiscalQuarter?: number;
  CreatedDate?: string;
  LastModifiedDate?: string;
}

export interface SalesforceOpportunityCreateInput {
  Name: string;
  AccountId?: string;
  Type?: string;
  LeadSource?: string;
  StageName: string;
  Amount?: number;
  CloseDate: string;
  NextStep?: string;
  Description?: string;
  Probability?: number;
  ForecastCategory?: string;
  CampaignId?: string;
}

export interface SalesforceOpportunityUpdateInput extends Partial<SalesforceOpportunityCreateInput> {
  Id: string;
}

// ============ Query Types ============

export interface SalesforceQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
}

export interface SalesforceQueryParams {
  where?: string;
  fields?: string[];
  orderBy?: string;
  limit?: number;
  offset?: number;
}

// ============ API Types ============

export interface SalesforceError {
  message: string;
  errorCode: string;
  fields?: string[];
}

export interface SalesforceAPIError {
  error: string;
  error_description: string;
}

export interface SalesforceCompositeRequest {
  compositeRequest: SalesforceCompositeSubRequest[];
  prettyPrint?: boolean;
}

export interface SalesforceCompositeSubRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  referenceId: string;
  body?: Record<string, unknown>;
}

export interface SalesforceCompositeResponse {
  compositeResponse: SalesforceCompositeSubResponse[];
}

export interface SalesforceCompositeSubResponse {
  httpStatusCode: number;
  referenceId: string;
  body: Record<string, unknown> | SalesforceError[];
}

// ============ Pagination Types ============

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface CursorPaginationParams {
  pageSize?: number;
  nextRecordsUrl?: string;
}

// ============ Webhook Types ============

export interface SalesforceWebhookPayload {
  id: string;
  entity: string;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  fieldsChanged?: string[];
  record?: Record<string, unknown>;
  previousRecord?: Record<string, unknown>;
}

export interface SalesforceWebhookEvent {
  type: string;
  payload: SalesforceWebhookPayload;
  timestamp: string;
}

// ============ Observer Types ============

export interface ObserverEvent {
  source: string;
  type: string;
  employeeId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ============ API Response Wrappers ============

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: SalesforceError[];
  };
}

export interface ListResponse<T> {
  records: T[];
  total: number;
  hasMore: boolean;
  nextRecordsUrl?: string;
}