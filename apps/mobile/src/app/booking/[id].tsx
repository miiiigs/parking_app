import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Card, Button, Input } from '@/components';
import { useMapStore, useParkingStore } from '@/store';
import { COLORS, SPACING, ARRIVAL_WINDOW_OPTIONS } from '@/constants';

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { nearbyParking } = useMapStore();
  const { setCurrentBooking } = useParkingStore();

  const parking = nearbyParking.find((p) => p.id === id);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [arrivalWindow, setArrivalWindow] = useState(0);
  const [loading, setLoading] = useState(false);

  if (!parking) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Parking not found</Text>
      </SafeAreaView>
    );
  }

  const handleBooking = async () => {
    if (!vehiclePlate) {
      alert('Please enter your vehicle plate');
      return;
    }

    try {
      setLoading(true);
      // Simulate booking API call
      const mockBooking = {
        id: 'booking-' + Date.now(),
        parking_id: parking.id,
        user_id: '1',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 2 * 3600000).toISOString(), // 2 hours
        status: 'active' as const,
        price: parking.price_per_hour * 2,
        vehicle_plate: vehiclePlate,
      };

      setCurrentBooking(mockBooking);
      router.replace('/(tabs)/bookings');
    } catch (err) {
      alert('Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Confirm Booking</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Parking Details */}
        <Card>
          <Text style={styles.parkingName}>{parking.name}</Text>
          <Text style={styles.price}>₱{parking.price_per_hour}/hour</Text>
          <View style={styles.details}>
            <Text style={styles.detailLabel}>Available:</Text>
            <Text style={styles.detailValue}>
              {parking.available_slots}/{parking.total_slots} slots
            </Text>
          </View>
        </Card>

        {/* Booking Form */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Booking Details</Text>

          {/* Vehicle Plate */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Vehicle Plate</Text>
            <Input
              placeholder="ABC-1234"
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              autoCapitalize="characters"
            />
          </View>

          {/* Arrival Window */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Arrival Window</Text>
            <View style={styles.arrivalOptions}>
              {ARRIVAL_WINDOW_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setArrivalWindow(option.value)}
                  style={[
                    styles.optionButton,
                    arrivalWindow === option.value &&
                      styles.optionButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      arrivalWindow === option.value &&
                        styles.optionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration:</Text>
              <Text style={styles.summaryValue}>2 hours</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total:</Text>
              <Text style={styles.summaryTotal}>
                ₱{(parking.price_per_hour * 2).toFixed(2)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            label={loading ? 'Booking...' : 'Confirm Booking'}
            variant="primary"
            size="lg"
            onPress={handleBooking}
            disabled={loading}
            loading={loading}
          />
          <Button
            label="Cancel"
            variant="secondary"
            size="md"
            onPress={() => router.back()}
            style={{ marginTop: SPACING.md }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  parkingName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  detailValue: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
  },
  formCard: {
    marginVertical: SPACING.lg,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textTertiary,
    marginBottom: SPACING.sm,
  },
  arrivalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  optionButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  optionTextActive: {
    color: COLORS.background,
  },
  summary: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  summaryValue: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
  },
  summaryTotal: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  actions: {
    marginTop: SPACING.lg,
  },
  notFound: {
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
