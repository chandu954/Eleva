import type { Metadata } from 'next';
import './globals-eleva.css';
import { ElevaThemeProvider } from './_components/theme-provider';
import { CommandPaletteProvider } from './_components/command-palette';

export const metadata: Metadata = {
  metadataBase: new URL('https://eleva.app'),
  title: 'Eleva — AI Career Operating System',
  description:
    'Tailor resumes, analyze ATS fit, create targeted cover letters, and manage your job search from one intelligent workspace.',
  alternates: {
    canonical: '/eleva',
  },
  openGraph: {
    type: 'website',
    siteName: 'Eleva',
    title: 'Eleva — AI Career Operating System',
    description:
      'Tailor resumes, analyze ATS fit, create targeted cover letters, and manage your job search from one intelligent workspace.',
    url: '/eleva',
    images: [{ url: '/og.webp', width: 1200, height: 630, alt: 'Eleva — AI Career Operating System' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Eleva — AI Career Operating System',
    description:
      'Tailor resumes, analyze ATS fit, create targeted cover letters, and manage your job search from one intelligent workspace.',
    images: ['/og.webp'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ElevaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="eleva-root min-h-screen" data-testid="eleva-root">
      <ElevaThemeProvider>
        <CommandPaletteProvider>{children}</CommandPaletteProvider>
      </ElevaThemeProvider>
    </div>
  );
}
