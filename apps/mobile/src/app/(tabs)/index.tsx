import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView from 'react-native-maps';
import { MapPin, Search } from 'lucide-react-native';
import { Card, ParkingCard, Button, Input } from '@/components';
import { MapComponent } from '@/features/map/components';
import { useUserLocation, useNearbyParking } from '@/features/map/hooks';
import { useMapStore } from '@/store';
import { COLORS, SPACING } from '@/constants';

export default function HomeScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { userLocation, nearbyParking, selectedParking, loading } =
    useMapStore();
  const { isTracking } = useUserLocation();
  const { refresh, isRefreshing } = useNearbyParking();

  const handleMarkerPress = (parkingId: string) => {
    const parking = nearbyParking.find((p) => p.id === parkingId);
    if (parking) {
      useMapStore.setState({ selectedParking: parking });
      setShowBottomSheet(true);
    }
  };

  const handleBookNow = () => {
    if (selectedParking) {
      router.push({
        pathname: '/booking/[id]',
        params: { id: selectedParking.id },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Map */}
      <MapComponent ref={mapRef} onMarkerPress={handleMarkerPress} />

      {/* Search Bar (Floating) */}
      <View style={styles.searchBar}>
        <Input
          placeholder="Search parking..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          editable={false}
          onFocus={() => router.push('/search')}
        />
        <TouchableOpacity
          style={styles.searchIcon}
          onPress={() => router.push('/search')}
        >
          <Search size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Nearby Parking List (Bottom Sheet) */}
      {showBottomSheet && selectedParking ? (
        <View style={styles.bottomSheet}>
          <ParkingCard parking={selectedParking} />
          <Button
            label="Book Now"
            variant="primary"
            size="lg"
            onPress={handleBookNow}
            style={{ width: '100%' }}
          />
          <Button
            label="Close"
            variant="secondary"
            size="md"
            onPress={() => setShowBottomSheet(false)}
            style={{ width: '100%', marginTop: SPACING.md }}
          />
        </View>
      ) : (
        <View style={styles.bottomSheetClosed}>
          <TouchableOpacity
            onPress={() => setShowBottomSheet(true)}
            style={styles.expandButton}
          >
            <View style={styles.expandHandle} />
            <View style={styles.parkingListPreview}>
              {loading ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <View>
                  <MapPin size={16} color={COLORS.primary} />
                  <Text style={styles.parkingCount}>
                    {nearbyParking.length} parking spots nearby
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// Import Text
import { Text } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBar: {
    position: 'absolute',
    top: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 10,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  searchIcon: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bottomSheetClosed: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  expandHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: SPACING.sm,
  },
  parkingListPreview: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  parkingCount: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '50%',
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    padding: SPACING.lg,
  },
});
