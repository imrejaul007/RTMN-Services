// Service Agreement Templates
// These templates provide comprehensive service agreements for NEXABIZZ

export { MasterServiceAgreement } from './MasterServiceAgreement';
export type { MasterServiceAgreementFormData } from './MasterServiceAgreement';

export { ProjectServiceAgreement } from './ProjectServiceAgreement';
export type { ProjectServiceAgreementFormData } from './ProjectServiceAgreement';

export { HourlyServiceAgreement } from './HourlyServiceAgreement';
export type { HourlyServiceAgreementFormData } from './HourlyServiceAgreement';

export { EmergencyServiceAgreement } from './EmergencyServiceAgreement';
export type { EmergencyServiceAgreementFormData } from './EmergencyServiceAgreement';

// Base template exports
export {
  ServiceAgreementPreview,
  generateAgreementHTML,
  downloadAgreementHTML,
} from '../ServiceAgreementTemplate';

export type {
  ServiceAgreementData,
  ServiceScope,
  PricingTerms,
  TimelineDelivery,
  WarrantyTerms,
  TerminationClauses,
  LiabilityLimits,
  DisputeResolution,
  AgreementParties,
} from '../ServiceAgreementTemplate';
