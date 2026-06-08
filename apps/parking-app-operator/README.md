# ParkHub - Professional Parking Operator Dashboard

A production-ready parking lot operator management system built with Next.js 16, TypeScript, and Tailwind CSS. This comprehensive dashboard enables operators to manage parking lot operations with real-time monitoring, slot management, and complete audit trails.

## Features

### 🔐 Authentication
- **Email/Password Login** - Secure credential-based access
- **Phone OTP Authentication** - SMS-based verification for operators
- **OAuth Integration** - Support for Google and GitHub authentication
- Mock authentication for demo/testing purposes

### 📊 Dashboard
- **Key Metrics** - Real-time KPI display showing:
  - Active Reservations
  - Occupied Slots
  - Completed Sessions
  - No-Shows
  - Data Mismatches
  - Total Revenue
  - Occupancy Rate
  - Average Session Duration
- **Active Reservations** - Live table of ongoing bookings with search and filters
- **Data Visualization** - Progress bars and status indicators

### 📋 Live Reservations
- **Complete Reservation Table** - All reservations with detailed information
- **Advanced Search** - Filter by reservation ID, vehicle number, or driver name
- **Status Filters** - View by Active, Completed, or No-Show status
- **Payment Status** - Track payment completion for each reservation
- **Revenue Tracking** - Display amount for each reservation

### 🅿️ Slot Board
- **Grid Layout** - Visual representation of all parking slots
- **Color-Coded Status**:
  - 🟢 Green - Available
  - 🔴 Red - Occupied
  - 🔵 Blue - Reserved
  - ⚫ Gray - Maintenance
- **Manual Status Control** - Click slots to manually change status
- **Status Filters** - Filter by availability status
- **Real-Time Statistics** - Live count of slots by status

### 🗺️ Parking Map
- **SVG-Based Visualization** - Interactive parking lot layout
- **Zoom Controls** - Zoom in/out for detailed viewing
- **Slot Selection** - Click slots to view detailed information
- **Status Indicators** - Color-coded slot display
- **Legend** - Clear status reference guide

### 🛠️ Map Builder
- **Drag-and-Drop Editing** - Create and customize parking layouts
- **Grid-Based Snapping** - Precise slot placement with adjustable grid size
- **Slot Properties Editor** - Customize:
  - Slot Number
  - Position (X, Y)
  - Dimensions (Width, Height)
  - Vehicle Type (Standard, Compact, Handicap)
- **Add/Delete Slots** - Dynamic slot management
- **Duplicate Slots** - Quick copy slots for repetitive layouts
- **Save Functionality** - Persist custom maps

### 📈 Audit Trail
- **Complete Event Log** - Full history of all operations
- **Production Health Dashboard**:
  - Successful Operations Count
  - Failed Operations Count
  - Success Rate Percentage
  - System Status Monitoring
- **Advanced Filtering**:
  - Search by action, operator, or details
  - Filter by success/failure status
  - Filter by action type
- **Export Functionality** - Download audit logs
- **Detailed Information**:
  - Timestamp
  - Action Type
  - Operator Name
  - Affected Slot
  - Operation Details
  - Success/Failure Status

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **State Management**: React Context API

### Architecture
- **Authentication**: Custom Context-based auth system
- **Mock Data**: Realistic sample data for demo/testing
- **SVG Graphics**: Native SVG for parking maps (no external mapping libraries)
- **Responsive Design**: Mobile-first approach
- **Dark Theme**: Professional dark mode optimized for operators

## Project Structure

