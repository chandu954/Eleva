import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudioPipeline } from './use-studio-pipeline';

describe('useStudioPipeline', () => {
  it('initializes to idle state', () => {
    const { result } = renderHook(() => useStudioPipeline());
    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.progress).toBe(0);
    expect(result.current.state.error).toBeNull();
  });

  it('transitions through states correctly', () => {
    const { result } = renderHook(() => useStudioPipeline());
    
    act(() => {
      result.current.start();
    });
    expect(result.current.state.status).toBe('running');
    
    act(() => {
      result.current.updateProgress(50);
    });
    expect(result.current.state.progress).toBe(50);
    
    act(() => {
      result.current.succeed({ data: 'test' });
    });
    expect(result.current.state.status).toBe('success');
    expect(result.current.state.progress).toBe(100);
  });

  it('handles errors', () => {
    const { result } = renderHook(() => useStudioPipeline());
    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.fail('Something went wrong');
    });
    expect(result.current.state.status).toBe('error');
    expect(result.current.state.error).toBe('Something went wrong');
  });

  it('resets to initial state', () => {
    const { result } = renderHook(() => useStudioPipeline());
    act(() => {
      result.current.start();
      result.current.succeed({ data: 'test' });
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.progress).toBe(0);
  });
});

  it('handles updateProgress with various values', () => {
    const { result } = renderHook(() => useStudioPipeline());
    act(() => {
      result.current.start();
      result.current.updateProgress(0);
      result.current.updateProgress(25);
      result.current.updateProgress(75);
      result.current.updateProgress(100);
    });
    expect(result.current.state.progress).toBe(100);
  });

  it('handles fail without starting', () => {
    const { result } = renderHook(() => useStudioPipeline());
    act(() => {
      result.current.fail('Error immediately');
    });
    expect(result.current.state.status).toBe('error');
    expect(result.current.state.error).toBe('Error immediately');
  });

  it('handles succeed with different result types', () => {
    const { result } = renderHook(() => useStudioPipeline());
    act(() => {
      result.current.start();
      result.current.succeed({ resume: {}, score: 85 });
    });
    expect(result.current.state.result).toEqual({ resume: {}, score: 85 });
    expect(result.current.state.status).toBe('success');
  });
