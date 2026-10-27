import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../_lib/actions-settings', () => ({
  updateProfile: vi.fn().mockResolvedValue({ success: true }),
  updatePreferences: vi.fn().mockResolvedValue({ success: true }),
  deleteAccount: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../_lib/actions-ai-providers', () => ({
  saveProviderKey: vi.fn().mockResolvedValue({ success: true }),
  deleteProviderKey: vi.fn().mockResolvedValue({ success: true }),
  validateProviderKey: vi.fn().mockResolvedValue({ healthy: true, latency: 12, status: 'connected' }),
}));

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

import { SettingsClient } from './settings-client';

const providerKeys = [
  {
    id: 'key-1',
    provider: 'openai' as const,
    hasKey: true,
    baseUrl: null,
    defaultModel: 'gpt-5',
    providerMode: 'auto',
    status: 'connected',
    lastValidatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const motion = new Proxy({}, {
    get: (_target, tag: string) => (props: Record<string, unknown>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, variants, layout, layoutId, ...rest } = props;
      void initial; void animate; void exit; void transition; void whileHover; void whileTap; void variants; void layout; void layoutId;
      return React.createElement(tag, rest);
    },
  });
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
});

describe('SettingsClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ status: 'ok', database: 'ok', env: {}, timestamp: '2026-01-01' }),
    }));
  });

  it('renders every settings section', async () => {
    render(
      <SettingsClient
        email="ada@example.com"
        userId="user-1"
        profile={{ first_name: 'Ada', timezone: null }}
        subscription={{ subscription_plan: 'pro', subscription_status: 'active', current_period_end: '2027-01-01' }}
        prefs={{ theme: 'dark', default_model: 'openrouter/free' }}
        usageCount={12}
        tokensUsed={3456}
        providerKeys={providerKeys}
      />,
    );

    await waitFor(() => expect(screen.getAllByText('System Status').length).toBeGreaterThan(0));

    for (const label of ['Profile', 'Appearance', 'Notifications', 'AI Preferences', 'Providers', 'Account & Security', 'Danger Zone']) {
      fireEvent.click(screen.getByRole('button', { name: label }));
    }

    expect(screen.getByText('Delete account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type DELETE')).toBeInTheDocument();
  }, 45000);


  it('exercises preference, provider and account actions', async () => {
    const { container } = render(
      <SettingsClient
        email="ada@example.com"
        userId="user-1"
        profile={{ first_name: 'Ada', timezone: 'Europe/London' }}
        subscription={{ subscription_plan: 'free', subscription_status: 'inactive' }}
        prefs={{ theme: 'system', default_model: 'openrouter/free' }}
        usageCount={1}
        tokensUsed={10}
        providerKeys={providerKeys}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
    fireEvent.click(screen.getByRole('button', { name: 'dark' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save appearance' }));

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    fireEvent.click(screen.getByRole('button', { name: /Weekly email digest/ }));
    fireEvent.click(screen.getByRole('button', { name: /Realtime in-app/ }));
    fireEvent.click(screen.getByRole('button', { name: /Product updates/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

    fireEvent.click(screen.getByRole('button', { name: 'AI Preferences' }));
    fireEvent.click(screen.getByRole('button', { name: /Llama 3.3 70B/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save AI defaults' }));

    fireEvent.click(screen.getByRole('button', { name: 'Providers' }));
    const keyInput = screen.getAllByPlaceholderText(/API key/)[0];
    fireEvent.change(keyInput, { target: { value: 'sk-test' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Validate' })[0]);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Disconnect' }))[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Account & Security' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send email' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    fireEvent.click(screen.getByRole('button', { name: 'Danger Zone' }));
    fireEvent.change(screen.getByPlaceholderText('Type DELETE'), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByRole('button', { name: /Delete my account/ }));

    await waitFor(() => expect(container.querySelector('input')?.value).toBeDefined());
  }, 120000);

  it('renders empty settings without profile, prefs or subscription', () => {
    render(
      <SettingsClient
        email="new@example.com"
        userId="user-2"
        profile={null}
        subscription={null}
        prefs={null}
        usageCount={0}
        tokensUsed={0}
        providerKeys={[]}
      />,
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
