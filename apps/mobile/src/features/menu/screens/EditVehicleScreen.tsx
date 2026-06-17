import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Car, Check, ChevronDown, Hash, Palette } from 'lucide-react-native';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { AppScreenHeader } from '../../auth/components/AuthPrimitives';
import { useWalkInPreferencesStore } from '../../parking/store/useWalkInPreferencesStore';

const VEHICLE_MODELS = [
  'Toyota Vios', 'Toyota Innova', 'Toyota Fortuner', 'Toyota Hilux',
  'Honda Civic', 'Honda City', 'Honda CR-V', 'Honda BR-V',
  'Mitsubishi Xpander', 'Mitsubishi Montero Sport', 'Mitsubishi Mirage',
  'Hyundai Tucson', 'Hyundai Accent', 'Hyundai Santa Fe',
  'Ford Everest', 'Ford Ranger', 'Ford EcoSport',
  'Suzuki Ertiga', 'Suzuki Swift', 'Suzuki Jimny',
  'Nissan Navara', 'Nissan Terra', 'Nissan Almera',
  'Kia Seltos', 'Kia Stonic', 'Kia Carnival',
  'Others',
];

const COLORS = ['Pearl White', 'Metallic Silver', 'Jet Black', 'Midnight Blue', 'Red', 'Gray', 'Beige / Cream', 'Orange', 'Green', 'Brown', 'Others'];

