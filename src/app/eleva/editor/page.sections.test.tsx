// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

describe("EditorPage — experience section", () => {
  it("edits every experience field and manages entries and bullets", async () => {
    const user = userEvent.setup();
    const { editor, container } = renderEditor({ activeSection: 'experience' });

    const cards = container.querySelectorAll('.eleva-card');
    const first = within(cards[0] as HTMLElement);

    fireEvent.change(first.getByPlaceholderText('Role'), { target: { value: 'Lead Engineer' } });
    expect(editor.setExpField).toHaveBeenCalledWith('exp1', 'role', 'Lead Engineer');

    fireEvent.change(first.getByPlaceholderText('Company'), { target: { value: 'Google Inc' } });
    expect(editor.setExpField).toHaveBeenCalledWith('exp1', 'company', 'Google Inc');

    fireEvent.change(first.getByPlaceholderText('Start'), { target: { value: '2024' } });
    expect(editor.setExpField).toHaveBeenCalledWith('exp1', 'startDate', '2024');

    fireEvent.change(first.getByPlaceholderText('End'), { target: { value: '2026' } });
    expect(editor.setExpField).toHaveBeenCalledWith('exp1', 'endDate', '2026');

    fireEvent.change(first.getByPlaceholderText('Location'), { target: { value: 'Remote' } });
    expect(editor.setExpField).toHaveBeenCalledWith('exp1', 'location', 'Remote');

    await user.click(first.getByTitle('Remove'));
    expect(editor.removeExperience).toHaveBeenCalledWith('exp1');

    await user.click(first.getByRole('button', { name: /Add bullet/ }));
    expect(editor.addBullet).toHaveBeenCalledWith('exp1');

    await user.click(screen.getByRole('button', { name: /Add experience/ }));
    expect(editor.addExperience).toHaveBeenCalledOnce();
  });

  it("wires bullet edit, rewrite, accept, reject and delete to the hook", async () => {
    const user = userEvent.setup();
    const { editor } = renderEditor({ activeSection: 'experience' });

    await user.click(screen.getByRole('button', { name: 'edit-b0' }));
    expect(editor.setBulletText).toHaveBeenCalledWith('exp1', 'b0', expect.stringContaining('edited'));

    await user.click(screen.getByRole('button', { name: 'rewrite-b0' }));
    expect(editor.handleBulletRewrite).toHaveBeenCalledWith('exp1', 'b0');

    await user.click(screen.getByRole('button', { name: 'accept-b0' }));
    expect(editor.acceptSuggestion).toHaveBeenCalledWith('exp1', 'b0');

    await user.click(screen.getByRole('button', { name: 'reject-b0' }));
    expect(editor.setBulletSuggestion).toHaveBeenCalledWith('exp1', 'b0', undefined);

    await user.click(screen.getByRole('button', { name: 'delete-b0' }));
    expect(editor.deleteBullet).toHaveBeenCalledWith('exp1', 'b0');
  });

  it("renders an empty experience list with just the add control", () => {
    renderEditor({ activeSection: 'experience', data: { ...cloneResume(), experience: [] } });
    expect(screen.queryByTitle('Remove')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add experience/ })).toBeInTheDocument();
  });
});

