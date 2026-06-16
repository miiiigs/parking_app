export const PARKING_LOTS = [
  {
    id: "1",
    name: "SM Mall of Asia",
    address: "Seaside Blvd., Pasay City",
    available: 124,
    total: 280,
    price: 50,
    hours: "06:00 AM – 12:00 MN",
    distance: "1.2 km",
    type: "Mall",
  },
  {
    id: "2",
    name: "Ayala Malls Manila Bay",
    address: "Diosdado Macapagal Ave., Pasay City",
    available: 87,
    total: 200,
    price: 60,
    hours: "07:00 AM – 11:00 PM",
    distance: "1.8 km",
    type: "Mall",
  },
  {
    id: "3",
    name: "Robinsons Place Manila",
    address: "Pedro Gil St., Ermita, Manila",
    available: 56,
    total: 150,
    price: 40,
    hours: "08:00 AM – 10:00 PM",
    distance: "2.4 km",
    type: "Mall",
  },
  {
    id: "4",
    name: "BGC High Street",
    address: "9th Avenue, Bonifacio Global City, Taguig",
    available: 203,
    total: 350,
    price: 70,
    hours: "Open 24 Hours",
    distance: "3.1 km",
    type: "Commercial",
  },
  {
    id: "5",
    name: "Greenbelt 5",
    address: "Ayala Ave., Makati City",
    available: 45,
    total: 120,
    price: 80,
    hours: "07:00 AM – 12:00 MN",
    distance: "4.0 km",
    type: "Mall",
  },
];

export const SLOT_STATES: Record<string, "available" | "occupied" | "reserved"> = {
  "A1": "available", "A2": "occupied",  "A3": "available", "A4": "occupied",  "A5": "available", "A6": "occupied",
  "B1": "occupied",  "B2": "available", "B3": "occupied",  "B4": "available", "B5": "reserved",  "B6": "available",
  "C1": "available", "C2": "occupied",  "C3": "available", "C4": "occupied",  "C5": "available", "C6": "occupied",
  "D1": "occupied",  "D2": "available", "D3": "occupied",  "D4": "available", "D5": "occupied",  "D6": "available",
};

export const MOCK_USER = {
  name: "Juan dela Cruz",
  email: "juan@email.com",
  mobile: "+63 912 345 6789",
  vehicle: { model: "Toyota Vios 1.3 E", color: "Pearl White", plate: "ABC 1234" },
};

export const MOCK_SESSION = {
  lot: "SM Mall of Asia",
  slot: "B-4",
  level: "Level 2",
  vehicle: "Toyota Vios 1.3 E",
  plate: "ABC 1234",
  color: "Pearl White",
  startTime: "2:30 PM",
  reservationFee: 20,
  ratePerHour: 50,
};

export const C = {
  primary: "#0F766E",
  accent: "#34D399",
  bg: "#FAFAF9",
  card: "#FFFFFF",
  text: "#1E293B",
  muted: "#64748B",
  border: "#E2E8F0",
  danger: "#EF4444",
  warning: "#F59E0B",
};
