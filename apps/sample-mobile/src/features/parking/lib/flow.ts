export function calculateBill(durationSeconds: number, pricePerHour: number) {
  const rawBill = (durationSeconds / 3600) * pricePerHour;
  const minimumCharge = pricePerHour * 0.25;
  return Number(Math.max(rawBill, minimumCharge).toFixed(2));
}

function randomBlock(length: number) {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

export function createReservationCode(slotId: string) {
  return `RSV-${slotId}-${Date.now().toString().slice(-6)}`;
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
