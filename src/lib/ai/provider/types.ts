export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'nvidia' | 'ollama';

export type AITask =
  | 'resume-rewrite'
  | 'jd-analysis'
  | 'ats-score'
  | 'cover-letter'
  | 'interview'
  | 'career-coach'
  | 'grammar'
  | 'embedding'
  | 'ocr'
  | 'parsing';

export type FinishReason = 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'error' | 'other' | 'unknown';

export type ProviderMode = 'single' | 'auto';

export interface ProviderConfig {
  selectedProvider: ProviderId;
  selectedModel: string;
  mode: ProviderMode;
  fallbackEnabled: boolean;
}

export interface PipelineTraceStep {
  stage: string;
  provider: ProviderId;
  model: string;
  latency: number;
  tokens?: { prompt: number; completion: number; total: number };
  success: boolean;
}

export interface AIProviderResult {
  success: boolean;
  provider: ProviderId;
  model: string;
  latency: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: FinishReason;
  data: unknown;
  error?: string;
  trace?: PipelineTraceStep;
}

export interface GenerateTextParams {
  system?: string;
  prompt?: string;
  messages?: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface GenerateObjectParams {
  system?: string;
  prompt?: string;
  schema: unknown;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface StreamTextParams {
  system?: string;
  prompt?: string;
  messages?: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface ProviderHealth {
  healthy: boolean;
  latency: number;
  failureRate: number;
  lastCheck: number;
}

export interface ProviderMetrics {
  provider: ProviderId;
  model: string;
  latency: number;
  tokens: { prompt: number; completion: number; total: number };
  retries: number;
  fallback: boolean;
  success: boolean;
  timestamp: number;
  requestId: string;
}
