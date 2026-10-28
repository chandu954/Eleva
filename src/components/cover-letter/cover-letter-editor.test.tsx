import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const chain = {
    focus: vi.fn(), toggleBold: vi.fn(), toggleItalic: vi.fn(), toggleUnderline: vi.fn(),
    toggleStrike: vi.fn(), setTextAlign: vi.fn(), toggleHeading: vi.fn(), run: vi.fn(),
  };
  for (const method of Object.values(chain)) method.mockReturnThis();
  const editor = {
    getHTML: vi.fn(() => '<p>current content</p>'),
    isActive: vi.fn(() => false),
    chain: vi.fn(() => chain),
    commands: { setContent: vi.fn() },
    destroy: vi.fn(),
  };
  return { chain, editor, config: undefined as unknown as { onUpdate: (value: { editor: typeof editor }) => void } };
});
vi.mock('@tiptap/react', () => ({
  useEditor: (config: typeof mocks.config) => { mocks.config = config; return mocks.editor; },
  EditorContent: () => <div data-testid="editor-content" />,
  BubbleMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@tiptap/starter-kit', () => ({ default: {} }));
vi.mock('@tiptap/extension-underline', () => ({ default: {} }));
vi.mock('@tiptap/extension-text-align', () => ({ default: { configure: vi.fn(() => ({})) } }));

import CoverLetterEditor from './cover-letter-editor';

describe('CoverLetterEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chain.focus.mockReturnThis();
    for (const method of Object.values(mocks.chain)) method.mockReturnThis();
  });

  it('renders editor content, syncs incoming content, and notifies changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(<CoverLetterEditor initialData={{ content: '<p>Initial</p>' }} onChange={onChange} containerWidth={408} />);
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    expect(mocks.editor.commands.setContent).toHaveBeenCalledWith('<p>Initial</p>');

    rerender(<CoverLetterEditor initialData={{ content: '<p>Updated</p>' }} onChange={onChange} containerWidth={816} isPrintVersion />);
    expect(mocks.editor.commands.setContent).toHaveBeenCalledWith('<p>Updated</p>');
    mocks.config.onUpdate({ editor: mocks.editor });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ content: '<p>current content</p>' }));
  });

  it('wires text style, alignment and heading toolbar commands', () => {
    render(<CoverLetterEditor initialData={{}} containerWidth={816} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => fireEvent.click(button));

    expect(mocks.chain.toggleBold).toHaveBeenCalledOnce();
    expect(mocks.chain.toggleItalic).toHaveBeenCalledOnce();
    expect(mocks.chain.toggleUnderline).toHaveBeenCalledOnce();
    expect(mocks.chain.toggleStrike).toHaveBeenCalledOnce();
    expect(mocks.chain.setTextAlign).toHaveBeenCalledTimes(3);
    expect(mocks.chain.toggleHeading).toHaveBeenCalledWith({ level: 1 });
    expect(mocks.chain.toggleHeading).toHaveBeenCalledWith({ level: 2 });
  });

  it('destroys the editor on unmount', () => {
    const { unmount } = render(<CoverLetterEditor initialData={{}} containerWidth={600} />);
    unmount();
    expect(mocks.editor.destroy).toHaveBeenCalled();
  });
});
