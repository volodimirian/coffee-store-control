import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AppContext, type AppContextType } from "~/shared/context/AppContext";
import { locationsApi } from "~/shared/api/locations";
import type { Location, LocationCreate, LocationUpdate, LocationMember } from "~/shared/types/locations";
import { hasToken, logout as helperLogout } from "~/shared/lib/helpers/storageHelpers";
import { setLogoutHandler } from "~/shared/api/client";

export function AppProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [user, setUser] = useState<AppContextType["user"]>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Location state
  const [currentLocation, setCurrentLocationState] = useState<Location | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const setCurrentLocation = (location: Location) => {
    console.log('Manually setting current location:', location);
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
      
      // Check current location
      setCurrentLocationState(current => {
        if (current) {
          // If there's current location, check if it still exists
          const locationExists = response.businesses.find(loc => loc.id === current.id);
          if (locationExists) {
            console.log('Current location is still valid:', current);
            // Update location data in case something changed
            const updatedLocation = locationExists;
            localStorage.setItem('currentLocation', JSON.stringify(updatedLocation));
            return updatedLocation;
          } else {
            // Current location no longer exists
            console.log('Current location no longer exists:', current);
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
          // If no current location, select first available
          if (response.businesses.length > 0) {
            const firstBusiness = response.businesses[0];
            console.log('No current location, selecting first available:', firstBusiness);
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

  // Restore location from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('currentLocation');
    if (saved) {
      try {
        const savedLocation = JSON.parse(saved);
        console.log('Restoring location from localStorage:', savedLocation);
        setCurrentLocationState(savedLocation);
      } catch (error) {
        console.error('Failed to parse saved location:', error);
        localStorage.removeItem('currentLocation');
      }
    }
  }, []);

  // Fetch locations when user is authenticated
  useEffect(() => {
    if (user && hasToken()) {
      fetchLocations();
    } else if (!user && isInitialized) {
      // Only clear when user is definitely not present AND initialization is complete
      setLocations([]);
      setCurrentLocationState(null);
      localStorage.removeItem('currentLocation');
    }
  }, [user, fetchLocations, isInitialized]);

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
    setIsInitialized,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
