import type { ParkingLot } from '../types';

const sharedSlots: ParkingLot['slots'] = [
  { id: 'A1', number: 'A1', isAvailable: true, status: 'available', x: 20, y: 20 },
  { id: 'A2', number: 'A2', isAvailable: false, status: 'occupied', x: 80, y: 20 },
  { id: 'A3', number: 'A3', isAvailable: true, status: 'available', x: 140, y: 20 },
  { id: 'A4', number: 'A4', isAvailable: true, status: 'available', x: 200, y: 20 },
  { id: 'B1', number: 'B1', isAvailable: true, status: 'available', x: 20, y: 80 },
  { id: 'B2', number: 'B2', isAvailable: true, status: 'available', x: 80, y: 80 },
  { id: 'B3', number: 'B3', isAvailable: false, status: 'occupied', x: 140, y: 80 },
  { id: 'B4', number: 'B4', isAvailable: true, status: 'available', x: 200, y: 80 },
  { id: 'C1', number: 'C1', isAvailable: true, status: 'available', x: 20, y: 140 },
  { id: 'C2', number: 'C2', isAvailable: true, status: 'available', x: 80, y: 140 },
  { id: 'C3', number: 'C3', isAvailable: true, status: 'available', x: 140, y: 140 },
  { id: 'C4', number: 'C4', isAvailable: false, status: 'occupied', x: 200, y: 140 },
];

export const parkingLots: ParkingLot[] = [
  {
    id: '1',
    name: 'Downtown Plaza Parking',
    address: '123 Main Street, Downtown',
    availableSlots: 24,
    totalSlots: 100,
    distanceKm: 0.3,
    pricePerHour: 5,
    features: ['Covered', 'CCTV', 'EV ready'],
    slots: sharedSlots,
  },
  {
    id: '2',
    name: 'Central Mall Garage',
    address: '456 Center Ave, Midtown',
    availableSlots: 45,
    totalSlots: 200,
    distanceKm: 0.8,
    pricePerHour: 4,
    features: ['Mall access', '24/7', 'Women-only bays'],
    slots: sharedSlots.map((slot, index) => ({
      ...slot,
      id: `M-${slot.id}`,
      number: `M${index + 1}`,
      isAvailable: index % 4 !== 1,
      status: index % 4 !== 1 ? 'available' : 'occupied',
    })),
  },
  {
    id: '3',
    name: 'Riverside Parking Tower',
    address: '789 River Road, Waterfront',
    availableSlots: 12,
    totalSlots: 150,
    distanceKm: 1.2,
    pricePerHour: 6,
    features: ['Valet lane', 'Wide bays', 'Weatherproof'],
    slots: sharedSlots.map((slot, index) => ({
      ...slot,
      id: `R-${slot.id}`,
      number: `R${index + 1}`,
      isAvailable: index % 3 !== 0,
      status: index % 3 !== 0 ? 'available' : 'occupied',
    })),
  },
  {
    id: '4',
    name: 'Business District Lot',
    address: '321 Corporate Blvd, Financial District',
    availableSlots: 67,
    totalSlots: 180,
    distanceKm: 1.5,
    pricePerHour: 7,
    features: ['Invoice ready', 'Fast entry', 'Security desk'],
    slots: sharedSlots.map((slot, index) => ({
      ...slot,
      id: `B-${slot.id}`,
      number: `B${index + 1}`,
      isAvailable: index !== 2 && index !== 8,
      status: index !== 2 && index !== 8 ? 'available' : 'occupied',
    })),
  },
];

export function getParkingLotById(lotId: string) {
  return parkingLots.find((lot) => lot.id === lotId);
}
