import type { Metadata } from 'next';
import { Inter, Noto_Sans_Telugu } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';
import { RoleProvider } from '@/lib/roles';
import { LocaleProvider } from '@/localization';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansTelugu = Noto_Sans_Telugu({
  weight: ['400', '500', '600', '700'],
  subsets: ['telugu'],
  variable: '--font-noto-telugu',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GraniteMeasure AI | 3D Photogrammetry & Volumetric Audit',
  description:
    'Government-grade 3D photogrammetric granite block measurement, geometric volumetric certification, and seigniorage assessment system.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${notoSansTelugu.variable}`}>
      <body className="antialiased">
        <ThemeProvider>
          <RoleProvider>
            <LocaleProvider>
              {children}
            </LocaleProvider>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
