import type { AITask, ProviderId } from './types';

export interface ModelConfig {
  id: string;
  provider: ProviderId;
  displayName: string;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  maxContext: number;
  pricing?: { prompt: number; completion: number };
}

export const MODELS: Record<string, ModelConfig> = {
  // OpenAI
  'openai/gpt-4.1': {
    id: 'openai/gpt-4.1', provider: 'openai', displayName: 'GPT-4.1',
    supportsStreaming: true, supportsTools: true, supportsVision: true, maxContext: 1000000,
  },
  'openai/gpt-4.1-mini': {
    id: 'openai/gpt-4.1-mini', provider: 'openai', displayName: 'GPT-4.1 Mini',
    supportsStreaming: true, supportsTools: true, supportsVision: true, maxContext: 1000000,
  },
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini', provider: 'openai', displayName: 'GPT-4o Mini',
    supportsStreaming: true, supportsTools: true, supportsVision: true, maxContext: 128000,
  },

  // Anthropic
  'anthropic/claude-sonnet-4': {
    id: 'anthropic/claude-sonnet-4', provider: 'anthropic', displayName: 'Claude Sonnet 4',
    supportsStreaming: true, supportsTools: true, supportsVision: true, maxContext: 200000,
  },
  'anthropic/claude-3.5-sonnet': {
    id: 'anthropic/claude-3.5-sonnet', provider: 'anthropic', displayName: 'Claude 3.5 Sonnet',
    supportsStreaming: true, supportsTools: true, supportsVision: true, maxContext: 200000,
  },
  'anthropic/claude-3.5-haiku': {
    id: 'anthropic/claude-3.5-haiku', provider: 'anthropic', displayName: 'Claude 3.5 Haiku',
    supportsStreaming: true, supportsTools: true, supportsVision: true, maxContext: 200000,
  },

  // NVIDIA
  'nvidia/llama-3.3-70b': {
    id: 'nvidia/llama-3.3-70b', provider: 'nvidia', displayName: 'Llama 3.3 70B',
    supportsStreaming: true, supportsTools: false, supportsVision: false, maxContext: 128000,
  },
  'nvidia/nemotron-ultra-253b': {
    id: 'nvidia/nemotron-ultra-253b', provider: 'nvidia', displayName: 'Nemotron Ultra 253B',
    supportsStreaming: true, supportsTools: false, supportsVision: false, maxContext: 128000,
  },
  'nvidia/nemotron-70b': {
    id: 'nvidia/nemotron-70b', provider: 'nvidia', displayName: 'Nemotron 70B',
    supportsStreaming: true, supportsTools: false, supportsVision: false, maxContext: 128000,
  },
  'nvidia/mistral-nemo': {
    id: 'nvidia/mistral-nemo', provider: 'nvidia', displayName: 'Mistral Nemo',
    supportsStreaming: true, supportsTools: false, supportsVision: false, maxContext: 128000,
  },

  // OpenRouter
  'openrouter/qwen-235b': {
    id: 'openrouter/qwen-235b', provider: 'openrouter', displayName: 'Qwen 3 235B',
    supportsStreaming: true, supportsTools: true, supportsVision: false, maxContext: 32000,
  },
  'openrouter/deepseek-v3': {
    id: 'openrouter/deepseek-v3', provider: 'openrouter', displayName: 'DeepSeek V3',
    supportsStreaming: true, supportsTools: true, supportsVision: false, maxContext: 128000,
  },
  'openrouter/gemini-2.5-flash': {
    id: 'openrouter/gemini-2.5-flash', provider: 'openrouter', displayName: 'Gemini 2.5 Flash',
    supportsStreaming: true, supportsTools: true, supportsVision: true, maxContext: 1000000,
  },
  'openrouter/llama-3.3-70b': {
    id: 'openrouter/llama-3.3-70b', provider: 'openrouter', displayName: 'Llama 3.3 70B',
    supportsStreaming: true, supportsTools: true, supportsVision: false, maxContext: 128000,
  },
  'openrouter/mistral-large': {
    id: 'openrouter/mistral-large', provider: 'openrouter', displayName: 'Mistral Large',
    supportsStreaming: true, supportsTools: true, supportsVision: true, maxContext: 128000,
  },

  // Gemini
  'gemini/gemini-2.5-flash': {
    id: 'gemini/gemini-2.5-flash', provider: 'gemini', displayName: 'Gemini 2.5 Flash',
    supportsStreaming: true, supportsTools: true, supportsVision: true, maxContext: 1000000,
  },
  'gemini/gemini-2.5-pro': {
    id: 'gemini/gemini-2.5-pro', provider: 'gemini', displayName: 'Gemini 2.5 Pro',
    supportsStreaming: true, supportsTools: true, supportsVision: true, maxContext: 1000000,
  },

  // Ollama
  'ollama/qwen3:32b': {
    id: 'ollama/qwen3:32b', provider: 'ollama', displayName: 'Qwen 3 32B (Local)',
    supportsStreaming: true, supportsTools: true, supportsVision: false, maxContext: 32000,
  },
  'ollama/llama3.3:70b': {
    id: 'ollama/llama3.3:70b', provider: 'ollama', displayName: 'Llama 3.3 70B (Local)',
    supportsStreaming: true, supportsTools: true, supportsVision: false, maxContext: 128000,
  },
  'ollama/deepseek-r1': {
    id: 'ollama/deepseek-r1', provider: 'ollama', displayName: 'DeepSeek R1 (Local)',
    supportsStreaming: true, supportsTools: false, supportsVision: false, maxContext: 128000,
  },
  'ollama/mistral': {
    id: 'ollama/mistral', provider: 'ollama', displayName: 'Mistral (Local)',
    supportsStreaming: true, supportsTools: true, supportsVision: false, maxContext: 32000,
  },
  'ollama/phi4': {
    id: 'ollama/phi4', provider: 'ollama', displayName: 'Phi-4 (Local)',
    supportsStreaming: true, supportsTools: true, supportsVision: false, maxContext: 128000,
  },
};

