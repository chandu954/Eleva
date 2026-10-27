// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { getJobListingsMock, deleteJobMock, createClientMock, getUserMock, fromMock } =
  vi.hoisted(() => ({
    getJobListingsMock: vi.fn(),
    deleteJobMock: vi.fn(),
    createClientMock: vi.fn(),
    getUserMock: vi.fn(),
    fromMock: vi.fn(),
  }));

vi.mock('@/utils/actions/jobs/actions', () => ({
  getJobListings: getJobListingsMock,
  deleteJob: deleteJobMock,
}));

vi.mock('@/utils/supabase/client', () => ({
  createClient: createClientMock,
}));

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) {
          cache.set(tag, (props: Record<string, unknown>) => {
            const {
              initial,
              animate,
              exit,
              transition,
              whileHover,
              whileTap,
              variants,
              layout,
              layoutId,
              ...rest
            } = props;
            void initial;
            void animate;
            void exit;
            void transition;
            void whileHover;
            void whileTap;
            void variants;
            void layout;
            void layoutId;
            return React.createElement(tag, rest);
          });
        }
        return cache.get(tag);
      },
    },
  );

  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

import { JobListingsCard } from './job-listings-card';

const DAY = 24 * 60 * 60 * 1000;

interface Job {
  id: string;
  company_name: string;
  position_title: string;
  location: string | null;
  work_location: 'remote' | 'in_person' | 'hybrid' | null;
  employment_type: 'full_time' | 'part_time' | 'co_op' | 'internship' | null;
  salary_range: string | null;
  created_at: string;
  keywords: string[] | null;
}

interface JobsResult {
  jobs: Job[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

const jobs: Job[] = [
  {
    id: 'job-1',
    company_name: 'Acme Corp',
    position_title: 'Senior Engineer',
    location: 'Toronto',
    work_location: 'remote',
    employment_type: 'full_time',
    salary_range: '$120k - $150k',
    created_at: new Date(Date.now() + 2 * DAY).toISOString(),
    keywords: ['React', 'TypeScript', 'Node', 'GraphQL'],
  },
  {
    id: 'job-2',
    company_name: 'Globex',
    position_title: 'Product Manager',
    location: null,
    work_location: null,
    employment_type: null,
    salary_range: null,
    created_at: new Date(Date.now() - 2 * DAY).toISOString(),
    keywords: null,
  },
];

let profileQuery: { data: { is_admin: boolean } | null; error: Error | null };
let adminQuery: { data: { is_admin: boolean } | null; error: Error | null };

function jobsResult(overrides: Partial<JobsResult> = {}): JobsResult {
  return {
    jobs,
    totalCount: jobs.length,
    currentPage: 1,
    totalPages: 1,
    ...overrides,
  };
}

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  comboboxIndex: number,
  optionName: RegExp,
) {
  await user.click(screen.getAllByRole('combobox')[comboboxIndex]);
  await user.click(await screen.findByRole('option', { name: optionName }));
}

function trashButton() {
  const icon = document.querySelector('.lucide-trash2');
  return icon ? icon.closest('button') : null;
}

beforeEach(() => {
  vi.clearAllMocks();

  profileQuery = { data: null, error: null };
  adminQuery = { data: null, error: null };

  getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  getJobListingsMock.mockResolvedValue(jobsResult());
  deleteJobMock.mockResolvedValue(undefined);

  createClientMock.mockImplementation(() => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }));

  fromMock.mockImplementation((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi
          .fn()
          .mockResolvedValue(table === 'profiles' ? profileQuery : adminQuery),
      })),
    })),
  }));

  // Radix Select calls pointer capture APIs that jsdom does not implement.
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
  }
});

