import {
  calculateParkingCharge,
  normalizeParkingPricingConfig,
  type ParkingPricingConfig,
} from '@parking/shared';

export function calculateBill(durationSeconds: number, pricing: ParkingPricingConfig | number) {
  if (typeof pricing === 'number') {
    return calculateParkingCharge(durationSeconds, {
      mode: 'fixed_rate',
      flatRateAmount: pricing,
      fixedRateAmount: pricing,
      fixedRateIntervalMinutes: 60,
      firstPeriodMinutes: 180,
      firstPeriodRate: pricing,
      succeedingRateAmount: 20,
      succeedingRateIntervalMinutes: 60,
      entryGraceMinutes: 15,
      exitGraceMinutes: 15,
    }).amount;
  }

  return calculateParkingCharge(durationSeconds, normalizeParkingPricingConfig(pricing)).amount;
}

function randomBlock(length: number) {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

export function createReservationCode(slotId: string) {
  return `RSV-${slotId}-${Date.now().toString().slice(-6)}`;
}

export function createWalkInCode(slotId: string) {
  return `WIN-${slotId}-${Date.now().toString().slice(-6)}`;
}

export function createReceiptNumber() {
  return `PK${Date.now().toString().slice(-8)}`;
}

export function createTransactionId() {
  return `TXN-${randomBlock(8)}`;
}

export function createExitCode(slotId: string) {
  return `EXT-${slotId}-${Date.now().toString().slice(-5)}`;
}
