/**
 * Client helper to consume the Vercel-AI-SDK-style data stream from /api/eleva/chat.
 * Emits typed events: `text-delta`, `tool-call`, `tool-result`, `finish`, `error`.
 */
export type ElevaStreamEvent =
  | { type: 'text-delta'; delta: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: unknown }
  | { type: 'tool-result'; toolCallId: string; result: unknown }
  | { type: 'finish'; finishReason?: string }
  | { type: 'error'; error: string };

export async function* streamElevaChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  signal?: AbortSignal,
): AsyncGenerator<ElevaStreamEvent> {
  const res = await fetch('/eleva/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.body) {
    yield { type: 'error', error: 'no body' };
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (!line) continue;
      const kind = line[0];
      const payload = line.slice(2); // skip "X:"
      try {
        const parsed = JSON.parse(payload);
        if (kind === '0') yield { type: 'text-delta', delta: parsed as string };
        else if (kind === '9') yield { type: 'tool-call', ...parsed };
        else if (kind === 'a') yield { type: 'tool-result', ...parsed };
        else if (kind === 'd') yield { type: 'finish', finishReason: parsed?.finishReason };
      } catch {
        // ignore parse errors
      }
    }
  }
}

/** Simple text stream reader for /api/eleva/tool/{rewrite,draft} */
export async function* streamElevaText(
  path: '/eleva/api/tool/rewrite' | '/eleva/api/tool/draft',
  body: unknown,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}
