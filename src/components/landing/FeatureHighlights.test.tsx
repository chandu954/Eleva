// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authDialogMock = vi.hoisted(() => ({ open: vi.fn() }));

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy({}, {
    get: (_target, tag: string) => {
      if (!cache.has(tag)) {
        cache.set(tag, (props: Record<string, unknown>) => {
          const { initial, animate, exit, transition, whileHover, whileTap, whileInView, viewport, variants, layout, layoutId, ...rest } = props;
          void initial; void animate; void exit; void transition; void whileHover; void whileTap;
          void whileInView; void viewport; void variants; void layout; void layoutId;
          return React.createElement(tag, rest);
        });
      }
      return cache.get(tag);
    },
  });
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
});

vi.mock('next/image', async () => {
  const React = await import('react');
  return {
    default: ({ src, alt, fill, sizes, quality, priority, loading, ...rest }: {
      src: string;
      alt: string;
      fill?: boolean;
      sizes?: string;
      quality?: number;
      priority?: boolean;
      loading?: string;
    } & Record<string, unknown>) => {
      void fill; void sizes; void quality; void priority; void loading;
      return React.createElement('img', { src, alt, ...rest });
    },
  };
});

vi.mock('next/link', async () => {
  const React = await import('react');
  return {
    default: ({ href, children, ...rest }: { href?: string; children?: import('react').ReactNode } & Record<string, unknown>) =>
      React.createElement('a', { href, ...rest }, children),
  };
});

vi.mock('@/components/auth/auth-dialog', async () => {
  const React = await import('react');
  return {
    AuthDialog: ({ children, defaultTab = 'signup' }: { children?: import('react').ReactNode; defaultTab?: string }) =>
      React.createElement(
        'div',
        { 'data-testid': 'auth-dialog', 'data-tab': defaultTab, onClick: () => authDialogMock.open(defaultTab) },
        children,
      ),
  };
});

import FeatureHighlights from './FeatureHighlights';

describe('FeatureHighlights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the headline, badges, stats and separators', () => {
    render(<FeatureHighlights />);

    expect(screen.getByText('The Resume Builder')).toBeInTheDocument();
    expect(screen.getByText('That Gets You Hired')).toBeInTheDocument();
    expect(screen.getByText('AI-Powered')).toBeInTheDocument();
    expect(screen.getByText('ATS-Optimized')).toBeInTheDocument();
    expect(screen.getByText('100% Free')).toBeInTheDocument();

    expect(screen.getByText('500+')).toBeInTheDocument();
    expect(screen.getByText('Resumes Created')).toBeInTheDocument();
    expect(screen.getByText('89%')).toBeInTheDocument();
    expect(screen.getByText('Interview Rate')).toBeInTheDocument();
    expect(screen.getByText('4.9/5')).toBeInTheDocument();
    expect(screen.getByText('15 min')).toBeInTheDocument();
    expect(screen.getByText('Average Setup Time')).toBeInTheDocument();
  });

  it('renders every feature block, company logo and the GitHub link', () => {
    render(<FeatureHighlights />);

    for (const heading of [
      'AI-Powered Resume Assistant',
      'Beautiful Resume Dashboard',
      'Resume Performance Scoring',
      'AI Cover Letter Generator',
    ]) {
      expect(screen.getByText(heading)).toBeInTheDocument();
    }

    expect(screen.getByText('Smart content suggestions based on your experience')).toBeInTheDocument();
    expect(screen.getByText('Centralized resume management')).toBeInTheDocument();
    expect(screen.getByText('ATS compatibility scoring')).toBeInTheDocument();
    expect(screen.getByText('Tailored to match job requirements')).toBeInTheDocument();

    expect(screen.getByText('Trusted by professionals from companies like')).toBeInTheDocument();
    for (const company of ['Google', 'Microsoft', 'Amazon', 'Meta', 'Netflix']) {
      expect(screen.getByAltText(company)).toBeInTheDocument();
    }

    const github = screen.getByRole('link', { name: /Open Source on Github/ });
    expect(github).toHaveAttribute('href', 'https://github.com/chandu954/app');
    expect(github).toHaveAttribute('target', '_blank');
    expect(screen.getByText('No credit card required • 100% free')).toBeInTheDocument();
  });

  it('opens the auth dialog from both calls to action', () => {
    render(<FeatureHighlights />);

    fireEvent.click(screen.getByRole('button', { name: 'Create Your Free Resume' }));
    expect(authDialogMock.open).toHaveBeenCalledWith('signup');

    fireEvent.click(screen.getByRole('button', { name: 'Get Started Now' }));
    expect(authDialogMock.open).toHaveBeenCalledTimes(2);
    expect(authDialogMock.open).toHaveBeenLastCalledWith('signup');
    expect(screen.getAllByTestId('auth-dialog')).toHaveLength(2);
  });
});
