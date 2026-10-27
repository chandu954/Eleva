// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job, Resume } from '@/lib/types';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data';
  content: string;
  toolInvocations?: Array<{
    toolCallId: string;
    toolName: string;
    state: string;
    args: Record<string, unknown>;
  }>;
};

type ChatState = {
  messages: ChatMessage[];
  error?: Error;
  isLoading: boolean;
};

const chatMock = vi.hoisted(() => {
  type HoistedMessage = {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'data';
    content: string;
    toolInvocations?: Array<Record<string, unknown>>;
  };
  type HoistedState = {
    messages: HoistedMessage[];
    error?: Error;
    isLoading: boolean;
  };

  let state: HoistedState = { messages: [], error: undefined, isLoading: false };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const store = {
    options: null as Record<string, unknown> | null,
    append: vi.fn(),
    addToolResult: vi.fn(),
    stop: vi.fn(),
    setMessages: vi.fn(),
    getSnapshot: () => state,
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (partial: Partial<HoistedState>) => {
      state = { ...state, ...partial };
      notify();
    },
    reset: () => {
      state = { messages: [], error: undefined, isLoading: false };
      notify();
    },
  };

  store.append = vi.fn(async (message: { content: string; role: HoistedMessage['role'] }) => {
    const current = state.messages;
    state = {
      ...state,
      messages: [
        ...current,
        { id: `msg-${current.length + 1}`, content: message.content, role: message.role },
      ],
    };
    notify();
  });

  store.setMessages = vi.fn(
    (next: HoistedMessage[] | ((previous: HoistedMessage[]) => HoistedMessage[])) => {
      const messages = typeof next === 'function' ? next(state.messages) : next;
      state = { ...state, messages };
      notify();
    },
  );

  return store;
});

const stickMock = vi.hoisted(() => ({
  isAtBottom: true,
  scrollToBottom: vi.fn(),
}));

type ToolCallOptions = {
  toolCall: { toolName: string; toolCallId: string; args: unknown };
};

type ChatOptions = {
  api: string;
  body: Record<string, unknown>;
  maxSteps: number;
  onResponse: () => void;
  onError: () => void;
  onFinish: () => void;
  onToolCall: (options: ToolCallOptions) => Promise<unknown>;
};

vi.mock('ai/react', async () => {
  const React = await import('react');

  return {
    useChat: (options: ChatOptions) => {
      chatMock.options = options as unknown as Record<string, unknown>;
      const snapshot = React.useSyncExternalStore(
        chatMock.subscribe,
        chatMock.getSnapshot,
        chatMock.getSnapshot,
      );

      return {
        messages: snapshot.messages,
        error: snapshot.error,
        append: chatMock.append,
        isLoading: snapshot.isLoading,
        addToolResult: chatMock.addToolResult,
        stop: chatMock.stop,
        setMessages: chatMock.setMessages,
      };
    },
  };
});

