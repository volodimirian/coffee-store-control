import { api } from '~/shared/api/client';
import type {
  Employee,
  EmployeeCreateRequest,
  OwnerEmployeesResponse,
  PermissionGrantRequest,
  PermissionRevokeRequest,
  PermissionBatchRequest,
  PermissionBatchResponse,
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
};
