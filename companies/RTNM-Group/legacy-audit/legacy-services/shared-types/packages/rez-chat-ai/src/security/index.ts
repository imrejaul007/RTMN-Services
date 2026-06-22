// ── Security Module ─────────────────────────────────────────────────────────────────
// TEE and secure execution layer for AI chat

export {
  TEEConfig,
  AttestationQuote,
  SecureMemory,
  SealedData,
  TEESealProvider,
  TEEProtectedCredentials,
  TEEContext,
  TEESessionManager,
  getTEEConfig,
  getTEEContext,
  initializeTEEContext,
  destroyTEEContext,
  TEE_ENVIRONMENTS,
} from './tee';

export {
  DataSanitizer,
  sensitiveDataSanitizer,
  cardNumberSanitizer,
  emailSanitizer,
  phoneSanitizer,
  idSanitizer,
  transactionSanitizer,
  defaultSanitizer,
  sanitizeCustomerContext,
  SanitizedCustomerContext,
} from '../sanitizers/sanitize';