export function getModelForProvider(providerId: ProviderId): ModelConfig | undefined {
  return Object.values(MODELS).find(m => m.provider === providerId);
}

export function getModelsForProvider(providerId: ProviderId): ModelConfig[] {
  return Object.values(MODELS).filter(m => m.provider === providerId);
}

export const AUTO_MODE_CHAINS: Record<AITask, string[]> = {
  'resume-rewrite': ['openai/gpt-4.1', 'anthropic/claude-sonnet-4', 'gemini/gemini-2.5-flash', 'nvidia/llama-3.3-70b', 'openrouter/qwen-235b', 'ollama/qwen3:32b'],
  'jd-analysis': ['openai/gpt-4.1-mini', 'anthropic/claude-3.5-sonnet', 'gemini/gemini-2.5-flash', 'nvidia/llama-3.3-70b', 'openrouter/deepseek-v3', 'ollama/llama3.3:70b'],
  'ats-score': ['openai/gpt-4.1-mini', 'anthropic/claude-3.5-sonnet', 'gemini/gemini-2.5-flash', 'nvidia/llama-3.3-70b', 'openrouter/qwen-235b', 'ollama/qwen3:32b'],
  'cover-letter': ['openai/gpt-4.1', 'anthropic/claude-sonnet-4', 'gemini/gemini-2.5-flash', 'nvidia/llama-3.3-70b', 'openrouter/mistral-large', 'ollama/llama3.3:70b'],
  'interview': ['openai/gpt-4.1-mini', 'anthropic/claude-3.5-sonnet', 'gemini/gemini-2.5-flash', 'nvidia/llama-3.3-70b', 'openrouter/qwen-235b', 'ollama/qwen3:32b'],
  'career-coach': ['openai/gpt-4o-mini', 'anthropic/claude-3.5-haiku', 'gemini/gemini-2.5-flash', 'nvidia/llama-3.3-70b', 'openrouter/mistral-large', 'ollama/llama3.3:70b'],
  'grammar': ['openai/gpt-4o-mini', 'anthropic/claude-3.5-haiku', 'nvidia/mistral-nemo', 'openrouter/mistral-large', 'ollama/mistral'],
  'embedding': [],
  'ocr': [],
  'parsing': ['openai/gpt-4.1-mini', 'anthropic/claude-3.5-sonnet', 'gemini/gemini-2.5-flash', 'nvidia/llama-3.3-70b', 'openrouter/qwen-235b', 'ollama/qwen3:32b'],
};
