// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", async () => {
  const React = await import("react");
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
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ href, children, ...rest }: { href?: string; children?: React.ReactNode } & Record<string, unknown>) =>
      React.createElement("a", { href, ...rest }, children),
  };
});

vi.mock("@/app/eleva/_components/workspace-shell", async () => {
  const React = await import("react");
  return {
    WorkspaceShell: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  };
});

vi.mock("@/app/eleva/editor/_components/resume-health", () => ({
  ResumeHealth: () => <div data-testid="health-panel">health-panel</div>,
}));

vi.mock("@/app/eleva/editor/_components/keyword-heatmap", () => ({
  KeywordHeatmap: ({ role }: { role?: string }) => <div data-testid="keywords-panel">keywords:{role}</div>,
}));

vi.mock("@/app/eleva/editor/_components/resume-preview", () => ({
  ResumePreview: ({ data }: { data: { name: string } }) => <div data-testid="preview-panel">preview:{data.name}</div>,
}));

vi.mock("@/app/eleva/editor/_components/bullet-row", async () => {
  const React = await import("react");
  return {
    BulletRow: ({ bullet, onEdit, onRewrite, onAccept, onReject, onDelete }: {
      bullet: { id: string; text: string };
      onEdit: (text: string) => void;
      onRewrite: () => void;
      onAccept: () => void;
      onReject: () => void;
      onDelete: () => void;
    }) => React.createElement("div", { "data-testid": `bullet-${bullet.id}` },
      React.createElement("span", null, bullet.text),
      React.createElement("button", { onClick: () => onEdit(`${bullet.text} edited`) }, `edit-${bullet.id}`),
      React.createElement("button", { onClick: onRewrite }, `rewrite-${bullet.id}`),
      React.createElement("button", { onClick: onAccept }, `accept-${bullet.id}`),
      React.createElement("button", { onClick: onReject }, `reject-${bullet.id}`),
      React.createElement("button", { onClick: onDelete }, `delete-${bullet.id}`),
    ),
  };
});

vi.mock("@/app/eleva/editor/_lib/use-resume-editor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/eleva/editor/_lib/use-resume-editor")>();
  return { ...actual, useResumeEditor: vi.fn() };
});

import { useResumeEditor, type ResumeEditor } from "@/app/eleva/editor/_lib/use-resume-editor";
import { cloneResume, makeEditor } from "@/test/editor-page-test-utils";
import EditorPage from "./page";

const hookMock = vi.mocked(useResumeEditor);

function renderEditor(overrides: Partial<ResumeEditor> = {}) {
  const editor = makeEditor(overrides);
  hookMock.mockReturnValue(editor);
  const view = render(<EditorPage />);
  return { editor, ...view };
}

function resetEditorMocks() {
  hookMock.mockReset();
}

beforeEach(resetEditorMocks);

