import { Check, Car, Plus, Settings2 } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { WalkInVehicle } from '../../features/parking/store/useWalkInPreferencesStore';

type VehiclePickerSheetProps = {
  onAddAnother: () => void;
  onClose: () => void;
  onManageVehicles?: () => void;
  onSelectVehicle: (vehicleId: string) => void | Promise<void>;
  selectedVehicleId: string | null;
  vehicles: WalkInVehicle[];
  visible: boolean;
};

export function VehiclePickerSheet({
  onAddAnother,
  onClose,
  onManageVehicles,
  onSelectVehicle,
  selectedVehicleId,
  vehicles,
  visible,
}: VehiclePickerSheetProps) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalBackdropPressable} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select Vehicle</Text>

          {vehicles.length ? (
            <ScrollView style={styles.optionScroll} contentContainerStyle={styles.modalOptionList} showsVerticalScrollIndicator={false}>
              {vehicles.map((vehicle) => {
                const active = selectedVehicleId === vehicle.id;

                return (
                  <Pressable
                    key={vehicle.id}
                    onPress={async () => {
                      await onSelectVehicle(vehicle.id);
                      onClose();
                    }}
                    style={[styles.modalOptionCard, active ? styles.modalOptionCardActive : null]}
                  >
                    <View style={styles.modalOptionLeading}>
                      <View style={[styles.modalOptionIconWrap, active ? styles.modalOptionIconWrapActive : null]}>
                        <Car color={active ? '#0F766E' : '#64748B'} size={16} strokeWidth={2.2} />
                      </View>
                      <View style={styles.modalOptionCopy}>
                        <Text style={[styles.modalOptionTitle, active ? styles.modalOptionTitleActive : null]}>{vehicle.plate}</Text>
                        <Text style={styles.modalOptionDetail}>{vehicle.model} - {vehicle.color}</Text>
                      </View>
                    </View>
                    {active ? (
                      <View style={styles.modalCheckBadge}>
                        <Check color="#FFFFFF" size={12} strokeWidth={3} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Car color="#F97316" size={20} strokeWidth={2.2} />
              </View>
              <Text style={styles.emptyTitle}>No saved vehicles yet</Text>
              <Text style={styles.emptyCopy}>Add your first vehicle to continue with reservations and walk-in parking.</Text>
            </View>
          )}

          <View style={styles.actionGroup}>
            <Pressable
              onPress={() => {
                onClose();
                onAddAnother();
              }}
              style={styles.secondaryAction}
            >
              <Plus color="#0F766E" size={15} strokeWidth={2.4} />
              <Text style={styles.secondaryActionText}>{vehicles.length ? 'Add Another Vehicle' : 'Add First Vehicle'}</Text>
            </Pressable>

            {onManageVehicles ? (
              <Pressable
                onPress={() => {
                  onClose();
                  onManageVehicles();
                }}
                style={styles.tertiaryAction}
              >
                <Settings2 color="#64748B" size={15} strokeWidth={2.3} />
                <Text style={styles.tertiaryActionText}>Manage Vehicles</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '78%',
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
  optionScroll: {
    maxHeight: 340,
  },
  modalOptionList: {
    gap: 10,
  },
  modalOptionCard: {
    minHeight: 68,
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
  modalOptionLeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOptionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionIconWrapActive: {
    backgroundColor: '#D1FAE5',
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
  modalCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    color: '#1E293B',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  emptyCopy: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginTop: 4,
  },
  actionGroup: {
    gap: 10,
  },
  secondaryAction: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionText: {
    color: '#0F766E',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  tertiaryAction: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tertiaryActionText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_500Medium',
  },
});
