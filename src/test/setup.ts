import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

const blockedFetch: typeof fetch = async () => {
  throw new Error('Network access through fetch is disabled in unit tests. Stub fetch in the test.');
};

globalThis.fetch = blockedFetch;

afterEach(() => {
  vi.unstubAllGlobals();
  globalThis.fetch = blockedFetch;
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

if (typeof window !== "undefined") {
  window.scrollTo = vi.fn();
}

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}
