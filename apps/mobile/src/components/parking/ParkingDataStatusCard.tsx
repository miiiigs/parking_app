import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, RefreshCcw, Wifi, WifiOff } from 'lucide-react-native';

type ParkingDataStatus = 'live' | 'stale' | 'demo';

type ParkingDataStatusCardProps = {
  status: ParkingDataStatus;
  error: string | null;
  isRefreshing: boolean;
  lastSyncedAt: number | null;
  onRetry?: () => void;
};

function formatLastSyncLabel(value: number) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - value) / 1000));

  if (elapsedSeconds < 60) {
    return 'just now';
  }

  if (elapsedSeconds < 3600) {
    return `${Math.floor(elapsedSeconds / 60)} min ago`;
  }

  return `${Math.floor(elapsedSeconds / 3600)} hr ago`;
}

export function ParkingDataStatusCard({
  status,
  error,
  isRefreshing,
  lastSyncedAt,
  onRetry,
}: ParkingDataStatusCardProps) {
  if (!error && !isRefreshing && status === 'live') {
    return null;
  }

  const isStale = status === 'stale';
  const isDemo = status === 'demo';
  const title = isRefreshing
    ? 'Refreshing parking data'
    : isStale
      ? 'Using cached parking data'
      : isDemo
        ? 'Demo parking data'
        : 'Live sync issue';
  const description = isRefreshing
    ? 'Updating live parking availability, pricing, and map layout.'
    : isStale
      ? lastSyncedAt
        ? `Showing the last synced parking data from ${formatLastSyncLabel(lastSyncedAt)}.`
        : 'Showing the most recent cached parking data available on this device.'
      : isDemo
        ? 'This device is not connected to live operator-managed parking data yet.'
        : 'Parking data could not be refreshed right now.';
  const Icon = isRefreshing ? RefreshCcw : isStale ? AlertTriangle : isDemo ? WifiOff : Wifi;

  return (
    <View
      style={[
        styles.card,
        isRefreshing ? styles.cardRefreshing : isStale || error ? styles.cardWarning : styles.cardNeutral,
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, isRefreshing ? styles.iconWrapRefreshing : styles.iconWrapWarning]}>
          <Icon color={isRefreshing ? '#0F766E' : '#B45309'} size={16} strokeWidth={2.2} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          {error ? <Text style={styles.meta}>{error}</Text> : null}
        </View>
      </View>

      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.retryButton}>
          <RefreshCcw color="#0F766E" size={14} strokeWidth={2.2} />
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  cardRefreshing: {
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
  },
  cardWarning: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  cardNeutral: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapRefreshing: {
    backgroundColor: '#CCFBF1',
  },
  iconWrapWarning: {
    backgroundColor: '#FEF3C7',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  description: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
  },
  meta: {
    color: '#B45309',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
  },
  retryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  retryText: {
    color: '#0F766E',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
});
