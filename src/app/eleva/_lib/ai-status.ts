export type AiStatus = {
  state: 'idle' | 'running' | 'done' | 'error';
  label?: string;
  durationMs?: number;
  task?: string;
};

type Listener = (s: AiStatus) => void;

let current: AiStatus = { state: 'idle' };
const listeners = new Set<Listener>();

export function getAiStatus(): AiStatus {
  return current;
}

export function subscribeAiStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function reportAiStatus(status: AiStatus) {
  current = status;
  listeners.forEach((l) => l(status));
}

export function reportAiRun(label: string, task?: string) {
  reportAiStatus({ state: 'running', label, task });
}

export function reportAiDone(label: string, durationMs: number, task?: string, error = false) {
  reportAiStatus({ state: error ? 'error' : 'done', label, durationMs, task });
}
