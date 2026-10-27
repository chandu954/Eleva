// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from 'react';
import type { Profile, ResumeSummary } from '@/lib/types';

if (!globalThis.IntersectionObserver) {
  class IntersectionObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }

  globalThis.IntersectionObserver =
    IntersectionObserverMock as unknown as typeof IntersectionObserver;
}

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

const actionsMock = vi.hoisted(() => ({
  deleteResume: vi.fn(),
  copyResume: vi.fn(),
}));

const createDialogMock = vi.hoisted(() => vi.fn());
const sortControlsMock = vi.hoisted(() => vi.fn());

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/utils/actions/resumes/actions', () => ({
  deleteResume: actionsMock.deleteResume,
  copyResume: actionsMock.copyResume,
}));

vi.mock('@/components/resume/shared/mini-resume-preview', () => ({
  MiniResumePreview: ({
    name,
    type,
    target_role,
    createdAt,
  }: {
    name: string;
    type: 'base' | 'tailored';
    target_role?: string;
    createdAt?: string;
  }) => (
    <div
      data-testid="mini-resume-preview"
      data-type={type}
      data-target-role={target_role ?? ''}
      data-created-at={createdAt ?? ''}
    >
      <span>{name}</span>
      <span>{type === 'base' ? 'Base Resume' : 'Tailored Resume'}</span>
    </div>
  ),
}));

vi.mock('@/components/resume/management/dialogs/create-resume-dialog', () => ({
  CreateResumeDialog: (props: {
    children: ReactNode;
    type: 'base' | 'tailored';
    profile: Profile;
    baseResumes?: ResumeSummary[];
  }) => {
    createDialogMock(props);
    return <div data-testid="create-resume-dialog">{props.children}</div>;
  },
}));

vi.mock('@/components/resume/management/resume-sort-controls', () => ({
  ResumeSortControls: (props: Record<string, unknown>) => {
    sortControlsMock(props);
    return <div>Sort controls</div>;
  },
}));

import { toast } from 'sonner';
import { ResumesSection } from './resumes-section';

