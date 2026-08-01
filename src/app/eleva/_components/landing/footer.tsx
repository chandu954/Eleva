import Link from 'next/link';
import { ElevaLogo } from '../eleva-logo';

const footerLinks = [
  {
    label: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Workflow', href: '#workflow' },
      { label: 'Command palette', href: '#command' },
    ],
  },
  {
    label: 'Company',
    links: [
      { label: 'Privacy', href: '/eleva/privacy' },
      { label: 'Terms', href: '/eleva/terms' },
    ],
  },
  {
    label: 'Support',
    links: [
      { label: 'Contact', href: 'mailto:hello@eleva.app' },
    ],
  },
];

export function Footer() {
  return (
    <footer
      className="relative z-10 border-t"
      style={{ borderColor: 'rgba(148,163,184,0.25)', background: '#F4F7FB' }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-12 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/eleva" aria-label="Eleva home">
              <ElevaLogo size={22} asLink={false} />
            </Link>
            <p className="mt-3 text-[12px] leading-relaxed max-w-[200px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              AI Career Operating System.
            </p>
          </div>
          {footerLinks.map((group) => (
            <div key={group.label}>
              <div className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                {group.label}
              </div>
              <div className="space-y-2">
                {group.links.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="eleva-footer-link block text-[13px] transition-colors"
                    style={{ color: 'rgb(var(--eleva-muted-fg))' }}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t flex flex-wrap items-center justify-between gap-4" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
          <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            © {new Date().getFullYear()} Eleva Labs
          </div>
        </div>
      </div>
    </footer>
  );
}
