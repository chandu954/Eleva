// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy({}, {
    get: (_target, tag: string) => {
      if (!cache.has(tag)) {
        cache.set(tag, (props: Record<string, unknown>) => {
          const { initial, animate, exit, transition, whileHover, whileTap, variants, layout, layoutId, ...rest } = props;
          void initial; void animate; void exit; void transition; void whileHover; void whileTap;
          void variants; void layout; void layoutId;
          return React.createElement(tag, rest);
        });
      }
      return cache.get(tag);
    },
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

vi.mock('next/link', async () => {
  const React = await import('react');
  return {
    default: ({
      href,
      children,
      ...rest
    }: {
      href?: string;
      children?: React.ReactNode;
    } & Record<string, unknown>) => React.createElement('a', { href, ...rest }, children),
  };
});

const navMock = vi.hoisted(() => ({ pathname: '/eleva/dashboard' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navMock.pathname,
}));

vi.mock('./eleva-logo', async () => {
  const React = await import('react');
  return {
    ElevaLogo: ({ showWordmark }: { showWordmark?: boolean }) =>
      React.createElement('span', { 'data-testid': 'logo', 'data-wordmark': String(showWordmark) }),
  };
});

const realtimeMock = vi.hoisted(() => ({ count: null as number | null }));

vi.mock('../_lib/use-realtime', () => ({
  useRealtimeApplicationCount: () => ({ count: realtimeMock.count }),
}));

import { ElevaSidebar } from './sidebar';

describe('ElevaSidebar', () => {
  beforeEach(() => {
    navMock.pathname = '/eleva/dashboard';
    realtimeMock.count = null;
  });

  it('renders every navigation group and link', () => {
    render(<ElevaSidebar />);

    expect(screen.getByTestId('eleva-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-logo')).toHaveAttribute('href', '/eleva/dashboard');
    expect(screen.getByTestId('logo')).toHaveAttribute('data-wordmark', 'true');

    ['Workspace', 'Insights', 'Tools'].forEach((group) =>
      expect(screen.getByText(group)).toBeInTheDocument(),
    );
    [
      ['Dashboard', '/eleva/dashboard'],
      ['Studio', '/eleva/studio'],
      ['Resumes', '/eleva/resumes'],
      ['ATS Match', '/eleva/ats'],
      ['Cover Letters', '/eleva/cover-letters'],
      ['Applications', '/eleva/applications'],
      ['Analytics', '/eleva/analytics'],
      ['Templates', '/eleva/templates'],
      ['AI Presets', '/eleva/prompt-studio'],
    ].forEach(([label, href]) => {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toHaveAttribute('href', href);
    });

    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByTestId('nav-settings')).toHaveAttribute('href', '/eleva/settings');
    expect(screen.getByTestId('sidebar-collapse')).toHaveTextContent('Collapse');
  });

  it('marks the exact dashboard route active but not its children', () => {
    render(<ElevaSidebar />);

    const dashboard = screen.getByTestId('nav-dashboard');
    expect(dashboard.querySelector('span.absolute')).not.toBeNull();

    navMock.pathname = '/eleva/dashboard/archive';
    render(<ElevaSidebar />);

    const dashboards = screen.getAllByTestId('nav-dashboard');
    expect(dashboards[1].querySelector('span.absolute')).toBeNull();
  });

  it('matches nested routes for non-dashboard links', () => {
    navMock.pathname = '/eleva/studio/run/42';
    render(<ElevaSidebar />);

    expect(screen.getByTestId('nav-studio').querySelector('span.absolute')).not.toBeNull();
    expect(screen.getByTestId('nav-resumes').querySelector('span.absolute')).toBeNull();
  });

  it('shows the applications count only when available and positive', () => {
    realtimeMock.count = 7;
    const { rerender } = render(<ElevaSidebar />);

    expect(screen.getByTestId('nav-applications')).toHaveTextContent('7');

    realtimeMock.count = 0;
    rerender(<ElevaSidebar />);
    expect(screen.getByTestId('nav-applications')).not.toHaveTextContent('0');

    realtimeMock.count = 3;
    rerender(<ElevaSidebar />);
    expect(screen.getByTestId('nav-applications')).toHaveTextContent('3');
  });

  it('collapses and expands the sidebar', async () => {
    const user = userEvent.setup();
    render(<ElevaSidebar />);

    await user.click(screen.getByTestId('sidebar-collapse'));

    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('AI')).not.toBeInTheDocument();
    expect(screen.queryByText('Collapse')).not.toBeInTheDocument();
    expect(screen.getByTestId('logo')).toHaveAttribute('data-wordmark', 'false');
    expect(screen.getByTestId('nav-settings')).toBeInTheDocument();

    await user.click(screen.getByTestId('sidebar-collapse'));

    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('logo')).toHaveAttribute('data-wordmark', 'true');
  });
});
