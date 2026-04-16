import React from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';
import { useMapStore } from '@/store';
import { COLORS } from '@/constants';

interface MapComponentProps {
  onMarkerPress?: (parkingId: string) => void;
}

export const MapComponent = React.forwardRef<MapView, MapComponentProps>(
  ({ onMarkerPress }, ref) => {
    const { userLocation, nearbyParking, mapZoom } = useMapStore();

    if (!userLocation) {
      return (
        <View style={styles.emptyContainer}>
          {/* Placeholder while loading */}
        </View>
      );
    }

    return (
      <MapView
        ref={ref}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation
      >
        {/* Parking markers */}
        {nearbyParking.map((parking) => (
          <Marker
            key={parking.id}
            coordinate={{
              latitude: parking.location.latitude,
              longitude: parking.location.longitude,
            }}
            title={parking.name}
            description={`${parking.available_slots}/${parking.total_slots} available`}
            onPress={() => onMarkerPress?.(parking.id)}
            pinColor={
              parking.available_slots > 0 ? COLORS.success : COLORS.error
            }
          />
        ))}
      </MapView>
    );
  }
);

MapComponent.displayName = 'MapComponent';

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
