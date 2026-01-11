import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme, PALETTES } from './ThemeContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
const mockMatchMedia = (matches: boolean) => {
  return jest.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
};

// Test component that uses the theme context
function TestComponent() {
  const { theme, resolvedTheme, palette, setTheme, setPalette, toggleTheme } = useTheme();

  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <span data-testid="palette">{palette}</span>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('system')}>Set System</button>
      <button onClick={() => setPalette('herb')}>Set Herb</button>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    window.matchMedia = mockMatchMedia(false); // Default to light mode
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-palette');
  });

  describe('PALETTES constant', () => {
    it('exports palette options', () => {
      expect(PALETTES).toBeDefined();
      expect(PALETTES.length).toBeGreaterThan(0);
    });

    it('includes terracotta palette', () => {
      const terracotta = PALETTES.find((p) => p.id === 'terracotta');
      expect(terracotta).toBeDefined();
      expect(terracotta?.name).toBe('Warm Terracotta');
    });

    it('each palette has id, name, and color', () => {
      PALETTES.forEach((palette) => {
        expect(palette.id).toBeDefined();
        expect(palette.name).toBeDefined();
        expect(palette.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('ThemeProvider', () => {
    it('provides default theme values', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('system');
      expect(screen.getByTestId('palette')).toHaveTextContent('terracotta');
    });

    it('resolves system theme to light when prefers-color-scheme is light', () => {
      window.matchMedia = mockMatchMedia(false);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
    });

    it('resolves system theme to dark when prefers-color-scheme is dark', () => {
      window.matchMedia = mockMatchMedia(true);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
    });

    it('loads theme from localStorage', () => {
      localStorageMock.setItem('recipe-journal-theme', 'dark');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });

    it('loads palette from localStorage', () => {
      localStorageMock.setItem('recipe-journal-palette', 'herb');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('palette')).toHaveTextContent('herb');
    });

    it('ignores invalid theme in localStorage', () => {
      localStorageMock.setItem('recipe-journal-theme', 'invalid-theme');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('system');
    });

    it('ignores invalid palette in localStorage', () => {
      localStorageMock.setItem('recipe-journal-palette', 'invalid-palette');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('palette')).toHaveTextContent('terracotta');
    });
  });

  describe('setTheme', () => {
    it('updates theme to light', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await userEvent.click(screen.getByText('Set Light'));

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
    });

    it('updates theme to dark', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await userEvent.click(screen.getByText('Set Dark'));

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
    });

    it('saves theme to localStorage', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await userEvent.click(screen.getByText('Set Dark'));

      expect(localStorageMock.getItem('recipe-journal-theme')).toBe('dark');
    });

    it('sets data-theme attribute on document', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await userEvent.click(screen.getByText('Set Dark'));

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('setPalette', () => {
    it('updates palette', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await userEvent.click(screen.getByText('Set Herb'));

      expect(screen.getByTestId('palette')).toHaveTextContent('herb');
    });

    it('saves palette to localStorage', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await userEvent.click(screen.getByText('Set Herb'));

      expect(localStorageMock.getItem('recipe-journal-palette')).toBe('herb');
    });

    it('sets data-palette attribute on document', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await userEvent.click(screen.getByText('Set Herb'));

      expect(document.documentElement.getAttribute('data-palette')).toBe('herb');
    });
  });

  describe('toggleTheme', () => {
    it('toggles from light to dark', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await userEvent.click(screen.getByText('Set Light'));
      await userEvent.click(screen.getByText('Toggle Theme'));

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });

    it('toggles from dark to light', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await userEvent.click(screen.getByText('Set Dark'));
      await userEvent.click(screen.getByText('Toggle Theme'));

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });

    it('toggles from system to opposite of resolved theme', async () => {
      window.matchMedia = mockMatchMedia(false); // Light mode

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Currently system -> light
      await userEvent.click(screen.getByText('Toggle Theme'));

      // Should toggle to dark (opposite of resolved light)
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });
  });

  describe('useTheme hook', () => {
    it('throws error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });
  });
});
