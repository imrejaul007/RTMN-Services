/**
 * Hojai Consent UI
 * Version: 1.0 | Date: May 30, 2026 */

export interface Consent {
  id: string;
  tenant_id: string;
  customer_id: string;
  purpose: string;
  granted: boolean;
  created_at: string;
}

export class ConsentUI {
  async getConsents(tenant_id: string, customer_id: string) {
    return [
      { id: '1', tenant_id, customer_id, purpose: 'marketing', granted: false, created_at: new Date().toISOString() }
    ];
  }
}
export default ConsentUI;