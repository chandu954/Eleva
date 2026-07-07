'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  Check,
  Zap,
  Target,
  FileText,
  Wand2,
  BarChart3,
  ShieldCheck,
  Command as CommandIcon,
} from 'lucide-react';
import { ElevaLogo } from './_components/eleva-logo';
import { useCommandPalette } from './_components/command-palette';

const logos = ['Google', 'Stripe', 'Airbnb', 'Vercel', 'Linear', 'Notion', 'Ramp', 'Figma'];

const features = [
  {
    icon: Wand2,
    title: 'Tailor to any job in seconds',
    body: 'Paste a JD and Eleva rewrites bullets, injects missing keywords, and reorders sections to match the recruiter\'s brain.',
  },
  {
    icon: Target,
    title: 'ATS score you can trust',
    body: 'Real parser simulation, not a keyword blender. See exactly what recruiters see before you hit apply.',
  },
  {
    icon: BarChart3,
    title: 'Career analytics',
    body: 'Track applications, interview conversion, and resume performance across companies over time.',
  },
  {
    icon: ShieldCheck,
    title: 'Honest AI',
    body: 'Eleva enhances the truth — never fabricates. Every suggestion is grounded in your real experience.',
  },
];

const testimonials = [
  { name: 'Priya Kapoor', role: 'Staff Engineer · Stripe', quote: 'Eleva turned my resume into a system I can iterate on. Hit 96% ATS on the first pass.' },
  { name: 'Marcus Chen', role: 'Product Manager · Notion', quote: 'The copilot rewrote bullets I\'d been stuck on for weeks. I got 3 callbacks in a week.' },
  { name: 'Ana García', role: 'Designer · Figma', quote: 'It finally feels like a career workspace, not a form. This is the future of applying.' },
];

