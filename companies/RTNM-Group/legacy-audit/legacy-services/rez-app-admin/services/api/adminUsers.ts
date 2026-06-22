import { apiClient } from './apiClient';

export interface AdminUserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role?: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  assignedTickets: number;
}

export interface CreateAdminData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role?: string;
}

export interface UpdateAdminData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  isActive?: boolean;
  password?: string;
}

// Bulk operation types
export interface BulkRoleUpdate {
  userIds: string[];
  newRole: string;
}

export interface BulkStatusUpdate {
  userIds: string[];
  isActive: boolean;
}

export interface BulkOperationResult {
  success: string[];
  failed: { id: string; error: string }[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

class AdminUserProfilesService {
  async listAdmins(): Promise<AdminUserProfile[]> {
    const response = await apiClient.get<{ adminUsers: AdminUserProfile[] }>('admin/admin-users');
    if (!response.success) {
      throw new Error(response.message || 'Failed to load admin users');
    }
    return response.data?.adminUsers || [];
  }

  async createAdmin(data: CreateAdminData): Promise<AdminUserProfile> {
    const response = await apiClient.post<{ adminUser: AdminUserProfile }>(
      'admin/admin-users',
      data as any
    );
    if (!response.success || !response.data?.adminUser) {
      throw new Error(response.message || 'Failed to create admin user');
    }
    return response.data.adminUser;
  }

  async updateAdmin(id: string, data: UpdateAdminData): Promise<AdminUserProfile> {
    const response = await apiClient.put<{ adminUser: AdminUserProfile }>(
      `admin/admin-users/${id}`,
      data as any
    );
    if (!response.success || !response.data?.adminUser) {
      throw new Error(response.message || 'Failed to update admin user');
    }
    return response.data.adminUser;
  }

  async deactivateAdmin(id: string): Promise<void> {
    const response = await apiClient.delete(`admin/admin-users/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to deactivate admin user');
    }
  }

  // ============ BULK OPERATIONS ============

  /**
   * Update roles for multiple admin users at once
   */
  async bulkUpdateRoles(data: BulkRoleUpdate): Promise<BulkOperationResult> {
    const response = await apiClient.post<BulkOperationResult>(
      'admin/admin-users/bulk/role',
      data
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to bulk update roles');
    }
    return response.data!;
  }

  /**
   * Update active status for multiple admin users at once
   */
  async bulkUpdateStatus(data: BulkStatusUpdate): Promise<BulkOperationResult> {
    const response = await apiClient.post<BulkOperationResult>(
      'admin/admin-users/bulk/status',
      data
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to bulk update status');
    }
    return response.data!;
  }

  /**
   * Delete multiple admin users at once
   */
  async bulkDelete(userIds: string[]): Promise<BulkOperationResult> {
    const response = await apiClient.post<BulkOperationResult>(
      'admin/admin-users/bulk/delete',
      { userIds }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to bulk delete users');
    }
    return response.data!;
  }

  /**
   * Get paginated admin users with server-side filtering
   */
  async getPaginatedAdmins(options: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  } = {}): Promise<{
    data: AdminUserProfile[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page = 1, limit = 50, search, role, isActive } = options;

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    if (isActive !== undefined) params.set('isActive', String(isActive));

    const response = await apiClient.get<{
      data: AdminUserProfile[];
      pagination: any;
    }>(`admin/admin-users/paginated?${params.toString()}`);

    if (!response.success) {
      throw new Error(response.message || 'Failed to get paginated admins');
    }

    return response.data!;
  }
}

export const adminUsersService = new AdminUserProfilesService();
export default adminUsersService;
