import React from 'react';
import './globals.css';
import Header from '../components/Header';
import ThemeProvider from '../components/theme-provider-fallback';

export const metadata = {
  title: 'Smart Parking Admin',
  description: 'Operator dashboard for parking reservations and slot control',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider attribute="class">
          <Header />
          <div className="container page-body">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