const profile: Profile = {
  id: 'profile-1',
  user_id: 'user-1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone_number: null,
  location: null,
  website: null,
  linkedin_url: null,
  github_url: null,
  work_experience: [],
  education: [],
  skills: [],
  projects: [],
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

function makeResume(index: number, overrides: Partial<ResumeSummary> = {}): ResumeSummary {
  return {
    id: `resume-${index}`,
    user_id: 'user-1',
    name: `Resume ${index}`,
    target_role: `Role ${index}`,
    is_base_resume: true,
    created_at: `2024-01-${String(index).padStart(2, '0')}T00:00:00.000Z`,
    updated_at: `2024-01-${String(index).padStart(2, '0')}T00:00:00.000Z`,
    ...overrides,
  };
}

type ResumesSectionProps = ComponentProps<typeof ResumesSection>;

function renderSection(overrides: Partial<ResumesSectionProps> = {}) {
  return render(
    <ResumesSection
      type="base"
      resumes={[]}
      profile={profile}
      sortParam="sort"
      directionParam="direction"
      currentSort="createdAt"
      currentDirection="desc"
      canCreateMore
      {...overrides}
    />,
  );
}

function getResumeCard(name: string): HTMLElement {
  const element = screen.getAllByText(name)[0];
  const card = element.closest('.group.relative.transition-all');
  if (!card) {
    throw new Error(`Resume card for ${name} not found`);
  }
  return card as HTMLElement;
}

function getCardButtons(name: string) {
  return within(getResumeCard(name)).getAllByRole('button');
}

beforeEach(() => {
  vi.clearAllMocks();
  actionsMock.deleteResume.mockResolvedValue(undefined);
  actionsMock.copyResume.mockResolvedValue(makeResume(99));
});

describe('ResumesSection', () => {
  it('renders the empty base state with a create card and sort controls', () => {
    renderSection();

    expect(screen.getByRole('heading', { name: 'Base Resumes' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Create Base Resume/i })).toHaveLength(2);
    expect(screen.getAllByText('Click to start')).toHaveLength(2);
    expect(screen.getByText('Sort controls')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'pagination' })).not.toBeInTheDocument();
    expect(screen.queryByText('Base Limit Reached')).not.toBeInTheDocument();

    expect(createDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'base', profile }),
    );
    expect(sortControlsMock).toHaveBeenCalledWith({
      sortParam: 'sort',
      directionParam: 'direction',
      currentSort: 'createdAt',
      currentDirection: 'desc',
    });
  });

  it('renders the tailored empty state and forwards base resumes to the creation dialog', () => {
    const baseResumes = [makeResume(1), makeResume(2)];

    renderSection({ type: 'tailored', baseResumes });

    expect(screen.getByRole('heading', { name: 'Tailored Resumes' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Create Tailored Resume/i })).toHaveLength(2);
    expect(createDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tailored', profile, baseResumes }),
    );
  });

  it('renders the limit-reached card instead of the create card when the plan is exhausted', () => {
    renderSection({ canCreateMore: false });

    expect(screen.getAllByText('Base Limit Reached')).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /Upgrade to create more/i })).toHaveLength(2);
    for (const link of screen.getAllByRole('link', { name: /Upgrade to create more/i })) {
      expect(link).toHaveAttribute('href', '/subscription');
    }
    expect(screen.queryByRole('button', { name: /Create Base Resume/i })).not.toBeInTheDocument();
    expect(createDialogMock).not.toHaveBeenCalled();
  });

  it('renders populated resumes in both the mobile carousel and desktop grid', () => {
    const resumes = [
      makeResume(1),
      makeResume(2, { is_base_resume: false, target_role: 'Designer' }),
    ];

    renderSection({ resumes });

    expect(screen.getAllByText('Resume 1')).toHaveLength(2);
    expect(screen.getAllByText('Resume 2')).toHaveLength(2);

    const resumeLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/resumes/'));
    expect(resumeLinks).toHaveLength(4);
    expect(resumeLinks.map((link) => link.getAttribute('href'))).toEqual(
      expect.arrayContaining([
        '/resumes/resume-1',
        '/resumes/resume-2',
        '/resumes/resume-1',
        '/resumes/resume-2',
      ]),
    );

    const previews = screen.getAllByTestId('mini-resume-preview');
    expect(previews).toHaveLength(4);
    expect(previews[0]).toHaveAttribute('data-target-role', 'Role 1');
    expect(previews[0]).toHaveAttribute('data-created-at', resumes[0].created_at);
    expect(previews.every((preview) => preview.getAttribute('data-type') === 'base')).toBe(true);
  });

  it('renders the mobile carousel with one slide per visible resume', () => {
    renderSection({ resumes: [makeResume(1), makeResume(2), makeResume(3)] });

    const carousel = document.querySelector('[aria-roledescription="carousel"]');
    expect(carousel).not.toBeNull();

    const slides = document.querySelectorAll('[aria-roledescription="slide"]');
    expect(slides).toHaveLength(3);
    expect(within(slides[0] as HTMLElement).getByText('Resume 1')).toBeInTheDocument();
    expect(within(slides[2] as HTMLElement).getByText('Resume 3')).toBeInTheDocument();
  });

  it('paginates the desktop grid and disables the arrows at the edges', async () => {
    const resumes = Array.from({ length: 9 }, (_, index) => makeResume(index + 1));
    const user = userEvent.setup();

    renderSection({ resumes });

    const pagination = screen.getByRole('navigation', { name: 'pagination' });
    const pageButtons = within(pagination).getAllByRole('button');
    expect(pageButtons[0]).toBeDisabled();
    expect(pageButtons.at(-1)).not.toBeDisabled();

    expect(screen.getAllByText('Resume 1')).toHaveLength(2);
    expect(screen.queryByText('Resume 8')).not.toBeInTheDocument();

    await user.click(within(pagination).getByRole('button', { name: '2' }));

    expect(screen.queryByText('Resume 1')).not.toBeInTheDocument();
    expect(screen.getAllByText('Resume 8')).toHaveLength(2);
    expect(screen.getAllByText('Resume 9')).toHaveLength(2);
    expect(within(pagination).getAllByRole('button')[0]).not.toBeDisabled();
    expect(within(pagination).getAllByRole('button').at(-1)).toBeDisabled();

    await user.click(within(pagination).getByRole('button', { name: '1' }));

    expect(screen.getAllByText('Resume 1')).toHaveLength(2);
    expect(screen.queryByText('Resume 8')).not.toBeInTheDocument();
  });

  it('collapses distant pages behind an ellipsis', () => {
    const resumes = Array.from({ length: 40 }, (_, index) => makeResume(index + 1));

    renderSection({ resumes });

    const pagination = screen.getByRole('navigation', { name: 'pagination' });
    expect(within(pagination).getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(within(pagination).getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(within(pagination).getByRole('button', { name: '6' })).toBeInTheDocument();
    expect(within(pagination).getByText('...')).toBeInTheDocument();
    expect(within(pagination).queryByRole('button', { name: '4' })).not.toBeInTheDocument();
  });

  it('cancels a delete without calling the server action', async () => {
    const user = userEvent.setup();
    renderSection({ resumes: [makeResume(1)] });

    await user.click(getCardButtons('Resume 1')[0]);

    const dialog = screen.getByRole('alertdialog', { name: 'Delete Resume' });
    expect(within(dialog).getByText(/Resume 1/)).toBeInTheDocument();
    expect(actionsMock.deleteResume).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog', { name: 'Delete Resume' })).not.toBeInTheDocument(),
    );
    expect(actionsMock.deleteResume).not.toHaveBeenCalled();
  });

  it('deletes a resume and reports progress and success', async () => {
    const user = userEvent.setup();
    renderSection({ resumes: [makeResume(1)] });

    await user.click(getCardButtons('Resume 1')[0]);
    await user.click(
      within(screen.getByRole('alertdialog', { name: 'Delete Resume' })).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() => expect(actionsMock.deleteResume).toHaveBeenCalledWith('resume-1'));
    expect(toast.loading).toHaveBeenCalledWith('Deleting "Resume 1"...', { id: 'resume-1' });
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('"Resume 1" deleted successfully', {
        id: 'resume-1',
      }),
    );
  });

  it('reports a failed delete and rolls the optimistic state back', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    actionsMock.deleteResume.mockRejectedValue(new Error('delete failed'));
    const user = userEvent.setup();
    renderSection({ resumes: [makeResume(1)] });

    await user.click(getCardButtons('Resume 1')[0]);
    await user.click(
      within(screen.getByRole('alertdialog', { name: 'Delete Resume' })).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to delete "Resume 1". Please try again.',
        { id: 'resume-1' },
      ),
    );
    expect(consoleError).toHaveBeenCalledWith('Failed to delete resume:', expect.any(Error));
    await waitFor(() => expect(screen.getAllByText('Resume 1').length).toBeGreaterThan(0));

    consoleError.mockRestore();
  });

  it('copies a resume and reports progress and success', async () => {
    const user = userEvent.setup();
    renderSection({ resumes: [makeResume(1)] });

    await user.click(getCardButtons('Resume 1')[1]);

    await waitFor(() => expect(actionsMock.copyResume).toHaveBeenCalledWith('resume-1'));
    expect(toast.loading).toHaveBeenCalledWith('Copying "Resume 1"...', {
      id: 'copy-resume-1',
    });
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('"Resume 1" copied successfully', {
        id: 'copy-resume-1',
      }),
    );
  });

  it('reports a failed copy', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    actionsMock.copyResume.mockRejectedValue(new Error('copy failed'));
    const user = userEvent.setup();
    renderSection({ resumes: [makeResume(1)] });

    await user.click(getCardButtons('Resume 1')[1]);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to copy "Resume 1". Please try again.', {
        id: 'copy-resume-1',
      }),
    );
    expect(consoleError).toHaveBeenCalledWith('Failed to copy resume:', expect.any(Error));

    consoleError.mockRestore();
  });

  it('keeps the optimistic copy visible until the server action resolves', async () => {
    let resolveCopy!: (value: unknown) => void;
    actionsMock.copyResume.mockReturnValue(
      new Promise((resolve) => {
        resolveCopy = resolve;
      }),
    );
    const user = userEvent.setup();
    renderSection({ resumes: [makeResume(1)] });

    await user.click(getCardButtons('Resume 1')[1]);

    expect((await screen.findAllByText('Copying...')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Resume 1 (Copy)').length).toBeGreaterThan(0);

    resolveCopy(makeResume(99));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('"Resume 1" copied successfully', {
        id: 'copy-resume-1',
      }),
    );
  });

  it('keeps the optimistic delete applied until the server action resolves', async () => {
    let resolveDelete!: (value: unknown) => void;
    actionsMock.deleteResume.mockReturnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const user = userEvent.setup();
    renderSection({ resumes: [makeResume(1)] });

    await user.click(getCardButtons('Resume 1')[0]);
    await user.click(
      within(screen.getByRole('alertdialog', { name: 'Delete Resume' })).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() => expect(screen.queryByText('Resume 1')).not.toBeInTheDocument());
    expect(toast.loading).toHaveBeenCalledWith('Deleting "Resume 1"...', { id: 'resume-1' });

    resolveDelete(undefined);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('"Resume 1" deleted successfully', {
        id: 'resume-1',
      }),
    );
  });

  it('shows the upgrade dialog instead of copying when the plan is exhausted', async () => {
    const user = userEvent.setup();
    renderSection({ resumes: [makeResume(1)], canCreateMore: false });

    await user.click(getCardButtons('Resume 1')[1]);

    const dialog = screen.getByRole('alertdialog', { name: 'Upgrade Required' });
    expect(
      within(dialog).getByText(/reached the maximum number of base resumes/i),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Upgrade to Pro' })).toHaveAttribute(
      'href',
      '/subscription',
    );
    expect(actionsMock.copyResume).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('alertdialog', { name: 'Upgrade Required' }),
      ).not.toBeInTheDocument(),
    );
  });
});
