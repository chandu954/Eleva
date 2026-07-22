'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Sparkles, FileText, Target, Mail } from 'lucide-react';

const flow: { href: string; label: string; icon: typeof Sparkles }[] = [
  { href: '/eleva/studio', label: 'Studio', icon: Sparkles },
  { href: '/eleva/resumes', label: 'Resumes', icon: FileText },
  { href: '/eleva/ats', label: 'ATS', icon: Target },
  { href: '/eleva/cover-letters', label: 'Cover Letter', icon: Mail },
];

export function ElevaBreadcrumb() {
  const pathname = usePathname();
  const currentIdx = flow.findIndex((f) => pathname.startsWith(f.href));

  if (currentIdx === -1) return null;

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-mono mb-6 overflow-x-auto">
      {flow.map((f, i) => {
        const Icon = f.icon;
        const isActive = i === currentIdx;
        const isPast = i < currentIdx;
        return (
          <div key={f.href} className="flex items-center gap-1.5 shrink-0">
            {i > 0 && <ArrowRight className="w-3 h-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />}
            <Link
              href={f.href}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
              style={{
                background: isActive ? 'linear-gradient(135deg, rgba(var(--eleva-primary-rgb), 0.12), rgba(var(--eleva-secondary-rgb), 0.12))' : 'transparent',
                color: isActive ? 'rgb(var(--eleva-primary))' : isPast ? 'rgb(var(--eleva-muted-fg))' : 'rgb(var(--eleva-muted-fg))',
                opacity: isPast ? 0.6 : 1,
              }}
            >
              <Icon className="w-3 h-3" />
              {f.label}
            </Link>
          </div>
        );
      })}
      {currentIdx >= 0 && (
        <span className="text-[10px] px-1.5 py-0.5 rounded ml-1" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
          Step {currentIdx + 1} of {flow.length}
        </span>
      )}
    </div>
  );
}