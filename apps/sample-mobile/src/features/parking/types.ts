export interface ParkingSlot {
  id: string;
  number: string;
  isAvailable: boolean;
  x: number;
  y: number;
}

export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  availableSlots: number;
  totalSlots: number;
  distanceKm: number;
  pricePerHour: number;
  features: string[];
  slots: ParkingSlot[];
}

export interface Booking {
  reservationCode: string;
  lotId: string;
  lotName: string;
  address: string;
  slot: ParkingSlot;
  arrivalWindowMinutes: number;
  plateNumber: string;
  pricePerHour: number;
  createdAt: string;
}

export interface ParkingSession extends Booking {
  startTime: string;
}

export interface CompletedSession extends ParkingSession {
  endTime: string;
  durationSeconds: number;
  totalBill: number;
  receiptNumber: string;
  transactionId: string;
  exitCode: string;
}
