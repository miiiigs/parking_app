import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CarFront, ChevronRight, MapPin, Menu, Search, SlidersHorizontal, X, Zap } from 'lucide-react-native';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { useMobileParkingData } from '../../../providers/MobileParkingDataProvider';
import { colors } from '../../../theme/tokens';
import { formatDistance } from '../../../utils/format';
import { AuthLogo } from '../../auth/components/AuthPrimitives';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import type { ParkingLot } from '../types';

type BuildingType = 'All' | 'Mall' | 'Commercial' | 'Office';

const BUILDING_TYPES: BuildingType[] = ['All', 'Mall', 'Commercial', 'Office'];

export default function HomeScreen() {
  const router = useRouter();
  const auth = useMobileAuth();
  const { lots, isLiveData, isLoading, refresh } = useMobileParkingData();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();
  const booking = useParkingFlowStore((state) => state.booking);
  const session = useParkingFlowStore((state) => state.session);
  const completedSession = useParkingFlowStore((state) => state.completedSession);
  const isRestoring = useParkingFlowStore((state) => state.isRestoring);
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<BuildingType>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filteredLots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return lots.filter((lot) => {
      const buildingType = classifyBuildingType(lot);
      const matchesQuery = !normalizedQuery
        || `${lot.name} ${lot.address} ${lot.features.join(' ')}`.toLowerCase().includes(normalizedQuery);
      const matchesType = activeType === 'All' || buildingType === activeType;
      return matchesQuery && matchesType;
    });
  }, [activeType, lots, query]);

  const featuredLot = filteredLots[0] ?? lots[0] ?? null;
  const isGuest = auth.isGuest;
  const quickAction = session
    ? {
        title: 'Active session',
        copy: `Slot ${session.slot.number} at ${session.lotName}`,
        buttonLabel: 'Resume session',
        onPress: () => router.push('/session'),
      }
    : booking
      ? {
          title: 'Reservation saved',
          copy: `Open the entry pass for slot ${booking.slot.number}`,
          buttonLabel: 'Open entry pass',
          onPress: () => router.push('/arrival'),
        }
      : completedSession
        ? {
            title: 'Latest receipt',
            copy: `View ${completedSession.receiptNumber} from ${completedSession.lotName}`,
            buttonLabel: 'Open receipt',
            onPress: () => router.push('/receipt'),
          }
        : featuredLot
          ? {
              title: 'Walk-In Parking',
              copy: 'Already at the facility? Reserve your slot now.',
              buttonLabel: 'View details',
              onPress: () => handleLotPress(featuredLot),
            }
          : null;

  function handleLotPress(lot: ParkingLot) {
    router.push(`/reservation/${lot.id}`);
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor="#0F766E" />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.maxWidth, { maxWidth: contentWidth }]}>
            <View style={styles.headerShell}>
              <View style={styles.headerTopRow}>
                <View style={styles.headerBrandRow}>
                  <AuthLogo height={32} />
                  {isGuest ? <GuestBadge label="Guest" /> : null}
                  {!isGuest && !auth.user ? <GuestBadge label="Sign in needed" tone="warning" /> : null}
                </View>

                <Pressable style={styles.headerIconButton} disabled>
                  <Menu color="#1E293B" size={22} strokeWidth={2.2} />
                </Pressable>
              </View>

              <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                  <Search color="#94A3B8" size={17} strokeWidth={2.2} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search parking locations"
                    placeholderTextColor="#94A3B8"
                    style={styles.searchInput}
                  />
                  {query ? (
                    <Pressable onPress={() => setQuery('')} hitSlop={8}>
                      <X color="#94A3B8" size={15} strokeWidth={2.2} />
                    </Pressable>
                  ) : null}
                </View>

                <Pressable
                  onPress={() => setShowFilters((value) => !value)}
                  style={[styles.filterButton, showFilters ? styles.filterButtonActive : null]}
                >
                  <SlidersHorizontal color={showFilters ? '#FFFFFF' : '#64748B'} size={17} strokeWidth={2.2} />
                </Pressable>
              </View>

              {showFilters ? (
                <View style={styles.filterPanel}>
                  <Text style={styles.filterEyebrow}>BUILDING TYPE</Text>
                  <View style={styles.filterChipRow}>
                    {BUILDING_TYPES.map((type) => {
                      const active = activeType === type;
                      return (
                        <Pressable
                          key={type}
                          onPress={() => setActiveType(type)}
                          style={[styles.filterChip, active ? styles.filterChipActive : null]}
                        >
                          <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>{type}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>

            {quickAction && !isGuest ? (
              <Pressable onPress={quickAction.onPress} style={styles.walkInCard}>
                <View style={styles.walkInIcon}>
                  <Zap color="#FFFFFF" size={20} strokeWidth={2.2} />
                </View>
                <View style={styles.walkInCopyBlock}>
                  <Text style={styles.walkInTitle}>{quickAction.title}</Text>
                  <Text style={styles.walkInCopy}>{quickAction.copy}</Text>
                </View>
                <ChevronRight color="rgba(255,255,255,0.8)" size={18} strokeWidth={2.2} />
              </Pressable>
            ) : null}

            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCopy}>
                <Text style={styles.resultsCount}>{filteredLots.length}</Text> parking {filteredLots.length === 1 ? 'lot' : 'lots'} found
              </Text>
              <View style={styles.resultsMetaRow}>
                <View style={styles.nearYouRow}>
                  <MapPin color="#0F766E" size={12} strokeWidth={2.3} />
                  <Text style={styles.nearYouText}>Near You</Text>
                </View>
                <View style={[styles.dataModeBadge, isLiveData ? styles.dataModeLive : styles.dataModeFallback]}>
                  <Text style={[styles.dataModeText, isLiveData ? styles.dataModeTextLive : styles.dataModeTextFallback]}>
                    {isRestoring || isLoading ? 'Syncing' : isLiveData ? 'Live' : 'Sample'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.listSection}>
              {filteredLots.map((lot) => (
                <HomeLotCard key={lot.id} lot={lot} onPress={() => handleLotPress(lot)} />
              ))}

              {filteredLots.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No parking lots matched.</Text>
                  <Text style={styles.emptyCopy}>Try a different location name, address, or filter.</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

function HomeLotCard({ lot, onPress }: { lot: ParkingLot; onPress: () => void }) {
  const availabilityColor = getAvailabilityColor(lot.availableSlots, lot.totalSlots);

  return (
    <View style={styles.lotCard}>
      <View style={styles.lotCardAccent} />
      <View style={styles.lotCardBody}>
        <View style={styles.lotCardTopRow}>
          <View style={styles.lotCardCopy}>
            <Text style={styles.lotCardTitle}>{lot.name}</Text>
            <View style={styles.lotAddressRow}>
              <MapPin color="#94A3B8" size={10} strokeWidth={2.2} />
              <Text style={styles.lotAddress}>{lot.address}</Text>
            </View>
          </View>

          <View style={styles.distanceBadge}>
            <Text style={styles.distanceBadgeText}>{formatDistance(lot.distanceKm)}</Text>
          </View>
        </View>

        <View style={styles.metricCardsRow}>
          <View style={styles.metricCard}>
            <View style={styles.metricLabelRow}>
              <CarFront color="#94A3B8" size={11} strokeWidth={2.2} />
              <Text style={styles.metricLabel}>Available</Text>
            </View>
            <Text style={[styles.metricValue, { color: availabilityColor }]}>
              {lot.availableSlots}
              <Text style={styles.metricValueSuffix}>/{lot.totalSlots}</Text>
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabelStandalone}>Starting at</Text>
            <Text style={styles.metricValuePrice}>
              PHP {lot.pricePerHour}
              <Text style={styles.metricValueSuffix}>/hr</Text>
            </Text>
          </View>
        </View>

        <Pressable onPress={onPress} style={styles.viewDetailsButton}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <ChevronRight color="#FFFFFF" size={14} strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}

function GuestBadge({ label, tone = 'guest' }: { label: string; tone?: 'guest' | 'warning' }) {
  return (
    <View style={[styles.guestBadge, tone === 'warning' ? styles.warningBadge : null]}>
      <Text style={[styles.guestBadgeText, tone === 'warning' ? styles.warningBadgeText : null]}>{label}</Text>
    </View>
  );
}

function classifyBuildingType(lot: ParkingLot): BuildingType {
  const haystack = `${lot.name} ${lot.address} ${lot.features.join(' ')}`.toLowerCase();

  if (haystack.includes('mall')) {
    return 'Mall';
  }

  if (haystack.includes('office') || haystack.includes('business') || haystack.includes('corporate')) {
    return 'Office';
  }

  return 'Commercial';
}

function getAvailabilityColor(available: number, total: number) {
  const ratio = total > 0 ? available / total : 0;

  if (ratio > 0.5) {
    return '#16A34A';
  }

  if (ratio > 0.2) {
    return '#D97706';
  }

  return '#DC2626';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  scrollContent: {
    paddingBottom: 28,
  },
  inner: {
    width: '100%',
    alignItems: 'center',
  },
  maxWidth: {
    width: '100%',
    gap: 18,
    paddingTop: 12,
  },
  headerShell: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    gap: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  guestBadge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  guestBadgeText: {
    color: '#F97316',
    fontSize: 10,
    lineHeight: 13,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.05,
  },
  warningBadge: {
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
  },
  warningBadgeText: {
    color: '#4338CA',
  },
  headerIconButton: {
    padding: 4,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: '#1E293B',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    paddingVertical: 0,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    borderColor: '#0F766E',
    backgroundColor: '#0F766E',
  },
  filterPanel: {
    gap: 8,
  },
  filterEyebrow: {
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.6,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    minHeight: 30,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#0F766E',
  },
  filterChipText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_500Medium',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  walkInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    backgroundColor: '#0F766E',
    paddingHorizontal: 18,
    paddingVertical: 15,
    shadowColor: '#0F766E',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  walkInIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walkInCopyBlock: {
    flex: 1,
    gap: 2,
  },
  walkInTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.04,
  },
  walkInCopy: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.03,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 2,
  },
  resultsCopy: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  resultsCount: {
    color: '#1E293B',
    fontFamily: 'Poppins_700Bold',
  },
  resultsMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nearYouRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nearYouText: {
    color: '#0F766E',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_500Medium',
  },
  dataModeBadge: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dataModeLive: {
    backgroundColor: '#ECFDF5',
  },
  dataModeFallback: {
    backgroundColor: '#FFF7ED',
  },
  dataModeText: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.05,
  },
  dataModeTextLive: {
    color: '#0F766E',
  },
  dataModeTextFallback: {
    color: '#B45309',
  },
  listSection: {
    gap: 14,
  },
  lotCard: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  lotCardAccent: {
    height: 4,
    backgroundColor: '#0F766E',
  },
  lotCardBody: {
    padding: 18,
    gap: 14,
  },
  lotCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  lotCardCopy: {
    flex: 1,
  },
  lotCardTitle: {
    color: '#1E293B',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: -0.12,
  },
  lotAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  lotAddress: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
    letterSpacing: 0.03,
  },
  distanceBadge: {
    borderRadius: 9,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  distanceBadgeText: {
    color: '#16A34A',
    fontSize: 12,
    lineHeight: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  metricCardsRow: {
    flexDirection: 'row',
    gap: 13,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'Poppins_400Regular',
  },
  metricLabelStandalone: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Poppins_700Bold',
  },
  metricValuePrice: {
    color: '#0F766E',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Poppins_700Bold',
  },
  metricValueSuffix: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'Poppins_400Regular',
  },
  viewDetailsButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0F766E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  viewDetailsText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: 0.04,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 20,
    gap: 7,
  },
  emptyTitle: {
    color: '#1E293B',
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptyCopy: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
});