describe('JobListingsCard', () => {
  it('shows six loading skeletons and then renders the fetched jobs', async () => {
    let resolveJobs!: (value: JobsResult) => void;
    getJobListingsMock.mockReturnValue(
      new Promise((resolve) => {
        resolveJobs = resolve;
      }),
    );

    const { container } = render(<JobListingsCard />);

    expect(screen.getByText('Job Listings')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(6);

    await act(async () => {
      resolveJobs(jobsResult());
    });

    expect(await screen.findByText('Senior Engineer')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
  });

  it('renders job details, keyword truncation, and fallbacks for missing fields', async () => {
    render(<JobListingsCard />);

    expect(await screen.findByText('Senior Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Toronto')).toBeInTheDocument();
    expect(screen.getByText('remote')).toBeInTheDocument();
    expect(screen.getByText('$120k - $150k')).toBeInTheDocument();
    expect(screen.getByText('in 2 days')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Node')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
    expect(screen.queryByText('GraphQL')).not.toBeInTheDocument();

    expect(screen.getByText('Product Manager')).toBeInTheDocument();
    expect(screen.getByText('Globex')).toBeInTheDocument();
    expect(screen.getByText('Location not specified')).toBeInTheDocument();
    expect(screen.getByText('Not specified')).toBeInTheDocument();
    expect(screen.getByText('2 days ago')).toBeInTheDocument();
    expect(screen.queryByText('+0 more')).not.toBeInTheDocument();
  });

  it('requests the first page with no filters on mount', async () => {
    render(<JobListingsCard />);

    await waitFor(() => expect(getJobListingsMock).toHaveBeenCalledTimes(1));
    expect(getJobListingsMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 6,
      filters: {
        workLocation: undefined,
        employmentType: undefined,
      },
    });
  });

  it('paginates forward and backward while disabling boundary buttons', async () => {
    getJobListingsMock.mockResolvedValue(jobsResult({ totalCount: 12, totalPages: 2 }));
    const user = userEvent.setup();
    render(<JobListingsCard />);

    await screen.findByText('Senior Engineer');

    const previous = screen.getByRole('button', { name: 'Previous' });
    const next = screen.getByRole('button', { name: 'Next' });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    await user.click(next);

    await waitFor(() =>
      expect(getJobListingsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );
    expect(previous).toBeEnabled();
    expect(next).toBeDisabled();

    await user.click(previous);

    await waitFor(() =>
      expect(getJobListingsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
      ),
    );
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();
  });

  it('applies work-location and employment-type filters through the selects', async () => {
    const user = userEvent.setup();
    render(<JobListingsCard />);

    await screen.findByText('Senior Engineer');

    await chooseOption(user, 0, /Remote/);
    await waitFor(() =>
      expect(getJobListingsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: { workLocation: 'remote', employmentType: undefined },
        }),
      ),
    );

    await chooseOption(user, 1, /Full Time/);
    await waitFor(() =>
      expect(getJobListingsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: { workLocation: 'remote', employmentType: 'full_time' },
        }),
      ),
    );
  });

  it('hides the delete action for non-admin users', async () => {
    profileQuery = { data: { is_admin: false }, error: null };
    render(<JobListingsCard />);

    await screen.findByText('Senior Engineer');
    await waitFor(() => expect(fromMock).toHaveBeenCalledWith('profiles'));

    expect(trashButton()).toBeNull();
  });

  it('shows the delete action for admins and refetches after deletion', async () => {
    profileQuery = { data: { is_admin: true }, error: null };
    getJobListingsMock
      .mockResolvedValueOnce(jobsResult())
      .mockResolvedValueOnce(jobsResult({ jobs: [jobs[1]!], totalCount: 1 }));
    const user = userEvent.setup();
    render(<JobListingsCard />);

    await screen.findByText('Senior Engineer');
    await waitFor(() => expect(trashButton()).not.toBeNull());

    await user.click(trashButton()!);

    expect(deleteJobMock).toHaveBeenCalledWith('job-1');
    await waitFor(() => expect(getJobListingsMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByText('Senior Engineer')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Product Manager')).toBeInTheDocument();
  });

  it('falls back to the legacy admins table when the profile lookup fails', async () => {
    profileQuery = { data: null, error: new Error('profiles unavailable') };
    adminQuery = { data: { is_admin: true }, error: null };
    render(<JobListingsCard />);

    await screen.findByText('Senior Engineer');
    await waitFor(() => expect(fromMock).toHaveBeenCalledWith('admins'));
    await waitFor(() => expect(trashButton()).not.toBeNull());
  });

  it('does not query profile tables when no user is signed in', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    render(<JobListingsCard />);

    await screen.findByText('Senior Engineer');
    await waitFor(() => expect(getUserMock).toHaveBeenCalledTimes(1));

    expect(fromMock).not.toHaveBeenCalled();
    expect(trashButton()).toBeNull();
  });

  it('logs a fetch failure and stops showing the loading skeletons', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getJobListingsMock.mockRejectedValue(new Error('database down'));

    const { container } = render(<JobListingsCard />);

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        'Error fetching jobs:',
        expect.any(Error),
      ),
    );
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
    expect(screen.queryByText('Senior Engineer')).not.toBeInTheDocument();

    consoleError.mockRestore();
  });

  it('logs a deletion failure and keeps the existing job visible', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    profileQuery = { data: { is_admin: true }, error: null };
    deleteJobMock.mockRejectedValue(new Error('delete failed'));
    const user = userEvent.setup();
    render(<JobListingsCard />);

    await screen.findByText('Senior Engineer');
    await waitFor(() => expect(trashButton()).not.toBeNull());

    await user.click(trashButton()!);

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        'Error deleting job:',
        expect.any(Error),
      ),
    );
    expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
    expect(getJobListingsMock).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });
});
