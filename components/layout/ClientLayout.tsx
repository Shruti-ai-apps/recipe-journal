'use client';

/**
 * Client-side layout component with navigation
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { MigrationBanner } from '@/components/migration';
import { OfflineBanner, InstallPrompt } from '@/components/common';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();

  return (
    <>
      <nav className="nav-tabs">
        <Link
          href="/"
          className={`nav-tab ${pathname === '/' ? 'nav-tab--active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Import</span>
        </Link>
        <Link
          href="/favorites"
          className={`nav-tab ${pathname === '/favorites' ? 'nav-tab--active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span>Favorites</span>
        </Link>
      </nav>

      <main className="main-content">
        <MigrationBanner />
        {children}
      </main>

      <footer className="footer">
        <p>Recipe Journal - Import, scale, and save your favorite recipes</p>
      </footer>

      <OfflineBanner />
      <InstallPrompt />
    </>
  );
}
