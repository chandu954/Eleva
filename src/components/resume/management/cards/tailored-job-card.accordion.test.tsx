// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  resume,
} from "@/test/tailored-job-card-test-utils";

import { Accordion } from "@/components/ui/accordion";
import { TailoredJobAccordion } from "./tailored-job-card";

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

beforeEach(resetTailoredJobMocks);

describe("TailoredJobAccordion", () => {
  it("renders nothing for base resumes", () => {
    render(
      <Accordion type="single" collapsible>
        <TailoredJobAccordion
          resume={{ ...resume, is_base_resume: true }}
          job={job}
          isLoading={false}
        />
      </Accordion>,
    );

    expect(screen.queryByText("Senior Engineer")).not.toBeInTheDocument();
    expect(screen.queryByText("Target Job")).not.toBeInTheDocument();
  });

  it("shows the job title and company, then deletes the job on request", async () => {
    const user = userEvent.setup({ delay: null });
    let resolveDelete!: (value: unknown) => void;
    deleteJobMock.mockReturnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );

    render(
      <Accordion type="single" collapsible>
        <TailoredJobAccordion resume={resume} job={job} isLoading={false} />
      </Accordion>,
    );

    expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Senior Engineer/ }));
    expect(await screen.findByText("$150,000 - $180,000")).toBeInTheDocument();

    const deleteButton = screen.getByRole("button", { name: "Delete Job" });
    await user.click(deleteButton);

    expect(deleteJobMock).toHaveBeenCalledWith("job-1");
    expect(deleteButton).toBeDisabled();

    await act(async () => {
      resolveDelete(undefined);
    });
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
    expect(deleteButton).toBeEnabled();
  });

  it("shows a destructive toast when job deletion fails", async () => {
    deleteJobMock.mockRejectedValue(new Error("delete failed"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup({ delay: null });

    render(
      <Accordion type="single" collapsible>
        <TailoredJobAccordion resume={resume} job={job} isLoading={false} />
      </Accordion>,
    );

    await user.click(screen.getByRole("button", { name: /Senior Engineer/ }));
    await user.click(screen.getByRole("button", { name: "Delete Job" }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      }),
    );
    expect(refreshMock).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith("Error deleting job:", expect.any(Error));
    consoleError.mockRestore();
  });

  it("shows the create prompt when no job is linked", async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <Accordion type="single" collapsible>
        <TailoredJobAccordion
          resume={{ ...resume, job_id: null }}
          job={null}
          isLoading={false}
        />
      </Accordion>,
    );

    await user.click(screen.getByRole("button", { name: /Target Job/ }));

    expect(screen.getByText("No Job Currently Linked")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Job" })).not.toBeInTheDocument();
  });

  it("shows the load error when a linked job resolves to null", async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <Accordion type="single" collapsible>
        <TailoredJobAccordion resume={resume} job={null} isLoading={false} />
      </Accordion>,
    );

    await user.click(screen.getByRole("button", { name: /Target Job/ }));

    expect(screen.getByText("Unable to Load Job")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Job" })).not.toBeInTheDocument();
  });
});
