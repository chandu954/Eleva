// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { friendlyError, useStudioPipeline } from './use-studio-pipeline';

vi.mock('sonner', () => {
  const toastFn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  });
  return { toast: toastFn };
});

vi.mock('../../_lib/ai-status', () => ({
  reportAiRun: vi.fn(),
  reportAiDone: vi.fn(),
}));

// Imported AFTER the mocks are registered.
import { toast } from 'sonner';
import { reportAiDone, reportAiRun } from '../../_lib/ai-status';

const toastMock = toast as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
const toastCalls = toast as unknown as ReturnType<typeof vi.fn>;
const reportAiRunMock = vi.mocked(reportAiRun);
const reportAiDoneMock = vi.mocked(reportAiDone);

const LONG_JD = 'senior typescript engineer, backend platforms, remote';
const CANCELLED = Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });

/**
 * Hand-rolled Response stand-in: each frame is one SSE event (the hook reads
 * body.getReader() directly, so no HTTP layer is needed).
 */
function streamingResponse(frames: Array<{ event: string; data: Record<string, unknown> }>): Response {
  const encoded = frames.map((f) => new TextEncoder().encode(`event: ${f.event}\ndata: ${JSON.stringify(f.data)}\n\n`));
  let i = 0;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () => (i < encoded.length ? { done: false, value: encoded[i++] } : { done: true, value: undefined }),
      }),
    },
  } as unknown as Response;
}

