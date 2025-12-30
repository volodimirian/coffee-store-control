import { createContext, useContext } from "react";
import type { UserResponse } from "~/shared/api/types";
import type { Location, LocationCreate, LocationUpdate, LocationMember } from "~/shared/types/locations";

export type AppContextType = {
  user: UserResponse | null;
  setUser: (user: UserResponse | null) => void;
  logout: () => void;
  // Location management
  currentLocation: Location | null;
  locations: Location[];
  isLoadingLocations: boolean;
  locationsError: string | null;
  setCurrentLocation: (location: Location) => void;
  createLocation: (data: LocationCreate) => Promise<Location>;
  updateLocation: (id: number, data: LocationUpdate) => Promise<Location>;
  deleteLocation: (id: number) => Promise<void>;
  fetchLocations: () => Promise<void>;
  fetchLocationMembers: (id: number) => Promise<LocationMember[]>;
  // Invoice management
  updateOverdueStatuses: (businessId: number) => Promise<void>;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
