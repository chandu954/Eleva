import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/tiptap', () => ({
  default: ({ content }: { content: string }) => <span>{content}</span>,
}));

import { WorkExperience, Project, Skill, Education } from '@/lib/types';
import {
  EducationSuggestion,
  ProjectSuggestion,
  SkillSuggestion,
  SnippetLine,
  WorkExperienceSuggestion,
} from './suggestion-cards';

const work: WorkExperience = {
  position: 'Senior Engineer',
  company: 'Acme',
  date: '2024',
  description: ['Shipped a platform', 'Led a team'],
} as WorkExperience;

const project: Project = {
  name: 'Eleva',
  date: '2025',
  description: ['Built the pipeline'],
  technologies: ['Next.js', 'Supabase'],
} as Project;

const skill: Skill = {
  category: 'Backend',
  items: ['TypeScript', 'Postgres'],
} as Skill;

const education: Education = {
  degree: 'BS',
  field: 'Computer Science',
  school: 'State University',
  date: '2020',
  achievements: ['Dean list'],
} as Education;

describe('SnippetLine', () => {
  it('renders at most three non-empty lines', () => {
    render(<SnippetLine label="Before" lines={['one', '', 'two', 'three', 'four']} variant="before" />);

    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
    expect(screen.getByText('three')).toBeInTheDocument();
    expect(screen.queryByText('four')).not.toBeInTheDocument();
  });
});

describe('suggestion cards', () => {
  it('renders a work-experience diff', () => {
    render(<WorkExperienceSuggestion content={work} currentContent={{ ...work, company: 'Old Co' } as WorkExperience} />);

    expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
  });

  it('renders a new project without a current version', () => {
    render(<ProjectSuggestion content={project} currentContent={null} />);

    expect(screen.getByText('Eleva')).toBeInTheDocument();
    expect(screen.getByText('Built the pipeline')).toBeInTheDocument();
    expect(screen.getByText('Next.js')).toBeInTheDocument();
  });

  it('renders a skill group and its items', () => {
    render(<SkillSuggestion content={skill} currentContent={{ ...skill, items: ['TypeScript'] } as Skill} />);

    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Postgres')).toBeInTheDocument();
  });

  it('renders education details and achievements', () => {
    render(<EducationSuggestion content={education} currentContent={null} />);

    expect(screen.getByText(/BS/)).toBeInTheDocument();
    expect(screen.getByText(/State University/)).toBeInTheDocument();
    expect(screen.getByText('Dean list')).toBeInTheDocument();
  });
});
