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

function renderAvailability(status: SlotItem['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

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

function ArrivalWindowCard({
  option,
  isSelected,
  onPress,
}: {
  option: ArrivalWindowOption;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.windowCard, isSelected ? styles.windowCardSelected : null]}
    >
      <View style={styles.windowRow}>
        <Text style={styles.rowLabel}>{option.label}</Text>
        <Text style={styles.rowValue}>PHP {option.fee}</Text>
      </View>
      <Text style={styles.windowDescription}>{option.description}</Text>
    </TouchableOpacity>
  );
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
  const reservedSlotCount = slots.filter((slot) => slot.status === 'reserved').length;

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeaderRow}>
          <Text style={styles.sectionLabel}>Step 1 of 3</Text>
          <Text style={styles.liveTag}>{isLiveData ? 'Live data' : 'Fallback view'}</Text>
        </View>
        <Text style={styles.title}>Reserve a real slot.</Text>
        <Text style={styles.subtitle}>Choose a controlled slot and an arrival window.</Text>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaCard}>
            <Text style={styles.heroMetaLabel}>Open</Text>
            <Text style={styles.heroMetaValue}>{availableSlotCount}</Text>
          </View>
          <View style={styles.heroMetaCard}>
            <Text style={styles.heroMetaLabel}>Reserved</Text>
            <Text style={styles.heroMetaValue}>{reservedSlotCount}</Text>
          </View>
        </View>
      </View>

      {!isLiveData ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Backend data is offline</Text>
          <Text style={styles.warningText}>
            You are viewing fallback demo slots. Connect to Supabase before creating a real reservation.
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Available Slots</Text>
          <Text style={styles.cardMeta}>{availableSlotCount} open</Text>
        </View>
        <Text style={styles.cardSubMeta}>{reservedSlotCount} currently reserved</Text>
        {sortedSlots.map((slot) => {
          const isSelected = slot.id === selectedSlotId;

          return (
            <TouchableOpacity
              key={slot.id}
              style={[styles.slotCard, isSelected ? styles.slotCardSelected : null]}
              onPress={() => onSelectSlot(slot.id)}
            >
              <View style={styles.slotLeftColumn}>
                <Text style={styles.slotLabel}>{slot.label}</Text>
                <Text style={styles.slotStatus}>{renderAvailability(slot.status)}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  slot.status === 'available' ? styles.badgeAvailable : null,
                  slot.status === 'reserved' ? styles.badgeReserved : null,
                  slot.status === 'occupied' ? styles.badgeOccupied : null,
                  slot.status === 'blocked' ? styles.badgeBlocked : null,
                  slot.status === 'disputed' ? styles.badgeDisputed : null,
                ]}
              >
                <Text style={styles.badgeText}>{renderStatusBadgeLabel(slot.status)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {slots.length === 0 ? <Text style={styles.emptyState}>No slots loaded yet.</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Arrival Window</Text>
        {ARRIVAL_WINDOW_OPTIONS.map((option) => (
          <ArrivalWindowCard
            key={option.minutes}
            option={option}
            isSelected={option.minutes === selectedArrivalWindowMinutes}
            onPress={() => onSelectArrivalWindow(option.minutes)}
          />
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vehicle Plate Number</Text>
        <TextInput
          value={plateNumber}
          onChangeText={onPlateNumberChange}
          placeholder="ABC-1234"
          placeholderTextColor="#5e7490"
          autoCapitalize="characters"
          style={styles.input}
        />
        <Text style={styles.helperText}>This helps guards confirm the booking on arrival.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reservation Summary</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Slot</Text>
          <Text style={styles.rowValue}>{selectedSlot?.label ?? 'Select a slot'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Arrival Window</Text>
          <Text style={styles.rowValue}>
            {ARRIVAL_WINDOW_OPTIONS.find((option) => option.minutes === selectedArrivalWindowMinutes)?.label}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Reservation Fee</Text>
          <Text style={styles.rowValue}>
            PHP {ARRIVAL_WINDOW_OPTIONS.find((option) => option.minutes === selectedArrivalWindowMinutes)?.fee}
          </Text>
        </View>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting || !isLiveData ? styles.primaryButtonDisabled : null]}
          onPress={onSubmit}
          disabled={isSubmitting || !isLiveData}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? 'Creating...' : !isLiveData ? 'Connect Backend First' : 'Confirm Reservation'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0b1320',
    borderRadius: 28,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#152234',
  },
  heroCard: {
    backgroundColor: '#111c2d',
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1b2b43',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  liveTag: {
    color: '#3dd6a5',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionLabel: {
    color: '#7bd3ff',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 12,
  },
  title: {
    color: '#f4f7fb',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#b8c7da',
    fontSize: 15,
    lineHeight: 22,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  heroMetaCard: {
    flex: 1,
    minWidth: 88,
    backgroundColor: '#08111d',
    borderRadius: 16,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#18283f',
  },
  heroMetaLabel: {
    color: '#7f94ad',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  heroMetaValue: {
    color: '#f4f7fb',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  warningBox: {
    backgroundColor: '#2a220f',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#8a6b2f',
    gap: 6,
  },
  warningTitle: {
    color: '#ffcf66',
    fontWeight: '800',
    fontSize: 14,
  },
  warningText: {
    color: '#f5e6bf',
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#08111d',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#18283f',
    gap: 10,
  },
  cardTitle: {
    color: '#f4f7fb',
    fontWeight: '700',
    fontSize: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardMeta: {
    color: '#3dd6a5',
    fontSize: 13,
    fontWeight: '700',
  },
  cardSubMeta: {
    color: '#b8c7da',
    fontSize: 12,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  rowLabel: {
    color: '#f4f7fb',
    fontSize: 14,
    flex: 1,
  },
  rowValue: {
    color: '#7bd3ff',
    fontSize: 14,
    fontWeight: '700',
  },
  slotLeftColumn: {
    flex: 1,
    gap: 4,
  },
  slotLabel: {
    color: '#f4f7fb',
    fontSize: 15,
    fontWeight: '700',
  },
  slotStatus: {
    color: '#b8c7da',
    fontSize: 12,
  },
  slotCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#18283f',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0a1320',
  },
  slotCardSelected: {
    backgroundColor: '#12233a',
    borderColor: '#3dd6a5',
    shadowColor: '#3dd6a5',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#263b56',
    backgroundColor: '#08111d',
  },
  badgeAvailable: {
    borderColor: '#3dd6a5',
    backgroundColor: '#0c1a28',
  },
  badgeReserved: {
    borderColor: '#7bd3ff',
    backgroundColor: '#0d1a2a',
  },
  badgeOccupied: {
    borderColor: '#ffb74d',
    backgroundColor: '#23190c',
  },
  badgeBlocked: {
    borderColor: '#ff8a80',
    backgroundColor: '#281214',
  },
  badgeDisputed: {
    borderColor: '#d1a3ff',
    backgroundColor: '#20142a',
  },
  badgeText: {
    color: '#f4f7fb',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  windowCard: {
    backgroundColor: '#08111d',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#18283f',
    gap: 6,
  },
  windowCardSelected: {
    borderColor: '#3dd6a5',
    backgroundColor: '#0c1a28',
  },
  windowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  windowDescription: {
    color: '#b8c7da',
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#08111d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#18283f',
    color: '#f4f7fb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    letterSpacing: 1.1,
  },
  helperText: {
    color: '#b8c7da',
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: '#ff8a80',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    color: '#b8c7da',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3dd6a5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#3dd6a5',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 2,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#071018',
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1a2e49',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#26405f',
  },
  secondaryButtonText: {
    color: '#f4f7fb',
    fontWeight: '700',
  },
});
