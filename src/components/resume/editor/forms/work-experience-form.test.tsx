import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { WorkExperience } from "@/lib/types";

import { WorkExperienceForm } from "./work-experience-form";

vi.mock("@/components/ui/tiptap", () => ({
  default: ({ content, onChange }: { content: string; onChange?: (v: string) => void }) => (
    <textarea
      aria-label={content || "empty point"}
      value={content}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

vi.mock("../../management/dialogs/import-from-profile-dialog", () => ({
  ImportFromProfileDialog: ({ onImport }: { onImport: (items: WorkExperience[]) => void }) => (
    <button onClick={() => onImport([{ company: "Imported", position: "Role", location: "", date: "", description: ["Imported"], technologies: [] } as WorkExperience])}>
      Import from profile
    </button>
  ),
}));

vi.mock("../components/ai-generation-tooltip", () => ({
  AIGenerationSettingsTooltip: (props: {
    index: number;
    loadingAI?: boolean;
    generateAIPoints: (index: number) => void;
  }) => (
    <button onClick={() => props.generateAIPoints(props.index)} disabled={props.loadingAI}>
      Generate AI
    </button>
  ),
}));

vi.mock("../../shared/ai-improvement-prompt", () => ({
  AIImprovementPrompt: ({ value }: { value: string }) => (
    <span data-testid="ai-improvement-prompt">{value}</span>
  ),
}));

vi.mock("@/components/ui/api-error-dialog", () => ({
  ApiErrorDialog: () => null,
}));

function fixture(): WorkExperience[] {
  return [
    {
      company: "Acme",
      position: "Engineer",
      location: "NYC",
      date: "2023",
      description: ["Built things"],
      technologies: ["React"],
    } as WorkExperience,
    { company: "Beta", position: "Dev", location: "", date: "", description: [], technologies: [] } as WorkExperience,
  ];
}

function renderForm(list: WorkExperience[] = fixture()) {
  const onChangeSpy = vi.fn();
  function Harness() {
    const [items, setItems] = useState<WorkExperience[]>(list);
    return (
      <WorkExperienceForm
        experiences={items}
        onChange={(next) => {
          onChangeSpy(next);
          setItems(structuredClone(next));
        }}
        profile={{ id: "p1", work_experience: [], projects: [], education: [], skills: [] } as unknown as never}
      />
    );
  }
  const utils = render(<Harness />);
  return { ...utils, onChange: onChangeSpy };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("WorkExperienceForm", () => {
  // Real userEvent interaction; under v8-coverage instrumentation this can
  // exceed the 5s default, hence the explicit hedge.
  it("adds a new work experience entry", { timeout: 15_000 }, async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();
    await user.click(screen.getByRole("button", { name: /Add Work Experience/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const [updated] = onChange.mock.calls[0] as unknown as [WorkExperience[]];
    expect(updated).toHaveLength(3);
    expect(updated[0].company).toBe("");
  });

  it("edits an existing entry", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();
    const companyInput = screen.getAllByDisplayValue("Acme")[0];
    await user.clear(companyInput);
    await user.type(companyInput, "NewCo");
    expect(onChange).toHaveBeenCalled();
  });
});