describe("EditorPage — shell, toolbar and sections", () => {
  it("switches to every section and shows the active section label", async () => {
    const user = userEvent.setup();
    const { editor } = renderEditor();

    for (const id of ['summary', 'experience', 'projects', 'skills', 'education', 'certificates'] as const) {
      await user.click(screen.getByTestId(`section-${id}`));
      expect(editor.setActiveSection).toHaveBeenCalledWith(id);
    }
  });

  it("labels every active section in the editor header", () => {
    for (const [id, name] of [
      ['summary', 'Summary'],
      ['experience', 'Experience'],
      ['projects', 'Projects'],
      ['skills', 'Skills'],
      ['education', 'Education'],
      ['certificates', 'Certificates'],
    ] as const) {
      const { unmount } = renderEditor({ activeSection: id });
      expect(screen.getByText(`Editing · ${name}`)).toBeInTheDocument();
      unmount();
    }
  });

  it("renders section counts, the back link, ATS badge and export control", () => {
    renderEditor({ activeSection: 'skills' });

    expect(screen.getByTestId('editor-back')).toHaveAttribute('href', '/eleva/resumes');
    expect(screen.getByText('ATS')).toBeInTheDocument();
    expect(screen.getByText('96')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export/ })).toBeInTheDocument();
    expect(screen.getByTestId('section-experience')).toHaveTextContent('2');
    expect(screen.getByTestId('section-projects')).toHaveTextContent('2');
    expect(screen.getByTestId('section-skills')).toHaveTextContent('3');
    expect(screen.getByTestId('section-summary')).toHaveTextContent('1');
    expect(screen.getByTestId('section-skills').style.background).toBe('rgb(var(--eleva-muted))');
  });

  it("renders a zero summary count when the summary is empty", () => {
    renderEditor({ data: { ...cloneResume(), summary: '' } });
    expect(screen.getByTestId('section-summary')).toHaveTextContent('0');
  });

  it("edits the resume name through the hook", () => {
    const { editor } = renderEditor();

    fireEvent.change(screen.getByTestId('resume-name-input'), { target: { value: 'New Name' } });

    expect(editor.updateInfoField).toHaveBeenLastCalledWith('name', 'New Name');
  });

  it("renders the hook toast when present", () => {
    renderEditor({ toast: 'All bullets rewritten.' });
    expect(screen.getByText('All bullets rewritten.')).toBeInTheDocument();
  });
});

describe("EditorPage — history and AI actions", () => {
  it("keeps undo/redo disabled when history is empty", () => {
    renderEditor({ canUndo: false, canRedo: false });
    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeDisabled();
    expect(screen.getByTitle('Redo (Ctrl+Shift+Z)')).toBeDisabled();
  });

  it("invokes undo and redo when history is available", async () => {
    const user = userEvent.setup();
    const { editor } = renderEditor({ canUndo: true, canRedo: true });

    await user.click(screen.getByTitle('Undo (Ctrl+Z)'));
    await user.click(screen.getByTitle('Redo (Ctrl+Shift+Z)'));

    expect(editor.undo).toHaveBeenCalledOnce();
    expect(editor.redo).toHaveBeenCalledOnce();
  });

  it("runs optimize-all and reflects the busy state", async () => {
    const user = userEvent.setup();
    const { editor, rerender } = renderEditor();

    await user.click(screen.getByTestId('ai-optimize'));
    expect(editor.handleOptimizeAll).toHaveBeenCalledOnce();

    const busy = makeEditor({ optimizing: true });
    hookMock.mockReturnValue(busy);
    rerender(<EditorPage />);

    const button = screen.getByTestId('ai-optimize');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Optimizing…');
  });
});

describe("EditorPage — summary and right-hand tabs", () => {
  it("edits the summary and forwards toolbar actions", async () => {
    const user = userEvent.setup();
    const { editor } = renderEditor({ activeSection: 'summary' });

    fireEvent.change(screen.getByTestId('summary-editor'), { target: { value: 'A new summary' } });
    expect(editor.updateSummary).toHaveBeenLastCalledWith('A new summary');

    await user.click(screen.getByRole('button', { name: 'Shorten' }));
    expect(editor.handleAIAction).toHaveBeenCalledWith('shorten', editor.data.summary, expect.any(Function));
  });

  it("disables section toolbar actions when there is no text", () => {
    renderEditor({ activeSection: 'summary', data: { ...cloneResume(), summary: '' } });
    expect(screen.getByRole('button', { name: 'Rewrite' })).toBeDisabled();
  });

  it("switches the preview, health and keyword tabs", async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.getByTestId('preview-panel')).toHaveTextContent('preview:Ashish Sharma');

    await user.click(screen.getByRole('button', { name: 'Health' }));
    expect(screen.getByTestId('health-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('preview-panel')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keywords' }));
    expect(screen.getByTestId('keywords-panel')).toHaveTextContent('keywords:Senior Backend Engineer');

    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
  });
});
