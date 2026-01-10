/**
 * Theme Context for managing light/dark mode and color palettes
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
type Palette = 'terracotta' | 'herb' | 'coastal' | 'bistro' | 'tuscan' | 'nordic';

export const PALETTES: { id: Palette; name: string; color: string }[] = [
  { id: 'terracotta', name: 'Warm Terracotta', color: '#C45D35' },
  { id: 'herb', name: 'Fresh Herb Garden', color: '#2D5A45' },
  { id: 'coastal', name: 'Coastal Kitchen', color: '#1E6B7B' },
  { id: 'bistro', name: 'French Bistro', color: '#8B2942' },
  { id: 'tuscan', name: 'Tuscan Sunset', color: '#C9883D' },
  { id: 'nordic', name: 'Modern Nordic', color: '#2E4057' },
];

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  palette: Palette;
  setTheme: (theme: Theme) => void;
  setPalette: (palette: Palette) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'recipe-journal-theme';
const PALETTE_STORAGE_KEY = 'recipe-journal-palette';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function getStoredTheme(): Theme {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  }
  return 'system';
}

function getStoredPalette(): Palette {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (stored && PALETTES.some(p => p.id === stored)) {
      return stored as Palette;
    }
  }
  return 'terracotta';
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [palette, setPaletteState] = useState<Palette>(getStoredPalette);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(
    theme === 'system' ? getSystemTheme() : theme
  );

  // Update resolved theme when theme changes
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(resolved);

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', resolved);

    // Store preference
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Apply palette to document when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette);
    localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  }, [palette]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newResolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        document.documentElement.setAttribute('data-theme', newResolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Initialize theme and palette on mount
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-palette', palette);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setPalette = (newPalette: Palette) => {
    setPaletteState(newPalette);
  };

  const toggleTheme = () => {
    setThemeState((current) => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'light';
      // If system, toggle to opposite of current resolved
      return resolvedTheme === 'light' ? 'dark' : 'light';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, palette, setTheme, setPalette, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