export default function EditVehicleScreen() {
  const router = useRouter();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();
  const savedVehicle = useWalkInPreferencesStore((state) => state.vehicle);
  const setVehicle = useWalkInPreferencesStore((state) => state.setVehicle);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(savedVehicle?.model ?? '');
  const [customModel, setCustomModel] = useState('');
  const [selectedColor, setSelectedColor] = useState(savedVehicle?.color ?? '');
  const [customColor, setCustomColor] = useState('');
  const [plate, setPlate] = useState(savedVehicle?.plate ?? '');
  const [saved, setSaved] = useState(false);

  const isOtherModel = selectedModel === 'Others';
  const isOtherColor = selectedColor === 'Others';
  const displayModel = isOtherModel ? customModel.trim() : selectedModel.trim();
  const displayColor = isOtherColor ? customColor.trim() : selectedColor.trim();
  const normalizedPlate = plate.toUpperCase().replace(/[^A-Z0-9- ]/g, '');
  const isValid = displayModel.length >= 2 && displayColor.length >= 2 && normalizedPlate.trim().length >= 3;
  const vehicleChanged = useMemo(
    () =>
      displayModel !== (savedVehicle?.model ?? '')
      || displayColor !== (savedVehicle?.color ?? '')
      || normalizedPlate.trim() !== (savedVehicle?.plate ?? ''),
    [displayColor, displayModel, normalizedPlate, savedVehicle?.color, savedVehicle?.model, savedVehicle?.plate],
  );

  function handleSave() {
    if (!isValid) {
      return;
    }

    setVehicle({
      model: displayModel,
      color: displayColor,
      plate: normalizedPlate.trim(),
    });
    setSaved(true);
    setTimeout(() => {
      router.back();
    }, 900);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.maxWidth, { maxWidth: contentWidth }]}>
              <View
                style={[
                styles.header,
                {
                  marginHorizontal: -horizontalPadding,
                },
              ]}
            >
              <AppScreenHeader title="Vehicle Information" onBack={() => router.back()} />
            </View>

            <View style={styles.content}>
              <Field label="Vehicle Model">
                <Pressable
                  onPress={() => {
                    setModelDropdownOpen((value) => !value);
                    setColorDropdownOpen(false);
                  }}
                  style={[styles.selectorButton, selectedModel ? styles.selectorButtonActive : null]}
                >
                  <View style={styles.selectorLeft}>
                    <Car color="#94A3B8" size={16} strokeWidth={2.2} />
                    <Text style={[styles.selectorText, !selectedModel ? styles.selectorPlaceholder : null]}>
                      {selectedModel || 'Select vehicle model'}
                    </Text>
                  </View>
                  <ChevronDown color="#64748B" size={16} strokeWidth={2.2} style={{ transform: [{ rotate: modelDropdownOpen ? '180deg' : '0deg' }] }} />
                </Pressable>
                {modelDropdownOpen ? (
                  <DropdownList
                    items={VEHICLE_MODELS}
                    selectedValue={selectedModel}
                    onSelect={(value) => {
                      setSelectedModel(value);
                      setModelDropdownOpen(false);
                    }}
                  />
                ) : null}
                {isOtherModel ? (
                  <View style={styles.inlineInputShell}>
                    <Car color="#94A3B8" size={16} strokeWidth={2.2} />
                    <TextInput
                      autoFocus
                      value={customModel}
                      onChangeText={setCustomModel}
                      placeholder="Enter vehicle model"
                      placeholderTextColor="#94A3B8"
                      style={styles.inlineInput}
                    />
                  </View>
                ) : null}
              </Field>

              <Field label="Vehicle Color">
                <Pressable
                  onPress={() => {
                    setColorDropdownOpen((value) => !value);
                    setModelDropdownOpen(false);
                  }}
                  style={[styles.selectorButton, selectedColor ? styles.selectorButtonActive : null]}
                >
                  <View style={styles.selectorLeft}>
                    <Palette color="#94A3B8" size={16} strokeWidth={2.2} />
                    <Text style={[styles.selectorText, !selectedColor ? styles.selectorPlaceholder : null]}>
                      {selectedColor || 'Select vehicle color'}
                    </Text>
                  </View>
                  <ChevronDown color="#64748B" size={16} strokeWidth={2.2} style={{ transform: [{ rotate: colorDropdownOpen ? '180deg' : '0deg' }] }} />
                </Pressable>
                {colorDropdownOpen ? (
                  <DropdownList
                    items={COLORS}
                    selectedValue={selectedColor}
                    onSelect={(value) => {
                      setSelectedColor(value);
                      setColorDropdownOpen(false);
                    }}
                  />
                ) : null}
                {isOtherColor ? (
                  <View style={styles.inlineInputShell}>
                    <Palette color="#94A3B8" size={16} strokeWidth={2.2} />
                    <TextInput
                      autoFocus
                      value={customColor}
                      onChangeText={setCustomColor}
                      placeholder="Enter vehicle color"
                      placeholderTextColor="#94A3B8"
                      style={styles.inlineInput}
                    />
                  </View>
                ) : null}
              </Field>

              <Field label="Plate Number">
                <View style={[styles.selectorButton, normalizedPlate.trim().length >= 3 ? styles.selectorButtonActive : null]}>
                  <View style={styles.selectorLeft}>
                    <Hash color="#94A3B8" size={16} strokeWidth={2.2} />
                    <TextInput
                      value={normalizedPlate}
                      onChangeText={setPlate}
                      autoCapitalize="characters"
                      placeholder="e.g. ABC 1234"
                      placeholderTextColor="#94A3B8"
                      style={styles.selectorInput}
                    />
                  </View>
                </View>
              </Field>

              {isValid ? (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryEyebrow}>VEHICLE SUMMARY</Text>
                  <SummaryRow label="Model" value={displayModel} />
                  <SummaryRow label="Color" value={displayColor} />
                  <SummaryRow label="Plate No." value={normalizedPlate.trim()} last />
                </View>
              ) : null}

              <Pressable onPress={handleSave} disabled={!isValid || saved || !vehicleChanged} style={[styles.saveButton, (!isValid || !vehicleChanged) ? styles.saveButtonDisabled : null, saved ? styles.saveButtonSaved : null]}>
                <View style={styles.saveRow}>
                  {saved ? <Check color="#FFFFFF" size={18} strokeWidth={2.4} /> : null}
                  <Text style={styles.saveText}>{saved ? 'Saved!' : 'Save Vehicle Info'}</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function DropdownList({
  items,
  onSelect,
  selectedValue,
}: {
  items: string[];
  onSelect: (value: string) => void;
  selectedValue: string;
}) {
  return (
    <View style={styles.dropdown}>
      {items.map((item, index) => {
        const active = selectedValue === item;

        return (
          <Pressable key={item} onPress={() => onSelect(item)} style={[styles.dropdownItem, index < items.length - 1 ? styles.dropdownItemBorder : null, active ? styles.dropdownItemActive : null]}>
            <Text style={[styles.dropdownText, active ? styles.dropdownTextActive : null]}>{item}</Text>
            {active ? <Check color="#0F766E" size={15} strokeWidth={2.3} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function SummaryRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.summaryRow, !last ? styles.summaryRowBorder : null]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  inner: {
    width: '100%',
    alignItems: 'center',
  },
  maxWidth: {
    width: '100%',
  },
  header: {},
  content: {
    gap: 20,
    paddingTop: 24,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
  },
  selectorButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
  },
  selectorButtonActive: {
    borderColor: '#0F766E',
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectorText: {
    color: '#1E293B',
    fontSize: 17,
    lineHeight: 21,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  selectorPlaceholder: {
    color: '#94A3B8',
  },
  selectorInput: {
    flex: 1,
    color: '#1E293B',
    fontSize: 17,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 1.2,
    paddingVertical: 0,
  },
  dropdown: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    maxHeight: 220,
  },
  dropdownItem: {
    minHeight: 50,
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
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  dropdownTextActive: {
    color: '#0F766E',
    fontFamily: 'Poppins_600SemiBold',
  },
  inlineInputShell: {
    height: 50,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#0F766E',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  inlineInput: {
    flex: 1,
    color: '#1E293B',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    paddingVertical: 0,
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDFA',
    padding: 16,
  },
  summaryEyebrow: {
    color: '#0F766E',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  summaryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,118,110,0.1)',
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  summaryValue: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'right',
    flexShrink: 1,
  },
  saveButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F766E',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonSaved: {
    backgroundColor: '#16A34A',
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Poppins_500Medium',
  },
});


