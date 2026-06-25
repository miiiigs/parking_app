import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { resolveOperatorLocationContext } from '@/lib/operatorLocationServer'
import { getCurrentOperatorUser } from '@/lib/operatorAuth'
import './globals.css'

export const metadata: Metadata = {
  title: 'Parking Operator Dashboard',
  description: 'Professional parking lot operator management system',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f0f0f',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const initialUser = await getCurrentOperatorUser()
  const locationContext = await resolveOperatorLocationContext(initialUser)

  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-background text-foreground">
        <AuthProvider
          initialUser={initialUser}
          initialLocations={locationContext.locations}
          initialActiveLocation={locationContext.activeLocation}
        >
          {children}
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
