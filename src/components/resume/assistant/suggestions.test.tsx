import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/components/ui/tiptap', () => ({
  default: ({ content }: { content: string }) => <span>{content}</span>,
}));

import type { WorkExperience } from '@/lib/types';
import { Suggestion, WholeResumeSuggestion } from './suggestions';

const content: WorkExperience = {
  position: 'Senior Engineer',
  company: 'Acme',
  date: '2024',
  description: ['Shipped a platform'],
} as WorkExperience;

const currentContent: WorkExperience = {
  position: 'Engineer',
  company: 'Acme',
  date: '2023',
  description: ['Maintained a platform'],
} as WorkExperience;

describe('Suggestion', () => {
  it('renders confidence, reason, fabrication risk and attempts', () => {
    render(
      <Suggestion
        type="work_experience"
        content={content as never}
        currentContent={currentContent as never}
        onAccept={() => undefined}
        onReject={() => undefined}
        meta={{
          confidence: 81,
          reason: 'Grounded in your experience',
          fabricationRisk: 'low',
          attempts: [{ attempt: 1, model: 'gpt-4o-mini', status: 'success', latencyMs: 240 }],
        }}
      />,
    );

    expect(screen.getByText('81%')).toBeInTheDocument();
    expect(screen.getByText('Grounded in your experience')).toBeInTheDocument();
    expect(screen.getByText('low')).toBeInTheDocument();
    expect(screen.getByText('Attempt 1 · gpt-4o-mini')).toBeInTheDocument();
    expect(screen.getByText('success · 240ms')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
  });

  it('falls back to an em dash for missing confidence and a default reason', () => {
    render(
      <Suggestion
        type="work_experience"
        content={content as never}
        currentContent={null}
        onAccept={() => undefined}
        onReject={() => undefined}
      />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('AI generated a grounded rewrite')).toBeInTheDocument();
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('accepts a suggestion and swaps to the accepted state', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(
      <Suggestion
        type="work_experience"
        content={content as never}
        currentContent={null}
        onAccept={onAccept}
        onReject={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Accept/i }));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reject/i })).not.toBeInTheDocument();
  });

  it('rejects a suggestion and swaps to the rejected state', async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(
      <Suggestion
        type="work_experience"
        content={content as never}
        currentContent={null}
        onAccept={() => undefined}
        onReject={onReject}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Reject/i }));
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('activates an inline rewrite preview and forwards the mode', async () => {
    const user = userEvent.setup();
    const onModeRewrite = vi.fn();
    render(
      <Suggestion
        type="work_experience"
        content={content as never}
        currentContent={currentContent as never}
        onAccept={() => undefined}
        onReject={() => undefined}
        onModeRewrite={onModeRewrite}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Professional' }));

    expect(onModeRewrite).toHaveBeenCalledWith('professional');
    expect(screen.getByText('Inline Preview')).toBeInTheDocument();
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });
});

describe('WholeResumeSuggestion', () => {
  it('accepts changes without calling back', async () => {
    const user = userEvent.setup();
    render(<WholeResumeSuggestion onReject={() => undefined} />);

    await user.click(screen.getByRole('button', { name: /Keep Changes/i }));
    expect(screen.getByText('Changes Accepted')).toBeInTheDocument();
  });

  it('rejects changes and calls the callback', async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(<WholeResumeSuggestion onReject={onReject} />);

    await user.click(screen.getByRole('button', { name: /Undo Changes/i }));
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Changes Rejected')).toBeInTheDocument();
  });
});
