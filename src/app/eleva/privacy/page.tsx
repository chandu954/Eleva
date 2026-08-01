import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ElevaLogo } from '../_components/eleva-logo';

export const metadata: Metadata = {
  title: 'Privacy — Eleva',
  description: 'How Eleva collects, uses, and protects your data.',
};

const sections = [
  {
    h: 'Information we collect',
    p: 'Eleva collects the information you provide directly: your account details, resume content, job descriptions you save, and application records. We also collect basic usage data needed to operate and improve the service.',
  },
  {
    h: 'How we use your information',
    p: 'Your data is used to provide the core service: tailoring resumes, running ATS analysis, generating cover letters, and tracking applications. Resume content is processed by our AI providers solely to produce the output you request. We do not sell your personal information.',
  },
  {
    h: 'AI processing',
    p: 'When you use AI features, the relevant document content is sent to the AI provider you select in order to generate suggestions. Content is used only to fulfill your request and is not used to train our models.',
  },
  {
    h: 'Data retention',
    p: 'Your account data is retained while your account is active. You may delete your account and associated data at any time by contacting us.',
  },
  {
    h: 'Security',
    p: 'We use industry-standard measures, including encryption in transit and at rest, access controls, and regular security reviews to protect your data.',
  },
  {
    h: 'Contact',
    p: 'For privacy questions or requests, email hello@eleva.app.',
  },
];

export default function ElevaPrivacyPage() {
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
          Privacy Policy
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
