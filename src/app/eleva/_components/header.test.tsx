// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type AiStatus = {
  state: 'idle' | 'running' | 'done' | 'error';
  label?: string;
  task?: string;
  durationMs?: number;
};

let currentStatus: AiStatus = { state: 'idle' };
const listeners = new Set<() => void>();

vi.mock('../_lib/ai-status', () => ({
  getAiStatus: () => currentStatus,
  subscribeAiStatus: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
}));

const themeMock = vi.hoisted(() => ({ toggle: vi.fn() }));
vi.mock('./theme-provider', () => ({
  useElevaTheme: () => ({ theme: 'light', toggle: themeMock.toggle }),
}));

const paletteMock = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('./command-palette', () => ({
  useCommandPalette: () => ({ open: paletteMock.open }),
}));

vi.mock('./notification-bell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock('@/components/shared/provider-selector', () => ({
  ProviderSelector: ({
    value,
    onValueChange,
  }: {
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <button data-testid="provider-selector" onClick={() => onValueChange('openai/gpt-4o')}>
      {value}
    </button>
  ),
}));

const authMock = vi.hoisted(() => ({
  getUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({ auth: authMock }),
}));

import { ElevaHeader } from './header';

function updateStatus(next: AiStatus) {
  currentStatus = next;
  act(() => {
    listeners.forEach((listener) => listener());
  });
}

describe('ElevaHeader', () => {
  beforeEach(() => {
    localStorage.clear();
    authMock.getUser.mockResolvedValue({ data: { user: null } });
    authMock.signOut.mockResolvedValue({ error: null });
    themeMock.toggle.mockReset();
    paletteMock.open.mockReset();
    updateStatus({ state: 'idle' });
  });

  it('renders the search trigger, provider selector and controls', async () => {
    render(<ElevaHeader />);

    expect(screen.getByTestId('eleva-header')).toBeInTheDocument();
    expect(screen.getByText(/Search resumes, jobs, AI commands/)).toBeInTheDocument();
    expect(screen.getByTestId('provider-selector')).toHaveTextContent('__eleva_global_auto__');
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    await waitFor(() => expect(authMock.getUser).toHaveBeenCalled());
  });

  it('opens the command palette from the search trigger and mobile menu', async () => {
    const user = userEvent.setup();
    render(<ElevaHeader />);

    await user.click(screen.getByTestId('command-palette-trigger'));
    await user.click(screen.getByTestId('mobile-menu'));

    expect(paletteMock.open).toHaveBeenCalledTimes(2);
  });

  it('toggles the theme', async () => {
    const user = userEvent.setup();
    render(<ElevaHeader />);

    await user.click(screen.getByTestId('theme-toggle'));

    expect(themeMock.toggle).toHaveBeenCalledTimes(1);
  });

  it('restores and persists the provider selection', async () => {
    localStorage.setItem('eleva-ai-selection', 'anthropic/claude');
    const user = userEvent.setup();
    render(<ElevaHeader />);

    await waitFor(() =>
      expect(screen.getByTestId('provider-selector')).toHaveTextContent('anthropic/claude'),
    );

    await user.click(screen.getByTestId('provider-selector'));

    expect(localStorage.getItem('eleva-ai-selection')).toBe('openai/gpt-4o');
    expect(document.cookie).toContain('openai%2Fgpt-4o');
  });

  it('shows a sign-in link when there is no user', async () => {
    render(<ElevaHeader />);

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/eleva/auth/login',
    );
  });

  it('shows the signed-in menu and signs out', async () => {
    authMock.getUser.mockResolvedValue({
      data: { user: { email: 'ada@example.com' } },
    });
    const user = userEvent.setup();
    render(<ElevaHeader />);

    const avatar = await screen.findByTestId('user-avatar');
    expect(avatar).toHaveTextContent('AD');

    await user.click(avatar);
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/eleva/settings',
    );
    expect(screen.getByRole('link', { name: 'Analytics' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Templates' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(authMock.signOut).toHaveBeenCalled();
  });

  it('renders the AI status pill for each state', async () => {
    const user = userEvent.setup();
    render(<ElevaHeader />);

    expect(screen.getByTestId('ai-status-pill')).toHaveTextContent('AI · Ready');

    updateStatus({ state: 'running', label: 'Tailoring' });
    expect(screen.getByTestId('ai-status-pill')).toHaveTextContent('AI · Tailoring…');

    updateStatus({ state: 'done', task: 'tailor', durationMs: 2_300 });
    expect(screen.getByTestId('ai-status-pill')).toHaveTextContent('AI · ✓ 2s');

    updateStatus({ state: 'error' });
    expect(screen.getByTestId('ai-status-pill')).toHaveTextContent('AI · Failed');

    await user.click(screen.getByTestId('ai-status-pill'));
    expect(screen.getByText('AI execution')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('shows duration and task in the open AI status panel', async () => {
    updateStatus({ state: 'done', label: 'Scored', task: 'ats-score', durationMs: 1_500 });
    const user = userEvent.setup();
    render(<ElevaHeader />);

    await user.click(screen.getByTestId('ai-status-pill'));

    expect(screen.getByText('Scored')).toBeInTheDocument();
    expect(screen.getByText('1.5s')).toBeInTheDocument();
    expect(screen.getByText('ats-score')).toBeInTheDocument();

    await user.click(document.querySelector('.fixed.inset-0') as HTMLElement);
    expect(screen.queryByText('AI execution')).not.toBeInTheDocument();
  });
});
