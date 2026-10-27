// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { Resume } from "@/lib/types";

/* ── module mocks ──────────────────────────────────────────────────── */

const { pdfMock, toBlobMock, createObjectURLMock, revokeObjectURLMock } = vi.hoisted(
  () => ({
    pdfMock: vi.fn(),
    toBlobMock: vi.fn(),
    createObjectURLMock: vi.fn(),
    revokeObjectURLMock: vi.fn(),
  })
);

// @react-pdf/renderer needs a browser/canvas runtime that jsdom lacks. The
// component only cares that pdf(element).toBlob() resolves to a Blob.
vi.mock("@react-pdf/renderer", () => ({
  pdf: pdfMock,
}));

vi.mock("./resume-pdf-document", () => ({
  ResumePDFDocument: ({ variant }: { variant?: string }) => (
    <div data-testid="resume-pdf-document" data-variant={variant} />
  ),
}));

// react-pdf renders real pages through PDF.js; model the Document/Page
// contract (file, load callback, page props) with light DOM stand-ins.
vi.mock("react-pdf", async () => {
  const React = await import("react");

  type MockDocumentProps = {
    file?: string;
    onLoadSuccess?: (args: { numPages: number }) => void;
    externalLinkTarget?: string;
    loading?: ReactNode;
    children?: ReactNode;
  };

  const Document = ({
    file,
    onLoadSuccess,
    externalLinkTarget,
    loading,
    children,
  }: MockDocumentProps) => {
    // Report two pages once per mounted document, like a completed PDF load.
    React.useEffect(() => {
      onLoadSuccess?.({ numPages: 2 });
      // The stand-in intentionally reports only on mount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return React.createElement(
      "div",
      {
        "data-testid": "pdf-document",
        "data-file": String(file),
        "data-external-target": externalLinkTarget,
      },
      React.Children.count(children) > 0 ? children : loading
    );
  };

  const Page = ({
    pageNumber,
    width,
    renderAnnotationLayer,
    renderTextLayer,
  }: {
    pageNumber: number;
    width: number;
    renderAnnotationLayer?: boolean;
    renderTextLayer?: boolean;
  }) =>
    React.createElement("div", {
      "data-testid": `pdf-page-${pageNumber}`,
      "data-width": String(width),
      "data-annotations": String(renderAnnotationLayer),
      "data-text-layer": String(renderTextLayer),
    });

  return {
    Document,
    Page,
    pdfjs: { GlobalWorkerOptions: { workerSrc: "" } },
  };
});

import { ResumePreview } from "./resume-preview";

/* ── fixtures + helpers ────────────────────────────────────────────── */

/**
 * The component caches PDFs by a hash of name/contact/sections/settings, so
 * each test needs distinct content (tag) to avoid cross-test cache hits.
 */
function makeResume(tag: string, overrides: Partial<Resume> = {}): Resume {
  return {
    id: `resume-${tag}`,
    user_id: "user-1",
    job_id: null,
    name: `${tag} resume`,
    target_role: "Software Engineer",
    is_base_resume: true,
    first_name: `Ada-${tag}`,
    last_name: "Lovelace",
    email: `${tag}@example.com`,
    phone_number: "555-0100",
    location: "London",
    website: "ada.dev",
    linkedin_url: "linkedin.com/in/ada",
    github_url: "github.com/ada",
    work_experience: [],
    education: [],
    skills: [],
    projects: [],
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    has_cover_letter: false,
    ...overrides,
  };
}

function renderPreview(resume: Resume, props: { variant?: "base" | "tailored"; containerWidth?: number } = {}) {
  return render(
    <ResumePreview
      resume={resume}
      variant={props.variant ?? "base"}
      containerWidth={props.containerWidth ?? 612}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();

  // jsdom does not implement object URLs.
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: createObjectURLMock,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: revokeObjectURLMock,
  });

  toBlobMock.mockResolvedValue(new Blob(["%PDF-1.4"], { type: "application/pdf" }));
  pdfMock.mockReturnValue({ toBlob: toBlobMock });
  createObjectURLMock.mockReturnValue("blob:generated-pdf");
});

/* ── tests ─────────────────────────────────────────────────────────── */

