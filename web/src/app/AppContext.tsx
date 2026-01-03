import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from '@tanstack/react-query';
import { AppContext, type AppContextType } from "~/shared/context/AppContext";
import { locationsApi } from "~/shared/api/locations";
import { invoicesApi } from "~/shared/api/expenses";
import type { Location, LocationCreate, LocationUpdate, LocationMember } from "~/shared/types/locations";
import { hasToken, logout as helperLogout } from "~/shared/lib/helpers/storageHelpers";
import { setLogoutHandler } from "~/shared/api/client";

export function AppProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AppContextType["user"]>(null);
  
  // Location state
  const [currentLocation, setCurrentLocationState] = useState<Location | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const setCurrentLocation = (location: Location) => {
    setCurrentLocationState(location);
    localStorage.setItem('currentLocation', JSON.stringify(location));
    
    // Invalidate permissions cache when business changes
    queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
  };

  const updateOverdueStatuses = useCallback(async (businessId: number): Promise<void> => {
    try {
      await invoicesApi.updateOverdueStatuses(businessId);
    } catch (err) {
      console.error('Failed to update overdue statuses:', err);
      // Silently fail - this is not critical for the user experience
    }
  }, []);

  const fetchLocations = useCallback(async (): Promise<void> => {
    if (!hasToken()) return;
    
    setIsLoadingLocations(true);
    setLocationsError(null);
    
    try {
      const response = await locationsApi.getMyLocations();
      setLocations(response.businesses);
      
      // ALWAYS read from localStorage first (don't rely on state which may not be updated yet)
      const savedLocationJson = localStorage.getItem('currentLocation');
      let targetLocationId: number | null = null;
      
      if (savedLocationJson) {
        try {
          const savedLocation = JSON.parse(savedLocationJson);
          targetLocationId = savedLocation?.id || null;
        } catch (error) {
          console.error('Failed to parse saved location:', error);
          localStorage.removeItem('currentLocation');
        }
      }
      
      // Check current location
      setCurrentLocationState(() => {
        if (targetLocationId) {
          // Try to find the saved/current location in the response
          const locationExists = response.businesses.find(loc => loc.id === targetLocationId);
          if (locationExists) {
            // Update location data in case something changed
            localStorage.setItem('currentLocation', JSON.stringify(locationExists));
            return locationExists;
          } else {
            // Location no longer exists
            localStorage.removeItem('currentLocation');
            // Select first available
            if (response.businesses.length > 0) {
              const firstBusiness = response.businesses[0];
              localStorage.setItem('currentLocation', JSON.stringify(firstBusiness));
              return firstBusiness;
            }
            return null;
          }
        } else {
          // No saved location, select first available
          if (response.businesses.length > 0) {
            const firstBusiness = response.businesses[0];
            localStorage.setItem('currentLocation', JSON.stringify(firstBusiness));
            return firstBusiness;
          }
          return null;
        }
      });
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocationsError(t('locations.loadingError'));
    } finally {
      setIsLoadingLocations(false);
    }
  }, [t]);

  // Restore location from localStorage on mount (before fetching)
  useEffect(() => {
    const saved = localStorage.getItem('currentLocation');
    if (saved) {
      try {
        const savedLocation = JSON.parse(saved);
        setCurrentLocationState(savedLocation);
      } catch (error) {
        console.error('Failed to parse saved location:', error);
        localStorage.removeItem('currentLocation');
      }
    }
  }, []);

  // Update overdue statuses when current location changes
  useEffect(() => {
    if (currentLocation && hasToken()) {
      updateOverdueStatuses(currentLocation.id);
    }
  }, [currentLocation, updateOverdueStatuses]);

  // Fetch locations when user is authenticated
  useEffect(() => {
    if (user && hasToken()) {
      fetchLocations();
    } else if (!user && !hasToken()) {
      // Only clear locations when user is logged out (no token)
      // Don't clear if user is just not loaded yet (has token but user is null)
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
    
    // Clear all React Query cache (including permissions)
    queryClient.clear();
    
    // Use helper logout function which handles localStorage cleanup and redirect
    helperLogout();
  }, [queryClient]);

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
    updateOverdueStatuses,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
