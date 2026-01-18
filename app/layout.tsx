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
  manifest: '/manifest.json',
  themeColor: '#E07A5F',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Recipe Journal',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
    ],
  },
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
