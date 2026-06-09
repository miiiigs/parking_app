import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '../../../components/layout/Screen';
import { ParkingLotCard } from '../../../components/parking/ParkingLotCard';
import { AppButton } from '../../../components/ui/AppButton';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { SurfaceCard } from '../../../components/ui/SurfaceCard';
import { parkingLots } from '../data/parkingLots';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { colors, radius, spacing, typography } from '../../../theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { booking, session, completedSession } = useParkingFlowStore((state) => ({
    booking: state.booking,
    session: state.session,
    completedSession: state.completedSession,
  }));

  const filteredLots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return parkingLots;
    }

    return parkingLots.filter((lot) => `${lot.name} ${lot.address} ${lot.features.join(' ')}`.toLowerCase().includes(normalizedQuery));
  }, [query]);

  const quickAction = session
    ? {
        tone: 'info' as const,
        label: 'Active session',
        copy: `Slot ${session.slot.number} at ${session.lotName}`,
        buttonLabel: 'Resume session',
        onPress: () => router.push('/session'),
      }
    : booking
      ? {
          tone: 'warning' as const,
          label: 'Reservation saved',
          copy: `Proceed to arrival for slot ${booking.slot.number}`,
          buttonLabel: 'Continue reservation',
          onPress: () => router.push('/arrival'),
        }
      : completedSession
        ? {
            tone: 'success' as const,
            label: 'Latest receipt',
            copy: `View ${completedSession.receiptNumber} from ${completedSession.lotName}`,
            buttonLabel: 'Open receipt',
            onPress: () => router.push('/receipt'),
          }
        : null;

  return (
    <Screen>
      <SurfaceCard style={styles.heroCard}>
        <StatusBadge label="Production-leaning native sample" tone="success" />
        <Text style={styles.heroTitle}>ParkEasy</Text>
        <Text style={styles.heroCopy}>Native Android and iOS flow for finding, reserving, entering, and closing a parking session.</Text>
      </SurfaceCard>

      {quickAction ? (
        <SurfaceCard>
          <StatusBadge label={quickAction.label} tone={quickAction.tone} />
          <Text style={styles.quickActionCopy}>{quickAction.copy}</Text>
          <AppButton label={quickAction.buttonLabel} onPress={quickAction.onPress} />
        </SurfaceCard>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Find nearby parking</Text>
        <Text style={styles.sectionCopy}>Search by lot, district, or facility feature.</Text>
      </View>

      <View style={styles.searchBox}>
        <Search stroke={colors.muted} size={18} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search parking lots"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.listSection}>
        {filteredLots.map((lot) => (
          <ParkingLotCard key={lot.id} lot={lot} onPress={() => router.push(`/reservation/${lot.id}`)} />
        ))}
        {filteredLots.length === 0 ? (
          <SurfaceCard>
            <Text style={styles.emptyTitle}>No parking lots matched.</Text>
            <Text style={styles.emptyCopy}>Try a different district, street, or feature keyword.</Text>
          </SurfaceCard>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  heroTitle: {
    color: colors.surface,
    fontSize: typography.title,
    fontWeight: '800',
  },
  heroCopy: {
    color: '#D7F3E8',
    fontSize: typography.body,
    lineHeight: 22,
  },
  quickActionCopy: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.section,
    fontWeight: '700',
  },
  sectionCopy: {
    color: colors.muted,
    fontSize: typography.body,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    paddingVertical: 0,
  },
  listSection: {
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.section,
    fontWeight: '700',
  },
  emptyCopy: {
    color: colors.muted,
    fontSize: typography.body,
  },
});

