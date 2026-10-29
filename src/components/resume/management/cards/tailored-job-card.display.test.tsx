// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
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
import { TailoredJobCard } from "./tailored-job-card";

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

describe("TailoredJobCard — loading and display", () => {
  it("fetches job details internally when no external job is supplied", async () => {
    let resolveJob!: (value: unknown) => void;
    singleMock.mockReturnValue(
      new Promise((resolve) => {
        resolveJob = resolve;
      }),
    );

    render(<TailoredJobCard jobId="job-1" />);

    expect(
      screen.getByRole("status", { name: "Loading job details" }),
    ).toBeInTheDocument();
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(singleMock).toHaveBeenCalled();

    await act(async () => {
      resolveJob({ data: job, error: null });
    });

    expect(await screen.findByText("$150,000 - $180,000")).toBeInTheDocument();
    expect(screen.getByText("Toronto")).toBeInTheDocument();
    expect(screen.getByText("in person")).toBeInTheDocument();
    expect(screen.getByText("Build reliable distributed systems.")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("renders a missing-row error state for PGRST116 and retries with refresh", async () => {
    singleMock.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows returned" },
    });
    const user = userEvent.setup({ delay: null });

    render(<TailoredJobCard jobId="job-1" />);

    expect(await screen.findByText("Unable to Load Job")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try Again" }));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("renders the error state when the job fetch rejects", async () => {
    singleMock.mockRejectedValue(new Error("network failure"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<TailoredJobCard jobId="job-1" />);

    expect(await screen.findByText("Unable to Load Job")).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith("Error fetching job:", expect.any(Error));
    consoleError.mockRestore();
  });

  it("renders supplied job details without creating a Supabase client", () => {
    render(<TailoredJobCard jobId="job-1" job={job} isLoading={false} />);

    expect(createClientMock).not.toHaveBeenCalled();
    expect(screen.getByText("$150,000 - $180,000")).toBeInTheDocument();
    expect(screen.getByText("Toronto")).toBeInTheDocument();
    expect(screen.getByText("in person")).toBeInTheDocument();
    expect(screen.getByText("full time")).toBeInTheDocument();
    expect(screen.getByText("Build reliable distributed systems.")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
  });

  it("shows fallback labels for missing optional job fields", () => {
    const sparseJob = {
      ...job,
      description: null,
      location: null,
      salary_range: null,
      keywords: [],
      work_location: null,
      employment_type: null,
    };

    render(<TailoredJobCard jobId="job-1" job={sparseJob} isLoading={false} />);

    expect(screen.getByText("Location not specified")).toBeInTheDocument();
    expect(screen.getByText("Not specified")).toBeInTheDocument();
    expect(screen.getByText("Salary not specified")).toBeInTheDocument();
    expect(screen.getByText("Employment type not specified")).toBeInTheDocument();
    expect(screen.queryByText("Description")).not.toBeInTheDocument();
  });

  it("shows the loading skeleton while an external job is loading", () => {
    render(<TailoredJobCard jobId="job-1" job={job} isLoading />);

    expect(
      screen.getByRole("status", { name: "Loading job details" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("$150,000 - $180,000")).not.toBeInTheDocument();
  });
});
