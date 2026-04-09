# Implementation Roadmap

## Phase 1 - MVP Foundation

- React Native Expo app for drivers
- Next.js operator dashboard
- Supabase schema and seed data
- Booking state model: reserved, validated, active, paid, expired
- Manual GCash and Maya payment confirmation
- Native Android testing with `expo run:android`
- EAS build profiles for Android and iOS release preparation

## Phase 2 - Core Booking Flows

- Authentication
- Location browsing
- Slot selection
- Arrival window selection
- Reservation confirmation
- QR-based validation
- Active session timer and billing summary

## Phase 3 - Operator Tools

- Slot occupancy dashboard
- Manual approval and conflict resolution
- No-show handling
- Occupied-slot dispute flow
- Revenue and session reports

## Phase 4 - Automation

- QR webhook events
- Automated session state transitions
- Push notifications for reminders and expirations
- Payment webhooks
- Optional ANPR and gate integrations

## Release Path

- Use Expo Go only for basic UI testing
- Use `expo run:android` for native Android testing during development
- Use EAS Build for Play Store and App Store release artifacts

## Phase 5 - Scale

- Multiple BGC locations
- Dynamic pricing
- Corporate accounts
- Private slot sharing
- Operational analytics
