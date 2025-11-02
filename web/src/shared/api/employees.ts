import { api } from '~/shared/api/client';
import type {
  Employee,
  EmployeeCreateRequest,
  OwnerEmployeesResponse,
  PermissionGrantRequest,
  PermissionRevokeRequest,
  PermissionBatchRequest,
  PermissionBatchResponse,
  Permission,
  UserPermissionsDetail,
} from '~/shared/types/locations';

export const employeesApi = {
  // Create new employee and add to business
  createEmployee: async (businessId: number, data: EmployeeCreateRequest): Promise<Employee> => {
    const response = await api.post(`/businesses/${businessId}/employees`, data);
    return response.data;
  },

  // Get all employees for a specific business
  getBusinessEmployees: async (businessId: number, isActive: boolean = true): Promise<Employee[]> => {
    const response = await api.get(`/businesses/${businessId}/employees`, {
      params: { is_active: isActive }
    });
    return response.data;
  },

  // Get all employees across all businesses owned by current user
  getOwnerEmployees: async (): Promise<OwnerEmployeesResponse> => {
    const response = await api.get('/businesses/owner/employees');
    return response.data;
  },

  // Grant one or multiple permissions to a single user
  grantPermissions: async (
    businessId: number,
    userId: number,
    data: PermissionGrantRequest
  ): Promise<PermissionBatchResponse> => {
    const response = await api.post(`/businesses/${businessId}/members/${userId}/permissions/grant`, data);
    return response.data;
  },

  // Revoke one or multiple permissions from a single user
  revokePermissions: async (
    businessId: number,
    userId: number,
    data: PermissionRevokeRequest
  ): Promise<PermissionBatchResponse> => {
    const response = await api.post(`/businesses/${businessId}/members/${userId}/permissions/revoke`, data);
    return response.data;
  },

  // Grant same permissions to multiple users (batch operation)
  grantPermissionsBatch: async (
    businessId: number,
    data: PermissionBatchRequest
  ): Promise<PermissionBatchResponse> => {
    const response = await api.post(`/businesses/${businessId}/permissions/grant-batch`, data);
    return response.data;
  },

  // Revoke same permissions from multiple users (batch operation)
  revokePermissionsBatch: async (
    businessId: number,
    data: PermissionBatchRequest
  ): Promise<PermissionBatchResponse> => {
    const response = await api.post(`/businesses/${businessId}/permissions/revoke-batch`, data);
    return response.data;
  },

  // Update employee role in business (reuse existing member update endpoint)
  updateEmployeeRole: async (
    businessId: number,
    userId: number,
    roleInBusiness: string
  ): Promise<void> => {
    await api.put(`/businesses/${businessId}/members/${userId}`, {
      role_in_business: roleInBusiness
    });
  },

  // Deactivate employee (soft delete from business)
  deactivateEmployee: async (businessId: number, userId: number): Promise<void> => {
    await api.put(`/businesses/${businessId}/members/${userId}`, {
      is_active: false
    });
  },

  // Reactivate employee
  reactivateEmployee: async (businessId: number, userId: number): Promise<void> => {
    await api.put(`/businesses/${businessId}/members/${userId}`, {
      is_active: true
    });
  },

  // Remove employee from business
  removeEmployee: async (businessId: number, userId: number): Promise<void> => {
    await api.delete(`/businesses/${businessId}/members/${userId}`);
  },

  // Search for user by email
  searchUserByEmail: async (email: string): Promise<{
    user_id: number;
    username: string;
    email: string;
    role: string | null;
  }> => {
    const response = await api.get('/businesses/users/search', {
      params: { email }
    });
    return response.data;
  },

  // Assign existing user to business
  assignEmployeeToBusiness: async (
    businessId: number,
    data: { user_id: number; business_id: number; role_in_business: string }
  ): Promise<void> => {
    await api.post(`/businesses/${businessId}/members`, data);
  },
};

// Permissions API
export const permissionsApi = {
  // Get all available permissions in the system
  getAllPermissions: async (isActiveOnly: boolean = true): Promise<Permission[]> => {
    const response = await api.get('/businesses/permissions', {
      params: { is_active_only: isActiveOnly }
    });
    return response.data;
  },

  // Get detailed permission information for a user
  getUserPermissionsDetail: async (
    businessId: number,
    userId: number
  ): Promise<UserPermissionsDetail> => {
    const response = await api.get(`/businesses/${businessId}/members/${userId}/permissions/detail`);
    return response.data;
  },
};
