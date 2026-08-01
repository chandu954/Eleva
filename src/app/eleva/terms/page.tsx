import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ElevaLogo } from '../_components/eleva-logo';

export const metadata: Metadata = {
  title: 'Terms — Eleva',
  description: 'The terms that govern your use of Eleva.',
};

const sections = [
  {
    h: 'Your account',
    p: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must provide accurate information when creating an account.',
  },
  {
    h: 'Use of the service',
    p: 'Eleva provides AI-assisted tools for resume tailoring, ATS analysis, cover letters, and application tracking. You are responsible for the final content of your documents. Do not misrepresent experience, credentials, or achievements in materials created with Eleva.',
  },
  {
    h: 'AI output',
    p: 'AI-generated suggestions are provided as drafts and may contain errors. You are responsible for reviewing and verifying all output before use.',
  },
  {
    h: 'Subscriptions',
    p: 'Paid features are billed according to the plan you select. You may cancel at any time; access continues until the end of the current billing period.',
  },
  {
    h: 'Acceptable use',
    p: 'You may not use Eleva to generate fraudulent documents, impersonate others, or engage in unlawful activity.',
  },
  {
    h: 'Limitation of liability',
    p: 'Eleva is provided as-is without warranties of any kind. We are not liable for hiring outcomes, application results, or indirect damages arising from use of the service.',
  },
  {
    h: 'Contact',
    p: 'For questions about these terms, email hello@eleva.app.',
  },
];

export default function ElevaTermsPage() {
  return (
    <main className="min-h-screen" style={{ background: 'rgb(var(--eleva-bg))' }}>
      <header className="border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/eleva" aria-label="Eleva home">
            <ElevaLogo size={24} asLink={false} />
          </Link>
          <Link
            href="/eleva"
            className="eleva-nav-link inline-flex items-center gap-1.5 text-[13px] font-medium"
            style={{ color: 'rgb(var(--eleva-muted-fg))' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to site
          </Link>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="font-display font-semibold tracking-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'rgb(var(--eleva-fg))' }}>
          Terms of Service
        </h1>
        <p className="mt-3 text-[14px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-[17px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{s.h}</h2>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{s.p}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
