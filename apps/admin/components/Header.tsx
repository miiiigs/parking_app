import React from 'react'
import Link from 'next/link'

export default function Header() {
  return (
    <header className="app-header">
      <div className="container app-header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/" className="brand">
            Smart Parking
          </Link>
          <nav className="main-nav" aria-label="Main navigation">
            <Link href="/" className="nav-link">
              Dashboard
            </Link>
            <Link href="/parking-map" className="nav-link">
              Map
            </Link>
            <Link href="/lot-builder" className="nav-link">
              Builder
            </Link>
            <Link href="/qr" className="nav-link">
              QR
            </Link>
            <Link href="/login" className="nav-link">
              Login
            </Link>
          </nav>
        </div>
        <div className="operator-badge">Operator</div>
      </div>
    </header>
  )
}
