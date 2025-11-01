// Types for working with locations (businesses)
export interface Location {
  id: number;
  name: string;
  city: string;
  address: string;
  owner_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationCreate {
  name: string;
  city: string;
  address: string;
}

export interface LocationUpdate {
  name?: string;
  city?: string;
  address?: string;
  is_active?: boolean;
}

export interface LocationsListResponse {
  businesses: Location[];
  total: number;
}

export interface LocationMember {
  user_id: number;
  username: string;
  email: string;
  role_in_business: string;
  is_active: boolean;
  joined_at: string;
}

export interface LocationMembersResponse {
  members: LocationMember[];
  total: number;
}

export interface UserLocationCreate {
  user_id: number;
  business_id: number;
  role_in_business: string;
}

export interface UserLocationUpdate {
  role_in_business?: string;
  is_active?: boolean;
}

// ============ Employee Management Types ============

export interface Employee {
  user_id: number;
  username: string;
  email: string;
  role_in_business: string;
  is_active: boolean;
  joined_at: string;
  permissions: string[];
}

export interface EmployeeCreateRequest {
  email: string;
  username: string;
  password: string;
  business_id: number;
  role_in_business?: string; // Defaults to "employee"
}

export interface OwnerEmployeesResponse {
  employees: Employee[];
  total: number;
}

export interface PermissionGrantRequest {
  permission_names: string[]; // Can grant multiple permissions to one user
  business_id?: number; // Optional for global permissions
}

export interface PermissionRevokeRequest {
  permission_names: string[]; // Can revoke multiple permissions from one user
  business_id?: number;
}

export interface PermissionBatchRequest {
  user_ids: number[]; // Multiple users
  permission_names: string[]; // Multiple permissions
  business_id?: number;
}

export interface PermissionBatchResult {
  user_id: number;
  permission: string;
  success: boolean;
}

export interface PermissionBatchResponse {
  message: string;
  results: PermissionBatchResult[];
}

// Context for managing active location
export interface LocationContextType {
  currentLocation: Location | null;
  locations: Location[];
  isLoading: boolean;
  error: string | null;
  setCurrentLocation: (location: Location) => void;
  createLocation: (data: LocationCreate) => Promise<Location>;
  updateLocation: (id: number, data: LocationUpdate) => Promise<Location>;
  deleteLocation: (id: number) => Promise<void>;
  fetchLocations: () => Promise<void>;
  fetchLocationMembers: (id: number) => Promise<LocationMember[]>;
}