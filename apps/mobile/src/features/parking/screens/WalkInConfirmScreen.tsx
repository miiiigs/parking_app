import { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Car, ChevronDown, Zap } from 'lucide-react-native';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FlowScreenHeader, AuthActionButton } from '../../auth/components/AuthPrimitives';
import { getRouteParam } from '../../auth/utils';
import { ParkingDataStatusCard } from '../../../components/parking/ParkingDataStatusCard';
import { VehiclePickerSheet } from '../../../components/parking/VehiclePickerSheet';
import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { useMobileParkingData } from '../../../providers/MobileParkingDataProvider';
import { useMobileVehicles } from '../../../providers/MobileVehicleProvider';

export default function WalkInConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lotId?: string }>();
  const { contentWidth, horizontalPadding, isCompact } = useResponsiveMetrics();
  const { lots, isLoading, isRefreshing, status, error, lastSyncedAt, refresh } = useMobileParkingData();
  const { vehicles, selectedVehicle, selectedVehicleId, selectVehicle } = useMobileVehicles();
  const preferredLotId = getRouteParam(params.lotId);
  const preferredLot = lots.find((entry) => entry.id === preferredLotId) ?? lots[0] ?? null;
  const [showVehicleSheet, setShowVehicleSheet] = useState(false);

  const selectedVehicleLabel = selectedVehicle?.plate ?? 'Tap to choose';
  const selectedVehicleMeta = selectedVehicle
    ? `${selectedVehicle.model} - ${selectedVehicle.color}${vehicles.length > 1 ? ` - ${vehicles.length} saved` : ''}`
    : vehicles.length > 0
      ? `${vehicles.length} saved vehicle${vehicles.length > 1 ? 's' : ''}`
      : 'Add your vehicle details';

  if (!preferredLot && isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingTitle}>Loading Park Now...</Text>
        <Text style={styles.loadingCopy}>Syncing the supported parking locations.</Text>
      </View>
    );
  }

  if (!preferredLot && !isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingTitle}>{error ? 'Unable to load Park Now.' : 'No parking lots available.'}</Text>
        {error ? <Text style={styles.loadingCopy}>{error}</Text> : null}
        <AuthActionButton label="Retry" onPress={() => void refresh()} style={styles.loadingButton} />
        <AuthActionButton label="Back to home" variant="secondary" onPress={() => router.replace('/home')} style={styles.loadingButton} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          animation: 'none',
          gestureEnabled: true,
        }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: isCompact ? 18 : 22,
            paddingBottom: isCompact ? 120 : 132,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentFrame, { maxWidth: contentWidth }]}>
          <FlowScreenHeader title="Park Now" onBack={() => router.replace('/home')} />

          <ParkingDataStatusCard
            status={status}
            error={error}
            isRefreshing={isRefreshing}
            lastSyncedAt={lastSyncedAt}
            onRetry={() => void refresh()}
          />

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Zap color="#FFFFFF" size={20} strokeWidth={2.4} />
            </View>
            <View style={styles.heroCopyBlock}>
              <Text style={styles.heroTitle}>Start parking now</Text>
              <Text style={styles.heroCopy}>
                Confirm the vehicle you are bringing. We will issue one secure entry QR for gate or operator validation.
              </Text>
            </View>
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
                  Add or choose a saved vehicle before showing your Park Now QR.
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingHorizontal: horizontalPadding, paddingTop: isCompact ? 14 : 18 }]}>
        <AuthActionButton
          label="Continue to Entry QR"
          onPress={() =>
            router.push({
              pathname: '/walkin-qr',
              params: preferredLot ? { lotId: preferredLot.id } : undefined,
            })
          }
          disabled={!selectedVehicle}
          style={styles.footerButton}
        />
      </View>

      <VehiclePickerSheet
        visible={showVehicleSheet}
        onClose={() => setShowVehicleSheet(false)}
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={(vehicleId) => void selectVehicle(vehicleId)}
        onAddAnother={() => router.push('/edit-vehicle?mode=new')}
        onManageVehicles={() => router.push('/edit-vehicle')}
      />
    </SafeAreaView>
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
  scrollContent: {
    gap: 18,
  },
  contentFrame: {
    width: '100%',
    alignSelf: 'center',
    gap: 18,
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
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
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
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
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
  vehicleSelectorCopy: {
    flex: 1,
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
  footer: {
    backgroundColor: '#FAFAF9',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: 26,
  },
  footerButton: {
    width: '100%',
  },
});
