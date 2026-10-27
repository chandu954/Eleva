// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy({}, {
    get: (_target, tag: string) => {
      if (!cache.has(tag)) {
        cache.set(tag, (props: Record<string, unknown>) => {
          const { initial, animate, exit, transition, whileHover, whileTap, variants, layout, layoutId, ...rest } = props;
          void initial; void animate; void exit; void transition; void whileHover; void whileTap;
          void variants; void layout; void layoutId;
          return React.createElement(tag, rest);
        });
      }
      return cache.get(tag);
    },
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const streamMock = vi.hoisted(() => vi.fn());

vi.mock('../_lib/eleva-client', () => ({
  streamElevaChat: streamMock,
}));

import { ElevaCopilot } from './copilot';

type ChatEvent =
  | { type: 'text-delta'; delta: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args?: unknown }
  | { type: 'tool-result'; toolCallId: string; result?: unknown }
  | { type: 'finish' };

function streamOf(events: ChatEvent[]) {
  return async function* () {
    for (const event of events) yield event;
  };
}

async function openCopilot() {
  const user = userEvent.setup();
  render(<ElevaCopilot />);
  await user.click(screen.getByTestId('copilot-trigger'));
  return user;
}

describe('ElevaCopilot', () => {
  beforeEach(() => {
    streamMock.mockReset();
    Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
  });

  it('toggles the panel and renders the seeded greeting', async () => {
    const user = await openCopilot();

    expect(screen.getByTestId('copilot-panel')).toBeInTheDocument();
    expect(screen.getByText(/I'm your Eleva copilot/)).toBeInTheDocument();
    expect(screen.getByText('Online · streaming with tools')).toBeInTheDocument();
    expect(screen.getByTestId('copilot-send')).toBeDisabled();

    await user.click(screen.getByTestId('copilot-trigger'));

    expect(screen.queryByTestId('copilot-panel')).not.toBeInTheDocument();
  });

  it('streams text, tool calls and tool results for a typed prompt', async () => {
    streamMock.mockImplementation(streamOf([
      { type: 'text-delta', delta: 'Here is ' },
      { type: 'text-delta', delta: 'your rewrite.' },
      { type: 'tool-call', toolCallId: 't1', toolName: 'rewrite_bullet', args: { text: 'Built API' } },
      { type: 'tool-result', toolCallId: 't1', result: { text: 'Built the pricing API' } },
      { type: 'tool-result', toolCallId: 'missing', result: null },
      { type: 'tool-call', toolCallId: 't2', toolName: 'custom_tool' },
      { type: 'finish' },
    ]));

    const user = await openCopilot();
    const input = screen.getByTestId('copilot-input');
    await user.type(input, 'Rewrite my bullet');
    await user.click(screen.getByTestId('copilot-send'));

    await waitFor(() => expect(screen.getByText('Here is your rewrite.')).toBeInTheDocument());
    expect(screen.getByText('Rewrite my bullet')).toBeInTheDocument();
    expect(screen.getByText('Rewriting bullet')).toBeInTheDocument();
    expect(screen.getByText('· done')).toBeInTheDocument();
    expect(screen.getByText('custom_tool')).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(streamMock).toHaveBeenCalledTimes(1);

    const [history, signal] = streamMock.mock.calls[0];
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(history).toEqual([
      expect.objectContaining({ role: 'assistant' }),
      { role: 'user', content: 'Rewrite my bullet' },
    ]);
  });

  it('sends a suggestion and labels the ATS and cover-letter tools', async () => {
    streamMock.mockImplementation(streamOf([
      { type: 'tool-call', toolCallId: 'a', toolName: 'score_ats' },
      { type: 'tool-call', toolCallId: 'b', toolName: 'draft_cover_letter' },
      { type: 'finish' },
    ]));

    const user = await openCopilot();
    await user.click(screen.getByText(/Score my resume against a JD/));

    await waitFor(() => expect(screen.getByText('Scoring against JD')).toBeInTheDocument());
    expect(screen.getByText('Drafting cover letter')).toBeInTheDocument();
    expect(streamMock.mock.calls[0][0]).toEqual([
      expect.objectContaining({ role: 'assistant' }),
      { role: 'user', content: 'Score my resume against a JD' },
    ]);
  });

  it('sends on Enter but not on Shift+Enter', async () => {
    streamMock.mockImplementation(streamOf([{ type: 'finish' }]));
    render(<ElevaCopilot />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('copilot-trigger'));

    const input = screen.getByTestId('copilot-input');
    fireEvent.change(input, { target: { value: 'Enter prompt' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(streamMock).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
  });

  it('ignores whitespace-only prompts', async () => {
    const user = await openCopilot();

    await user.type(screen.getByTestId('copilot-input'), '   ');
    expect(screen.getByTestId('copilot-send')).toBeDisabled();

    await user.click(screen.getByTestId('copilot-send'));
    expect(streamMock).not.toHaveBeenCalled();
  });

  it('shows the thinking state and disables controls while streaming', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    streamMock.mockImplementation(async function* () {
      yield { type: 'text-delta', delta: 'Partial answer' };
      await gate;
      yield { type: 'finish' };
    });

    const user = await openCopilot();
    await user.type(screen.getByTestId('copilot-input'), 'Slow prompt');
    await user.click(screen.getByTestId('copilot-send'));

    await waitFor(() => expect(screen.getByText('Partial answer')).toBeInTheDocument());
    expect(screen.getByText('Thinking…')).toBeInTheDocument();
    expect(screen.getByTestId('copilot-input')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Rewrite: Built the pricing API/ })).toBeDisabled();

    await act(async () => {
      release();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByText('Online · streaming with tools')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('copilot-input')).not.toBeDisabled();
  });

  it('recovers from stream failures', async () => {
    streamMock.mockImplementation(async function* () {
      yield { type: 'text-delta', delta: 'Before the error' };
      throw new Error('network down');
    });

    const user = await openCopilot();
    await user.type(screen.getByTestId('copilot-input'), 'Will fail');
    await user.click(screen.getByTestId('copilot-send'));

    await waitFor(() =>
      expect(screen.getByText('Online · streaming with tools')).toBeInTheDocument(),
    );
    expect(screen.getByText('Before the error')).toBeInTheDocument();
    expect(screen.getByTestId('copilot-input')).not.toBeDisabled();
  });

  it('aborts an in-flight stream when unmounted', async () => {
    let capturedSignal: AbortSignal | undefined;
    streamMock.mockImplementation(async function* (_history: unknown, signal: AbortSignal) {
      capturedSignal = signal;
      yield { type: 'text-delta', delta: 'Working' };
      await new Promise<void>((resolve) => {
        signal.addEventListener('abort', () => resolve(), { once: true });
      });
      yield { type: 'finish' };
    });

    const user = userEvent.setup();
    const { unmount } = render(<ElevaCopilot />);
    await user.click(screen.getByTestId('copilot-trigger'));
    await user.type(screen.getByTestId('copilot-input'), 'Abort me');
    await user.click(screen.getByTestId('copilot-send'));

    await waitFor(() => expect(screen.getByText('Working')).toBeInTheDocument());
    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });
});