export default function ElevaLanding() {
  const { open } = useCommandPalette();

  return (
    <div className="relative">
      {/* Aurora orbs */}
      <div className="eleva-orb" style={{ top: -80, left: -60, width: 380, height: 380, background: 'rgb(var(--eleva-primary))' }} />
      <div className="eleva-orb" style={{ top: 60, right: -80, width: 420, height: 420, background: 'rgb(var(--eleva-secondary))' }} />

      {/* Nav */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center">
        <ElevaLogo />
        <div className="hidden md:flex items-center gap-8 ml-12 text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#pricing">Pricing</a>
          <a href="#changelog">Changelog</a>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={open} className="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg text-[13px]" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
            <CommandIcon className="w-3.5 h-3.5" />
            <span className="eleva-kbd">⌘K</span>
          </button>
          <Link href="/eleva/auth/login" className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>
            Sign in
          </Link>
          <Link href="/eleva/auth/signup" data-testid="cta-get-started-nav" className="eleva-btn-primary text-[13px] !py-2 !px-4">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl"
        >
          <div className="eleva-pill mb-6 inline-flex">
            <Sparkles className="w-3 h-3" style={{ color: 'rgb(var(--eleva-primary))' }} />
            Introducing Eleva 2.0 — the AI Career OS
            <ArrowUpRight className="w-3 h-3 opacity-60" />
          </div>
          <h1 className="font-display text-[56px] md:text-[84px] leading-[0.95] tracking-[-0.03em] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>
            Elevate every<br />
            <span className="eleva-gradient-text">opportunity.</span>
          </h1>
          <p className="mt-8 text-[18px] md:text-[20px] leading-relaxed max-w-2xl" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            The AI workspace for your career. Build ATS-perfect resumes, tailor them to every job, and generate cover letters that actually sound like you — all in one command bar.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/eleva/dashboard" data-testid="cta-get-started" className="eleva-btn-primary inline-flex items-center gap-2">
              Enter the workspace
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <button onClick={open} className="eleva-btn-ghost inline-flex items-center gap-2" data-testid="cta-watch-demo">
              <CommandIcon className="w-4 h-4" />
              Try command palette
            </button>
            <div className="flex items-center gap-2 ml-2 text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              <Check className="w-4 h-4" style={{ color: 'rgb(var(--eleva-success))' }} />
              14-day trial · No card required
            </div>
          </div>
        </motion.div>

        {/* Product mock */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="mt-20 relative eleva-grain"
        >
          <div
            className="rounded-2xl overflow-hidden border relative"
            style={{
              borderColor: 'rgb(var(--eleva-border))',
              background: 'rgb(var(--eleva-card))',
              boxShadow: '0 40px 100px -20px rgba(2,6,23,0.25)',
            }}
          >
            {/* window chrome */}
            <div className="h-10 border-b flex items-center gap-2 px-4" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f87171' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#fbbf24' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#34d399' }} />
              <div className="mx-auto text-[12px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                eleva.app/workspace
              </div>
            </div>
            {/* app mock */}
            <div className="grid grid-cols-[220px_1fr_1fr] min-h-[440px]">
              <div className="border-r p-4 space-y-2" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
                {['Dashboard', 'Studio', 'Resumes', 'Cover Letters', 'ATS Match', 'Analytics'].map((n, i) => (
                  <div
                    key={n}
                    className="flex items-center gap-2 h-9 px-3 rounded-lg text-[13px]"
                    style={{
                      background: i === 1 ? 'rgb(var(--eleva-muted))' : 'transparent',
                      color: i === 1 ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))',
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: i === 1 ? 'rgb(var(--eleva-primary))' : 'transparent' }} />
                    {n}
                  </div>
                ))}
              </div>
              <div className="p-6 border-r" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
                <div className="text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  ATS Analysis · Live
                </div>
                <div className="text-4xl font-display font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>
                  96<span className="text-[20px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>%</span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Keyword match', v: 94, c: 'rgb(var(--eleva-success))' },
                    { label: 'Impact language', v: 88, c: 'rgb(var(--eleva-primary))' },
                    { label: 'Formatting', v: 100, c: 'rgb(var(--eleva-success))' },
                    { label: 'Recruiter signal', v: 82, c: 'rgb(var(--eleva-secondary))' },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{m.label}</span>
                        <span className="font-mono" style={{ color: 'rgb(var(--eleva-fg))' }}>{m.v}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${m.v}%` }}
                          transition={{ duration: 1.4, delay: 0.3 }}
                          className="h-full rounded-full"
                          style={{ background: m.c }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-3 rounded-lg text-[11px] leading-relaxed" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                  <span className="font-medium" style={{ color: 'rgb(var(--eleva-primary))' }}>Eleva AI:</span>{' '}
                  Add &ldquo;distributed systems&rdquo; and &ldquo;SLO ownership&rdquo; — this JD weights them 2.3× vs baseline.
                </div>
              </div>
              <div className="p-6">
                <div className="text-[11px] font-mono uppercase tracking-widest mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  Preview · Google Backend
                </div>
                <div className="rounded-lg p-4 h-full" style={{ background: '#fff', border: '1px solid rgb(var(--eleva-border))' }}>
                  <div className="text-[14px] font-semibold text-slate-900">Ashish Sharma</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Senior Backend Engineer · San Francisco</div>
                  <div className="mt-3 h-px" style={{ background: '#e2e8f0' }} />
                  <div className="mt-3 space-y-1.5">
                    <div className="h-2 rounded-full bg-slate-200 w-11/12" />
                    <div className="h-2 rounded-full bg-slate-200 w-4/5" />
                    <div className="h-2 rounded-full bg-slate-200 w-3/5" />
                  </div>
                  <div className="text-[10px] mt-4 mb-1 font-semibold text-slate-700">Experience</div>
                  <div className="space-y-1.5">
                    <div className="h-2 rounded-full bg-blue-100 w-full" />
                    <div className="h-2 rounded-full bg-slate-200 w-11/12" />
                    <div className="h-2 rounded-full bg-slate-200 w-4/5" />
                    <div className="h-2 rounded-full bg-blue-100 w-3/4" />
                  </div>
                  <div className="text-[10px] mt-4 mb-1 font-semibold text-slate-700">Skills</div>
                  <div className="flex gap-1 flex-wrap">
                    {['Go', 'Kubernetes', 'gRPC', 'PostgreSQL', 'AWS'].map((s) => (
                      <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Logos */}
        <div className="mt-16 text-center">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] mb-6" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Trusted by engineers hired at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {logos.map((l) => (
              <span key={l} className="font-display text-lg font-medium opacity-40" style={{ color: 'rgb(var(--eleva-fg))' }}>{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="max-w-2xl mb-16">
          <div className="eleva-pill mb-4">
            <Zap className="w-3 h-3" />
            <span>Career OS</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tighter" style={{ color: 'rgb(var(--eleva-fg))' }}>
            One workspace.<br />Every part of your job search.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Stop stitching together three resume builders, a spreadsheet, and ChatGPT. Eleva is a single AI-native workspace.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="eleva-card p-8 relative overflow-hidden group"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-6"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(37,99,235,.12), rgba(124,58,237,.12))',
                    border: '1px solid rgba(37,99,235,.2)',
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'rgb(var(--eleva-primary))' }} />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2 tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>
                  {f.title}
                </h3>
                <p className="text-[15px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  {f.body}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="eleva-pill mb-4">
              <Wand2 className="w-3 h-3" />
              <span>Workflow</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tighter mb-6" style={{ color: 'rgb(var(--eleva-fg))' }}>
              From JD to interview<br />in one flow.
            </h2>
            <div className="space-y-6 mt-8">
              {[
                { n: '01', t: 'Paste the job description', d: 'Any URL or plain text. Eleva parses it into weighted keywords, responsibilities, and inferred seniority.' },
                { n: '02', t: 'AI tailors your resume', d: 'Bullets get rewritten to match. Skills reorder by relevance. Your master profile stays untouched.' },
                { n: '03', t: 'One-click cover letter', d: 'Personal, specific, and in your voice — never generic AI slop.' },
                { n: '04', t: 'Track every application', d: 'Kanban board, reminders, and interview prep — all tied back to the resume version you sent.' },
              ].map((s) => (
                <div key={s.n} className="flex gap-4">
                  <div className="font-mono text-sm shrink-0 pt-1" style={{ color: 'rgb(var(--eleva-primary))' }}>{s.n}</div>
                  <div>
                    <div className="font-display text-lg font-medium mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>{s.t}</div>
                    <div className="text-[14px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="eleva-card p-8 relative overflow-hidden">
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Before / After · ATS Score</div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Before', score: 61, ring: 'rgb(var(--eleva-danger))' },
                { label: 'After', score: 96, ring: 'rgb(var(--eleva-success))' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-6 relative overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
                  <div className="relative w-28 h-28 mx-auto">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="44" stroke="rgb(var(--eleva-border))" strokeWidth="8" fill="none" />
                      <motion.circle
                        cx="50" cy="50" r="44" stroke={s.ring} strokeWidth="8" fill="none" strokeLinecap="round"
                        strokeDasharray="276.5"
                        initial={{ strokeDashoffset: 276.5 }}
                        whileInView={{ strokeDashoffset: 276.5 - (s.score / 100) * 276.5 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.4, ease: 'easeOut' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-display text-3xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{s.score}</div>
                  </div>
                  <div className="text-center mt-3 text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,.08), rgba(124,58,237,.08))', border: '1px solid rgba(37,99,235,.15)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} />
                <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-primary))' }}>Delta +35</span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgb(var(--eleva-fg))' }}>
                Eleva added <strong>4 missing keywords</strong>, rewrote <strong>7 bullets</strong> with stronger impact verbs, and reordered your Skills section.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="max-w-2xl mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tighter" style={{ color: 'rgb(var(--eleva-fg))' }}>
            Loved by people who<br />ship for a living.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <div key={t.name} className="eleva-card p-8">
              <div className="text-[15px] leading-relaxed mb-6" style={{ color: 'rgb(var(--eleva-fg))' }}>
                &ldquo;{t.quote}&rdquo;
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold" style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}>
                  {t.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{t.name}</div>
                  <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="eleva-pill mb-4 inline-flex mx-auto">
            <FileText className="w-3 h-3" />
            <span>Pricing</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tighter" style={{ color: 'rgb(var(--eleva-fg))' }}>
            Simple. Honest. Career-changing.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {[
            { name: 'Free', price: '$0', desc: 'Try the workspace.', features: ['1 resume', '2 tailored versions', 'ATS score', 'Basic templates'], cta: 'Start free', highlight: false },
            { name: 'Pro', price: '$16', desc: 'Everything you need to land the role.', features: ['Unlimited resumes', 'Unlimited tailoring', 'AI cover letters', 'Application tracker', 'All templates', 'Priority AI'], cta: 'Start 14-day trial', highlight: true },
            { name: 'Teams', price: '$29', desc: 'For bootcamps & career coaches.', features: ['Everything in Pro', 'Shared workspace', 'Analytics for cohorts', 'White-label PDFs'], cta: 'Contact sales', highlight: false },
          ].map((p) => (
            <div
              key={p.name}
              className="eleva-card p-8 relative overflow-hidden"
              style={p.highlight ? {
                border: '1px solid rgba(37,99,235,.4)',
                background: 'linear-gradient(135deg, rgba(37,99,235,.06), rgba(124,58,237,.06))',
              } : undefined}
            >
              {p.highlight && (
                <div className="absolute top-6 right-6 eleva-pill" style={{ background: 'rgb(var(--eleva-primary))', color: '#fff', border: 'none' }}>
                  Most popular
                </div>
              )}
              <div className="text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{p.name}</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-display text-5xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{p.price}</span>
                <span className="text-sm" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>/month</span>
              </div>
              <p className="text-[13px] mb-6" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{p.desc}</p>
              <button
                className={p.highlight ? 'eleva-btn-primary w-full mb-6' : 'eleva-btn-ghost w-full mb-6'}
                data-testid={`pricing-${p.name.toLowerCase()}`}
              >
                {p.cta}
              </button>
              <ul className="space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
                    <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'rgb(var(--eleva-primary))' }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div
          className="rounded-3xl p-12 md:p-20 relative overflow-hidden text-center"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--eleva-primary)) 0%, rgb(var(--eleva-secondary)) 100%)',
          }}
        >
          <div className="eleva-grain" />
          <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tighter text-white max-w-2xl mx-auto">
            Your next role is one command away.
          </h2>
          <p className="mt-4 text-white/80 text-lg max-w-xl mx-auto">
            Join 42,000+ professionals using Eleva to elevate their careers.
          </p>
          <Link
            href="/eleva/dashboard"
            className="mt-8 inline-flex items-center gap-2 h-12 px-6 rounded-xl font-medium bg-white text-slate-900 hover:scale-[1.02] transition-transform"
            data-testid="cta-final"
          >
            Enter your workspace
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-12 border-t" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ElevaLogo />
          <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            © 2026 Eleva Labs · Elevate Every Opportunity
          </div>
        </div>
      </footer>
    </div>
  );
}