describe("EditorPage — projects section", () => {
  it("edits project fields, technologies and project bullets", async () => {
    const user = userEvent.setup();
    const { editor } = renderEditor({ activeSection: 'projects' });

    fireEvent.change(screen.getAllByPlaceholderText('Project name')[0], { target: { value: 'Scheduler v2' } });
    expect(editor.updateProject).toHaveBeenCalledWith('p1', 'name', 'Scheduler v2');

    fireEvent.change(screen.getAllByPlaceholderText('Description')[0], { target: { value: 'Updated description' } });
    expect(editor.updateProject).toHaveBeenCalledWith('p1', 'description', 'Updated description');

    fireEvent.change(screen.getAllByPlaceholderText('URL (optional)')[0], { target: { value: 'https://x.dev' } });
    expect(editor.updateProject).toHaveBeenCalledWith('p1', 'url', 'https://x.dev');

    const techInput = screen.getAllByPlaceholderText('+ tech')[0];
    await user.type(techInput, 'Node{Enter}');
    expect(editor.addProjectTech).toHaveBeenCalledWith('p1', 'Node');

    const rustChip = screen.getByText('Rust').closest('span') as HTMLElement;
    await user.click(within(rustChip).getByRole('button'));
    expect(editor.removeProjectTech).toHaveBeenCalledWith('p1', 'Rust');

    await user.click(screen.getAllByRole('button', { name: /Add bullet/ })[0]);
    expect(editor.updateData).toHaveBeenCalledOnce();

    await user.click(screen.getAllByRole('button', { name: /Remove project/ })[0]);
    expect(editor.removeProject).toHaveBeenCalledWith('p1');
  });

  it("applies the inline project bullet transforms through updateData", async () => {
    const user = userEvent.setup();
    const { editor } = renderEditor({ activeSection: 'projects' });

    await user.click(screen.getByRole('button', { name: 'edit-pb1' }));
    const editUpdater = vi.mocked(editor.updateData).mock.calls.at(-1)?.[0];
    expect(editUpdater).toBeTypeOf('function');
    const edited = editUpdater?.(editor.data);
    expect(edited?.projects[0].bullets[0].text).toBe('Shipped a scheduler edited');

    await user.click(screen.getByRole('button', { name: 'rewrite-pb1' }));
    expect(editor.handleProjectRewrite).toHaveBeenCalledWith('p1', 'pb1');
    expect(screen.getByRole('button', { name: 'accept-pb1' })).toBeInTheDocument();
  });

  it("covers project bullet accept, reject and delete transforms", async () => {
    const user = userEvent.setup();
    const { editor } = renderEditor({ activeSection: 'projects' });

    const withSuggestion = cloneResume();
    withSuggestion.projects[0].bullets[0].suggestion = 'Suggested text';

    await user.click(screen.getByRole('button', { name: 'accept-pb1' }));
    const accept = vi.mocked(editor.updateData).mock.calls.at(-1)?.[0];
    const accepted = accept?.(withSuggestion);
    expect(accepted?.projects[0].bullets[0].text).toBe('Suggested text');
    expect(accepted?.projects[0].bullets[0].suggestion).toBeUndefined();

    await user.click(screen.getByRole('button', { name: 'reject-pb1' }));
    const reject = vi.mocked(editor.updateData).mock.calls.at(-1)?.[0];
    expect(reject?.(withSuggestion)?.projects[0].bullets[0].suggestion).toBeUndefined();

    await user.click(screen.getByRole('button', { name: 'delete-pb1' }));
    const remove = vi.mocked(editor.updateData).mock.calls.at(-1)?.[0];
    expect(remove?.(withSuggestion)?.projects[0].bullets).toHaveLength(0);
  });

  it("adds a project bullet through updateData", async () => {
    const user = userEvent.setup();
    const { editor } = renderEditor({ activeSection: 'projects' });

    await user.click(screen.getAllByRole('button', { name: /Add bullet/ })[0]);
    const updater = vi.mocked(editor.updateData).mock.calls.at(-1)?.[0];
    const next = updater?.(editor.data);
    expect(next?.projects[0].bullets).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Add project/ })).toBeInTheDocument();
  });

  it("adds a project and runs the project AI toolbar", async () => {
    const user = userEvent.setup();
    const { editor } = renderEditor({ activeSection: 'projects' });

    await user.click(screen.getByRole('button', { name: /Add project/ }));
    expect(editor.addProject).toHaveBeenCalledOnce();

    await user.click(screen.getAllByRole('button', { name: 'Grammar' })[0]);
    expect(editor.handleAIAction).toHaveBeenCalledWith('grammar', editor.data.projects[0].description, expect.any(Function));
  });
});

