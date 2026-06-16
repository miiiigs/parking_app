/**
 * Lightweight in-memory store.
 * Simulates profile-saved data. In production this would come from an API / auth context.
 * Set any value to `null` to simulate a new user with no saved data.
 */

// ── Vehicle ──────────────────────────────────────────────────────
export interface VehicleData {
  model: string;
  color: string;
  plate: string;
}

let savedVehicle: VehicleData | null = {
  model: "Toyota Vios 1.3 E",
  color: "Pearl White",
  plate: "ABC 1234",
};

export function getVehicle(): VehicleData | null { return savedVehicle; }
export function saveVehicle(data: VehicleData) { savedVehicle = { ...data }; }
export function clearVehicle() { savedVehicle = null; }

// ── Payment Method ────────────────────────────────────────────────
// null → new user, no payment method on file → prompt required
let savedPayment: string | null = "GCash";

export function getPayment(): string | null { return savedPayment; }
export function savePayment(method: string) { savedPayment = method; }
export function clearPayment() { savedPayment = null; }
