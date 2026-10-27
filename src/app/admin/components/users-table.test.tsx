// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { pushMock, getUsersMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getUsersMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('../actions', () => ({
  getUsersWithProfilesAndSubscriptions: getUsersMock,
}));

import UsersTable from './users-table';

const futureTrial = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const pastTrial = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

interface TestUser {
  user: {
    id: string;
    email?: string;
    created_at: string;
    last_sign_in_at?: string;
  };
  profile: {
    user_id: string;
    first_name?: string;
    last_name?: string;
    location?: string;
    work_experience?: Array<Record<string, unknown>>;
    education?: Array<Record<string, unknown>>;
    skills?: Array<Record<string, unknown>>;
  } | null;
  subscription: {
    user_id?: string;
    subscription_plan?: string;
    subscription_status?: string;
    current_period_end?: string;
    trial_end?: string | null;
  } | null;
  resume_count: number;
}

const alice: TestUser = {
  user: {
    id: 'u1',
    email: 'alice@example.com',
    created_at: '2024-01-15T12:00:00.000Z',
    last_sign_in_at: '2024-06-01T12:00:00.000Z',
  },
  profile: {
    user_id: 'u1',
    first_name: 'Alice',
    last_name: 'Smith',
    location: 'Toronto',
    work_experience: [{ company: 'Acme' }, { company: 'Globex' }],
    education: [{ institution: 'State University' }],
    skills: [{ category: 'Languages' }, { category: 'Frameworks' }, { category: 'Tools' }],
  },
  subscription: {
    user_id: 'u1',
    subscription_plan: 'pro',
    subscription_status: 'active',
    current_period_end: '2027-01-01T12:00:00.000Z',
    trial_end: futureTrial,
  },
  resume_count: 4,
};

const bob: TestUser = {
  user: {
    id: 'u2',
    email: 'bob@example.com',
    created_at: '2024-02-20T12:00:00.000Z',
    last_sign_in_at: '2024-05-01T12:00:00.000Z',
  },
  profile: {
    user_id: 'u2',
    first_name: 'Bob',
    last_name: 'Jones',
    location: 'London',
    work_experience: [],
    education: [],
    skills: [],
  },
  subscription: {
    user_id: 'u2',
    subscription_plan: 'free',
    subscription_status: 'canceled',
    current_period_end: '2024-03-01T12:00:00.000Z',
    trial_end: pastTrial,
  },
  resume_count: 1,
};

const carol: TestUser = {
  user: {
    id: 'u3',
    email: 'carol@example.com',
    created_at: '2024-03-25T12:00:00.000Z',
  },
  profile: null,
  subscription: null,
  resume_count: 0,
};

const dave: TestUser = {
  user: {
    id: 'u4',
    email: 'dave@example.com',
    created_at: '2024-04-10T12:00:00.000Z',
  },
  profile: {
    user_id: 'u4',
    first_name: 'Dave',
    last_name: 'Brown',
    location: 'Berlin',
    work_experience: [{ company: 'Initech' }],
    skills: [{ category: 'Databases' }, { category: 'Cloud' }],
  },
  subscription: {
    user_id: 'u4',
    subscription_plan: 'pro',
    subscription_status: 'past_due',
    current_period_end: '2024-05-01T12:00:00.000Z',
    trial_end: 'not-a-date',
  },
  resume_count: 2,
};

const users = [alice, bob, carol, dave];

function expectedDate(dateString?: string) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function emailsInOrder() {
  const table = screen.getByRole('table');
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);
}

async function renderLoaded(data: TestUser[] = users) {
  getUsersMock.mockResolvedValue(data);
  const user = userEvent.setup({ delay: null });
  render(<UsersTable />);
  await screen.findByPlaceholderText('Search users...');
  return user;
}

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  comboboxIndex: number,
  optionName: string,
) {
  await user.click(screen.getAllByRole('combobox')[comboboxIndex]);
  await user.click(await screen.findByRole('option', { name: optionName }));
}

