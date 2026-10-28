import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  getPrompt: vi.fn(() => 'default prompt'),
  setPrompt: vi.fn(),
  resetPrompt: vi.fn(),
  resetAllPrompts: vi.fn(),
  isCustomized: vi.fn(() => false),
  toastSuccess: vi.fn(),
}));

vi.mock('@/hooks/use-custom-prompts', () => ({
  useCustomPrompts: () => ({
    getPrompt: mocks.getPrompt,
    setPrompt: mocks.setPrompt,
    resetPrompt: mocks.resetPrompt,
    resetAllPrompts: mocks.resetAllPrompts,
    isCustomized: mocks.isCustomized,
  }),
  DEFAULT_PROMPTS: {
    aiAssistant: 'default prompt', workExperienceGenerator: 'default prompt',
    workExperienceImprover: 'default prompt', projectGenerator: 'default prompt',
    projectImprover: 'default prompt', textAnalyzer: 'default prompt', resumeFormatter: 'default prompt',
  },
  PROMPT_METADATA: Object.fromEntries([
    ['aiAssistant', 'AI Chat Assistant'], ['workExperienceGenerator', 'Work Experience Generator'],
    ['workExperienceImprover', 'Work Experience Improver'], ['projectGenerator', 'Project Generator'],
    ['projectImprover', 'Project Improver'], ['textAnalyzer', 'Text Analyzer'], ['resumeFormatter', 'Resume Formatter'],
  ].map(([key, name]) => [key, { name, description: `${name} description` }])),
}));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess } }));

import { AiPromptsForm } from './ai-prompts-form';

describe('AiPromptsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isCustomized.mockReturnValue(false);
    mocks.getPrompt.mockReturnValue('default prompt');
  });

  it('expands a prompt, tracks unsaved edits, saves, and disables save after saving', async () => {
    const user = userEvent.setup();
    render(<AiPromptsForm />);
    await user.click(screen.getByRole('button', { name: /AI Chat Assistant/ }));
    const editor = screen.getByRole('textbox');
    expect(screen.getByText('14 characters')).toBeInTheDocument();
    await user.clear(editor);
    await user.type(editor, 'custom instructions');
    expect(screen.getByText('Unsaved')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Save Prompt' });
    expect(save).toBeEnabled();
    await user.click(save);
    expect(mocks.setPrompt).toHaveBeenCalledWith('aiAssistant', 'custom instructions');
    expect(mocks.toastSuccess).toHaveBeenCalledWith('AI Chat Assistant prompt saved');
    expect(save).toBeDisabled();
  });

  it('resets one prompt to its default and removes its unsaved marker', async () => {
    mocks.isCustomized.mockReturnValue(true);
    const user = userEvent.setup();
    render(<AiPromptsForm />);
    await user.click(screen.getByRole('button', { name: /AI Chat Assistant/ }));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'temporary');
    await user.click(screen.getByRole('button', { name: 'Reset to Default' }));
    expect(mocks.resetPrompt).toHaveBeenCalledWith('aiAssistant');
    expect(screen.queryByText('Unsaved')).not.toBeInTheDocument();
    expect(mocks.toastSuccess).toHaveBeenCalledWith('AI Chat Assistant prompt reset to default');
  });

  it('confirms resetting all customized prompts and clears expanded editors', async () => {
    mocks.isCustomized.mockReturnValue(true);
    const user = userEvent.setup();
    render(<AiPromptsForm />);
    expect(screen.getByText('7 prompts customized')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset All' }));
    expect(screen.getByText(/reset all 7 customized prompts/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset All' }));
    expect(mocks.resetAllPrompts).toHaveBeenCalledOnce();
    expect(mocks.toastSuccess).toHaveBeenCalledWith('All prompts reset to defaults');
  });

  it('preserves unsaved edits and their marker when the prompt is collapsed and reopened', async () => {
    const user = userEvent.setup();
    render(<AiPromptsForm />);
    const header = screen.getByRole('button', { name: /AI Chat Assistant/ });
    await user.click(header);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'unsaved' } });
    await user.click(header);
    await user.click(header);
    expect(screen.getByRole('textbox')).toHaveValue('unsaved');
    expect(screen.getByText('Unsaved')).toBeInTheDocument();
  });
});
