import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/actions/stripe/actions', () => ({
  getSubscriptionPlan: vi.fn().mockResolvedValue({ plan: 'pro', id: 'user-1' }),
}));

vi.mock('@/lib/ai/usage-ledger', () => ({
  startAIUsageRequest: vi.fn().mockResolvedValue({
    model: { modelId: 'mock' },
    usageEventId: 'usage-1',
    telemetry: {},
  }),
  finishAIUsageRequest: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateObject: vi.fn().mockResolvedValue({
      object: {
        content: {
          first_name: 'Ada',
          last_name: 'Lovelace',
          email: 'ada@example.com',
          phone_number: '123',
          location: 'London',
          website: 'https://ada.dev',
          linkedin_url: 'https://linkedin.com/in/ada',
          github_url: 'https://github.com/ada',
          work_experience: [],
          education: [],
          skills: [],
          projects: [],
          bulletPoints: ['Built things'],
          points: ['Built things'],
          items: ['Built things'],
        },
      },
    }),
  };
});

import { generateObject } from 'ai';
import { finishAIUsageRequest } from '@/lib/ai/usage-ledger';
import {
  addTextToResume,
  convertTextToResume,
  generateProjectPoints,
  generateWorkExperiencePoints,
  improveProject,
  improveWorkExperience,
  modifyWorkExperience,
  processTextImport,
} from './ai';

const resume = {
  id: 'resume-1',
  user_id: 'user-1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone_number: '123',
  location: 'London',
  website: 'https://ada.dev',
  linkedin_url: null,
  github_url: null,
  work_experience: [],
  education: [],
  skills: [],
  projects: [],
  section_order: [],
  section_configs: {},
  document_settings: {},
  is_base_resume: true,
  job_id: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
} as never;

describe('resume AI actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converts text into a resume', async () => {
    const result = await convertTextToResume('resume text', resume, 'Engineer');
    expect(result).toMatchObject({ first_name: 'Ada' });
  });

  it('adds text to an existing resume', async () => {
    const result = await addTextToResume('more text', resume);
    expect(result).toMatchObject({ first_name: 'Ada' });
  });

  it('processes text imports', async () => {
    await expect(processTextImport('text')).resolves.toMatchObject({ first_name: 'Ada' });
  });

  it('generates work experience points', async () => {
    await expect(generateWorkExperiencePoints('Engineer', 'Acme', ['TS'], 'Staff')).resolves.toBeTruthy();
  });

  it('improves a work experience bullet', async () => {
    await expect(improveWorkExperience('Built things')).resolves.toBeTruthy();
  });

  it('generates project points and improves a project bullet', async () => {
    await expect(generateProjectPoints('Eleva', ['Next.js'], 'Staff')).resolves.toBeTruthy();
    await expect(improveProject('Built things')).resolves.toBeTruthy();
  });

  it('modifies work experience', async () => {
    await expect(modifyWorkExperience([], 'Make it shorter')).resolves.toBeTruthy();
  });

  it('marks usage as failed when generation throws', async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(new Error('provider down'));

    await expect(improveProject('Built things')).rejects.toThrow('provider down');
    expect(finishAIUsageRequest).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      errorCode: 'provider down',
    }));
  });
});
