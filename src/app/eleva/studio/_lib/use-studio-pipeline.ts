import { useState, useCallback } from 'react';

export type PipelineStatus = 'idle' | 'running' | 'success' | 'error';

export interface PipelineState {
  status: PipelineStatus;
  progress: number;
  error: string | null;
  result: any;
}

const initialState: PipelineState = {
  status: 'idle',
  progress: 0,
  error: null,
  result: null,
};

export function useStudioPipeline() {
  const [state, setState] = useState<PipelineState>(initialState);

  const start = useCallback(() => {
    setState({ status: 'running', progress: 0, error: null, result: null });
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setState((prev) => ({ ...prev, progress }));
  }, []);

  const succeed = useCallback((result: any) => {
    setState({ status: 'success', progress: 100, error: null, result });
  }, []);

  const fail = useCallback((error: string) => {
    setState((prev) => ({ ...prev, status: 'error', error }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    start,
    updateProgress,
    succeed,
    fail,
    reset,
  };
}