describe("ResumePreview — PDF generation", () => {
  it("shows the loading skeleton until the PDF blob is ready", async () => {
    let resolveBlob!: (value: Blob) => void;
    toBlobMock.mockReturnValueOnce(
      new Promise<Blob>((resolve) => {
        resolveBlob = resolve;
      })
    );

    const { container } = renderPreview(makeResume("loading"));

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByTestId("pdf-document")).not.toBeInTheDocument();
    await waitFor(() => expect(pdfMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      resolveBlob(new Blob(["%PDF-1.4"], { type: "application/pdf" }));
    });

    const document = await screen.findByTestId("pdf-document");
    expect(document).toHaveAttribute("data-file", "blob:generated-pdf");
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument()
    );
  });

  it("renders the resume data and selected variant through the PDF document", async () => {
    const resume = makeResume("variant");
    renderPreview(resume, { variant: "tailored" });

    await screen.findByTestId("pdf-document");

    const element = pdfMock.mock.calls[0][0] as {
      props: { resume: Resume; variant?: string };
    };
    expect(element.props.resume).toBe(resume);
    expect(element.props.variant).toBe("tailored");
  });

  it("reuses the cached PDF for the same resume content", async () => {
    const resume = makeResume("cache");
    const first = renderPreview(resume);
    await screen.findByTestId("pdf-page-1");
    first.unmount();

    renderPreview(resume);
    const document = await screen.findByTestId("pdf-document");

    await waitFor(() => expect(pdfMock).toHaveBeenCalledTimes(1));
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(document).toHaveAttribute("data-file", "blob:generated-pdf");
  });

  it("regenerates the PDF when the resume changes", async () => {
    createObjectURLMock
      .mockReturnValueOnce("blob:first-pdf")
      .mockReturnValueOnce("blob:second-pdf");

    const first = makeResume("regen-one");
    const second = makeResume("regen-two", { id: "resume-regen-2" });
    const { rerender } = renderPreview(first);

    await waitFor(() =>
      expect(screen.getByTestId("pdf-document")).toHaveAttribute(
        "data-file",
        "blob:first-pdf"
      )
    );

    rerender(<ResumePreview resume={second} variant="base" containerWidth={612} />);

    await waitFor(() => expect(pdfMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByTestId("pdf-document")).toHaveAttribute(
        "data-file",
        "blob:second-pdf"
      )
    );
  });

  it("caches base and tailored variants separately", async () => {
    createObjectURLMock
      .mockReturnValueOnce("blob:base-pdf")
      .mockReturnValueOnce("blob:tailored-pdf");

    const resume = makeResume("variant-cache");
    const { rerender } = renderPreview(resume, { variant: "base" });

    await waitFor(() =>
      expect(screen.getByTestId("pdf-document")).toHaveAttribute(
        "data-file",
        "blob:base-pdf"
      )
    );

    rerender(<ResumePreview resume={resume} variant="tailored" containerWidth={612} />);

    await waitFor(() => expect(pdfMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByTestId("pdf-document")).toHaveAttribute(
        "data-file",
        "blob:tailored-pdf"
      )
    );

    // Switching back to the base variant reuses its cached PDF.
    rerender(<ResumePreview resume={resume} variant="base" containerWidth={612} />);
    await waitFor(() =>
      expect(screen.getByTestId("pdf-document")).toHaveAttribute(
        "data-file",
        "blob:base-pdf"
      )
    );
    expect(pdfMock).toHaveBeenCalledTimes(2);
  });

  it("shows a retryable error when PDF generation fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    toBlobMock.mockRejectedValueOnce(new Error("worker failed"));

    renderPreview(makeResume("generation-error"));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn't generate the resume preview/i);
    expect(screen.queryByTestId("pdf-document")).not.toBeInTheDocument();
    expect(pdfMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    const document = await screen.findByTestId("pdf-document");
    expect(document).toHaveAttribute("data-file", "blob:generated-pdf");
    expect(pdfMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});

describe("ResumePreview — paged document", () => {
  it("renders every page with the container width, annotations and delayed text layer", async () => {
    renderPreview(makeResume("pages"), { containerWidth: 640 });

    const firstPage = await screen.findByTestId("pdf-page-1");
    expect(screen.getByTestId("pdf-page-2")).toBeInTheDocument();
    expect(firstPage).toHaveAttribute("data-width", "640");
    expect(firstPage).toHaveAttribute("data-annotations", "true");
    expect(firstPage).toHaveAttribute("data-text-layer", "false");
    expect(screen.getByTestId("pdf-document")).toHaveAttribute(
      "data-external-target",
      "_blank"
    );

    // The text layer is enabled 1s after the document reports success.
    await waitFor(
      () =>
        expect(screen.getByTestId("pdf-page-1")).toHaveAttribute(
          "data-text-layer",
          "true"
        ),
      { timeout: 3000 }
    );
  });

  it("debounces container width changes without regenerating the PDF", async () => {
    const resume = makeResume("width");
    const { rerender } = renderPreview(resume, { containerWidth: 500 });

    expect(await screen.findByTestId("pdf-page-1")).toHaveAttribute(
      "data-width",
      "500"
    );

    rerender(<ResumePreview resume={resume} variant="base" containerWidth={720} />);

    await waitFor(
      () =>
        expect(screen.getByTestId("pdf-page-1")).toHaveAttribute(
          "data-width",
          "720"
        ),
      { timeout: 2000 }
    );
    expect(pdfMock).toHaveBeenCalledTimes(1);
  });

  it("injects annotation styles and removes them on unmount", async () => {
    const { unmount } = renderPreview(makeResume("styles"));
    await screen.findByTestId("pdf-document");

    const style = Array.from(document.head.querySelectorAll("style")).find((node) =>
      node.textContent?.includes(".react-pdf__Page__annotations")
    );
    expect(style).toBeDefined();

    unmount();
    expect(style?.isConnected).toBe(false);
  });
});
