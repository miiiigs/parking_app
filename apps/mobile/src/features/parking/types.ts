import type { ParkingLotDefinition } from '@parking/shared';
import type { ParkingPricingConfig } from '@parking/shared';
import type { ReservationPricingConfig } from '@parking/shared';

export interface ParkingSlot {
  id: string;
  number: string;
  isAvailable: boolean;
  status?: 'available' | 'reserved' | 'occupied' | 'blocked' | 'disputed';
  x: number;
  y: number;
  qrToken?: string;
}

export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  city?: string;
  availableSlots: number;
  totalSlots: number;
  distanceKm: number;
  pricePerHour: number;
  pricingConfig: ParkingPricingConfig;
  reservationPricing: ReservationPricingConfig;
  features: string[];
  slots: ParkingSlot[];
  locationId?: string;
  lotLayout?: ParkingLotDefinition | null;
}

export interface Booking {
  reservationId?: string;
  reservationCode: string;
  lotId: string;
  lotName: string;
  address: string;
  slotId?: string;
  slotLabel?: string;
  slot: ParkingSlot;
  arrivalWindowMinutes: number;
  plateNumber: string;
  reservationFee: number;
  pricePerHour: number;
  pricingConfig: ParkingPricingConfig;
  reservationStatus?: string;
  expiresAt?: string | null;
  qrToken?: string | null;
  createdAt: string;
}

export interface ParkingSession extends Booking {
  sessionId?: string;
  sessionStatus?: string;
  startTime: string;
  startedAt?: string | null;
  validatedAt?: string | null;
  billedMinutes?: number | null;
  billedAmount?: number | null;
  paymentStatus?: string | null;
}

export interface CompletedSession extends ParkingSession {
  endTime: string;
  durationSeconds: number;
  totalBill: number;
  receiptNumber: string;
  transactionId: string;
  exitCode: string;
  exitGraceEndsAt?: string | null;
}
