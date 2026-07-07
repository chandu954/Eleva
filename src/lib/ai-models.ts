/**
 * AI Model Management — OpenRouter Only
 *
 * All AI features use OpenRouter exclusively.
 * Free models are used by default; Pro users can access paid models.
 */

import { ServiceName } from './types'

export interface AIProvider {
  id: ServiceName
  name: string
  apiLink: string
  logo?: string
  envKey: string
  sdkInitializer: string
  unstable?: boolean
}

export interface AIModel {
  id: string
  name: string
  provider: ServiceName
  features: {
    isFree?: boolean
    isRecommended?: boolean
    isUnstable?: boolean
    maxTokens?: number
    supportsVision?: boolean
    supportsTools?: boolean
    isPro?: boolean
  }
  availability: {
    requiresApiKey: boolean
    requiresPro: boolean
  }
}

export interface ApiKey {
  service: ServiceName
  key: string
  addedAt: string
}

export interface AIConfig {
  model: string
  apiKeys: ApiKey[]
  customPrompts?: import('./types').CustomPrompts
}

export interface GroupedModels {
  provider: ServiceName
  name: string
  models: AIModel[]
}

// ─── Single Provider: OpenRouter ─────────────────────────────────────────────

export const PROVIDERS: Partial<Record<ServiceName, AIProvider>> = {
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    apiLink: 'https://openrouter.ai/account/api-keys',
    logo: '/logos/openrouter.png',
    envKey: 'OPENROUTER_API_KEY',
    sdkInitializer: 'openrouter',
    unstable: false,
  },
}

// ─── Models (all via OpenRouter) ─────────────────────────────────────────────

export const AI_MODELS: AIModel[] = [
  // Free models (priority order: Qwen → DeepSeek → Gemma → Llama)
  {
    id: 'qwen/qwen3-235b-a22b:free',
    name: 'Qwen3 235B A22B',
    provider: 'openrouter',
    features: {
      isFree: true,
      isRecommended: true,
      maxTokens: 131072,
      supportsVision: false,
      supportsTools: true,
    },
    availability: {
      requiresApiKey: false,
      requiresPro: false,
    },
  },
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1',
    provider: 'openrouter',
    features: {
      isFree: true,
      isRecommended: true,
      maxTokens: 163840,
      supportsVision: false,
      supportsTools: true,
    },
    availability: {
      requiresApiKey: false,
      requiresPro: false,
    },
  },
  {
    id: 'google/gemma-3-27b-it:free',
    name: 'Gemma 3 27B',
    provider: 'openrouter',
    features: {
      isFree: true,
      isRecommended: false,
      maxTokens: 8192,
      supportsVision: false,
      supportsTools: true,
    },
    availability: {
      requiresApiKey: false,
      requiresPro: false,
    },
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B',
    provider: 'openrouter',
    features: {
      isFree: true,
      isRecommended: false,
      maxTokens: 131072,
      supportsVision: false,
      supportsTools: true,
    },
    availability: {
      requiresApiKey: false,
      requiresPro: false,
    },
  },
  // Pro models
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'openrouter',
    features: {
      isFree: false,
      isRecommended: true,
      maxTokens: 1000000,
      supportsVision: true,
      supportsTools: true,
      isPro: true,
    },
    availability: {
      requiresApiKey: false,
      requiresPro: true,
    },
  },
  {
    id: 'anthropic/claude-sonnet-4.6',
    name: 'Claude Sonnet 4.6',
    provider: 'openrouter',
    features: {
      isFree: false,
      isRecommended: true,
      maxTokens: 1000000,
      supportsVision: true,
      supportsTools: true,
      isPro: true,
    },
    availability: {
      requiresApiKey: false,
      requiresPro: true,
    },
  },
  {
    id: 'openai/gpt-5.4',
    name: 'GPT-5.4',
    provider: 'openrouter',
    features: {
      isFree: false,
      isRecommended: false,
      maxTokens: 1050000,
      supportsVision: true,
      supportsTools: true,
      isPro: true,
    },
    availability: {
      requiresApiKey: false,
      requiresPro: true,
    },
  },
]

// ─── Model Aliases ───────────────────────────────────────────────────────

