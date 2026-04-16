npm install nativewind expo-router expo-safe-area-context @react-native-community/cliimport React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { ParkingSessionResult, ReservationResult } from '../lib/reservations';

type Props = {
  locationName: string;
  locationAddress: string;
  slotCountLabel: string;
  isLoading: boolean;
  notificationLabel: string;
  notificationMessage: string;
  isRefreshingNotifications: boolean;
  currentReservation: ReservationResult | null;
  currentSession: ParkingSessionResult | null;
  onStartReservation: () => void;
  onViewSession: () => void;
  onEnableNotifications: () => void;
};

export function HomeScreen({
  locationName,
  locationAddress,
  slotCountLabel,
  isLoading,
  notificationLabel,
  notificationMessage,
  isRefreshingNotifications,
  currentReservation,
  currentSession,
  onStartReservation,
  onViewSession,
  onEnableNotifications,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeaderRow}>
          <View>
            <Text style={styles.kickerText}>Your Location</Text>
            <Text style={styles.heroTitle}>{locationName}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{isLoading ? '🔄' : '✓'}</Text>
          </View>
        </View>
        <Text style={styles.heroSubtitle}>{locationAddress}</Text>
      </View>

      <View style={styles.primaryCard}>
        <Text style={styles.primaryCardLabel}>Available Slots</Text>
        <Text style={styles.primaryCardValue}>{slotCountLabel}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={onStartReservation}>
          <Text style={styles.primaryButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      {currentSession || currentReservation ? (
        <View style={styles.liveCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Active Session</Text>
              <Text style={styles.cardTitle}>In Progress</Text>
            </View>
            <Text style={styles.cardBadge}>Live</Text>
          </View>
          <TouchableOpacity style={styles.secondaryButton} onPress={onViewSession}>
            <Text style={styles.secondaryButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardLabel}>{notificationLabel}</Text>
        </View>
        <Text style={styles.cardHelper}>{notificationMessage}</Text>
        <TouchableOpacity
          style={[styles.noticeButton, isRefreshingNotifications ? styles.noticeButtonDisabled : null]}
          onPress={onEnableNotifications}
          disabled={isRefreshingNotifications}
        >
          <Text style={styles.noticeButtonText}>{isRefreshingNotifications ? 'Checking...' : 'Enable'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#111c2d',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1b2b43',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3dd6a5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 20,
  },
  kickerText: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#f4f7fb',
    fontSize: 26,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#b8c7da',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryCard: {
    backgroundColor: '#0c1626',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#1b2b43',
  },
  primaryCardLabel: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  primaryCardValue: {
    color: '#3dd6a5',
    fontSize: 32,
    fontWeight: '900',
  },
  liveCard: {
    backgroundColor: '#08111d',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#18283f',
  },
  card: {
    backgroundColor: '#08111d',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#18283f',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardLabel: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardTitle: {
    color: '#f4f7fb',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  cardBadge: {
    color: '#3dd6a5',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardHelper: {
    color: '#b8c7da',
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: '#3dd6a5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#071018',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#1a2e49',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#26405f',
  },
  secondaryButtonText: {
    color: '#f4f7fb',
    fontWeight: '700',
    fontSize: 15,
  },
  noticeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a2e49',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#26405f',
  },
  noticeButtonDisabled: {
    opacity: 0.6,
  },
  noticeButtonText: {
    color: '#f4f7fb',
    fontWeight: '700',
    fontSize: 13,
  },
});
