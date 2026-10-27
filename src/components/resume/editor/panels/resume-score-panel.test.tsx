import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy({}, {
    get: (_target, tag: string) => {
      if (!cache.has(tag)) {
        cache.set(tag, (props: Record<string, unknown>) => {
          const { initial, animate, exit, transition, whileHover, variants, ...rest } = props;
          void initial; void animate; void exit; void transition; void whileHover; void variants;
          return React.createElement(tag, rest);
        });
      }
      return cache.get(tag);
    },
  });
  return { motion };
});

vi.mock('react-circular-progressbar', () => ({
  CircularProgressbar: ({ text }: { text: string }) => <div>{text}</div>,
  buildStyles: () => ({}),
}));

const modelState = vi.hoisted(() => ({ model: 'openai/gpt-4.1-mini' }));

vi.mock('@/hooks/use-api-keys', () => ({
  useApiKeys: () => ({ apiKeys: [] }),
  useDefaultModel: () => ({ defaultModel: modelState.model }),
}));

vi.mock('@/utils/actions/resumes/actions', () => ({
  generateResumeScore: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

import { generateResumeScore } from '@/utils/actions/resumes/actions';
import { toast } from '@/hooks/use-toast';
import type { Resume } from '@/lib/types';
import ResumeScorePanel from './resume-score-panel';

const resume = {
  id: 'resume-1',
  title: 'Engineer',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '123',
  location: 'London',
  work_experience: [],
  education: [],
  skills: [],
} as unknown as Resume;

const score = {
  overallScore: { score: 82, reason: 'Strong resume' },
  completeness: {
    contactInformation: { score: 90, reason: 'Complete contact details' },
    detailLevel: { score: 75, reason: 'Good detail' },
  },
  impactScore: {
    activeVoiceUsage: { score: 68, reason: 'Mostly active voice' },
    quantifiedAchievements: { score: 55, reason: 'Add more numbers' },
  },
  roleMatch: {
    skillsRelevance: { score: 85, reason: 'Relevant skills' },
    experienceAlignment: { score: 79, reason: 'Aligned experience' },
    educationFit: { score: 65, reason: 'Relevant education' },
  },
  jobAlignment: {
    keywordMatch: {
      score: 88,
      reason: 'Strong keyword coverage',
      matchedKeywords: ['React', 'TypeScript'],
      missingKeywords: ['GraphQL'],
    },
    requirementsMatch: {
      score: 62,
      reason: 'Most requirements met',
      matchedRequirements: ['Testing'],
      gapAnalysis: ['Add leadership examples'],
    },
    companyFit: {
      score: 71,
      reason: 'Good culture fit',
      suggestions: ['Mention open source'],
    },
  },
  miscellaneous: {},
  overallImprovements: ['Quantify achievements', 'Add certifications'],
  jobSpecificImprovements: ['Mention Kubernetes'],
  isTailoredResume: true,
};

describe('ResumeScorePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    modelState.model = 'openai/gpt-4.1-mini';
  });

  it('shows the empty state and requires a model', () => {
    modelState.model = '';
    render(<ResumeScorePanel resume={resume} />);

    expect(screen.getByText('Resume Score Analysis')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Generate Score/ }));

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Model required' }));
  });

  it('generates and persists a full tailored score', async () => {
    vi.mocked(generateResumeScore).mockResolvedValue(score as never);
    const { unmount } = render(<ResumeScorePanel resume={resume} job={{ id: 'job-1', title: 'Engineer' } as never} />);

    fireEvent.click(screen.getByRole('button', { name: /Generate Score/ }));

    await waitFor(() => expect(screen.getByText('82%')).toBeInTheDocument());
    expect(screen.getByText('Strong resume')).toBeInTheDocument();
    expect(screen.getByText('Key Improvements')).toBeInTheDocument();
    expect(screen.getByText('Job-Specific Improvements')).toBeInTheDocument();
    expect(screen.getByText('Job Alignment Analysis')).toBeInTheDocument();
    expect(screen.getByText('Matched Keywords:')).toBeInTheDocument();
    expect(screen.getByText('Missing Keywords:')).toBeInTheDocument();
    expect(screen.getByText('Areas to Address:')).toBeInTheDocument();
    expect(screen.getAllByText('Completeness').length).toBeGreaterThan(0);
    expect(localStorage.getItem('eleva-resume-scores')).toContain('resume-1');

    unmount();
    render(<ResumeScorePanel resume={resume} job={{ id: 'job-1', title: 'Engineer' } as never} />);
    expect(screen.getByText('Strong resume')).toBeInTheDocument();
  });

  it('renders a non-tailored score without job sections', async () => {
    vi.mocked(generateResumeScore).mockResolvedValue({ ...score, jobAlignment: undefined, isTailoredResume: false } as never);
    render(<ResumeScorePanel resume={resume} />);

    fireEvent.click(screen.getByRole('button', { name: /Generate Score/ }));
    await waitFor(() => expect(screen.getByText('82%')).toBeInTheDocument());
    expect(screen.queryByText('Job Alignment Analysis')).not.toBeInTheDocument();
  });

  it('reports generation failures', async () => {
    vi.mocked(generateResumeScore).mockRejectedValue(new Error('Provider unavailable'));
    render(<ResumeScorePanel resume={resume} />);

    fireEvent.click(screen.getByRole('button', { name: /Generate Score/ }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Resume score failed',
      description: expect.stringContaining('Provider unavailable'),
    })));
  });

  it('recovers from malformed stored scores', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('eleva-resume-scores', '{bad json');
    render(<ResumeScorePanel resume={resume} />);

    expect(screen.getByRole('button', { name: /Generate Score/ })).toBeInTheDocument();
    error.mockRestore();
    cleanup();
  });
});
