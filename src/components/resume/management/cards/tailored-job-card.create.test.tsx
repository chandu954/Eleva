// @vitest-environment jsdom
import { act, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) {
          cache.set(tag, (props: Record<string, unknown>) => {
            const {
              initial,
              animate,
              exit,
              transition,
              whileHover,
              whileTap,
              variants,
              layout,
              layoutId,
              ...rest
            } = props;
            void initial;
            void animate;
            void exit;
            void transition;
            void whileHover;
            void whileTap;
            void variants;
            void layout;
            void layoutId;
            return React.createElement(tag, rest);
          });
        }
        return cache.get(tag);
      },
    },
  );

  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const {
  refreshMock,
  toastMock,
  createClientMock,
  singleMock,
  updateResumeMock,
  createJobMock,
  deleteJobMock,
  formatJobListingMock,
  dispatchMock,
} = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  toastMock: vi.fn(),
  createClientMock: vi.fn(),
  singleMock: vi.fn(),
  updateResumeMock: vi.fn(),
  createJobMock: vi.fn(),
  deleteJobMock: vi.fn(),
  formatJobListingMock: vi.fn(),
  dispatchMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: refreshMock,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: toastMock,
}));

vi.mock("@/utils/supabase/client", () => ({
  createClient: createClientMock,
}));

vi.mock("@/utils/actions/resumes/actions", () => ({
  updateResume: updateResumeMock,
}));

vi.mock("@/utils/actions/jobs/actions", () => ({
  createJob: createJobMock,
  deleteJob: deleteJobMock,
}));

vi.mock("@/utils/actions/jobs/ai", () => ({
  formatJobListing: formatJobListingMock,
}));

vi.mock("@/components/resume/editor/resume-editor-context", () => ({
  useResumeContext: () => ({
    state: {
      resume: { id: "resume-1" },
      isSaving: false,
      isDeleting: false,
      hasUnsavedChanges: false,
    },
    dispatch: dispatchMock,
  }),
}));

import {
  formattedJob,
  job,
  openCreateDialog,
  resume,
  submitDescription,
  validDescription,
} from "@/test/tailored-job-card-test-utils";

function mockSupabaseJobResponse() {
  createClientMock.mockReturnValue({
    fromRateLimit: undefined,
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: singleMock,
        })),
      })),
    })),
  });
}

function resetTailoredJobMocks() {
  vi.clearAllMocks();
  localStorage.clear();

  mockSupabaseJobResponse();
  singleMock.mockResolvedValue({ data: job, error: null });
  updateResumeMock.mockResolvedValue({ ...resume, job_id: "job-new" });
  createJobMock.mockResolvedValue({ id: "job-new" });
  deleteJobMock.mockResolvedValue(undefined);
  formatJobListingMock.mockResolvedValue(formattedJob);
}

beforeEach(resetTailoredJobMocks);

describe("TailoredJobCard — create job flow", () => {
  it("shows the create prompt when no job is linked and opens the dialog", async () => {
    const user = await openCreateDialog();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Create New Job Listing")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByText("Create New Job Listing")).not.toBeInTheDocument(),
    );
  });

  it("validates the description before calling the AI formatter", async () => {
    const user = await openCreateDialog();

    await user.click(screen.getByRole("button", { name: "Create with AI" }));

    expect(toastMock).toHaveBeenCalledWith({
      title: "Validation Error",
      description: "Job description is required",
      variant: "destructive",
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Job description is required");
    expect(formatJobListingMock).not.toHaveBeenCalled();

    const textarea = screen.getByPlaceholderText("Paste the job description here...");
    await user.type(textarea, "Too short");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Job description should be at least 50 characters",
    );
    expect(screen.getByRole("button", { name: "Create with AI" })).toBeDisabled();

    await user.type(textarea, " and now the description is comfortably long enough to pass.");
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Create with AI" })).toBeEnabled();
  });

  it("formats, creates and links a job using the stored model and API keys", async () => {
    localStorage.setItem("eleva-default-model", "openai/gpt-5.4-mini");
    localStorage.setItem(
      "eleva-api-keys",
      JSON.stringify([{ provider: "openai", key: "sk-test" }]),
    );

    const user = await openCreateDialog();
    await submitDescription(user);

    await waitFor(() =>
      expect(formatJobListingMock).toHaveBeenCalledWith(validDescription, {
        model: "openai/gpt-5.4-mini",
        apiKeys: [{ provider: "openai", key: "sk-test" }],
      }),
    );
    await waitFor(() => expect(createJobMock).toHaveBeenCalledWith(formattedJob));
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "UPDATE_FIELD",
      field: "job_id",
      value: "job-new",
    });
    expect(updateResumeMock).toHaveBeenCalledWith(
      "resume-1",
      expect.objectContaining({ id: "resume-1", job_id: "job-new" }),
    );
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByText("Create New Job Listing")).not.toBeInTheDocument(),
    );
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("exposes Formatting and Creating progress states while work is pending", async () => {
    let resolveFormat!: (value: unknown) => void;
    let resolveCreate!: (value: unknown) => void;
    formatJobListingMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFormat = resolve;
      }),
    );
    createJobMock.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );

    const user = await openCreateDialog();
    await user.type(
      screen.getByPlaceholderText("Paste the job description here..."),
      validDescription,
    );
    await user.click(screen.getByRole("button", { name: "Create with AI" }));

    const formattingButton = await screen.findByRole("button", { name: "Formatting..." });
    expect(formattingButton).toBeDisabled();
    expect(formattingButton).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      resolveFormat(formattedJob);
    });
    const creatingButton = await screen.findByRole("button", { name: "Creating..." });
    expect(creatingButton).toBeDisabled();
    expect(creatingButton).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      resolveCreate({ id: "job-new" });
    });
    await waitFor(() => expect(updateResumeMock).toHaveBeenCalled());
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
  });

  it("falls back to empty API keys when stored JSON is invalid", async () => {
    localStorage.setItem("eleva-api-keys", "{not-json");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const user = await openCreateDialog();
    await submitDescription(user);

    await waitFor(() =>
      expect(formatJobListingMock).toHaveBeenCalledWith(validDescription, {
        model: "",
        apiKeys: [],
      }),
    );
    expect(consoleError).toHaveBeenCalledWith("Error parsing API keys:", expect.any(Error));
    consoleError.mockRestore();
  });

  it("shows a destructive toast when AI formatting fails and clears the description", async () => {
    formatJobListingMock.mockRejectedValue(new Error("AI service unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const user = await openCreateDialog();
    await submitDescription(user);

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: "Error",
        description: "AI service unavailable",
        variant: "destructive",
      }),
    );
    expect(createJobMock).not.toHaveBeenCalled();
    expect(updateResumeMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText("Paste the job description here...")).toHaveValue("");
    expect(screen.getByText("Create New Job Listing")).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("shows a destructive toast when job creation fails", async () => {
    createJobMock.mockRejectedValue(new Error("insert failed"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const user = await openCreateDialog();
    await submitDescription(user);

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: "Error",
        description: "insert failed",
        variant: "destructive",
      }),
    );
    expect(dispatchMock).not.toHaveBeenCalled();
    expect(updateResumeMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("uses a generic error message for non-Error creation failures", async () => {
    createJobMock.mockRejectedValue("nope");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const user = await openCreateDialog();
    await submitDescription(user);

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      }),
    );
    consoleError.mockRestore();
  });
});
