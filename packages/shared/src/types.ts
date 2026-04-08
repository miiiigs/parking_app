export type SlotStatus = 'available' | 'reserved' | 'occupied' | 'disputed' | 'blocked';

export type ParkingSlot = {
  id: string;
  locationId: string;
  label: string;
  status: SlotStatus;
};

export type Reservation = {
  id: string;
  slotId: string;
  userId: string;
  plateNumber: string;
  status: 'pending' | 'confirmed' | 'expired' | 'cancelled';
  arrivalWindowMinutes: number;
};
