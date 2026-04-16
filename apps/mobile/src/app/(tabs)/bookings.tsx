import React from 'react';
import { View, Text, SafeAreaView, StyleSheet, FlatList } from 'react-native';
import { useParkingStore } from '@/store';
import { Card, Button } from '@/components';
import { COLORS, SPACING } from '@/constants';

export default function BookingsScreen() {
  const { bookingHistory, currentBooking } = useParkingStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      {currentBooking && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Booking</Text>
          <Card>
            <Text style={styles.parkingName}>Active Session</Text>
            <Text style={styles.info}>Booking ID: {currentBooking.id}</Text>
            <Text style={styles.info}>Status: {currentBooking.status}</Text>
            <Text style={styles.info}>Price: ₱{currentBooking.price}</Text>
          </Card>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>History</Text>
        {bookingHistory.length > 0 ? (
          <FlatList
            scrollEnabled={false}
            data={bookingHistory}
            renderItem={({ item }) => (
              <Card style={styles.historyCard}>
                <Text style={styles.parkingName}>Booking #{item.id}</Text>
                <Text style={styles.info}>Vehicle: {item.vehicle_plate}</Text>
                <Text style={styles.info}>Status: {item.status}</Text>
                <Text style={styles.info}>Amount: ₱{item.price}</Text>
              </Card>
            )}
            keyExtractor={(item) => item.id}
          />
        ) : (
          <Text style={styles.emptyText}>No booking history yet</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textTertiary,
    marginBottom: SPACING.md,
  },
  historyCard: {
    marginBottom: SPACING.md,
  },
  parkingName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  info: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
