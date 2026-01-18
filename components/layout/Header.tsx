'use client';

/**
 * Header component with theme toggle, palette selector, and user menu
 */

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTheme, PALETTES } from '@/contexts/ThemeContext';
import { UserMenu } from '@/components/auth';
import { SyncStatus } from '@/components/common';
import './Header.css';

function Header() {
  const { resolvedTheme, toggleTheme, palette, setPalette } = useTheme();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch by only rendering theme-dependent UI after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close palette dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        setIsPaletteOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentPalette = PALETTES.find(p => p.id === palette);

  return (
    <header className="header">
      <div className="header-content">
        <Link href="/" className="logo">
          <svg
            className="logo-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
            <line x1="6" y1="17" x2="18" y2="17" />
          </svg>
          <span className="logo-text">Recipe Journal</span>
        </Link>
        <nav className="nav">
          {/* Palette Selector */}
          <div className="palette-selector" ref={paletteRef}>
            <button
              className="palette-toggle"
              onClick={() => setIsPaletteOpen(!isPaletteOpen)}
              aria-label="Choose color palette"
              title="Choose color palette"
            >
              <span
                className="palette-swatch"
                style={{ backgroundColor: mounted ? currentPalette?.color : undefined }}
              />
              <svg
                className={`palette-chevron ${isPaletteOpen ? 'palette-chevron--open' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isPaletteOpen && (
              <div className="palette-dropdown">
                <div className="palette-dropdown-header">Color Palette</div>
                {PALETTES.map((p) => (
                  <button
                    key={p.id}
                    className={`palette-option ${palette === p.id ? 'palette-option--active' : ''}`}
                    onClick={() => {
                      setPalette(p.id);
                      setIsPaletteOpen(false);
                    }}
                  >
                    <span
                      className="palette-option-swatch"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="palette-option-name">{p.name}</span>
                    {palette === p.id && (
                      <svg
                        className="palette-option-check"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle - only render theme-dependent icon after mount to prevent hydration mismatch */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
          >
            {!mounted ? (
              // Placeholder during SSR - use a neutral icon
              <svg
                className="theme-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
              </svg>
            ) : resolvedTheme === 'light' ? (
              <svg
                className="theme-icon theme-icon--moon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg
                className="theme-icon theme-icon--sun"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>

          <Link href="/favorites" className="nav-link">
            Favorites
          </Link>

          <SyncStatus />
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}

export default Header;
