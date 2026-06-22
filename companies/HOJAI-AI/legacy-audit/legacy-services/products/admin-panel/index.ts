/**
 * Hojai Admin Panel
 * Version: 1.0 | Date: May 30, 2026
 */

export interface AdminDashboard {
  tenants_count: number;
  active_users: number;
  api_calls: number;
  revenue: number;
}

export class AdminPanel {
  async getDashboard() {
    return {
      tenants_count: 150,
      active_users: 1250,
      api_calls: 50000,
      revenue: 2500000
    };
  }
}
export default AdminPanel;
