import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({ setDefaultModel: vi.fn() }));
vi.mock('@/hooks/use-api-keys', () => ({
  useApiKeys: () => ({ apiKeys: [{ service: 'openrouter', key: 'key' }] }),
  useDefaultModel: () => ({ defaultModel: '', setDefaultModel: hooks.setDefaultModel }),
}));
vi.mock('@/components/auth/logout-button', () => ({ LogoutButton: ({ className }: { className?: string }) => <button className={className}>Log out</button> }));
vi.mock('@/components/settings/settings-button', () => ({ SettingsButton: ({ onAllowedNavigation }: { onAllowedNavigation?: () => void }) => <button onClick={onAllowedNavigation}>Settings</button> }));
vi.mock('@/components/settings/pro-upgrade-button', () => ({ ProUpgradeButton: () => <button>Upgrade</button> }));
vi.mock('@/components/trial/trial-start-button', () => ({ TrialStartButton: () => <button>Start trial</button> }));
vi.mock('@/components/ui/logo', () => ({ Logo: () => <div>Eleva</div> }));
vi.mock('./page-title', () => ({ PageTitle: () => <span>Dashboard</span> }));
vi.mock('@/components/shared/model-selector', () => ({ ModelSelector: ({ onValueChange }: { onValueChange: (model: string) => void }) => <button onClick={() => onValueChange('openrouter/free')}>Choose model</button> }));

import { AppHeader } from './app-header';

describe('AppHeader', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders supplied navigation and initializes a default model once', () => {
    render(<AppHeader isProPlan><span>Custom nav</span></AppHeader>);
    expect(screen.getByText('Custom nav')).toBeInTheDocument();
    expect(hooks.setDefaultModel).toHaveBeenCalledWith('openrouter/free');
  });

  it('renders upgrade and model controls and opens the responsive menu', () => {
    const { container } = render(<AppHeader showUpgradeButton upgradeButtonVariant="trial" />);
    expect(screen.getAllByText('Start trial').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Choose model' }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Choose model' })[0]);
    expect(hooks.setDefaultModel).toHaveBeenCalledWith('openrouter/free');

    const menuTrigger = container.querySelector('button.md\\:hidden');
    expect(menuTrigger).not.toBeNull();
    fireEvent.click(menuTrigger!);
    expect(screen.getByRole('heading', { name: 'Menu' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  });
});