```
app/
├── layout.tsx              # Root layout with auth provider
├── page.tsx                # Redirect to dashboard
├── login/
│   └── page.tsx            # Login page
└── dashboard/
    ├── page.tsx            # Main dashboard
    ├── reservations/       # Live reservations
    │   └── page.tsx
    ├── slots/              # Slot board
    │   └── page.tsx
    ├── audit/              # Audit trail
    │   └── page.tsx
    ├── map/                # Parking map viewer
    │   └── page.tsx
    └── map-builder/        # Interactive map editor
        └── page.tsx

components/
├── auth/
│   └── login-form.tsx      # Multi-method login form
├── layout/
│   └── dashboard-layout.tsx # Dashboard sidebar & navigation
├── dashboard/
│   ├── metrics.tsx         # KPI cards
│   └── recent-reservations.tsx # Active reservations table
└── ui/                     # shadcn/ui components

lib/
├── types.ts                # TypeScript interfaces
├── mock-data.ts            # Sample data
└── auth-context.tsx        # Authentication context

styles/
└── globals.css             # Global styles & theme
```

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open browser
# http://localhost:3000
```

### Login Credentials

For demo purposes, you can login with any credentials:

**Email Tab:**
- Email: `operator@parkhub.com`
- Password: `any-password`

**Phone Tab:**
- Phone: `+1 (555) 000-0000`
- OTP: `any-code`

**OAuth Tab:**
- Click "Continue with Google" or "Continue with GitHub"

## Color Scheme

The app uses a professional dark theme optimized for operator use:

| Color | Usage | Value |
|-------|-------|-------|
| Background | Main background | `#0f0f0f` |
| Card | Panel backgrounds | `#1a1a1a` |
| Primary | CTAs, active states | `#3b82f6` (Blue) |
| Accent | Success, available | `#10b981` (Green) |
| Destructive | Errors, occupied | `#ef4444` (Red) |
| Foreground | Text | `#f5f5f5` |
| Muted | Secondary text | `#a0a0a0` |

## Key Components

### DashboardLayout
- Responsive sidebar navigation
- Collapsible menu for compact view
- User info and logout functionality
- Top bar with date display

### Dashboard Metrics
- Grid layout of KPI cards
- Icon indicators with color coding
- Occupancy rate progress bar
- Average session duration

### Slot Board
- Grid display of parking slots
- Click to view/modify slot details
- Status change controls
- Color-coded visualization

### Parking Map
- SVG-based interactive map
- Zoom and reset controls
- Slot selection details
- Legend reference

### Map Builder
- Drag-and-drop slot placement
- Grid-snapping for alignment
- Properties panel for customization
- Slot list management

## API Integration Ready

The mock data layer is designed to integrate seamlessly with a real backend:

### Replace Mock Data with API Calls

Replace data fetching in components with actual API endpoints:

```typescript
// Instead of:
import { mockReservations } from '@/lib/mock-data';

// Use:
const { data: reservations } = useSWR('/api/reservations', fetcher);
```

### Data Models

All TypeScript types are defined in `/lib/types.ts` for easy integration:

- `Reservation` - Parking reservation details
- `ParkingSlot` - Individual slot information
- `AuditLog` - Operation audit trail
- `DashboardMetrics` - KPI data
- `ParkingMap` - Map layout definition
- `User` - Operator user details

## Performance Optimizations

- ✅ Component-based architecture for code splitting
- ✅ Optimized rendering with proper React hooks
- ✅ SVG graphics (no heavy map libraries)
- ✅ Responsive design with Tailwind CSS
- ✅ Efficient search/filter implementation
- ✅ Proper use of Next.js features

## Accessibility

- ✅ Semantic HTML structure
- ✅ ARIA labels and roles
- ✅ Keyboard navigation support
- ✅ Color contrast compliance
- ✅ Screen reader friendly

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Production Deployment

### Vercel (Recommended)
```bash
# One-click deployment
# Connect your repository and deploy
```

### Environment Variables
No special environment variables needed for the demo version. When integrating with a real backend, add:

```env
NEXT_PUBLIC_API_URL=https://api.example.com
DATABASE_URL=postgresql://...
AUTH_SECRET=your-secret-key
```

## Future Enhancements

- [ ] Backend API integration
- [ ] Real-time WebSocket updates
- [ ] User role management
- [ ] Advanced analytics and reporting
- [ ] Mobile app
- [ ] Integration with parking payment systems
- [ ] SMS/Email notifications
- [ ] Multiple parking lot management
- [ ] Custom branding options
- [ ] Advanced search and export features

## License

This project is created for commercial use. All rights reserved.

## Support

For issues, questions, or feature requests, please contact support@parkhub.com

---

**Built with ❤️ by ParkHub Team**

Professional parking management made simple and powerful.