function stubFetch(handler: (init: { signal: AbortSignal }) => Response | Promise<Response>) {
  const fetchMock = vi.fn((_url: string, init: { signal: AbortSignal }) => Promise.resolve(handler(init)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
  toastCalls.mockClear();
  toastMock.success.mockClear();
  toastMock.error.mockClear();
  reportAiRunMock.mockClear();
  reportAiDoneMock.mockClear();
});

describe('friendlyError', () => {
  it('maps provider failures to a human text, diagnosis and confidence', () => {
    const { text, diagnosis, confidence } = friendlyError('timeout', 'upstream mystery', 'score');
    expect(text).toBe("Couldn't score your resume. The selected model didn't respond in time.");
    expect(diagnosis).toBe('Provider timeout');
    expect(confidence).toBe('93%');
  });

  it('falls back to the raw message for unknown reasons', () => {
    const { text, diagnosis, confidence } = friendlyError('cosmic_rays', 'meteor strike');
    expect(text).toBe('meteor strike');
    expect(diagnosis).toBe('Unknown error');
    expect(confidence).toBe('—');
  });
});

describe('useStudioPipeline', () => {
  it('refuses to run with a too-short job description and never fetches', async () => {
    const fetchMock = stubFetch(() => streamingResponse([]));
    const { result } = renderHook(() => useStudioPipeline());

    await act(async () => {
      await result.current.startRun('short');
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith('Paste a job description first', expect.objectContaining({ description: 'At least 20 characters.' }));
    expect(result.current.running).toBe(false);
    expect(result.current.steps).toHaveLength(0);
  });

  it('drives the SSE stream through steps, letter chunks and the done event', async () => {
    stubFetch(() => streamingResponse([
      { event: 'step', data: { step: 'extract', status: 'running', micro: 'Reading the posting' } },
      { event: 'step', data: { step: 'extract', status: 'done', data: { company: 'Acme', role: 'Backend' } } },
      { event: 'letter-chunk', data: { text: 'Hello ' } },
      { event: 'letter-chunk', data: { text: 'world' } },
      { event: 'done', data: { overall: 78, matched: 4, missing: 2, letterBody: 'FULL LETTER' } },
    ]));
    const { result } = renderHook(() => useStudioPipeline());

    await act(async () => {
      await result.current.startRun(LONG_JD, 'resume-1');
    });

    const byStep = Object.fromEntries(result.current.steps.map((s) => [s.step, s]));
    // The seven-step pipeline skeleton is created at run start; the extract
    // step completed inside the stream, the rest are parked as pending.
    expect(result.current.steps).toHaveLength(7);
    expect(byStep['extract'].status).toBe('done');
    // While running it was "waiting"; the final micro status is complete.
    expect(byStep['extract'].microStatus).toBe('complete');
    expect(byStep['score'].status).toBe('pending');

    // Streamed chunks win over the done payload's letterBody.
    expect(result.current.letter).toBe('Hello world');
    expect(result.current.summary?.overall).toBe(78);
    expect(result.current.summary?.keywordsAdded).toBe(0);
    expect(result.current.extractData).toEqual({ company: 'Acme', role: 'Backend' });
    expect(result.current.stepTimings['extract']).toBeTypeOf('number');
    expect(result.current.elapsed).toBeTypeOf('string');
    expect(result.current.logs.some((l) => l.message.includes('ATS 78%'))).toBe(true);
    expect(toastMock.success).toHaveBeenCalledTimes(1);
    expect(reportAiRunMock).toHaveBeenCalledWith('Analyzing job', 'studio-pipeline');
    expect(reportAiDoneMock).toHaveBeenCalledWith('Resume optimized', expect.any(Number), 'studio-pipeline', false);
  });

  it('marks the failing step with details and parks the rest as pending', async () => {
    stubFetch(() => streamingResponse([
      { event: 'step', data: { step: 'extract', status: 'running' } },
      { event: 'step', data: { step: 'extract', status: 'done', data: {} } },
      { event: 'step', data: { step: 'score', status: 'running' } },
      { event: 'error', data: { step: 'score', reason: 'provider', message: 'boom', provider: 'openai', statusCode: 500, traceId: 't-1' } },
    ]));
    const { result } = renderHook(() => useStudioPipeline());

    await act(async () => {
      await result.current.startRun(LONG_JD, 'resume-2');
    });

    const byStep = Object.fromEntries(result.current.steps.map((s) => [s.step, s]));
    expect(byStep['score'].status).toBe('error');
    expect(byStep['score'].error).toBe("Couldn't score your resume. The AI provider returned an error.");
    expect(byStep['score'].errorDetails).toMatchObject({ reason: 'provider', provider: 'openai', statusCode: 500, traceId: 't-1', rawMessage: 'boom' });
    expect(byStep['plan'].status).toBe('pending');
    expect(byStep['extract'].status).toBe('done');
    expect(result.current.logs.some((l) => l.message === 'Failed: boom')).toBe(true);
    expect(toastCalls).toHaveBeenCalledWith('Analysis paused', expect.objectContaining({ description: expect.stringContaining('failed. Nothing was modified.') }));
    expect(reportAiDoneMock).toHaveBeenCalledWith('Analysis', expect.any(Number), 'studio-pipeline', true);
  });

  it('logs a connection error when the request itself fails', async () => {
    stubFetch(() => { throw new TypeError('fetch failed'); });
    const { result } = renderHook(() => useStudioPipeline());

    await act(async () => {
      await result.current.startRun(LONG_JD);
    });

    expect(result.current.logs.some((l) => l.message === 'Connection error: fetch failed')).toBe(true);
    expect(toastMock.error).toHaveBeenCalledWith("We couldn't complete this request", { description: 'Check your network.' });
  });

  it('records user aborts distinctly from failures (aborted stream read)', async () => {
    // Fetch contract: if the signal is aborted, the in-flight (or next) body
    // read rejects — including a signal that aborted between fetch and read.
    stubFetch(({ signal }) => Promise.resolve(({
      ok: true,
      body: {
        getReader: () => ({
          read: async () => new Promise<never>((_, reject) => {
            if (signal.aborted) {
              reject(CANCELLED);
              return;
            }
            signal.addEventListener('abort', () => reject(CANCELLED));
          }),
        }),
      },
    } as unknown as Response)));
    const { result } = renderHook(() => useStudioPipeline());

    // Launch the run inside act (its synchronous state updates happen
    // immediately); its body read stays pending until we abort.
    let runPromise!: Promise<void>;
    await act(async () => {
      runPromise = result.current.startRun(LONG_JD, 'resume-3');
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    });
    expect(result.current.running).toBe(true);

    // Abort, then drain the whole startRun promise inside act so its
    // catch/finally state updates are flushed into the rendered hook.
    await act(async () => {
      result.current.abort();
      await runPromise;
    });

    expect(result.current.logs.some((l) => l.message === 'Analysis aborted by user')).toBe(true);
    expect(toastCalls).toHaveBeenCalledWith('Analysis aborted', expect.objectContaining({ description: 'Nothing was modified.' }));
    expect(result.current.running).toBe(false);
  });

  it('notifies view state through onRunStart, and reset() clears everything', async () => {
    stubFetch(() => streamingResponse([
      { event: 'step', data: { step: 'extract', status: 'done', data: {} } },
    ]));
    const onRunStart = vi.fn();
    const { result } = renderHook(() => useStudioPipeline({ onRunStart }));
    expect(onRunStart).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.startRun(LONG_JD);
    });
    expect(onRunStart).toHaveBeenCalledTimes(1);
    expect(result.current.steps).toHaveLength(7);

    act(() => { result.current.reset(); });
    expect(result.current.steps).toHaveLength(0);
    expect(result.current.running).toBe(false);
    expect(result.current.letter).toBe('');
    expect(result.current.summary).toBeNull();
    expect(result.current.extractData).toBeNull();
  });

  it('retryFrom issues a fresh run (and drive it to completion)', async () => {
    const failedRun = streamingResponse([
      { event: 'step', data: { step: 'extract', status: 'done', data: {} } },
      { event: 'step', data: { step: 'score', status: 'running' } },
      { event: 'error', data: { step: 'score', reason: 'provider', message: 'boom' } },
    ]);
    const recoveredRun = streamingResponse([
      { event: 'step', data: { step: 'extract', status: 'done', data: {} } },
      { event: 'step', data: { step: 'score', status: 'done', data: {} } },
      { event: 'step', data: { step: 'plan', status: 'done', data: {} } },
      { event: 'step', data: { step: 'tailor', status: 'done', data: { sections: [] } } },
      { event: 'step', data: { step: 'rescore', status: 'done', data: {} } },
      { event: 'step', data: { step: 'review', status: 'done', data: {} } },
      { event: 'step', data: { step: 'letter', status: 'done', data: {} } },
      { event: 'done', data: { overall: 65, matched: 2, missing: 1 } },
    ]);
    const responses = [failedRun, recoveredRun];
    let call = 0;
    const fetchMock = stubFetch(() => responses[Math.min(call++, responses.length - 1)]);
    const { result } = renderHook(() => useStudioPipeline());

    await act(async () => {
      await result.current.startRun(LONG_JD, 'resume-4');
    });
    expect(Object.fromEntries(result.current.steps.map((s) => [s.step, s]))['plan'].status).toBe('pending');

    await act(async () => {
      await result.current.retryFrom('score', LONG_JD, 'resume-4');
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const byStep = Object.fromEntries(result.current.steps.map((s) => [s.step, s]));
    expect(byStep['extract'].status).toBe('done');
    expect(byStep['score'].status).toBe('done');
    expect(byStep['letter'].status).toBe('done');
    expect(result.current.tailoredResume).toEqual({ sections: [] });
    expect(result.current.summary?.overall).toBe(65);
  });
});
