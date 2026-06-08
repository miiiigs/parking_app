import React from 'react';
import './globals.css';
import Header from '../components/Header';
import ThemeProvider from '../components/theme-provider-fallback';
import { getCurrentAdminUser } from '../lib/adminAuth';
import { AdminProvider } from '../lib/admin-context';
import { resolveAdminLocationContext } from '../lib/adminLocationServer';

export const metadata = {
  title: 'Smart Parking Admin',
  description: 'Operator dashboard for parking reservations and slot control',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [adminUser, locationContext] = await Promise.all([
    getCurrentAdminUser(),
    resolveAdminLocationContext(),
  ]);

  return (
    <html lang="en">
      <body>
        <ThemeProvider attribute="class">
          <AdminProvider
            initialUser={adminUser}
            initialLocations={locationContext.locations}
            initialActiveLocation={locationContext.activeLocation}
          >
            <Header />
            <div className="container page-body">{children}</div>
          </AdminProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
