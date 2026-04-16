import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { MobileProfileData } from '../lib/reservations';

type Props = {
  profileData: MobileProfileData;
  locationName: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenBooking: () => void;
  onOpenHome: () => void;
};

const toneStyles = {
  success: { badge: '#0c1a28', border: '#3dd6a5', text: '#3dd6a5' },
  info: { badge: '#0d1a2a', border: '#7bd3ff', text: '#7bd3ff' },
  warning: { badge: '#2a220f', border: '#ffcf66', text: '#ffcf66' },
  neutral: { badge: '#0f1b2c', border: '#26405f', text: '#f4f7fb' },
} as const;

function getToneStyle(tone: keyof typeof toneStyles) {
  return toneStyles[tone];
}

export function ProfileScreen({ profileData, locationName, isRefreshing, onRefresh, onOpenBooking, onOpenHome }: Props) {
  const avatarLabel = profileData.displayName.trim().charAt(0).toUpperCase() || 'D';
  const latestActivity = profileData.recentActivity[0];

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLabel}</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>Your profile</Text>
            <Text style={styles.title}>{profileData.displayName}</Text>
            <Text style={styles.subtitle}>{profileData.email ?? 'Guest account connected to this device'}</Text>
          </View>
          <Text style={styles.memberPill}>Since {profileData.memberSinceLabel}</Text>
        </View>

        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaCard}>
            <Text style={styles.heroMetaLabel}>Plate</Text>
            <Text style={styles.heroMetaValue}>{profileData.plateNumber}</Text>
          </View>
          <View style={styles.heroMetaCard}>
            <Text style={styles.heroMetaLabel}>Location</Text>
            <Text style={styles.heroMetaValue}>{locationName}</Text>
          </View>
        </View>

        <View style={styles.heroSummaryRow}>
          <View style={styles.heroSummaryPill}>
            <Text style={styles.heroSummaryLabel}>Latest activity</Text>
            <Text style={styles.heroSummaryValue}>{latestActivity?.title ?? 'Ready to book'}</Text>
          </View>
          <View style={styles.heroSummaryPill}>
            <Text style={styles.heroSummaryLabel}>Last updated</Text>
            <Text style={styles.heroSummaryValue}>{profileData.lastUpdatedLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Reservations</Text>
          <Text style={styles.statValue}>{profileData.stats.reservationsCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active</Text>
          <Text style={styles.statValue}>{profileData.stats.activeSessions}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={styles.statValue}>{profileData.stats.completedSessions}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Paid</Text>
          <Text style={styles.statValue}>PHP {profileData.stats.totalBilledAmount.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          <Text style={styles.cardMeta}>{profileData.lastUpdatedLabel}</Text>
        </View>
        <Text style={styles.cardHelper}>A compact history of the latest parking actions from this account.</Text>
        {latestActivity ? (
          <View style={styles.featureCard}>
            <Text style={styles.featureLabel}>Latest journey</Text>
            <Text style={styles.featureTitle}>{latestActivity.title}</Text>
            <Text style={styles.featureText}>{latestActivity.detail}</Text>
          </View>
        ) : null}
        <View style={styles.timeline}>
          {profileData.recentActivity.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No activity yet</Text>
              <Text style={styles.emptyStateText}>Reserve a slot to start building your history.</Text>
            </View>
          ) : null}
          {profileData.recentActivity.map((item) => {
            const toneStyle = getToneStyle(item.tone);

            return (
              <View key={item.id} style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: toneStyle.text }]} />
                <View style={styles.activityBody}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={[styles.activityBadge, { color: toneStyle.text, borderColor: toneStyle.border, backgroundColor: toneStyle.badge }]}>
                      {item.tone}
                    </Text>
                  </View>
                  <Text style={styles.activityDetail}>{item.detail}</Text>
                  <Text style={styles.activityTime}>{new Date(item.timestamp).toLocaleString()}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Last updated</Text>
          <Text style={styles.summaryValue}>{profileData.lastUpdatedLabel}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Member since</Text>
          <Text style={styles.summaryValue}>{profileData.memberSinceLabel}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Preferred plate</Text>
          <Text style={styles.summaryValue}>{profileData.plateNumber}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onOpenHome}>
          <Text style={styles.secondaryButtonText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onRefresh} disabled={isRefreshing}>
          <Text style={styles.secondaryButtonText}>{isRefreshing ? 'Refreshing...' : 'Refresh'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={onOpenBooking}>
          <Text style={styles.primaryButtonText}>Book a Slot</Text>
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
    gap: 14,
    borderWidth: 1,
    borderColor: '#152234',
  },
  heroCard: {
    backgroundColor: '#111c2d',
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#1b2b43',
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#3dd6a5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#071018',
    fontSize: 22,
    fontWeight: '900',
  },
  heroCopy: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: '#f4f7fb',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#b8c7da',
    fontSize: 14,
    lineHeight: 20,
  },
  memberPill: {
    color: '#3dd6a5',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  heroMetaCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#08111d',
    borderRadius: 16,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#18283f',
  },
  heroMetaLabel: {
    color: '#7f94ad',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroMetaValue: {
    color: '#f4f7fb',
    fontSize: 14,
    fontWeight: '800',
  },
  heroSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  heroSummaryPill: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#08111d',
    borderRadius: 16,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#18283f',
  },
  heroSummaryLabel: {
    color: '#7f94ad',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroSummaryValue: {
    color: '#f4f7fb',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 92,
    backgroundColor: '#08111d',
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#18283f',
  },
  statLabel: {
    color: '#7f94ad',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statValue: {
    color: '#f4f7fb',
    fontSize: 16,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#08111d',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#18283f',
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  cardTitle: {
    color: '#f4f7fb',
    fontSize: 16,
    fontWeight: '800',
  },
  cardMeta: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardHelper: {
    color: '#b8c7da',
    fontSize: 13,
    lineHeight: 18,
  },
  featureCard: {
    backgroundColor: '#0c1524',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#21324a',
    gap: 6,
  },
  featureLabel: {
    color: '#7bd3ff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  featureTitle: {
    color: '#f4f7fb',
    fontSize: 15,
    fontWeight: '800',
  },
  featureText: {
    color: '#b8c7da',
    fontSize: 13,
    lineHeight: 18,
  },
  timeline: {
    gap: 12,
  },
  emptyState: {
    backgroundColor: '#0f1b2c',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#18283f',
    gap: 4,
  },
  emptyStateTitle: {
    color: '#f4f7fb',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyStateText: {
    color: '#b8c7da',
    fontSize: 13,
    lineHeight: 18,
  },
  activityItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 8,
  },
  activityBody: {
    flex: 1,
    backgroundColor: '#0f1b2c',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#18283f',
    gap: 6,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  activityTitle: {
    color: '#f4f7fb',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  activityBadge: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  activityDetail: {
    color: '#b8c7da',
    fontSize: 13,
    lineHeight: 18,
  },
  activityTime: {
    color: '#7f94ad',
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    color: '#7f94ad',
    fontSize: 13,
  },
  summaryValue: {
    color: '#f4f7fb',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1.2,
    backgroundColor: '#3dd6a5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#071018',
    fontWeight: '800',
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
  },
});
