/**
 * GENIE Privacy Service - Type Definitions
 * Version: 1.0.0 | Date: June 13, 2026
 */

export interface PrivacySettings {
  user_id: string;
  data_retention_days: number;
  share_data_with_third_parties: boolean;
  allow_analytics: boolean;
  allow_personalization: boolean;
  marketing_opt_in: boolean;
  consent_given_at?: string;
  last_updated: string;
}

export interface DataExport {
  id: string;
  user_id: string;
  format: 'json' | 'csv' | 'pdf';
  requested_at: string;
  completed_at?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url?: string;
}

export interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: string;
  granted: boolean;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}
