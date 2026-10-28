import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from '@/components/ui/tabs';
import { StudioResults } from './studio-results';
import { CoverLetterTab } from './cover-letter-tab';
import { TailoredResumePreview } from './tailored-resume-preview';
import { StudioChangesTab } from './studio-changes-tab';
import type { StudioPipelineSummary } from '../_lib/use-studio-pipeline';
import type { ExtractedJobData, JobScore, TailoredResume } from '../_lib/studio-types';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const extractData: ExtractedJobData = {
  company: 'Acme',
  role: 'Frontend Engineer',
  required_skills: ['React'],
  nice_to_have: [],
  summary: 'Build UI',
};

const score: JobScore = {
  overall: 60,
  keyword: 60,
  formatting: 70,
  readability: 65,
  impact: 55,
  recruiter: 60,
  matched: ['react'],
  missing: ['graphql'],
  suggestions: [],
  summary: '',
};

const rescore: JobScore = {
  ...score,
  overall: 82,
  keyword: 85,
  matched: ['react', 'graphql'],
  missing: [],
};

const tailoredResume: TailoredResume = {
  professional_summary: 'Engineer focused on accessible interfaces.',
  skills: [{ category: 'Frontend', skills: ['React', 'TypeScript'] }],
  work_experience: [
    { position: 'Engineer', company: 'Acme', responsibilities: ['Shipped a design system'] },
  ],
  projects: [{ name: 'Eleva', description: 'Resume builder' }],
  education: [{ school: 'State University', degree: 'BSc', field: 'CS' }],
};

const summary: StudioPipelineSummary = {
  overall: 82,
  matched: 2,
  missing: 0,
  keywordsAdded: 1,
  bulletsRewritten: 2,
  sectionsModified: 2,
  compatibility: 82,
  isLowCompat: true,
  plan: {
    rewriteSummary: true,
    rewriteExperience: true,
    rewriteSkills: false,
    rewriteProjects: false,
    keywordsToInject: 1,
    hardTruthNote: 'The posting expects backend depth.',
  },
  sectionConfidence: { summary: 90, skills: 80, experience: 70, projects: 60 },
  sectionChanges: { summary: ['Rewrote opening'], skills: [], experience: ['Added metrics'], projects: [] },
  quality: { passed: true, issues: [], score: 95 },
  review: {
    wouldInterview: true,
    score: 88,
    strengths: ['Clear impact'],
    weaknesses: ['Missing graphql'],
    genericAreas: [],
    recommendation: 'Apply after adding one backend project.',
    confidence: 80,
  },
  role: 'Frontend Engineer',
  company: 'Acme',
};

describe('StudioResults', () => {
  it('renders the idle state with no pipeline data', () => {
    render(
      <StudioResults
        running={false}
        steps={[]}
        letter=""
        summary={null}
        elapsed={null}
        resumes={[]}
        stepTimings={{}}
        tailoredResume={null}
        extractData={null}
        scoreData={null}
        rescoreData={null}
        activeTab="resume"
        setActiveTab={vi.fn()}
        creatingApplication={null}
        createApplication={vi.fn()}
        downloadExport={vi.fn()}
        run={vi.fn()}
      />,
    );

    expect(screen.getByText('Your match analysis will appear here')).toBeInTheDocument();
    expect(screen.queryByText('Application Ready')).not.toBeInTheDocument();
  });

  it('renders the application-ready summary and ATS report', () => {
    render(
      <StudioResults
        running={false}
        steps={[{ step: 'extract', label: 'Extract', status: 'done' }]}
        letter="Dear hiring manager,"
        summary={{ ...summary, previousOverall: 60 }}
        elapsed="12"
        resumes={[{ id: 'r1', name: 'My Resume', target_role: null, is_base_resume: true }]}
        resumeId="r1"
        stepTimings={{ extract: 1000, score: 2000 }}
        tailoredResume={tailoredResume}
        extractData={extractData}
        scoreData={score}
        rescoreData={rescore}
        activeTab="ats"
        setActiveTab={vi.fn()}
        creatingApplication={null}
        createApplication={vi.fn()}
        downloadExport={vi.fn()}
        run={vi.fn()}
      />,
    );

    expect(screen.getByText('Application Ready')).toBeInTheDocument();
    expect(screen.getByText('Keywords Added')).toBeInTheDocument();
    expect(screen.getByText('Missing Keywords')).toBeInTheDocument();
  });
});

describe('CoverLetterTab', () => {
  it('shows the letter and exports as PDF', () => {
    const downloadExport = vi.fn();
    render(
      <Tabs value="letter">
        <CoverLetterTab
          letter="Dear hiring manager,"
          summary={summary}
          elapsed="12"
          run={vi.fn()}
          downloadExport={downloadExport}
        />
      </Tabs>,
    );

    expect(screen.getByText('Dear hiring manager,')).toBeInTheDocument();
    expect(screen.getByText(/Completed in/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /PDF/ }));
    expect(downloadExport).toHaveBeenCalledWith('pdf');
  });

  it('shows the empty state without a letter', () => {
    render(
      <Tabs value="letter">
        <CoverLetterTab letter="" summary={null} elapsed={null} run={vi.fn()} downloadExport={vi.fn()} />
      </Tabs>,
    );

    expect(screen.getByText('No cover letter generated yet.')).toBeInTheDocument();
  });
});

