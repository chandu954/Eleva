// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { Education, Profile } from "@/lib/types";

import { EducationForm } from "./education-form";

/* ── module mocks ──────────────────────────────────────────────────── */

// Tiptap is a ProseMirror editor; model it as a plain textarea keyed by content.
vi.mock("@/components/ui/tiptap", () => ({
  default: ({ content, onChange }: { content: string; onChange?: (v: string) => void }) => (
    <textarea
      aria-label={content || "empty achievements"}
      value={content}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

vi.mock("../../management/dialogs/import-from-profile-dialog", () => ({
  ImportFromProfileDialog: ({ onImport }: { onImport: (items: Education[]) => void }) => (
    <button
      onClick={() =>
        onImport([
          {
            school: "Imported University",
            degree: "MSc",
            field: "Data Science",
            location: "Berlin",
            date: "2020 - 2022",
            gpa: 3.9,
            achievements: ["Imported award"],
          },
        ])
      }
    >
      Import from profile
    </button>
  ),
}));

/* ── fixtures + helpers ────────────────────────────────────────────── */

const profile = {
  id: "p1",
  user_id: "u1",
  first_name: null,
  last_name: null,
  email: null,
  phone_number: null,
  location: null,
  website: null,
  linkedin_url: null,
  github_url: null,
  work_experience: [],
  education: [],
  skills: [],
  projects: [],
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
} as Profile;

// Fresh deep copy per test: the harness clones updates, but a shared fixture
// would still leak mutations performed by the component in place.
function fixture(): Education[] {
  return [
    {
      school: "State University",
      degree: "BSc",
      field: "Computer Science",
      location: "Toronto",
      date: "2019 - 2023",
      gpa: 3.8,
      achievements: ["Dean's List", "Hackathon winner"],
    },
    {
      school: "City College",
      degree: "Diploma",
      field: "Design",
      location: "",
      date: "",
      achievements: [],
    },
  ];
}

/** Finds a rendered icon button by its lucide svg class (e.g. "trash2"). */
function iconButton(scope: ParentNode, icon: string): HTMLButtonElement {
  const btn = Array.from(scope.querySelectorAll("button")).find((b) =>
    b.querySelector(`svg.lucide-${icon}`)
  );
  if (!btn) throw new Error(`No button with ${icon} icon found`);
  return btn as HTMLButtonElement;
}

/** Climb from an element to the Card root div (bordered indigo container). */
function cardRoot(el: Element): HTMLElement {
  let cur = el as HTMLElement | null;
  while (cur && !cur.className.includes("backdrop-blur-md")) cur = cur.parentElement;
  if (!cur) throw new Error("Card root not found");
  return cur as HTMLElement;
}

/** The Card root div that owns the school input showing `value`. */
function cardOf(school: string) {
  return cardRoot(screen.getByDisplayValue(school));
}

function renderForm(list: Education[] = fixture()) {
  const onChangeSpy = vi.fn();
  // Mirrors the real parent: changes round-trip through props so add/remove/
  // reorder interactions that rely on re-renders are actually exercised.
  function Harness() {
    const [items, setItems] = useState(list);
    return (
      <EducationForm
        education={items}
        onChange={(next) => {
          onChangeSpy(next);
          setItems(structuredClone(next));
        }}
        profile={profile}
      />
    );
  }
  const utils = render(<Harness />);
  return { ...utils, onChange: onChangeSpy };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

/* ── tests ─────────────────────────────────────────────────────────── */

describe("EducationForm — CRUD", () => {
  // Real userEvent interaction; under v8-coverage instrumentation this can
  // exceed the 5s default, hence the explicit hedge.
  it("adds an empty education entry at the top of the list", { timeout: 15_000 }, async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(screen.getByRole("button", { name: /Add Education/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const [updated] = onChange.mock.calls[0] as unknown as [Education[]];
    expect(updated).toHaveLength(3);
    expect(updated[0]).toEqual({
      school: "",
      degree: "",
      field: "",
      location: "",
      date: "",
      gpa: undefined,
      achievements: [],
    });
    expect(updated.slice(1)).toEqual(fixture());
  });

  it("prepends education imported from the profile dialog", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(screen.getByRole("button", { name: /Import from profile/i }));

    const [updated] = onChange.mock.calls[0] as unknown as [Education[]];
    expect(updated[0].school).toBe("Imported University");
    expect(updated[0].gpa).toBe(3.9);
    expect(updated).toHaveLength(3);
  });

  it("edits the school, location, degree, field and date of an entry", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();
    const card = cardOf("State University");

    await user.type(within(card).getByPlaceholderText("Institution Name"), "!");
    await user.type(within(card).getByPlaceholderText("City, Country"), "!");
    await user.type(within(card).getByPlaceholderText("Bachelor's, Master's, etc."), "!");
    await user.type(within(card).getByPlaceholderText("Field of Study"), "!");
    await user.type(within(card).getByPlaceholderText(/2019 - 2023/), "!");

    const [updated] = onChange.mock.calls.at(-1) as unknown as [Education[]];
    expect(updated[0]).toMatchObject({
      school: "State University!",
      location: "Toronto!",
      degree: "BSc!",
      field: "Computer Science!",
      date: "2019 - 2023!",
    });
    expect(updated[1]).toEqual(fixture()[1]);
  });

  it("parses the GPA as a number and clears it back to undefined", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();
    const card = cardOf("State University");
    const gpa = within(card).getByPlaceholderText("0.00");

    expect(gpa).toHaveAttribute("type", "number");
    expect(gpa).toHaveAttribute("min", "0");
    expect(gpa).toHaveAttribute("max", "4.0");
    expect(gpa).toHaveAttribute("step", "0.01");

    await user.clear(gpa);
    await user.type(gpa, "3.75");

    let [updated] = onChange.mock.calls.at(-1) as unknown as [Education[]];
    expect(updated[0].gpa).toBe(3.75);

    await user.clear(gpa);
    [updated] = onChange.mock.calls.at(-1) as unknown as [Education[]];
    expect(updated[0].gpa).toBeUndefined();
  });

  it("splits achievements into non-empty lines", async () => {
    const { onChange } = renderForm();
    const card = cardOf("State University");

    const achievements = within(card).getByLabelText(/Dean's List/);
    fireEvent.change(achievements, {
      target: { value: "Dean's List\nNew award\n\n" },
    });

    const [updated] = onChange.mock.calls.at(-1) as unknown as [Education[]];
    expect(updated[0].achievements).toEqual(["Dean's List", "New award"]);
  });

  it("removes an education entry with the card trash button", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(iconButton(cardOf("State University"), "trash2"));

    const [updated] = onChange.mock.calls[0] as unknown as [Education[]];
    expect(updated.map((edu) => edu.school)).toEqual(["City College"]);
  });

  it("renders an empty state with no cards when there is no education", () => {
    renderForm([]);

    expect(screen.queryByPlaceholderText("Institution Name")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Education/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Import from profile/i })).toBeInTheDocument();
  });
});

describe("EducationForm — reordering", () => {
  it("disables the first up-chevron and last down-chevron", () => {
    renderForm();

    expect(iconButton(cardOf("State University"), "chevron-up")).toBeDisabled();
    expect(iconButton(cardOf("State University"), "chevron-down")).not.toBeDisabled();
    expect(iconButton(cardOf("City College"), "chevron-up")).not.toBeDisabled();
    expect(iconButton(cardOf("City College"), "chevron-down")).toBeDisabled();
  });

  it("moves an entry up with the chevron buttons", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(iconButton(cardOf("City College"), "chevron-up"));

    const [updated] = onChange.mock.calls[0] as unknown as [Education[]];
    expect(updated.map((edu) => edu.school)).toEqual(["City College", "State University"]);
  });

  it("moves an entry down with the chevron buttons", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(iconButton(cardOf("State University"), "chevron-down"));

    const [updated] = onChange.mock.calls[0] as unknown as [Education[]];
    expect(updated.map((edu) => edu.school)).toEqual(["City College", "State University"]);
  });
});
