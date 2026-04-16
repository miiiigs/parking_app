import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  locationName: string;
  locationAddress: string;
  slotCountLabel: string;
  isLoading: boolean;
  notificationLabel: string;
  notificationMessage: string;
  isRefreshingNotifications: boolean;
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
  onStartReservation,
  onViewSession,
  onEnableNotifications,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeaderRow}>
          <Text style={styles.kickerText}>Smart Parking</Text>
          <Text style={styles.stateText}>{isLoading ? 'Syncing' : 'Live'}</Text>
        </View>
        <Text style={styles.title}>Guaranteed parking before you arrive.</Text>
        <Text style={styles.subtitle}>
          Reserve a slot, validate on site, and finish the session without extra steps.
        </Text>
        <View style={styles.flowRow}>
          <View style={styles.flowChip}>
            <Text style={styles.flowChipTitle}>Reserve</Text>
            <Text style={styles.flowChipText}>Book before you leave</Text>
          </View>
          <View style={styles.flowChip}>
            <Text style={styles.flowChipTitle}>Validate</Text>
            <Text style={styles.flowChipText}>Scan and confirm fast</Text>
          </View>
          <View style={styles.flowChip}>
            <Text style={styles.flowChipTitle}>Track</Text>
            <Text style={styles.flowChipText}>See history and status</Text>
          </View>
        </View>
      </View>
      <View style={styles.liveCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.liveLabel}>Live Location</Text>
          <Text style={styles.liveStatus}>{isLoading ? 'Loading' : 'Ready'}</Text>
        </View>
        <Text style={styles.liveValue}>{locationName}</Text>
        <Text style={styles.liveHelper}>{locationAddress}</Text>
        <Text style={styles.liveMeta}>{isLoading ? 'Loading live data...' : slotCountLabel}</Text>
      </View>
      <View style={styles.noticeCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.noticeLabel}>{notificationLabel}</Text>
          <Text style={styles.noticeBadge}>Reminders</Text>
        </View>
        <Text style={styles.noticeMessage}>{notificationMessage}</Text>
        <TouchableOpacity
          style={[styles.noticeButton, isRefreshingNotifications ? styles.noticeButtonDisabled : null]}
          onPress={onEnableNotifications}
          disabled={isRefreshingNotifications}
        >
          <Text style={styles.noticeButtonText}>{isRefreshingNotifications ? 'Checking...' : 'Enable reminders'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={onStartReservation}>
          <Text style={styles.primaryButtonText}>Reserve a Slot</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onViewSession}>
          <Text style={styles.secondaryButtonText}>View Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0b1320',
    borderRadius: 28,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#152234',
  },
  heroCard: {
    backgroundColor: '#111c2d',
    borderRadius: 24,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#1b2b43',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kickerText: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  stateText: {
    color: '#3dd6a5',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: '#f4f7fb',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  subtitle: {
    color: '#b8c7da',
    fontSize: 15,
    lineHeight: 22,
  },
  flowRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  flowChip: {
    flex: 1,
    minWidth: 92,
    backgroundColor: '#08111d',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#18283f',
    gap: 3,
  },
  flowChipTitle: {
    color: '#f4f7fb',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  flowChipText: {
    color: '#b8c7da',
    fontSize: 12,
    lineHeight: 16,
  },
  liveCard: {
    backgroundColor: '#08111d',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#18283f',
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  liveLabel: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  liveValue: {
    color: '#f4f7fb',
    fontSize: 20,
    fontWeight: '800',
  },
  liveHelper: {
    color: '#b8c7da',
    fontSize: 14,
  },
  liveStatus: {
    color: '#3dd6a5',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  liveMeta: {
    color: '#3dd6a5',
    fontSize: 13,
    fontWeight: '800',
  },
  noticeCard: {
    backgroundColor: '#0d1726',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#24374f',
    gap: 10,
  },
  noticeLabel: {
    color: '#f4f7fb',
    fontSize: 15,
    fontWeight: '800',
  },
  noticeBadge: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  noticeMessage: {
    color: '#b8c7da',
    fontSize: 14,
    lineHeight: 20,
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
    opacity: 0.7,
  },
  noticeButtonText: {
    color: '#f4f7fb',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3dd6a5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#071018',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    flex: 1,
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
    fontSize: 16,
  },
});
