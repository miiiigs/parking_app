import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { resolveOperatorLocationContext } from '@/lib/operatorLocationServer'
import { getCurrentOperatorUser } from '@/lib/operatorAuth'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Parking Operator Dashboard',
  description: 'Professional parking lot operator management system',
  generator: 'v0.app',
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
  userScalable: false,
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const initialUser = await getCurrentOperatorUser()
  const locationContext = await resolveOperatorLocationContext()

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
