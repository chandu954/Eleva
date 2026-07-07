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
} from 'lucide-react';
import { ElevaLogo } from './eleva-logo';
import { useRealtimeApplicationCount } from '../_lib/use-realtime';

const nav = [
  { href: '/eleva/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { href: '/eleva/studio', label: 'Studio', icon: Sparkles, badge: 'AI' },
  { href: '/eleva/resumes', label: 'Resumes', icon: FileText, badge: null },
  { href: '/eleva/cover-letters', label: 'Cover Letters', icon: Mail, badge: null },
  { href: '/eleva/ats', label: 'ATS Match', icon: Target, badge: null },
  { href: '/eleva/applications', label: 'Applications', icon: BriefcaseBusiness, badge: null },
  { href: '/eleva/analytics', label: 'Analytics', icon: BarChart3, badge: null },
  { href: '/eleva/templates', label: 'Templates', icon: LayoutTemplate, badge: null },
  { href: '/eleva/prompt-studio', label: 'Prompt Studio', icon: Sparkles, badge: null },
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
          <ElevaLogo showWordmark={!collapsed} size={30} />
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

      <div className="mt-auto p-3 border-t" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
        {!collapsed && (
          <div
            className="rounded-xl p-3 mb-3 relative overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, rgba(37,99,235,.14), rgba(124,58,237,.14))',
              border: '1px solid rgba(37,99,235,.2)',
            }}
          >
            <div className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: 'rgb(var(--eleva-primary))' }}>
              Eleva Pro
            </div>
            <p className="text-[13px] font-medium mb-2" style={{ color: 'rgb(var(--eleva-fg))' }}>
              Unlock unlimited AI credits
            </p>
            <button className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'rgb(var(--eleva-primary))' }}>
              Upgrade →
            </button>
          </div>
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
