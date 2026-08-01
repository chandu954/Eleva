'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { ElevaLogo } from '../eleva-logo';

const links = [
  { label: 'Product', href: '#hero' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Features', href: '#features' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <a href="#main-content" className="eleva-skip-link">
        Skip to content
      </a>
      <header
        className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(248,250,252,0.82)' : 'transparent',
          backdropFilter: scrolled ? 'blur(14px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(148,163,184,0.12)' : '1px solid transparent',
          WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
        }}
      >
        <nav className="max-w-7xl mx-auto px-6 lg:px-10 h-[68px] flex items-center" aria-label="Main">
          <Link href="/eleva" aria-label="Eleva home">
            <ElevaLogo size={24} asLink={false} />
          </Link>
          <div className="hidden md:flex items-center gap-9 ml-14">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="eleva-nav-link text-sm font-medium relative py-1"
                style={{ color: 'rgb(var(--eleva-muted-fg))' }}
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/eleva/auth/login"
              className="eleva-nav-link hidden md:inline-flex text-sm font-medium"
              style={{ color: 'rgb(var(--eleva-fg))' }}
            >
              Sign in
            </Link>
            <Link
              href="/eleva/auth/signup"
              className="eleva-btn-nav text-[13px] h-10 inline-flex items-center px-4"
            >
              Get started
            </Link>
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg"
              style={{ color: 'rgb(var(--eleva-fg))' }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
        {mobileOpen && (
          <div
            className="md:hidden border-t px-6 py-4 space-y-3"
            style={{
              background: 'rgb(var(--eleva-card))',
              borderColor: 'rgb(var(--eleva-border))',
            }}
          >
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="eleva-nav-link block text-[15px] font-medium py-2"
                style={{ color: 'rgb(var(--eleva-fg))' }}
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/eleva/auth/login"
              className="eleva-nav-link block text-[15px] font-medium py-2"
              style={{ color: 'rgb(var(--eleva-muted-fg))' }}
              onClick={() => setMobileOpen(false)}
            >
              Sign in
            </Link>
          </div>
        )}
      </header>
    </>
  );
}
