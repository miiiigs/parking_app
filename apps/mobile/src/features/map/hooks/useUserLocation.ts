import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useMapStore, Location as LocationType } from '@/store';
import { REFRESH_INTERVALS, MANILA_CENTER } from '@/constants';

/**
 * Hook to track user's GPS location
 */
export function useUserLocation() {
  const { setUserLocation, setError } = useMapStore();
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          // Use default location (Manila)
          setUserLocation(MANILA_CENTER);
          return;
        }

        setIsTracking(true);

        // Start watching location
        locationSubscription =
          await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: REFRESH_INTERVALS.GPS_UPDATE,
              distanceInterval: 10, // Update every 10 meters
            },
            (location) => {
              const newLocation: LocationType = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              };
              setUserLocation(newLocation);
            }
          );
      } catch (err: any) {
        console.error('Error accessing location:', err);
        setError('Failed to get location');
        // Fallback to default location
        setUserLocation(MANILA_CENTER);
      }
    };

    startTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  return { isTracking };
}
