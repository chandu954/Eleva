// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy({}, {
    get: (_target, tag: string) => {
      if (!cache.has(tag)) {
        cache.set(tag, (props: Record<string, unknown>) => {
          const { initial, animate, exit, transition, whileInView, viewport, whileHover, whileTap, variants, layout, layoutId, ...rest } = props;
          void initial; void animate; void exit; void transition; void whileInView; void viewport;
          void whileHover; void whileTap; void variants; void layout; void layoutId;
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

vi.mock('./ambient', () => ({
  AmbientGlow: ({ className, size }: { className?: string; size?: number }) => (
    <div data-testid="ambient-glow" data-size={size} className={className} />
  ),
}));

import { ProductDemo } from './product-demo';

describe('ProductDemo', () => {
  it('renders the pre-optimization score, gaps and keywords', () => {
    render(<ProductDemo />);

    expect(screen.getByText('eleva.app/workspace')).toBeInTheDocument();
    expect(screen.getByText('61')).toBeInTheDocument();
    expect(screen.getByText('Needs work')).toBeInTheDocument();
    expect(screen.getByText('Missing skills')).toBeInTheDocument();
    ['Distributed Systems', 'Kubernetes', 'System Design'].forEach((skill) =>
      expect(screen.getAllByText(skill).length).toBeGreaterThan(0),
    );
    expect(screen.getByText('54%')).toBeInTheDocument();
    expect(screen.getByText('Resume Preview')).toBeInTheDocument();
    expect(screen.queryByText('7 bullets improved')).not.toBeInTheDocument();
    expect(screen.getByTestId('ambient-glow')).toHaveAttribute('data-size', '720');
  });

  it('highlights the active sidebar destination', () => {
    render(<ProductDemo />);

    const navigate = screen.getByText('Navigate');
    expect(navigate).toBeInTheDocument();
    ['Dashboard', 'Studio', 'Resumes', 'ATS Match', 'Cover Letters', 'Analytics'].forEach(
      (item) => expect(screen.getByText(item)).toBeInTheDocument(),
    );
  });

  it('optimizes the demo and shows the improved score and skills', async () => {
    const user = userEvent.setup();
    render(<ProductDemo />);

    const button = screen.getByRole('button', { name: /Optimize for this job/i });
    fireEvent.mouseEnter(button);
    fireEvent.mouseLeave(button);
    await user.click(button);

    expect(screen.getByText('91')).toBeInTheDocument();
    expect(screen.getByText('Strong match')).toBeInTheDocument();
    expect(screen.getByText('Keyword alignment')).toBeInTheDocument();
    expect(screen.getByText('94%')).toBeInTheDocument();
    expect(screen.getByText('Experience relevance')).toBeInTheDocument();
    expect(screen.getByText('Optimized Preview')).toBeInTheDocument();
    expect(screen.getByText('+20 point gain')).toBeInTheDocument();
    expect(screen.getByText('7 bullets improved')).toBeInTheDocument();
    expect(screen.getByText('12 keywords aligned')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Optimize for this job/i })).not.toBeInTheDocument();
    expect(screen.getByText('Optimized Skills')).toBeInTheDocument();
  });
});
