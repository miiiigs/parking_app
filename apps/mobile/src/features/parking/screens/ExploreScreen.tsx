import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  CarFront,
  ChevronRight,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';
import {
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BottomNav } from '../../../components/navigation/BottomNav';
import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { useMobileParkingData } from '../../../providers/MobileParkingDataProvider';
import { formatDistance } from '../../../utils/format';
import { AuthActionButton, AuthLogo } from '../../auth/components/AuthPrimitives';
import type { ParkingLot } from '../types';
import { formatParkingPricingSummary } from '@parking/shared';

type BuildingType = 'All' | 'Mall' | 'Commercial' | 'Office';

const BUILDING_TYPES: BuildingType[] = ['All', 'Mall', 'Commercial', 'Office'];

export default function ExploreScreen() {
  const router = useRouter();
  const auth = useMobileAuth();
  const { lots, isRefreshing, refresh } = useMobileParkingData();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<BuildingType>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [pendingLot, setPendingLot] = useState<ParkingLot | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return lots.filter((lot) => {
      const buildingType = classifyBuildingType(lot);
      const haystack = `${lot.name} ${lot.address} ${lot.features.join(' ')}`.toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesType = activeType === 'All' || buildingType === activeType;
      return matchesQuery && matchesType;
    });
  }, [activeType, lots, query]);

  const requiresAuth = auth.isGuest || (!auth.user && !auth.isLoading);
  const authReturnTo = pendingLot ? `/reservation/${pendingLot.id}` : '/explore';

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  function handleLotPress(lot: ParkingLot) {
    if (requiresAuth) {
      setPendingLot(lot);
      setShowGuestModal(true);
      return;
    }

    router.push({ pathname: '/reservation/[lotId]', params: { lotId: lot.id } });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing || isRefreshing} onRefresh={() => void handleRefresh()} tintColor="#0F766E" />}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
            <View style={[styles.maxWidth, { maxWidth: contentWidth }]}>
              <View
                style={[
                  styles.header,
                  {
                    marginHorizontal: -horizontalPadding,
                    paddingHorizontal: horizontalPadding,
                  },
                ]}
              >
                <View style={styles.headerTop}>
                  <AuthLogo height={28} />
                  <View style={styles.headerCopy}>
                    <Text style={styles.headerTitle}>Find Parking</Text>
                    <Text style={styles.headerSubtitle}>Search by location and availability</Text>
                  </View>
                </View>

                <View style={styles.searchRow}>
                  <View style={styles.searchBox}>
                    <Search color="#94A3B8" size={16} strokeWidth={2.2} />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Search locations..."
                      placeholderTextColor="#94A3B8"
                      style={styles.searchInput}
                    />
                    {query ? (
                      <Pressable onPress={() => setQuery('')} hitSlop={8}>
                        <X color="#94A3B8" size={14} strokeWidth={2.2} />
                      </Pressable>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={() => setShowFilters((value) => !value)}
                    style={[styles.filterButton, showFilters ? styles.filterButtonActive : null]}
                  >
                    <SlidersHorizontal color={showFilters ? '#FFFFFF' : '#64748B'} size={16} strokeWidth={2.2} />
                  </Pressable>
                </View>

                {showFilters ? (
                  <View style={styles.filterGroup}>
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
                ) : null}
              </View>

              <View style={styles.resultsHeader}>
                <Text style={styles.resultsText}>
                  <Text style={styles.resultsCount}>{results.length}</Text> {results.length === 1 ? 'result' : 'results'} near you
                </Text>
              </View>

              <View style={styles.list}>
                {results.map((lot) => (
                  <ExploreLotCard key={lot.id} lot={lot} onPress={() => handleLotPress(lot)} />
                ))}
              </View>

              {results.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Search color="#94A3B8" size={22} strokeWidth={2.1} />
                  </View>
                  <Text style={styles.emptyTitle}>No results found</Text>
                  <Text style={styles.emptyCopy}>Try a different search or filter.</Text>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <BottomNav activeTab="explore" />
      </View>

      <Modal animationType="slide" transparent visible={showGuestModal} onRequestClose={() => setShowGuestModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalIconBubble}>
              <AlertTriangle color="#F97316" size={24} strokeWidth={2.2} />
            </View>
            <Text style={styles.modalTitle}>Sign In Required</Text>
            <Text style={styles.modalCopy}>Sign in to reserve a parking space from Explore.</Text>
            <View style={styles.modalActions}>
              <AuthActionButton
                label="Log In"
                onPress={() => {
                  setShowGuestModal(false);
                  router.push({ pathname: '/login', params: { returnTo: authReturnTo } });
                }}
              />
              <AuthActionButton
                label="Register"
                variant="secondary"
                onPress={() => {
                  setShowGuestModal(false);
                  router.push({ pathname: '/register', params: { returnTo: authReturnTo } });
                }}
              />
              <Pressable onPress={() => setShowGuestModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ExploreLotCard({ lot, onPress }: { lot: ParkingLot; onPress: () => void }) {
  const availabilityColor = getAvailabilityColor(lot.availableSlots, lot.totalSlots);
  const availabilityBackground = getAvailabilityBackground(lot.availableSlots, lot.totalSlots);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{lot.name}</Text>
          <View style={styles.addressRow}>
            <MapPin color="#94A3B8" size={10} strokeWidth={2.2} />
            <Text style={styles.addressText}>{lot.address}</Text>
          </View>
        </View>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceBadgeText}>{formatDistance(lot.distanceKm)}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={[styles.metricCard, { backgroundColor: availabilityBackground }]}>
          <View style={styles.metricLabelRow}>
            <CarFront color="#64748B" size={10} strokeWidth={2.2} />
            <Text style={styles.metricLabel}>Available</Text>
          </View>
          <Text style={[styles.metricValue, { color: availabilityColor }]}>
            {lot.availableSlots}
            <Text style={styles.metricValueSuffix}>/{lot.totalSlots}</Text>
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Pricing</Text>
          <Text style={styles.metricDetail}>{formatParkingPricingSummary(lot.pricingConfig)}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Type</Text>
          <Text style={styles.metricDetail}>{classifyBuildingType(lot)}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>Open lot details</Text>
        <ChevronRight color="#CBD5E1" size={16} strokeWidth={2.2} />
      </View>
    </Pressable>
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

function getAvailabilityBackground(available: number, total: number) {
  const ratio = total > 0 ? available / total : 0;

  if (ratio > 0.5) {
    return '#F0FDF4';
  }

  if (ratio > 0.2) {
    return '#FFFBEB';
  }

  return '#FEF2F2';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  page: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  inner: {
    width: '100%',
    alignItems: 'center',
  },
  maxWidth: {
    width: '100%',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.07)',
    paddingTop: 18,
    paddingBottom: 14,
    gap: 14,
  },
  headerTop: {
    gap: 10,
  },
  headerCopy: {
    gap: 4,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Poppins_700Bold',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    paddingVertical: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  filterGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    minHeight: 30,
    borderRadius: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
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
  resultsHeader: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  resultsText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
  },
  resultsCount: {
    color: '#0F172A',
    fontFamily: 'Poppins_700Bold',
  },
  list: {
    gap: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  addressText: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  distanceBadge: {
    borderRadius: 20,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  distanceBadgeText: {
    color: '#0F766E',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  metrics: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 9,
    lineHeight: 12,
    fontFamily: 'Poppins_400Regular',
  },
  metricValue: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_700Bold',
  },
  metricValueSuffix: {
    color: '#94A3B8',
    fontSize: 9,
    lineHeight: 12,
    fontFamily: 'Poppins_400Regular',
  },
  metricDetail: {
    color: '#0F172A',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,23,42,0.05)',
  },
  cardFooterText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_500Medium',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptyCopy: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    marginTop: 6,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  modalIconBubble: {
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#1E293B',
    fontSize: 18,
    lineHeight: 23,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
  },
  modalCopy: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
    marginBottom: 20,
  },
  modalActions: {
    gap: 12,
  },
  modalCancel: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
});
