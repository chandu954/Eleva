// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { Job, Resume } from '@/lib/types';

export type ChatMessage = {
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

export type ChatState = {
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

export function getChatMock() {
  return chatMock;
}

export function getStickMock() {
  return stickMock;
}

type ToolCallOptions = {
  toolCall: { toolName: string; toolCallId: string; args: unknown };
};

export type ChatOptions = {
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

vi.mock('@/components/resume/assistant/suggestion-skeleton', () => ({
  SuggestionSkeleton: () => <div>Loading suggestion</div>,
}));

vi.mock('@/components/resume/assistant/suggestions', () => ({
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

import ChatBot from '@/components/resume/assistant/chatbot';
export { ChatBot };

export const resume: Resume = {
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

export const job: Job = {
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

export function configureChat(partial: Partial<ChatState> = {}) {
  chatMock.set({ messages: [], error: undefined, isLoading: false, ...partial });
}

export async function renderChat(partial: Partial<ChatState> = {}, open = true) {
  configureChat(partial);
  const onResumeChange = vi.fn();
  render(<ChatBot resume={resume} onResumeChange={onResumeChange} job={job} />);
  const user = userEvent.setup();
  if (open) {
    await user.click(screen.getByRole('button', { name: /eleva/i }));
  }
  return { user, onResumeChange };
}

export function getChatOptions(): ChatOptions {
  return chatMock.options as unknown as ChatOptions;
}

export function resetChatMocks() {
  vi.clearAllMocks();
  chatMock.reset();
  chatMock.options = null;
  stickMock.isAtBottom = true;
}

export const assistantMessage: ChatMessage = {
  id: 'assistant-1',
  role: 'assistant',
  content: 'I can help with your resume.',
};

export const userMessage: ChatMessage = {
  id: 'user-1',
  role: 'user',
  content: 'Please review my resume.',
};


export function withinButton(container: HTMLElement, name: string): HTMLElement {
  const button = Array.from(container.querySelectorAll('button')).find(
    (candidate) => candidate.textContent === name,
  );
  if (!button) {
    throw new Error(`Button ${name} not found`);
  }
  return button;
}