beforeEach(() => {
  vi.clearAllMocks();
  getUsersMock.mockResolvedValue(users);

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

describe('UsersTable', () => {
  it('shows a skeleton while loading and then renders the overview table', async () => {
    let resolveUsers!: (value: TestUser[]) => void;
    getUsersMock.mockReturnValue(
      new Promise((resolve) => {
        resolveUsers = resolve;
      }),
    );

    render(<UsersTable />);

    expect(screen.queryByPlaceholderText('Search users...')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await act(async () => {
      resolveUsers(users);
    });

    expect(await screen.findByPlaceholderText('Search users...')).toBeInTheDocument();
    expect(screen.getByText('Showing 4 of 4 users.')).toBeInTheDocument();

    const aliceRow = screen.getByText('alice@example.com').closest('tr')!;
    expect(within(aliceRow).getByText('PRO')).toBeInTheDocument();
    expect(within(aliceRow).getByText('ACTIVE')).toBeInTheDocument();
    expect(
      within(aliceRow).getByText(`Trialing · ends ${expectedDate(futureTrial)}`),
    ).toBeInTheDocument();
    expect(within(aliceRow).getByText(expectedDate(alice.user.created_at))).toBeInTheDocument();
    expect(within(aliceRow).getByText(expectedDate(alice.user.last_sign_in_at))).toBeInTheDocument();
    expect(within(aliceRow).getByText('Alice Smith')).toBeInTheDocument();
    expect(within(aliceRow).getByText(expectedDate(alice.subscription?.current_period_end))).toBeInTheDocument();
    expect(within(aliceRow).getByText('4')).toBeInTheDocument();

    const bobRow = screen.getByText('bob@example.com').closest('tr')!;
    expect(within(bobRow).getByText('FREE')).toBeInTheDocument();
    expect(within(bobRow).getByText('CANCELED')).toBeInTheDocument();
    expect(
      within(bobRow).getByText(`Trial ended ${expectedDate(pastTrial)}`),
    ).toBeInTheDocument();

    const carolRow = screen.getByText('carol@example.com').closest('tr')!;
    expect(within(carolRow).getByText('No Plan')).toBeInTheDocument();
    expect(within(carolRow).getByText('No Trial')).toBeInTheDocument();
    expect(within(carolRow).getAllByText('N/A')).toHaveLength(3);
    expect(within(carolRow).getByText('Not set')).toBeInTheDocument();
    expect(within(carolRow).getByText('0')).toBeInTheDocument();

    const daveRow = screen.getByText('dave@example.com').closest('tr')!;
    expect(within(daveRow).getByText('PAST_DUE')).toBeInTheDocument();
    expect(within(daveRow).getByText('Trial ended Invalid date')).toBeInTheDocument();
  });

  it('renders an empty table when there are no users', async () => {
    await renderLoaded([]);

    expect(screen.getByText('Showing 0 of 0 users.')).toBeInTheDocument();
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();
  });

  it('renders N/A when a user has no email address', async () => {
    await renderLoaded([{ ...carol, user: { ...carol.user, email: undefined } }]);

    const row = screen.getByText('Not set').closest('tr')!;
    expect(within(row).getAllByText('N/A')).toHaveLength(4);
  });

  it('shows an error card when loading users fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getUsersMock.mockRejectedValue(new Error('database down'));

    render(<UsersTable />);

    expect(
      await screen.findByText('Failed to load users. Please try again.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith('Error fetching users:', expect.any(Error));
    consoleError.mockRestore();
  });

  it('filters by email, name, location, plan, status and no-match searches', async () => {
    await renderLoaded();
    const search = screen.getByPlaceholderText('Search users...');

    fireEvent.change(search, { target: { value: 'alice' } });
    await waitFor(() => expect(emailsInOrder()).toEqual(['alice@example.com']));
    expect(
      screen.getByText('Showing 1 of 4 users. (Filtered from 4 total)'),
    ).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'bob jones' } });
    await waitFor(() => expect(emailsInOrder()).toEqual(['bob@example.com']));

    fireEvent.change(search, { target: { value: 'berlin' } });
    await waitFor(() => expect(emailsInOrder()).toEqual(['dave@example.com']));

    fireEvent.change(search, { target: { value: 'past_due' } });
    await waitFor(() => expect(emailsInOrder()).toEqual(['dave@example.com']));

    fireEvent.change(search, { target: { value: 'zzz' } });
    await waitFor(() => expect(emailsInOrder()).toEqual([]));
    expect(
      screen.getByText('Showing 0 of 4 users. (Filtered from 4 total)'),
    ).toBeInTheDocument();
  });

  it('filters by subscription plan', async () => {
    const user = await renderLoaded();

    await chooseOption(user, 0, 'PRO');
    await waitFor(() =>
      expect(emailsInOrder()).toEqual(['dave@example.com', 'alice@example.com']),
    );

    await chooseOption(user, 0, 'No Plan');
    await waitFor(() => expect(emailsInOrder()).toEqual(['carol@example.com']));

    await chooseOption(user, 0, 'FREE');
    await waitFor(() => expect(emailsInOrder()).toEqual(['bob@example.com']));

    await chooseOption(user, 0, 'All Plans');
    await waitFor(() =>
      expect(emailsInOrder()).toEqual([
        'dave@example.com',
        'carol@example.com',
        'bob@example.com',
        'alice@example.com',
      ]),
    );
  });

  it('filters by subscription status', async () => {
    const user = await renderLoaded();

    await chooseOption(user, 2, 'CANCELED');
    await waitFor(() => expect(emailsInOrder()).toEqual(['bob@example.com']));

    await chooseOption(user, 2, 'N/A');
    await waitFor(() => expect(emailsInOrder()).toEqual(['carol@example.com']));

    await chooseOption(user, 2, 'PAST_DUE');
    await waitFor(() => expect(emailsInOrder()).toEqual(['dave@example.com']));

    await chooseOption(user, 2, 'All Statuses');
    await waitFor(() => expect(emailsInOrder()).toHaveLength(4));
  });

  it('filters by trial state', async () => {
    const user = await renderLoaded();

    await chooseOption(user, 1, 'Active Trial');
    await waitFor(() => expect(emailsInOrder()).toEqual(['alice@example.com']));

    await chooseOption(user, 1, 'Trial Ended');
    await waitFor(() => expect(emailsInOrder()).toEqual(['bob@example.com']));

    await chooseOption(user, 1, 'Never Started Trial');
    await waitFor(() => expect(emailsInOrder()).toEqual(['carol@example.com']));

    await chooseOption(user, 1, 'All Trial States');
    await waitFor(() => expect(emailsInOrder()).toHaveLength(4));
  });

  it('combines plan and search filters and reports the filtered caption', async () => {
    const user = await renderLoaded();

    await chooseOption(user, 0, 'PRO');
    await user.type(screen.getByPlaceholderText('Search users...'), 'alice');

    await waitFor(() => expect(emailsInOrder()).toEqual(['alice@example.com']));
    expect(
      screen.getByText('Showing 1 of 4 users. (Filtered from 4 total)'),
    ).toBeInTheDocument();
  });

  it('sorts rows by email and toggles direction on repeated clicks', async () => {
    await renderLoaded();

    expect(emailsInOrder()).toEqual([
      'dave@example.com',
      'carol@example.com',
      'bob@example.com',
      'alice@example.com',
    ]);

    fireEvent.click(screen.getByRole('button', { name: /^Email/ }));
    expect(emailsInOrder()).toEqual([
      'alice@example.com',
      'bob@example.com',
      'carol@example.com',
      'dave@example.com',
    ]);

    fireEvent.click(screen.getByRole('button', { name: /^Email/ }));
    expect(emailsInOrder()).toEqual([
      'dave@example.com',
      'carol@example.com',
      'bob@example.com',
      'alice@example.com',
    ]);
  });

  it('sorts overview rows by identity and date columns', async () => {
    await renderLoaded();

    for (const name of ['Email', 'Created', 'Last Sign In', 'Name']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
      expect(emailsInOrder()).toHaveLength(4);
    }
  });

  it('sorts overview rows by subscription columns', async () => {
    await renderLoaded();

    for (const name of ['Plan', 'Trial', 'Status', 'Expires']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
      expect(emailsInOrder()).toHaveLength(4);
    }
  });

  it('sorts overview rows by resume count in both directions', async () => {
    await renderLoaded();

    fireEvent.click(screen.getByRole('button', { name: /^Resumes/ }));
    expect(emailsInOrder()).toEqual([
      'carol@example.com',
      'bob@example.com',
      'dave@example.com',
      'alice@example.com',
    ]);
    fireEvent.click(screen.getByRole('button', { name: /^Resumes/ }));
    expect(emailsInOrder()).toEqual([
      'alice@example.com',
      'dave@example.com',
      'bob@example.com',
      'carol@example.com',
    ]);
  });

  it('navigates to a user detail page when a row is clicked', async () => {
    const user = await renderLoaded();

    await user.click(screen.getByText('alice@example.com'));

    expect(pushMock).toHaveBeenCalledWith('/admin/u1');
  });

  it('renders profile tab details and counts', async () => {
    const user = await renderLoaded();

    await user.click(screen.getByRole('tab', { name: 'Profiles' }));

    expect(
      screen.getByText('Showing 3 profiles from 4 filtered users.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Location/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Work Exp/ })).toBeInTheDocument();

    const aliceRow = screen.getByText('alice@example.com').closest('tr')!;
    expect(within(aliceRow).getByText('Toronto')).toBeInTheDocument();
    expect(within(aliceRow).getByText('2 entries')).toBeInTheDocument();
    expect(within(aliceRow).getByText('1 entries')).toBeInTheDocument();
    expect(within(aliceRow).getByText('3 entries')).toBeInTheDocument();

    const bobRow = screen.getByText('bob@example.com').closest('tr')!;
    expect(within(bobRow).getByText('London')).toBeInTheDocument();
    expect(within(bobRow).getAllByText('0 entries')).toHaveLength(3);

    const carolRow = screen.getByText('carol@example.com').closest('tr')!;
    expect(within(carolRow).getAllByText('Not set')).toHaveLength(2);
    expect(within(carolRow).getByText('No Trial')).toBeInTheDocument();
    expect(within(carolRow).getAllByText('0')).toHaveLength(3);

    const daveRow = screen.getByText('dave@example.com').closest('tr')!;
    expect(within(daveRow).getByText('Berlin')).toBeInTheDocument();
    expect(within(daveRow).getByText('1 entries')).toBeInTheDocument();
    expect(within(daveRow).getByText('2 entries')).toBeInTheDocument();
    expect(within(daveRow).getByText('0')).toBeInTheDocument();
  });

  it('sorts profile rows by identity and trial columns', async () => {
    const user = await renderLoaded();
    await user.click(screen.getByRole('tab', { name: 'Profiles' }));

    for (const name of ['Email', 'Name', 'Trial']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
      expect(emailsInOrder()).toHaveLength(4);
    }
  });

  it('sorts profile rows by location and section counts', async () => {
    const user = await renderLoaded();
    await user.click(screen.getByRole('tab', { name: 'Profiles' }));

    for (const name of ['Location', 'Work Exp', 'Education', 'Skills']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
      expect(emailsInOrder()).toHaveLength(4);
    }

    fireEvent.click(screen.getByRole('button', { name: /^Work Exp/ }));
    expect(emailsInOrder()).toEqual([
      'bob@example.com',
      'carol@example.com',
      'dave@example.com',
      'alice@example.com',
    ]);
  });
});
