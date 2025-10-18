import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AppContext, type AppContextType } from "~/shared/context/AppContext";
import { locationsApi } from "~/shared/api/locations";
import type { Location, LocationCreate, LocationUpdate, LocationMember } from "~/shared/types/locations";
import { hasToken, logout as helperLogout } from "~/shared/lib/helpers";
import { setLogoutHandler } from "~/shared/api/client";

export function AppProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [user, setUser] = useState<AppContextType["user"]>(null);
  
  // Location state
  const [currentLocation, setCurrentLocationState] = useState<Location | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const setCurrentLocation = (location: Location) => {
    setCurrentLocationState(location);
    localStorage.setItem('currentLocation', JSON.stringify(location));
  };

  const fetchLocations = useCallback(async (): Promise<void> => {
    if (!hasToken()) return;
    
    setIsLoadingLocations(true);
    setLocationsError(null);
    
    try {
      const response = await locationsApi.getMyLocations();
      setLocations(response.businesses);
      
      // Auto-select first location if none selected and locations exist
      if (!currentLocation && response.businesses.length > 0) {
        setCurrentLocation(response.businesses[0]);
      }
      
      // If current location is not in the list anymore, clear it
      if (currentLocation && !response.businesses.find(loc => loc.id === currentLocation.id)) {
        setCurrentLocationState(null);
        localStorage.removeItem('currentLocation');
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocationsError(t('locations.loadingError'));
    } finally {
      setIsLoadingLocations(false);
    }
  }, [currentLocation, t]);

  // Load current location from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('currentLocation');
    if (saved) {
      try {
        setCurrentLocationState(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse saved location:', error);
        localStorage.removeItem('currentLocation');
      }
    }
  }, []);

  // Auto-fetch locations when user is authenticated
  useEffect(() => {
    if (user && hasToken()) {
      fetchLocations();
    } else {
      setLocations([]);
      setCurrentLocationState(null);
      localStorage.removeItem('currentLocation');
    }
  }, [user, fetchLocations]);

  const createLocation = async (data: LocationCreate): Promise<Location> => {
    const newLocation = await locationsApi.createLocation(data);
    await fetchLocations(); // Refresh the list
    return newLocation;
  };

  const updateLocation = async (id: number, data: LocationUpdate): Promise<Location> => {
    const updatedLocation = await locationsApi.updateLocation(id, data);
    await fetchLocations(); // Refresh the list
    
    // Update current location if it was the one being updated
    if (currentLocation?.id === id) {
      setCurrentLocation(updatedLocation);
    }
    
    return updatedLocation;
  };

  const deleteLocation = async (id: number): Promise<void> => {
    await locationsApi.deleteLocation(id);
    await fetchLocations(); // Refresh the list
    
    // Clear current location if it was deleted
    if (currentLocation?.id === id) {
      setCurrentLocationState(null);
      localStorage.removeItem('currentLocation');
    }
  };

  const fetchLocationMembers = async (id: number): Promise<LocationMember[]> => {
    const response = await locationsApi.getLocationMembers(id);
    return response.members;
  };

  const logout = useCallback(() => {
    // Clear user state
    setUser(null);
    
    // Clear location state  
    setCurrentLocationState(null);
    setLocations([]);
    
    // Use helper logout function which handles localStorage cleanup and redirect
    helperLogout();
  }, []);

  // Set up automatic logout handler for API client
  useEffect(() => {
    setLogoutHandler(logout, t);
  }, [logout, t]);

  const contextValue: AppContextType = {
    user,
    setUser,
    logout,
    currentLocation,
    locations,
    isLoadingLocations,
    locationsError,
    setCurrentLocation,
    createLocation,
    updateLocation,
    deleteLocation,
    fetchLocations,
    fetchLocationMembers,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
