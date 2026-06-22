/**
 * Hojai Governance UI
 * Version: 1.0 | Date: May 30, 2026 */

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'invited' | 'disabled';
}

export class GovernanceUI {
  async getRoles() {
    return [
      { id: '1', name: 'Owner', permissions: ['*'] },
      { id: '2', name: 'Admin', permissions: ['read', 'write', 'manage_users'] },
      { id: '3', name: 'Manager', permissions: ['read', 'write'] },
      { id: '4', name: 'Agent', permissions: ['read'] }
    ];
  }

  async getUsers() {
    return [
      { id: '1', name: 'John Doe', email: 'john@biz.com', role: 'Admin', status: 'active' }
    ];
  }
}
export default GovernanceUI;
