export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'nvidia' | 'ollama';

export interface ProviderModel {
  id: string;
  displayName: string;
  supportsStreaming: boolean;
  supportsVision: boolean;
  maxContext: number;
  free: boolean;
}

export interface ProviderDefinition {
  id: ProviderId;
  name: string;
  description: string;
  icon: string;
  docsUrl: string;
  requiresBaseUrl: boolean;
  models: ProviderModel[];
  modelChain: string[];
  envKey: string;
}

export const PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4.1, GPT-4o Mini',
    icon: 'sparkles',
    docsUrl: 'https://platform.openai.com/api-keys',
    requiresBaseUrl: false,
    envKey: 'OPENAI_API_KEY',
    models: [
      { id: 'gpt-4.1-2025-04-14', displayName: 'GPT-4.1', supportsStreaming: true, supportsVision: true, maxContext: 1000000, free: false },
      { id: 'gpt-4.1-mini-2025-04-14', displayName: 'GPT-4.1 Mini', supportsStreaming: true, supportsVision: true, maxContext: 1000000, free: false },
      { id: 'gpt-4o-mini-2024-07-18', displayName: 'GPT-4o Mini', supportsStreaming: true, supportsVision: true, maxContext: 128000, free: false },
    ],
    modelChain: ['gpt-4.1-2025-04-14', 'gpt-4.1-mini-2025-04-14', 'gpt-4o-mini-2024-07-18'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude Sonnet, Opus, Haiku',
    icon: 'bot',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    requiresBaseUrl: false,
    envKey: 'ANTHROPIC_API_KEY',
    models: [
      { id: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4', supportsStreaming: true, supportsVision: true, maxContext: 200000, free: false },
      { id: 'claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet', supportsStreaming: true, supportsVision: true, maxContext: 200000, free: false },
      { id: 'claude-3-5-haiku-20241022', displayName: 'Claude 3.5 Haiku', supportsStreaming: true, supportsVision: true, maxContext: 200000, free: false },
    ],
    modelChain: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini 2.5 Flash, Gemini 2.5 Pro',
    icon: 'sparkle',
    docsUrl: 'https://aistudio.google.com/apikey',
    requiresBaseUrl: false,
    envKey: 'GEMINI_API_KEY',
    models: [
      { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', supportsStreaming: true, supportsVision: true, maxContext: 1000000, free: true },
      { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', supportsStreaming: true, supportsVision: true, maxContext: 1000000, free: false },
    ],
    modelChain: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Qwen, DeepSeek, Llama, Mistral + 300+ models',
    icon: 'network',
    docsUrl: 'https://openrouter.ai/account/api-keys',
    requiresBaseUrl: false,
    envKey: 'OPENROUTER_API_KEY',
    models: [
      { id: 'qwen/qwen3-235b-a22b', displayName: 'Qwen 3 235B', supportsStreaming: true, supportsVision: false, maxContext: 32000, free: true },
      { id: 'deepseek/deepseek-chat-v3', displayName: 'DeepSeek V3', supportsStreaming: true, supportsVision: false, maxContext: 128000, free: true },
      { id: 'meta-llama/llama-3.3-70b-instruct', displayName: 'Llama 3.3 70B', supportsStreaming: true, supportsVision: false, maxContext: 128000, free: true },
      { id: 'mistralai/mistral-large', displayName: 'Mistral Large', supportsStreaming: true, supportsVision: true, maxContext: 128000, free: true },
    ],
    modelChain: ['qwen/qwen3-235b-a22b', 'deepseek/deepseek-chat-v3', 'meta-llama/llama-3.3-70b-instruct', 'mistralai/mistral-large'],
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    description: 'Llama, Nemotron, DeepSeek hosted on NVIDIA',
    icon: 'cpu',
    docsUrl: 'https://build.nvidia.com/',
    requiresBaseUrl: false,
    envKey: 'NVIDIA_API_KEY',
    models: [
      { id: 'meta/llama-3.3-70b-instruct', displayName: 'Llama 3.3 70B', supportsStreaming: true, supportsVision: false, maxContext: 128000, free: true },
      { id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', displayName: 'Llama Nemotron Super 49B', supportsStreaming: true, supportsVision: false, maxContext: 128000, free: true },
      { id: 'deepseek-v4-flash', displayName: 'DeepSeek V4 Flash', supportsStreaming: true, supportsVision: false, maxContext: 128000, free: true },
      { id: 'nvidia/llama-3.1-nemotron-nano-4b-v1.1', displayName: 'Nemotron Nano 4B', supportsStreaming: true, supportsVision: false, maxContext: 128000, free: true },
    ],
    modelChain: ['meta/llama-3.3-70b-instruct', 'nvidia/llama-3.3-nemotron-super-49b-v1.5', 'deepseek-v4-flash', 'nvidia/llama-3.1-nemotron-nano-4b-v1.1'],
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Run models locally on your machine',
    icon: 'computer',
    docsUrl: 'https://ollama.ai/download',
    requiresBaseUrl: true,
    envKey: '',
    models: [
      { id: 'qwen3:8b', displayName: 'Qwen3 8B', supportsStreaming: true, supportsVision: false, maxContext: 32000, free: true },
      { id: 'gemma3:4b', displayName: 'Gemma 3 4B', supportsStreaming: true, supportsVision: true, maxContext: 32000, free: true },
      { id: 'mistral:7b', displayName: 'Mistral 7B', supportsStreaming: true, supportsVision: false, maxContext: 32000, free: true },
      { id: 'llama3.2:3b', displayName: 'Llama 3.2 3B', supportsStreaming: true, supportsVision: false, maxContext: 128000, free: true },
    ],
    modelChain: ['qwen3:8b', 'gemma3:4b', 'mistral:7b', 'llama3.2:3b'],
  },
];

export function getProvider(id: ProviderId): ProviderDefinition | undefined {
  return PROVIDER_DEFINITIONS.find(p => p.id === id);
}

export function getConnectedProviders(connectedIds: ProviderId[]): ProviderDefinition[] {
  return PROVIDER_DEFINITIONS.filter(p => connectedIds.includes(p.id));
}

export const AUTO_PROVIDER_ORDER: ProviderId[] = ['nvidia', 'gemini', 'openrouter', 'anthropic', 'openai', 'ollama'];
