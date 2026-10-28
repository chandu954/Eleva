import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  ensureAdmin: vi.fn(),
  getUserDetailsById: vi.fn(),
  getResumeCountForUser: vi.fn(),
  getResumesForUser: vi.fn(),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
}));

vi.mock('../actions', () => ({
  ensureAdmin: mocks.ensureAdmin,
  getUserDetailsById: mocks.getUserDetailsById,
  getResumeCountForUser: mocks.getResumeCountForUser,
  getResumesForUser: mocks.getResumesForUser,
}));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
vi.mock('../components/user-resume-list', () => ({ default: ({ resumes }: { resumes: unknown[] }) => <div>Resume list: {resumes.length}</div> }));
vi.mock('../components/edit-subscription-plan-form', () => ({ default: ({ currentPlan }: { currentPlan: string | null }) => <div>Plan form: {currentPlan ?? 'new'}</div> }));

import AdminUserDetailPage from './page';

describe('AdminUserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureAdmin.mockResolvedValue(undefined);
    mocks.getUserDetailsById.mockResolvedValue({
      user: { id: 'user-1', email: 'ada@example.com', created_at: '2024-01-01T12:00:00Z', last_sign_in_at: null, email_confirmed_at: null },
      profile: { first_name: 'Ada', last_name: 'Lovelace', location: 'London', work_experience: [], education: {}, skills: ['math'], projects: [], certifications: null },
      subscription: { subscription_plan: 'pro', subscription_status: 'active', current_period_end: '2025-01-01T00:00:00Z', stripe_customer_id: 'cus_123' },
    });
    mocks.getResumeCountForUser.mockResolvedValue(2);
    mocks.getResumesForUser.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
  });

  it('requires admin access and renders auth, profile, subscription and resume details', async () => {
    const page = await AdminUserDetailPage({ params: Promise.resolve({ 'user-id': 'user-1' }) });
    render(page);
    expect(mocks.ensureAdmin).toHaveBeenCalledOnce();
    expect(mocks.getUserDetailsById).toHaveBeenCalledWith('user-1');
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Plan form: pro')).toBeInTheDocument();
    expect(screen.getByText('Resume list: 2')).toBeInTheDocument();
    expect(screen.getAllByText('Not set').length).toBeGreaterThan(0);
  });

  it('renders empty profile and subscription states, including a create-plan form', async () => {
    mocks.getUserDetailsById.mockResolvedValue({
      user: { id: 'user-2', email: null, created_at: null, last_sign_in_at: null, email_confirmed_at: null },
      profile: null,
      subscription: null,
    });
    mocks.getResumeCountForUser.mockResolvedValue(0);
    mocks.getResumesForUser.mockResolvedValue([]);
    const page = await AdminUserDetailPage({ params: Promise.resolve({ 'user-id': 'user-2' }) });
    render(page);
    expect(screen.getByText('No profile data found for this user.')).toBeInTheDocument();
    expect(screen.getByText('No subscription data found for this user.')).toBeInTheDocument();
    expect(screen.getByText('Plan form: new')).toBeInTheDocument();
    expect(screen.getByText('Resume list: 0')).toBeInTheDocument();
  });

  it('uses the not-found route when the requested account does not exist', async () => {
    mocks.getUserDetailsById.mockResolvedValue(null);
    await expect(AdminUserDetailPage({ params: Promise.resolve({ 'user-id': 'missing' }) })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.notFound).toHaveBeenCalledOnce();
    expect(mocks.getResumeCountForUser).not.toHaveBeenCalled();
  });
});