vi.mock('use-stick-to-bottom', async () => {
  const React = await import('react');
  const StickToBottomContext = React.createContext<{
    isAtBottom: boolean;
    scrollToBottom: () => void;
  } | null>(null);

  const StickToBottom = ({ children }: { children: import('react').ReactNode }) =>
    React.createElement(
      StickToBottomContext.Provider,
      { value: { isAtBottom: stickMock.isAtBottom, scrollToBottom: stickMock.scrollToBottom } },
      children,
    );

  const Content = ({ children }: { children: import('react').ReactNode }) =>
    React.createElement('div', null, children);

  return {
    StickToBottom: Object.assign(StickToBottom, { Content }),
    useStickToBottomContext: () => {
      const context = React.useContext(StickToBottomContext);
      if (!context) {
        throw new Error('Missing StickToBottom context');
      }
      return context;
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/hooks/use-api-keys', () => ({
  useApiKeys: () => ({
    apiKeys: [{ service: 'openrouter', key: 'sk-test', addedAt: '2024-01-01' }],
    setApiKeys: vi.fn(),
  }),
  useDefaultModel: () => ({ defaultModel: 'test-model', setDefaultModel: vi.fn() }),
}));

vi.mock('@/hooks/use-custom-prompts', () => ({
  useCustomPrompts: () => ({
    customPrompts: { aiAssistant: 'Be concise' },
    setCustomPrompts: vi.fn(),
  }),
}));

vi.mock('@/components/ui/memoized-markdown', () => ({
  MemoizedMarkdown: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock('@/components/ui/loading-dots', () => ({
  LoadingDots: () => <span>Loading response</span>,
}));

vi.mock('@/components/ui/api-key-error-alert', () => ({
  ApiKeyErrorAlert: ({ error }: { error: unknown }) => (
    <div role="alert">api-error: {error instanceof Error ? error.message : String(error)}</div>
  ),
}));

vi.mock('./suggestion-skeleton', () => ({
  SuggestionSkeleton: () => <div>Loading suggestion</div>,
}));

vi.mock('./suggestions', () => ({
  Suggestion: ({
    type,
    content,
    currentContent,
    onAccept,
    onReject,
    onModeRewrite,
  }: {
    type: string;
    content: unknown;
    currentContent: unknown;
    onAccept: () => void;
    onReject: () => void;
    onModeRewrite?: (mode: string) => void;
  }) => (
    <div
      data-testid="suggestion"
      data-type={type}
      data-content={JSON.stringify(content)}
      data-current={JSON.stringify(currentContent)}
    >
      <button onClick={onAccept}>Accept suggestion</button>
      <button onClick={onReject}>Reject suggestion</button>
      {onModeRewrite ? (
        <button onClick={() => onModeRewrite('professional')}>Rewrite suggestion</button>
      ) : null}
    </div>
  ),
  WholeResumeSuggestion: ({ onReject }: { onReject: () => void }) => (
    <div data-testid="whole-resume-suggestion">
      <button onClick={onReject}>Undo changes</button>
    </div>
  ),
}));

import ChatBot from './chatbot';

const resume: Resume = {
  id: 'resume-1',
  user_id: 'user-1',
  name: 'Ada Resume',
  target_role: 'Staff Engineer',
  is_base_resume: true,
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone_number: '555-0100',
  location: 'London',
  website: 'https://ada.dev',
  linkedin_url: 'https://linkedin.com/in/ada',
  github_url: 'https://github.com/ada',
  work_experience: [
    {
      company: 'Acme',
      position: 'Senior Engineer',
      date: '2023 - Present',
      description: ['Built a platform'],
    },
  ],
  education: [
    { school: 'State University', degree: 'BS', field: 'Computer Science', date: '2020' },
  ],
  skills: [{ category: 'Languages', items: ['TypeScript'] }],
  projects: [
    {
      name: 'Scheduler',
      date: '2022',
      description: ['Built a scheduler'],
      technologies: ['TypeScript'],
    },
  ],
  created_at: '2024-01-01',
  updated_at: '2024-01-02',
  has_cover_letter: false,
};

const job: Job = {
  id: 'job-1',
  user_id: 'user-1',
  company_name: 'Globex',
  position_title: 'Staff Engineer',
  job_url: null,
  description: 'Build things',
  location: 'Remote',
  salary_range: null,
  keywords: ['TypeScript'],
  work_location: 'remote',
  employment_type: 'full_time',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  is_active: true,
};

function configureChat(partial: Partial<ChatState> = {}) {
  chatMock.set({ messages: [], error: undefined, isLoading: false, ...partial });
}

async function renderChat(partial: Partial<ChatState> = {}) {
  configureChat(partial);
  const onResumeChange = vi.fn();
  render(<ChatBot resume={resume} onResumeChange={onResumeChange} job={job} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /eleva/i }));
  return { user, onResumeChange };
}

function getChatOptions(): ChatOptions {
  return chatMock.options as unknown as ChatOptions;
}

beforeEach(() => {
  vi.clearAllMocks();
  chatMock.reset();
  chatMock.options = null;
  stickMock.isAtBottom = true;
});

const assistantMessage: ChatMessage = {
  id: 'assistant-1',
  role: 'assistant',
  content: 'I can help with your resume.',
};

const userMessage: ChatMessage = {
  id: 'user-1',
  role: 'user',
  content: 'Please review my resume.',
};

describe('ChatBot', () => {
  it('renders collapsed with the input and opens to an empty chat with quick suggestions', async () => {
    configureChat();
    render(<ChatBot resume={resume} onResumeChange={vi.fn()} job={job} />);
    const user = userEvent.setup();

    expect(screen.getByPlaceholderText('Ask me anything about your resume...')).toBeInTheDocument();
    expect(screen.queryByText('Try one of these')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /eleva/i }));

    expect(screen.getByText('Try one of these')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Critique my resume' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rate my Resume out of 10' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear chat history/i })).toBeDisabled();
  });

  it('passes the resume, job, model and api key configuration to useChat', () => {
    configureChat();
    render(<ChatBot resume={resume} onResumeChange={vi.fn()} job={job} />);

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

  it('renders in-progress tool invocations and ignores unknown ones', async () => {
    await renderChat({
      messages: [
        {
          id: 'tool-calls',
          role: 'assistant',
          content: '',
          toolInvocations: [
            { toolCallId: 'call-1', toolName: 'getResume', state: 'call', args: { sections: ['all'] } },
            {
              toolCallId: 'call-2',
              toolName: 'modifyWholeResume',
              state: 'partial-call',
              args: {},
            },
            {
              toolCallId: 'call-3',
              toolName: 'suggest_project_improvement',
              state: 'call',
              args: {},
            },
            { toolCallId: 'call-4', toolName: 'displayWeather', state: 'call', args: {} },
            { toolCallId: 'call-5', toolName: 'unknown_tool', state: 'call', args: {} },
            { toolCallId: 'call-6', toolName: 'unknown_tool', state: 'result', args: {} },
            { toolCallId: 'call-7', toolName: 'getResume', state: 'other', args: {} },
          ],
        },
      ],
    });

    expect(screen.getByText('Reading Resume...')).toBeInTheDocument();
    expect(screen.getByText('Preparing resume modifications...')).toBeInTheDocument();
    expect(screen.getByText('Loading suggestion')).toBeInTheDocument();
    expect(screen.getByText('Loading weather...')).toBeInTheDocument();
    expect(screen.queryByText('Read Resume (all) ✅')).not.toBeInTheDocument();
  });

  it('renders each suggestion result, accepts it into the right section, and requests rewrites', async () => {
    const { user, onResumeChange } = await renderChat({
      messages: [
        {
          id: 'suggestions',
          role: 'assistant',
          content: '',
          toolInvocations: [
            {
              toolCallId: 's-1',
              toolName: 'suggest_work_experience_improvement',
              state: 'result',
              args: {
                index: 0,
                improved_experience: { ...resume.work_experience[0], position: 'Staff Engineer' },
              },
            },
            {
              toolCallId: 's-2',
              toolName: 'suggest_project_improvement',
              state: 'result',
              args: {
                index: 0,
                improved_project: { ...resume.projects[0], name: 'Scheduler v2' },
              },
            },
            {
              toolCallId: 's-3',
              toolName: 'suggest_skill_improvement',
              state: 'result',
              args: { index: 0, improved_skill: { category: 'Languages', items: ['TS', 'Go'] } },
            },
            {
              toolCallId: 's-4',
              toolName: 'suggest_education_improvement',
              state: 'result',
              args: {
                index: 0,
                improved_education: { ...resume.education[0], degree: 'BSc' },
              },
            },
          ],
        },
      ],
    });

    const suggestions = screen.getAllByTestId('suggestion');
    expect(suggestions.map((node) => node.getAttribute('data-type'))).toEqual([
      'work_experience',
      'project',
      'skill',
      'education',
    ]);

    for (const suggestion of suggestions) {
      await user.click(
        withinButton(suggestion, 'Accept suggestion'),
      );
    }

    expect(onResumeChange).toHaveBeenCalledWith('work_experience', [
      { ...resume.work_experience[0], position: 'Staff Engineer' },
    ]);
    expect(onResumeChange).toHaveBeenCalledWith('projects', [
      { ...resume.projects[0], name: 'Scheduler v2' },
    ]);
    expect(onResumeChange).toHaveBeenCalledWith('skills', [
      { category: 'Languages', items: ['TS', 'Go'] },
    ]);
    expect(onResumeChange).toHaveBeenCalledWith('education', [
      { ...resume.education[0], degree: 'BSc' },
    ]);

    const toolNames = [
      'suggest_work_experience_improvement',
      'suggest_project_improvement',
      'suggest_skill_improvement',
      'suggest_education_improvement',
    ];
    for (const [index, suggestion] of suggestions.entries()) {
      await user.click(withinButton(suggestion, 'Rewrite suggestion'));

      const rewrite = chatMock.append.mock.calls.at(-1)?.[0] as { content: string };
      expect(rewrite.content).toContain(`Tool: ${toolNames[index]}`);
      expect(rewrite.content).toContain('professional mode');
      expect(rewrite.content).toContain('Index: 0');
    }

    expect(chatMock.append).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'user' }),
    );
  });

  it('restores the original resume when a whole-resume modification is undone', async () => {
    const { user, onResumeChange } = await renderChat();

    await act(async () => {
      await getChatOptions().onToolCall({
        toolCall: {
          toolName: 'modifyWholeResume',
          toolCallId: 'whole-1',
          args: {
            basic_info: { first_name: 'Grace' },
            skills: [{ category: 'Languages', items: ['Go'] }],
          },
        },
      });
    });

    expect(onResumeChange).toHaveBeenCalledWith('first_name', 'Grace');
    expect(onResumeChange).toHaveBeenCalledWith('skills', [
      { category: 'Languages', items: ['Go'] },
    ]);
    expect(chatMock.addToolResult).toHaveBeenCalledWith({
      toolCallId: 'whole-1',
      result: { success: true },
    });

    act(() => {
      chatMock.set({
        messages: [
          {
            id: 'whole-result',
            role: 'assistant',
            content: '',
            toolInvocations: [
              {
                toolCallId: 'whole-1',
                toolName: 'modifyWholeResume',
                state: 'result',
                args: {},
              },
            ],
          },
        ],
      });
    });
    onResumeChange.mockClear();

    expect(screen.getByTestId('whole-resume-suggestion')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo changes' }));

    expect(onResumeChange).toHaveBeenCalledWith('first_name', 'Ada');
    expect(onResumeChange).toHaveBeenCalledWith('skills', resume.skills);
    expect(onResumeChange).toHaveBeenCalledWith('work_experience', resume.work_experience);
  });

  it('answers getResume tool calls for all and selected sections', async () => {
    await renderChat();

    let result: unknown;
    await act(async () => {
      result = await getChatOptions().onToolCall({
        toolCall: {
          toolName: 'getResume',
          toolCallId: 'get-all',
          args: { sections: ['all'] },
        },
      });
    });

    expect(result).toMatchObject({
      personal_info: { first_name: 'Ada', email: 'ada@example.com' },
      work_experience: resume.work_experience,
      education: resume.education,
      skills: resume.skills,
      projects: resume.projects,
      target_role: 'Staff Engineer',
    });
    expect(chatMock.addToolResult).toHaveBeenCalledWith({
      toolCallId: 'get-all',
      result,
    });

    await act(async () => {
      result = await getChatOptions().onToolCall({
        toolCall: {
          toolName: 'getResume',
          toolCallId: 'get-some',
          args: { sections: ['skills'] },
        },
      });
    });

    expect(result).toEqual({ skills: resume.skills });
    expect(chatMock.addToolResult).toHaveBeenLastCalledWith({
      toolCallId: 'get-some',
      result: { skills: resume.skills },
    });
  });

  it('passes through improvement tool arguments and ignores unknown tools', async () => {
    await renderChat();
    const toolNames = [
      'suggest_work_experience_improvement',
      'suggest_project_improvement',
      'suggest_skill_improvement',
      'suggest_education_improvement',
    ];

    for (const [index, toolName] of toolNames.entries()) {
      const args = { index, improved: { value: toolName } };
      let result: unknown;
      await act(async () => {
        result = await getChatOptions().onToolCall({
          toolCall: { toolName, toolCallId: `${toolName}-${index}`, args },
        });
      });
      expect(result).toBe(args);
    }

    let result: unknown;
    await act(async () => {
      result = await getChatOptions().onToolCall({
        toolCall: { toolName: 'unknown_tool', toolCallId: 'unknown-1', args: {} },
      });
    });
    expect(result).toBeUndefined();
    expect(chatMock.addToolResult).not.toHaveBeenCalled();
  });

  it('renders the completed getResume result bubble', async () => {
    await renderChat({
      messages: [
        {
          id: 'get-resume-result',
          role: 'assistant',
          content: '',
          toolInvocations: [
            {
              toolCallId: 'call-resume',
              toolName: 'getResume',
              state: 'result',
              args: { sections: ['skills', 'projects'] },
            },
          ],
        },
      ],
    });

    expect(screen.getByText('Read Resume (skills, projects) ✅')).toBeInTheDocument();
  });

  it('shows the dedicated rate-limit message', async () => {
    await renderChat({ error: new Error('Rate limit exceeded. Try again later.') });

    expect(
      screen.getByText("You've used all your available messages. Please try again after:"),
    ).toBeInTheDocument();
  });

  it('renders the api key error alert for other failures', async () => {
    await renderChat({ error: new Error('OpenAI API key not found') });

    expect(screen.getByRole('alert')).toHaveTextContent('api-error: OpenAI API key not found');
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

function withinButton(container: HTMLElement, name: string): HTMLElement {
  const button = Array.from(container.querySelectorAll('button')).find(
    (candidate) => candidate.textContent === name,
  );
  if (!button) {
    throw new Error(`Button ${name} not found`);
  }
  return button;
}
