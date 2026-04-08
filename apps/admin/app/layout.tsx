import React from 'react';

export const metadata = {
  title: 'Smart Parking Admin',
  description: 'Operator dashboard for parking reservations and slot control',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Inter, Arial, sans-serif', background: '#07111d', color: '#f5f7fb' }}>
        {children}
      </body>
    </html>
  );
}
