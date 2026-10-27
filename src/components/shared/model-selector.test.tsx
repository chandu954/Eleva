// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { pathnameRef } = vi.hoisted(() => ({
  pathnameRef: { current: '/eleva/studio' },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
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

import { ModelSelector } from './model-selector';

const AUTO_KEY = '__eleva_auto__';

function renderSelector(value = AUTO_KEY, isProPlan = false) {
  const onValueChange = vi.fn();
  const utils = render(
    <ModelSelector
      value={value}
      onValueChange={onValueChange}
      isProPlan={isProPlan}
    />,
  );
  return { ...utils, onValueChange };
}

async function openDropdown() {
  const user = userEvent.setup();
  await user.click(screen.getByTestId('model-selector-trigger'));
  expect(screen.getByTestId('model-selector-dropdown')).toBeInTheDocument();
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  pathnameRef.current = '/eleva/studio';
});

describe('ModelSelector', () => {
  it('renders the auto trigger with the task label for the current route', () => {
    renderSelector();

    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('Optimized for Studio Pipeline')).toBeInTheDocument();
    expect(screen.queryByText('Included')).not.toBeInTheDocument();
  });

  it('renders a manual free model with its description and Included badge', () => {
    renderSelector('openrouter/free');

    expect(screen.getByText('GPT OSS 120B')).toBeInTheDocument();
    expect(
      screen.getByText('Best overall for resumes and ATS optimization'),
    ).toBeInTheDocument();
    expect(screen.getByText('Included')).toBeInTheDocument();
    expect(screen.queryByText('Optimized for Studio Pipeline')).not.toBeInTheDocument();
  });

  it('renders a manual pro model with the PRO badge', () => {
    renderSelector('anthropic/claude-sonnet-4.6', true);

    expect(screen.getByText('Claude Sonnet 4.6')).toBeInTheDocument();
    expect(screen.getByText('Highest writing quality and nuanced output')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
  });

  it('falls back to the placeholder for an unknown model id', () => {
    renderSelector('unknown/model');

    expect(screen.getByText('Select model')).toBeInTheDocument();
    expect(screen.getByText('AI Model')).toBeInTheDocument();
  });

  it.each([
    ['/eleva/editor', 'Resume Tailoring'],
    ['/eleva/resumes/123', 'Resume Tailoring'],
    ['/eleva/ats', 'ATS Analysis'],
    ['/eleva/cover-letters', 'Cover Letter Writing'],
    ['/eleva/applications', 'Applications'],
    ['/dashboard', 'General'],
  ])('maps %s to the %s task label', (pathname, label) => {
    pathnameRef.current = pathname;
    renderSelector();

    expect(screen.getByText(`Optimized for ${label}`)).toBeInTheDocument();
  });

  it('opens the dropdown with the auto option, free model groups, and model count', async () => {
    renderSelector();
    await openDropdown();

    expect(screen.getByTestId('model-auto-option')).toBeInTheDocument();
    // "Recommended" appears on both the auto option badge and the group header.
    expect(screen.getAllByText('Recommended').length).toBeGreaterThanOrEqual(2);
    // "Coding"/"Fast" appear on both group headers and model badges.
    expect(screen.getAllByText('Coding').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Fast').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('GPT OSS 120B')).toBeInTheDocument();
    expect(screen.getByText('DeepSeek V3')).toBeInTheDocument();
    expect(screen.getByText('Llama 3.3 70B')).toBeInTheDocument();
    expect(screen.getByText('Gemma 4 31B')).toBeInTheDocument();
    expect(screen.queryByText('Claude Sonnet 4.6')).not.toBeInTheDocument();
    expect(screen.getByText('4 models')).toBeInTheDocument();
  });

  it('lists pro models when the user is on the pro plan', async () => {
    renderSelector(AUTO_KEY, true);
    await openDropdown();

    expect(screen.getByText('Writing')).toBeInTheDocument();
    // "Premium" is both the group header and a badge on its two models.
    expect(screen.getAllByText('Premium').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Gemini 2.5 Pro')).toBeInTheDocument();
    expect(screen.getByText('Claude Sonnet 4.6')).toBeInTheDocument();
    expect(screen.getByText('GPT-5.4')).toBeInTheDocument();
    expect(screen.getByText('7 models')).toBeInTheDocument();
  });

  it('filters models by name and restores the full list when search is cleared', async () => {
    renderSelector();
    const user = await openDropdown();

    await user.type(screen.getByTestId('model-search-input'), 'llama');

    expect(screen.getByText('Llama 3.3 70B')).toBeInTheDocument();
    expect(screen.queryByText('GPT OSS 120B')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ESC' }));

    expect(screen.getByText('GPT OSS 120B')).toBeInTheDocument();
    expect(screen.getByText('Llama 3.3 70B')).toBeInTheDocument();
  });

  it('filters models by description text', async () => {
    renderSelector();
    const user = await openDropdown();

    await user.type(screen.getByTestId('model-search-input'), 'technical resumes');

    expect(screen.getByText('DeepSeek V3')).toBeInTheDocument();
    expect(screen.queryByText('GPT OSS 120B')).not.toBeInTheDocument();
  });

  it('shows an empty state when no models match the search', async () => {
    renderSelector();
    const user = await openDropdown();

    await user.type(screen.getByTestId('model-search-input'), 'zzz-no-such-model');

    expect(screen.getByText(/No models match/)).toBeInTheDocument();
    expect(screen.getByText(/zzz-no-such-model/)).toBeInTheDocument();
  });

  it('selects a free model, notifies the caller, and closes the dropdown', async () => {
    const { onValueChange } = renderSelector();
    const user = await openDropdown();

    await user.click(screen.getByTestId('model-option-openrouter-free'));

    expect(onValueChange).toHaveBeenCalledWith('openrouter/free');
    expect(screen.queryByTestId('model-selector-dropdown')).not.toBeInTheDocument();
  });

  it('selects a pro model for a pro user', async () => {
    const { onValueChange } = renderSelector(AUTO_KEY, true);
    const user = await openDropdown();

    await user.click(screen.getByTestId('model-option-anthropic-claude-sonnet-4-6'));

    expect(onValueChange).toHaveBeenCalledWith('anthropic/claude-sonnet-4.6');
    expect(screen.queryByTestId('model-selector-dropdown')).not.toBeInTheDocument();
  });

  it('selects auto mode and closes the dropdown', async () => {
    const { onValueChange } = renderSelector('openrouter/free');
    const user = await openDropdown();

    await user.click(screen.getByTestId('model-auto-option'));

    expect(onValueChange).toHaveBeenCalledWith(AUTO_KEY);
    expect(screen.queryByTestId('model-selector-dropdown')).not.toBeInTheDocument();
  });

  it('focuses the search field shortly after opening', async () => {
    renderSelector();
    await openDropdown();

    await waitFor(() =>
      expect(screen.getByTestId('model-search-input')).toHaveFocus(),
    );
  });

  it('toggles the dropdown closed when the trigger is clicked again', async () => {
    renderSelector();
    const user = await openDropdown();

    await user.click(screen.getByTestId('model-selector-trigger'));

    expect(screen.queryByTestId('model-selector-dropdown')).not.toBeInTheDocument();
  });

  it('closes the dropdown when clicking outside', async () => {
    renderSelector();
    const user = await openDropdown();

    await user.click(document.body);

    await waitFor(() =>
      expect(screen.queryByTestId('model-selector-dropdown')).not.toBeInTheDocument(),
    );
  });
});
