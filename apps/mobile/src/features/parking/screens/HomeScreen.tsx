import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
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
import {
  AlertTriangle,
  CarFront,
  ChevronRight,
  CreditCard,
  Info,
  MapPin,
  Menu,
  Search,
  Settings,
  SlidersHorizontal,
  User,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { useMobileParkingData } from '../../../providers/MobileParkingDataProvider';
import { formatDistance } from '../../../utils/format';
import { AuthActionButton, AuthLogo } from '../../auth/components/AuthPrimitives';
import { BottomNav } from '../../../components/navigation/BottomNav';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import type { ParkingLot } from '../types';

type BuildingType = 'All' | 'Mall' | 'Commercial' | 'Office';

type DrawerItem = {
  icon: LucideIcon;
  label: string;
  sublabel: string;
  onPress: () => void;
};

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
  const [showDrawer, setShowDrawer] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [pendingLot, setPendingLot] = useState<ParkingLot | null>(null);
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
  const requiresAuth = auth.isGuest || (!auth.user && !auth.isLoading);
  const isInitialLoading = isLoading && lots.length === 0;

  const quickAction = session
    ? {
        title: 'Active session',
        copy: `Slot ${session.slot.number} at ${session.lotName}`,
        onPress: () => router.push('/session'),
      }
    : booking
      ? {
          title: 'Reservation saved',
          copy: `Open the entry pass for slot ${booking.slot.number}`,
          onPress: () => router.push('/arrival'),
        }
      : completedSession
        ? {
            title: 'Latest receipt',
            copy: `View ${completedSession.receiptNumber} from ${completedSession.lotName}`,
            onPress: () => router.push('/receipt'),
          }
        : featuredLot
          ? {
              title: 'Walk-In Parking',
              copy: 'Already at the facility? Pay & park instantly',
              onPress: () => router.push({ pathname: '/walkin-confirm', params: { lotId: featuredLot.id } }),
            }
          : null;

  const drawerItems: DrawerItem[] = [
    {
      icon: User,
      label: 'My Profile',
      sublabel: 'Edit name, photo',
      onPress: () => showComingSoon('My Profile'),
    },
    {
      icon: CreditCard,
      label: 'Payment Methods',
      sublabel: 'Cards, GCash, Maya',
      onPress: () => showComingSoon('Payment Methods'),
    },
    {
      icon: Settings,
      label: 'Settings',
      sublabel: 'Notifications, privacy',
      onPress: () => showComingSoon('Settings'),
    },
    {
      icon: AlertTriangle,
      label: 'Report an Issue',
      sublabel: 'Help & support',
      onPress: () => showComingSoon('Report an Issue'),
    },
    {
      icon: Info,
      label: 'About ParkingPH',
      sublabel: 'Version, terms, contact',
      onPress: () => showComingSoon('About ParkingPH'),
    },
  ];

  function showComingSoon(label: string) {
    setShowDrawer(false);
    Alert.alert(label, 'This destination is in the latest design but is not implemented in the mobile app yet.');
  }

  function handleLotPress(lot: ParkingLot) {
    if (requiresAuth) {
      setPendingLot(lot);
      setShowGuestModal(true);
      return;
    }

    router.push({ pathname: '/reservation/[lotId]', params: { lotId: lot.id } });
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  const authReturnTo = pendingLot ? `/reservation/${pendingLot.id}` : '/home';

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingPage}>
          <View style={styles.loadingHeader}>
            <AuthLogo />
          </View>
          <View style={styles.loadingBody}>
            <ActivityIndicator size="small" color="#0F766E" />
            <Text style={styles.loadingTitle}>Loading parking data</Text>
            <Text style={styles.loadingCopy}>Fetching live lot availability and layout.</Text>
          </View>
          <BottomNav activeTab="search" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor="#0F766E" />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
            <View style={[styles.maxWidth, { maxWidth: contentWidth }]}>
              <View
                style={[
                  styles.headerShell,
                  {
                    marginHorizontal: -horizontalPadding,
                    paddingHorizontal: horizontalPadding,
                  },
                ]}
              >
              <View style={styles.headerTopRow}>
                <View style={styles.headerBrandRow}>
                  <AuthLogo />
                  {isGuest ? <GuestBadge label="Guest" /> : null}
                </View>

                <Pressable onPress={() => router.push('/menu')} style={styles.headerIconButton} hitSlop={8}>
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
                <ChevronRight color="rgba(255,255,255,0.82)" size={18} strokeWidth={2.2} />
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

        <BottomNav activeTab="search" />
      </View>

      <Modal animationType="fade" transparent visible={showDrawer} onRequestClose={() => setShowDrawer(false)}>
        <Pressable style={styles.drawerBackdrop} onPress={() => setShowDrawer(false)}>
          <Pressable style={styles.drawerSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.drawerHandleWrap}>
              <View style={styles.drawerHandle} />
            </View>
            <View style={styles.drawerContent}>
              <Text style={styles.drawerEyebrow}>QUICK ACCESS</Text>
              <View style={styles.drawerItemList}>
                {drawerItems.map((item) => (
                  <Pressable key={item.label} onPress={item.onPress} style={styles.drawerItem}>
                    <View style={styles.drawerItemIconWrap}>
                      <item.icon color="#0F766E" size={18} strokeWidth={2.2} />
                    </View>
                    <View style={styles.drawerItemCopy}>
                      <Text style={styles.drawerItemTitle}>{item.label}</Text>
                      <Text style={styles.drawerItemSubtitle}>{item.sublabel}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal animationType="slide" transparent visible={showGuestModal} onRequestClose={() => setShowGuestModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalIconWrap}>
              <View style={styles.modalIconBubble}>
                <MapPin color="#F97316" size={24} strokeWidth={2.2} />
              </View>
            </View>

            <Text style={styles.modalTitle}>Sign In Required</Text>
            <Text style={styles.modalCopy}>Sign in to reserve a parking space.</Text>

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
              <Pressable onPress={() => setShowGuestModal(false)} style={styles.modalCancelButton}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
            <View style={styles.metricValueRow}>
              <Text style={[styles.metricValue, { color: availabilityColor }]}>{lot.availableSlots}</Text>
              <Text style={styles.metricValueSuffix}>/{lot.totalSlots}</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabelStandalone}>Starting at</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricValuePrice}>PHP {lot.pricePerHour}</Text>
              <Text style={styles.metricValueSuffix}>/hr</Text>
            </View>
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

function GuestBadge({ label }: { label: string }) {
  return (
    <View style={styles.guestBadge}>
      <Text style={styles.guestBadgeText}>{label}</Text>
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
  loadingPage: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  loadingHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  loadingBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  loadingTitle: {
    color: '#1E293B',
    fontSize: 17,
    lineHeight: 23,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  loadingCopy: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  page: {
    flex: 1,
  },
  inner: {
    width: '100%',
    alignItems: 'center',
  },
  maxWidth: {
    width: '100%',
    gap: 16,
    paddingTop: 0,
  },
  headerShell: {
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 14,
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
  headerIconButton: {
    padding: 4,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
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
    width: 46,
    height: 46,
    borderRadius: 12,
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
    fontSize: 11,
    lineHeight: 15,
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
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#0F766E',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#0F766E',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  walkInIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
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
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_700Bold',
  },
  walkInCopy: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 0,
  },
  resultsCopy: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 19,
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
    fontSize: 11,
    lineHeight: 13,
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
    gap: 12,
  },
  lotCard: {
    overflow: 'hidden',
    borderRadius: 18,
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
    padding: 16,
    gap: 12,
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
    lineHeight: 21,
    fontFamily: 'Poppins_600SemiBold',
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
  },
  distanceBadge: {
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  distanceBadgeText: {
    color: '#16A34A',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  metricCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 80,
    justifyContent: 'space-between',
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_400Regular',
  },
  metricLabelStandalone: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 4,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    columnGap: 2,
  },
  metricValue: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Poppins_700Bold',
    includeFontPadding: false,
  },
  metricValuePrice: {
    color: '#0F766E',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Poppins_700Bold',
    includeFontPadding: false,
  },
  metricValueSuffix: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
    includeFontPadding: false,
  },
  viewDetailsButton: {
    height: 40,
    borderRadius: 10,
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
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 6,
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
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  drawerBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  drawerHandleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  drawerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  drawerContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 24,
  },
  drawerEyebrow: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 8,
  },
  drawerItemList: {
    gap: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  drawerItemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerItemCopy: {
    flex: 1,
  },
  drawerItemTitle: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  drawerItemSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    marginTop: 1,
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
  modalIconWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  modalIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
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
  modalCancelButton: {
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
});
