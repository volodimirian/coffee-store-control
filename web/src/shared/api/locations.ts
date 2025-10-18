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
  // Получить все локации пользователя
  getMyLocations: async (): Promise<LocationsListResponse> => {
    const response = await api.get('/businesses/my', {
      params: { is_active: true }
    });
    return response.data;
  },

  // Получить принадлежащие пользователю локации
  getOwnedLocations: async (): Promise<LocationsListResponse> => {
    const response = await api.get('/businesses/owned', {
      params: { is_active: true }
    });
    return response.data;
  },

  // Получить конкретную локацию
  getLocation: async (id: number): Promise<Location> => {
    const response = await api.get(`/businesses/${id}`);
    return response.data;
  },

  // Создать новую локацию
  createLocation: async (data: LocationCreate): Promise<Location> => {
    const response = await api.post('/businesses/', data);
    return response.data;
  },

  // Обновить локацию
  updateLocation: async (id: number, data: LocationUpdate): Promise<Location> => {
    const response = await api.put(`/businesses/${id}`, data);
    return response.data;
  },

  // Удалить локацию (soft delete)
  deleteLocation: async (id: number): Promise<void> => {
    await api.delete(`/businesses/${id}`);
  },

  // Получить участников локации
  getLocationMembers: async (id: number): Promise<LocationMembersResponse> => {
    const response = await api.get(`/businesses/${id}/members`);
    return response.data;
  },

  // Добавить участника в локацию
  addLocationMember: async (businessId: number, data: UserLocationCreate): Promise<void> => {
    await api.post(`/businesses/${businessId}/members`, data);
  },

  // Обновить роль участника
  updateLocationMember: async (
    businessId: number,
    userId: number,
    data: UserLocationUpdate
  ): Promise<void> => {
    await api.put(`/businesses/${businessId}/members/${userId}`, data);
  },

  // Удалить участника из локации
  removeLocationMember: async (businessId: number, userId: number): Promise<void> => {
    await api.delete(`/businesses/${businessId}/members/${userId}`);
  },
};