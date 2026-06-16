import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Car, ChevronDown, ChevronLeft, Check, CreditCard, Hash, Palette, Zap } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthActionButton, AuthLogo } from '../../auth/components/AuthPrimitives';
import { getRouteParam } from '../../auth/utils';
import { useMobileParkingData } from '../../../providers/MobileParkingDataProvider';
import { useWalkInPreferencesStore } from '../store/useWalkInPreferencesStore';

const PAYMENT_METHODS = ['Credit / Debit Card', 'GCash', 'Maya'];
const VEHICLE_MODELS = [
  'Toyota Vios', 'Toyota Innova', 'Toyota Fortuner', 'Honda Civic', 'Honda City', 'Honda CR-V',
  'Mitsubishi Xpander', 'Mitsubishi Montero Sport', 'Ford Everest', 'Ford Ranger', 'Nissan Navara', 'Others',
];
const COLORS = ['Pearl White', 'Metallic Silver', 'Jet Black', 'Midnight Blue', 'Red', 'Gray', 'Beige / Cream', 'Green', 'Others'];

export default function WalkInConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lotId?: string; slotId?: string }>();
  const { lots } = useMobileParkingData();
  const storedPaymentMethod = useWalkInPreferencesStore((state) => state.paymentMethod);
  const storedVehicle = useWalkInPreferencesStore((state) => state.vehicle);
  const setPaymentMethod = useWalkInPreferencesStore((state) => state.setPaymentMethod);
  const setVehicle = useWalkInPreferencesStore((state) => state.setVehicle);
  const lotId = getRouteParam(params.lotId);
  const slotId = getRouteParam(params.slotId);
  const lot = lots.find((entry) => entry.id === lotId) ?? null;
  const slot = lot?.slots.find((entry) => entry.id === slotId) ?? null;
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(!storedVehicle);
  const [selectedModel, setSelectedModel] = useState(storedVehicle?.model ?? '');
  const [selectedColor, setSelectedColor] = useState(storedVehicle?.color ?? '');
  const [plateNumber, setPlateNumber] = useState(storedVehicle?.plate ?? '');
  const [customModel, setCustomModel] = useState('');
  const [customColor, setCustomColor] = useState('');

  useEffect(() => {
    if (!lot || !slot) {
      router.replace('/home');
    }
  }, [lot, router, slot]);

  const displayModel = selectedModel === 'Others' ? customModel : selectedModel;
  const displayColor = selectedColor === 'Others' ? customColor : selectedColor;
  const normalizedPlate = plateNumber.toUpperCase().replace(/[^A-Z0-9- ]/g, '');
  const vehicleValid = displayModel.trim().length >= 2 && displayColor.trim().length >= 2 && normalizedPlate.trim().length >= 3;
  const canProceed = Boolean(storedPaymentMethod) && (!editingVehicle || vehicleValid);

  const selectedPaymentLabel = useMemo(() => storedPaymentMethod ?? 'Tap to select', [storedPaymentMethod]);

  if (!lot || !slot) {
    return null;
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeading}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color="#1E293B" size={20} strokeWidth={2.2} />
          </Pressable>
          <AuthLogo height={28} />
        </View>
        <Text style={styles.headerTitle}>Walk-In Parking</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Zap color="#FFFFFF" size={24} strokeWidth={2.3} />
          </View>
          <View style={styles.heroCopyBlock}>
            <Text style={styles.heroTitle}>Already at the facility?</Text>
            <Text style={styles.heroCopy}>Generate your entrance QR for slot {slot.number} at {lot.name}.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>PAYMENT METHOD</Text>
          <Pressable onPress={() => setPaymentOpen((value) => !value)} style={styles.selectorCard}>
            <View style={styles.selectorLeading}>
              <View style={[styles.selectorIconWrap, storedPaymentMethod ? styles.selectorIconWrapActive : styles.selectorIconWrapWarning]}>
                <CreditCard color={storedPaymentMethod ? '#FFFFFF' : '#F97316'} size={18} strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.selectorLabel}>{storedPaymentMethod ? 'Selected Payment' : 'Payment Required'}</Text>
                <Text style={[styles.selectorValue, !storedPaymentMethod ? styles.selectorValueWarning : null]}>{selectedPaymentLabel}</Text>
              </View>
            </View>
            <ChevronDown color="#94A3B8" size={18} strokeWidth={2.2} style={{ transform: [{ rotate: paymentOpen ? '180deg' : '0deg' }] }} />
          </Pressable>
          {paymentOpen ? (
            <View style={styles.dropdownCard}>
              {PAYMENT_METHODS.map((method, index) => {
                const active = storedPaymentMethod === method;
                return (
                  <Pressable
                    key={method}
                    onPress={() => {
                      setPaymentMethod(method);
                      setPaymentOpen(false);
                    }}
                    style={[styles.dropdownItem, index < PAYMENT_METHODS.length - 1 ? styles.dropdownItemBorder : null, active ? styles.dropdownItemActive : null]}
                  >
                    <Text style={[styles.dropdownText, active ? styles.dropdownTextActive : null]}>{method}</Text>
                    {active ? (
                      <View style={styles.dropdownCheck}>
                        <Check color="#FFFFFF" size={12} strokeWidth={3} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>VEHICLE INFORMATION</Text>

          {!editingVehicle && storedVehicle ? (
            <View style={styles.savedVehicleCard}>
              <VehicleInfoRow label="Model" value={storedVehicle.model} />
              <VehicleInfoRow label="Color" value={storedVehicle.color} />
              <VehicleInfoRow label="Plate" value={storedVehicle.plate} />
              <Pressable onPress={() => setEditingVehicle(true)} style={styles.editVehicleButton}>
                <Text style={styles.editVehicleText}>Use a different vehicle</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.vehicleForm}>
              {!storedVehicle ? (
                <View style={styles.noticeCardWarning}>
                  <Text style={styles.noticeCopyWarning}>
                    No vehicle is saved yet. Add your vehicle details to continue. This will stay available for future walk-in sessions.
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => {
                  setModelOpen((value) => !value);
                  setColorOpen(false);
                }}
                style={[styles.inputShell, selectedModel ? styles.inputShellActive : null]}
              >
                <View style={styles.inputLeading}>
                  <Car color="#94A3B8" size={15} strokeWidth={2.2} />
                  <Text style={[styles.inputValue, !selectedModel ? styles.inputPlaceholder : null]}>{selectedModel || 'Select vehicle model'}</Text>
                </View>
                <ChevronDown color="#64748B" size={15} strokeWidth={2.2} style={{ transform: [{ rotate: modelOpen ? '180deg' : '0deg' }] }} />
              </Pressable>
              {modelOpen ? (
                <DropdownList
                  items={VEHICLE_MODELS}
                  activeValue={selectedModel}
                  onSelect={(value) => {
                    setSelectedModel(value);
                    setModelOpen(false);
                  }}
                />
              ) : null}
              {selectedModel === 'Others' ? (
                <TextInput
                  value={customModel}
                  onChangeText={setCustomModel}
                  placeholder="Enter vehicle model"
                  placeholderTextColor="#94A3B8"
                  style={[styles.textField, styles.textFieldActive]}
                />
              ) : null}

              <Pressable
                onPress={() => {
                  setColorOpen((value) => !value);
                  setModelOpen(false);
                }}
                style={[styles.inputShell, selectedColor ? styles.inputShellActive : null]}
              >
                <View style={styles.inputLeading}>
                  <Palette color="#94A3B8" size={15} strokeWidth={2.2} />
                  <Text style={[styles.inputValue, !selectedColor ? styles.inputPlaceholder : null]}>{selectedColor || 'Select vehicle color'}</Text>
                </View>
                <ChevronDown color="#64748B" size={15} strokeWidth={2.2} style={{ transform: [{ rotate: colorOpen ? '180deg' : '0deg' }] }} />
              </Pressable>
              {colorOpen ? (
                <DropdownList
                  items={COLORS}
                  activeValue={selectedColor}
                  onSelect={(value) => {
                    setSelectedColor(value);
                    setColorOpen(false);
                  }}
                />
              ) : null}
              {selectedColor === 'Others' ? (
                <TextInput
                  value={customColor}
                  onChangeText={setCustomColor}
                  placeholder="Enter vehicle color"
                  placeholderTextColor="#94A3B8"
                  style={[styles.textField, styles.textFieldActive]}
                />
              ) : null}

              <View style={[styles.inputShell, normalizedPlate.trim().length >= 3 ? styles.inputShellActive : null]}>
                <View style={styles.inputLeading}>
                  <Hash color="#94A3B8" size={15} strokeWidth={2.2} />
                  <TextInput
                    value={normalizedPlate}
                    onChangeText={setPlateNumber}
                    placeholder="Plate number (e.g. ABC 1234)"
                    placeholderTextColor="#94A3B8"
                    style={styles.inlineTextInput}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {storedVehicle ? (
                <Pressable onPress={() => setEditingVehicle(false)} style={styles.editVehicleButton}>
                  <Text style={styles.editVehicleText}>Cancel and use saved vehicle</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.noticeCardSuccess}>
          <Text style={styles.noticeCopySuccess}>
            Metered billing continues inside the mobile session flow. Payment will be tied to {storedPaymentMethod ?? 'your selected method'}.
          </Text>
        </View>

        <AuthActionButton
          label="Generate Entrance QR"
          onPress={() => {
            if (editingVehicle && vehicleValid) {
              setVehicle({
                model: displayModel.trim(),
                color: displayColor.trim(),
                plate: normalizedPlate.trim(),
              });
            }

            router.push({
              pathname: '/walkin-qr',
              params: {
                lotId: lot.id,
                slotId: slot.id,
              },
            });
          }}
          disabled={!canProceed}
        />
      </ScrollView>
    </View>
  );
}

function DropdownList({
  items,
  activeValue,
  onSelect,
}: {
  items: string[];
  activeValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.dropdownCard}>
      {items.map((item, index) => {
        const active = activeValue === item;
        return (
          <Pressable
            key={item}
            onPress={() => onSelect(item)}
            style={[styles.dropdownItem, index < items.length - 1 ? styles.dropdownItemBorder : null, active ? styles.dropdownItemActive : null]}
          >
            <Text style={[styles.dropdownText, active ? styles.dropdownTextActive : null]}>{item}</Text>
            {active ? (
              <View style={styles.dropdownCheck}>
                <Check color="#FFFFFF" size={12} strokeWidth={3} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function VehicleInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.vehicleInfoRow}>
      <Text style={styles.vehicleInfoLabel}>{label}</Text>
      <Text style={styles.vehicleInfoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerLeading: {
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
  headerTitle: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
    gap: 20,
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
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_700Bold',
  },
  heroCopy: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
    marginTop: 3,
  },
  section: {
    gap: 10,
  },
  sectionEyebrow: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
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
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'Poppins_400Regular',
  },
  selectorValue: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 1,
  },
  selectorValueWarning: {
    color: '#F97316',
  },
  dropdownCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#F0FDFA',
  },
  dropdownText: {
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
  },
  dropdownTextActive: {
    color: '#0F766E',
    fontFamily: 'Poppins_600SemiBold',
  },
  dropdownCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedVehicleCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F0FDFA',
  },
  vehicleInfoLabel: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
  },
  vehicleInfoValue: {
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_600SemiBold',
  },
  editVehicleButton: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0FDFA',
  },
  editVehicleText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_500Medium',
  },
  vehicleForm: {
    gap: 10,
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
    fontSize: 11,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
  },
  inputShell: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
  },
  inputShellActive: {
    borderColor: '#0F766E',
  },
  inputLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  inputValue: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  inputPlaceholder: {
    color: '#94A3B8',
  },
  inlineTextInput: {
    flex: 1,
    color: '#1E293B',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    paddingVertical: 0,
  },
  textField: {
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    color: '#1E293B',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  textFieldActive: {
    borderColor: '#0F766E',
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
    fontSize: 12,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
});
