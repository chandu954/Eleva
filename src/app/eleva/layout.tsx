import type { Metadata } from 'next';
import './globals-eleva.css';
import { ElevaThemeProvider } from './_components/theme-provider';
import { CommandPaletteProvider } from './_components/command-palette';

export const metadata: Metadata = {
  title: 'Eleva — Elevate Every Opportunity',
  description: 'AI Career Operating System. Tailored resumes, ATS optimization, and cover letters powered by AI.',
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
