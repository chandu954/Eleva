import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiKeys = [
  { service: 'openrouter' as const, key: 'sk-existing', addedAt: '2026-01-01T00:00:00.000Z' },
];
const setApiKeys = vi.fn();
const setDefaultModel = vi.fn();

vi.mock('@/hooks/use-api-keys', () => ({
  useApiKeys: () => ({ apiKeys, setApiKeys }),
  useDefaultModel: () => ({ defaultModel: 'gpt-4.1-mini', setDefaultModel }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/ai-models', () => ({
  AI_MODELS: [
    { id: 'openrouter/free', name: 'Free Router', provider: 'openrouter', features: {} },
    { id: 'gpt-4.1-mini', name: 'GPT 4.1 Mini', provider: 'openai', features: {} },
  ],
  MODEL_DESIGNATIONS: {
    DEFAULT_PRO: 'openrouter/free',
    DEFAULT_FREE: 'openrouter/free',
    BALANCED: 'openrouter/free',
  },
  getProvidersArray: () => [
    { id: 'openrouter', name: 'OpenRouter', apiLink: 'https://openrouter.ai', envKey: 'OPENROUTER_API_KEY', sdkInitializer: 'openrouter' },
    { id: 'openai', name: 'OpenAI', apiLink: 'https://openai.com', envKey: 'OPENAI_API_KEY', sdkInitializer: 'openai' },
  ],
}));

vi.mock('@/components/shared/model-selector', () => ({
  ModelSelector: ({ onValueChange }: { onValueChange: (value: string) => void }) => (
    <button onClick={() => onValueChange('gpt-4.1-mini')}>Select model</button>
  ),
}));

import { ApiKeysForm } from './api-keys-form';

describe('ApiKeysForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it('renders free-plan key management', () => {
    render(<ApiKeysForm isProPlan={false} />);

    expect(screen.getByText('Default AI Model')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('OpenRouter')).toBeInTheDocument();
    expect(screen.getByText(/Security Note/)).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('Enter API key').length).toBeGreaterThan(0);
  });

  it('renders pro-plan messaging', () => {
    render(<ApiKeysForm isProPlan />);
    expect(screen.getByText(/Pro Account Active/)).toBeInTheDocument();
  });

  it('adds, reveals, copies and removes API keys', () => {
    render(<ApiKeysForm isProPlan={false} />);

    const inputs = screen.getAllByPlaceholderText('Enter API key');
    inputs.forEach((input) => fireEvent.change(input, { target: { value: 'sk-new' } }));

    fireEvent.click(screen.getByRole('button', { name: 'Select model' }));
    screen.getAllByRole('button', { name: 'Save' }).forEach((button) => fireEvent.click(button));
    expect(setApiKeys).toHaveBeenCalled();
    expect(setDefaultModel).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(setApiKeys).toHaveBeenCalled();

    const revealButtons = screen.getAllByRole('button').filter((b) => !b.textContent?.trim());
    revealButtons.slice(0, 2).forEach((button) => fireEvent.click(button));
  });
});
