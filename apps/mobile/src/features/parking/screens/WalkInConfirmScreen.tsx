import { useMemo, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Car, ChevronDown, ChevronLeft, Check, CreditCard, MapPin, Zap } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AuthActionButton, AuthLogo } from '../../auth/components/AuthPrimitives';
import { getRouteParam } from '../../auth/utils';
import { usePaymentMethodsStore } from '../../menu/store/usePaymentMethodsStore';
import { ParkingDataStatusCard } from '../../../components/parking/ParkingDataStatusCard';
import { VehiclePickerSheet } from '../../../components/parking/VehiclePickerSheet';
import { useMobileParkingData } from '../../../providers/MobileParkingDataProvider';
import { useMobileVehicles } from '../../../providers/MobileVehicleProvider';
import { useWalkInPreferencesStore } from '../store/useWalkInPreferencesStore';
import { formatParkingPricingSummary } from '@parking/shared';

export default function WalkInConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lotId?: string; slotId?: string }>();
  const { lots, isLoading, isRefreshing, status, error, lastSyncedAt, refresh } = useMobileParkingData();
  const { vehicles, selectedVehicle, selectedVehicleId, selectVehicle } = useMobileVehicles();
  const storedPaymentMethod = useWalkInPreferencesStore((state) => state.paymentMethod);
  const setPaymentMethod = useWalkInPreferencesStore((state) => state.setPaymentMethod);
  const wallets = usePaymentMethodsStore((state) => state.wallets);
  const cards = usePaymentMethodsStore((state) => state.cards);
  const lotId = getRouteParam(params.lotId);
  const slotId = getRouteParam(params.slotId);
  const lot = lots.find((entry) => entry.id === lotId) ?? null;
  const slot = lot?.slots.find((entry) => entry.id === slotId) ?? null;
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showVehicleSheet, setShowVehicleSheet] = useState(false);
  const hasSelectedSlot = Boolean(slot);
  const parkingRateSummary = useMemo(() => (lot ? formatParkingPricingSummary(lot.pricingConfig) : 'PHP 0.00/hr'), [lot]);

  const canProceed = hasSelectedSlot && Boolean(storedPaymentMethod) && Boolean(selectedVehicle);

  const selectedPaymentLabel = useMemo(() => storedPaymentMethod ?? 'Tap to select', [storedPaymentMethod]);
  const selectedVehicleLabel = selectedVehicle?.plate ?? 'Tap to choose';
  const selectedVehicleMeta = selectedVehicle
    ? `${selectedVehicle.model} - ${selectedVehicle.color}${vehicles.length > 1 ? ` - ${vehicles.length} saved` : ''}`
    : vehicles.length > 0
      ? `${vehicles.length} saved vehicle${vehicles.length > 1 ? 's' : ''}`
      : 'Add your vehicle details';
  const paymentOptions = useMemo(() => {
    const cardOptions = cards.map((card) => ({
      id: `card-${card.id}`,
      label: `${card.type} **** ${card.last4}`,
      detail: 'Saved card',
    }));
    const walletOptions = wallets
      .filter((wallet) => wallet.linked)
      .map((wallet) => ({
        id: `wallet-${wallet.id}`,
        label: wallet.name,
        detail: wallet.detail,
      }));
    const fallbackOptions = ['Credit / Debit Card', 'GCash', 'Maya']
      .filter((label) => ![...cardOptions, ...walletOptions].some((option) => option.label === label))
      .map((label) => ({
        id: `fallback-${label}`,
        label,
        detail: 'Select as default',
      }));

    return [...cardOptions, ...walletOptions, ...fallbackOptions];
  }, [cards, wallets]);

  if (!lot && isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingTitle}>Loading walk-in parking...</Text>
        <Text style={styles.loadingCopy}>Syncing the selected parking lot and slot details.</Text>
      </View>
    );
  }

  if (!lot) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingTitle}>{error ? 'Unable to load walk-in parking.' : 'Parking lot not found.'}</Text>
        {error ? <Text style={styles.loadingCopy}>{error}</Text> : null}
        <AuthActionButton label="Retry" onPress={() => void refresh()} style={styles.loadingButton} />
        <AuthActionButton label="Back to home" variant="secondary" onPress={() => router.replace('/home')} style={styles.loadingButton} />
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <Stack.Screen
        options={{
          animation: 'none',
          gestureEnabled: true,
        }}
      />

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable onPress={() => router.replace('/home')} style={styles.backButton}>
            <ChevronLeft color="#1E293B" size={20} strokeWidth={2.2} />
          </Pressable>
          <AuthLogo />
          <View style={styles.headerTitleBlock}>
            <Text numberOfLines={1} style={styles.headerLotTitle}>{lot.name}</Text>
            <View style={styles.headerAddressRow}>
              <MapPin color="#94A3B8" size={9} strokeWidth={2.2} />
              <Text numberOfLines={1} style={styles.headerAddress}>{lot.address}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.modeTabsSection}>
        <View style={styles.modeTabsShell}>
          <Pressable
            onPress={() => router.push({ pathname: '/reservation/[lotId]', params: { lotId: lot.id } })}
            style={styles.modeTab}
          >
            <Text style={styles.modeTabText}>Reserve in Advance</Text>
          </Pressable>
          <Pressable style={[styles.modeTab, styles.modeTabActive]}>
            <Zap color="#0F766E" size={12} strokeWidth={2.3} />
            <Text style={[styles.modeTabText, styles.modeTabTextActive]}>Walk-In Parking</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ParkingDataStatusCard
          status={status}
          error={error}
          isRefreshing={isRefreshing}
          lastSyncedAt={lastSyncedAt}
          onRetry={() => void refresh()}
        />

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Zap color="#FFFFFF" size={24} strokeWidth={2.3} />
          </View>
          <View style={styles.heroCopyBlock}>
            <Text style={styles.heroTitle}>Already at the facility?</Text>
            <Text style={styles.heroCopy}>
              {slot
                ? `Generate your entrance QR for slot ${slot.number} at ${lot.name}.`
                : `Set your payment and vehicle details, then choose a walk-in slot at ${lot.name}.`}
            </Text>
          </View>
        </View>

        {!slot ? (
          <View style={styles.noticeCardInfo}>
            <Text style={styles.noticeCopyInfo}>
              Choose a walk-in slot from the reservation map before generating your entrance QR.
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>PAYMENT METHOD</Text>
          <Pressable onPress={() => setShowPaymentSheet(true)} style={styles.selectorCard}>
            <View style={styles.selectorLeading}>
              <View style={[styles.selectorIconWrap, storedPaymentMethod ? styles.selectorIconWrapActive : styles.selectorIconWrapWarning]}>
                <CreditCard color={storedPaymentMethod ? '#FFFFFF' : '#F97316'} size={18} strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.selectorLabel}>{storedPaymentMethod ? 'Selected Payment' : 'Payment Required'}</Text>
                <Text style={[styles.selectorValue, !storedPaymentMethod ? styles.selectorValueWarning : null]}>{selectedPaymentLabel}</Text>
              </View>
            </View>
            <ChevronDown color="#94A3B8" size={18} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>VEHICLE INFORMATION</Text>
          <Pressable onPress={() => setShowVehicleSheet(true)} style={styles.vehicleSelectorCard}>
            <View style={styles.selectorLeading}>
              <View
                style={[
                  styles.selectorIconWrap,
                  selectedVehicle ? styles.selectorIconWrapActive : styles.selectorIconWrapWarning,
                ]}
              >
                <Car color={selectedVehicle ? '#FFFFFF' : '#F97316'} size={18} strokeWidth={2.2} />
              </View>
              <View style={styles.vehicleSelectorCopy}>
                <Text style={styles.selectorLabel}>{selectedVehicle ? 'Selected Vehicle' : 'Vehicle Required'}</Text>
                <Text style={[styles.selectorValue, !selectedVehicle ? styles.selectorValueWarning : null]}>
                  {selectedVehicleLabel}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.vehicleSelectorMeta, !selectedVehicle ? styles.vehicleSelectorMetaWarning : null]}
                >
                  {selectedVehicleMeta}
                </Text>
              </View>
            </View>
            <ChevronDown color="#94A3B8" size={18} strokeWidth={2.2} />
          </Pressable>

          {!selectedVehicle ? (
            <View style={styles.noticeCardWarning}>
              <Text style={styles.noticeCopyWarning}>
                Add or choose a saved vehicle before generating your entrance QR. Your saved vehicles stay available for future walk-in sessions.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.noticeCardSuccess}>
          <Text style={styles.noticeCopySuccess}>
            Metered billing continues inside the mobile session flow. Payment will be tied to {storedPaymentMethod ?? 'your selected method'}.
          </Text>
        </View>

        <View style={styles.noticeCardInfo}>
          <Text style={styles.noticeCopyInfo}>Parking rate: {parkingRateSummary}</Text>
        </View>

        <AuthActionButton
          label={slot ? 'Generate Entrance QR' : 'Choose Walk-In Slot'}
          onPress={() => void (async () => {
            if (!slot) {
              router.push({ pathname: '/reservation/[lotId]', params: { lotId: lot.id, mode: 'walkin' } });
              return;
            }

            router.push({
              pathname: '/walkin-qr',
              params: {
                lotId: lot.id,
                slotId: slot.id,
              },
            });
          })()}
          disabled={!slot ? false : !canProceed}
        />
      </ScrollView>

      <Modal animationType="slide" transparent visible={showPaymentSheet} onRequestClose={() => setShowPaymentSheet(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={() => setShowPaymentSheet(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Payment Method</Text>
            <View style={styles.modalOptionList}>
              {paymentOptions.map((option) => {
                const active = storedPaymentMethod === option.label;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      setPaymentMethod(option.label);
                      setShowPaymentSheet(false);
                    }}
                    style={[styles.modalOptionCard, active ? styles.modalOptionCardActive : null]}
                  >
                    <View style={styles.modalOptionCopy}>
                      <Text style={[styles.modalOptionTitle, active ? styles.modalOptionTitleActive : null]}>{option.label}</Text>
                      <Text style={styles.modalOptionDetail}>{option.detail}</Text>
                    </View>
                    {active ? (
                      <View style={styles.dropdownCheck}>
                        <Check color="#FFFFFF" size={12} strokeWidth={3} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <VehiclePickerSheet
        visible={showVehicleSheet}
        onClose={() => setShowVehicleSheet(false)}
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={(vehicleId) => void selectVehicle(vehicleId)}
        onAddAnother={() => router.push('/edit-vehicle?mode=new')}
        onManageVehicles={() => router.push('/edit-vehicle')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#FAFAF9',
    paddingHorizontal: 24,
  },
  loadingTitle: {
    color: '#1E293B',
    fontSize: 18,
    lineHeight: 24,
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
  loadingButton: {
    alignSelf: 'stretch',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 2,
  },
  headerLotTitle: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'right',
  },
  headerAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  headerAddress: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'right',
  },
  modeTabsSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modeTabsShell: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  modeTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  modeTabText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
  },
  modeTabTextActive: {
    color: '#0F766E',
    fontFamily: 'Poppins_600SemiBold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 22,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    backgroundColor: '#0F766E',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopyBlock: {
    flex: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Poppins_700Bold',
  },
  heroCopy: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    marginTop: 3,
  },
  section: {
    gap: 10,
  },
  sectionEyebrow: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.6,
  },
  selectorCard: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectorLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectorIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorIconWrapActive: {
    backgroundColor: '#0F766E',
  },
  selectorIconWrapWarning: {
    backgroundColor: '#FFF7ED',
  },
  selectorLabel: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
  },
  selectorValue: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 1,
  },
  selectorValueWarning: {
    color: '#F97316',
  },
  dropdownCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleSelectorCard: {
    minHeight: 82,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  vehicleSelectorCopy: {
    flex: 1,
  },
  vehicleSelectorMeta: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    marginTop: 3,
  },
  vehicleSelectorMetaWarning: {
    color: '#C2410C',
  },
  noticeCardWarning: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    padding: 12,
  },
  noticeCopyWarning: {
    color: '#9A3412',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  noticeCardSuccess: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    padding: 16,
  },
  noticeCopySuccess: {
    color: '#065F46',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  noticeCardInfo: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    padding: 12,
  },
  noticeCopyInfo: {
    color: '#1D4ED8',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.42)',
  },
  modalBackdropPressable: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 14,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  modalTitle: {
    color: '#1E293B',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Poppins_600SemiBold',
  },
  modalOptionList: {
    gap: 10,
  },
  modalOptionCard: {
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalOptionCardActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0F766E',
  },
  modalOptionCopy: {
    flex: 1,
  },
  modalOptionTitle: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_500Medium',
  },
  modalOptionTitleActive: {
    color: '#0F766E',
    fontFamily: 'Poppins_600SemiBold',
  },
  modalOptionDetail: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
});

