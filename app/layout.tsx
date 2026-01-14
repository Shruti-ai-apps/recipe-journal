import type { Metadata } from 'next';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import Header from '@/components/layout/Header';
import ClientLayout from '@/components/layout/ClientLayout';
import './globals.css';
import './layout.css';

export const metadata: Metadata = {
  title: 'Recipe Journal',
  description: 'Import, scale, and save your favorite recipes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <FavoritesProvider>
            <ThemeProvider>
              <div className="app">
                <Header />
                <ClientLayout>
                  {children}
                </ClientLayout>
              </div>
            </ThemeProvider>
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
