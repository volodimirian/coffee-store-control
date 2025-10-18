import { api } from '~/shared/api/client';
import type {
  Location,
  LocationCreate,
  LocationUpdate,
  LocationsListResponse,
  LocationMembersResponse,
  UserLocationCreate,
  UserLocationUpdate,
} from '~/shared/types/locations';

export const locationsApi = {
  // Get all user locations (active only)
  getMyLocations: async (): Promise<LocationsListResponse> => {
    const response = await api.get('/businesses/my', {
      params: { is_active: true }
    });
    return response.data;
  },

  // Get all user locations (including inactive/deleted)
  getAllMyLocations: async (): Promise<LocationsListResponse> => {
    const response = await api.get('/businesses/my');
    return response.data;
  },

  // Get specific location by ID
  getLocation: async (id: number): Promise<Location> => {
    const response = await api.get(`/businesses/${id}`);
    return response.data;
  },

  // Create new location
  createLocation: async (data: LocationCreate): Promise<Location> => {
    const response = await api.post('/businesses/', data);
    return response.data;
  },

  // Update existing location
  updateLocation: async (id: number, data: LocationUpdate): Promise<Location> => {
    const response = await api.put(`/businesses/${id}`, data);
    return response.data;
  },

  // Delete location (soft delete)
  deleteLocation: async (id: number): Promise<void> => {
    await api.delete(`/businesses/${id}`);
  },

  // Restore deleted location
  restoreLocation: async (id: number): Promise<Location> => {
    const response = await api.post(`/businesses/${id}/restore`);
    return response.data;
  },

  // Get location members
  getLocationMembers: async (id: number): Promise<LocationMembersResponse> => {
    const response = await api.get(`/businesses/${id}/members`);
    return response.data;
  },

  // Add member to location
  addLocationMember: async (businessId: number, data: UserLocationCreate): Promise<void> => {
    await api.post(`/businesses/${businessId}/members`, data);
  },

  // Update member role
  updateLocationMember: async (
    businessId: number,
    userId: number,
    data: UserLocationUpdate
  ): Promise<void> => {
    await api.put(`/businesses/${businessId}/members/${userId}`, data);
  },

  // Remove member from location
  removeLocationMember: async (businessId: number, userId: number): Promise<void> => {
    await api.delete(`/businesses/${businessId}/members/${userId}`);
  },
};