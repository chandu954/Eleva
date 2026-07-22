'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  Mail,
  Target,
  BarChart3,
  LayoutTemplate,
  Settings,
  ChevronLeft,
  ChevronRight,
  BriefcaseBusiness,
  Plus,
  UserCircle,
} from 'lucide-react';
import { ElevaLogo } from './eleva-logo';
import { useRealtimeApplicationCount } from '../_lib/use-realtime';

const nav = [
  { href: '/eleva/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { href: '/eleva/studio', label: 'Studio', icon: Sparkles, badge: 'AI' },
  { href: '/eleva/career', label: 'Career Profile', icon: UserCircle, badge: null },
  { href: '/eleva/resumes', label: 'Tailored Resumes', icon: FileText, badge: null },
  { href: '/eleva/cover-letters', label: 'Cover Letters', icon: Mail, badge: null },
  { href: '/eleva/ats', label: 'ATS Match', icon: Target, badge: null },
  { href: '/eleva/applications', label: 'Applications', icon: BriefcaseBusiness, badge: null },
  { href: '/eleva/analytics', label: 'Analytics', icon: BarChart3, badge: null },
  { href: '/eleva/templates', label: 'Templates', icon: LayoutTemplate, badge: null },
  { href: '/eleva/prompt-studio', label: 'AI Presets', icon: Sparkles, badge: null },
];

export function ElevaSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { count } = useRealtimeApplicationCount();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 248 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="hidden lg:flex flex-col shrink-0 border-r h-screen sticky top-0"
      style={{ borderColor: 'rgb(var(--eleva-border))', background: 'rgb(var(--eleva-card))' }}
      data-testid="eleva-sidebar"
    >
      <div className="h-16 flex items-center px-4 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
        <Link href="/eleva/dashboard" data-testid="sidebar-logo">
          <ElevaLogo showWordmark={!collapsed} size={30} asLink={false} />
        </Link>
      </div>

      <div className="px-3 py-2">
        <p
          className="px-2 text-[10px] uppercase tracking-[0.18em] font-mono mb-2"
          style={{ color: 'rgb(var(--eleva-muted-fg))' }}
        >
          {!collapsed && 'Workspace'}
        </p>
        <nav className="flex flex-col gap-0.5">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== '/eleva/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                className="group relative flex items-center gap-3 px-3 h-9 rounded-lg text-sm transition-colors"
                style={{
                  color: active ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))',
                  background: active ? 'rgb(var(--eleva-muted))' : 'transparent',
                }}
              >
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
                    style={{ background: 'rgb(var(--eleva-primary))' }}
                  />
                )}
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
                {!collapsed && <span className="flex-1 font-medium">{item.label}</span>}
                {!collapsed && (
                  item.label === 'Applications' && count !== null && count > 0 ? (
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded-md"
                      style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}
                    >
                      {count}
                    </span>
                  ) : item.badge ? (
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded-md"
                      style={{
                        background:
                          item.badge === 'AI'
                            ? 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))'
                            : 'rgb(var(--eleva-muted))',
                        color: item.badge === 'AI' ? '#fff' : 'rgb(var(--eleva-muted-fg))',
                      }}
                    >
                      {item.badge}
                    </span>
                  ) : null
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-3 border-t space-y-2" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
        {!collapsed && (
          <>
            <div
              className="rounded-xl p-4 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(37,99,235,.08), rgba(124,58,237,.08))',
                border: '1px solid rgba(37,99,235,.15)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  Resume Health
                </div>
                <div className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--eleva-primary))' }}>
                  83
                </div>
              </div>
              <div className="h-1 rounded-full overflow-hidden mb-3" style={{ background: 'rgb(var(--eleva-bg))' }}>
                <div className="h-full rounded-full w-[83%]" style={{ background: 'linear-gradient(90deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }} />
              </div>
              <Link
                href="/eleva/ats"
                className="flex items-center justify-between text-[11px] font-medium px-2.5 py-1.5 rounded-lg hover:bg-[rgb(var(--eleva-bg))] transition-colors"
                style={{ color: 'rgb(var(--eleva-primary))' }}
              >
                Improve ATS
                <Target className="w-3 h-3" />
              </Link>
            </div>

            <div className="rounded-xl p-3" style={{ background: 'rgb(var(--eleva-muted))' }}>
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] mb-1.5 px-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                Quick Actions
              </p>
              <div className="space-y-0.5">
                <Link href="/eleva/studio" className="flex items-center gap-2 px-2.5 h-8 rounded-md text-[12px] font-medium hover:bg-[rgb(var(--eleva-card))] transition-colors" style={{ color: 'rgb(var(--eleva-fg))' }}>
                  <Plus className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} />
                  New Resume
                </Link>
                <Link href="/eleva/ats" className="flex items-center gap-2 px-2.5 h-8 rounded-md text-[12px] font-medium hover:bg-[rgb(var(--eleva-card))] transition-colors" style={{ color: 'rgb(var(--eleva-fg))' }}>
                  <Target className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} />
                  Run ATS
                </Link>
                <Link href="/eleva/cover-letters" className="flex items-center gap-2 px-2.5 h-8 rounded-md text-[12px] font-medium hover:bg-[rgb(var(--eleva-card))] transition-colors" style={{ color: 'rgb(var(--eleva-fg))' }}>
                  <Mail className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} />
                  Generate Cover Letter
                </Link>
              </div>
            </div>
          </>
        )}
        <Link
          href="/eleva/settings"
          data-testid="nav-settings"
          className="flex items-center gap-3 px-3 h-9 rounded-lg text-sm hover:bg-[rgb(var(--eleva-muted))]"
          style={{ color: 'rgb(var(--eleva-muted-fg))' }}
        >
          <Settings className="w-[18px] h-[18px]" strokeWidth={1.75} />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          onClick={() => setCollapsed((c) => !c)}
          data-testid="sidebar-collapse"
          className="mt-1 flex items-center gap-3 px-3 h-9 w-full rounded-lg text-sm hover:bg-[rgb(var(--eleva-muted))]"
          style={{ color: 'rgb(var(--eleva-muted-fg))' }}
        >
          {collapsed ? <ChevronRight className="w-[18px] h-[18px]" /> : <ChevronLeft className="w-[18px] h-[18px]" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
