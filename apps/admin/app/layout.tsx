import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Smart Parking Admin',
  description: 'Operator dashboard for parking reservations and slot control',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Inter, Arial, sans-serif', background: '#07111d', color: '#f5f7fb' }}>
        <header style={{ borderBottom: '1px solid #0f2436', background: 'linear-gradient(180deg, rgba(7,17,29,0.6), rgba(7,11,19,0.85))' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <Link href="/" style={{ color: '#7bd3ff', fontWeight: 800, fontSize: 18, textDecoration: 'none' }}>Smart Parking</Link>
              <nav style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Link href="/" style={{ color: '#a9bdd6', textDecoration: 'none' }}>Dashboard</Link>
                <Link href="/qr" style={{ color: '#a9bdd6', textDecoration: 'none' }}>QR</Link>
                <Link href="/login" style={{ color: '#a9bdd6', textDecoration: 'none' }}>Login</Link>
              </nav>
            </div>
            <div style={{ color: '#7bd3ff', fontWeight: 700, fontSize: 13 }}>Operator</div>
          </div>
        </header>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>{children}</div>
      </body>
    </html>
  );
}
