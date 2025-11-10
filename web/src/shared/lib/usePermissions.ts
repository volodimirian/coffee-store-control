import { useQuery } from '@tanstack/react-query';
import { permissionsApi } from '~/shared/api/employees';
import { useAppContext } from '~/shared/context/AppContext';
import type { UserPermissionsDetail } from '~/shared/types/locations';

/**
 * Hook to fetch and cache current user's permissions for a specific business
 * Returns null if user or business is not available
 */
export function usePermissions(businessId?: number | null) {
  const { user, currentLocation } = useAppContext();
  
  // Use provided businessId or fall back to currentLocation
  const targetBusinessId = businessId ?? currentLocation?.id;
  
  const { data, isLoading, error } = useQuery<UserPermissionsDetail>({
    queryKey: ['user-permissions', user?.id, targetBusinessId],
    queryFn: async () => {
      if (!user?.id || !targetBusinessId) {
        throw new Error('User ID and Business ID are required');
      }
      return permissionsApi.getUserPermissionsDetail(targetBusinessId, user.id);
    },
    enabled: !!user?.id && !!targetBusinessId,
    staleTime: 5 * 60 * 1000, // 5 minutes - permissions don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  return {
    permissions: data ?? null,
    isLoading,
    error,
  };
}
