// @vitest-environment jsdom
import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getChatMock,
  getChatOptions,
  renderChat,
  resetChatMocks,
  resume,
  withinButton,
} from '@/test/chatbot-test-utils';

const chatMock = getChatMock();

beforeEach(resetChatMocks);

describe('ChatBot tools and suggestions', () => {
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
});
