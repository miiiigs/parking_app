import { useEffect, useState, useCallback } from 'react';
import { useMapStore, useParkingStore } from '@/store';
import { parkingService } from '@/services';
import { REFRESH_INTERVALS } from '@/constants';

/**
 * Hook to fetch nearby parking
 */
export function useNearbyParking() {
  const { userLocation, setNearbyParking, setLoading, setError } = useMapStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNearby = useCallback(async () => {
    if (!userLocation) return;

    try {
      setLoading(true);
      const response = await parkingService.getNearbyParking(userLocation);
      setNearbyParking(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch nearby parking');
      console.error('Error fetching nearby parking:', err);
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchNearby();
    setIsRefreshing(false);
  }, [fetchNearby]);

  // Auto-refresh when user location changes
  useEffect(() => {
    fetchNearby();

    // Refresh every 30 seconds
    const interval = setInterval(fetchNearby, REFRESH_INTERVALS.NEARBY_PARKING);
    return () => clearInterval(interval);
  }, [fetchNearby]);

  return { refresh, isRefreshing };
}
