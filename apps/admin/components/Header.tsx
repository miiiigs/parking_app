'use client';

import Link from 'next/link';

import { useAdmin } from '../lib/admin-context';
import { hasAdminCapability } from '../lib/adminPermissions';
import { LocationSwitcher } from './layout/location-switcher';

const navigation = [
  { href: '/', label: 'Dashboard', capability: 'view-dashboard' as const },
  { href: '/parking-map', label: 'Map', capability: 'view-parking-map' as const },
  { href: '/lot-builder', label: 'Builder', capability: 'edit-map-layout' as const },
  { href: '/qr', label: 'QR', capability: 'view-parking-map' as const },
];

export default function Header() {
  const { user, activeLocation } = useAdmin();

  return (
    <header className="app-header">
      <div className="container app-header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/" className="brand">
            Smart Parking
          </Link>
          {user ? (
            <nav className="main-nav" aria-label="Main navigation">
              {navigation
                .filter((item) => hasAdminCapability(user.role, item.capability))
                .map((item) => (
                  <Link key={item.href} href={item.href} className="nav-link">
                    {item.label}
                  </Link>
                ))}
            </nav>
          ) : (
            <nav className="main-nav" aria-label="Main navigation">
              <Link href="/login" className="nav-link">
                Login
              </Link>
            </nav>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user ? <LocationSwitcher /> : null}
          <div className="operator-badge">
            {user ? `${user.role}${activeLocation?.name ? ` · ${activeLocation.name}` : ''}` : 'Guest'}
          </div>
        </div>
      </div>
    </header>
  );
}
