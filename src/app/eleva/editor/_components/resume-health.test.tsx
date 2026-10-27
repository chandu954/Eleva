// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
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

import { ResumeHealth } from './resume-health';

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

const bullet = (id: string, text: string) => ({ id, text, original: text });

const moderate = resume({
  summary: 'Engineer focused on reliable backend systems and measurable outcomes for users.',
  experience: [
    {
      id: 'e1',
      company: 'Acme',
      role: 'Engineer',
      location: 'Remote',
      startDate: '2023',
      endDate: 'Present',
      bullets: [bullet('b1', 'Cut p95 latency by 40%'), bullet('b2', 'Migrated 12 services')],
    },
  ],
  skills: [{ id: 's1', category: 'Languages', items: ['Go', 'TypeScript', 'SQL', 'Python'] }],
  education: [
    {
      id: 'ed1',
      school: 'MIT',
      degree: 'BSc',
      field: 'CS',
      gpa: '3.9',
      startDate: '2018',
      endDate: '2022',
    },
  ],
});

const good = resume({
  ...moderate,
  projects: [
    {
      id: 'p1',
      name: 'Eleva',
      description: 'AI resume editor',
      technologies: ['Next.js'],
      url: '',
      bullets: [bullet('pb1', 'Grew usage 3x')],
    },
  ],
  skills: [
    { id: 's1', category: 'Languages', items: ['Go', 'TypeScript', 'SQL', 'Python', 'Rust'] },
    { id: 's2', category: 'Tools', items: ['Docker', 'AWS', 'Redis', 'Kafka', 'Git'] },
  ],
  certificates: [
    {
      id: 'c1',
      name: 'AWS Solutions Architect',
      issuer: 'AWS',
      date: '2024',
      credentialUrl: '',
    },
  ],
});

const excellent = resume({
  ...good,
  experience: [
    ...good.experience,
    {
      id: 'e2',
      company: 'Globex',
      role: 'Senior Engineer',
      location: 'Remote',
      startDate: '2021',
      endDate: '2023',
      bullets: [
        bullet('b3', 'Reduced costs 25%'),
        bullet('b4', 'Scaled to 2M users'),
        bullet('b5', 'Led 8 engineers'),
      ],
    },
  ],
  projects: [
    ...good.projects,
    {
      id: 'p2',
      name: 'Compose',
      description: 'Design system',
      technologies: ['React'],
      url: '',
      bullets: [bullet('pb2', 'Adopted by 6 teams')],
    },
  ],
  skills: [
    { id: 's1', category: 'Languages', items: Array.from({ length: 10 }, (_, i) => `Lang${i}`) },
    { id: 's2', category: 'Tools', items: Array.from({ length: 10 }, (_, i) => `Tool${i}`) },
    { id: 's3', category: 'Cloud', items: Array.from({ length: 10 }, (_, i) => `Cloud${i}`) },
  ],
});

describe('ResumeHealth', () => {
  it('scores an empty resume as critical', () => {
    render(<ResumeHealth data={resume()} />);

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Major improvements recommended.')).toBeInTheDocument();
    expect(screen.getByText('Sections')).toBeInTheDocument();
    expect(screen.getByText('Bullets')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
  });

  it('labels a moderate resume as needing work', () => {
    render(<ResumeHealth data={moderate} />);

    expect(screen.getByText('Needs Work')).toBeInTheDocument();
    expect(screen.getByText('Several areas need attention.')).toBeInTheDocument();
    expect(screen.getByText('ATS Optimization')).toBeInTheDocument();
    expect(screen.getByText('Keywords')).toBeInTheDocument();
    expect(screen.getByText('Readability')).toBeInTheDocument();
    expect(screen.getByText('Formatting')).toBeInTheDocument();
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('Skills Coverage')).toBeInTheDocument();
    expect(screen.getByText('Sections').previousSibling).toHaveTextContent('4');
  });

  it('labels a solid resume as good', () => {
    render(<ResumeHealth data={good} />);

    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('A few improvements can boost your score.')).toBeInTheDocument();
    expect(screen.getByText(/AI predicts/)).toBeInTheDocument();
  });

  it('labels a rich resume as excellent and counts sections, bullets and skills', () => {
    render(<ResumeHealth data={excellent} />);

    expect(screen.getByText('Excellent')).toBeInTheDocument();
    expect(screen.getByText('Your resume is highly optimized.')).toBeInTheDocument();
    expect(screen.getByText('Sections').previousSibling).toHaveTextContent('6');
    expect(screen.getByText('Bullets').previousSibling).toHaveTextContent('5');
    expect(screen.getByText('Skills').previousSibling).toHaveTextContent('30');
    expect(screen.getByText(/with optimization/)).toBeInTheDocument();
  });
});