describe('TailoredResumePreview', () => {
  it('renders the tailored resume sections', () => {
    render(
      <Tabs value="resume">
        <TailoredResumePreview
          tailoredResume={tailoredResume}
          extractData={extractData}
          summary={summary}
          resumes={[{ id: 'r1', name: 'My Resume', target_role: null, is_base_resume: true }]}
          resumeId="r1"
        />
      </Tabs>,
    );

    expect(screen.getByRole('heading', { name: 'My Resume' })).toBeInTheDocument();
    expect(screen.getByText('Engineer focused on accessible interfaces.')).toBeInTheDocument();
    expect(screen.getByText('React, TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Shipped a design system')).toBeInTheDocument();
  });

  it('shows the empty state without a tailored resume', () => {
    render(
      <Tabs value="resume">
        <TailoredResumePreview
          tailoredResume={null}
          extractData={null}
          summary={null}
          resumes={[]}
        />
      </Tabs>,
    );

    expect(screen.getByText('No tailored resume available yet.')).toBeInTheDocument();
  });

  it('supports alternate resume fields and long-name role fallback', () => {
    render(
      <Tabs value="resume">
        <TailoredResumePreview
          tailoredResume={{
            professional_summary: '',
            skills: [{ category: 'Tools', items: ['Git', 'Linux'] }],
            work_experience: [{ role: 'Developer', employer: 'Northwind', start_date: '2022', responsibilities: ['Built tools'] }],
            projects: [{ name: 'Toolbox', description: ['First feature', '', 'Second feature'] }],
            education: [{ institution: 'City College' }],
          }}
          extractData={{ ...extractData, company: '' }}
          summary={null}
          resumes={[{ id: 'r-long', name: 'A very long imported resume name that exceeds forty chars', target_role: null, is_base_resume: true }]}
          resumeId="r-long"
        />
      </Tabs>,
    );

    expect(screen.getByRole('heading', { name: 'Frontend Engineer' })).toBeInTheDocument();
    expect(screen.getByText('Git, Linux')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('at Northwind')).toBeInTheDocument();
    expect(screen.getByText('First feature')).toBeInTheDocument();
    expect(screen.getByText('City College')).toBeInTheDocument();
  });
});

describe('StudioChangesTab', () => {
  it('renders the hard truth, quality and recruiter review', () => {
    render(
      <Tabs value="changes">
        <StudioChangesTab
          tailoredResume={tailoredResume}
          summary={summary}
          extractData={extractData}
          scoreData={score}
          rescoreData={rescore}
          stepTimings={{ extract: 1000, score: 2000 }}
        />
      </Tabs>,
    );

    expect(screen.getByText(/Hard Truth/)).toBeInTheDocument();
    expect(screen.getByText('The posting expects backend depth.')).toBeInTheDocument();
    expect(screen.getByText('Quality Check Passed')).toBeInTheDocument();
    expect(screen.getByText('✔ Would Interview')).toBeInTheDocument();
    expect(screen.getByText(/1 keywords added/)).toBeInTheDocument();
  });

  it('shows the empty state without a tailored resume', () => {
    render(
      <Tabs value="changes">
        <StudioChangesTab
          tailoredResume={null}
          summary={null}
          extractData={null}
          scoreData={null}
          rescoreData={null}
          stepTimings={{}}
        />
      </Tabs>,
    );

    expect(screen.getByText('No changes to display.')).toBeInTheDocument();
  });

  it('renders low scores, failed quality checks, and empty review lists', () => {
    const lowSummary: StudioPipelineSummary = {
      ...summary,
      overall: 55,
      matched: 0,
      keywordsAdded: 0,
      bulletsRewritten: 0,
      sectionsModified: 0,
      isLowCompat: false,
      sectionConfidence: undefined,
      sectionChanges: undefined,
      quality: { passed: false, issues: ['Repeated phrase'], score: 65 },
      review: {
        ...summary.review!,
        wouldInterview: false,
        strengths: [],
        weaknesses: [],
        genericAreas: [],
      },
      plan: {
        ...summary.plan!,
        rewriteSummary: false,
        rewriteExperience: false,
        rewriteSkills: false,
        rewriteProjects: false,
      },
    };
    render(
      <Tabs value="changes">
        <StudioChangesTab
          tailoredResume={tailoredResume}
          summary={lowSummary}
          extractData={null}
          scoreData={null}
          rescoreData={{ ...score, missing: ['SQL'] }}
          stepTimings={{}}
        />
      </Tabs>,
    );

    expect(screen.getByText('Quality Issues Found')).toBeInTheDocument();
    expect(screen.getByText('Repeated phrase')).toBeInTheDocument();
    expect(screen.getByText(/Would not interview/)).toBeInTheDocument();
    expect(screen.getByText('Missing Keywords After Optimization')).toBeInTheDocument();
    expect(screen.getAllByText('Kept')).toHaveLength(4);
  });
});