describe("EditorPage — skills, education and certificates", () => {
  it("edits and removes skill categories and items", async () => {
    const user = userEvent.setup();
    const { editor, container } = renderEditor({ activeSection: 'skills' });

    const firstCard = within(container.querySelectorAll('.eleva-card')[0] as HTMLElement);
    const categoryInput = firstCard.getByDisplayValue('Languages');
    fireEvent.change(categoryInput, { target: { value: 'Programming' } });
    expect(editor.updateSkillCat).toHaveBeenCalledWith('s1', 'Programming');

    await user.click(firstCard.getAllByRole('button')[0]);
    expect(editor.removeSkillCategory).toHaveBeenCalledWith('s1');

    const addSkill = screen.getAllByPlaceholderText('Add skill...')[0];
    await user.type(addSkill, 'GraphQL{Enter}');
    expect(editor.addSkillItem).toHaveBeenCalledWith('s1', 'GraphQL');

    const goChip = screen.getByText('Go').closest('span') as HTMLElement;
    await user.click(within(goChip).getByRole('button'));
    expect(editor.removeSkillItem).toHaveBeenCalledWith('s1', 'Go');

    await user.click(screen.getByRole('button', { name: /Add skill category/ }));
    expect(editor.addSkillCategory).toHaveBeenCalledOnce();
  });

  it("edits education fields and manages education entries", async () => {
    const user = userEvent.setup();
    const { editor, container } = renderEditor({ activeSection: 'education' });

    const card = within(container.querySelectorAll('.eleva-card')[0] as HTMLElement);
    fireEvent.change(card.getByPlaceholderText('School'), { target: { value: 'MIT' } });
    expect(editor.updateEducation).toHaveBeenCalledWith('e1', 'school', 'MIT');

    fireEvent.change(card.getByPlaceholderText('GPA'), { target: { value: '4.0' } });
    expect(editor.updateEducation).toHaveBeenCalledWith('e1', 'gpa', '4.0');

    fireEvent.change(card.getByPlaceholderText('Degree'), { target: { value: 'M.S.' } });
    expect(editor.updateEducation).toHaveBeenCalledWith('e1', 'degree', 'M.S.');

    fireEvent.change(card.getByPlaceholderText('Field of study'), { target: { value: 'Systems' } });
    expect(editor.updateEducation).toHaveBeenCalledWith('e1', 'field', 'Systems');

    fireEvent.change(card.getByPlaceholderText('Start'), { target: { value: '2020' } });
    expect(editor.updateEducation).toHaveBeenCalledWith('e1', 'startDate', '2020');

    fireEvent.change(card.getByPlaceholderText('End'), { target: { value: '2022' } });
    expect(editor.updateEducation).toHaveBeenCalledWith('e1', 'endDate', '2022');

    await user.click(card.getByRole('button'));
    expect(editor.removeEducation).toHaveBeenCalledWith('e1');

    await user.click(screen.getByRole('button', { name: /Add education/ }));
    expect(editor.addEducation).toHaveBeenCalledOnce();
  });

  it("edits certificate fields and manages certificates", async () => {
    const user = userEvent.setup();
    const { editor, container } = renderEditor({ activeSection: 'certificates' });

    const card = within(container.querySelectorAll('.eleva-card')[0] as HTMLElement);
    fireEvent.change(card.getByPlaceholderText('Certificate name'), { target: { value: 'AWS Pro' } });
    expect(editor.updateCert).toHaveBeenCalledWith('c1', 'name', 'AWS Pro');

    fireEvent.change(card.getByPlaceholderText('Issuer'), { target: { value: 'Amazon Web Services' } });
    expect(editor.updateCert).toHaveBeenCalledWith('c1', 'issuer', 'Amazon Web Services');

    fireEvent.change(card.getByPlaceholderText('Date'), { target: { value: '2025' } });
    expect(editor.updateCert).toHaveBeenCalledWith('c1', 'date', '2025');

    fireEvent.change(card.getByPlaceholderText('Credential URL (optional)'), { target: { value: 'https://cert' } });
    expect(editor.updateCert).toHaveBeenCalledWith('c1', 'credentialUrl', 'https://cert');

    await user.click(card.getByRole('button'));
    expect(editor.removeCertificate).toHaveBeenCalledWith('c1');

    await user.click(screen.getByRole('button', { name: /Add certificate/ }));
    expect(editor.addCertificate).toHaveBeenCalledOnce();
  });

  it("renders empty education and certificate lists with add controls", () => {
    const data = cloneResume();
    data.education = [];
    data.certificates = [];

    const { unmount } = renderEditor({ activeSection: 'education', data });
    expect(screen.getByRole('button', { name: /Add education/ })).toBeInTheDocument();
    unmount();

    renderEditor({ activeSection: 'certificates', data });
    expect(screen.getByRole('button', { name: /Add certificate/ })).toBeInTheDocument();
  });

  it("calls the summary toolbar callback result setter", async () => {
    const user = userEvent.setup();
    const { editor } = renderEditor({ activeSection: 'summary' });

    await user.click(screen.getByRole('button', { name: 'Expand' }));
    const callback = vi.mocked(editor.handleAIAction).mock.calls[0][2] as (result: string) => void;
    act(() => callback('expanded summary'));
    expect(editor.updateSummary).toHaveBeenCalledWith('expanded summary');
  });
});
