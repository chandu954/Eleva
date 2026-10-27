// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ResumeData } from '../_lib/use-resume-editor';

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

import { KeywordHeatmap } from './keyword-heatmap';

function resume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    name: 'Ada Lovelace',
    role: 'engineer',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    website: '',
    summary: '',
    experience: [],
    projects: [],
    skills: [],
    education: [],
    certificates: [],
    ...overrides,
  };
}

const partial = resume({
  summary: 'React and TypeScript engineer who owns API design.',
  experience: [
    {
      id: 'e1',
      company: 'Acme',
      role: 'Engineer',
      location: '',
      startDate: '',
      endDate: '',
      bullets: [
        { id: 'b1', text: 'Owned System Design for the platform', original: 'Owned System Design for the platform' },
        { id: 'b2', text: 'Mentored engineers', original: 'Mentored engineers' },
      ],
    },
  ],
  skills: [{ id: 's1', category: 'Tools', items: ['React', 'AWS'] }],
});

const allEngineerKeywords = [
  'React', 'TypeScript', 'Node.js', 'API', 'System Design', 'Microservices', 'AWS', 'Docker',
  'CI/CD', 'Testing', 'Performance', 'Scalability', 'REST', 'GraphQL', 'PostgreSQL', 'MongoDB',
  'Agile', 'Git', 'TDD', 'Kubernetes', 'Redis', 'Event-Driven', 'Observability', 'Monitoring',
];

describe('KeywordHeatmap', () => {
  it('shows matched and missing keywords with coverage and duplicate counts', () => {
    render(<KeywordHeatmap data={partial} />);

    expect(screen.getByText('21%')).toBeInTheDocument();
    expect(screen.getByText('Matched (5)')).toBeInTheDocument();
    expect(screen.getByText('Missing (19)')).toBeInTheDocument();
    expect(
      screen.getByText('19 keywords missing. Add relevant terms to improve ATS matching.'),
    ).toBeInTheDocument();
    expect(screen.getByTitle('2 occurrences')).toHaveTextContent('React');
    expect(screen.getByTitle('2 occurrences')).toHaveTextContent('x2');
    expect(screen.getAllByTitle('Not found')).toHaveLength(8);
  });

  it('expands and collapses the keyword list with hover styling', async () => {
    const user = userEvent.setup();
    render(<KeywordHeatmap data={partial} />);

    const toggle = screen.getByRole('button', { name: 'Show all 24 keywords' });
    fireEvent.mouseEnter(toggle);
    expect(toggle.style.opacity).toBe('0.8');
    fireEvent.mouseLeave(toggle);
    expect(toggle.style.opacity).toBe('1');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Show fewer' })).toBeInTheDocument();
    expect(screen.getAllByTitle(/occurrence|Not found/)).toHaveLength(24);

    await user.click(screen.getByRole('button', { name: 'Show fewer' }));
    expect(screen.getByRole('button', { name: 'Show all 24 keywords' })).toBeInTheDocument();
  });

  it('uses an explicit role override over the resume role', () => {
    render(<KeywordHeatmap data={partial} role="product manager" />);

    expect(screen.getByText('Roadmap')).toBeInTheDocument();
    expect(screen.getByText('Stakeholder')).toBeInTheDocument();
    expect(screen.queryByText('Microservices')).not.toBeInTheDocument();
  });

  it('falls back to the resume role and then to engineer', () => {
    const { rerender } = render(
      <KeywordHeatmap data={resume({ ...partial, role: 'designer' })} />,
    );
    expect(screen.getByText('Figma')).toBeInTheDocument();

    rerender(<KeywordHeatmap data={resume({ ...partial, role: 'astronaut' })} />);
    expect(screen.getByText('Microservices')).toBeInTheDocument();
  });

  it.each([
    ['engineer', 'React'],
    ['product manager', 'Roadmap'],
    ['designer', 'Figma'],
    ['developer', 'JavaScript'],
    ['data', 'Python'],
    ['machine learning', 'PyTorch'],
    ['astronaut', 'React'],
  ])('infers keywords for the %s role', (role, keyword) => {
    render(<KeywordHeatmap data={resume({ role })} />);

    expect(screen.getByText(keyword)).toBeInTheDocument();
  });

  it('reports full coverage and hides the missing hint when every keyword matches', () => {
    const fullText = allEngineerKeywords.join(' ');
    render(<KeywordHeatmap data={resume({ summary: fullText })} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Matched (24)')).toBeInTheDocument();
    expect(screen.getByText('Missing (0)')).toBeInTheDocument();
    expect(screen.queryByText(/keyword.*missing/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show all 24 keywords' })).toBeInTheDocument();
  });

  it('uses the singular missing-keyword message', () => {
    const almostAll = allEngineerKeywords.filter((word) => word !== 'Monitoring').join(' ');
    render(<KeywordHeatmap data={resume({ summary: almostAll })} />);

    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByText('Missing (1)')).toBeInTheDocument();
    expect(
      screen.getByText('1 keyword missing. Add relevant terms to improve ATS matching.'),
    ).toBeInTheDocument();
  });

  it('renders a warning-tier coverage bar around 50 percent', () => {
    const half = allEngineerKeywords.slice(0, 12).join(' ');
    const { container } = render(<KeywordHeatmap data={resume({ summary: half })} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
    const bar = container.querySelectorAll('div.h-2.rounded-full > div')[0] as HTMLElement;
    expect(bar).toBeDefined();
    expect(bar.className).toContain('h-full');
  });
});
