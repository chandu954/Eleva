// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  usePathname: () => '/eleva/studio',
}));

import { ProviderSelector } from './provider-selector';
import { PROVIDER_DEFINITIONS } from '@/lib/ai/provider/registry';

const openai = PROVIDER_DEFINITIONS.find((provider) => provider.id === 'openai')!;
const openaiModel = openai.models[0]!;

function renderSelector(value = '__eleva_global_auto__') {
  const onValueChange = vi.fn();
  const utils = render(
    <ProviderSelector
      value={value}
      onValueChange={onValueChange}
      connectedProviders={['openai', 'openrouter']}
    />,
  );
  return { ...utils, onValueChange };
}

async function openDropdown() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /Best provider for Studio Pipeline/i }));
  return user;
}

describe('ProviderSelector', () => {
  it('renders the global auto trigger with the task label', () => {
    renderSelector();
    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getByText('Best provider for Studio Pipeline')).toBeInTheDocument();
  });

  it('renders a manual selection with the provider and model names', () => {
    renderSelector(`openai:${openaiModel.id}`);
    expect(screen.getByText(`OpenAI → ${openaiModel.displayName}`)).toBeInTheDocument();
  });

  it('renders provider-auto selection state', () => {
    renderSelector('openai:__provider_auto__');
    expect(screen.getByText('OpenAI → Auto')).toBeInTheDocument();
    expect(screen.getByText('Auto model within OpenAI')).toBeInTheDocument();
  });

  it('falls back to the global auto label for an unknown encoded value', () => {
    renderSelector('garbage');
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  it('opens the provider list, marks connected providers, and selects global auto', async () => {
    const { onValueChange } = renderSelector();
    const user = await openDropdown();

    expect(screen.getByText('Eleva automatically picks the best provider and model for your task')).toBeInTheDocument();
    expect(screen.getAllByText('Connected').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Eleva automatically picks/i }));
    expect(onValueChange).toHaveBeenCalledWith('__eleva_global_auto__');
  });

  it('drills into a provider, selects provider-auto, then returns to the provider list', async () => {
    const { onValueChange } = renderSelector();
    const user = await openDropdown();

    await user.click(screen.getByRole('button', { name: new RegExp(openai.name) }));
    expect(screen.getByPlaceholderText('Search models...')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Provider Auto/i }));
    expect(onValueChange).toHaveBeenCalledWith('openai:__provider_auto__');

    await openDropdown();
    await user.click(screen.getByRole('button', { name: new RegExp(openai.name) }));
    await user.click(screen.getByRole('button', { name: 'Providers' }));
    expect(screen.getByPlaceholderText('Search providers...')).toBeInTheDocument();
  });

  it('selects a specific model and encodes the provider/model pair', async () => {
    const { onValueChange } = renderSelector();
    const user = await openDropdown();

    await user.click(screen.getByRole('button', { name: new RegExp(openai.name) }));
    await user.click(screen.getAllByRole('button', { name: new RegExp(openaiModel.displayName) })[0]!);

    expect(onValueChange).toHaveBeenCalledWith(`openai:${openaiModel.id}`);
  });

  it('filters providers by search text', async () => {
    renderSelector();
    const user = await openDropdown();

    const search = screen.getByPlaceholderText('Search providers...');
    await user.type(search, 'anthropic');

    expect(screen.getByText('Anthropic Claude')).toBeInTheDocument();
    expect(screen.queryByText('OpenAI')).not.toBeInTheDocument();
  });

  it('filters models within the selected provider', async () => {
    renderSelector();
    const user = await openDropdown();

    await user.click(screen.getByRole('button', { name: new RegExp(openai.name) }));
    const search = screen.getByPlaceholderText('Search models...');
    await user.type(search, 'zzz-no-such-model');

    expect(screen.queryByRole('button', { name: new RegExp(openaiModel.displayName) })).not.toBeInTheDocument();
  });

  it('handles a global model search across providers', async () => {
    renderSelector();
    const user = await openDropdown();

    await user.type(screen.getByPlaceholderText('Search providers...'), openaiModel.displayName);

    expect(screen.getByText(openaiModel.displayName)).toBeInTheDocument();
  });

  it('closes the dropdown when clicking outside', async () => {
    renderSelector();
    const user = await openDropdown();

    expect(screen.getByPlaceholderText('Search providers...')).toBeInTheDocument();
    await user.click(document.body);
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('Search providers...')).not.toBeInTheDocument(),
    );
  });

  it('ignores model selection when no provider has been chosen', async () => {
    const { onValueChange } = renderSelector('openai:__provider_auto__');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /OpenAI → Auto/i }));
    expect(screen.getByPlaceholderText('Search models...')).toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
