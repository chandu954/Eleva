/**
 * AI Model Configuration — Legacy OpenRouter Models
 *
 * @deprecated This file is superseded by the provider abstraction in src/lib/ai/provider/.
 * New code should use that system instead. This file is retained for backward
 * compatibility with existing AI model consumers.
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

export type ModelCategory = 'recommended' | 'writing' | 'coding' | 'fast' | 'premium'

export interface AIModel {
  id: string
  name: string
  provider: ServiceName
  description?: string
  category?: ModelCategory
  quality?: number
  speed?: number
  badgeLabel?: string
  useCases?: string[]
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

export const AI_MODELS: AIModel[] = [
  // Free models
  {
    id: 'openrouter/free',
    name: 'GPT OSS 120B',
    provider: 'openrouter',
    description: 'Best overall for resumes and ATS optimization',
    category: 'recommended',
    quality: 5,
    speed: 4,
    badgeLabel: 'Best Overall',
    useCases: ['Resume Writing', 'ATS Optimization', 'Cover Letters'],
    features: {
      isFree: true,
      isRecommended: true,
      maxTokens: 200000,
      supportsVision: false,
      supportsTools: true,
    },
    availability: {
      requiresApiKey: false,
      requiresPro: false,
    },
  },
  {
    id: 'nvidia/nemotron-3-super-120b-a12b:free',
    name: 'DeepSeek V3',
    provider: 'openrouter',
    description: 'Excellent for technical resumes and coding',
    category: 'coding',
    quality: 4,
    speed: 4,
    badgeLabel: 'Coding',
    useCases: ['Technical Resumes', 'Code Samples', 'Engineering Roles'],
    features: {
      isFree: true,
      isRecommended: true,
      maxTokens: 1000000,
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
    description: 'Fast and efficient for everyday tasks',
    category: 'fast',
    quality: 4,
    speed: 5,
    badgeLabel: 'Fast',
    useCases: ['Quick Edits', 'Bullet Rewrites', 'Drafts'],
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
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Gemma 4 31B',
    provider: 'openrouter',
    description: 'Google\'s latest, strong general-purpose model',
    category: 'recommended',
    quality: 4,
    speed: 4,
    badgeLabel: 'Smart',
    useCases: ['General Writing', 'Summaries', 'Analysis'],
    features: {
      isFree: true,
      isRecommended: false,
      maxTokens: 262144,
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
    description: 'Creative writing with 1M context window',
    category: 'writing',
    quality: 5,
    speed: 3,
    badgeLabel: 'Creative',
    useCases: ['Creative Writing', 'Long Documents', 'Brainstorming'],
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
    description: 'Highest writing quality and nuanced output',
    category: 'premium',
    quality: 5,
    speed: 3,
    badgeLabel: 'Premium',
    useCases: ['Executive Summaries', 'Cover Letters', 'Polished Writing'],
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
    description: 'OpenAI\'s most capable model',
    category: 'premium',
    quality: 5,
    speed: 4,
    badgeLabel: 'Premium',
    useCases: ['Complex Tasks', 'Reasoning', 'Analysis'],
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

// @deprecated — Legacy aliases for backward compatibility with tests.
// All point to real free models.
const MODEL_ALIASES: Record<string, string> = {
  'gpt-5.5': 'openrouter/free',
  'gpt-5.4-nano': 'google/gemma-4-31b-it:free',
  'claude-sonnet-4-6': 'openrouter/free',
}

// ─── Default Model Configuration ─────────────────────────────────────────────

export const DEFAULT_MODELS = {
  PRO_USER: 'openrouter/free',
  FREE_USER: 'openrouter/free',
} as const

// ─── Model Designations ──────────────────────────────────────────────────────

export const MODEL_DESIGNATIONS = {
  FAST_CHEAP: 'openrouter/free',
  FAST_CHEAP_FREE: 'openrouter/free',
  STRUCTURED_EXTRACTION: 'openrouter/free',
  RESUME_SCORING: 'openrouter/free',
  SIMPLE_REWRITE: 'openrouter/free',
  CONTENT_GENERATION: 'openrouter/free',
  COVER_LETTER: 'openrouter/free',
  JOB_TAILORING_FREE: 'openrouter/free',
  JOB_TAILORING_PRO: 'openrouter/free',
  CHAT_ASSISTANT_FREE: 'openrouter/free',
  CHAT_ASSISTANT_PRO: 'openrouter/free',
  FRONTIER: 'openrouter/free',
  FRONTIER_ALT: 'openrouter/free',
  BALANCED: 'openrouter/free',
  VISION: 'openrouter/free',
  DEFAULT_PRO: 'openrouter/free',
  DEFAULT_FREE: 'openrouter/free',
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

export function getModelsByCategory(isPro: boolean): { category: ModelCategory | 'auto'; label: string; models: AIModel[] }[] {
  const available = AI_MODELS.filter(m => m.availability.requiresPro ? isPro : true)
  const groups: { category: ModelCategory | 'auto'; label: string; models: AIModel[] }[] = [
    { category: 'recommended', label: 'Recommended', models: [] },
    { category: 'writing', label: 'Writing', models: [] },
    { category: 'coding', label: 'Coding', models: [] },
    { category: 'fast', label: 'Fast', models: [] },
    { category: 'premium', label: 'Premium', models: [] },
  ]
  for (const m of available) {
    const cat = m.category || 'recommended'
    const g = groups.find(g => g.category === cat)
    if (g) g.models.push(m)
  }
  return groups.filter(g => g.models.length > 0)
}
