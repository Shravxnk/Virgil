import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Virgil — Real-Time Banking Fraud Intelligence',
  description:
    'Multi-layered AI fraud detection and investigation platform for India\'s banking institutions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `
          :root {
            --font-inter: '${inter.style.fontFamily}';
            --font-mono: '${jetbrainsMono.style.fontFamily}';
          }
        ` }} />
      </head>
      <body
        className="antialiased"
        style={{ backgroundColor: 'var(--bg-base)', fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
