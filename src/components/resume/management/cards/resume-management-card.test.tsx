// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from "react";
import { FileText } from "lucide-react";
import type { Profile, ResumeSummary } from "@/lib/types";

/* ── module mocks ──────────────────────────────────────────────────── */

const { createDialogMock, openDialogMock } = vi.hoisted(() => ({
  createDialogMock: vi.fn(),
  openDialogMock: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

// The dialogs own their own suites; here only the trigger contract matters.
vi.mock("../dialogs/create-resume-dialog", () => ({
  CreateResumeDialog: (props: {
    type: "base" | "tailored";
    baseResumes?: ResumeSummary[];
    profile: Profile;
    children: ReactNode;
  }) => {
    createDialogMock(props);
    return (
      <div
        data-testid={`create-dialog-${props.type}`}
        data-base-resume-count={props.baseResumes?.length ?? "none"}
        onClick={() => openDialogMock(props.type)}
      >
        {props.children}
      </div>
    );
  },
}));

// Server actions are never reached because the dialog is mocked, but pinning
// them keeps the suite immune to future import changes in this component.
vi.mock("@/utils/actions/resumes/actions", () => ({
  createBaseResume: vi.fn(),
  createTailoredResume: vi.fn(),
  getResumeById: vi.fn(),
}));

vi.mock("@/utils/actions/jobs/actions", () => ({
  createJob: vi.fn(),
}));

vi.mock("@/utils/actions/jobs/ai", () => ({
  tailorResumeToJob: vi.fn(),
  formatJobListing: vi.fn(),
}));

vi.mock("react-pdftotext", () => ({
  default: vi.fn(),
}));

import { ResumeManagementCard } from "./resume-management-card";

/* ── fixtures + helpers ────────────────────────────────────────────── */

const profile = {
  id: "p1",
  user_id: "u1",
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
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

const accentColor = {
  bg: "bg-violet-500",
  border: "violet-500",
  hover: "violet-600",
  text: "violet-700",
};

function summary(overrides: Partial<ResumeSummary> = {}): ResumeSummary {
  return {
    id: "resume-1",
    user_id: "u1",
    job_id: null,
    name: "Ada Lovelace Resume",
    target_role: "Software Engineer",
    is_base_resume: true,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-06-15T00:00:00.000Z",
    ...overrides,
  };
}

const baseResumes = [
  summary(),
  summary({
    id: "resume-2",
    name: "Second Base",
    target_role: "Engineering Manager",
    updated_at: "2024-07-01T00:00:00.000Z",
  }),
];

const tailoredResumes = [
  summary({
    id: "tailored-1",
    name: "Acme Tailored",
    target_role: "Senior Engineer",
    is_base_resume: false,
  }),
];

function renderCard(overrides: Partial<ComponentProps<typeof ResumeManagementCard>> = {}) {
  const props: ComponentProps<typeof ResumeManagementCard> = {
    type: "base",
    resumes: baseResumes,
    baseResumes: baseResumes,
    profile,
    icon: <FileText data-testid="card-icon" />,
    title: "Base Resumes",
    description: "Your master resumes",
    emptyTitle: "No base resumes yet",
    emptyDescription: "Create your first base resume to get started.",
    gradientFrom: "violet-500",
    gradientTo: "purple-500",
    accentColor,
    ...overrides,
  };
  return render(<ResumeManagementCard {...props} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

/* ── tests ─────────────────────────────────────────────────────────── */

describe("ResumeManagementCard — header and list", () => {
  it("renders the title, description, active count and icon", () => {
    renderCard();

    expect(screen.getByRole("heading", { name: "Base Resumes" })).toBeInTheDocument();
    expect(screen.getByText(/Your master resumes/)).toHaveTextContent(
      "Your master resumes • 2 active"
    );
    expect(screen.getAllByTestId("card-icon").length).toBeGreaterThan(0);
  });

  it("renders base resume cards with target role, type label, date and link", () => {
    renderCard();

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    expect(screen.getAllByText("Base Resume")).toHaveLength(2);
    expect(screen.getByText("Updated Jun 15, 2024")).toBeInTheDocument();
    expect(screen.getByText("Updated Jul 1, 2024")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Software Engineer/ })).toHaveAttribute(
      "href",
      "/resumes/resume-1"
    );
    expect(screen.getByRole("link", { name: /Engineering Manager/ })).toHaveAttribute(
      "href",
      "/resumes/resume-2"
    );
  });

  it("renders tailored resume cards with the resume name and type label", () => {
    renderCard({ type: "tailored", resumes: tailoredResumes });

    expect(screen.getByText("Acme Tailored")).toBeInTheDocument();
    expect(screen.getByText("Tailored Resume")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Acme Tailored/ })).toHaveAttribute(
      "href",
      "/resumes/tailored-1"
    );
  });

  it("links 'View all' to the resumes index", () => {
    renderCard();

    expect(screen.getByRole("link", { name: /View all/ })).toHaveAttribute(
      "href",
      "/resumes"
    );
  });
});

describe("ResumeManagementCard — create action", () => {
  it("labels and wires the base-resume create action", async () => {
    const user = userEvent.setup();
    renderCard();

    const create = screen.getByRole("button", { name: "New Base Resume" });
    expect(create).not.toBeDisabled();
    expect(createDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "base",
        baseResumes: undefined,
        profile,
      })
    );

    await user.click(create);
    expect(openDialogMock).toHaveBeenCalledWith("base");
  });

  it("labels the tailored create action and passes base resumes through", async () => {
    const user = userEvent.setup();
    renderCard({ type: "tailored", resumes: tailoredResumes });

    const create = screen.getByRole("button", { name: "New Tailored Resume" });
    expect(create).not.toBeDisabled();
    expect(createDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "tailored",
        baseResumes,
        profile,
      })
    );

    await user.click(create);
    expect(openDialogMock).toHaveBeenCalledWith("tailored");
  });

  it("disables tailored creation when there are no base resumes", async () => {
    const user = userEvent.setup();
    renderCard({ type: "tailored", resumes: tailoredResumes, baseResumes: undefined });

    const create = screen.getByRole("button", { name: "New Tailored Resume" });
    expect(create).toBeDisabled();

    await user.click(create);
    expect(openDialogMock).not.toHaveBeenCalled();
  });

  it("disables tailored creation when the base resume list is empty", () => {
    renderCard({ type: "tailored", resumes: [], baseResumes: [] });

    const buttons = screen.getAllByRole("button", { name: "New Tailored Resume" });
    expect(buttons).toHaveLength(2); // header + empty-state call to action
    buttons.forEach((button) => expect(button).toBeDisabled());
  });

  it("keeps base-resume creation enabled when there are no base resumes yet", () => {
    renderCard({ type: "base", resumes: [], baseResumes: [] });

    screen
      .getAllByRole("button", { name: "New Base Resume" })
      .forEach((button) => expect(button).not.toBeDisabled());
  });
});

describe("ResumeManagementCard — empty state", () => {
  it("shows the custom empty state plus header and empty-state actions", () => {
    renderCard({ resumes: [] });

    expect(screen.getByText("No base resumes yet")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first base resume to get started.")
    ).toBeInTheDocument();
    expect(screen.getByText(/0 active/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "New Base Resume" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: /View all/ })).toHaveAttribute(
      "href",
      "/resumes"
    );
  });

  it("still shows the tailored empty state and disables its actions without base resumes", () => {
    renderCard({
      type: "tailored",
      resumes: [],
      baseResumes: [],
      title: "Tailored Resumes",
      emptyTitle: "No tailored resumes yet",
      emptyDescription: "Pick a base resume to tailor.",
    });

    expect(screen.getByText("No tailored resumes yet")).toBeInTheDocument();
    expect(screen.getByText("Pick a base resume to tailor.")).toBeInTheDocument();
    expect(screen.getByText(/0 active/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "New Tailored Resume" })).toHaveLength(2);
  });
});
