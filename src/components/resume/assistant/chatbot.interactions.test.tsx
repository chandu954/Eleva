// @vitest-environment jsdom
import { act, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  assistantMessage,
  getChatMock,
  getChatOptions,
  job,
  renderChat,
  resetChatMocks,
  resume,
  getStickMock,
  userMessage,
} from '@/test/chatbot-test-utils';

const chatMock = getChatMock();
const stickMock = getStickMock();

beforeEach(resetChatMocks);

describe('ChatBot interactions', () => {
  it('renders collapsed with the input and opens to an empty chat with quick suggestions', async () => {
    const { user } = await renderChat({}, false);

    expect(screen.getByPlaceholderText('Ask me anything about your resume...')).toBeInTheDocument();
    expect(screen.queryByText('Try one of these')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /eleva/i }));

    expect(screen.getByText('Try one of these')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Critique my resume' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rate my Resume out of 10' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear chat history/i })).toBeDisabled();
  });

  it('passes the resume, job, model and api key configuration to useChat', async () => {
    await renderChat({}, false);

    const options = getChatOptions();
    expect(options.api).toBe('/api/chat');
    expect(options.maxSteps).toBe(5);
    expect(options.body).toMatchObject({
      target_role: 'Staff Engineer',
      resume,
      job,
      config: {
        model: 'test-model',
        apiKeys: [{ service: 'openrouter', key: 'sk-test', addedAt: '2024-01-01' }],
        customPrompts: { aiAssistant: 'Be concise' },
      },
    });
  });

  it('appends a quick suggestion and shows then hides the loading indicator', async () => {
    const { user } = await renderChat();

    await user.click(screen.getByRole('button', { name: 'Critique my resume' }));

    expect(chatMock.append).toHaveBeenCalledWith({
      content: 'Critique my resume',
      role: 'user',
    });
    expect(screen.getByText('Critique my resume')).toBeInTheDocument();
    expect(screen.getByText('Loading response')).toBeInTheDocument();

    act(() => {
      getChatOptions().onResponse();
    });

    await waitFor(() => expect(screen.queryByText('Loading response')).not.toBeInTheDocument());
  });

  it('submits a typed message with Enter and clears the textarea', async () => {
    const { user } = await renderChat();
    const input = screen.getByPlaceholderText('Ask me anything about your resume...');

    await user.type(input, '  Improve my summary  ');
    await user.keyboard('{Enter}');

    expect(chatMock.append).toHaveBeenCalledWith({
      content: 'Improve my summary',
      role: 'user',
    });
    expect(input).toHaveValue('');
  });

  it('turns the submit button into a stop control while a response is loading', async () => {
    const { user } = await renderChat({ isLoading: true });
    const form = document.querySelector('form');
    const button = form?.querySelector('button');

    expect(button).toBeTruthy();
    await user.click(button as HTMLElement);

    expect(chatMock.stop).toHaveBeenCalledTimes(1);
  });

  it('renders assistant and user messages', async () => {
    await renderChat({ messages: [assistantMessage, userMessage] });

    expect(screen.getByText('I can help with your resume.')).toBeInTheDocument();
    expect(screen.getByText('Please review my resume.')).toBeInTheDocument();
    expect(screen.queryByText('Try one of these')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Delete message' })).toHaveLength(2);
  });

  it('shows the loading indicator for a pending assistant response', async () => {
    await renderChat({ messages: [assistantMessage], isLoading: true });

    expect(screen.getByText('Loading response')).toBeInTheDocument();

    act(() => {
      getChatOptions().onFinish();
      chatMock.set({ isLoading: false });
    });

    await waitFor(() => expect(screen.queryByText('Loading response')).not.toBeInTheDocument());
  });

  it('deletes an individual message', async () => {
    const { user } = await renderChat({ messages: [assistantMessage, userMessage] });

    await user.click(screen.getAllByRole('button', { name: 'Delete message' })[0]);

    expect(chatMock.setMessages).toHaveBeenCalledWith([userMessage]);
    expect(screen.queryByText('I can help with your resume.')).not.toBeInTheDocument();
    expect(screen.getByText('Please review my resume.')).toBeInTheDocument();
  });

  it('edits a message and saves the new content', async () => {
    const { user } = await renderChat({ messages: [assistantMessage] });

    await user.click(screen.getByRole('button', { name: 'Edit message' }));
    const editor = screen.getByDisplayValue('I can help with your resume.');
    await user.clear(editor);
    await user.type(editor, 'Updated guidance');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(chatMock.setMessages).toHaveBeenCalledWith([
      { ...assistantMessage, content: 'Updated guidance' },
    ]);
    expect(screen.getByText('Updated guidance')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('clears the whole chat after confirmation and shows quick suggestions again', async () => {
    const { user } = await renderChat({ messages: [assistantMessage, userMessage] });

    await user.click(screen.getByRole('button', { name: /clear chat history/i }));
    expect(screen.getByText(/remove all messages and reset the chat/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear Chat' }));

    expect(chatMock.setMessages).toHaveBeenCalledWith([]);
    expect(screen.queryByText('I can help with your resume.')).not.toBeInTheDocument();
    expect(screen.getByText('Try one of these')).toBeInTheDocument();
  });

  it('shows a scroll-to-bottom control when scrolled away and scrolls on click', async () => {
    stickMock.isAtBottom = false;
    const { user } = await renderChat({ messages: [assistantMessage] });

    const scrollButtons = screen.getAllByRole('button');
    const scrollButton = scrollButtons.find((button) => button.className.includes('rounded-full'));
    expect(scrollButton).toBeDefined();

    await user.click(scrollButton as HTMLElement);
    expect(stickMock.scrollToBottom).toHaveBeenCalledTimes(1);
  });
});
