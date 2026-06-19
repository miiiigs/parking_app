'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signOutOperator } from '@/app/actions';
import { useAuth } from '@/lib/auth-context';
import { hasOperatorCapability } from '@/lib/operatorPermissions';
import { LocationSwitcher } from './location-switcher';
import {
  BarChart3,
  Clock,
  CreditCard,
  Eye,
  Map,
  Zap,
  ShieldCheck,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3, capability: 'view-dashboard' as const },
  { name: 'Live Reservations', href: '/dashboard/reservations', icon: Clock, capability: 'view-reservations' as const },
  { name: 'Audit Trail', href: '/dashboard/audit', icon: Eye, capability: 'view-audit' as const },
  { name: 'Parking Map', href: '/dashboard/map', icon: Map, capability: 'view-parking-map' as const },
  { name: 'Map Builder', href: '/dashboard/map-builder', icon: Zap, capability: 'edit-map-layout' as const },
  { name: 'Parking Setup', href: '/dashboard/parking-setup', icon: CreditCard, capability: 'manage-pricing' as const },
  { name: 'Admin Tools', href: '/dashboard/admin-tools', icon: ShieldCheck, capability: 'run-reconciliation' as const },
];

interface DashboardLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

export function DashboardLayout({ children, fullWidth = false }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, activeLocation } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const showExpandedSidebar = sidebarExpanded || mobileSidebarOpen;

  const isActive = (href: string) => {
    if (!pathname) {
      return false;
    }

    if (href === '/dashboard') {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="flex h-screen bg-background">
      {mobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ${
          mobileSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full w-64 lg:translate-x-0'
        } lg:relative lg:z-auto`}
        style={{ width: showExpandedSidebar ? '16rem' : '5rem' }}
      >
        {/* Logo */}
        <div className="border-b border-border p-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold">
              P
            </div>
            {showExpandedSidebar && (
              <div>
                <div className="font-bold text-foreground">ParkHub</div>
                <div className="text-xs text-muted-foreground">Operator</div>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.filter((item) => hasOperatorCapability(user?.role, item.capability)).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {showExpandedSidebar && <span className="text-sm font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-border p-4 space-y-3">
          {showExpandedSidebar && (
            <div className="px-2 py-2 bg-secondary rounded-lg">
              <div className="text-xs font-medium text-foreground truncate">{user?.name}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email || user?.phone}</div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/80">{user?.role}</div>
            </div>
          )}
          <form action={signOutOperator}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full border-border text-muted-foreground hover:text-destructive hover:border-destructive"
            >
              {showExpandedSidebar ? (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </>
              ) : (
                <LogOut className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-4 sm:px-6">
          <button
            onClick={() => setMobileSidebarOpen((current) => !current)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setSidebarExpanded((current) => !current)}
            className="hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:block"
          >
            {sidebarExpanded ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            <LocationSwitcher />
            <div className="min-w-0 text-right">
              <div className="truncate text-sm font-medium text-foreground">{activeLocation?.name ?? 'No location selected'}</div>
              <div className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background">
          <div
            key={activeLocation?.id ?? 'no-location'}
            className={fullWidth ? 'w-full p-4 sm:p-6' : 'mx-auto w-full max-w-[1600px] p-4 sm:p-6'}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