const MODEL_ALIASES: Record<string, string> = {
  // Legacy aliases now point to free models
  'claude-sonnet-4-6': 'qwen/qwen-2.5-72b-instruct',
  'claude-sonnet-4-5-20250929': 'qwen/qwen-2.5-72b-instruct',
  'claude-haiku-4-5-20251001': 'google/gemma-2-27b-it',
  'claude-opus-4-7': 'qwen/qwen-2.5-72b-instruct',
  'gpt-5.5': 'qwen/qwen-2.5-72b-instruct',
  'gpt-5.4': 'qwen/qwen-2.5-72b-instruct',
  'gpt-5.4-mini': 'google/gemma-2-27b-it',
  'gpt-5.4-nano': 'google/gemma-2-27b-it',
  'gpt-5.4-pro': 'qwen/qwen-2.5-72b-instruct',
  'gpt-5.5-pro': 'qwen/qwen-2.5-72b-instruct',
  'gemini-3-pro-preview': 'google/gemini-2.5-flash',
  'deepseek/deepseek-v3.2': 'deepseek/deepseek-v3.2:nitro',
  'google/gemini-2.5-pro': 'qwen/qwen-2.5-72b-instruct',
  'anthropic/claude-sonnet-4.6': 'qwen/qwen-2.5-72b-instruct',
  'openai/gpt-5.4': 'qwen/qwen-2.5-72b-instruct',
}

// ─── Default Model Configuration ─────────────────────────────────────────────

export const DEFAULT_MODELS = {
  PRO_USER: 'google/gemini-2.5-pro',
  FREE_USER: 'google/gemini-2.5-flash',
} as const

// ─── Model Designations ──────────────────────────────────────────────────────

export const MODEL_DESIGNATIONS = {
  FAST_CHEAP: 'google/gemini-2.5-flash',
  FAST_CHEAP_FREE: 'google/gemini-2.5-flash',
  STRUCTURED_EXTRACTION: 'google/gemini-2.5-flash',
  RESUME_SCORING: 'google/gemini-2.5-flash',
  SIMPLE_REWRITE: 'google/gemini-2.5-flash',
  CONTENT_GENERATION: 'google/gemini-2.5-flash',
  COVER_LETTER: 'google/gemini-2.5-flash',
  JOB_TAILORING_FREE: 'google/gemini-2.5-flash',
  JOB_TAILORING_PRO: 'anthropic/claude-sonnet-4.6',
  CHAT_ASSISTANT_FREE: 'google/gemini-2.5-flash',
  CHAT_ASSISTANT_PRO: 'google/gemini-2.5-pro',
  FRONTIER: 'anthropic/claude-sonnet-4.6',
  FRONTIER_ALT: 'openai/gpt-5.4',
  BALANCED: 'google/gemini-2.5-flash',
  VISION: 'google/gemini-2.5-flash',
  DEFAULT_PRO: 'google/gemini-2.5-pro',
  DEFAULT_FREE: 'google/gemini-2.5-flash',
} as const

export type ModelDesignation = keyof typeof MODEL_DESIGNATIONS

// ─── Utility Functions ───────────────────────────────────────────────────────

export function getProvidersArray(): AIProvider[] {
  return Object.values(PROVIDERS)
}

export function getModelById(id: string): AIModel | undefined {
  const resolvedId = MODEL_ALIASES[id] || id
  return AI_MODELS.find(model => model.id === resolvedId)
}

export function getProviderById(id: ServiceName): AIProvider | undefined {
  return PROVIDERS[id]
}

export function getModelsByProvider(provider: ServiceName): AIModel[] {
  return AI_MODELS.filter(model => model.provider === provider)
}

export function isModelAvailable(
  modelId: string,
  isPro: boolean,
  apiKeys: ApiKey[]
): boolean {
  modelId = MODEL_ALIASES[modelId] || modelId
  if (isPro) return true
  const model = getModelById(modelId)
  if (!model) return false
  if (model.features.isFree) return true
  return apiKeys.some(key => key.service === 'openrouter')
}

export function getDefaultModel(isPro: boolean): string {
  return isPro ? DEFAULT_MODELS.PRO_USER : DEFAULT_MODELS.FREE_USER
}

export function getModelProvider(modelId: string): AIProvider | undefined {
  const model = getModelById(modelId)
  if (!model) return undefined
  return getProviderById(model.provider)
}

export function groupModelsByProvider(): GroupedModels[] {
  return [{
    provider: 'openrouter',
    name: 'OpenRouter',
    models: AI_MODELS,
  }]
}

export function getSelectableModels(isPro: boolean, apiKeys: ApiKey[]): AIModel[] {
  return AI_MODELS.filter(model => isModelAvailable(model.id, isPro, apiKeys))
}

export function getModelSDKConfig(modelId: string): { provider: AIProvider; modelId: string } | undefined {
  const model = getModelById(modelId)
  if (!model) return undefined
  const provider = getProviderById(model.provider)
  if (!provider) return undefined
  return { provider, modelId }
}
