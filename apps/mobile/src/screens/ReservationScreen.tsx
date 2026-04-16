import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import {
  ARRIVAL_WINDOW_OPTIONS,
  type ArrivalWindowOption,
} from '../lib/reservationOptions';

type SlotItem = {
  id: string;
  label: string;
  status: 'available' | 'reserved' | 'occupied' | 'blocked' | 'disputed';
};

type Props = {
  slots: SlotItem[];
  selectedSlotId: string | null;
  selectedArrivalWindowMinutes: number;
  plateNumber: string;
  isSubmitting: boolean;
  isLiveData: boolean;
  errorMessage: string | null;
  onSelectSlot: (slotId: string) => void;
  onSelectArrivalWindow: (minutes: number) => void;
  onPlateNumberChange: (plateNumber: string) => void;
  onSubmit: () => void;
  onBack: () => void;
};

const statusOrder: SlotItem['status'][] = ['available', 'reserved', 'occupied', 'blocked', 'disputed'];

function renderStatusBadgeLabel(status: SlotItem['status']) {
  if (status === 'available') {
    return 'Open';
  }

  if (status === 'reserved') {
    return 'Reserved';
  }

  if (status === 'occupied') {
    return 'Occupied';
  }

  if (status === 'blocked') {
    return 'Blocked';
  }

  return 'Disputed';
}

function getSortedSlots(slots: SlotItem[]) {
  return [...slots].sort((left, right) => {
    const leftRank = statusOrder.indexOf(left.status);
    const rightRank = statusOrder.indexOf(right.status);

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.label.localeCompare(right.label);
  });
}

export function ReservationScreen({
  slots,
  selectedSlotId,
  selectedArrivalWindowMinutes,
  plateNumber,
  isSubmitting,
  isLiveData,
  errorMessage,
  onSelectSlot,
  onSelectArrivalWindow,
  onPlateNumberChange,
  onSubmit,
  onBack,
}: Props) {
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId);
  const sortedSlots = getSortedSlots(slots);
  const availableSlotCount = slots.filter((slot) => slot.status === 'available').length;

  return (
    <View style={styles.container}>
      {/* Hero Card */}
      <View style={styles.heroCard}>
        <Text style={styles.kickerText}>Step 1 of 3</Text>
        <Text style={styles.heroTitle}>Select a Slot</Text>
        <Text style={styles.heroSubtitle}>Choose your preferred parking spot and arrival window.</Text>
        {!isLiveData ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>Fallback mode active • Connect for live data</Text>
          </View>
        ) : null}
      </View>

      {/* Slot Selection Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>Available Slots</Text>
          <Text style={styles.cardMeta}>{availableSlotCount} available</Text>
        </View>
        {sortedSlots.length > 0 ? (
          <View style={styles.slotList}>
            {sortedSlots.map((slot) => {
              const isSelected = slot.id === selectedSlotId;
              const isAvailable = slot.status === 'available';

              return (
                <TouchableOpacity
                  key={slot.id}
                  style={[styles.slotItem, isSelected && styles.slotItemSelected]}
                  onPress={() => onSelectSlot(slot.id)}
                  disabled={!isAvailable}
                >
                  <View style={styles.slotInfo}>
                    <Text style={styles.slotLabel}>{slot.label}</Text>
                    <Text style={[styles.slotStatus, !isAvailable && styles.slotStatusDisabled]}>
                      {renderStatusBadgeLabel(slot.status)}
                    </Text>
                  </View>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyState}>No slots available</Text>
        )}
      </View>

      {/* Arrival Window Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Arrival Window</Text>
        {ARRIVAL_WINDOW_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.minutes}
            style={[styles.optionItem, selectedArrivalWindowMinutes === option.minutes && styles.optionItemSelected]}
            onPress={() => onSelectArrivalWindow(option.minutes)}
          >
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <Text style={styles.optionFee}>PHP {option.fee}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Vehicle Plate Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Vehicle Plate</Text>
        <TextInput
          value={plateNumber}
          onChangeText={onPlateNumberChange}
          placeholder="ABC-1234"
          placeholderTextColor="#5e7490"
          autoCapitalize="characters"
          style={styles.input}
        />
        <Text style={styles.inputHelper}>Guards use this to confirm your booking</Text>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Slot</Text>
          <Text style={styles.summaryValue}>{selectedSlot?.label ?? '—'}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Window</Text>
          <Text style={styles.summaryValue}>
            {ARRIVAL_WINDOW_OPTIONS.find((o) => o.minutes === selectedArrivalWindowMinutes)?.label ?? '—'}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Fee</Text>
          <Text style={styles.summaryValue}>
            PHP {ARRIVAL_WINDOW_OPTIONS.find((o) => o.minutes === selectedArrivalWindowMinutes)?.fee ?? '—'}
          </Text>
        </View>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {/* Action Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, (isSubmitting || !isLiveData) && styles.primaryButtonDisabled]}
          onPress={onSubmit}
          disabled={isSubmitting || !isLiveData}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? 'Creating...' : 'Continue to Validation'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#111c2d',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1b2b43',
  },
  kickerText: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#f4f7fb',
    fontSize: 26,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#b8c7da',
    fontSize: 14,
    lineHeight: 20,
  },
  warningBanner: {
    backgroundColor: '#2a220f',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  warningText: {
    color: '#ffcf66',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#08111d',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#18283f',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardLabel: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardMeta: {
    color: '#3dd6a5',
    fontSize: 12,
    fontWeight: '700',
  },
  slotList: {
    gap: 8,
  },
  slotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#18283f',
    backgroundColor: '#0a1320',
  },
  slotItemSelected: {
    borderColor: '#3dd6a5',
    backgroundColor: '#0c1a28',
  },
  slotInfo: {
    gap: 3,
    flex: 1,
  },
  slotLabel: {
    color: '#f4f7fb',
    fontSize: 14,
    fontWeight: '700',
  },
  slotStatus: {
    color: '#7bd3ff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slotStatusDisabled: {
    color: '#b8c7da',
  },
  checkmark: {
    color: '#3dd6a5',
    fontSize: 18,
    fontWeight: '800',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#18283f',
    backgroundColor: '#0a1320',
    gap: 12,
  },
  optionItemSelected: {
    borderColor: '#3dd6a5',
    backgroundColor: '#0c1a28',
  },
  optionInfo: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    color: '#f4f7fb',
    fontSize: 14,
    fontWeight: '700',
  },
  optionDescription: {
    color: '#b8c7da',
    fontSize: 12,
    lineHeight: 16,
  },
  optionFee: {
    color: '#3dd6a5',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#0a1320',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#18283f',
    color: '#f4f7fb',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  inputHelper: {
    color: '#b8c7da',
    fontSize: 12,
    lineHeight: 16,
  },
  summaryCard: {
    backgroundColor: '#0f1b2c',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 0,
    borderWidth: 1,
    borderColor: '#1a2e49',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  summaryLabel: {
    color: '#b8c7da',
    fontSize: 13,
  },
  summaryValue: {
    color: '#f4f7fb',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#1a2e49',
  },
  errorText: {
    color: '#ff8a80',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  emptyState: {
    color: '#b8c7da',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3dd6a5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#071018',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1a2e49',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#26405f',
  },
  secondaryButtonText: {
    color: '#f4f7fb',
    fontWeight: '700',
    fontSize: 15,
  },
});
